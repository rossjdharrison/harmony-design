/**
 * @fileoverview MergeStrategy: Strategies for merging concurrent graph modifications
 * 
 * Provides pluggable strategies for resolving conflicts when multiple concurrent
 * modifications are made to the graph. Supports last-write-wins, first-write-wins,
 * custom merge logic, and operational transformation patterns.
 * 
 * Part of the graph persistence and synchronization layer.
 * See DESIGN_SYSTEM.md § Graph Persistence for architecture overview.
 * 
 * @module harmony-graph/merge-strategy
 */

/**
 * Base merge strategy interface
 * All concrete strategies must implement this interface
 * 
 * @interface IMergeStrategy
 */
class IMergeStrategy {
  /**
   * Merge two conflicting operations
   * 
   * @param {GraphOperation} localOp - Local operation
   * @param {GraphOperation} remoteOp - Remote operation
   * @param {GraphSnapshot} baseSnapshot - Common ancestor snapshot
   * @returns {MergeResult} Result of merge operation
   */
  merge(localOp, remoteOp, baseSnapshot) {
    throw new Error('IMergeStrategy.merge must be implemented');
  }

  /**
   * Get strategy name for logging and debugging
   * 
   * @returns {string} Strategy name
   */
  getName() {
    throw new Error('IMergeStrategy.getName must be implemented');
  }
}

/**
 * Result of a merge operation
 * 
 * @typedef {Object} MergeResult
 * @property {boolean} success - Whether merge succeeded
 * @property {GraphOperation[]} operations - Resulting operations to apply
 * @property {string[]} conflicts - Array of conflict descriptions
 * @property {Object} metadata - Additional metadata about merge
 */

/**
 * Graph operation representation
 * 
 * @typedef {Object} GraphOperation
 * @property {string} type - Operation type (add_node, remove_node, add_edge, etc.)
 * @property {string} entityId - ID of affected entity
 * @property {Object} data - Operation data
 * @property {number} timestamp - Operation timestamp
 * @property {string} clientId - ID of client that created operation
 * @property {number} version - Version number
 */

/**
 * Last-Write-Wins Strategy
 * Resolves conflicts by keeping the operation with the latest timestamp
 * Simple but may lose data
 * 
 * @implements {IMergeStrategy}
 */
export class LastWriteWinsStrategy extends IMergeStrategy {
  constructor() {
    super();
  }

  /**
   * @override
   */
  getName() {
    return 'LastWriteWins';
  }

  /**
   * @override
   */
  merge(localOp, remoteOp, baseSnapshot) {
    // Compare timestamps
    const useRemote = remoteOp.timestamp > localOp.timestamp;
    
    return {
      success: true,
      operations: [useRemote ? remoteOp : localOp],
      conflicts: useRemote ? [
        `Local operation ${localOp.type} on ${localOp.entityId} overwritten by remote`
      ] : [],
      metadata: {
        strategy: this.getName(),
        winner: useRemote ? 'remote' : 'local',
        localTimestamp: localOp.timestamp,
        remoteTimestamp: remoteOp.timestamp
      }
    };
  }
}

/**
 * First-Write-Wins Strategy
 * Resolves conflicts by keeping the operation with the earliest timestamp
 * Useful for append-only scenarios
 * 
 * @implements {IMergeStrategy}
 */
export class FirstWriteWinsStrategy extends IMergeStrategy {
  constructor() {
    super();
  }

  /**
   * @override
   */
  getName() {
    return 'FirstWriteWins';
  }

  /**
   * @override
   */
  merge(localOp, remoteOp, baseSnapshot) {
    // Compare timestamps
    const useRemote = remoteOp.timestamp < localOp.timestamp;
    
    return {
      success: true,
      operations: [useRemote ? remoteOp : localOp],
      conflicts: useRemote ? [
        `Local operation ${localOp.type} on ${localOp.entityId} rejected (remote was first)`
      ] : [],
      metadata: {
        strategy: this.getName(),
        winner: useRemote ? 'remote' : 'local',
        localTimestamp: localOp.timestamp,
        remoteTimestamp: remoteOp.timestamp
      }
    };
  }
}

/**
 * Client-Priority Strategy
 * Resolves conflicts by prioritizing operations from specific clients
 * Useful for collaborative editing with roles
 * 
 * @implements {IMergeStrategy}
 */
export class ClientPriorityStrategy extends IMergeStrategy {
  /**
   * @param {Map<string, number>} priorities - Map of clientId to priority (higher = wins)
   */
  constructor(priorities = new Map()) {
    super();
    this.priorities = priorities;
    this.defaultPriority = 0;
  }

  /**
   * @override
   */
  getName() {
    return 'ClientPriority';
  }

  /**
   * Set priority for a client
   * 
   * @param {string} clientId - Client ID
   * @param {number} priority - Priority value (higher wins)
   */
  setPriority(clientId, priority) {
    this.priorities.set(clientId, priority);
  }

  /**
   * Get priority for a client
   * 
   * @param {string} clientId - Client ID
   * @returns {number} Priority value
   */
  getPriority(clientId) {
    return this.priorities.get(clientId) ?? this.defaultPriority;
  }

  /**
   * @override
   */
  merge(localOp, remoteOp, baseSnapshot) {
    const localPriority = this.getPriority(localOp.clientId);
    const remotePriority = this.getPriority(remoteOp.clientId);
    
    // If equal priority, fall back to timestamp
    let useRemote;
    if (remotePriority === localPriority) {
      useRemote = remoteOp.timestamp > localOp.timestamp;
    } else {
      useRemote = remotePriority > localPriority;
    }
    
    return {
      success: true,
      operations: [useRemote ? remoteOp : localOp],
      conflicts: useRemote ? [
        `Local operation ${localOp.type} on ${localOp.entityId} overwritten by higher-priority client`
      ] : [],
      metadata: {
        strategy: this.getName(),
        winner: useRemote ? 'remote' : 'local',
        localPriority,
        remotePriority
      }
    };
  }
}

/**
 * Operational Transformation Strategy
 * Transforms operations so both can be applied without conflicts
 * Most sophisticated but complex
 * 
 * @implements {IMergeStrategy}
 */
export class OperationalTransformStrategy extends IMergeStrategy {
  constructor() {
    super();
  }

  /**
   * @override
   */
  getName() {
    return 'OperationalTransform';
  }

  /**
   * Transform two operations against each other
   * 
   * @param {GraphOperation} op1 - First operation
   * @param {GraphOperation} op2 - Second operation
   * @returns {{op1Prime: GraphOperation, op2Prime: GraphOperation}} Transformed operations
   * @private
   */
  _transform(op1, op2) {
    // If operations affect different entities, no transformation needed
    if (op1.entityId !== op2.entityId) {
      return { op1Prime: op1, op2Prime: op2 };
    }

    // Handle specific operation type combinations
    const key = `${op1.type}:${op2.type}`;
    
    switch (key) {
      case 'add_node:add_node':
        // Both adding same node - keep first, drop second
        return {
          op1Prime: op1,
          op2Prime: { ...op2, type: 'noop' }
        };
        
      case 'remove_node:remove_node':
        // Both removing same node - keep first, drop second
        return {
          op1Prime: op1,
          op2Prime: { ...op2, type: 'noop' }
        };
        
      case 'add_node:remove_node':
      case 'remove_node:add_node':
        // Add/remove conflict - keep both, let later logic decide
        return { op1Prime: op1, op2Prime: op2 };
        
      case 'update_node:update_node':
        // Both updating same node - merge properties
        return {
          op1Prime: op1,
          op2Prime: {
            ...op2,
            data: {
              ...op2.data,
              properties: this._mergeProperties(
                op1.data.properties || {},
                op2.data.properties || {}
              )
            }
          }
        };
        
      case 'add_edge:add_edge':
        // Both adding same edge - check if endpoints differ
        if (op1.data.source === op2.data.source && 
            op1.data.target === op2.data.target) {
          return {
            op1Prime: op1,
            op2Prime: { ...op2, type: 'noop' }
          };
        }
        return { op1Prime: op1, op2Prime: op2 };
        
      default:
        // No specific transformation rule - keep both
        return { op1Prime: op1, op2Prime: op2 };
    }
  }

  /**
   * Merge property objects, preferring non-null values
   * 
   * @param {Object} props1 - First property set
   * @param {Object} props2 - Second property set
   * @returns {Object} Merged properties
   * @private
   */
  _mergeProperties(props1, props2) {
    const merged = { ...props1 };
    
    for (const [key, value] of Object.entries(props2)) {
      // Only overwrite if new value is not null/undefined
      if (value != null) {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  /**
   * @override
   */
  merge(localOp, remoteOp, baseSnapshot) {
    const { op1Prime, op2Prime } = this._transform(localOp, remoteOp);
    
    const operations = [];
    const conflicts = [];
    
    // Add transformed operations (skip noops)
    if (op1Prime.type !== 'noop') {
      operations.push(op1Prime);
    } else {
      conflicts.push(`Local operation ${localOp.type} on ${localOp.entityId} transformed to noop`);
    }
    
    if (op2Prime.type !== 'noop') {
      operations.push(op2Prime);
    } else {
      conflicts.push(`Remote operation ${remoteOp.type} on ${remoteOp.entityId} transformed to noop`);
    }
    
    return {
      success: true,
      operations,
      conflicts,
      metadata: {
        strategy: this.getName(),
        transformedLocal: op1Prime.type !== localOp.type,
        transformedRemote: op2Prime.type !== remoteOp.type
      }
    };
  }
}

/**
 * Custom Merge Strategy
 * Allows user-defined merge logic via callback
 * 
 * @implements {IMergeStrategy}
 */
export class CustomMergeStrategy extends IMergeStrategy {
  /**
   * @param {Function} mergeFunction - Custom merge function
   * @param {string} name - Strategy name
   */
  constructor(mergeFunction, name = 'Custom') {
    super();
    this.mergeFunction = mergeFunction;
    this.strategyName = name;
  }

  /**
   * @override
   */
  getName() {
    return this.strategyName;
  }

  /**
   * @override
   */
  merge(localOp, remoteOp, baseSnapshot) {
    try {
      const result = this.mergeFunction(localOp, remoteOp, baseSnapshot);
      
      // Ensure result has required structure
      return {
        success: result.success ?? true,
        operations: result.operations || [],
        conflicts: result.conflicts || [],
        metadata: {
          strategy: this.getName(),
          ...result.metadata
        }
      };
    } catch (error) {
      return {
        success: false,
        operations: [],
        conflicts: [`Custom merge function error: ${error.message}`],
        metadata: {
          strategy: this.getName(),
          error: error.message
        }
      };
    }
  }
}

/**
 * Merge Strategy Manager
 * Coordinates merge operations using configured strategy
 * 
 * @class MergeStrategyManager
 */
export class MergeStrategyManager {
  /**
   * @param {IMergeStrategy} defaultStrategy - Default merge strategy
   */
  constructor(defaultStrategy = new LastWriteWinsStrategy()) {
    this.defaultStrategy = defaultStrategy;
    this.strategies = new Map();
    this.entityStrategies = new Map(); // Per-entity strategy overrides
    
    // Register built-in strategies
    this.registerStrategy('last-write-wins', new LastWriteWinsStrategy());
    this.registerStrategy('first-write-wins', new FirstWriteWinsStrategy());
    this.registerStrategy('operational-transform', new OperationalTransformStrategy());
  }

  /**
   * Register a named strategy
   * 
   * @param {string} name - Strategy name
   * @param {IMergeStrategy} strategy - Strategy instance
   */
  registerStrategy(name, strategy) {
    this.strategies.set(name, strategy);
  }

  /**
   * Get strategy by name
   * 
   * @param {string} name - Strategy name
   * @returns {IMergeStrategy|null} Strategy instance or null
   */
  getStrategy(name) {
    return this.strategies.get(name) || null;
  }

  /**
   * Set strategy for specific entity
   * 
   * @param {string} entityId - Entity ID
   * @param {string|IMergeStrategy} strategy - Strategy name or instance
   */
  setEntityStrategy(entityId, strategy) {
    const strategyInstance = typeof strategy === 'string' 
      ? this.getStrategy(strategy) 
      : strategy;
      
    if (strategyInstance) {
      this.entityStrategies.set(entityId, strategyInstance);
    }
  }

  /**
   * Get strategy for entity (falls back to default)
   * 
   * @param {string} entityId - Entity ID
   * @returns {IMergeStrategy} Strategy instance
   * @private
   */
  _getStrategyForEntity(entityId) {
    return this.entityStrategies.get(entityId) || this.defaultStrategy;
  }

  /**
   * Merge two operations
   * 
   * @param {GraphOperation} localOp - Local operation
   * @param {GraphOperation} remoteOp - Remote operation
   * @param {GraphSnapshot} baseSnapshot - Common ancestor snapshot
   * @returns {MergeResult} Merge result
   */
  merge(localOp, remoteOp, baseSnapshot) {
    const strategy = this._getStrategyForEntity(localOp.entityId);
    
    const startTime = performance.now();
    const result = strategy.merge(localOp, remoteOp, baseSnapshot);
    const duration = performance.now() - startTime;
    
    // Log merge operation
    console.log(`[MergeStrategy] ${strategy.getName()} merge completed in ${duration.toFixed(2)}ms`, {
      localOp: `${localOp.type}:${localOp.entityId}`,
      remoteOp: `${remoteOp.type}:${remoteOp.entityId}`,
      success: result.success,
      conflicts: result.conflicts.length
    });
    
    // Emit event for monitoring
    this._emitMergeEvent(result, duration);
    
    return result;
  }

  /**
   * Merge multiple operations in sequence
   * 
   * @param {GraphOperation[]} localOps - Local operations
   * @param {GraphOperation[]} remoteOps - Remote operations
   * @param {GraphSnapshot} baseSnapshot - Common ancestor snapshot
   * @returns {MergeResult} Combined merge result
   */
  mergeMany(localOps, remoteOps, baseSnapshot) {
    const allOperations = [];
    const allConflicts = [];
    let success = true;
    
    // Create operation lookup by entity
    const remoteOpsByEntity = new Map();
    for (const op of remoteOps) {
      if (!remoteOpsByEntity.has(op.entityId)) {
        remoteOpsByEntity.set(op.entityId, []);
      }
      remoteOpsByEntity.get(op.entityId).push(op);
    }
    
    // Merge each local operation against conflicting remote operations
    for (const localOp of localOps) {
      const conflictingRemoteOps = remoteOpsByEntity.get(localOp.entityId) || [];
      
      if (conflictingRemoteOps.length === 0) {
        // No conflict - keep local operation
        allOperations.push(localOp);
      } else {
        // Merge against each conflicting remote operation
        for (const remoteOp of conflictingRemoteOps) {
          const result = this.merge(localOp, remoteOp, baseSnapshot);
          
          if (!result.success) {
            success = false;
          }
          
          allOperations.push(...result.operations);
          allConflicts.push(...result.conflicts);
        }
        
        // Remove processed remote operations
        remoteOpsByEntity.delete(localOp.entityId);
      }
    }
    
    // Add remaining remote operations (no conflicts)
    for (const remoteOps of remoteOpsByEntity.values()) {
      allOperations.push(...remoteOps);
    }
    
    return {
      success,
      operations: allOperations,
      conflicts: allConflicts,
      metadata: {
        totalMerges: localOps.length,
        totalConflicts: allConflicts.length
      }
    };
  }

  /**
   * Emit merge event for monitoring
   * 
   * @param {MergeResult} result - Merge result
   * @param {number} duration - Merge duration in ms
   * @private
   */
  _emitMergeEvent(result, duration) {
    if (typeof window !== 'undefined' && window.EventBus) {
      window.EventBus.publish('Graph.MergeCompleted', {
        success: result.success,
        operationCount: result.operations.length,
        conflictCount: result.conflicts.length,
        duration,
        strategy: result.metadata.strategy
      });
    }
  }
}

// Export singleton instance for convenience
export const mergeStrategyManager = new MergeStrategyManager();