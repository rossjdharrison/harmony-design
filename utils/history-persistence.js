/**
 * @fileoverview History Persistence Utility
 * @module utils/history-persistence
 * 
 * Persists navigation/action history to IndexedDB for session recovery.
 * Supports storing, retrieving, and clearing history entries.
 * 
 * Performance: All operations target <16ms execution time
 * Storage: Uses IndexedDB for persistent storage across sessions
 * 
 * @see DESIGN_SYSTEM.md#history-persistence
 */

/**
 * History entry structure
 * @typedef {Object} HistoryEntry
 * @property {string} id - Unique identifier
 * @property {string} type - Entry type (navigation, command, state)
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {Object} data - Entry-specific data
 * @property {string} [sessionId] - Session identifier
 */

/**
 * History persistence configuration
 * @typedef {Object} HistoryPersistenceConfig
 * @property {string} dbName - Database name
 * @property {string} storeName - Object store name
 * @property {number} maxEntries - Maximum entries to keep
 * @property {number} maxAge - Maximum age in milliseconds
 */

const DEFAULT_CONFIG = {
  dbName: 'harmony-history',
  storeName: 'history-entries',
  maxEntries: 1000,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * History Persistence Manager
 * Manages persistent storage of history entries for session recovery
 */
export class HistoryPersistence {
  /**
   * @param {Partial<HistoryPersistenceConfig>} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = null;
    this.sessionId = this._generateSessionId();
    this._initPromise = null;
  }

  /**
   * Initialize the IndexedDB database
   * @returns {Promise<void>}
   * @private
   */
  async _init() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, 1);

      request.onerror = () => {
        console.error('[HistoryPersistence] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[HistoryPersistence] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const objectStore = db.createObjectStore(this.config.storeName, { 
            keyPath: 'id' 
          });
          
          // Create indexes for efficient queries
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('type', 'type', { unique: false });
          objectStore.createIndex('sessionId', 'sessionId', { unique: false });
          objectStore.createIndex('type_timestamp', ['type', 'timestamp'], { unique: false });
          
          console.log('[HistoryPersistence] Object store created with indexes');
        }
      };
    });

    return this._initPromise;
  }

  /**
   * Generate a unique session identifier
   * @returns {string}
   * @private
   */
  _generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a history entry
   * @param {string} type - Entry type
   * @param {Object} data - Entry data
   * @returns {Promise<string>} Entry ID
   */
  async addEntry(type, data) {
    const startTime = performance.now();
    
    await this._init();

    const entry = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data,
      sessionId: this.sessionId,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.add(entry);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        if (duration > 16) {
          console.warn(`[HistoryPersistence] addEntry exceeded 16ms budget: ${duration.toFixed(2)}ms`);
        }
        
        // Cleanup old entries asynchronously
        this._cleanupOldEntries().catch(err => {
          console.error('[HistoryPersistence] Cleanup failed:', err);
        });
        
        resolve(entry.id);
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Failed to add entry:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get entries by type
   * @param {string} type - Entry type
   * @param {number} [limit] - Maximum number of entries to return
   * @returns {Promise<HistoryEntry[]>}
   */
  async getEntriesByType(type, limit = 100) {
    const startTime = performance.now();
    
    await this._init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const index = objectStore.index('type_timestamp');
      
      // Query in reverse order (newest first)
      const range = IDBKeyRange.bound([type, 0], [type, Date.now()]);
      const request = index.openCursor(range, 'prev');
      
      const entries = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && count < limit) {
          entries.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          const duration = performance.now() - startTime;
          if (duration > 16) {
            console.warn(`[HistoryPersistence] getEntriesByType exceeded 16ms budget: ${duration.toFixed(2)}ms`);
          }
          resolve(entries);
        }
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Failed to get entries:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get entries for current session
   * @param {number} [limit] - Maximum number of entries to return
   * @returns {Promise<HistoryEntry[]>}
   */
  async getSessionEntries(limit = 100) {
    await this._init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const index = objectStore.index('sessionId');
      
      const request = index.getAll(this.sessionId, limit);

      request.onsuccess = () => {
        // Sort by timestamp descending
        const entries = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(entries);
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Failed to get session entries:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all entries within a time range
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {Promise<HistoryEntry[]>}
   */
  async getEntriesInRange(startTime, endTime) {
    await this._init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const index = objectStore.index('timestamp');
      
      const range = IDBKeyRange.bound(startTime, endTime);
      const request = index.getAll(range);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Failed to get entries in range:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get the most recent entries
   * @param {number} [limit=50] - Maximum number of entries to return
   * @returns {Promise<HistoryEntry[]>}
   */
  async getRecentEntries(limit = 50) {
    await this._init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const index = objectStore.index('timestamp');
      
      const request = index.openCursor(null, 'prev');
      const entries = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && count < limit) {
          entries.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(entries);
        }
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Failed to get recent entries:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all history entries
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this._init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('[HistoryPersistence] All entries cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Failed to clear entries:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear entries older than maxAge
   * @returns {Promise<number>} Number of entries deleted
   * @private
   */
  async _cleanupOldEntries() {
    await this._init();

    const cutoffTime = Date.now() - this.config.maxAge;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const index = objectStore.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          if (deletedCount > 0) {
            console.log(`[HistoryPersistence] Cleaned up ${deletedCount} old entries`);
          }
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Cleanup failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Export history to JSON for backup
   * @returns {Promise<string>} JSON string
   */
  async exportToJSON() {
    await this._init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const json = JSON.stringify({
          version: 1,
          exportedAt: Date.now(),
          entries: request.result,
        }, null, 2);
        resolve(json);
      };

      request.onerror = () => {
        console.error('[HistoryPersistence] Export failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Import history from JSON backup
   * @param {string} json - JSON string
   * @returns {Promise<number>} Number of entries imported
   */
  async importFromJSON(json) {
    await this._init();

    const data = JSON.parse(json);
    
    if (!data.entries || !Array.isArray(data.entries)) {
      throw new Error('Invalid import data format');
    }

    let importedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);

      for (const entry of data.entries) {
        objectStore.add(entry);
        importedCount++;
      }

      transaction.oncomplete = () => {
        console.log(`[HistoryPersistence] Imported ${importedCount} entries`);
        resolve(importedCount);
      };

      transaction.onerror = () => {
        console.error('[HistoryPersistence] Import failed:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    await this._init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const countRequest = objectStore.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        // Get oldest and newest entries
        const index = objectStore.index('timestamp');
        const oldestRequest = index.openCursor(null, 'next');
        const newestRequest = index.openCursor(null, 'prev');
        
        let oldest = null;
        let newest = null;

        oldestRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            oldest = cursor.value.timestamp;
          }
        };

        newestRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            newest = cursor.value.timestamp;
          }
        };

        transaction.oncomplete = () => {
          resolve({
            totalEntries: count,
            oldestEntry: oldest,
            newestEntry: newest,
            sessionId: this.sessionId,
            maxEntries: this.config.maxEntries,
            maxAge: this.config.maxAge,
          });
        };
      };

      countRequest.onerror = () => {
        console.error('[HistoryPersistence] Failed to get stats:', countRequest.error);
        reject(countRequest.error);
      };
    });
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this._initPromise = null;
      console.log('[HistoryPersistence] Database connection closed');
    }
  }
}

/**
 * Create a singleton instance
 */
let instance = null;

/**
 * Get the singleton instance
 * @param {Partial<HistoryPersistenceConfig>} config - Configuration options
 * @returns {HistoryPersistence}
 */
export function getHistoryPersistence(config = {}) {
  if (!instance) {
    instance = new HistoryPersistence(config);
  }
  return instance;
}