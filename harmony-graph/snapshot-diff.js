/**
 * @fileoverview SnapshotDiff: Compute diff between two snapshots
 * 
 * Compares two GraphSnapshot instances and produces a structured diff
 * showing what changed between them. Supports node additions/removals/modifications,
 * edge changes, and metadata updates.
 * 
 * Related: harmony-graph/graph-snapshot.js, harmony-graph/delta-encoder.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Snapshot System
 * 
 * @module harmony-graph/snapshot-diff
 */

/**
 * @typedef {Object} NodeDiff
 * @property {'added'|'removed'|'modified'} type - Type of change
 * @property {string} nodeId - ID of the node
 * @property {Object} [oldData] - Previous node data (for removed/modified)
 * @property {Object} [newData] - New node data (for added/modified)
 * @property {Object} [changes] - Specific field changes (for modified)
 */

/**
 * @typedef {Object} EdgeDiff
 * @property {'added'|'removed'} type - Type of change
 * @property {string} edgeId - ID of the edge
 * @property {string} from - Source node ID
 * @property {string} to - Target node ID
 * @property {string} [edgeType] - Type of edge
 * @property {Object} [metadata] - Edge metadata
 */

/**
 * @typedef {Object} MetadataDiff
 * @property {string} key - Metadata key
 * @property {*} oldValue - Previous value
 * @property {*} newValue - New value
 */

/**
 * @typedef {Object} SnapshotDiffResult
 * @property {string} fromVersion - Source snapshot version
 * @property {string} toVersion - Target snapshot version
 * @property {number} timestamp - Diff computation timestamp
 * @property {NodeDiff[]} nodes - Node changes
 * @property {EdgeDiff[]} edges - Edge changes
 * @property {MetadataDiff[]} metadata - Metadata changes
 * @property {Object} statistics - Diff statistics
 * @property {number} statistics.nodesAdded - Count of added nodes
 * @property {number} statistics.nodesRemoved - Count of removed nodes
 * @property {number} statistics.nodesModified - Count of modified nodes
 * @property {number} statistics.edgesAdded - Count of added edges
 * @property {number} statistics.edgesRemoved - Count of removed edges
 * @property {number} statistics.metadataChanged - Count of changed metadata keys
 */

/**
 * Computes the difference between two graph snapshots
 * 
 * Performance target: <5ms for graphs with <1000 nodes
 * Memory target: O(changes) not O(total nodes)
 * 
 * @class SnapshotDiff
 */
export class SnapshotDiff {
  /**
   * Creates a new SnapshotDiff instance
   */
  constructor() {
    /** @type {Map<string, Function>} Custom comparators for specific node types */
    this.nodeComparators = new Map();
    
    /** @type {Set<string>} Fields to ignore in node comparison */
    this.ignoredFields = new Set(['_internal', '__cached']);
  }

  /**
   * Registers a custom comparator for a specific node type
   * 
   * @param {string} nodeType - Type of node
   * @param {Function} comparator - Custom comparison function (oldData, newData) => changes
   */
  registerComparator(nodeType, comparator) {
    if (typeof comparator !== 'function') {
      throw new Error('Comparator must be a function');
    }
    this.nodeComparators.set(nodeType, comparator);
  }

  /**
   * Adds a field to ignore during node comparison
   * 
   * @param {string} fieldName - Field name to ignore
   */
  ignoreField(fieldName) {
    this.ignoredFields.add(fieldName);
  }

  /**
   * Computes the diff between two snapshots
   * 
   * @param {Object} fromSnapshot - Source snapshot (older)
   * @param {Object} toSnapshot - Target snapshot (newer)
   * @returns {SnapshotDiffResult} Structured diff result
   * @throws {Error} If snapshots are invalid
   */
  compute(fromSnapshot, toSnapshot) {
    this._validateSnapshots(fromSnapshot, toSnapshot);

    const startTime = performance.now();

    const result = {
      fromVersion: fromSnapshot.version,
      toVersion: toSnapshot.version,
      timestamp: Date.now(),
      nodes: [],
      edges: [],
      metadata: [],
      statistics: {
        nodesAdded: 0,
        nodesRemoved: 0,
        nodesModified: 0,
        edgesAdded: 0,
        edgesRemoved: 0,
        metadataChanged: 0
      }
    };

    // Compute node diffs
    this._computeNodeDiffs(fromSnapshot, toSnapshot, result);

    // Compute edge diffs
    this._computeEdgeDiffs(fromSnapshot, toSnapshot, result);

    // Compute metadata diffs
    this._computeMetadataDiffs(fromSnapshot, toSnapshot, result);

    const elapsed = performance.now() - startTime;
    
    // Performance warning if diff computation is slow
    if (elapsed > 5) {
      console.warn(`SnapshotDiff: Slow diff computation (${elapsed.toFixed(2)}ms)`);
    }

    return result;
  }

  /**
   * Validates that both snapshots are properly formatted
   * 
   * @private
   * @param {Object} fromSnapshot - Source snapshot
   * @param {Object} toSnapshot - Target snapshot
   * @throws {Error} If validation fails
   */
  _validateSnapshots(fromSnapshot, toSnapshot) {
    if (!fromSnapshot || !toSnapshot) {
      throw new Error('Both snapshots must be provided');
    }

    if (!fromSnapshot.version || !toSnapshot.version) {
      throw new Error('Snapshots must have version information');
    }

    if (!fromSnapshot.nodes || !toSnapshot.nodes) {
      throw new Error('Snapshots must contain nodes data');
    }

    if (!fromSnapshot.edges || !toSnapshot.edges) {
      throw new Error('Snapshots must contain edges data');
    }
  }

  /**
   * Computes differences in nodes between snapshots
   * 
   * @private
   * @param {Object} fromSnapshot - Source snapshot
   * @param {Object} toSnapshot - Target snapshot
   * @param {SnapshotDiffResult} result - Result object to populate
   */
  _computeNodeDiffs(fromSnapshot, toSnapshot, result) {
    const fromNodes = new Map(Object.entries(fromSnapshot.nodes));
    const toNodes = new Map(Object.entries(toSnapshot.nodes));

    // Find added and modified nodes
    for (const [nodeId, newData] of toNodes) {
      if (!fromNodes.has(nodeId)) {
        // Node added
        result.nodes.push({
          type: 'added',
          nodeId,
          newData: this._cloneData(newData)
        });
        result.statistics.nodesAdded++;
      } else {
        // Check if modified
        const oldData = fromNodes.get(nodeId);
        const changes = this._compareNodeData(oldData, newData);
        
        if (Object.keys(changes).length > 0) {
          result.nodes.push({
            type: 'modified',
            nodeId,
            oldData: this._cloneData(oldData),
            newData: this._cloneData(newData),
            changes
          });
          result.statistics.nodesModified++;
        }
      }
    }

    // Find removed nodes
    for (const [nodeId, oldData] of fromNodes) {
      if (!toNodes.has(nodeId)) {
        result.nodes.push({
          type: 'removed',
          nodeId,
          oldData: this._cloneData(oldData)
        });
        result.statistics.nodesRemoved++;
      }
    }
  }

  /**
   * Compares two node data objects and returns changes
   * 
   * @private
   * @param {Object} oldData - Previous node data
   * @param {Object} newData - New node data
   * @returns {Object} Object containing changed fields
   */
  _compareNodeData(oldData, newData) {
    const changes = {};

    // Use custom comparator if available
    const nodeType = newData.type || oldData.type;
    if (nodeType && this.nodeComparators.has(nodeType)) {
      return this.nodeComparators.get(nodeType)(oldData, newData);
    }

    // Default field-by-field comparison
    const allKeys = new Set([
      ...Object.keys(oldData),
      ...Object.keys(newData)
    ]);

    for (const key of allKeys) {
      // Skip ignored fields
      if (this.ignoredFields.has(key)) {
        continue;
      }

      const oldValue = oldData[key];
      const newValue = newData[key];

      if (!this._deepEqual(oldValue, newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue
        };
      }
    }

    return changes;
  }

  /**
   * Computes differences in edges between snapshots
   * 
   * @private
   * @param {Object} fromSnapshot - Source snapshot
   * @param {Object} toSnapshot - Target snapshot
   * @param {SnapshotDiffResult} result - Result object to populate
   */
  _computeEdgeDiffs(fromSnapshot, toSnapshot, result) {
    const fromEdges = new Map(
      fromSnapshot.edges.map(e => [this._edgeKey(e), e])
    );
    const toEdges = new Map(
      toSnapshot.edges.map(e => [this._edgeKey(e), e])
    );

    // Find added edges
    for (const [key, edge] of toEdges) {
      if (!fromEdges.has(key)) {
        result.edges.push({
          type: 'added',
          edgeId: edge.id || key,
          from: edge.from,
          to: edge.to,
          edgeType: edge.type,
          metadata: edge.metadata
        });
        result.statistics.edgesAdded++;
      }
    }

    // Find removed edges
    for (const [key, edge] of fromEdges) {
      if (!toEdges.has(key)) {
        result.edges.push({
          type: 'removed',
          edgeId: edge.id || key,
          from: edge.from,
          to: edge.to,
          edgeType: edge.type,
          metadata: edge.metadata
        });
        result.statistics.edgesRemoved++;
      }
    }
  }

  /**
   * Computes differences in metadata between snapshots
   * 
   * @private
   * @param {Object} fromSnapshot - Source snapshot
   * @param {Object} toSnapshot - Target snapshot
   * @param {SnapshotDiffResult} result - Result object to populate
   */
  _computeMetadataDiffs(fromSnapshot, toSnapshot, result) {
    const fromMeta = fromSnapshot.metadata || {};
    const toMeta = toSnapshot.metadata || {};

    const allKeys = new Set([
      ...Object.keys(fromMeta),
      ...Object.keys(toMeta)
    ]);

    for (const key of allKeys) {
      const oldValue = fromMeta[key];
      const newValue = toMeta[key];

      if (!this._deepEqual(oldValue, newValue)) {
        result.metadata.push({
          key,
          oldValue,
          newValue
        });
        result.statistics.metadataChanged++;
      }
    }
  }

  /**
   * Creates a unique key for an edge
   * 
   * @private
   * @param {Object} edge - Edge object
   * @returns {string} Unique edge key
   */
  _edgeKey(edge) {
    return `${edge.from}->${edge.to}:${edge.type || 'default'}`;
  }

  /**
   * Deep equality comparison for values
   * 
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True if deeply equal
   */
  _deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((val, idx) => this._deepEqual(val, b[idx]));
      }

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      return keysA.every(key => this._deepEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Creates a deep clone of data
   * 
   * @private
   * @param {*} data - Data to clone
   * @returns {*} Cloned data
   */
  _cloneData(data) {
    if (data == null || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this._cloneData(item));
    }

    const clone = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        clone[key] = this._cloneData(data[key]);
      }
    }
    return clone;
  }

  /**
   * Checks if a diff is empty (no changes)
   * 
   * @param {SnapshotDiffResult} diff - Diff result to check
   * @returns {boolean} True if no changes detected
   */
  isEmpty(diff) {
    return diff.nodes.length === 0 &&
           diff.edges.length === 0 &&
           diff.metadata.length === 0;
  }

  /**
   * Inverts a diff (swaps from/to)
   * 
   * @param {SnapshotDiffResult} diff - Diff to invert
   * @returns {SnapshotDiffResult} Inverted diff
   */
  invert(diff) {
    return {
      fromVersion: diff.toVersion,
      toVersion: diff.fromVersion,
      timestamp: Date.now(),
      nodes: diff.nodes.map(node => this._invertNodeDiff(node)),
      edges: diff.edges.map(edge => this._invertEdgeDiff(edge)),
      metadata: diff.metadata.map(meta => ({
        key: meta.key,
        oldValue: meta.newValue,
        newValue: meta.oldValue
      })),
      statistics: {
        nodesAdded: diff.statistics.nodesRemoved,
        nodesRemoved: diff.statistics.nodesAdded,
        nodesModified: diff.statistics.nodesModified,
        edgesAdded: diff.statistics.edgesRemoved,
        edgesRemoved: diff.statistics.edgesAdded,
        metadataChanged: diff.statistics.metadataChanged
      }
    };
  }

  /**
   * Inverts a node diff
   * 
   * @private
   * @param {NodeDiff} nodeDiff - Node diff to invert
   * @returns {NodeDiff} Inverted node diff
   */
  _invertNodeDiff(nodeDiff) {
    if (nodeDiff.type === 'added') {
      return {
        type: 'removed',
        nodeId: nodeDiff.nodeId,
        oldData: nodeDiff.newData
      };
    }

    if (nodeDiff.type === 'removed') {
      return {
        type: 'added',
        nodeId: nodeDiff.nodeId,
        newData: nodeDiff.oldData
      };
    }

    // Modified - swap old/new and invert changes
    const invertedChanges = {};
    for (const [key, change] of Object.entries(nodeDiff.changes)) {
      invertedChanges[key] = {
        from: change.to,
        to: change.from
      };
    }

    return {
      type: 'modified',
      nodeId: nodeDiff.nodeId,
      oldData: nodeDiff.newData,
      newData: nodeDiff.oldData,
      changes: invertedChanges
    };
  }

  /**
   * Inverts an edge diff
   * 
   * @private
   * @param {EdgeDiff} edgeDiff - Edge diff to invert
   * @returns {EdgeDiff} Inverted edge diff
   */
  _invertEdgeDiff(edgeDiff) {
    return {
      ...edgeDiff,
      type: edgeDiff.type === 'added' ? 'removed' : 'added'
    };
  }

  /**
   * Formats a diff as human-readable text
   * 
   * @param {SnapshotDiffResult} diff - Diff to format
   * @returns {string} Formatted diff description
   */
  format(diff) {
    const lines = [];
    lines.push(`Snapshot Diff: ${diff.fromVersion} → ${diff.toVersion}`);
    lines.push('');

    // Summary
    lines.push('Summary:');
    lines.push(`  Nodes: +${diff.statistics.nodesAdded} -${diff.statistics.nodesRemoved} ~${diff.statistics.nodesModified}`);
    lines.push(`  Edges: +${diff.statistics.edgesAdded} -${diff.statistics.edgesRemoved}`);
    lines.push(`  Metadata: ${diff.statistics.metadataChanged} changed`);
    lines.push('');

    // Node details
    if (diff.nodes.length > 0) {
      lines.push('Node Changes:');
      for (const node of diff.nodes) {
        lines.push(`  [${node.type.toUpperCase()}] ${node.nodeId}`);
        if (node.type === 'modified' && node.changes) {
          for (const [key, change] of Object.entries(node.changes)) {
            lines.push(`    ${key}: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`);
          }
        }
      }
      lines.push('');
    }

    // Edge details
    if (diff.edges.length > 0) {
      lines.push('Edge Changes:');
      for (const edge of diff.edges) {
        lines.push(`  [${edge.type.toUpperCase()}] ${edge.from} → ${edge.to} (${edge.edgeType || 'default'})`);
      }
      lines.push('');
    }

    // Metadata details
    if (diff.metadata.length > 0) {
      lines.push('Metadata Changes:');
      for (const meta of diff.metadata) {
        lines.push(`  ${meta.key}: ${JSON.stringify(meta.oldValue)} → ${JSON.stringify(meta.newValue)}`);
      }
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const snapshotDiff = new SnapshotDiff();