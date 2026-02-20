/**
 * @fileoverview FileSystemStore - Persist graph data to filesystem for Node.js/Electron
 * @module core/graph/FileSystemStore
 * 
 * Provides filesystem-based persistence for graph snapshots and transaction logs.
 * Designed for Node.js and Electron environments where filesystem access is available.
 * 
 * Performance Constraints:
 * - Write operations must complete within 100ms for typical graphs
 * - Read operations must complete within 50ms
 * - Memory overhead limited to 10MB during serialization
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Graph Persistence
 */

/**
 * @typedef {Object} FileSystemStoreConfig
 * @property {string} basePath - Base directory path for storing graph data
 * @property {boolean} [autoFlush=true] - Automatically flush writes to disk
 * @property {number} [flushInterval=5000] - Interval in ms for auto-flush
 * @property {boolean} [compress=false] - Enable gzip compression for stored data
 * @property {number} [maxBackups=5] - Maximum number of backup snapshots to keep
 */

/**
 * @typedef {Object} StoredSnapshot
 * @property {string} id - Unique snapshot identifier
 * @property {number} timestamp - Unix timestamp of snapshot creation
 * @property {Object} graph - Serialized graph data
 * @property {string} version - Schema version
 * @property {Object} metadata - Additional metadata
 */

/**
 * FileSystemStore - Persist graph snapshots and transaction logs to filesystem
 * 
 * Implements atomic writes, backup rotation, and optional compression.
 * Compatible with Node.js fs module and Electron's filesystem access.
 * 
 * @example
 * const store = new FileSystemStore({
 *   basePath: './data/graphs',
 *   autoFlush: true,
 *   compress: true
 * });
 * 
 * await store.initialize();
 * await store.saveSnapshot(graphSnapshot);
 * const loaded = await store.loadLatestSnapshot();
 */
export class FileSystemStore {
  /**
   * Create a new FileSystemStore instance
   * @param {FileSystemStoreConfig} config - Configuration options
   */
  constructor(config) {
    this.config = {
      autoFlush: true,
      flushInterval: 5000,
      compress: false,
      maxBackups: 5,
      ...config
    };

    if (!this.config.basePath) {
      throw new Error('FileSystemStore requires basePath configuration');
    }

    this.basePath = this.config.basePath;
    this.snapshotsPath = null;
    this.transactionsPath = null;
    this.backupsPath = null;
    this.initialized = false;
    this.pendingWrites = new Map();
    this.flushTimer = null;

    // Platform detection
    this.isNode = typeof process !== 'undefined' && process.versions?.node;
    this.isElectron = typeof process !== 'undefined' && process.versions?.electron;
    
    // Filesystem module will be loaded during initialization
    this.fs = null;
    this.path = null;
    this.zlib = null;
  }

  /**
   * Initialize the store and create necessary directories
   * @returns {Promise<void>}
   * @throws {Error} If not running in Node.js/Electron or initialization fails
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Verify we're in a Node.js/Electron environment
    if (!this.isNode && !this.isElectron) {
      throw new Error('FileSystemStore requires Node.js or Electron environment');
    }

    try {
      // Dynamically import Node.js modules (works in both Node and Electron)
      const fsModule = await import('fs');
      const pathModule = await import('path');
      
      this.fs = fsModule.promises;
      this.fsSync = fsModule;
      this.path = pathModule;

      if (this.config.compress) {
        const zlibModule = await import('zlib');
        this.zlib = zlibModule;
      }

      // Setup directory structure
      this.snapshotsPath = this.path.join(this.basePath, 'snapshots');
      this.transactionsPath = this.path.join(this.basePath, 'transactions');
      this.backupsPath = this.path.join(this.basePath, 'backups');

      await this._ensureDirectories();

      // Start auto-flush timer if enabled
      if (this.config.autoFlush) {
        this._startAutoFlush();
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`FileSystemStore initialization failed: ${error.message}`);
    }
  }

  /**
   * Ensure all required directories exist
   * @private
   * @returns {Promise<void>}
   */
  async _ensureDirectories() {
    const dirs = [this.basePath, this.snapshotsPath, this.transactionsPath, this.backupsPath];
    
    for (const dir of dirs) {
      try {
        await this.fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Save a graph snapshot to filesystem
   * @param {StoredSnapshot} snapshot - Snapshot to save
   * @returns {Promise<string>} Path to saved snapshot file
   */
  async saveSnapshot(snapshot) {
    this._ensureInitialized();

    const snapshotId = snapshot.id || `snapshot-${Date.now()}`;
    const timestamp = snapshot.timestamp || Date.now();
    
    const snapshotData = {
      id: snapshotId,
      timestamp,
      version: snapshot.version || '1.0.0',
      graph: snapshot.graph,
      metadata: snapshot.metadata || {}
    };

    // Create backup of existing snapshot if it exists
    const snapshotPath = this.path.join(this.snapshotsPath, `${snapshotId}.json`);
    await this._createBackup(snapshotPath);

    // Serialize and optionally compress
    let data = JSON.stringify(snapshotData, null, 2);
    
    if (this.config.compress && this.zlib) {
      data = await this._compress(data);
      snapshotPath = snapshotPath + '.gz';
    }

    // Atomic write using temp file + rename
    const tempPath = snapshotPath + '.tmp';
    await this.fs.writeFile(tempPath, data, 'utf8');
    await this.fs.rename(tempPath, snapshotPath);

    // Rotate old backups
    await this._rotateBackups();

    return snapshotPath;
  }

  /**
   * Load a specific snapshot by ID
   * @param {string} snapshotId - Snapshot identifier
   * @returns {Promise<StoredSnapshot|null>} Loaded snapshot or null if not found
   */
  async loadSnapshot(snapshotId) {
    this._ensureInitialized();

    let snapshotPath = this.path.join(this.snapshotsPath, `${snapshotId}.json`);
    let compressed = false;

    // Check for compressed version
    if (this.config.compress) {
      const compressedPath = snapshotPath + '.gz';
      try {
        await this.fs.access(compressedPath);
        snapshotPath = compressedPath;
        compressed = true;
      } catch {
        // Fall back to uncompressed
      }
    }

    try {
      let data = await this.fs.readFile(snapshotPath, 'utf8');
      
      if (compressed && this.zlib) {
        data = await this._decompress(data);
      }

      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Load the most recent snapshot
   * @returns {Promise<StoredSnapshot|null>} Latest snapshot or null if none exist
   */
  async loadLatestSnapshot() {
    this._ensureInitialized();

    const snapshots = await this._listSnapshots();
    
    if (snapshots.length === 0) {
      return null;
    }

    // Sort by timestamp (newest first)
    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    
    const latestId = snapshots[0].id;
    return this.loadSnapshot(latestId);
  }

  /**
   * List all available snapshots
   * @returns {Promise<Array<{id: string, timestamp: number, path: string}>>}
   */
  async _listSnapshots() {
    const files = await this.fs.readdir(this.snapshotsPath);
    const snapshots = [];

    for (const file of files) {
      if (file.endsWith('.tmp')) continue;
      
      const filePath = this.path.join(this.snapshotsPath, file);
      const stats = await this.fs.stat(filePath);
      
      let id = file.replace(/\.(json|json\.gz)$/, '');
      
      snapshots.push({
        id,
        timestamp: stats.mtimeMs,
        path: filePath
      });
    }

    return snapshots;
  }

  /**
   * Append transaction to transaction log
   * @param {Object} transaction - Transaction data to append
   * @returns {Promise<void>}
   */
  async appendTransaction(transaction) {
    this._ensureInitialized();

    const logPath = this.path.join(this.transactionsPath, 'transactions.log');
    const entry = JSON.stringify(transaction) + '\n';

    // Append to log file
    await this.fs.appendFile(logPath, entry, 'utf8');
  }

  /**
   * Read all transactions from log
   * @returns {Promise<Array<Object>>} Array of transaction objects
   */
  async readTransactions() {
    this._ensureInitialized();

    const logPath = this.path.join(this.transactionsPath, 'transactions.log');

    try {
      const content = await this.fs.readFile(logPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear transaction log (typically after snapshot)
   * @returns {Promise<void>}
   */
  async clearTransactions() {
    this._ensureInitialized();

    const logPath = this.path.join(this.transactionsPath, 'transactions.log');
    
    try {
      await this.fs.unlink(logPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Create backup of existing file
   * @private
   * @param {string} filePath - Path to file to backup
   * @returns {Promise<void>}
   */
  async _createBackup(filePath) {
    try {
      await this.fs.access(filePath);
      
      const fileName = this.path.basename(filePath);
      const backupName = `${fileName}.${Date.now()}.bak`;
      const backupPath = this.path.join(this.backupsPath, backupName);
      
      await this.fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Failed to create backup:', error.message);
      }
    }
  }

  /**
   * Rotate old backups, keeping only maxBackups most recent
   * @private
   * @returns {Promise<void>}
   */
  async _rotateBackups() {
    try {
      const files = await this.fs.readdir(this.backupsPath);
      const backups = [];

      for (const file of files) {
        const filePath = this.path.join(this.backupsPath, file);
        const stats = await this.fs.stat(filePath);
        
        backups.push({
          path: filePath,
          mtime: stats.mtimeMs
        });
      }

      // Sort by modification time (oldest first)
      backups.sort((a, b) => a.mtime - b.mtime);

      // Delete old backups beyond maxBackups
      const toDelete = backups.slice(0, Math.max(0, backups.length - this.config.maxBackups));
      
      for (const backup of toDelete) {
        await this.fs.unlink(backup.path);
      }
    } catch (error) {
      console.warn('Failed to rotate backups:', error.message);
    }
  }

  /**
   * Compress data using gzip
   * @private
   * @param {string} data - Data to compress
   * @returns {Promise<Buffer>}
   */
  async _compress(data) {
    return new Promise((resolve, reject) => {
      this.zlib.gzip(data, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  /**
   * Decompress gzipped data
   * @private
   * @param {Buffer} data - Data to decompress
   * @returns {Promise<string>}
   */
  async _decompress(data) {
    return new Promise((resolve, reject) => {
      this.zlib.gunzip(data, (error, result) => {
        if (error) reject(error);
        else resolve(result.toString('utf8'));
      });
    });
  }

  /**
   * Start auto-flush timer
   * @private
   */
  _startAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Auto-flush failed:', error);
      });
    }, this.config.flushInterval);
  }

  /**
   * Flush any pending writes to disk
   * @returns {Promise<void>}
   */
  async flush() {
    // In Node.js, writes are typically synchronous to the OS buffer
    // This is a no-op but provided for API consistency
    return Promise.resolve();
  }

  /**
   * Ensure store is initialized before operations
   * @private
   * @throws {Error} If store not initialized
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('FileSystemStore not initialized. Call initialize() first.');
    }
  }

  /**
   * Clean up resources and stop timers
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
    this.initialized = false;
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Statistics about stored data
   */
  async getStats() {
    this._ensureInitialized();

    const snapshots = await this._listSnapshots();
    const transactionLog = this.path.join(this.transactionsPath, 'transactions.log');
    
    let transactionCount = 0;
    let transactionSize = 0;

    try {
      const stats = await this.fs.stat(transactionLog);
      transactionSize = stats.size;
      
      const transactions = await this.readTransactions();
      transactionCount = transactions.length;
    } catch (error) {
      // Log doesn't exist yet
    }

    let totalSize = transactionSize;
    for (const snapshot of snapshots) {
      const stats = await this.fs.stat(snapshot.path);
      totalSize += stats.size;
    }

    return {
      snapshotCount: snapshots.length,
      transactionCount,
      totalSize,
      basePath: this.basePath,
      compressed: this.config.compress
    };
  }
}