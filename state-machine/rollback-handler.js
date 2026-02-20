/**
 * @fileoverview Rollback Handler - State rollback mechanism for failed optimistic updates
 * @module state-machine/rollback-handler
 * 
 * Provides snapshot-based state rollback for optimistic updates that fail.
 * Integrates with EventBus for command/event pattern.
 * 
 * Performance targets:
 * - Snapshot creation: <1ms
 * - Rollback execution: <5ms
 * - Memory overhead: <100KB per snapshot
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#state-rollback-handler
 */

/**
 * @typedef {Object} StateSnapshot
 * @property {string} id - Unique snapshot identifier
 * @property {number} timestamp - When snapshot was created
 * @property {any} state - Serialized state data
 * @property {string} operation - Operation that triggered the snapshot
 * @property {Object} metadata - Additional context
 */

/**
 * @typedef {Object} RollbackResult
 * @property {boolean} success - Whether rollback succeeded
 * @property {string} snapshotId - ID of snapshot used
 * @property {number} duration - Rollback duration in ms
 * @property {Error} [error] - Error if rollback failed
 */

/**
 * RollbackHandler manages state snapshots and rollback operations
 * for optimistic updates that fail.
 */
export class RollbackHandler {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.maxSnapshots=10] - Maximum snapshots to retain
   * @param {number} [options.snapshotTTL=60000] - Snapshot TTL in ms (default 60s)
   * @param {Function} [options.onRollback] - Callback when rollback occurs
   * @param {Function} [options.onSnapshotCreated] - Callback when snapshot created
   */
  constructor(options = {}) {
    this.maxSnapshots = options.maxSnapshots || 10;
    this.snapshotTTL = options.snapshotTTL || 60000;
    this.onRollback = options.onRollback || (() => {});
    this.onSnapshotCreated = options.onSnapshotCreated || (() => {});
    
    /** @type {Map<string, StateSnapshot>} */
    this.snapshots = new Map();
    
    /** @type {Map<string, NodeJS.Timeout>} */
    this.expirationTimers = new Map();
    
    this.snapshotCounter = 0;
  }

  /**
   * Creates a snapshot of the current state
   * 
   * @param {any} state - State to snapshot
   * @param {string} operation - Operation identifier
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {string} Snapshot ID
   * 
   * @performance Target: <1ms
   */
  createSnapshot(state, operation, metadata = {}) {
    const startTime = performance.now();
    
    const snapshotId = this._generateSnapshotId();
    
    // Deep clone state to prevent mutations
    const clonedState = this._cloneState(state);
    
    const snapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      state: clonedState,
      operation,
      metadata: { ...metadata }
    };
    
    this.snapshots.set(snapshotId, snapshot);
    
    // Enforce max snapshots limit
    this._enforceSnapshotLimit();
    
    // Set expiration timer
    this._setExpirationTimer(snapshotId);
    
    const duration = performance.now() - startTime;
    
    // Log performance warning if snapshot creation is slow
    if (duration > 1) {
      console.warn(`[RollbackHandler] Snapshot creation took ${duration.toFixed(2)}ms (target: <1ms)`);
    }
    
    this.onSnapshotCreated({ snapshotId, operation, duration });
    
    return snapshotId;
  }

  /**
   * Rolls back to a specific snapshot
   * 
   * @param {string} snapshotId - Snapshot to restore
   * @returns {RollbackResult} Result of rollback operation
   * 
   * @performance Target: <5ms
   */
  rollback(snapshotId) {
    const startTime = performance.now();
    
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!snapshot) {
      const error = new Error(`Snapshot not found: ${snapshotId}`);
      console.error('[RollbackHandler] Rollback failed:', error);
      
      return {
        success: false,
        snapshotId,
        duration: performance.now() - startTime,
        error
      };
    }
    
    try {
      // Clone the snapshot state to return
      const restoredState = this._cloneState(snapshot.state);
      
      const duration = performance.now() - startTime;
      
      // Log performance warning if rollback is slow
      if (duration > 5) {
        console.warn(`[RollbackHandler] Rollback took ${duration.toFixed(2)}ms (target: <5ms)`);
      }
      
      const result = {
        success: true,
        snapshotId,
        duration,
        state: restoredState
      };
      
      this.onRollback(result);
      
      // Clean up the used snapshot
      this.deleteSnapshot(snapshotId);
      
      return result;
    } catch (error) {
      console.error('[RollbackHandler] Rollback error:', error);
      
      return {
        success: false,
        snapshotId,
        duration: performance.now() - startTime,
        error
      };
    }
  }

  /**
   * Deletes a specific snapshot
   * 
   * @param {string} snapshotId - Snapshot to delete
   * @returns {boolean} Whether deletion succeeded
   */
  deleteSnapshot(snapshotId) {
    const timer = this.expirationTimers.get(snapshotId);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(snapshotId);
    }
    
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Clears all snapshots
   */
  clearAll() {
    // Clear all timers
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    
    this.expirationTimers.clear();
    this.snapshots.clear();
  }

  /**
   * Gets snapshot information without retrieving state
   * 
   * @param {string} snapshotId - Snapshot to query
   * @returns {Object|null} Snapshot metadata or null
   */
  getSnapshotInfo(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!snapshot) {
      return null;
    }
    
    return {
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      operation: snapshot.operation,
      metadata: snapshot.metadata,
      age: Date.now() - snapshot.timestamp
    };
  }

  /**
   * Lists all current snapshots
   * 
   * @returns {Array<Object>} Array of snapshot info
   */
  listSnapshots() {
    return Array.from(this.snapshots.values()).map(snapshot => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      operation: snapshot.operation,
      age: Date.now() - snapshot.timestamp
    }));
  }

  /**
   * Gets memory usage estimate
   * 
   * @returns {Object} Memory usage statistics
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const snapshot of this.snapshots.values()) {
      // Rough estimate: JSON.stringify length as bytes
      totalSize += JSON.stringify(snapshot.state).length;
    }
    
    return {
      snapshotCount: this.snapshots.size,
      estimatedBytes: totalSize,
      estimatedKB: (totalSize / 1024).toFixed(2),
      maxSnapshots: this.maxSnapshots
    };
  }

  /**
   * Generates unique snapshot ID
   * 
   * @private
   * @returns {string} Snapshot ID
   */
  _generateSnapshotId() {
    return `snapshot_${Date.now()}_${++this.snapshotCounter}`;
  }

  /**
   * Deep clones state object
   * 
   * @private
   * @param {any} state - State to clone
   * @returns {any} Cloned state
   */
  _cloneState(state) {
    // Use structured clone if available (modern browsers)
    if (typeof structuredClone !== 'undefined') {
      try {
        return structuredClone(state);
      } catch (e) {
        // Fallback to JSON if structured clone fails
        console.warn('[RollbackHandler] structuredClone failed, using JSON fallback');
      }
    }
    
    // Fallback: JSON clone (loses functions, symbols, etc.)
    try {
      return JSON.parse(JSON.stringify(state));
    } catch (e) {
      console.error('[RollbackHandler] State cloning failed:', e);
      throw new Error('Unable to clone state for snapshot');
    }
  }

  /**
   * Enforces maximum snapshot limit
   * 
   * @private
   */
  _enforceSnapshotLimit() {
    if (this.snapshots.size <= this.maxSnapshots) {
      return;
    }
    
    // Remove oldest snapshots
    const sortedSnapshots = Array.from(this.snapshots.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const toRemove = sortedSnapshots.slice(0, this.snapshots.size - this.maxSnapshots);
    
    for (const snapshot of toRemove) {
      this.deleteSnapshot(snapshot.id);
    }
  }

  /**
   * Sets expiration timer for snapshot
   * 
   * @private
   * @param {string} snapshotId - Snapshot ID
   */
  _setExpirationTimer(snapshotId) {
    const timer = setTimeout(() => {
      this.deleteSnapshot(snapshotId);
      console.debug(`[RollbackHandler] Snapshot expired: ${snapshotId}`);
    }, this.snapshotTTL);
    
    this.expirationTimers.set(snapshotId, timer);
  }

  /**
   * Destroys the handler and cleans up resources
   */
  destroy() {
    this.clearAll();
  }
}

/**
 * Creates a scoped rollback handler for a specific state domain
 * 
 * @param {string} domain - State domain name
 * @param {Object} options - Handler options
 * @returns {RollbackHandler} Configured handler
 */
export function createRollbackHandler(domain, options = {}) {
  return new RollbackHandler({
    ...options,
    onRollback: (result) => {
      console.debug(`[RollbackHandler:${domain}] Rollback completed:`, result);
      if (options.onRollback) {
        options.onRollback(result);
      }
    },
    onSnapshotCreated: (info) => {
      console.debug(`[RollbackHandler:${domain}] Snapshot created:`, info);
      if (options.onSnapshotCreated) {
        options.onSnapshotCreated(info);
      }
    }
  });
}

/**
 * Global rollback handler registry for managing multiple domains
 */
export class RollbackHandlerRegistry {
  constructor() {
    /** @type {Map<string, RollbackHandler>} */
    this.handlers = new Map();
  }

  /**
   * Registers a handler for a domain
   * 
   * @param {string} domain - Domain name
   * @param {Object} [options] - Handler options
   * @returns {RollbackHandler} Created handler
   */
  register(domain, options = {}) {
    if (this.handlers.has(domain)) {
      console.warn(`[RollbackHandlerRegistry] Handler already exists for domain: ${domain}`);
      return this.handlers.get(domain);
    }
    
    const handler = createRollbackHandler(domain, options);
    this.handlers.set(domain, handler);
    
    return handler;
  }

  /**
   * Gets handler for domain
   * 
   * @param {string} domain - Domain name
   * @returns {RollbackHandler|null} Handler or null
   */
  get(domain) {
    return this.handlers.get(domain) || null;
  }

  /**
   * Unregisters handler for domain
   * 
   * @param {string} domain - Domain name
   * @returns {boolean} Whether handler was removed
   */
  unregister(domain) {
    const handler = this.handlers.get(domain);
    if (handler) {
      handler.destroy();
      return this.handlers.delete(domain);
    }
    return false;
  }

  /**
   * Gets memory usage across all handlers
   * 
   * @returns {Object} Aggregated memory usage
   */
  getMemoryUsage() {
    const usage = {
      totalSnapshots: 0,
      totalBytes: 0,
      byDomain: {}
    };
    
    for (const [domain, handler] of this.handlers.entries()) {
      const domainUsage = handler.getMemoryUsage();
      usage.totalSnapshots += domainUsage.snapshotCount;
      usage.totalBytes += domainUsage.estimatedBytes;
      usage.byDomain[domain] = domainUsage;
    }
    
    usage.totalKB = (usage.totalBytes / 1024).toFixed(2);
    
    return usage;
  }

  /**
   * Clears all handlers
   */
  clearAll() {
    for (const handler of this.handlers.values()) {
      handler.destroy();
    }
    this.handlers.clear();
  }
}

// Global registry instance
export const rollbackRegistry = new RollbackHandlerRegistry();