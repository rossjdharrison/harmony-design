/**
 * @fileoverview IndexedDBStore - Persist graph to IndexedDB for browser storage
 * 
 * Provides persistent storage for graph snapshots, transactions, and metadata
 * using IndexedDB. Supports versioning, compression, and efficient querying.
 * 
 * Performance targets:
 * - Write latency: < 50ms for snapshots < 1MB
 * - Read latency: < 20ms for cached snapshots
 * - Storage efficiency: Delta compression for sequential versions
 * 
 * Related: harmony-graph/graph-snapshot.js, harmony-graph/snapshot-store.js
 * Documentation: DESIGN_SYSTEM.md § Graph Persistence
 * 
 * @module harmony-graph/indexeddb-store
 */

const DB_NAME = 'HarmonyGraphDB';
const DB_VERSION = 1;

const STORES = {
  SNAPSHOTS: 'snapshots',
  TRANSACTIONS: 'transactions',
  METADATA: 'metadata',
  DELTAS: 'deltas'
};

/**
 * IndexedDB-based persistent storage for graph data
 * 
 * @class IndexedDBStore
 * @example
 * const store = new IndexedDBStore();
 * await store.initialize();
 * await store.saveSnapshot(snapshot);
 * const loaded = await store.loadSnapshot(versionId);
 */
export class IndexedDBStore {
  constructor() {
    /** @type {IDBDatabase|null} */
    this.db = null;
    
    /** @type {Map<string, any>} */
    this.cache = new Map();
    
    /** @type {number} */
    this.cacheMaxSize = 10; // Maximum cached snapshots
    
    /** @type {boolean} */
    this.compressionEnabled = true;
    
    /** @type {number} */
    this.compressionThreshold = 1024; // Compress if > 1KB
  }

  /**
   * Initialize the IndexedDB database and create object stores
   * 
   * @returns {Promise<void>}
   * @throws {Error} If IndexedDB is not supported or initialization fails
   */
  async initialize() {
    if (!window.indexedDB) {
      throw new Error('IndexedDB is not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // Handle unexpected database closure
        this.db.onerror = (event) => {
          console.error('IndexedDB error:', event.target.error);
        };
        
        this.db.onversionchange = () => {
          this.db.close();
          console.warn('Database version changed, please reload the page');
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Snapshots store: Full graph snapshots
        if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORES.SNAPSHOTS, {
            keyPath: 'versionId'
          });
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
          snapshotStore.createIndex('graphId', 'graphId', { unique: false });
        }

        // Transactions store: Individual graph transactions
        if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
          const txStore = db.createObjectStore(STORES.TRANSACTIONS, {
            keyPath: 'transactionId'
          });
          txStore.createIndex('timestamp', 'timestamp', { unique: false });
          txStore.createIndex('graphId', 'graphId', { unique: false });
          txStore.createIndex('versionId', 'versionId', { unique: false });
        }

        // Deltas store: Compressed differences between snapshots
        if (!db.objectStoreNames.contains(STORES.DELTAS)) {
          const deltaStore = db.createObjectStore(STORES.DELTAS, {
            keyPath: 'deltaId'
          });
          deltaStore.createIndex('fromVersion', 'fromVersion', { unique: false });
          deltaStore.createIndex('toVersion', 'toVersion', { unique: false });
        }

        // Metadata store: Graph metadata and configuration
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, {
            keyPath: 'key'
          });
        }
      };
    });
  }

  /**
   * Save a graph snapshot to IndexedDB
   * 
   * @param {Object} snapshot - Graph snapshot to save
   * @param {string} snapshot.versionId - Unique version identifier
   * @param {string} snapshot.graphId - Graph identifier
   * @param {Object} snapshot.state - Graph state data
   * @param {number} snapshot.timestamp - Snapshot timestamp
   * @returns {Promise<void>}
   */
  async saveSnapshot(snapshot) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    const { versionId, graphId, state, timestamp } = snapshot;
    
    if (!versionId || !graphId || !state) {
      throw new Error('Invalid snapshot: missing required fields');
    }

    // Serialize and optionally compress the state
    let serializedState = JSON.stringify(state);
    let compressed = false;
    
    if (this.compressionEnabled && serializedState.length > this.compressionThreshold) {
      serializedState = await this._compress(serializedState);
      compressed = true;
    }

    const record = {
      versionId,
      graphId,
      state: serializedState,
      compressed,
      timestamp: timestamp || Date.now(),
      size: serializedState.length
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SNAPSHOTS], 'readwrite');
      const store = transaction.objectStore(STORES.SNAPSHOTS);
      const request = store.put(record);

      request.onsuccess = () => {
        // Update cache
        this._updateCache(versionId, snapshot);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save snapshot: ${request.error}`));
      };
    });
  }

  /**
   * Load a graph snapshot from IndexedDB
   * 
   * @param {string} versionId - Version identifier to load
   * @returns {Promise<Object|null>} The loaded snapshot or null if not found
   */
  async loadSnapshot(versionId) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    // Check cache first
    if (this.cache.has(versionId)) {
      return this.cache.get(versionId);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SNAPSHOTS], 'readonly');
      const store = transaction.objectStore(STORES.SNAPSHOTS);
      const request = store.get(versionId);

      request.onsuccess = async () => {
        const record = request.result;
        
        if (!record) {
          resolve(null);
          return;
        }

        // Deserialize and decompress if needed
        let state = record.state;
        if (record.compressed) {
          state = await this._decompress(state);
        }
        
        if (typeof state === 'string') {
          state = JSON.parse(state);
        }

        const snapshot = {
          versionId: record.versionId,
          graphId: record.graphId,
          state,
          timestamp: record.timestamp
        };

        // Update cache
        this._updateCache(versionId, snapshot);
        
        resolve(snapshot);
      };

      request.onerror = () => {
        reject(new Error(`Failed to load snapshot: ${request.error}`));
      };
    });
  }

  /**
   * Save a graph transaction to IndexedDB
   * 
   * @param {Object} transaction - Transaction to save
   * @param {string} transaction.transactionId - Unique transaction identifier
   * @param {string} transaction.graphId - Graph identifier
   * @param {string} transaction.versionId - Associated version
   * @param {Array} transaction.mutations - List of mutations
   * @param {number} transaction.timestamp - Transaction timestamp
   * @returns {Promise<void>}
   */
  async saveTransaction(transaction) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    const { transactionId, graphId, versionId, mutations, timestamp } = transaction;
    
    if (!transactionId || !graphId || !mutations) {
      throw new Error('Invalid transaction: missing required fields');
    }

    const record = {
      transactionId,
      graphId,
      versionId: versionId || null,
      mutations: JSON.stringify(mutations),
      timestamp: timestamp || Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORES.TRANSACTIONS], 'readwrite');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to save transaction: ${request.error}`));
      };
    });
  }

  /**
   * Load transactions for a specific graph
   * 
   * @param {string} graphId - Graph identifier
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Maximum number of transactions to return
   * @param {number} [options.since] - Only return transactions after this timestamp
   * @returns {Promise<Array>} Array of transactions
   */
  async loadTransactions(graphId, options = {}) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRANSACTIONS], 'readonly');
      const store = transaction.objectStore(STORES.TRANSACTIONS);
      const index = store.index('graphId');
      const request = index.getAll(graphId);

      request.onsuccess = () => {
        let transactions = request.result.map(record => ({
          transactionId: record.transactionId,
          graphId: record.graphId,
          versionId: record.versionId,
          mutations: JSON.parse(record.mutations),
          timestamp: record.timestamp
        }));

        // Apply filters
        if (options.since) {
          transactions = transactions.filter(tx => tx.timestamp > options.since);
        }

        // Sort by timestamp (newest first)
        transactions.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit
        if (options.limit) {
          transactions = transactions.slice(0, options.limit);
        }

        resolve(transactions);
      };

      request.onerror = () => {
        reject(new Error(`Failed to load transactions: ${request.error}`));
      };
    });
  }

  /**
   * Save a delta (difference) between two snapshots
   * 
   * @param {Object} delta - Delta to save
   * @param {string} delta.fromVersion - Source version ID
   * @param {string} delta.toVersion - Target version ID
   * @param {Object} delta.changes - Delta changes
   * @returns {Promise<void>}
   */
  async saveDelta(delta) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    const { fromVersion, toVersion, changes } = delta;
    
    if (!fromVersion || !toVersion || !changes) {
      throw new Error('Invalid delta: missing required fields');
    }

    const deltaId = `${fromVersion}->${toVersion}`;
    const record = {
      deltaId,
      fromVersion,
      toVersion,
      changes: JSON.stringify(changes),
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.DELTAS], 'readwrite');
      const store = transaction.objectStore(STORES.DELTAS);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to save delta: ${request.error}`));
      };
    });
  }

  /**
   * Load a delta between two snapshots
   * 
   * @param {string} fromVersion - Source version ID
   * @param {string} toVersion - Target version ID
   * @returns {Promise<Object|null>} The delta or null if not found
   */
  async loadDelta(fromVersion, toVersion) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    const deltaId = `${fromVersion}->${toVersion}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.DELTAS], 'readonly');
      const store = transaction.objectStore(STORES.DELTAS);
      const request = store.get(deltaId);

      request.onsuccess = () => {
        const record = request.result;
        
        if (!record) {
          resolve(null);
          return;
        }

        resolve({
          fromVersion: record.fromVersion,
          toVersion: record.toVersion,
          changes: JSON.parse(record.changes),
          timestamp: record.timestamp
        });
      };

      request.onerror = () => {
        reject(new Error(`Failed to load delta: ${request.error}`));
      };
    });
  }

  /**
   * Save metadata key-value pair
   * 
   * @param {string} key - Metadata key
   * @param {any} value - Metadata value
   * @returns {Promise<void>}
   */
  async saveMetadata(key, value) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    const record = {
      key,
      value: JSON.stringify(value),
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to save metadata: ${request.error}`));
      };
    });
  }

  /**
   * Load metadata by key
   * 
   * @param {string} key - Metadata key
   * @returns {Promise<any|null>} The metadata value or null if not found
   */
  async loadMetadata(key) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? JSON.parse(record.value) : null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to load metadata: ${request.error}`));
      };
    });
  }

  /**
   * List all snapshots for a specific graph
   * 
   * @param {string} graphId - Graph identifier
   * @returns {Promise<Array>} Array of snapshot metadata
   */
  async listSnapshots(graphId) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SNAPSHOTS], 'readonly');
      const store = transaction.objectStore(STORES.SNAPSHOTS);
      const index = store.index('graphId');
      const request = index.getAll(graphId);

      request.onsuccess = () => {
        const snapshots = request.result.map(record => ({
          versionId: record.versionId,
          graphId: record.graphId,
          timestamp: record.timestamp,
          size: record.size,
          compressed: record.compressed
        }));

        // Sort by timestamp (newest first)
        snapshots.sort((a, b) => b.timestamp - a.timestamp);

        resolve(snapshots);
      };

      request.onerror = () => {
        reject(new Error(`Failed to list snapshots: ${request.error}`));
      };
    });
  }

  /**
   * Delete a snapshot by version ID
   * 
   * @param {string} versionId - Version identifier to delete
   * @returns {Promise<void>}
   */
  async deleteSnapshot(versionId) {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SNAPSHOTS], 'readwrite');
      const store = transaction.objectStore(STORES.SNAPSHOTS);
      const request = store.delete(versionId);

      request.onsuccess = () => {
        // Remove from cache
        this.cache.delete(versionId);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete snapshot: ${request.error}`));
      };
    });
  }

  /**
   * Clear all data from the database
   * 
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    const storeNames = [
      STORES.SNAPSHOTS,
      STORES.TRANSACTIONS,
      STORES.DELTAS,
      STORES.METADATA
    ];

    const promises = storeNames.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    });

    await Promise.all(promises);
    this.cache.clear();
  }

  /**
   * Get storage statistics
   * 
   * @returns {Promise<Object>} Storage statistics
   */
  async getStats() {
    if (!this.db) {
      throw new Error('IndexedDBStore not initialized');
    }

    const stats = {
      snapshots: 0,
      transactions: 0,
      deltas: 0,
      metadata: 0,
      totalSize: 0
    };

    const storeNames = [
      STORES.SNAPSHOTS,
      STORES.TRANSACTIONS,
      STORES.DELTAS,
      STORES.METADATA
    ];

    for (const storeName of storeNames) {
      const count = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to count ${storeName}`));
      });

      stats[storeName] = count;
    }

    // Estimate storage usage if available
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      stats.totalSize = estimate.usage || 0;
      stats.quota = estimate.quota || 0;
    }

    return stats;
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.cache.clear();
  }

  /**
   * Update the in-memory cache with a snapshot
   * 
   * @private
   * @param {string} versionId - Version identifier
   * @param {Object} snapshot - Snapshot to cache
   */
  _updateCache(versionId, snapshot) {
    // Implement LRU cache eviction
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(versionId, snapshot);
  }

  /**
   * Compress a string using CompressionStream API (if available)
   * 
   * @private
   * @param {string} data - Data to compress
   * @returns {Promise<string>} Compressed data as base64
   */
  async _compress(data) {
    // Fallback: return original data if compression not available
    if (!window.CompressionStream) {
      return data;
    }

    try {
      const stream = new Blob([data]).stream();
      const compressedStream = stream.pipeThrough(
        new CompressionStream('gzip')
      );
      const compressedBlob = await new Response(compressedStream).blob();
      const buffer = await compressedBlob.arrayBuffer();
      
      // Convert to base64 for storage
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  /**
   * Decompress a string using DecompressionStream API (if available)
   * 
   * @private
   * @param {string} data - Compressed data as base64
   * @returns {Promise<string>} Decompressed data
   */
  async _decompress(data) {
    // If data doesn't look like base64, assume it's uncompressed
    if (!window.DecompressionStream || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      return data;
    }

    try {
      // Convert from base64
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(
        new DecompressionStream('gzip')
      );
      const decompressedBlob = await new Response(decompressedStream).blob();
      return await decompressedBlob.text();
    } catch (error) {
      console.warn('Decompression failed, returning as-is:', error);
      return data;
    }
  }
}

// Export singleton instance
export const indexedDBStore = new IndexedDBStore();