/**
 * @fileoverview SchemaValidator - Validates graph conforms to schema at runtime
 * @module harmony-graph/schema-validator
 * 
 * Validates graph structure, node types, edge types, and constraints against
 * the GraphSchema definition. Provides detailed error reporting for validation failures.
 * 
 * Related:
 * - harmony-graph/graph-schema.js - Schema definition
 * - harmony-graph/graph-engine.js - Graph execution engine
 * - DESIGN_SYSTEM.md#graph-validation
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} type - Error type (e.g., 'INVALID_NODE_TYPE', 'MISSING_REQUIRED_PROPERTY')
 * @property {string} message - Human-readable error message
 * @property {string} [path] - Path to the invalid element (e.g., 'nodes[0].type')
 * @property {*} [value] - The invalid value
 * @property {*} [expected] - Expected value or constraint
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the graph is valid
 * @property {ValidationError[]} errors - Array of validation errors (empty if valid)
 * @property {string[]} warnings - Array of non-critical warnings
 */

/**
 * SchemaValidator validates graph structures against a GraphSchema at runtime.
 * Provides comprehensive validation of node types, edge types, properties, and constraints.
 * 
 * @class
 * @example
 * const validator = new SchemaValidator(graphSchema);
 * const result = validator.validate(graph);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export class SchemaValidator {
  /**
   * @param {Object} schema - GraphSchema instance to validate against
   */
  constructor(schema) {
    if (!schema) {
      throw new Error('SchemaValidator requires a schema');
    }
    this.schema = schema;
  }

  /**
   * Validates a complete graph against the schema.
   * 
   * @param {Object} graph - Graph object to validate
   * @param {Array} graph.nodes - Array of node objects
   * @param {Array} graph.edges - Array of edge objects
   * @returns {ValidationResult} Validation result with errors and warnings
   */
  validate(graph) {
    const errors = [];
    const warnings = [];

    // Validate graph structure
    if (!graph || typeof graph !== 'object') {
      errors.push({
        type: 'INVALID_GRAPH',
        message: 'Graph must be an object',
        value: graph
      });
      return { valid: false, errors, warnings };
    }

    if (!Array.isArray(graph.nodes)) {
      errors.push({
        type: 'INVALID_GRAPH_STRUCTURE',
        message: 'Graph must have a nodes array',
        path: 'nodes',
        value: graph.nodes
      });
    }

    if (!Array.isArray(graph.edges)) {
      errors.push({
        type: 'INVALID_GRAPH_STRUCTURE',
        message: 'Graph must have an edges array',
        path: 'edges',
        value: graph.edges
      });
    }

    // Early return if structure is invalid
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Validate nodes
    const nodeIds = new Set();
    graph.nodes.forEach((node, index) => {
      this._validateNode(node, index, nodeIds, errors, warnings);
    });

    // Validate edges
    graph.edges.forEach((edge, index) => {
      this._validateEdge(edge, index, nodeIds, errors, warnings);
    });

    // Validate graph-level constraints
    this._validateGraphConstraints(graph, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates a single node against the schema.
   * 
   * @private
   * @param {Object} node - Node to validate
   * @param {number} index - Node index in array
   * @param {Set<string>} nodeIds - Set of seen node IDs (for duplicate detection)
   * @param {ValidationError[]} errors - Array to accumulate errors
   * @param {string[]} warnings - Array to accumulate warnings
   */
  _validateNode(node, index, nodeIds, errors, warnings) {
    const path = `nodes[${index}]`;

    // Validate node structure
    if (!node || typeof node !== 'object') {
      errors.push({
        type: 'INVALID_NODE',
        message: 'Node must be an object',
        path,
        value: node
      });
      return;
    }

    // Validate node ID
    if (!node.id || typeof node.id !== 'string') {
      errors.push({
        type: 'MISSING_NODE_ID',
        message: 'Node must have a string id',
        path: `${path}.id`,
        value: node.id
      });
    } else if (nodeIds.has(node.id)) {
      errors.push({
        type: 'DUPLICATE_NODE_ID',
        message: `Duplicate node ID: ${node.id}`,
        path: `${path}.id`,
        value: node.id
      });
    } else {
      nodeIds.add(node.id);
    }

    // Validate node type
    if (!node.type || typeof node.type !== 'string') {
      errors.push({
        type: 'MISSING_NODE_TYPE',
        message: 'Node must have a string type',
        path: `${path}.type`,
        value: node.type
      });
      return;
    }

    // Check if node type exists in schema
    if (!this.schema.isValidNodeType(node.type)) {
      errors.push({
        type: 'INVALID_NODE_TYPE',
        message: `Unknown node type: ${node.type}`,
        path: `${path}.type`,
        value: node.type,
        expected: this.schema.getNodeTypes()
      });
      return;
    }

    // Validate node properties against schema
    const nodeSchema = this.schema.getNodeSchema(node.type);
    if (nodeSchema && nodeSchema.properties) {
      this._validateProperties(
        node.properties || {},
        nodeSchema.properties,
        `${path}.properties`,
        errors,
        warnings
      );
    }

    // Check for unknown properties (warning only)
    if (node.properties && nodeSchema && nodeSchema.properties) {
      const allowedProps = new Set(Object.keys(nodeSchema.properties));
      Object.keys(node.properties).forEach(prop => {
        if (!allowedProps.has(prop)) {
          warnings.push(`Unknown property '${prop}' on node ${node.id} (type: ${node.type})`);
        }
      });
    }
  }

  /**
   * Validates a single edge against the schema.
   * 
   * @private
   * @param {Object} edge - Edge to validate
   * @param {number} index - Edge index in array
   * @param {Set<string>} nodeIds - Set of valid node IDs
   * @param {ValidationError[]} errors - Array to accumulate errors
   * @param {string[]} warnings - Array to accumulate warnings
   */
  _validateEdge(edge, index, nodeIds, errors, warnings) {
    const path = `edges[${index}]`;

    // Validate edge structure
    if (!edge || typeof edge !== 'object') {
      errors.push({
        type: 'INVALID_EDGE',
        message: 'Edge must be an object',
        path,
        value: edge
      });
      return;
    }

    // Validate edge ID
    if (!edge.id || typeof edge.id !== 'string') {
      errors.push({
        type: 'MISSING_EDGE_ID',
        message: 'Edge must have a string id',
        path: `${path}.id`,
        value: edge.id
      });
    }

    // Validate source and target
    if (!edge.source || typeof edge.source !== 'string') {
      errors.push({
        type: 'MISSING_EDGE_SOURCE',
        message: 'Edge must have a string source',
        path: `${path}.source`,
        value: edge.source
      });
    } else if (!nodeIds.has(edge.source)) {
      errors.push({
        type: 'INVALID_EDGE_SOURCE',
        message: `Edge source references non-existent node: ${edge.source}`,
        path: `${path}.source`,
        value: edge.source
      });
    }

    if (!edge.target || typeof edge.target !== 'string') {
      errors.push({
        type: 'MISSING_EDGE_TARGET',
        message: 'Edge must have a string target',
        path: `${path}.target`,
        value: edge.target
      });
    } else if (!nodeIds.has(edge.target)) {
      errors.push({
        type: 'INVALID_EDGE_TARGET',
        message: `Edge target references non-existent node: ${edge.target}`,
        path: `${path}.target`,
        value: edge.target
      });
    }

    // Validate edge type
    if (!edge.type || typeof edge.type !== 'string') {
      errors.push({
        type: 'MISSING_EDGE_TYPE',
        message: 'Edge must have a string type',
        path: `${path}.type`,
        value: edge.type
      });
      return;
    }

    // Check if edge type exists in schema
    if (!this.schema.isValidEdgeType(edge.type)) {
      errors.push({
        type: 'INVALID_EDGE_TYPE',
        message: `Unknown edge type: ${edge.type}`,
        path: `${path}.type`,
        value: edge.type,
        expected: this.schema.getEdgeTypes()
      });
      return;
    }

    // Validate edge properties against schema
    const edgeSchema = this.schema.getEdgeSchema(edge.type);
    if (edgeSchema && edgeSchema.properties) {
      this._validateProperties(
        edge.properties || {},
        edgeSchema.properties,
        `${path}.properties`,
        errors,
        warnings
      );
    }
  }

  /**
   * Validates properties against a property schema.
   * 
   * @private
   * @param {Object} properties - Actual properties object
   * @param {Object} schema - Property schema definition
   * @param {string} path - Path for error reporting
   * @param {ValidationError[]} errors - Array to accumulate errors
   * @param {string[]} warnings - Array to accumulate warnings
   */
  _validateProperties(properties, schema, path, errors, warnings) {
    // Check required properties
    Object.entries(schema).forEach(([propName, propSchema]) => {
      if (propSchema.required && !(propName in properties)) {
        errors.push({
          type: 'MISSING_REQUIRED_PROPERTY',
          message: `Missing required property: ${propName}`,
          path: `${path}.${propName}`,
          expected: propSchema
        });
      }

      // Validate property type if present
      if (propName in properties) {
        const value = properties[propName];
        const isValid = this._validatePropertyType(value, propSchema.type);
        
        if (!isValid) {
          errors.push({
            type: 'INVALID_PROPERTY_TYPE',
            message: `Property ${propName} has invalid type`,
            path: `${path}.${propName}`,
            value,
            expected: propSchema.type
          });
        }

        // Validate enum values
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push({
            type: 'INVALID_ENUM_VALUE',
            message: `Property ${propName} must be one of: ${propSchema.enum.join(', ')}`,
            path: `${path}.${propName}`,
            value,
            expected: propSchema.enum
          });
        }

        // Validate numeric constraints
        if (typeof value === 'number') {
          if (propSchema.min !== undefined && value < propSchema.min) {
            errors.push({
              type: 'VALUE_BELOW_MINIMUM',
              message: `Property ${propName} value ${value} is below minimum ${propSchema.min}`,
              path: `${path}.${propName}`,
              value,
              expected: `>= ${propSchema.min}`
            });
          }
          if (propSchema.max !== undefined && value > propSchema.max) {
            errors.push({
              type: 'VALUE_ABOVE_MAXIMUM',
              message: `Property ${propName} value ${value} is above maximum ${propSchema.max}`,
              path: `${path}.${propName}`,
              value,
              expected: `<= ${propSchema.max}`
            });
          }
        }

        // Validate string constraints
        if (typeof value === 'string' && propSchema.pattern) {
          const regex = new RegExp(propSchema.pattern);
          if (!regex.test(value)) {
            errors.push({
              type: 'PATTERN_MISMATCH',
              message: `Property ${propName} does not match pattern ${propSchema.pattern}`,
              path: `${path}.${propName}`,
              value,
              expected: propSchema.pattern
            });
          }
        }
      }
    });
  }

  /**
   * Validates a value against a type specification.
   * 
   * @private
   * @param {*} value - Value to validate
   * @param {string} type - Expected type (e.g., 'string', 'number', 'boolean', 'array', 'object')
   * @returns {boolean} True if value matches type
   */
  _validatePropertyType(value, type) {
    if (value === null || value === undefined) {
      return false;
    }

    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return true; // Unknown type, allow it
    }
  }

  /**
   * Validates graph-level constraints (cycles, connectivity, etc.).
   * 
   * @private
   * @param {Object} graph - Graph to validate
   * @param {ValidationError[]} errors - Array to accumulate errors
   * @param {string[]} warnings - Array to accumulate warnings
   */
  _validateGraphConstraints(graph, errors, warnings) {
    // Check for cycles if schema disallows them
    if (this.schema.constraints && this.schema.constraints.acyclic) {
      if (this._hasCycle(graph)) {
        errors.push({
          type: 'CYCLE_DETECTED',
          message: 'Graph contains cycles but schema requires acyclic graph',
          path: 'graph'
        });
      }
    }

    // Check for disconnected components (warning)
    const componentCount = this._countConnectedComponents(graph);
    if (componentCount > 1) {
      warnings.push(`Graph has ${componentCount} disconnected components`);
    }

    // Warn about nodes with no edges
    const nodesWithEdges = new Set();
    graph.edges.forEach(edge => {
      nodesWithEdges.add(edge.source);
      nodesWithEdges.add(edge.target);
    });
    
    graph.nodes.forEach(node => {
      if (!nodesWithEdges.has(node.id)) {
        warnings.push(`Node ${node.id} has no edges`);
      }
    });
  }

  /**
   * Detects cycles in the graph using DFS.
   * 
   * @private
   * @param {Object} graph - Graph to check
   * @returns {boolean} True if graph contains a cycle
   */
  _hasCycle(graph) {
    const visited = new Set();
    const recursionStack = new Set();

    // Build adjacency list
    const adjacency = new Map();
    graph.nodes.forEach(node => adjacency.set(node.id, []));
    graph.edges.forEach(edge => {
      if (adjacency.has(edge.source)) {
        adjacency.get(edge.source).push(edge.target);
      }
    });

    // DFS to detect cycle
    const dfs = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check all nodes (for disconnected components)
    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Counts the number of connected components in the graph.
   * 
   * @private
   * @param {Object} graph - Graph to analyze
   * @returns {number} Number of connected components
   */
  _countConnectedComponents(graph) {
    const visited = new Set();
    let componentCount = 0;

    // Build adjacency list (undirected for connectivity)
    const adjacency = new Map();
    graph.nodes.forEach(node => adjacency.set(node.id, []));
    graph.edges.forEach(edge => {
      if (adjacency.has(edge.source)) {
        adjacency.get(edge.source).push(edge.target);
      }
      if (adjacency.has(edge.target)) {
        adjacency.get(edge.target).push(edge.source);
      }
    });

    // BFS to mark connected component
    const bfs = (startId) => {
      const queue = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const nodeId = queue.shift();
        const neighbors = adjacency.get(nodeId) || [];
        
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    };

    // Count components
    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        bfs(node.id);
        componentCount++;
      }
    }

    return componentCount;
  }

  /**
   * Validates a partial graph update (for incremental validation).
   * 
   * @param {Object} update - Partial graph update
   * @param {Array} [update.addedNodes] - Nodes to add
   * @param {Array} [update.addedEdges] - Edges to add
   * @param {Array} [update.removedNodes] - Node IDs to remove
   * @param {Array} [update.removedEdges] - Edge IDs to remove
   * @param {Object} currentGraph - Current graph state
   * @returns {ValidationResult} Validation result
   */
  validateUpdate(update, currentGraph) {
    const errors = [];
    const warnings = [];

    // Build the updated graph
    const nodeIds = new Set(currentGraph.nodes.map(n => n.id));
    
    // Remove nodes
    if (update.removedNodes) {
      update.removedNodes.forEach(id => nodeIds.delete(id));
    }

    // Validate and add new nodes
    if (update.addedNodes) {
      update.addedNodes.forEach((node, index) => {
        this._validateNode(node, index, nodeIds, errors, warnings);
      });
    }

    // Validate new edges
    if (update.addedEdges) {
      update.addedEdges.forEach((edge, index) => {
        this._validateEdge(edge, index, nodeIds, errors, warnings);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}