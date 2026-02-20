/**
 * @fileoverview TransactionLog - Append-only log of all transactions for event sourcing
 * 
 * Provides immutable transaction history with:
 * - Append-only semantics (no updates/deletes)
 * - Sequential ordering with monotonic IDs
 * - Event sourcing support for state reconstruction
 * - Efficient querying by time range, transaction type, or entity
 * - Persistence to IndexedDB for durability
 * 
 * Performance targets:
 * - Append operation: <1ms
 * - Query by range: <5ms for 1000 entries
 * - Memory footprint: <10MB for 10k transactions
 * 
 * Related: See DESIGN_SYSTEM.md § Graph Engine - Transaction Management
 * @module harmony-graph/transaction-log
 */

/**
 * Transaction entry in the append-only log
 * @typedef {Object} TransactionEntry
 * @property {number} id - Monotonically increasing transaction ID
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {string} type - Transaction type (e.g., 'NodeAdded', 'EdgeCreated')
 * @property {Object} payload - Transaction-specific data
 * @property {string|null} entityId - Optional entity ID for filtering
 * @property {Object} metadata - Additional metadata (user, session, etc.)
 */

/**
 * Query options for retrieving transactions
 * @typedef {Object} QueryOptions
 * @property {number} [fromId] - Start from this transaction ID (inclusive)
 * @property {number} [toId] - End at this transaction ID (inclusive)
 * @property {number} [fromTimestamp] - Start from this timestamp (inclusive)
 * @property {number} [toTimestamp] - End at this timestamp (inclusive)
 * @property {string} [type] - Filter by transaction type
 * @property {string} [entityId] - Filter by entity ID
 * @property {number} [limit] - Maximum number of entries to return
 * @property {boolean} [reverse] - Return entries in reverse order
 */

/**
 * TransactionLog - Append-only log for event sourcing
 * 
 * Maintains immutable history of all graph mutations with:
 * - Sequential transaction IDs
 * - Timestamp ordering
 * - Type-based filtering
 * - Entity-based filtering
 * - Efficient range queries
 * 
 * @example
 * const log = new TransactionLog();
 * await log.initialize();
 * 
 * // Append transaction
 * const txId = await log.append({
 *   type: 'NodeAdded',
 *   payload: { nodeId: 'node-1', data: { name: 'Test' } },
 *   entityId: 'node-1'
 * });
 * 
 * // Query by range
 * const recent = await log.query({ limit: 10, reverse: true });
 * 
 * // Query by entity
 * const nodeHistory = await log.query({ entityId: 'node-1' });
 */
export class TransactionLog {
  constructor() {
    /** @type {TransactionEntry[]} */
    this._entries = [];
    
    /** @type {number} */
    this._nextId = 1;
    
    /** @type {Map<string, number[]>} Index: entityId -> transaction IDs */
    this._entityIndex = new Map();
    
    /** @type {Map<string, number[]>} Index: type -> transaction IDs */
    this._typeIndex = new Map();
    
    /** @type {IDBDatabase|null} */
    this._db = null;
    
    /** @type {boolean} */
    this._initialized = false;
    
    /** @type {number} Maximum entries to keep in memory */
    this._memoryLimit = 1000;
    
    /** @type {Set<Function>} Subscribers for new transactions */
    this._subscribers = new Set();
  }

  /**
   * Initialize the transaction log
   * Loads existing transactions from IndexedDB
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) {
      return;
    }

    try {
      this._db = await this._openDatabase();
      await this._loadFromStorage();
      this._initialized = true;
    } catch (error) {
      console.error('[TransactionLog] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Append a new transaction to the log
   * 
   * @param {Object} transaction - Transaction data
   * @param {string} transaction.type - Transaction type
   * @param {Object} transaction.payload - Transaction payload
   * @param {string} [transaction.entityId] - Optional entity ID
   * @param {Object} [transaction.metadata] - Optional metadata
   * @returns {Promise<number>} Transaction ID
   */
  async append(transaction) {
    if (!this._initialized) {
      throw new Error('TransactionLog not initialized');
    }

    const startTime = performance.now();

    const entry = {
      id: this._nextId++,
      timestamp: Date.now(),
      type: transaction.type,
      payload: transaction.payload,
      entityId: transaction.entityId || null,
      metadata: transaction.metadata || {}
    };

    // Add to in-memory log
    this._entries.push(entry);

    // Update indexes
    this._updateIndexes(entry);

    // Persist to IndexedDB
    await this._persistEntry(entry);

    // Notify subscribers
    this._notifySubscribers(entry);

    // Trim memory if needed
    if (this._entries.length > this._memoryLimit) {
      this._trimMemory();
    }

    const duration = performance.now() - startTime;
    if (duration > 1) {
      console.warn(`[TransactionLog] Append took ${duration.toFixed(2)}ms (target: <1ms)`);
    }

    return entry.id;
  }

  /**
   * Query transactions from the log
   * 
   * @param {QueryOptions} [options] - Query options
   * @returns {Promise<TransactionEntry[]>} Matching transactions
   */
  async query(options = {}) {
    const startTime = performance.now();

    let results = [];

    // Determine if we need to load from storage
    const needsStorage = this._needsStorageQuery(options);

    if (needsStorage) {
      results = await this._queryFromStorage(options);
    } else {
      results = this._queryFromMemory(options);
    }

    const duration = performance.now() - startTime;
    if (duration > 5 && results.length <= 1000) {
      console.warn(`[TransactionLog] Query took ${duration.toFixed(2)}ms for ${results.length} entries (target: <5ms for 1000)`);
    }

    return results;
  }

  /**
   * Get a specific transaction by ID
   * 
   * @param {number} id - Transaction ID
   * @returns {Promise<TransactionEntry|null>} Transaction entry or null
   */
  async getById(id) {
    // Check memory first
    const entry = this._entries.find(e => e.id === id);
    if (entry) {
      return entry;
    }

    // Check storage
    return await this._getFromStorage(id);
  }

  /**
   * Get the current transaction count
   * 
   * @returns {number} Total number of transactions
   */
  getCount() {
    return this._nextId - 1;
  }

  /**
   * Get the latest transaction ID
   * 
   * @returns {number} Latest transaction ID (0 if empty)
   */
  getLatestId() {
    return this._nextId - 1;
  }

  /**
   * Subscribe to new transactions
   * 
   * @param {Function} callback - Called with each new transaction
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Clear all transactions (for testing only)
   * WARNING: This violates append-only semantics
   * 
   * @returns {Promise<void>}
   */
  async clear() {
    this._entries = [];
    this._nextId = 1;
    this._entityIndex.clear();
    this._typeIndex.clear();

    if (this._db) {
      await this._clearStorage();
    }
  }

  /**
   * Update indexes for a new entry
   * 
   * @private
   * @param {TransactionEntry} entry
   */
  _updateIndexes(entry) {
    // Entity index
    if (entry.entityId) {
      if (!this._entityIndex.has(entry.entityId)) {
        this._entityIndex.set(entry.entityId, []);
      }
      this._entityIndex.get(entry.entityId).push(entry.id);
    }

    // Type index
    if (!this._typeIndex.has(entry.type)) {
      this._typeIndex.set(entry.type, []);
    }
    this._typeIndex.get(entry.type).push(entry.id);
  }

  /**
   * Query from in-memory entries
   * 
   * @private
   * @param {QueryOptions} options
   * @returns {TransactionEntry[]}
   */
  _queryFromMemory(options) {
    let results = [...this._entries];

    // Filter by ID range
    if (options.fromId !== undefined) {
      results = results.filter(e => e.id >= options.fromId);
    }
    if (options.toId !== undefined) {
      results = results.filter(e => e.id <= options.toId);
    }

    // Filter by timestamp range
    if (options.fromTimestamp !== undefined) {
      results = results.filter(e => e.timestamp >= options.fromTimestamp);
    }
    if (options.toTimestamp !== undefined) {
      results = results.filter(e => e.timestamp <= options.toTimestamp);
    }

    // Filter by type
    if (options.type) {
      results = results.filter(e => e.type === options.type);
    }

    // Filter by entity
    if (options.entityId) {
      results = results.filter(e => e.entityId === options.entityId);
    }

    // Reverse if requested
    if (options.reverse) {
      results.reverse();
    }

    // Apply limit
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Check if query needs to access storage
   * 
   * @private
   * @param {QueryOptions} options
   * @returns {boolean}
   */
  _needsStorageQuery(options) {
    // If querying by ID and it's before our memory window
    if (options.fromId !== undefined && this._entries.length > 0) {
      const oldestInMemory = this._entries[0].id;
      if (options.fromId < oldestInMemory) {
        return true;
      }
    }

    // If no entries in memory
    if (this._entries.length === 0 && this._nextId > 1) {
      return true;
    }

    return false;
  }

  /**
   * Query from IndexedDB storage
   * 
   * @private
   * @param {QueryOptions} options
   * @returns {Promise<TransactionEntry[]>}
   */
  async _queryFromStorage(options) {
    if (!this._db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const results = [];

      let request;
      if (options.fromId !== undefined || options.toId !== undefined) {
        const range = IDBKeyRange.bound(
          options.fromId || 0,
          options.toId || Infinity
        );
        request = store.openCursor(range);
      } else {
        request = store.openCursor();
      }

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const entry = cursor.value;

          // Apply filters
          let matches = true;

          if (options.fromTimestamp !== undefined && entry.timestamp < options.fromTimestamp) {
            matches = false;
          }
          if (options.toTimestamp !== undefined && entry.timestamp > options.toTimestamp) {
            matches = false;
          }
          if (options.type && entry.type !== options.type) {
            matches = false;
          }
          if (options.entityId && entry.entityId !== options.entityId) {
            matches = false;
          }

          if (matches) {
            results.push(entry);
          }

          // Check limit
          if (options.limit !== undefined && results.length >= options.limit) {
            resolve(options.reverse ? results.reverse() : results);
            return;
          }

          cursor.continue();
        } else {
          resolve(options.reverse ? results.reverse() : results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get entry from storage by ID
   * 
   * @private
   * @param {number} id
   * @returns {Promise<TransactionEntry|null>}
   */
  async _getFromStorage(id) {
    if (!this._db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Trim in-memory entries to stay within memory limit
   * 
   * @private
   */
  _trimMemory() {
    const excess = this._entries.length - this._memoryLimit;
    if (excess > 0) {
      const removed = this._entries.splice(0, excess);
      
      // Update indexes
      for (const entry of removed) {
        if (entry.entityId) {
          const ids = this._entityIndex.get(entry.entityId);
          if (ids) {
            const idx = ids.indexOf(entry.id);
            if (idx !== -1) ids.splice(idx, 1);
            if (ids.length === 0) this._entityIndex.delete(entry.entityId);
          }
        }

        const typeIds = this._typeIndex.get(entry.type);
        if (typeIds) {
          const idx = typeIds.indexOf(entry.id);
          if (idx !== -1) typeIds.splice(idx, 1);
          if (typeIds.length === 0) this._typeIndex.delete(entry.type);
        }
      }
    }
  }

  /**
   * Notify subscribers of new transaction
   * 
   * @private
   * @param {TransactionEntry} entry
   */
  _notifySubscribers(entry) {
    for (const callback of this._subscribers) {
      try {
        callback(entry);
      } catch (error) {
        console.error('[TransactionLog] Subscriber error:', error);
      }
    }
  }

  /**
   * Open IndexedDB database
   * 
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HarmonyTransactionLog', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('entityId', 'entityId', { unique: false });
        }
      };
    });
  }

  /**
   * Load transactions from storage into memory
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _loadFromStorage() {
    if (!this._db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const request = store.openCursor(null, 'prev');

      let count = 0;
      const entries = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && count < this._memoryLimit) {
          entries.unshift(cursor.value);
          this._nextId = Math.max(this._nextId, cursor.value.id + 1);
          count++;
          cursor.continue();
        } else {
          this._entries = entries;
          
          // Rebuild indexes
          for (const entry of entries) {
            this._updateIndexes(entry);
          }

          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Persist entry to IndexedDB
   * 
   * @private
   * @param {TransactionEntry} entry
   * @returns {Promise<void>}
   */
  async _persistEntry(entry) {
    if (!this._db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(['transactions'], 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.add(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all storage
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _clearStorage() {
    if (!this._db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(['transactions'], 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}