/**
 * Cross-Graph Edge Validator
 * 
 * Validates cross-graph edge definitions against the schema.
 * Uses vanilla JavaScript with no npm dependencies.
 * 
 * Policy Compliance:
 * - No npm imports (uses relative paths only)
 * - Cross-graph edges must be indexed (policy #22)
 * - Validates latency budgets for audio edges
 * 
 * @module harmony-schemas/validate-cross-graph-edge
 * @see {@link ../DESIGN_SYSTEM.md#cross-graph-edges}
 */

/**
 * Validates a cross-graph edge definition against the schema
 * 
 * @param {Object} edge - The edge definition to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateCrossGraphEdge(edge) {
  const errors = [];

  // Required fields
  const requiredFields = ['id', 'sourceGraph', 'sourceNode', 'targetGraph', 'targetNode', 'edgeType'];
  for (const field of requiredFields) {
    if (!edge[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate id format
  if (edge.id && !/^[a-zA-Z0-9_-]+$/.test(edge.id)) {
    errors.push('id must contain only alphanumeric characters, underscores, and hyphens');
  }
  if (edge.id && (edge.id.length < 1 || edge.id.length > 64)) {
    errors.push('id must be between 1 and 64 characters');
  }

  // Validate graph contexts
  const validGraphs = ['ui', 'audio', 'state', 'control'];
  if (edge.sourceGraph && !validGraphs.includes(edge.sourceGraph)) {
    errors.push(`sourceGraph must be one of: ${validGraphs.join(', ')}`);
  }
  if (edge.targetGraph && !validGraphs.includes(edge.targetGraph)) {
    errors.push(`targetGraph must be one of: ${validGraphs.join(', ')}`);
  }

  // Validate node identifiers
  const nodePattern = /^[a-zA-Z0-9_-]+$/;
  if (edge.sourceNode && !nodePattern.test(edge.sourceNode)) {
    errors.push('sourceNode must contain only alphanumeric characters, underscores, and hyphens');
  }
  if (edge.targetNode && !nodePattern.test(edge.targetNode)) {
    errors.push('targetNode must contain only alphanumeric characters, underscores, and hyphens');
  }

  // Validate port identifiers
  const portPattern = /^[a-zA-Z0-9_-]+$/;
  if (edge.sourcePort && !portPattern.test(edge.sourcePort)) {
    errors.push('sourcePort must contain only alphanumeric characters, underscores, and hyphens');
  }
  if (edge.targetPort && !portPattern.test(edge.targetPort)) {
    errors.push('targetPort must contain only alphanumeric characters, underscores, and hyphens');
  }

  // Validate edge type
  const validEdgeTypes = ['data', 'event', 'control', 'sync'];
  if (edge.edgeType && !validEdgeTypes.includes(edge.edgeType)) {
    errors.push(`edgeType must be one of: ${validEdgeTypes.join(', ')}`);
  }

  // Validate data type
  const validDataTypes = ['f32', 'i32', 'bool', 'string', 'buffer', 'event', 'command'];
  if (edge.dataType && !validDataTypes.includes(edge.dataType)) {
    errors.push(`dataType must be one of: ${validDataTypes.join(', ')}`);
  }

  // Buffer size required for buffer data type
  if (edge.dataType === 'buffer' && !edge.bufferSize) {
    errors.push('bufferSize is required when dataType is "buffer"');
  }
  if (edge.bufferSize !== undefined) {
    if (typeof edge.bufferSize !== 'number' || edge.bufferSize < 0 || edge.bufferSize > 1048576) {
      errors.push('bufferSize must be between 0 and 1048576 bytes');
    }
  }

  // Latency budget validation (required for audio edges per policy)
  if ((edge.sourceGraph === 'audio' || edge.targetGraph === 'audio') && !edge.latencyBudget) {
    errors.push('latencyBudget is required for edges connected to audio graph');
  }
  if (edge.latencyBudget !== undefined) {
    if (typeof edge.latencyBudget !== 'number' || edge.latencyBudget < 0 || edge.latencyBudget > 100) {
      errors.push('latencyBudget must be between 0 and 100 milliseconds');
    }
    // Audio processing latency policy: maximum 10ms
    if ((edge.sourceGraph === 'audio' || edge.targetGraph === 'audio') && edge.latencyBudget > 10) {
      errors.push('Audio edges must have latencyBudget <= 10ms (policy requirement)');
    }
  }

  // Priority validation
  if (edge.priority !== undefined) {
    if (typeof edge.priority !== 'number' || edge.priority < 0 || edge.priority > 100) {
      errors.push('priority must be between 0 and 100');
    }
  }

  // Indexed validation (policy #22: cross-graph edges must be indexed)
  if (edge.indexed === false) {
    errors.push('Cross-graph edges must be indexed (indexed: true) per policy #22');
  }

  // Metadata validation
  if (edge.metadata) {
    if (typeof edge.metadata !== 'object') {
      errors.push('metadata must be an object');
    } else {
      if (edge.metadata.description && edge.metadata.description.length > 256) {
        errors.push('metadata.description must be 256 characters or less');
      }
      if (edge.metadata.tags) {
        if (!Array.isArray(edge.metadata.tags)) {
          errors.push('metadata.tags must be an array');
        } else if (edge.metadata.tags.length > 10) {
          errors.push('metadata.tags must have 10 or fewer items');
        } else {
          for (const tag of edge.metadata.tags) {
            if (typeof tag !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(tag)) {
              errors.push('metadata.tags items must be alphanumeric strings with underscores and hyphens');
              break;
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates multiple cross-graph edges
 * 
 * @param {Array<Object>} edges - Array of edge definitions
 * @returns {Object} Validation result with { valid: boolean, results: Array<Object> }
 */
export function validateCrossGraphEdges(edges) {
  if (!Array.isArray(edges)) {
    return {
      valid: false,
      results: [],
      errors: ['Input must be an array of edge definitions']
    };
  }

  const results = edges.map((edge, index) => ({
    index,
    id: edge.id || `edge-${index}`,
    ...validateCrossGraphEdge(edge)
  }));

  const allValid = results.every(r => r.valid);

  return {
    valid: allValid,
    results,
    totalEdges: edges.length,
    validEdges: results.filter(r => r.valid).length,
    invalidEdges: results.filter(r => !r.valid).length
  };
}

/**
 * Creates a default cross-graph edge with required fields
 * 
 * @param {string} id - Edge identifier
 * @param {string} sourceGraph - Source graph context
 * @param {string} sourceNode - Source node identifier
 * @param {string} targetGraph - Target graph context
 * @param {string} targetNode - Target node identifier
 * @returns {Object} Default edge definition
 */
export function createDefaultEdge(id, sourceGraph, sourceNode, targetGraph, targetNode) {
  return {
    id,
    sourceGraph,
    sourceNode,
    targetGraph,
    targetNode,
    edgeType: 'event',
    dataType: 'event',
    priority: 50,
    indexed: true,
    metadata: {
      createdAt: new Date().toISOString()
    }
  };
}