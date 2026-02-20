/**
 * @fileoverview Structured Logger - JSON-formatted logging with log levels and context
 * @module core/logger
 * 
 * Provides centralized logging with:
 * - Multiple log levels (trace, debug, info, warn, error, fatal)
 * - Structured JSON output
 * - Contextual metadata
 * - Performance tracking
 * - Log filtering and sampling
 * 
 * @see DESIGN_SYSTEM.md#structured-logger
 */

/**
 * @typedef {Object} LogContext
 * @property {string} [component] - Component name
 * @property {string} [action] - Action being performed
 * @property {string} [userId] - User identifier
 * @property {string} [sessionId] - Session identifier
 * @property {string} [requestId] - Request identifier
 * @property {number} [duration] - Operation duration in ms
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {'trace'|'debug'|'info'|'warn'|'error'|'fatal'} LogLevel
 */

/**
 * @typedef {Object} LogEntry
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {LogLevel} level - Log level
 * @property {string} message - Log message
 * @property {LogContext} [context] - Contextual information
 * @property {Error} [error] - Error object (for error/fatal levels)
 * @property {string} [stack] - Stack trace (for error/fatal levels)
 */

const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

const LOG_LEVEL_NAMES = Object.keys(LOG_LEVELS);

/**
 * Structured Logger with JSON formatting and contextual metadata
 */
class StructuredLogger {
  /**
   * @param {Object} config - Logger configuration
   * @param {LogLevel} [config.minLevel='info'] - Minimum log level to output
   * @param {boolean} [config.enableConsole=true] - Enable console output
   * @param {boolean} [config.enableStorage=false] - Enable IndexedDB storage
   * @param {number} [config.maxStorageEntries=1000] - Maximum entries in storage
   * @param {Function} [config.transport] - Custom transport function
   * @param {number} [config.sampleRate=1.0] - Sampling rate (0.0-1.0)
   * @param {LogContext} [config.globalContext={}] - Global context added to all logs
   */
  constructor(config = {}) {
    this.minLevel = LOG_LEVELS[config.minLevel] ?? LOG_LEVELS.info;
    this.enableConsole = config.enableConsole ?? true;
    this.enableStorage = config.enableStorage ?? false;
    this.maxStorageEntries = config.maxStorageEntries ?? 1000;
    this.transport = config.transport ?? null;
    this.sampleRate = config.sampleRate ?? 1.0;
    this.globalContext = config.globalContext ?? {};
    
    /** @type {LogEntry[]} */
    this.buffer = [];
    this.storageKey = 'harmony:logs';
    
    // Performance tracking
    this.performanceMarks = new Map();
    
    // Initialize storage if enabled
    if (this.enableStorage) {
      this._initStorage();
    }
  }

  /**
   * Initialize IndexedDB storage for logs
   * @private
   */
  async _initStorage() {
    try {
      const request = indexedDB.open('HarmonyLogs', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('level', 'level', { unique: false });
          store.createIndex('component', 'context.component', { unique: false });
        }
      };
      
      this.db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to initialize log storage:', error);
      this.enableStorage = false;
    }
  }

  /**
   * Check if a log level should be output
   * @param {LogLevel} level - Log level to check
   * @returns {boolean}
   * @private
   */
  _shouldLog(level) {
    const levelValue = LOG_LEVELS[level];
    if (levelValue < this.minLevel) return false;
    
    // Apply sampling for non-error logs
    if (levelValue < LOG_LEVELS.error && this.sampleRate < 1.0) {
      return Math.random() < this.sampleRate;
    }
    
    return true;
  }

  /**
   * Create a structured log entry
   * @param {LogLevel} level - Log level
   * @param {string} message - Log message
   * @param {LogContext} [context={}] - Contextual information
   * @param {Error} [error] - Error object
   * @returns {LogEntry}
   * @private
   */
  _createEntry(level, message, context = {}, error = null) {
    /** @type {LogEntry} */
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.globalContext, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
      };
      entry.stack = error.stack;
    }

    return entry;
  }

  /**
   * Output log entry to console
   * @param {LogEntry} entry - Log entry
   * @private
   */
  _outputToConsole(entry) {
    const consoleMethod = entry.level === 'fatal' ? 'error' : entry.level;
    const method = console[consoleMethod] || console.log;
    
    // Pretty print in development, JSON in production
    if (process?.env?.NODE_ENV === 'development') {
      const contextStr = Object.keys(entry.context).length > 0 
        ? `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
        : '';
      const errorStr = entry.error 
        ? `\n  Error: ${entry.error.message}\n  ${entry.stack}`
        : '';
      
      method(`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}${errorStr}`);
    } else {
      method(JSON.stringify(entry));
    }
  }

  /**
   * Store log entry to IndexedDB
   * @param {LogEntry} entry - Log entry
   * @private
   */
  async _storeEntry(entry) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      
      await new Promise((resolve, reject) => {
        const request = store.add(entry);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });

      // Clean up old entries if we exceed max
      const countRequest = store.count();
      countRequest.onsuccess = async () => {
        if (countRequest.result > this.maxStorageEntries) {
          await this._pruneOldEntries();
        }
      };
    } catch (error) {
      console.error('Failed to store log entry:', error);
    }
  }

  /**
   * Remove oldest log entries to stay under limit
   * @private
   */
  async _pruneOldEntries() {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      const index = store.index('timestamp');
      
      const entriesToDelete = [];
      const cursor = index.openCursor();
      
      await new Promise((resolve) => {
        let count = 0;
        cursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && count < 100) { // Delete oldest 100
            entriesToDelete.push(cursor.primaryKey);
            count++;
            cursor.continue();
          } else {
            resolve();
          }
        };
      });

      for (const key of entriesToDelete) {
        store.delete(key);
      }
    } catch (error) {
      console.error('Failed to prune log entries:', error);
    }
  }

  /**
   * Log a message at the specified level
   * @param {LogLevel} level - Log level
   * @param {string} message - Log message
   * @param {LogContext} [context={}] - Contextual information
   * @param {Error} [error] - Error object
   */
  log(level, message, context = {}, error = null) {
    if (!this._shouldLog(level)) return;

    const entry = this._createEntry(level, message, context, error);
    
    // Add to buffer
    this.buffer.push(entry);
    if (this.buffer.length > 100) {
      this.buffer.shift();
    }

    // Output to console
    if (this.enableConsole) {
      this._outputToConsole(entry);
    }

    // Store to IndexedDB
    if (this.enableStorage) {
      this._storeEntry(entry);
    }

    // Custom transport
    if (this.transport) {
      try {
        this.transport(entry);
      } catch (error) {
        console.error('Transport function failed:', error);
      }
    }
  }

  /**
   * Log trace message (most verbose)
   * @param {string} message - Log message
   * @param {LogContext} [context] - Contextual information
   */
  trace(message, context) {
    this.log('trace', message, context);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {LogContext} [context] - Contextual information
   */
  debug(message, context) {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {LogContext} [context] - Contextual information
   */
  info(message, context) {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {LogContext} [context] - Contextual information
   */
  warn(message, context) {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error} [error] - Error object
   * @param {LogContext} [context] - Contextual information
   */
  error(message, error, context) {
    this.log('error', message, context, error);
  }

  /**
   * Log fatal error message (highest severity)
   * @param {string} message - Log message
   * @param {Error} [error] - Error object
   * @param {LogContext} [context] - Contextual information
   */
  fatal(message, error, context) {
    this.log('fatal', message, context, error);
  }

  /**
   * Start a performance timer
   * @param {string} name - Timer name
   * @param {LogContext} [context] - Contextual information
   */
  startTimer(name, context = {}) {
    this.performanceMarks.set(name, {
      startTime: performance.now(),
      context,
    });
  }

  /**
   * End a performance timer and log duration
   * @param {string} name - Timer name
   * @param {string} [message] - Optional log message
   */
  endTimer(name, message) {
    const mark = this.performanceMarks.get(name);
    if (!mark) {
      this.warn(`Timer "${name}" not found`);
      return;
    }

    const duration = performance.now() - mark.startTime;
    this.performanceMarks.delete(name);

    this.debug(message || `Timer: ${name}`, {
      ...mark.context,
      duration: Math.round(duration * 100) / 100,
      action: 'performance',
    });

    return duration;
  }

  /**
   * Create a child logger with additional context
   * @param {LogContext} context - Additional context
   * @returns {StructuredLogger}
   */
  child(context) {
    return new StructuredLogger({
      minLevel: LOG_LEVEL_NAMES[this.minLevel],
      enableConsole: this.enableConsole,
      enableStorage: this.enableStorage,
      maxStorageEntries: this.maxStorageEntries,
      transport: this.transport,
      sampleRate: this.sampleRate,
      globalContext: { ...this.globalContext, ...context },
    });
  }

  /**
   * Get recent log entries from buffer
   * @param {number} [count=100] - Number of entries to retrieve
   * @returns {LogEntry[]}
   */
  getRecentLogs(count = 100) {
    return this.buffer.slice(-count);
  }

  /**
   * Query logs from IndexedDB storage
   * @param {Object} options - Query options
   * @param {LogLevel} [options.level] - Filter by level
   * @param {string} [options.component] - Filter by component
   * @param {Date} [options.startTime] - Filter by start time
   * @param {Date} [options.endTime] - Filter by end time
   * @param {number} [options.limit=100] - Maximum entries to return
   * @returns {Promise<LogEntry[]>}
   */
  async queryLogs(options = {}) {
    if (!this.db) {
      throw new Error('Storage not enabled');
    }

    const { level, component, startTime, endTime, limit = 100 } = options;

    try {
      const transaction = this.db.transaction(['logs'], 'readonly');
      const store = transaction.objectStore('logs');
      
      let index = store;
      if (level) {
        index = store.index('level');
      } else if (component) {
        index = store.index('component');
      } else {
        index = store.index('timestamp');
      }

      const results = [];
      const request = index.openCursor(null, 'prev'); // Newest first

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          
          if (!cursor || results.length >= limit) {
            resolve(results);
            return;
          }

          const entry = cursor.value;
          const entryTime = new Date(entry.timestamp);

          // Apply filters
          let matches = true;
          if (level && entry.level !== level) matches = false;
          if (component && entry.context?.component !== component) matches = false;
          if (startTime && entryTime < startTime) matches = false;
          if (endTime && entryTime > endTime) matches = false;

          if (matches) {
            results.push(entry);
          }

          cursor.continue();
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to query logs:', error);
      return [];
    }
  }

  /**
   * Clear all stored logs
   * @returns {Promise<void>}
   */
  async clearLogs() {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Export logs as JSON
   * @param {Object} [options] - Export options (same as queryLogs)
   * @returns {Promise<string>}
   */
  async exportLogs(options = {}) {
    const logs = await this.queryLogs({ ...options, limit: 10000 });
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Set minimum log level
   * @param {LogLevel} level - New minimum level
   */
  setMinLevel(level) {
    if (LOG_LEVELS[level] === undefined) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.minLevel = LOG_LEVELS[level];
  }

  /**
   * Update global context
   * @param {LogContext} context - Context to merge with global context
   */
  setGlobalContext(context) {
    this.globalContext = { ...this.globalContext, ...context };
  }
}

// Create default logger instance
const logger = new StructuredLogger({
  minLevel: 'info',
  enableConsole: true,
  enableStorage: false,
});

export { StructuredLogger, logger, LOG_LEVELS };