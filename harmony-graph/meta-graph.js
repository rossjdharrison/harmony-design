/**
 * @fileoverview MetaGraph: Graph that describes itself (nodes representing node types, etc.)
 * @module harmony-graph/meta-graph
 * 
 * A meta-graph is a graph that describes its own structure. It contains:
 * - Nodes representing node types
 * - Edges representing valid edge types between node types
 * - Self-referential structure where the meta-graph itself conforms to its own schema
 * 
 * Performance: O(1) lookups for type validation, O(n) for schema generation
 * Memory: Minimal overhead using Maps for efficient lookups
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#meta-graph
 */

/**
 * MetaGraph class - represents a graph that describes itself
 * @class
 */
export class MetaGraph {
  /**
   * @constructor
   * @param {Object} options - Configuration options
   * @param {string} options.id - Unique identifier for this meta-graph
   * @param {string} options.name - Human-readable name
   * @param {string} [options.description] - Optional description
   */
  constructor(options = {}) {
    this.id = options.id || `meta-graph-${Date.now()}`;
    this.name = options.name || 'Unnamed MetaGraph';
    this.description = options.description || '';
    
    /** @type {Map<string, NodeTypeDescriptor>} */
    this.nodeTypes = new Map();
    
    /** @type {Map<string, EdgeTypeDescriptor>} */
    this.edgeTypes = new Map();
    
    /** @type {Map<string, ConstraintDescriptor>} */
    this.constraints = new Map();
    
    this.createdAt = Date.now();
    this.version = '1.0.0';
    
    // Initialize with self-describing types
    this._initializeSelfDescribingTypes();
  }

  /**
   * Initialize the meta-graph with types that describe itself
   * @private
   */
  _initializeSelfDescribingTypes() {
    // Define the NodeType type (a node type that describes node types)
    this.defineNodeType({
      id: 'NodeType',
      name: 'Node Type',
      description: 'Describes a type of node in the graph',
      properties: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        description: { type: 'string', required: false },
        properties: { type: 'object', required: true }
      },
      metadata: {
        isMeta: true,
        level: 0
      }
    });

    // Define the EdgeType type (a node type that describes edge types)
    this.defineNodeType({
      id: 'EdgeType',
      name: 'Edge Type',
      description: 'Describes a type of edge in the graph',
      properties: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        sourceType: { type: 'string', required: true },
        targetType: { type: 'string', required: true },
        cardinality: { type: 'string', required: false }
      },
      metadata: {
        isMeta: true,
        level: 0
      }
    });

    // Define the edge type that connects NodeTypes
    this.defineEdgeType({
      id: 'ValidConnection',
      name: 'Valid Connection',
      description: 'Describes a valid connection between node types',
      sourceType: 'NodeType',
      targetType: 'NodeType',
      cardinality: 'many-to-many',
      properties: {
        required: { type: 'boolean', required: false },
        min: { type: 'number', required: false },
        max: { type: 'number', required: false }
      }
    });
  }

  /**
   * Define a new node type in the meta-graph
   * @param {NodeTypeDescriptor} descriptor - Node type descriptor
   * @returns {boolean} Success status
   */
  defineNodeType(descriptor) {
    if (!descriptor.id || !descriptor.name) {
      console.error('[MetaGraph] Node type must have id and name', descriptor);
      return false;
    }

    if (this.nodeTypes.has(descriptor.id)) {
      console.warn(`[MetaGraph] Node type ${descriptor.id} already exists, overwriting`);
    }

    const nodeType = {
      id: descriptor.id,
      name: descriptor.name,
      description: descriptor.description || '',
      properties: descriptor.properties || {},
      metadata: descriptor.metadata || {},
      validation: descriptor.validation || {},
      createdAt: Date.now()
    };

    this.nodeTypes.set(descriptor.id, nodeType);
    return true;
  }

  /**
   * Define a new edge type in the meta-graph
   * @param {EdgeTypeDescriptor} descriptor - Edge type descriptor
   * @returns {boolean} Success status
   */
  defineEdgeType(descriptor) {
    if (!descriptor.id || !descriptor.sourceType || !descriptor.targetType) {
      console.error('[MetaGraph] Edge type must have id, sourceType, and targetType', descriptor);
      return false;
    }

    // Validate that source and target types exist
    if (!this.nodeTypes.has(descriptor.sourceType)) {
      console.error(`[MetaGraph] Source type ${descriptor.sourceType} does not exist`);
      return false;
    }

    if (!this.nodeTypes.has(descriptor.targetType)) {
      console.error(`[MetaGraph] Target type ${descriptor.targetType} does not exist`);
      return false;
    }

    const edgeType = {
      id: descriptor.id,
      name: descriptor.name || descriptor.id,
      description: descriptor.description || '',
      sourceType: descriptor.sourceType,
      targetType: descriptor.targetType,
      cardinality: descriptor.cardinality || 'many-to-many',
      properties: descriptor.properties || {},
      metadata: descriptor.metadata || {},
      createdAt: Date.now()
    };

    this.edgeTypes.set(descriptor.id, edgeType);
    return true;
  }

  /**
   * Add a constraint to the meta-graph
   * @param {ConstraintDescriptor} descriptor - Constraint descriptor
   * @returns {boolean} Success status
   */
  addConstraint(descriptor) {
    if (!descriptor.id || !descriptor.type) {
      console.error('[MetaGraph] Constraint must have id and type', descriptor);
      return false;
    }

    const constraint = {
      id: descriptor.id,
      type: descriptor.type,
      description: descriptor.description || '',
      target: descriptor.target,
      rule: descriptor.rule,
      severity: descriptor.severity || 'error',
      createdAt: Date.now()
    };

    this.constraints.set(descriptor.id, constraint);
    return true;
  }

  /**
   * Get a node type by ID
   * @param {string} typeId - Node type ID
   * @returns {NodeTypeDescriptor|null} Node type or null
   */
  getNodeType(typeId) {
    return this.nodeTypes.get(typeId) || null;
  }

  /**
   * Get an edge type by ID
   * @param {string} typeId - Edge type ID
   * @returns {EdgeTypeDescriptor|null} Edge type or null
   */
  getEdgeType(typeId) {
    return this.edgeTypes.get(typeId) || null;
  }

  /**
   * Check if an edge type is valid between two node types
   * @param {string} sourceTypeId - Source node type ID
   * @param {string} targetTypeId - Target node type ID
   * @param {string} edgeTypeId - Edge type ID
   * @returns {boolean} True if valid
   */
  isValidConnection(sourceTypeId, targetTypeId, edgeTypeId) {
    const edgeType = this.edgeTypes.get(edgeTypeId);
    if (!edgeType) {
      return false;
    }

    return edgeType.sourceType === sourceTypeId && 
           edgeType.targetType === targetTypeId;
  }

  /**
   * Get all valid edge types between two node types
   * @param {string} sourceTypeId - Source node type ID
   * @param {string} targetTypeId - Target node type ID
   * @returns {EdgeTypeDescriptor[]} Array of valid edge types
   */
  getValidEdgeTypes(sourceTypeId, targetTypeId) {
    const validTypes = [];
    
    for (const [, edgeType] of this.edgeTypes) {
      if (edgeType.sourceType === sourceTypeId && 
          edgeType.targetType === targetTypeId) {
        validTypes.push(edgeType);
      }
    }
    
    return validTypes;
  }

  /**
   * Generate a schema object from this meta-graph
   * @returns {Object} Schema object compatible with GraphSchema
   */
  toSchema() {
    const nodeTypes = {};
    for (const [id, nodeType] of this.nodeTypes) {
      nodeTypes[id] = {
        name: nodeType.name,
        description: nodeType.description,
        properties: nodeType.properties,
        validation: nodeType.validation
      };
    }

    const edgeTypes = {};
    for (const [id, edgeType] of this.edgeTypes) {
      edgeTypes[id] = {
        name: edgeType.name,
        description: edgeType.description,
        sourceType: edgeType.sourceType,
        targetType: edgeType.targetType,
        cardinality: edgeType.cardinality,
        properties: edgeType.properties
      };
    }

    const constraints = {};
    for (const [id, constraint] of this.constraints) {
      constraints[id] = {
        type: constraint.type,
        description: constraint.description,
        target: constraint.target,
        rule: constraint.rule,
        severity: constraint.severity
      };
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      nodeTypes,
      edgeTypes,
      constraints,
      metadata: {
        createdAt: this.createdAt,
        isMeta: true
      }
    };
  }

  /**
   * Create a meta-graph from a schema object
   * @param {Object} schema - Schema object
   * @returns {MetaGraph} New meta-graph instance
   */
  static fromSchema(schema) {
    const metaGraph = new MetaGraph({
      id: schema.id,
      name: schema.name,
      description: schema.description
    });

    // Clear default types
    metaGraph.nodeTypes.clear();
    metaGraph.edgeTypes.clear();
    metaGraph.constraints.clear();

    // Load node types
    for (const [id, nodeType] of Object.entries(schema.nodeTypes || {})) {
      metaGraph.defineNodeType({
        id,
        ...nodeType
      });
    }

    // Load edge types
    for (const [id, edgeType] of Object.entries(schema.edgeTypes || {})) {
      metaGraph.defineEdgeType({
        id,
        ...edgeType
      });
    }

    // Load constraints
    for (const [id, constraint] of Object.entries(schema.constraints || {})) {
      metaGraph.addConstraint({
        id,
        ...constraint
      });
    }

    metaGraph.version = schema.version || '1.0.0';
    return metaGraph;
  }

  /**
   * Visualize the meta-graph structure
   * @returns {Object} Visualization data
   */
  visualize() {
    const nodes = [];
    const edges = [];

    // Add node type nodes
    for (const [id, nodeType] of this.nodeTypes) {
      nodes.push({
        id: `type-${id}`,
        type: 'NodeType',
        label: nodeType.name,
        data: nodeType,
        metadata: {
          isMeta: true,
          propertyCount: Object.keys(nodeType.properties).length
        }
      });
    }

    // Add edge type nodes
    for (const [id, edgeType] of this.edgeTypes) {
      nodes.push({
        id: `edge-type-${id}`,
        type: 'EdgeType',
        label: edgeType.name,
        data: edgeType,
        metadata: {
          isMeta: true
        }
      });

      // Add edges showing valid connections
      edges.push({
        id: `connection-${id}`,
        source: `type-${edgeType.sourceType}`,
        target: `type-${edgeType.targetType}`,
        type: 'ValidConnection',
        label: edgeType.name,
        metadata: {
          cardinality: edgeType.cardinality
        }
      });
    }

    return {
      nodes,
      edges,
      metadata: {
        nodeTypeCount: this.nodeTypes.size,
        edgeTypeCount: this.edgeTypes.size,
        constraintCount: this.constraints.size
      }
    };
  }

  /**
   * Validate that this meta-graph is self-consistent
   * @returns {Object} Validation result with errors and warnings
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check that all edge types reference existing node types
    for (const [id, edgeType] of this.edgeTypes) {
      if (!this.nodeTypes.has(edgeType.sourceType)) {
        errors.push({
          type: 'missing-node-type',
          edgeType: id,
          missingType: edgeType.sourceType,
          message: `Edge type ${id} references non-existent source type ${edgeType.sourceType}`
        });
      }

      if (!this.nodeTypes.has(edgeType.targetType)) {
        errors.push({
          type: 'missing-node-type',
          edgeType: id,
          missingType: edgeType.targetType,
          message: `Edge type ${id} references non-existent target type ${edgeType.targetType}`
        });
      }
    }

    // Check for orphaned node types (no edges)
    for (const [id, nodeType] of this.nodeTypes) {
      let hasEdges = false;
      
      for (const [, edgeType] of this.edgeTypes) {
        if (edgeType.sourceType === id || edgeType.targetType === id) {
          hasEdges = true;
          break;
        }
      }

      if (!hasEdges && !nodeType.metadata.isMeta) {
        warnings.push({
          type: 'orphaned-node-type',
          nodeType: id,
          message: `Node type ${id} has no edge types connecting to it`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get statistics about the meta-graph
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      nodeTypeCount: this.nodeTypes.size,
      edgeTypeCount: this.edgeTypes.size,
      constraintCount: this.constraints.size,
      avgPropertiesPerNodeType: this._calculateAverageProperties(),
      createdAt: this.createdAt,
      version: this.version
    };
  }

  /**
   * Calculate average number of properties per node type
   * @private
   * @returns {number} Average property count
   */
  _calculateAverageProperties() {
    if (this.nodeTypes.size === 0) return 0;
    
    let totalProperties = 0;
    for (const [, nodeType] of this.nodeTypes) {
      totalProperties += Object.keys(nodeType.properties).length;
    }
    
    return totalProperties / this.nodeTypes.size;
  }
}

/**
 * @typedef {Object} NodeTypeDescriptor
 * @property {string} id - Unique identifier
 * @property {string} name - Human-readable name
 * @property {string} [description] - Optional description
 * @property {Object} properties - Property definitions
 * @property {Object} [metadata] - Additional metadata
 * @property {Object} [validation] - Validation rules
 */

/**
 * @typedef {Object} EdgeTypeDescriptor
 * @property {string} id - Unique identifier
 * @property {string} [name] - Human-readable name
 * @property {string} [description] - Optional description
 * @property {string} sourceType - Source node type ID
 * @property {string} targetType - Target node type ID
 * @property {string} [cardinality] - Cardinality constraint
 * @property {Object} [properties] - Property definitions
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} ConstraintDescriptor
 * @property {string} id - Unique identifier
 * @property {string} type - Constraint type
 * @property {string} [description] - Optional description
 * @property {string} target - Target of constraint
 * @property {Function|string} rule - Validation rule
 * @property {string} [severity] - Severity level (error/warning)
 */