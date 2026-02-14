/**
 * State Snapshot System
 * 
 * Captures and restores application state snapshots to enable efficient
 * event replay and state restoration. Works with EventReplay to provide
 * checkpoint-based replay.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#state-snapshots
 */

import { EventBus } from './event-bus.js';

/**
 * @typedef {Object} StateSnapshot
 * @property {number} timestamp - When snapshot was taken
 * @property {number} eventIndex - Event log index at snapshot time
 * @property {Object} state - Captured state data
 * @property {string} version - Snapshot format version
 */

export class StateSnapshotManager {
  constructor() {
    /** @type {Map<string, StateSnapshot>} */
    this.snapshots = new Map();
    
    /** @type {Map<string, Function>} */
    this.stateProviders = new Map();
    
    /** @type {Map<string, Function>} */
    this.stateRestorers = new Map();
    
    this.version = '1.0.0';
  }

  /**
   * Register a state provider for a specific domain
   * 
   * @param {string} domain - Domain name (e.g., 'playback', 'composition')
   * @param {Function} provider - Function that returns current state
   * @param {Function} restorer - Function that restores state
   */
  registerStateProvider(domain, provider, restorer) {
    if (typeof provider !== 'function') {
      throw new Error(`State provider for domain '${domain}' must be a function`);
    }
    if (typeof restorer !== 'function') {
      throw new Error(`State restorer for domain '${domain}' must be a function`);
    }

    this.stateProviders.set(domain, provider);
    this.stateRestorers.set(domain, restorer);
    
    console.log(`[StateSnapshot] Registered provider for domain: ${domain}`);
  }

  /**
   * Unregister a state provider
   * 
   * @param {string} domain - Domain name
   */
  unregisterStateProvider(domain) {
    this.stateProviders.delete(domain);
    this.stateRestorers.delete(domain);
    
    console.log(`[StateSnapshot] Unregistered provider for domain: ${domain}`);
  }

  /**
   * Capture a snapshot of current application state
   * 
   * @param {string} snapshotId - Unique identifier for this snapshot
   * @param {number} eventIndex - Current event log index
   * @returns {StateSnapshot}
   */
  captureSnapshot(snapshotId, eventIndex) {
    const state = {};
    
    // Collect state from all registered providers
    for (const [domain, provider] of this.stateProviders.entries()) {
      try {
        state[domain] = provider();
      } catch (error) {
        console.error(`[StateSnapshot] Error capturing state for domain '${domain}':`, error);
        state[domain] = null;
      }
    }

    const snapshot = {
      timestamp: Date.now(),
      eventIndex,
      state,
      version: this.version
    };

    this.snapshots.set(snapshotId, snapshot);
    
    console.log(`[StateSnapshot] Captured snapshot '${snapshotId}' at event index ${eventIndex}`);
    
    // Publish snapshot event
    EventBus.emit('StateSnapshotCaptured', {
      snapshotId,
      eventIndex,
      domains: Object.keys(state)
    });

    return snapshot;
  }

  /**
   * Restore application state from a snapshot
   * 
   * @param {string} snapshotId - Snapshot identifier
   * @returns {boolean} Success status
   */
  restoreSnapshot(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!snapshot) {
      console.error(`[StateSnapshot] Snapshot '${snapshotId}' not found`);
      return false;
    }

    console.log(`[StateSnapshot] Restoring snapshot '${snapshotId}' from event index ${snapshot.eventIndex}`);

    const errors = [];

    // Restore state for each domain
    for (const [domain, state] of Object.entries(snapshot.state)) {
      const restorer = this.stateRestorers.get(domain);
      
      if (!restorer) {
        console.warn(`[StateSnapshot] No restorer registered for domain '${domain}'`);
        continue;
      }

      try {
        restorer(state);
      } catch (error) {
        console.error(`[StateSnapshot] Error restoring state for domain '${domain}':`, error);
        errors.push({ domain, error: error.message });
      }
    }

    // Publish restore event
    EventBus.emit('StateSnapshotRestored', {
      snapshotId,
      eventIndex: snapshot.eventIndex,
      success: errors.length === 0,
      errors
    });

    return errors.length === 0;
  }

  /**
   * Get a snapshot by ID
   * 
   * @param {string} snapshotId - Snapshot identifier
   * @returns {StateSnapshot|null}
   */
  getSnapshot(snapshotId) {
    return this.snapshots.get(snapshotId) || null;
  }

  /**
   * List all available snapshots
   * 
   * @returns {Array<{id: string, timestamp: number, eventIndex: number}>}
   */
  listSnapshots() {
    return Array.from(this.snapshots.entries()).map(([id, snapshot]) => ({
      id,
      timestamp: snapshot.timestamp,
      eventIndex: snapshot.eventIndex
    }));
  }

  /**
   * Delete a snapshot
   * 
   * @param {string} snapshotId - Snapshot identifier
   * @returns {boolean} Success status
   */
  deleteSnapshot(snapshotId) {
    const existed = this.snapshots.delete(snapshotId);
    
    if (existed) {
      console.log(`[StateSnapshot] Deleted snapshot '${snapshotId}'`);
    }
    
    return existed;
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots() {
    const count = this.snapshots.size;
    this.snapshots.clear();
    
    console.log(`[StateSnapshot] Cleared ${count} snapshots`);
  }

  /**
   * Export snapshot to JSON
   * 
   * @param {string} snapshotId - Snapshot identifier
   * @returns {string|null} JSON string or null if not found
   */
  exportSnapshot(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!snapshot) {
      return null;
    }

    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Import snapshot from JSON
   * 
   * @param {string} snapshotId - Snapshot identifier
   * @param {string} jsonData - JSON string
   * @returns {boolean} Success status
   */
  importSnapshot(snapshotId, jsonData) {
    try {
      const snapshot = JSON.parse(jsonData);
      
      // Validate snapshot structure
      if (!snapshot.timestamp || !snapshot.state || !snapshot.version) {
        throw new Error('Invalid snapshot format');
      }

      this.snapshots.set(snapshotId, snapshot);
      
      console.log(`[StateSnapshot] Imported snapshot '${snapshotId}'`);
      
      return true;
    } catch (error) {
      console.error(`[StateSnapshot] Error importing snapshot:`, error);
      return false;
    }
  }
}

// Singleton instance
export const stateSnapshot = new StateSnapshotManager();