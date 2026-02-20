/**
 * @fileoverview Offline Mutation Queue - Queues mutations when offline, syncs when back online
 * @module core/offline-mutation-queue
 * 
 * Provides a queue system for mutations that occur while offline, with automatic
 * synchronization when connectivity is restored. Integrates with IndexedDB for
 * persistence across sessions.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Offline Support
 */

import { EventBus } from './event-bus.js';

/**
 * @typedef {Object} QueuedMutation
 * @property {string} id - Unique mutation identifier
 * @property {string} type - Mutation type/command
 * @property {Object} payload - Mutation payload
 * @property {number} timestamp - When mutation was queued
 * @property {number} retryCount - Number of sync attempts
 * @property {string} status - 'pending' | 'syncing' | 'failed' | 'synced'
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} OfflineQueueConfig
 * @property {string} [dbName='harmony-offline-queue'] - IndexedDB database name
 * @property {string} [storeName='mutations'] - IndexedDB store name
 * @property {number} [maxRetries=3] - Maximum retry attempts per mutation
 * @property {number} [retryDelay=1000] - Base delay between retries (ms)
 * @property {number} [syncBatchSize=10] - Number of mutations to sync at once
 * @property {boolean} [autoSync=true] - Auto-sync when online
 */

/**
 * Offline Mutation Queue
 * Manages queuing and synchronization of mutations during offline periods
 */
export class OfflineMutationQueue {
  /**
   * @param {OfflineQueueConfig} [config={}] - Queue configuration
   */
  constructor(config = {}) {
    this.config = {
      dbName: 'harmony-offline-queue',
      storeName: 'mutations',
      maxRetries: 3,
      retryDelay: 1000,
      syncBatchSize: 10,
      autoSync: true,
      ...config
    };

    /** @type {IDBDatabase|null} */
    this.db = null;

    /** @type {boolean} */
    this.isOnline = navigator.onLine;

    /** @type {boolean} */
    this.isSyncing = false;

    /** @type {Map<string, QueuedMutation>} */
    this.pendingMutations = new Map();

    /** @type {EventBus|null} */
    this.eventBus = null;

    this._initializeEventListeners();
  }

  /**
   * Initialize the queue system
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this._openDatabase();
      await this._loadPendingMutations();
      
      // Connect to EventBus if available
      if (window.eventBus) {
        this.eventBus = window.eventBus;
        this._subscribeToEvents();
      }

      // Auto-sync if online
      if (this.isOnline && this.config.autoSync && this.pendingMutations.size > 0) {
        await this.syncPendingMutations();
      }

      console.log('[OfflineMutationQueue] Initialized', {
        pendingCount: this.pendingMutations.size,
        isOnline: this.isOnline
      });
    } catch (error) {
      console.error('[OfflineMutationQueue] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Open IndexedDB database
   * @private
   * @returns {Promise<void>}
   */
  _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Load pending mutations from IndexedDB
   * @private
   * @returns {Promise<void>}
   */
  async _loadPendingMutations() {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('pending'));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          this.pendingMutations.set(cursor.value.id, cursor.value);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Initialize network and page lifecycle event listeners
   * @private
   */
  _initializeEventListeners() {
    // Network status changes
    window.addEventListener('online', () => this._handleOnline());
    window.addEventListener('offline', () => this._handleOffline());

    // Page visibility changes (for background sync)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline && this.pendingMutations.size > 0) {
        this.syncPendingMutations();
      }
    });
  }

  /**
   * Subscribe to EventBus events
   * @private
   */
  _subscribeToEvents() {
    if (!this.eventBus) return;

    // Subscribe to mutation commands that should be queued when offline
    this.eventBus.subscribe('GraphMutation', (event) => this._handleMutationEvent(event));
    this.eventBus.subscribe('DataUpdate', (event) => this._handleMutationEvent(event));
    this.eventBus.subscribe('StateChange', (event) => this._handleMutationEvent(event));
  }

  /**
   * Handle mutation events from EventBus
   * @private
   * @param {Object} event - Event data
   */
  async _handleMutationEvent(event) {
    if (!this.isOnline) {
      await this.queueMutation(event.type, event.payload);
    }
  }

  /**
   * Handle online event
   * @private
   */
  async _handleOnline() {
    console.log('[OfflineMutationQueue] Network online');
    this.isOnline = true;

    if (this.eventBus) {
      this.eventBus.publish({
        type: 'NetworkStatusChanged',
        payload: { online: true }
      });
    }

    if (this.config.autoSync && this.pendingMutations.size > 0) {
      await this.syncPendingMutations();
    }
  }

  /**
   * Handle offline event
   * @private
   */
  _handleOffline() {
    console.log('[OfflineMutationQueue] Network offline');
    this.isOnline = false;

    if (this.eventBus) {
      this.eventBus.publish({
        type: 'NetworkStatusChanged',
        payload: { online: false }
      });
    }
  }

  /**
   * Queue a mutation for later synchronization
   * @param {string} type - Mutation type
   * @param {Object} payload - Mutation payload
   * @returns {Promise<string>} Mutation ID
   */
  async queueMutation(type, payload) {
    const mutation = {
      id: this._generateId(),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    this.pendingMutations.set(mutation.id, mutation);
    await this._persistMutation(mutation);

    console.log('[OfflineMutationQueue] Queued mutation', { id: mutation.id, type });

    if (this.eventBus) {
      this.eventBus.publish({
        type: 'MutationQueued',
        payload: { id: mutation.id, type, queueSize: this.pendingMutations.size }
      });
    }

    return mutation.id;
  }

  /**
   * Persist mutation to IndexedDB
   * @private
   * @param {QueuedMutation} mutation - Mutation to persist
   * @returns {Promise<void>}
   */
  async _persistMutation(mutation) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.put(mutation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync all pending mutations
   * @returns {Promise<Object>} Sync results
   */
  async syncPendingMutations() {
    if (!this.isOnline) {
      console.warn('[OfflineMutationQueue] Cannot sync while offline');
      return { synced: 0, failed: 0, pending: this.pendingMutations.size };
    }

    if (this.isSyncing) {
      console.warn('[OfflineMutationQueue] Sync already in progress');
      return { synced: 0, failed: 0, pending: this.pendingMutations.size };
    }

    this.isSyncing = true;
    const results = { synced: 0, failed: 0, pending: 0 };

    try {
      console.log('[OfflineMutationQueue] Starting sync', {
        count: this.pendingMutations.size
      });

      if (this.eventBus) {
        this.eventBus.publish({
          type: 'SyncStarted',
          payload: { count: this.pendingMutations.size }
        });
      }

      // Get mutations sorted by timestamp
      const mutations = Array.from(this.pendingMutations.values())
        .sort((a, b) => a.timestamp - b.timestamp);

      // Process in batches
      for (let i = 0; i < mutations.length; i += this.config.syncBatchSize) {
        const batch = mutations.slice(i, i + this.config.syncBatchSize);
        await this._syncBatch(batch, results);
      }

      console.log('[OfflineMutationQueue] Sync completed', results);

      if (this.eventBus) {
        this.eventBus.publish({
          type: 'SyncCompleted',
          payload: results
        });
      }

    } catch (error) {
      console.error('[OfflineMutationQueue] Sync error:', error);
      
      if (this.eventBus) {
        this.eventBus.publish({
          type: 'SyncFailed',
          payload: { error: error.message, results }
        });
      }
    } finally {
      this.isSyncing = false;
      results.pending = this.pendingMutations.size;
    }

    return results;
  }

  /**
   * Sync a batch of mutations
   * @private
   * @param {QueuedMutation[]} batch - Mutations to sync
   * @param {Object} results - Results accumulator
   * @returns {Promise<void>}
   */
  async _syncBatch(batch, results) {
    const promises = batch.map(mutation => this._syncMutation(mutation, results));
    await Promise.allSettled(promises);
  }

  /**
   * Sync a single mutation
   * @private
   * @param {QueuedMutation} mutation - Mutation to sync
   * @param {Object} results - Results accumulator
   * @returns {Promise<void>}
   */
  async _syncMutation(mutation, results) {
    try {
      mutation.status = 'syncing';
      await this._persistMutation(mutation);

      // Publish mutation to EventBus for processing
      if (this.eventBus) {
        await this.eventBus.publish({
          type: mutation.type,
          payload: { ...mutation.payload, _fromOfflineQueue: true }
        });
      }

      // Mark as synced
      mutation.status = 'synced';
      await this._removeMutation(mutation.id);
      this.pendingMutations.delete(mutation.id);
      results.synced++;

      console.log('[OfflineMutationQueue] Synced mutation', { id: mutation.id });

    } catch (error) {
      mutation.retryCount++;
      
      if (mutation.retryCount >= this.config.maxRetries) {
        mutation.status = 'failed';
        mutation.error = error.message;
        await this._persistMutation(mutation);
        results.failed++;
        
        console.error('[OfflineMutationQueue] Mutation failed permanently', {
          id: mutation.id,
          error: error.message
        });
      } else {
        mutation.status = 'pending';
        await this._persistMutation(mutation);
        
        console.warn('[OfflineMutationQueue] Mutation sync failed, will retry', {
          id: mutation.id,
          retryCount: mutation.retryCount
        });
      }
    }
  }

  /**
   * Remove mutation from IndexedDB
   * @private
   * @param {string} id - Mutation ID
   * @returns {Promise<void>}
   */
  async _removeMutation(id) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getStatus() {
    const mutations = Array.from(this.pendingMutations.values());
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      totalPending: mutations.length,
      byStatus: {
        pending: mutations.filter(m => m.status === 'pending').length,
        syncing: mutations.filter(m => m.status === 'syncing').length,
        failed: mutations.filter(m => m.status === 'failed').length
      }
    };
  }

  /**
   * Get pending mutations
   * @returns {QueuedMutation[]} Pending mutations
   */
  getPendingMutations() {
    return Array.from(this.pendingMutations.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear failed mutations
   * @returns {Promise<number>} Number of cleared mutations
   */
  async clearFailedMutations() {
    const failed = Array.from(this.pendingMutations.values())
      .filter(m => m.status === 'failed');

    for (const mutation of failed) {
      await this._removeMutation(mutation.id);
      this.pendingMutations.delete(mutation.id);
    }

    console.log('[OfflineMutationQueue] Cleared failed mutations', { count: failed.length });
    return failed.length;
  }

  /**
   * Retry failed mutations
   * @returns {Promise<void>}
   */
  async retryFailedMutations() {
    const failed = Array.from(this.pendingMutations.values())
      .filter(m => m.status === 'failed');

    for (const mutation of failed) {
      mutation.status = 'pending';
      mutation.retryCount = 0;
      mutation.error = undefined;
      await this._persistMutation(mutation);
    }

    if (failed.length > 0 && this.isOnline) {
      await this.syncPendingMutations();
    }
  }

  /**
   * Generate unique mutation ID
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return `mutation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup and close database
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.pendingMutations.clear();
  }
}

// Global instance
let globalQueue = null;

/**
 * Get or create global offline mutation queue instance
 * @param {OfflineQueueConfig} [config] - Configuration (only used on first call)
 * @returns {OfflineMutationQueue} Global queue instance
 */
export function getOfflineMutationQueue(config) {
  if (!globalQueue) {
    globalQueue = new OfflineMutationQueue(config);
  }
  return globalQueue;
}

/**
 * Initialize global offline mutation queue
 * @param {OfflineQueueConfig} [config] - Configuration
 * @returns {Promise<OfflineMutationQueue>} Initialized queue
 */
export async function initializeOfflineMutationQueue(config) {
  const queue = getOfflineMutationQueue(config);
  await queue.initialize();
  
  // Expose globally for debugging
  if (typeof window !== 'undefined') {
    window.offlineMutationQueue = queue;
  }
  
  return queue;
}