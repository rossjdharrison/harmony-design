/**
 * @fileoverview Rollback Integration - EventBus integration for rollback handler
 * @module state-machine/rollback-integration
 * 
 * Provides EventBus integration for rollback operations following
 * the command/event pattern.
 * 
 * Events:
 * - RollbackSnapshot (command): Create a state snapshot
 * - RollbackState (command): Rollback to a snapshot
 * - SnapshotCreated (event): Snapshot was created
 * - RollbackCompleted (event): Rollback completed
 * - RollbackFailed (event): Rollback failed
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#state-rollback-handler
 */

import { rollbackRegistry } from './rollback-handler.js';

/**
 * Initializes rollback handler EventBus integration
 * 
 * @param {Object} eventBus - EventBus instance
 * @param {Object} [options] - Configuration options
 * @param {string} [options.defaultDomain='default'] - Default state domain
 */
export function initializeRollbackIntegration(eventBus, options = {}) {
  const defaultDomain = options.defaultDomain || 'default';
  
  // Ensure default handler exists
  if (!rollbackRegistry.get(defaultDomain)) {
    rollbackRegistry.register(defaultDomain);
  }
  
  // Command: Create snapshot
  eventBus.subscribe('RollbackSnapshot', (event) => {
    const { domain = defaultDomain, state, operation, metadata } = event.payload;
    
    const handler = rollbackRegistry.get(domain);
    if (!handler) {
      console.error(`[RollbackIntegration] No handler for domain: ${domain}`);
      eventBus.publish({
        type: 'RollbackFailed',
        payload: {
          domain,
          operation,
          error: `No handler for domain: ${domain}`
        }
      });
      return;
    }
    
    try {
      const snapshotId = handler.createSnapshot(state, operation, metadata);
      
      eventBus.publish({
        type: 'SnapshotCreated',
        payload: {
          domain,
          snapshotId,
          operation,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('[RollbackIntegration] Snapshot creation failed:', error);
      eventBus.publish({
        type: 'RollbackFailed',
        payload: {
          domain,
          operation,
          error: error.message
        }
      });
    }
  });
  
  // Command: Rollback to snapshot
  eventBus.subscribe('RollbackState', (event) => {
    const { domain = defaultDomain, snapshotId } = event.payload;
    
    const handler = rollbackRegistry.get(domain);
    if (!handler) {
      console.error(`[RollbackIntegration] No handler for domain: ${domain}`);
      eventBus.publish({
        type: 'RollbackFailed',
        payload: {
          domain,
          snapshotId,
          error: `No handler for domain: ${domain}`
        }
      });
      return;
    }
    
    const result = handler.rollback(snapshotId);
    
    if (result.success) {
      eventBus.publish({
        type: 'RollbackCompleted',
        payload: {
          domain,
          snapshotId,
          state: result.state,
          duration: result.duration,
          timestamp: Date.now()
        }
      });
    } else {
      eventBus.publish({
        type: 'RollbackFailed',
        payload: {
          domain,
          snapshotId,
          error: result.error?.message || 'Unknown error',
          duration: result.duration
        }
      });
    }
  });
  
  // Command: Query snapshot info
  eventBus.subscribe('QuerySnapshot', (event) => {
    const { domain = defaultDomain, snapshotId } = event.payload;
    
    const handler = rollbackRegistry.get(domain);
    if (!handler) {
      eventBus.publish({
        type: 'SnapshotQueryResult',
        payload: {
          domain,
          snapshotId,
          found: false
        }
      });
      return;
    }
    
    const info = handler.getSnapshotInfo(snapshotId);
    
    eventBus.publish({
      type: 'SnapshotQueryResult',
      payload: {
        domain,
        snapshotId,
        found: !!info,
        info
      }
    });
  });
  
  // Command: List snapshots
  eventBus.subscribe('ListSnapshots', (event) => {
    const { domain = defaultDomain } = event.payload;
    
    const handler = rollbackRegistry.get(domain);
    if (!handler) {
      eventBus.publish({
        type: 'SnapshotListResult',
        payload: {
          domain,
          snapshots: []
        }
      });
      return;
    }
    
    const snapshots = handler.listSnapshots();
    
    eventBus.publish({
      type: 'SnapshotListResult',
      payload: {
        domain,
        snapshots
      }
    });
  });
  
  // Command: Get memory usage
  eventBus.subscribe('QueryRollbackMemory', (event) => {
    const usage = rollbackRegistry.getMemoryUsage();
    
    eventBus.publish({
      type: 'RollbackMemoryResult',
      payload: usage
    });
  });
  
  console.log('[RollbackIntegration] EventBus integration initialized');
}

/**
 * Helper to create snapshot via EventBus
 * 
 * @param {Object} eventBus - EventBus instance
 * @param {Object} params - Snapshot parameters
 * @param {string} [params.domain] - State domain
 * @param {any} params.state - State to snapshot
 * @param {string} params.operation - Operation identifier
 * @param {Object} [params.metadata] - Additional metadata
 */
export function createSnapshot(eventBus, params) {
  eventBus.publish({
    type: 'RollbackSnapshot',
    payload: params
  });
}

/**
 * Helper to rollback via EventBus
 * 
 * @param {Object} eventBus - EventBus instance
 * @param {Object} params - Rollback parameters
 * @param {string} [params.domain] - State domain
 * @param {string} params.snapshotId - Snapshot to restore
 */
export function rollbackToSnapshot(eventBus, params) {
  eventBus.publish({
    type: 'RollbackState',
    payload: params
  });
}