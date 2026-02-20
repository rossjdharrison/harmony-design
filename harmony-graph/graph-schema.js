/**
 * @fileoverview GraphSchema - Schema defining valid node types, edge types, and constraints
 * @module harmony-graph/graph-schema
 * 
 * Defines the structural rules for the graph system:
 * - Valid node types and their properties
 * - Valid edge types and connection rules
 * - Validation constraints
 * - Type safety for graph operations
 * 
 * Related: harmony-graph/graph-engine.js, harmony-graph/node-registry.js
 * Documentation: DESIGN_SYSTEM.md#graph-schema
 */

/**
 * @typedef {Object} NodeTypeDefinition
 * @property {string} type - Node type identifier
 * @property {string} label - Human-readable label
 * @property {Object.<string, PropertyDefinition>} properties - Property definitions
 * @property {string[]} [requiredProperties] - Required property keys
 * @property {Object.<string, any>} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} PropertyDefinition
 * @property {string} type - Property type (string, number, boolean, object, array)
 * @property {boolean} [required] - Whether property is required
 * @property {any} [default] - Default value
 * @property {Function} [validate] - Custom validation function
 * @property {string} [description] - Property description
 */

/**
 * @typedef {Object} EdgeTypeDefinition
 * @property {string} type - Edge type identifier
 * @property {string} label - Human-readable label
 * @property {string[]} [allowedSourceTypes] - Allowed source node types (empty = all)
 * @property {string[]} [allowedTargetTypes] - Allowed target node types (empty = all)
 * @property {boolean} [directed] - Whether edge is directed (default: true)
 * @property {Object.<string, PropertyDefinition>} [properties] - Edge properties
 * @property {Object.<string, any>} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} SchemaConstraint
 * @property {string} name - Constraint name
 * @property {string} type - Constraint type (cardinality, uniqueness, custom)
 * @property {Function} validate - Validation function
 * @property {string} message - Error message template
 */

/**
 * GraphSchema - Manages schema definitions and validation for graph structures
 * 
 * Provides:
 * - Node type registration and validation
 * - Edge type registration and validation
 * - Constraint enforcement
 * - Schema introspection
 * 
 * Performance: O(1) type lookup, O(n) validation where n = property count
 * Memory: ~1KB per node type definition
 */
export class GraphSchema {
  constructor() {
    /** @type {Map<string, NodeTypeDefinition>} */
    this.nodeTypes = new Map();
    
    /** @type {Map<string, EdgeTypeDefinition>} */
    this.edgeTypes = new Map();
    
    /** @type {SchemaConstraint[]} */
    this.constraints = [];
    
    /** @type {Map<string, Function>} */
    this.validators = new Map();
    
    this._initializeBuiltInValidators();
    this._initializeDefaultTypes();
  }

  /**
   * Initialize built-in property validators
   * @private
   */
  _initializeBuiltInValidators() {
    this.validators.set('string', (value) => typeof value === 'string');
    this.validators.set('number', (value) => typeof value === 'number' && !isNaN(value));
    this.validators.set('boolean', (value) => typeof value === 'boolean');
    this.validators.set('object', (value) => typeof value === 'object' && value !== null && !Array.isArray(value));
    this.validators.set('array', (value) => Array.isArray(value));
    this.validators.set('function', (value) => typeof value === 'function');
    this.validators.set('any', () => true);
  }

  /**
   * Initialize default node and edge types
   * @private
   */
  _initializeDefaultTypes() {
    // Default node type
    this.registerNodeType({
      type: 'default',
      label: 'Default Node',
      properties: {
        id: { type: 'string', required: true, description: 'Unique node identifier' },
        label: { type: 'string', default: '', description: 'Node label' },
        data: { type: 'object', default: {}, description: 'Node data payload' }
      },
      requiredProperties: ['id']
    });

    // Default edge type
    this.registerEdgeType({
      type: 'default',
      label: 'Default Edge',
      directed: true,
      properties: {
        weight: { type: 'number', default: 1, description: 'Edge weight' }
      }
    });
  }

  /**
   * Register a new node type
   * @param {NodeTypeDefinition} definition - Node type definition
   * @throws {Error} If definition is invalid
   */
  registerNodeType(definition) {
    if (!definition.type) {
      throw new Error('Node type definition must have a type identifier');
    }

    if (this.nodeTypes.has(definition.type)) {
      throw new Error(`Node type '${definition.type}' already registered`);
    }

    // Validate property definitions
    if (definition.properties) {
      for (const [key, prop] of Object.entries(definition.properties)) {
        if (!prop.type) {
          throw new Error(`Property '${key}' in node type '${definition.type}' must have a type`);
        }
        if (!this.validators.has(prop.type) && !prop.validate) {
          throw new Error(`Unknown property type '${prop.type}' for property '${key}'`);
        }
      }
    }

    this.nodeTypes.set(definition.type, {
      ...definition,
      properties: definition.properties || {},
      requiredProperties: definition.requiredProperties || [],
      metadata: definition.metadata || {}
    });
  }

  /**
   * Register a new edge type
   * @param {EdgeTypeDefinition} definition - Edge type definition
   * @throws {Error} If definition is invalid
   */
  registerEdgeType(definition) {
    if (!definition.type) {
      throw new Error('Edge type definition must have a type identifier');
    }

    if (this.edgeTypes.has(definition.type)) {
      throw new Error(`Edge type '${definition.type}' already registered`);
    }

    // Validate allowed types exist
    if (definition.allowedSourceTypes) {
      for (const type of definition.allowedSourceTypes) {
        if (!this.nodeTypes.has(type)) {
          console.warn(`Source node type '${type}' not yet registered for edge type '${definition.type}'`);
        }
      }
    }

    if (definition.allowedTargetTypes) {
      for (const type of definition.allowedTargetTypes) {
        if (!this.nodeTypes.has(type)) {
          console.warn(`Target node type '${type}' not yet registered for edge type '${definition.type}'`);
        }
      }
    }

    this.edgeTypes.set(definition.type, {
      ...definition,
      directed: definition.directed !== false,
      properties: definition.properties || {},
      metadata: definition.metadata || {}
    });
  }

  /**
   * Add a schema constraint
   * @param {SchemaConstraint} constraint - Constraint definition
   */
  addConstraint(constraint) {
    if (!constraint.name || !constraint.validate) {
      throw new Error('Constraint must have name and validate function');
    }
    this.constraints.push(constraint);
  }

  /**
   * Validate a node against its type schema
   * @param {Object} node - Node to validate
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateNode(node) {
    const errors = [];

    if (!node.type) {
      errors.push('Node must have a type');
      return { valid: false, errors };
    }

    const typeDef = this.nodeTypes.get(node.type);
    if (!typeDef) {
      errors.push(`Unknown node type: ${node.type}`);
      return { valid: false, errors };
    }

    // Check required properties
    for (const reqProp of typeDef.requiredProperties) {
      if (!(reqProp in node)) {
        errors.push(`Missing required property: ${reqProp}`);
      }
    }

    // Validate properties
    for (const [key, propDef] of Object.entries(typeDef.properties)) {
      if (!(key in node)) {
        if (propDef.required) {
          errors.push(`Missing required property: ${key}`);
        }
        continue;
      }

      const value = node[key];

      // Type validation
      if (propDef.validate) {
        try {
          if (!propDef.validate(value)) {
            errors.push(`Property '${key}' failed custom validation`);
          }
        } catch (err) {
          errors.push(`Property '${key}' validation error: ${err.message}`);
        }
      } else {
        const validator = this.validators.get(propDef.type);
        if (validator && !validator(value)) {
          errors.push(`Property '${key}' must be of type ${propDef.type}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate an edge against its type schema
   * @param {Object} edge - Edge to validate
   * @param {Object} [sourceNode] - Source node (for type checking)
   * @param {Object} [targetNode] - Target node (for type checking)
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateEdge(edge, sourceNode = null, targetNode = null) {
    const errors = [];

    if (!edge.type) {
      errors.push('Edge must have a type');
      return { valid: false, errors };
    }

    const typeDef = this.edgeTypes.get(edge.type);
    if (!typeDef) {
      errors.push(`Unknown edge type: ${edge.type}`);
      return { valid: false, errors };
    }

    // Validate source/target type constraints
    if (sourceNode && typeDef.allowedSourceTypes && typeDef.allowedSourceTypes.length > 0) {
      if (!typeDef.allowedSourceTypes.includes(sourceNode.type)) {
        errors.push(`Edge type '${edge.type}' does not allow source type '${sourceNode.type}'`);
      }
    }

    if (targetNode && typeDef.allowedTargetTypes && typeDef.allowedTargetTypes.length > 0) {
      if (!typeDef.allowedTargetTypes.includes(targetNode.type)) {
        errors.push(`Edge type '${edge.type}' does not allow target type '${targetNode.type}'`);
      }
    }

    // Validate edge properties
    if (typeDef.properties) {
      for (const [key, propDef] of Object.entries(typeDef.properties)) {
        if (!(key in edge)) {
          if (propDef.required) {
            errors.push(`Missing required property: ${key}`);
          }
          continue;
        }

        const value = edge[key];

        if (propDef.validate) {
          try {
            if (!propDef.validate(value)) {
              errors.push(`Property '${key}' failed custom validation`);
            }
          } catch (err) {
            errors.push(`Property '${key}' validation error: ${err.message}`);
          }
        } else {
          const validator = this.validators.get(propDef.type);
          if (validator && !validator(value)) {
            errors.push(`Property '${key}' must be of type ${propDef.type}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate entire graph against schema constraints
   * @param {Object} graph - Graph object with nodes and edges
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateGraph(graph) {
    const errors = [];

    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      errors.push('Graph must have nodes array');
      return { valid: false, errors };
    }

    if (!graph.edges || !Array.isArray(graph.edges)) {
      errors.push('Graph must have edges array');
      return { valid: false, errors };
    }

    // Validate all nodes
    const nodeMap = new Map();
    for (const node of graph.nodes) {
      const result = this.validateNode(node);
      if (!result.valid) {
        errors.push(`Node ${node.id || 'unknown'}: ${result.errors.join(', ')}`);
      }
      if (node.id) {
        nodeMap.set(node.id, node);
      }
    }

    // Validate all edges
    for (const edge of graph.edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (!sourceNode) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!targetNode) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }

      const result = this.validateEdge(edge, sourceNode, targetNode);
      if (!result.valid) {
        errors.push(`Edge ${edge.source}->${edge.target}: ${result.errors.join(', ')}`);
      }
    }

    // Apply custom constraints
    for (const constraint of this.constraints) {
      try {
        const result = constraint.validate(graph);
        if (!result) {
          errors.push(constraint.message);
        }
      } catch (err) {
        errors.push(`Constraint '${constraint.name}' failed: ${err.message}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get node type definition
   * @param {string} type - Node type identifier
   * @returns {NodeTypeDefinition|null} Type definition or null
   */
  getNodeType(type) {
    return this.nodeTypes.get(type) || null;
  }

  /**
   * Get edge type definition
   * @param {string} type - Edge type identifier
   * @returns {EdgeTypeDefinition|null} Type definition or null
   */
  getEdgeType(type) {
    return this.edgeTypes.get(type) || null;
  }

  /**
   * Get all registered node types
   * @returns {NodeTypeDefinition[]} Array of node type definitions
   */
  getAllNodeTypes() {
    return Array.from(this.nodeTypes.values());
  }

  /**
   * Get all registered edge types
   * @returns {EdgeTypeDefinition[]} Array of edge type definitions
   */
  getAllEdgeTypes() {
    return Array.from(this.edgeTypes.values());
  }

  /**
   * Check if edge connection is allowed by schema
   * @param {string} edgeType - Edge type
   * @param {string} sourceType - Source node type
   * @param {string} targetType - Target node type
   * @returns {boolean} Whether connection is allowed
   */
  isConnectionAllowed(edgeType, sourceType, targetType) {
    const edgeDef = this.edgeTypes.get(edgeType);
    if (!edgeDef) return false;

    const sourceAllowed = !edgeDef.allowedSourceTypes || 
                         edgeDef.allowedSourceTypes.length === 0 ||
                         edgeDef.allowedSourceTypes.includes(sourceType);

    const targetAllowed = !edgeDef.allowedTargetTypes || 
                         edgeDef.allowedTargetTypes.length === 0 ||
                         edgeDef.allowedTargetTypes.includes(targetType);

    return sourceAllowed && targetAllowed;
  }

  /**
   * Export schema as JSON
   * @returns {Object} Serializable schema definition
   */
  toJSON() {
    return {
      nodeTypes: Array.from(this.nodeTypes.entries()).map(([type, def]) => ({
        type,
        ...def,
        properties: Object.entries(def.properties).reduce((acc, [key, prop]) => {
          acc[key] = {
            ...prop,
            validate: prop.validate ? '[Function]' : undefined
          };
          return acc;
        }, {})
      })),
      edgeTypes: Array.from(this.edgeTypes.entries()).map(([type, def]) => ({
        type,
        ...def
      })),
      constraints: this.constraints.map(c => ({
        name: c.name,
        type: c.type,
        message: c.message
      }))
    };
  }

  /**
   * Clear all registered types and constraints
   */
  clear() {
    this.nodeTypes.clear();
    this.edgeTypes.clear();
    this.constraints = [];
    this._initializeDefaultTypes();
  }
}

/**
 * Create a default graph schema instance
 * @returns {GraphSchema} New schema instance
 */
export function createDefaultSchema() {
  return new GraphSchema();
}