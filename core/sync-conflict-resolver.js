/**
 * @fileoverview Sync Conflict Resolver - Resolves conflicts between offline mutations and server state
 * @module core/sync-conflict-resolver
 * 
 * Handles conflict resolution when offline mutations conflict with server state.
 * Supports multiple resolution strategies: server-wins, client-wins, merge, custom.
 * 
 * Performance: All conflict resolution operations must complete within 16ms per batch.
 * Memory: Conflict state limited to 5MB to stay within 50MB WASM heap budget.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#sync-conflict-resolver}
 */

/**
 * @typedef {Object} ConflictData
 * @property {string} id - Unique conflict identifier
 * @property {string} entityId - ID of the conflicting entity
 * @property {string} entityType - Type of entity (node, edge, property)
 * @property {Object} localVersion - Local mutation data
 * @property {Object} serverVersion - Server state data
 * @property {number} localTimestamp - When local mutation occurred
 * @property {number} serverTimestamp - Server version timestamp
 * @property {string} mutationType - Type of mutation (create, update, delete)
 */

/**
 * @typedef {Object} ResolutionStrategy
 * @property {string} type - Strategy type (server-wins, client-wins, merge, custom)
 * @property {Function} [resolver] - Custom resolver function
 * @property {Object} [options] - Strategy-specific options
 */

/**
 * @typedef {Object} ConflictResolution
 * @property {string} conflictId - ID of resolved conflict
 * @property {string} strategy - Strategy used
 * @property {Object} resolvedValue - Final resolved value
 * @property {boolean} requiresSync - Whether sync is needed after resolution
 * @property {string[]} [warnings] - Any warnings during resolution
 */

/**
 * Sync Conflict Resolver
 * Detects and resolves conflicts between offline mutations and server state
 */
class SyncConflictResolver {
  constructor() {
    /** @type {Map<string, ConflictData>} */
    this.conflicts = new Map();
    
    /** @type {Map<string, ResolutionStrategy>} */
    this.strategies = new Map();
    
    /** @type {Map<string, ConflictResolution>} */
    this.resolutions = new Map();
    
    /** @type {Function[]} */
    this.conflictListeners = [];
    
    /** @type {Function[]} */
    this.resolutionListeners = [];
    
    // Default strategies
    this._registerDefaultStrategies();
    
    // Performance tracking
    this.metrics = {
      conflictsDetected: 0,
      conflictsResolved: 0,
      averageResolutionTime: 0,
      lastResolutionTime: 0
    };
  }

  /**
   * Register default conflict resolution strategies
   * @private
   */
  _registerDefaultStrategies() {
    // Server wins - always use server version
    this.registerStrategy('server-wins', {
      type: 'server-wins',
      resolver: (conflict) => ({
        resolvedValue: conflict.serverVersion,
        requiresSync: false,
        strategy: 'server-wins'
      })
    });

    // Client wins - always use local version
    this.registerStrategy('client-wins', {
      type: 'client-wins',
      resolver: (conflict) => ({
        resolvedValue: conflict.localVersion,
        requiresSync: true,
        strategy: 'client-wins'
      })
    });

    // Last-write-wins based on timestamp
    this.registerStrategy('last-write-wins', {
      type: 'last-write-wins',
      resolver: (conflict) => {
        const useServer = conflict.serverTimestamp > conflict.localTimestamp;
        return {
          resolvedValue: useServer ? conflict.serverVersion : conflict.localVersion,
          requiresSync: !useServer,
          strategy: 'last-write-wins',
          warnings: useServer ? ['Local changes discarded'] : []
        };
      }
    });

    // Merge strategy - attempts to merge both versions
    this.registerStrategy('merge', {
      type: 'merge',
      resolver: (conflict) => {
        const merged = this._mergeVersions(
          conflict.localVersion,
          conflict.serverVersion
        );
        return {
          resolvedValue: merged.value,
          requiresSync: merged.hasChanges,
          strategy: 'merge',
          warnings: merged.warnings
        };
      }
    });

    // Manual strategy - requires user intervention
    this.registerStrategy('manual', {
      type: 'manual',
      resolver: (conflict) => ({
        resolvedValue: null,
        requiresSync: false,
        strategy: 'manual',
        warnings: ['Manual resolution required']
      })
    });
  }

  /**
   * Register a custom conflict resolution strategy
   * @param {string} name - Strategy name
   * @param {ResolutionStrategy} strategy - Strategy configuration
   */
  registerStrategy(name, strategy) {
    if (!strategy.resolver || typeof strategy.resolver !== 'function') {
      throw new Error('Strategy must have a resolver function');
    }
    this.strategies.set(name, strategy);
  }

  /**
   * Detect conflicts between local mutations and server state
   * @param {Object[]} localMutations - Local mutations to check
   * @param {Object[]} serverState - Current server state
   * @returns {ConflictData[]} Detected conflicts
   */
  detectConflicts(localMutations, serverState) {
    const startTime = performance.now();
    const conflicts = [];

    // Create lookup map for server state
    const serverMap = new Map(
      serverState.map(item => [item.id, item])
    );

    for (const mutation of localMutations) {
      const serverVersion = serverMap.get(mutation.entityId);
      
      if (!serverVersion) {
        // Entity doesn't exist on server
        if (mutation.type !== 'create') {
          conflicts.push(this._createConflict(
            mutation,
            null,
            'Entity not found on server'
          ));
        }
        continue;
      }

      // Check for conflicts based on mutation type
      const hasConflict = this._checkConflict(mutation, serverVersion);
      
      if (hasConflict) {
        conflicts.push(this._createConflict(
          mutation,
          serverVersion,
          'Version mismatch'
        ));
      }
    }

    // Store conflicts
    for (const conflict of conflicts) {
      this.conflicts.set(conflict.id, conflict);
    }

    this.metrics.conflictsDetected += conflicts.length;
    this.metrics.lastResolutionTime = performance.now() - startTime;

    // Notify listeners
    if (conflicts.length > 0) {
      this._notifyConflictListeners(conflicts);
    }

    return conflicts;
  }

  /**
   * Create conflict data object
   * @private
   * @param {Object} mutation - Local mutation
   * @param {Object|null} serverVersion - Server version
   * @param {string} reason - Conflict reason
   * @returns {ConflictData}
   */
  _createConflict(mutation, serverVersion, reason) {
    return {
      id: `conflict-${mutation.entityId}-${Date.now()}`,
      entityId: mutation.entityId,
      entityType: mutation.entityType || 'unknown',
      localVersion: mutation.data,
      serverVersion: serverVersion?.data || null,
      localTimestamp: mutation.timestamp,
      serverTimestamp: serverVersion?.timestamp || 0,
      mutationType: mutation.type,
      reason
    };
  }

  /**
   * Check if mutation conflicts with server version
   * @private
   * @param {Object} mutation - Local mutation
   * @param {Object} serverVersion - Server version
   * @returns {boolean}
   */
  _checkConflict(mutation, serverVersion) {
    // Check timestamp-based conflicts
    if (mutation.baseVersion && serverVersion.version) {
      return mutation.baseVersion !== serverVersion.version;
    }

    // Check timestamp conflicts
    if (serverVersion.timestamp > mutation.timestamp) {
      return true;
    }

    // Check data conflicts (deep comparison)
    if (mutation.type === 'update') {
      return !this._dataEquals(mutation.data, serverVersion.data);
    }

    return false;
  }

  /**
   * Deep equality check for data objects
   * @private
   * @param {Object} a - First object
   * @param {Object} b - Second object
   * @returns {boolean}
   */
  _dataEquals(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }
    
    return true;
  }

  /**
   * Resolve a conflict using specified strategy
   * @param {string} conflictId - Conflict identifier
   * @param {string} strategyName - Strategy to use
   * @param {Object} [options] - Strategy-specific options
   * @returns {Promise<ConflictResolution>}
   */
  async resolveConflict(conflictId, strategyName, options = {}) {
    const startTime = performance.now();
    
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }

    try {
      // Apply strategy resolver
      const result = await strategy.resolver(conflict, options);
      
      const resolution = {
        conflictId,
        strategy: strategyName,
        resolvedValue: result.resolvedValue,
        requiresSync: result.requiresSync,
        warnings: result.warnings || [],
        timestamp: Date.now(),
        resolutionTime: performance.now() - startTime
      };

      // Store resolution
      this.resolutions.set(conflictId, resolution);
      this.conflicts.delete(conflictId);

      // Update metrics
      this.metrics.conflictsResolved++;
      this._updateAverageResolutionTime(resolution.resolutionTime);

      // Notify listeners
      this._notifyResolutionListeners(resolution);

      return resolution;
    } catch (error) {
      console.error(`Error resolving conflict ${conflictId}:`, error);
      throw error;
    }
  }

  /**
   * Resolve multiple conflicts in batch
   * @param {Array<{conflictId: string, strategy: string, options?: Object}>} resolutions
   * @returns {Promise<ConflictResolution[]>}
   */
  async resolveConflictsBatch(resolutions) {
    const startTime = performance.now();
    const results = [];

    for (const { conflictId, strategy, options } of resolutions) {
      try {
        const resolution = await this.resolveConflict(conflictId, strategy, options);
        results.push(resolution);
      } catch (error) {
        console.error(`Failed to resolve conflict ${conflictId}:`, error);
        results.push({
          conflictId,
          strategy,
          error: error.message,
          resolved: false
        });
      }
    }

    const totalTime = performance.now() - startTime;
    
    // Performance check - batch should complete within 16ms budget
    if (totalTime > 16) {
      console.warn(`Batch resolution exceeded 16ms budget: ${totalTime.toFixed(2)}ms`);
    }

    return results;
  }

  /**
   * Merge two versions of data
   * @private
   * @param {Object} localVersion - Local version
   * @param {Object} serverVersion - Server version
   * @returns {{value: Object, hasChanges: boolean, warnings: string[]}}
   */
  _mergeVersions(localVersion, serverVersion) {
    const merged = { ...serverVersion };
    const warnings = [];
    let hasChanges = false;

    // Merge local changes into server version
    for (const [key, localValue] of Object.entries(localVersion)) {
      const serverValue = serverVersion[key];

      if (serverValue === undefined) {
        // New field in local version
        merged[key] = localValue;
        hasChanges = true;
      } else if (localValue !== serverValue) {
        // Conflicting values - prefer local for now
        merged[key] = localValue;
        hasChanges = true;
        warnings.push(`Field '${key}' had conflicting values, used local version`);
      }
    }

    return { value: merged, hasChanges, warnings };
  }

  /**
   * Get all pending conflicts
   * @returns {ConflictData[]}
   */
  getPendingConflicts() {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflict by ID
   * @param {string} conflictId - Conflict identifier
   * @returns {ConflictData|null}
   */
  getConflict(conflictId) {
    return this.conflicts.get(conflictId) || null;
  }

  /**
   * Get resolution history
   * @param {number} [limit=100] - Maximum number of resolutions to return
   * @returns {ConflictResolution[]}
   */
  getResolutionHistory(limit = 100) {
    const resolutions = Array.from(this.resolutions.values());
    return resolutions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear resolved conflicts from history
   * @param {number} [olderThan] - Clear resolutions older than timestamp
   */
  clearResolutions(olderThan) {
    if (olderThan) {
      for (const [id, resolution] of this.resolutions.entries()) {
        if (resolution.timestamp < olderThan) {
          this.resolutions.delete(id);
        }
      }
    } else {
      this.resolutions.clear();
    }
  }

  /**
   * Subscribe to conflict detection events
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  onConflictDetected(listener) {
    this.conflictListeners.push(listener);
    return () => {
      const index = this.conflictListeners.indexOf(listener);
      if (index > -1) {
        this.conflictListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to conflict resolution events
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  onConflictResolved(listener) {
    this.resolutionListeners.push(listener);
    return () => {
      const index = this.resolutionListeners.indexOf(listener);
      if (index > -1) {
        this.resolutionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify conflict listeners
   * @private
   * @param {ConflictData[]} conflicts
   */
  _notifyConflictListeners(conflicts) {
    for (const listener of this.conflictListeners) {
      try {
        listener(conflicts);
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    }
  }

  /**
   * Notify resolution listeners
   * @private
   * @param {ConflictResolution} resolution
   */
  _notifyResolutionListeners(resolution) {
    for (const listener of this.resolutionListeners) {
      try {
        listener(resolution);
      } catch (error) {
        console.error('Error in resolution listener:', error);
      }
    }
  }

  /**
   * Update average resolution time metric
   * @private
   * @param {number} newTime
   */
  _updateAverageResolutionTime(newTime) {
    const total = this.metrics.conflictsResolved;
    const current = this.metrics.averageResolutionTime;
    this.metrics.averageResolutionTime = 
      (current * (total - 1) + newTime) / total;
  }

  /**
   * Get performance metrics
   * @returns {Object}
   */
  getMetrics() {
    return {
      ...this.metrics,
      pendingConflicts: this.conflicts.size,
      resolvedConflicts: this.resolutions.size,
      registeredStrategies: this.strategies.size
    };
  }

  /**
   * Reset all conflicts and resolutions
   */
  reset() {
    this.conflicts.clear();
    this.resolutions.clear();
    this.metrics = {
      conflictsDetected: 0,
      conflictsResolved: 0,
      averageResolutionTime: 0,
      lastResolutionTime: 0
    };
  }
}

// Create singleton instance
const syncConflictResolver = new SyncConflictResolver();

export { syncConflictResolver, SyncConflictResolver };