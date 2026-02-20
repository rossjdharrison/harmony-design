/**
 * @fileoverview ConflictResolver - Detects and resolves conflicts in distributed graph
 * 
 * Handles conflict detection and resolution for concurrent modifications in a distributed
 * graph system. Supports multiple resolution strategies (last-write-wins, manual, custom).
 * 
 * Related: harmony-graph/merge-strategy.js, harmony-graph/snapshot-diff.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Engine - Conflict Resolution
 * 
 * @module harmony-graph/conflict-resolver
 */

/**
 * @typedef {Object} Conflict
 * @property {string} nodeId - ID of the conflicting node
 * @property {string} edgeId - ID of the conflicting edge (if edge conflict)
 * @property {string} type - Type of conflict: 'node-update', 'edge-update', 'node-delete', 'edge-delete'
 * @property {any} localValue - Local version of the value
 * @property {any} remoteValue - Remote version of the value
 * @property {number} localTimestamp - Timestamp of local change
 * @property {number} remoteTimestamp - Timestamp of remote change
 * @property {string} localVersion - Local version identifier
 * @property {string} remoteVersion - Remote version identifier
 */

/**
 * @typedef {Object} ConflictResolution
 * @property {string} nodeId - ID of the resolved node
 * @property {string} edgeId - ID of the resolved edge (if edge conflict)
 * @property {any} resolvedValue - The resolved value
 * @property {string} strategy - Strategy used: 'local', 'remote', 'merge', 'manual'
 * @property {string} reason - Human-readable reason for resolution
 */

/**
 * @typedef {'last-write-wins' | 'manual' | 'custom'} ResolutionStrategy
 */

/**
 * ConflictResolver detects and resolves conflicts in distributed graph operations.
 * 
 * Performance: O(n) detection where n = number of changes
 * Memory: O(c) where c = number of conflicts
 * 
 * @class
 */
export class ConflictResolver {
  /**
   * @param {Object} options - Configuration options
   * @param {ResolutionStrategy} options.strategy - Default resolution strategy
   * @param {Function} [options.customResolver] - Custom resolution function
   * @param {boolean} [options.autoResolve=true] - Auto-resolve conflicts when possible
   */
  constructor(options = {}) {
    this.strategy = options.strategy || 'last-write-wins';
    this.customResolver = options.customResolver || null;
    this.autoResolve = options.autoResolve !== false;
    
    /** @type {Map<string, Conflict>} */
    this.conflicts = new Map();
    
    /** @type {Map<string, ConflictResolution>} */
    this.resolutions = new Map();
    
    /** @type {number} */
    this.conflictsDetected = 0;
    
    /** @type {number} */
    this.conflictsResolved = 0;
  }

  /**
   * Detects conflicts between local and remote changes.
   * 
   * @param {Object} localChanges - Local graph changes
   * @param {Object} remoteChanges - Remote graph changes
   * @returns {Conflict[]} Array of detected conflicts
   */
  detectConflicts(localChanges, remoteChanges) {
    const conflicts = [];
    
    // Detect node update conflicts
    if (localChanges.nodes && remoteChanges.nodes) {
      for (const [nodeId, localNode] of Object.entries(localChanges.nodes)) {
        const remoteNode = remoteChanges.nodes[nodeId];
        
        if (remoteNode) {
          const conflict = this._detectNodeConflict(nodeId, localNode, remoteNode);
          if (conflict) {
            conflicts.push(conflict);
            this.conflicts.set(nodeId, conflict);
          }
        }
      }
    }
    
    // Detect edge update conflicts
    if (localChanges.edges && remoteChanges.edges) {
      for (const [edgeId, localEdge] of Object.entries(localChanges.edges)) {
        const remoteEdge = remoteChanges.edges[edgeId];
        
        if (remoteEdge) {
          const conflict = this._detectEdgeConflict(edgeId, localEdge, remoteEdge);
          if (conflict) {
            conflicts.push(conflict);
            this.conflicts.set(edgeId, conflict);
          }
        }
      }
    }
    
    // Detect delete conflicts
    if (localChanges.deleted && remoteChanges.deleted) {
      const deleteConflicts = this._detectDeleteConflicts(
        localChanges.deleted,
        remoteChanges.deleted,
        localChanges,
        remoteChanges
      );
      conflicts.push(...deleteConflicts);
    }
    
    this.conflictsDetected += conflicts.length;
    
    return conflicts;
  }

  /**
   * Detects conflict for a single node.
   * 
   * @private
   * @param {string} nodeId - Node identifier
   * @param {Object} localNode - Local node state
   * @param {Object} remoteNode - Remote node state
   * @returns {Conflict|null} Conflict if detected, null otherwise
   */
  _detectNodeConflict(nodeId, localNode, remoteNode) {
    // Check if versions differ
    if (localNode.version === remoteNode.version) {
      return null; // No conflict - same version
    }
    
    // Check if values differ
    const localValue = JSON.stringify(localNode.data || localNode);
    const remoteValue = JSON.stringify(remoteNode.data || remoteNode);
    
    if (localValue === remoteValue) {
      return null; // No conflict - same data
    }
    
    return {
      nodeId,
      edgeId: null,
      type: 'node-update',
      localValue: localNode.data || localNode,
      remoteValue: remoteNode.data || remoteNode,
      localTimestamp: localNode.timestamp || Date.now(),
      remoteTimestamp: remoteNode.timestamp || Date.now(),
      localVersion: localNode.version || '0',
      remoteVersion: remoteNode.version || '0'
    };
  }

  /**
   * Detects conflict for a single edge.
   * 
   * @private
   * @param {string} edgeId - Edge identifier
   * @param {Object} localEdge - Local edge state
   * @param {Object} remoteEdge - Remote edge state
   * @returns {Conflict|null} Conflict if detected, null otherwise
   */
  _detectEdgeConflict(edgeId, localEdge, remoteEdge) {
    // Check if versions differ
    if (localEdge.version === remoteEdge.version) {
      return null;
    }
    
    // Check if edge endpoints or data differ
    const localData = JSON.stringify({
      from: localEdge.from,
      to: localEdge.to,
      data: localEdge.data
    });
    const remoteData = JSON.stringify({
      from: remoteEdge.from,
      to: remoteEdge.to,
      data: remoteEdge.data
    });
    
    if (localData === remoteData) {
      return null;
    }
    
    return {
      nodeId: null,
      edgeId,
      type: 'edge-update',
      localValue: localEdge,
      remoteValue: remoteEdge,
      localTimestamp: localEdge.timestamp || Date.now(),
      remoteTimestamp: remoteEdge.timestamp || Date.now(),
      localVersion: localEdge.version || '0',
      remoteVersion: remoteEdge.version || '0'
    };
  }

  /**
   * Detects conflicts where one side deletes and other modifies.
   * 
   * @private
   * @param {Object} localDeleted - Local deleted items
   * @param {Object} remoteDeleted - Remote deleted items
   * @param {Object} localChanges - All local changes
   * @param {Object} remoteChanges - All remote changes
   * @returns {Conflict[]} Array of delete conflicts
   */
  _detectDeleteConflicts(localDeleted, remoteDeleted, localChanges, remoteChanges) {
    const conflicts = [];
    
    // Check if local deleted but remote modified
    if (localDeleted.nodes) {
      for (const nodeId of localDeleted.nodes) {
        if (remoteChanges.nodes && remoteChanges.nodes[nodeId]) {
          conflicts.push({
            nodeId,
            edgeId: null,
            type: 'node-delete',
            localValue: null,
            remoteValue: remoteChanges.nodes[nodeId],
            localTimestamp: Date.now(),
            remoteTimestamp: remoteChanges.nodes[nodeId].timestamp || Date.now(),
            localVersion: 'deleted',
            remoteVersion: remoteChanges.nodes[nodeId].version || '0'
          });
        }
      }
    }
    
    // Check if remote deleted but local modified
    if (remoteDeleted.nodes) {
      for (const nodeId of remoteDeleted.nodes) {
        if (localChanges.nodes && localChanges.nodes[nodeId]) {
          conflicts.push({
            nodeId,
            edgeId: null,
            type: 'node-delete',
            localValue: localChanges.nodes[nodeId],
            remoteValue: null,
            localTimestamp: localChanges.nodes[nodeId].timestamp || Date.now(),
            remoteTimestamp: Date.now(),
            localVersion: localChanges.nodes[nodeId].version || '0',
            remoteVersion: 'deleted'
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Resolves detected conflicts using configured strategy.
   * 
   * @param {Conflict[]} conflicts - Array of conflicts to resolve
   * @returns {ConflictResolution[]} Array of resolutions
   */
  resolveConflicts(conflicts) {
    const resolutions = [];
    
    for (const conflict of conflicts) {
      let resolution;
      
      switch (this.strategy) {
        case 'last-write-wins':
          resolution = this._resolveLastWriteWins(conflict);
          break;
        
        case 'custom':
          if (this.customResolver) {
            resolution = this.customResolver(conflict);
          } else {
            resolution = this._resolveManual(conflict);
          }
          break;
        
        case 'manual':
        default:
          resolution = this._resolveManual(conflict);
          break;
      }
      
      resolutions.push(resolution);
      this.resolutions.set(conflict.nodeId || conflict.edgeId, resolution);
      this.conflictsResolved++;
    }
    
    return resolutions;
  }

  /**
   * Resolves conflict using last-write-wins strategy.
   * 
   * @private
   * @param {Conflict} conflict - Conflict to resolve
   * @returns {ConflictResolution} Resolution
   */
  _resolveLastWriteWins(conflict) {
    const useRemote = conflict.remoteTimestamp > conflict.localTimestamp;
    
    return {
      nodeId: conflict.nodeId,
      edgeId: conflict.edgeId,
      resolvedValue: useRemote ? conflict.remoteValue : conflict.localValue,
      strategy: useRemote ? 'remote' : 'local',
      reason: `Last write wins: ${useRemote ? 'remote' : 'local'} timestamp ${useRemote ? conflict.remoteTimestamp : conflict.localTimestamp} is newer`
    };
  }

  /**
   * Marks conflict for manual resolution.
   * 
   * @private
   * @param {Conflict} conflict - Conflict to resolve
   * @returns {ConflictResolution} Resolution marking manual intervention needed
   */
  _resolveManual(conflict) {
    return {
      nodeId: conflict.nodeId,
      edgeId: conflict.edgeId,
      resolvedValue: null,
      strategy: 'manual',
      reason: 'Manual resolution required'
    };
  }

  /**
   * Applies resolved conflicts to a graph state.
   * 
   * @param {Object} graphState - Graph state to apply resolutions to
   * @param {ConflictResolution[]} resolutions - Resolutions to apply
   * @returns {Object} Updated graph state
   */
  applyResolutions(graphState, resolutions) {
    const updatedState = JSON.parse(JSON.stringify(graphState));
    
    for (const resolution of resolutions) {
      if (resolution.strategy === 'manual' || resolution.resolvedValue === null) {
        continue; // Skip manual resolutions
      }
      
      if (resolution.nodeId) {
        if (!updatedState.nodes) {
          updatedState.nodes = {};
        }
        updatedState.nodes[resolution.nodeId] = resolution.resolvedValue;
      }
      
      if (resolution.edgeId) {
        if (!updatedState.edges) {
          updatedState.edges = {};
        }
        updatedState.edges[resolution.edgeId] = resolution.resolvedValue;
      }
    }
    
    return updatedState;
  }

  /**
   * Gets all unresolved conflicts.
   * 
   * @returns {Conflict[]} Array of unresolved conflicts
   */
  getUnresolvedConflicts() {
    const unresolved = [];
    
    for (const [id, conflict] of this.conflicts.entries()) {
      const resolution = this.resolutions.get(id);
      if (!resolution || resolution.strategy === 'manual') {
        unresolved.push(conflict);
      }
    }
    
    return unresolved;
  }

  /**
   * Manually resolves a conflict with a specific value.
   * 
   * @param {string} conflictId - Node or edge ID of the conflict
   * @param {any} resolvedValue - The resolved value
   * @param {string} [reason] - Reason for resolution
   * @returns {ConflictResolution} The resolution
   */
  manualResolve(conflictId, resolvedValue, reason = 'Manual resolution') {
    const conflict = this.conflicts.get(conflictId);
    
    if (!conflict) {
      throw new Error(`No conflict found with ID: ${conflictId}`);
    }
    
    const resolution = {
      nodeId: conflict.nodeId,
      edgeId: conflict.edgeId,
      resolvedValue,
      strategy: 'manual',
      reason
    };
    
    this.resolutions.set(conflictId, resolution);
    this.conflictsResolved++;
    
    return resolution;
  }

  /**
   * Clears all stored conflicts and resolutions.
   */
  clear() {
    this.conflicts.clear();
    this.resolutions.clear();
  }

  /**
   * Gets statistics about conflict resolution.
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      conflictsDetected: this.conflictsDetected,
      conflictsResolved: this.conflictsResolved,
      unresolvedCount: this.getUnresolvedConflicts().length,
      strategy: this.strategy,
      autoResolve: this.autoResolve
    };
  }
}