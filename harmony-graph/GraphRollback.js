/**
 * @fileoverview GraphRollback - Revert graph to previous state on transaction failure
 * @module harmony-graph/GraphRollback
 * 
 * Provides atomic rollback capability for failed transactions by restoring
 * graph state from snapshots. Integrates with GraphTransaction, GraphSnapshot,
 * and SnapshotStore to ensure ACID properties.
 * 
 * Performance targets:
 * - Rollback operation: <5ms for small graphs (<1000 nodes)
 * - Rollback operation: <50ms for large graphs (>10000 nodes)
 * - Memory overhead: <10% of graph size during rollback
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Graph Engine - Rollback
 * Related files:
 * - harmony-graph/GraphTransaction.js - Transaction management
 * - harmony-graph/GraphSnapshot.js - Snapshot creation
 * - harmony-graph/SnapshotStore.js - Snapshot persistence
 * - harmony-graph/TransactionLog.js - Transaction history
 */

import { GraphSnapshot } from './GraphSnapshot.js';
import { SnapshotStore } from './SnapshotStore.js';

/**
 * Manages rollback operations for graph transactions
 * Restores graph state from snapshots when transactions fail
 * 
 * @class GraphRollback
 * @example
 * const rollback = new GraphRollback(graph, snapshotStore);
 * 
 * // Save checkpoint before risky operation
 * const checkpoint = rollback.createCheckpoint();
 * 
 * try {
 *   // ... perform mutations ...
 * } catch (error) {
 *   // Rollback to checkpoint on failure
 *   rollback.rollbackToCheckpoint(checkpoint);
 * }
 */
export class GraphRollback {
  /**
   * @param {Object} graph - Graph instance to manage rollbacks for
   * @param {SnapshotStore} snapshotStore - Store for persisting snapshots
   */
  constructor(graph, snapshotStore) {
    if (!graph) {
      throw new Error('GraphRollback requires a graph instance');
    }
    if (!snapshotStore || !(snapshotStore instanceof SnapshotStore)) {
      throw new Error('GraphRollback requires a SnapshotStore instance');
    }

    /** @private */
    this.graph = graph;
    
    /** @private */
    this.snapshotStore = snapshotStore;
    
    /** @private @type {Map<string, GraphSnapshot>} */
    this.checkpoints = new Map();
    
    /** @private @type {Array<{timestamp: number, operation: string, checkpoint: string}>} */
    this.rollbackHistory = [];
    
    /** @private */
    this.maxCheckpoints = 10;
    
    /** @private */
    this.autoCleanup = true;
  }

  /**
   * Creates a checkpoint of current graph state
   * Checkpoint can be used for rollback if subsequent operations fail
   * 
   * @param {Object} options - Checkpoint options
   * @param {string} [options.label] - Human-readable label for checkpoint
   * @param {Object} [options.metadata] - Additional metadata to store
   * @returns {string} Checkpoint ID for later rollback
   * 
   * @example
   * const checkpoint = rollback.createCheckpoint({
   *   label: 'Before bulk import',
   *   metadata: { source: 'import.json', recordCount: 1000 }
   * });
   */
  createCheckpoint(options = {}) {
    const startTime = performance.now();
    
    const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const snapshot = new GraphSnapshot(this.graph);
    
    const checkpointData = {
      id: checkpointId,
      snapshot,
      timestamp: Date.now(),
      label: options.label || `Checkpoint ${this.checkpoints.size + 1}`,
      metadata: options.metadata || {}
    };
    
    this.checkpoints.set(checkpointId, checkpointData);
    
    // Persist to store for durability
    this.snapshotStore.storeSnapshot(snapshot, {
      type: 'checkpoint',
      checkpointId,
      label: checkpointData.label
    });
    
    // Cleanup old checkpoints if needed
    if (this.autoCleanup && this.checkpoints.size > this.maxCheckpoints) {
      this._cleanupOldCheckpoints();
    }
    
    const duration = performance.now() - startTime;
    
    if (duration > 50) {
      console.warn(`GraphRollback: Checkpoint creation took ${duration.toFixed(2)}ms (target: <50ms)`);
    }
    
    return checkpointId;
  }

  /**
   * Rolls back graph to a specific checkpoint
   * Restores all nodes, edges, and metadata from checkpoint snapshot
   * 
   * @param {string} checkpointId - ID of checkpoint to restore
   * @returns {boolean} True if rollback successful, false otherwise
   * @throws {Error} If checkpoint not found
   * 
   * @example
   * try {
   *   graph.addNode({ id: 'node1', data: {} });
   *   throw new Error('Operation failed');
   * } catch (error) {
   *   rollback.rollbackToCheckpoint(checkpoint);
   *   // Graph restored to state before addNode
   * }
   */
  rollbackToCheckpoint(checkpointId) {
    const startTime = performance.now();
    
    const checkpointData = this.checkpoints.get(checkpointId);
    if (!checkpointData) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }
    
    try {
      const snapshot = checkpointData.snapshot;
      
      // Clear current graph state
      this._clearGraph();
      
      // Restore from snapshot
      this._restoreFromSnapshot(snapshot);
      
      // Record rollback in history
      this.rollbackHistory.push({
        timestamp: Date.now(),
        operation: 'rollback',
        checkpoint: checkpointId,
        label: checkpointData.label
      });
      
      const duration = performance.now() - startTime;
      
      if (duration > 50) {
        console.warn(`GraphRollback: Rollback took ${duration.toFixed(2)}ms (target: <50ms for large graphs)`);
      }
      
      return true;
    } catch (error) {
      console.error('GraphRollback: Rollback failed', error);
      return false;
    }
  }

  /**
   * Rolls back to the most recent checkpoint
   * Convenience method for common rollback pattern
   * 
   * @returns {boolean} True if rollback successful, false otherwise
   * @throws {Error} If no checkpoints exist
   * 
   * @example
   * rollback.createCheckpoint();
   * // ... operations ...
   * rollback.rollbackToLatest(); // Restore to last checkpoint
   */
  rollbackToLatest() {
    if (this.checkpoints.size === 0) {
      throw new Error('No checkpoints available for rollback');
    }
    
    // Find most recent checkpoint
    let latestCheckpoint = null;
    let latestTimestamp = 0;
    
    for (const [id, data] of this.checkpoints.entries()) {
      if (data.timestamp > latestTimestamp) {
        latestTimestamp = data.timestamp;
        latestCheckpoint = id;
      }
    }
    
    return this.rollbackToCheckpoint(latestCheckpoint);
  }

  /**
   * Rolls back to a specific version from snapshot store
   * Used for recovery from persistent storage
   * 
   * @param {number} version - Version number to restore
   * @returns {boolean} True if rollback successful, false otherwise
   * @throws {Error} If version not found in store
   * 
   * @example
   * // Restore from version 5 in persistent store
   * rollback.rollbackToVersion(5);
   */
  rollbackToVersion(version) {
    const startTime = performance.now();
    
    const snapshot = this.snapshotStore.getSnapshot(version);
    if (!snapshot) {
      throw new Error(`Version not found in store: ${version}`);
    }
    
    try {
      this._clearGraph();
      this._restoreFromSnapshot(snapshot);
      
      this.rollbackHistory.push({
        timestamp: Date.now(),
        operation: 'rollback_version',
        version
      });
      
      const duration = performance.now() - startTime;
      
      if (duration > 50) {
        console.warn(`GraphRollback: Version rollback took ${duration.toFixed(2)}ms`);
      }
      
      return true;
    } catch (error) {
      console.error('GraphRollback: Version rollback failed', error);
      return false;
    }
  }

  /**
   * Removes a specific checkpoint
   * Useful for manual checkpoint management
   * 
   * @param {string} checkpointId - ID of checkpoint to remove
   * @returns {boolean} True if checkpoint was removed
   */
  removeCheckpoint(checkpointId) {
    return this.checkpoints.delete(checkpointId);
  }

  /**
   * Clears all checkpoints
   * Does not affect snapshots in persistent store
   */
  clearCheckpoints() {
    this.checkpoints.clear();
  }

  /**
   * Gets list of available checkpoints
   * 
   * @returns {Array<Object>} Array of checkpoint metadata
   * 
   * @example
   * const checkpoints = rollback.getCheckpoints();
   * // [{ id: 'checkpoint_...', label: 'Before import', timestamp: 1234567890 }]
   */
  getCheckpoints() {
    return Array.from(this.checkpoints.values()).map(data => ({
      id: data.id,
      label: data.label,
      timestamp: data.timestamp,
      metadata: data.metadata
    }));
  }

  /**
   * Gets rollback history
   * 
   * @returns {Array<Object>} Array of rollback operations
   */
  getRollbackHistory() {
    return [...this.rollbackHistory];
  }

  /**
   * Clears graph state before restore
   * @private
   */
  _clearGraph() {
    // Clear all nodes and edges
    if (typeof this.graph.clear === 'function') {
      this.graph.clear();
    } else {
      // Manual clear if no clear method
      const nodeIds = Array.from(this.graph.nodes?.keys() || []);
      for (const nodeId of nodeIds) {
        this.graph.removeNode?.(nodeId);
      }
    }
  }

  /**
   * Restores graph from snapshot
   * @private
   * @param {GraphSnapshot} snapshot - Snapshot to restore from
   */
  _restoreFromSnapshot(snapshot) {
    const state = snapshot.getState();
    
    // Restore nodes
    for (const [nodeId, nodeData] of state.nodes.entries()) {
      if (typeof this.graph.addNode === 'function') {
        this.graph.addNode({
          id: nodeId,
          ...nodeData
        });
      }
    }
    
    // Restore edges
    for (const [edgeId, edgeData] of state.edges.entries()) {
      if (typeof this.graph.addEdge === 'function') {
        this.graph.addEdge({
          id: edgeId,
          from: edgeData.from,
          to: edgeData.to,
          ...edgeData
        });
      }
    }
    
    // Restore metadata
    if (this.graph.metadata && state.metadata) {
      Object.assign(this.graph.metadata, state.metadata);
    }
  }

  /**
   * Removes oldest checkpoints when limit exceeded
   * @private
   */
  _cleanupOldCheckpoints() {
    const checkpointArray = Array.from(this.checkpoints.entries());
    checkpointArray.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = checkpointArray.length - this.maxCheckpoints;
    for (let i = 0; i < toRemove; i++) {
      this.checkpoints.delete(checkpointArray[i][0]);
    }
  }

  /**
   * Configures rollback behavior
   * 
   * @param {Object} config - Configuration options
   * @param {number} [config.maxCheckpoints] - Maximum checkpoints to keep
   * @param {boolean} [config.autoCleanup] - Auto-cleanup old checkpoints
   */
  configure(config) {
    if (config.maxCheckpoints !== undefined) {
      this.maxCheckpoints = Math.max(1, config.maxCheckpoints);
    }
    if (config.autoCleanup !== undefined) {
      this.autoCleanup = config.autoCleanup;
    }
  }
}

/**
 * Creates a rollback-aware transaction wrapper
 * Automatically creates checkpoint and rolls back on failure
 * 
 * @param {Object} graph - Graph instance
 * @param {GraphRollback} rollback - Rollback manager
 * @param {Function} operation - Operation to execute
 * @param {Object} [options] - Transaction options
 * @returns {Promise<any>} Operation result
 * @throws {Error} Re-throws operation error after rollback
 * 
 * @example
 * await withRollback(graph, rollback, async () => {
 *   graph.addNode({ id: 'node1' });
 *   graph.addEdge({ from: 'node1', to: 'node2' });
 *   // If this throws, graph rolls back automatically
 *   await riskyOperation();
 * });
 */
export async function withRollback(graph, rollback, operation, options = {}) {
  const checkpoint = rollback.createCheckpoint({
    label: options.label || 'Auto checkpoint',
    metadata: options.metadata || {}
  });
  
  try {
    const result = await operation();
    
    // Operation succeeded, optionally keep or remove checkpoint
    if (options.keepCheckpoint !== true) {
      rollback.removeCheckpoint(checkpoint);
    }
    
    return result;
  } catch (error) {
    // Operation failed, rollback to checkpoint
    console.warn('withRollback: Operation failed, rolling back', error);
    rollback.rollbackToCheckpoint(checkpoint);
    
    // Re-throw error after rollback
    throw error;
  }
}