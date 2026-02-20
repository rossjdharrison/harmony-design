/**
 * @fileoverview useRollback Hook - React-style hook for rollback operations
 * @module hooks/useRollback
 * 
 * Provides a hook interface for creating snapshots and rolling back state.
 * Works with vanilla JS component lifecycle.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#state-rollback-handler
 */

import { rollbackRegistry } from '../state-machine/rollback-handler.js';

/**
 * Creates a rollback hook for a specific domain
 * 
 * @param {string} [domain='default'] - State domain
 * @returns {Object} Rollback operations
 * 
 * @example
 * const rollback = useRollback('todos');
 * const snapshotId = rollback.createSnapshot(currentState, 'addTodo');
 * // ... optimistic update fails
 * const result = rollback.rollback(snapshotId);
 */
export function useRollback(domain = 'default') {
  // Ensure handler exists
  let handler = rollbackRegistry.get(domain);
  if (!handler) {
    handler = rollbackRegistry.register(domain);
  }
  
  return {
    /**
     * Creates a snapshot of current state
     * 
     * @param {any} state - State to snapshot
     * @param {string} operation - Operation identifier
     * @param {Object} [metadata] - Additional metadata
     * @returns {string} Snapshot ID
     */
    createSnapshot(state, operation, metadata) {
      return handler.createSnapshot(state, operation, metadata);
    },
    
    /**
     * Rolls back to a snapshot
     * 
     * @param {string} snapshotId - Snapshot to restore
     * @returns {Object} Rollback result with state
     */
    rollback(snapshotId) {
      return handler.rollback(snapshotId);
    },
    
    /**
     * Deletes a snapshot
     * 
     * @param {string} snapshotId - Snapshot to delete
     * @returns {boolean} Whether deletion succeeded
     */
    deleteSnapshot(snapshotId) {
      return handler.deleteSnapshot(snapshotId);
    },
    
    /**
     * Gets snapshot information
     * 
     * @param {string} snapshotId - Snapshot to query
     * @returns {Object|null} Snapshot info or null
     */
    getSnapshotInfo(snapshotId) {
      return handler.getSnapshotInfo(snapshotId);
    },
    
    /**
     * Lists all snapshots
     * 
     * @returns {Array} Array of snapshot info
     */
    listSnapshots() {
      return handler.listSnapshots();
    },
    
    /**
     * Gets memory usage
     * 
     * @returns {Object} Memory statistics
     */
    getMemoryUsage() {
      return handler.getMemoryUsage();
    },
    
    /**
     * Clears all snapshots
     */
    clearAll() {
      handler.clearAll();
    }
  };
}

/**
 * Hook that automatically creates snapshots and handles rollback
 * for optimistic updates
 * 
 * @param {string} [domain='default'] - State domain
 * @returns {Object} Optimistic update helpers
 * 
 * @example
 * const { withRollback } = useOptimisticRollback('todos');
 * 
 * await withRollback(
 *   currentState,
 *   'addTodo',
 *   async () => {
 *     // Perform optimistic update
 *     setState(newState);
 *     // Make API call
 *     await api.addTodo(todo);
 *   }
 * );
 */
export function useOptimisticRollback(domain = 'default') {
  const rollback = useRollback(domain);
  
  return {
    /**
     * Executes operation with automatic rollback on failure
     * 
     * @param {any} state - Current state to snapshot
     * @param {string} operation - Operation identifier
     * @param {Function} fn - Async operation to execute
     * @returns {Promise<any>} Operation result
     */
    async withRollback(state, operation, fn) {
      const snapshotId = rollback.createSnapshot(state, operation);
      
      try {
        const result = await fn();
        // Success - delete snapshot
        rollback.deleteSnapshot(snapshotId);
        return result;
      } catch (error) {
        // Failure - rollback
        console.warn(`[useOptimisticRollback] Operation failed, rolling back: ${operation}`, error);
        const rollbackResult = rollback.rollback(snapshotId);
        
        if (!rollbackResult.success) {
          console.error('[useOptimisticRollback] Rollback failed:', rollbackResult.error);
        }
        
        // Re-throw original error
        throw error;
      }
    },
    
    // Expose base rollback operations
    ...rollback
  };
}