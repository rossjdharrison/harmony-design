/**
 * @fileoverview SnapshotStore - Store and retrieve snapshots by version/timestamp
 * 
 * Manages persistent storage of graph snapshots with version control and temporal queries.
 * Supports both in-memory and IndexedDB storage strategies.
 * 
 * Related: harmony-graph/graph-snapshot.js, harmony-graph/delta-encoder.js
 * Documentation: DESIGN_SYSTEM.md § Graph Snapshot Management
 * 
 * Performance: O(log n) retrieval by version, O(1) by timestamp index
 * Memory: Configurable retention policy (default: 100 snapshots)
 */

/**
 * @typedef {Object} StoredSnapshot
 * @property {string} id - Unique snapshot identifier
 * @property {number} version - Sequential version number
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {Object} data - Snapshot data (graph state)
 * @property {Object} metadata - Additional metadata (author, description, tags)
 * @property {number} size - Serialized size in bytes
 */

/**
 * @typedef {Object} SnapshotQuery
 * @property {number} [version] - Exact version to retrieve
 * @property {number} [timestamp] - Exact timestamp to retrieve
 * @property {number} [beforeTimestamp] - Latest snapshot before this time
 * @property {number} [afterTimestamp] - Earliest snapshot after this time
 * @property {number} [minVersion] - Minimum version (inclusive)
 * @property {number} [maxVersion] - Maximum version (inclusive)
 * @property {number} [limit] - Maximum number of results
 * @property {string[]} [tags] - Filter by metadata tags
 */

/**
 * @typedef {Object} StorageStrategy
 * @property {Function} save - Save snapshot to storage
 * @property {Function} load - Load snapshot from storage
 * @property {Function} list - List available snapshots
 * @property {Function} delete - Delete snapshot from storage
 * @property {Function} clear - Clear all snapshots
 */

/**
 * SnapshotStore - Manages storage and retrieval of graph snapshots
 * 
 * Features:
 * - Version-based and timestamp-based indexing
 * - Multiple storage backends (memory, IndexedDB)
 * - Automatic retention policy enforcement
 * - Delta compression support
 * - Temporal queries (before/after, range)
 * 
 * @class
 */
export class SnapshotStore {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.storeName='graph-snapshots'] - Store identifier
   * @param {string} [options.backend='memory'] - Storage backend ('memory' or 'indexeddb')
   * @param {number} [options.maxSnapshots=100] - Maximum snapshots to retain
   * @param {number} [options.maxAge=7*24*60*60*1000] - Maximum age in ms (default: 7 days)
   * @param {boolean} [options.autoCleanup=true] - Enable automatic cleanup
   * @param {boolean} [options.compression=true] - Enable delta compression
   */
  constructor(options = {}) {
    this.storeName = options.storeName || 'graph-snapshots';
    this.backend = options.backend || 'memory';
    this.maxSnapshots = options.maxSnapshots || 100;
    this.maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days
    this.autoCleanup = options.autoCleanup !== false;
    this.compression = options.compression !== false;

    // In-memory storage
    this.snapshots = new Map(); // id -> StoredSnapshot
    this.versionIndex = new Map(); // version -> id
    this.timestampIndex = new Map(); // timestamp -> id
    
    // Sorted arrays for range queries
    this.sortedVersions = [];
    this.sortedTimestamps = [];

    // Statistics
    this.stats = {
      totalSnapshots: 0,
      totalSize: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
      oldestVersion: null,
      newestVersion: null
    };

    // Initialize storage strategy
    this.strategy = this._createStorageStrategy();
    
    // Performance monitoring
    this.metrics = {
      saveTime: [],
      loadTime: [],
      queryTime: []
    };
  }

  /**
   * Create storage strategy based on backend type
   * @private
   * @returns {StorageStrategy}
   */
  _createStorageStrategy() {
    if (this.backend === 'indexeddb') {
      return this._createIndexedDBStrategy();
    }
    return this._createMemoryStrategy();
  }

  /**
   * Create in-memory storage strategy
   * @private
   * @returns {StorageStrategy}
   */
  _createMemoryStrategy() {
    return {
      save: async (snapshot) => {
        // Already stored in this.snapshots
        return snapshot.id;
      },
      load: async (id) => {
        return this.snapshots.get(id);
      },
      list: async () => {
        return Array.from(this.snapshots.values());
      },
      delete: async (id) => {
        this.snapshots.delete(id);
      },
      clear: async () => {
        this.snapshots.clear();
      }
    };
  }

  /**
   * Create IndexedDB storage strategy
   * @private
   * @returns {StorageStrategy}
   */
  _createIndexedDBStrategy() {
    const dbName = `harmony-${this.storeName}`;
    const storeName = 'snapshots';
    let db = null;

    const openDB = async () => {
      if (db) return db;
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          db = request.result;
          resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          
          if (!database.objectStoreNames.contains(storeName)) {
            const objectStore = database.createObjectStore(storeName, { keyPath: 'id' });
            objectStore.createIndex('version', 'version', { unique: true });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    };

    return {
      save: async (snapshot) => {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put(snapshot);
          
          request.onsuccess = () => resolve(snapshot.id);
          request.onerror = () => reject(request.error);
        });
      },
      
      load: async (id) => {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(id);
          
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      
      list: async () => {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      
      delete: async (id) => {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(id);
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      },
      
      clear: async () => {
        const database = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    };
  }

  /**
   * Store a snapshot
   * @param {Object} snapshotData - Snapshot data from GraphSnapshot
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {Promise<string>} Snapshot ID
   */
  async store(snapshotData, metadata = {}) {
    const startTime = performance.now();

    // Generate snapshot record
    const snapshot = {
      id: this._generateId(),
      version: this._getNextVersion(),
      timestamp: Date.now(),
      data: snapshotData,
      metadata: {
        ...metadata,
        compressed: this.compression
      },
      size: this._calculateSize(snapshotData)
    };

    // Store in memory indexes
    this.snapshots.set(snapshot.id, snapshot);
    this.versionIndex.set(snapshot.version, snapshot.id);
    this.timestampIndex.set(snapshot.timestamp, snapshot.id);

    // Update sorted arrays
    this._insertSorted(this.sortedVersions, snapshot.version);
    this._insertSorted(this.sortedTimestamps, snapshot.timestamp);

    // Persist to storage backend
    await this.strategy.save(snapshot);

    // Update statistics
    this._updateStats(snapshot);

    // Enforce retention policy
    if (this.autoCleanup) {
      await this._enforceRetentionPolicy();
    }

    // Record metrics
    const duration = performance.now() - startTime;
    this.metrics.saveTime.push(duration);
    if (this.metrics.saveTime.length > 100) {
      this.metrics.saveTime.shift();
    }

    return snapshot.id;
  }

  /**
   * Retrieve snapshot by version
   * @param {number} version - Version number
   * @returns {Promise<StoredSnapshot|null>}
   */
  async getByVersion(version) {
    const startTime = performance.now();
    
    const id = this.versionIndex.get(version);
    if (!id) return null;

    const snapshot = await this.strategy.load(id);
    
    this._recordQueryTime(startTime);
    return snapshot;
  }

  /**
   * Retrieve snapshot by timestamp (exact match)
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {Promise<StoredSnapshot|null>}
   */
  async getByTimestamp(timestamp) {
    const startTime = performance.now();
    
    const id = this.timestampIndex.get(timestamp);
    if (!id) return null;

    const snapshot = await this.strategy.load(id);
    
    this._recordQueryTime(startTime);
    return snapshot;
  }

  /**
   * Retrieve snapshot by ID
   * @param {string} id - Snapshot ID
   * @returns {Promise<StoredSnapshot|null>}
   */
  async getById(id) {
    const startTime = performance.now();
    const snapshot = await this.strategy.load(id);
    this._recordQueryTime(startTime);
    return snapshot;
  }

  /**
   * Query snapshots with flexible criteria
   * @param {SnapshotQuery} query - Query parameters
   * @returns {Promise<StoredSnapshot[]>}
   */
  async query(query) {
    const startTime = performance.now();
    let results = [];

    // Exact version match
    if (query.version !== undefined) {
      const snapshot = await this.getByVersion(query.version);
      results = snapshot ? [snapshot] : [];
    }
    // Exact timestamp match
    else if (query.timestamp !== undefined) {
      const snapshot = await this.getByTimestamp(query.timestamp);
      results = snapshot ? [snapshot] : [];
    }
    // Before timestamp (latest before)
    else if (query.beforeTimestamp !== undefined) {
      const timestamp = this._findBeforeTimestamp(query.beforeTimestamp);
      if (timestamp !== null) {
        const snapshot = await this.getByTimestamp(timestamp);
        results = snapshot ? [snapshot] : [];
      }
    }
    // After timestamp (earliest after)
    else if (query.afterTimestamp !== undefined) {
      const timestamp = this._findAfterTimestamp(query.afterTimestamp);
      if (timestamp !== null) {
        const snapshot = await this.getByTimestamp(timestamp);
        results = snapshot ? [snapshot] : [];
      }
    }
    // Version range
    else if (query.minVersion !== undefined || query.maxVersion !== undefined) {
      results = await this._queryVersionRange(
        query.minVersion || 0,
        query.maxVersion || Infinity
      );
    }
    // All snapshots
    else {
      results = await this.strategy.list();
    }

    // Filter by tags if specified
    if (query.tags && query.tags.length > 0) {
      results = results.filter(snapshot => {
        const tags = snapshot.metadata.tags || [];
        return query.tags.every(tag => tags.includes(tag));
      });
    }

    // Apply limit
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    this._recordQueryTime(startTime);
    return results;
  }

  /**
   * List all snapshots
   * @returns {Promise<StoredSnapshot[]>}
   */
  async listAll() {
    return this.strategy.list();
  }

  /**
   * Delete snapshot by ID
   * @param {string} id - Snapshot ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return false;

    // Remove from indexes
    this.snapshots.delete(id);
    this.versionIndex.delete(snapshot.version);
    this.timestampIndex.delete(snapshot.timestamp);

    // Remove from sorted arrays
    this._removeFromSorted(this.sortedVersions, snapshot.version);
    this._removeFromSorted(this.sortedTimestamps, snapshot.timestamp);

    // Delete from storage
    await this.strategy.delete(id);

    // Update stats
    this.stats.totalSnapshots--;
    this.stats.totalSize -= snapshot.size;

    return true;
  }

  /**
   * Clear all snapshots
   * @returns {Promise<void>}
   */
  async clear() {
    this.snapshots.clear();
    this.versionIndex.clear();
    this.timestampIndex.clear();
    this.sortedVersions = [];
    this.sortedTimestamps = [];
    
    await this.strategy.clear();

    this.stats = {
      totalSnapshots: 0,
      totalSize: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
      oldestVersion: null,
      newestVersion: null
    };
  }

  /**
   * Get storage statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgSaveTime: this._average(this.metrics.saveTime),
      avgLoadTime: this._average(this.metrics.loadTime),
      avgQueryTime: this._average(this.metrics.queryTime)
    };
  }

  /**
   * Generate unique snapshot ID
   * @private
   * @returns {string}
   */
  _generateId() {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get next version number
   * @private
   * @returns {number}
   */
  _getNextVersion() {
    if (this.sortedVersions.length === 0) return 1;
    return this.sortedVersions[this.sortedVersions.length - 1] + 1;
  }

  /**
   * Calculate serialized size of snapshot data
   * @private
   * @param {Object} data - Snapshot data
   * @returns {number} Size in bytes
   */
  _calculateSize(data) {
    return JSON.stringify(data).length;
  }

  /**
   * Insert value into sorted array
   * @private
   * @param {number[]} array - Sorted array
   * @param {number} value - Value to insert
   */
  _insertSorted(array, value) {
    const index = this._binarySearchInsertIndex(array, value);
    array.splice(index, 0, value);
  }

  /**
   * Remove value from sorted array
   * @private
   * @param {number[]} array - Sorted array
   * @param {number} value - Value to remove
   */
  _removeFromSorted(array, value) {
    const index = array.indexOf(value);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  /**
   * Binary search for insert index
   * @private
   * @param {number[]} array - Sorted array
   * @param {number} value - Value to insert
   * @returns {number} Insert index
   */
  _binarySearchInsertIndex(array, value) {
    let left = 0;
    let right = array.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (array[mid] < value) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  /**
   * Find latest timestamp before given time
   * @private
   * @param {number} timestamp - Target timestamp
   * @returns {number|null}
   */
  _findBeforeTimestamp(timestamp) {
    for (let i = this.sortedTimestamps.length - 1; i >= 0; i--) {
      if (this.sortedTimestamps[i] < timestamp) {
        return this.sortedTimestamps[i];
      }
    }
    return null;
  }

  /**
   * Find earliest timestamp after given time
   * @private
   * @param {number} timestamp - Target timestamp
   * @returns {number|null}
   */
  _findAfterTimestamp(timestamp) {
    for (let i = 0; i < this.sortedTimestamps.length; i++) {
      if (this.sortedTimestamps[i] > timestamp) {
        return this.sortedTimestamps[i];
      }
    }
    return null;
  }

  /**
   * Query snapshots by version range
   * @private
   * @param {number} minVersion - Minimum version
   * @param {number} maxVersion - Maximum version
   * @returns {Promise<StoredSnapshot[]>}
   */
  async _queryVersionRange(minVersion, maxVersion) {
    const results = [];
    
    for (const version of this.sortedVersions) {
      if (version >= minVersion && version <= maxVersion) {
        const snapshot = await this.getByVersion(version);
        if (snapshot) results.push(snapshot);
      }
      if (version > maxVersion) break;
    }

    return results;
  }

  /**
   * Update statistics after storing snapshot
   * @private
   * @param {StoredSnapshot} snapshot - Stored snapshot
   */
  _updateStats(snapshot) {
    this.stats.totalSnapshots++;
    this.stats.totalSize += snapshot.size;

    if (!this.stats.oldestTimestamp || snapshot.timestamp < this.stats.oldestTimestamp) {
      this.stats.oldestTimestamp = snapshot.timestamp;
    }
    if (!this.stats.newestTimestamp || snapshot.timestamp > this.stats.newestTimestamp) {
      this.stats.newestTimestamp = snapshot.timestamp;
    }
    if (!this.stats.oldestVersion || snapshot.version < this.stats.oldestVersion) {
      this.stats.oldestVersion = snapshot.version;
    }
    if (!this.stats.newestVersion || snapshot.version > this.stats.newestVersion) {
      this.stats.newestVersion = snapshot.version;
    }
  }

  /**
   * Enforce retention policy (max snapshots and age)
   * @private
   * @returns {Promise<void>}
   */
  async _enforceRetentionPolicy() {
    const now = Date.now();
    const toDelete = [];

    // Check age limit
    for (const [id, snapshot] of this.snapshots) {
      if (now - snapshot.timestamp > this.maxAge) {
        toDelete.push(id);
      }
    }

    // Check count limit
    if (this.snapshots.size > this.maxSnapshots) {
      const excess = this.snapshots.size - this.maxSnapshots;
      const oldestIds = Array.from(this.snapshots.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, excess)
        .map(s => s.id);
      
      toDelete.push(...oldestIds);
    }

    // Delete excess snapshots
    for (const id of toDelete) {
      await this.delete(id);
    }
  }

  /**
   * Record query time metric
   * @private
   * @param {number} startTime - Start time from performance.now()
   */
  _recordQueryTime(startTime) {
    const duration = performance.now() - startTime;
    this.metrics.queryTime.push(duration);
    if (this.metrics.queryTime.length > 100) {
      this.metrics.queryTime.shift();
    }
  }

  /**
   * Calculate average of array
   * @private
   * @param {number[]} array - Array of numbers
   * @returns {number} Average
   */
  _average(array) {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }
}