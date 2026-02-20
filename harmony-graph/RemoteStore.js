/**
 * @fileoverview RemoteStore - Sync graph state to remote server
 * 
 * Provides persistent storage of graph state on a remote server with:
 * - Delta-based synchronization for efficient network usage
 * - Conflict resolution for concurrent modifications
 * - Retry logic with exponential backoff
 * - Offline queue for deferred sync
 * - Compression for large payloads
 * 
 * Performance targets:
 * - Sync latency: <500ms for delta updates
 * - Compression ratio: >70% for typical graph data
 * - Memory overhead: <5MB for sync queue
 * 
 * Related documentation: harmony-design/DESIGN_SYSTEM.md#graph-persistence
 * Related files:
 * - harmony-graph/GraphSnapshot.js - Snapshot format
 * - harmony-graph/DeltaEncoder.js - Delta encoding
 * - harmony-graph/IndexedDBStore.js - Local persistence pattern
 * 
 * @module harmony-graph/RemoteStore
 */

import { DeltaEncoder } from './DeltaEncoder.js';
import { GraphSnapshot } from './GraphSnapshot.js';

/**
 * Sync status enumeration
 * @enum {string}
 */
export const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error',
  OFFLINE: 'offline'
};

/**
 * Conflict resolution strategies
 * @enum {string}
 */
export const ConflictStrategy = {
  SERVER_WINS: 'server_wins',
  CLIENT_WINS: 'client_wins',
  LAST_WRITE_WINS: 'last_write_wins',
  MANUAL: 'manual'
};

/**
 * RemoteStore - Synchronizes graph state with remote server
 * 
 * Handles bidirectional sync with conflict resolution and offline support.
 * Uses delta encoding to minimize bandwidth usage.
 * 
 * @class
 * @example
 * const store = new RemoteStore({
 *   endpoint: 'https://api.example.com/graph',
 *   apiKey: 'your-api-key',
 *   conflictStrategy: ConflictStrategy.LAST_WRITE_WINS
 * });
 * 
 * await store.sync(snapshot);
 * const remoteSnapshot = await store.pull();
 */
export class RemoteStore {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.endpoint - Remote server endpoint URL
   * @param {string} [options.apiKey] - API authentication key
   * @param {ConflictStrategy} [options.conflictStrategy=LAST_WRITE_WINS] - Conflict resolution strategy
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * @param {number} [options.retryDelay=1000] - Initial retry delay in ms
   * @param {boolean} [options.compression=true] - Enable payload compression
   * @param {number} [options.syncInterval=30000] - Auto-sync interval in ms (0 to disable)
   */
  constructor(options = {}) {
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.conflictStrategy = options.conflictStrategy || ConflictStrategy.LAST_WRITE_WINS;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.compression = options.compression ?? true;
    this.syncInterval = options.syncInterval ?? 30000;

    /** @type {SyncStatus} */
    this.status = SyncStatus.IDLE;

    /** @type {GraphSnapshot|null} */
    this.lastSyncedSnapshot = null;

    /** @type {number|null} */
    this.lastSyncTimestamp = null;

    /** @type {string|null} */
    this.serverVersion = null;

    /** @type {Array<{snapshot: GraphSnapshot, timestamp: number}>} */
    this.offlineQueue = [];

    /** @type {number|null} */
    this.autoSyncTimer = null;

    /** @type {Set<Function>} */
    this.statusListeners = new Set();

    /** @type {Set<Function>} */
    this.conflictListeners = new Set();

    this.deltaEncoder = new DeltaEncoder();

    if (!this.endpoint) {
      console.warn('[RemoteStore] No endpoint configured, sync disabled');
    }
  }

  /**
   * Push local snapshot to remote server
   * 
   * @param {GraphSnapshot} snapshot - Local graph snapshot to push
   * @param {Object} [options] - Push options
   * @param {boolean} [options.force=false] - Force push even if conflicts exist
   * @returns {Promise<{success: boolean, version: string, conflicts?: Array}>}
   */
  async push(snapshot, options = {}) {
    if (!this.endpoint) {
      throw new Error('RemoteStore: No endpoint configured');
    }

    this.setStatus(SyncStatus.SYNCING);

    try {
      // Compute delta if we have a previous snapshot
      let payload;
      if (this.lastSyncedSnapshot && !options.force) {
        const delta = this.deltaEncoder.encode(this.lastSyncedSnapshot, snapshot);
        payload = {
          type: 'delta',
          baseVersion: this.serverVersion,
          delta: delta,
          timestamp: Date.now()
        };
      } else {
        payload = {
          type: 'full',
          snapshot: snapshot.toJSON(),
          timestamp: Date.now()
        };
      }

      // Compress if enabled
      if (this.compression) {
        payload = await this.compressPayload(payload);
      }

      const response = await this.fetchWithRetry(`${this.endpoint}/push`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.conflicts && result.conflicts.length > 0) {
        // Handle conflicts based on strategy
        const resolved = await this.resolveConflicts(result.conflicts, snapshot);
        if (!resolved && !options.force) {
          this.setStatus(SyncStatus.ERROR);
          return { success: false, conflicts: result.conflicts };
        }
      }

      // Update sync state
      this.lastSyncedSnapshot = snapshot;
      this.lastSyncTimestamp = Date.now();
      this.serverVersion = result.version;

      this.setStatus(SyncStatus.IDLE);

      return { success: true, version: result.version };

    } catch (error) {
      console.error('[RemoteStore] Push failed:', error);
      
      // Queue for offline sync if network error
      if (this.isNetworkError(error)) {
        this.offlineQueue.push({ snapshot, timestamp: Date.now() });
        this.setStatus(SyncStatus.OFFLINE);
      } else {
        this.setStatus(SyncStatus.ERROR);
      }

      throw error;
    }
  }

  /**
   * Pull latest snapshot from remote server
   * 
   * @param {Object} [options] - Pull options
   * @param {string} [options.version] - Specific version to pull
   * @param {boolean} [options.deltaOnly=false] - Only pull delta since last sync
   * @returns {Promise<GraphSnapshot>}
   */
  async pull(options = {}) {
    if (!this.endpoint) {
      throw new Error('RemoteStore: No endpoint configured');
    }

    this.setStatus(SyncStatus.SYNCING);

    try {
      const params = new URLSearchParams();
      if (options.version) {
        params.set('version', options.version);
      } else if (options.deltaOnly && this.serverVersion) {
        params.set('since', this.serverVersion);
      }

      const response = await this.fetchWithRetry(
        `${this.endpoint}/pull?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );

      let data = await response.json();

      // Decompress if needed
      if (data.compressed) {
        data = await this.decompressPayload(data);
      }

      let snapshot;
      if (data.type === 'delta' && this.lastSyncedSnapshot) {
        // Apply delta to last snapshot
        snapshot = this.deltaEncoder.decode(this.lastSyncedSnapshot, data.delta);
      } else {
        // Full snapshot
        snapshot = GraphSnapshot.fromJSON(data.snapshot);
      }

      // Update sync state
      this.lastSyncedSnapshot = snapshot;
      this.lastSyncTimestamp = Date.now();
      this.serverVersion = data.version;

      this.setStatus(SyncStatus.IDLE);

      return snapshot;

    } catch (error) {
      console.error('[RemoteStore] Pull failed:', error);
      
      if (this.isNetworkError(error)) {
        this.setStatus(SyncStatus.OFFLINE);
      } else {
        this.setStatus(SyncStatus.ERROR);
      }

      throw error;
    }
  }

  /**
   * Bidirectional sync - push local changes and pull remote changes
   * 
   * @param {GraphSnapshot} localSnapshot - Local graph snapshot
   * @returns {Promise<{localVersion: string, remoteSnapshot: GraphSnapshot}>}
   */
  async sync(localSnapshot) {
    if (!this.endpoint) {
      throw new Error('RemoteStore: No endpoint configured');
    }

    // First, pull latest from server
    const remoteSnapshot = await this.pull({ deltaOnly: true });

    // Check if local has changes
    const hasLocalChanges = !this.lastSyncedSnapshot || 
      !this.snapshotsEqual(localSnapshot, this.lastSyncedSnapshot);

    if (hasLocalChanges) {
      // Push local changes
      const pushResult = await this.push(localSnapshot);
      return {
        localVersion: pushResult.version,
        remoteSnapshot: remoteSnapshot
      };
    }

    return {
      localVersion: this.serverVersion,
      remoteSnapshot: remoteSnapshot
    };
  }

  /**
   * Process offline queue when connection is restored
   * 
   * @returns {Promise<{processed: number, failed: number}>}
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    console.log(`[RemoteStore] Processing ${this.offlineQueue.length} queued snapshots`);

    let processed = 0;
    let failed = 0;

    // Process in chronological order
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      try {
        await this.push(item.snapshot);
        processed++;
      } catch (error) {
        console.error('[RemoteStore] Failed to process queued snapshot:', error);
        // Re-queue if still offline
        if (this.isNetworkError(error)) {
          this.offlineQueue.unshift(item);
          break;
        }
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Start automatic sync timer
   * 
   * @param {Function} getSnapshot - Function that returns current snapshot
   */
  startAutoSync(getSnapshot) {
    if (this.syncInterval <= 0) {
      return;
    }

    this.stopAutoSync();

    this.autoSyncTimer = setInterval(async () => {
      if (this.status === SyncStatus.SYNCING) {
        return; // Skip if already syncing
      }

      try {
        const snapshot = getSnapshot();
        await this.sync(snapshot);
      } catch (error) {
        console.error('[RemoteStore] Auto-sync failed:', error);
      }
    }, this.syncInterval);

    console.log(`[RemoteStore] Auto-sync started (interval: ${this.syncInterval}ms)`);
  }

  /**
   * Stop automatic sync timer
   */
  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('[RemoteStore] Auto-sync stopped');
    }
  }

  /**
   * Resolve conflicts based on configured strategy
   * 
   * @private
   * @param {Array} conflicts - Array of conflict objects
   * @param {GraphSnapshot} localSnapshot - Local snapshot
   * @returns {Promise<boolean>} - True if conflicts resolved
   */
  async resolveConflicts(conflicts, localSnapshot) {
    console.warn(`[RemoteStore] ${conflicts.length} conflicts detected`);

    // Notify listeners
    for (const listener of this.conflictListeners) {
      listener(conflicts);
    }

    switch (this.conflictStrategy) {
      case ConflictStrategy.SERVER_WINS:
        // Server wins - pull will overwrite local
        return true;

      case ConflictStrategy.CLIENT_WINS:
        // Client wins - force push
        return true;

      case ConflictStrategy.LAST_WRITE_WINS:
        // Compare timestamps
        const serverTime = Math.max(...conflicts.map(c => c.serverTimestamp || 0));
        const clientTime = this.lastSyncTimestamp || 0;
        return clientTime > serverTime;

      case ConflictStrategy.MANUAL:
        // Require manual resolution
        return false;

      default:
        return false;
    }
  }

  /**
   * Fetch with retry logic and exponential backoff
   * 
   * @private
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async fetchWithRetry(url, options) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.warn(`[RemoteStore] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Compress payload using CompressionStream API
   * 
   * @private
   * @param {Object} payload - Payload to compress
   * @returns {Promise<Object>} - Compressed payload
   */
  async compressPayload(payload) {
    if (typeof CompressionStream === 'undefined') {
      console.warn('[RemoteStore] CompressionStream not available, skipping compression');
      return payload;
    }

    const json = JSON.stringify(payload);
    const blob = new Blob([json]);
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(stream).blob();
    const arrayBuffer = await compressedBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return {
      compressed: true,
      data: base64,
      originalSize: json.length,
      compressedSize: base64.length
    };
  }

  /**
   * Decompress payload using DecompressionStream API
   * 
   * @private
   * @param {Object} payload - Compressed payload
   * @returns {Promise<Object>} - Decompressed payload
   */
  async decompressPayload(payload) {
    if (!payload.compressed) {
      return payload;
    }

    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not available');
    }

    const binaryString = atob(payload.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes]);
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const decompressedBlob = await new Response(stream).blob();
    const text = await decompressedBlob.text();

    return JSON.parse(text);
  }

  /**
   * Get request headers including authentication
   * 
   * @private
   * @returns {Object} - Request headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Check if error is network-related
   * 
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  isNetworkError(error) {
    return error.message.includes('Failed to fetch') ||
           error.message.includes('NetworkError') ||
           error.message.includes('ECONNREFUSED');
  }

  /**
   * Compare two snapshots for equality
   * 
   * @private
   * @param {GraphSnapshot} a - First snapshot
   * @param {GraphSnapshot} b - Second snapshot
   * @returns {boolean}
   */
  snapshotsEqual(a, b) {
    return a.version === b.version &&
           a.timestamp === b.timestamp;
  }

  /**
   * Set sync status and notify listeners
   * 
   * @private
   * @param {SyncStatus} status - New status
   */
  setStatus(status) {
    if (this.status !== status) {
      this.status = status;
      for (const listener of this.statusListeners) {
        listener(status);
      }
    }
  }

  /**
   * Register status change listener
   * 
   * @param {Function} listener - Callback function
   */
  onStatusChange(listener) {
    this.statusListeners.add(listener);
  }

  /**
   * Unregister status change listener
   * 
   * @param {Function} listener - Callback function
   */
  offStatusChange(listener) {
    this.statusListeners.delete(listener);
  }

  /**
   * Register conflict listener
   * 
   * @param {Function} listener - Callback function
   */
  onConflict(listener) {
    this.conflictListeners.add(listener);
  }

  /**
   * Unregister conflict listener
   * 
   * @param {Function} listener - Callback function
   */
  offConflict(listener) {
    this.conflictListeners.delete(listener);
  }

  /**
   * Sleep utility
   * 
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current sync statistics
   * 
   * @returns {Object} - Sync statistics
   */
  getStats() {
    return {
      status: this.status,
      lastSyncTimestamp: this.lastSyncTimestamp,
      serverVersion: this.serverVersion,
      queuedSnapshots: this.offlineQueue.length,
      autoSyncEnabled: this.autoSyncTimer !== null
    };
  }

  /**
   * Clear all cached state
   */
  clear() {
    this.lastSyncedSnapshot = null;
    this.lastSyncTimestamp = null;
    this.serverVersion = null;
    this.offlineQueue = [];
    this.stopAutoSync();
    this.setStatus(SyncStatus.IDLE);
  }
}