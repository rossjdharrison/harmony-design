/**
 * @fileoverview Audit Logger - Logs security-relevant events for compliance
 * 
 * Captures and persists security events including:
 * - Authentication attempts (success/failure)
 * - Authorization decisions
 * - Data access (PII, sensitive data)
 * - Security policy violations
 * - Configuration changes
 * - Code execution events
 * 
 * Designed for compliance with SOC2, GDPR, HIPAA audit requirements.
 * 
 * Related: DESIGN_SYSTEM.md § Security Architecture
 * 
 * @module security/audit-logger
 */

/**
 * Severity levels for audit events
 * @enum {string}
 */
export const AuditSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Categories of security events
 * @enum {string}
 */
export const AuditCategory = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATA_ACCESS: 'data_access',
  POLICY_VIOLATION: 'policy_violation',
  CONFIGURATION: 'configuration',
  CODE_EXECUTION: 'code_execution',
  XSS_PREVENTION: 'xss_prevention',
  SANDBOX_VIOLATION: 'sandbox_violation',
  RESOURCE_LIMIT: 'resource_limit'
};

/**
 * Audit event structure
 * @typedef {Object} AuditEvent
 * @property {string} id - Unique event identifier
 * @property {number} timestamp - ISO 8601 timestamp
 * @property {AuditSeverity} severity - Event severity
 * @property {AuditCategory} category - Event category
 * @property {string} action - Specific action taken
 * @property {string} [userId] - User identifier (if applicable)
 * @property {string} [sessionId] - Session identifier
 * @property {string} [resourceId] - Resource identifier
 * @property {Object} [details] - Additional event details
 * @property {boolean} success - Whether action succeeded
 * @property {string} [errorMessage] - Error message if failed
 * @property {string} [ipAddress] - Source IP address
 * @property {string} [userAgent] - User agent string
 */

/**
 * Audit log storage interface
 * @interface AuditStorage
 */
class AuditStorage {
  /**
   * Store an audit event
   * @param {AuditEvent} event - Event to store
   * @returns {Promise<void>}
   */
  async store(event) {
    throw new Error('AuditStorage.store must be implemented');
  }

  /**
   * Query audit events
   * @param {Object} filters - Query filters
   * @returns {Promise<AuditEvent[]>}
   */
  async query(filters) {
    throw new Error('AuditStorage.query must be implemented');
  }

  /**
   * Clear old audit events (for retention policy)
   * @param {number} olderThanMs - Clear events older than this
   * @returns {Promise<number>} Number of events cleared
   */
  async clearOld(olderThanMs) {
    throw new Error('AuditStorage.clearOld must be implemented');
  }
}

/**
 * In-memory audit storage (for development/testing)
 */
export class MemoryAuditStorage extends AuditStorage {
  constructor() {
    super();
    this.events = [];
    this.maxEvents = 10000; // Prevent memory overflow
  }

  async store(event) {
    this.events.push(event);
    
    // Rotate if exceeding max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  async query(filters = {}) {
    let results = [...this.events];

    if (filters.category) {
      results = results.filter(e => e.category === filters.category);
    }

    if (filters.severity) {
      results = results.filter(e => e.severity === filters.severity);
    }

    if (filters.userId) {
      results = results.filter(e => e.userId === filters.userId);
    }

    if (filters.startTime) {
      results = results.filter(e => e.timestamp >= filters.startTime);
    }

    if (filters.endTime) {
      results = results.filter(e => e.timestamp <= filters.endTime);
    }

    if (filters.success !== undefined) {
      results = results.filter(e => e.success === filters.success);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async clearOld(olderThanMs) {
    const cutoff = Date.now() - olderThanMs;
    const originalLength = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
    return originalLength - this.events.length;
  }
}

/**
 * IndexedDB audit storage (for production)
 */
export class IndexedDBAuditStorage extends AuditStorage {
  constructor(dbName = 'harmony-audit-logs', storeName = 'events') {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   * @returns {Promise<void>}
   */
  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('severity', 'severity', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('success', 'success', { unique: false });
        }
      };
    });
  }

  async store(event) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(event);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async query(filters = {}) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      let request;
      
      // Use index if available
      if (filters.category) {
        const index = store.index('category');
        request = index.getAll(filters.category);
      } else if (filters.severity) {
        const index = store.index('severity');
        request = index.getAll(filters.severity);
      } else if (filters.userId) {
        const index = store.index('userId');
        request = index.getAll(filters.userId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result;

        // Apply additional filters
        if (filters.startTime) {
          results = results.filter(e => e.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
          results = results.filter(e => e.timestamp <= filters.endTime);
        }
        if (filters.success !== undefined) {
          results = results.filter(e => e.success === filters.success);
        }

        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp);

        if (filters.limit) {
          results = results.slice(0, filters.limit);
        }

        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearOld(olderThanMs) {
    await this.init();

    const cutoff = Date.now() - olderThanMs;
    let count = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        } else {
          resolve(count);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Main audit logger class
 */
export class AuditLogger {
  /**
   * @param {AuditStorage} storage - Storage backend
   * @param {Object} options - Configuration options
   */
  constructor(storage = new MemoryAuditStorage(), options = {}) {
    this.storage = storage;
    this.options = {
      enableConsoleLog: options.enableConsoleLog ?? true,
      retentionDays: options.retentionDays ?? 90,
      autoCleanup: options.autoCleanup ?? true,
      cleanupIntervalMs: options.cleanupIntervalMs ?? 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };

    this.cleanupTimer = null;

    if (this.options.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Generate unique event ID
   * @returns {string}
   */
  generateEventId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log an audit event
   * @param {Object} eventData - Event data
   * @returns {Promise<AuditEvent>} The logged event
   */
  async log(eventData) {
    const event = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      severity: eventData.severity || AuditSeverity.INFO,
      category: eventData.category,
      action: eventData.action,
      userId: eventData.userId,
      sessionId: eventData.sessionId,
      resourceId: eventData.resourceId,
      details: eventData.details,
      success: eventData.success ?? true,
      errorMessage: eventData.errorMessage,
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined)
    };

    // Validate required fields
    if (!event.category || !event.action) {
      throw new Error('Audit event must have category and action');
    }

    try {
      await this.storage.store(event);

      if (this.options.enableConsoleLog) {
        this.logToConsole(event);
      }

      return event;
    } catch (error) {
      console.error('[AuditLogger] Failed to store audit event:', error, event);
      throw error;
    }
  }

  /**
   * Log to console with appropriate formatting
   * @param {AuditEvent} event - Event to log
   */
  logToConsole(event) {
    const prefix = `[AUDIT][${event.severity.toUpperCase()}][${event.category}]`;
    const message = `${event.action} ${event.success ? '✓' : '✗'}`;
    const details = event.details ? JSON.stringify(event.details) : '';

    const logMethod = {
      [AuditSeverity.INFO]: 'log',
      [AuditSeverity.WARNING]: 'warn',
      [AuditSeverity.ERROR]: 'error',
      [AuditSeverity.CRITICAL]: 'error'
    }[event.severity] || 'log';

    console[logMethod](prefix, message, details, event);
  }

  /**
   * Query audit events
   * @param {Object} filters - Query filters
   * @returns {Promise<AuditEvent[]>}
   */
  async query(filters) {
    return this.storage.query(filters);
  }

  /**
   * Start automatic cleanup of old events
   */
  startAutoCleanup() {
    if (this.cleanupTimer) return;

    const cleanup = async () => {
      try {
        const retentionMs = this.options.retentionDays * 24 * 60 * 60 * 1000;
        const deleted = await this.storage.clearOld(retentionMs);
        
        if (deleted > 0) {
          console.log(`[AuditLogger] Cleaned up ${deleted} old audit events`);
        }
      } catch (error) {
        console.error('[AuditLogger] Cleanup failed:', error);
      }
    };

    // Run cleanup immediately and then on interval
    cleanup();
    this.cleanupTimer = setInterval(cleanup, this.options.cleanupIntervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Convenience methods for common security events
   */

  /**
   * Log authentication attempt
   * @param {Object} data - Authentication data
   */
  async logAuthentication(data) {
    return this.log({
      category: AuditCategory.AUTHENTICATION,
      action: data.action || 'login',
      severity: data.success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId: data.userId,
      success: data.success,
      errorMessage: data.errorMessage,
      details: data.details
    });
  }

  /**
   * Log authorization decision
   * @param {Object} data - Authorization data
   */
  async logAuthorization(data) {
    return this.log({
      category: AuditCategory.AUTHORIZATION,
      action: data.action || 'access_check',
      severity: data.success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId: data.userId,
      resourceId: data.resourceId,
      success: data.success,
      details: data.details
    });
  }

  /**
   * Log data access (especially PII/sensitive data)
   * @param {Object} data - Data access information
   */
  async logDataAccess(data) {
    return this.log({
      category: AuditCategory.DATA_ACCESS,
      action: data.action || 'read',
      severity: AuditSeverity.INFO,
      userId: data.userId,
      resourceId: data.resourceId,
      success: true,
      details: data.details
    });
  }

  /**
   * Log security policy violation
   * @param {Object} data - Violation data
   */
  async logPolicyViolation(data) {
    return this.log({
      category: AuditCategory.POLICY_VIOLATION,
      action: data.action,
      severity: data.severity || AuditSeverity.ERROR,
      userId: data.userId,
      success: false,
      errorMessage: data.errorMessage,
      details: data.details
    });
  }

  /**
   * Log configuration change
   * @param {Object} data - Configuration change data
   */
  async logConfigurationChange(data) {
    return this.log({
      category: AuditCategory.CONFIGURATION,
      action: data.action || 'update',
      severity: AuditSeverity.WARNING,
      userId: data.userId,
      resourceId: data.resourceId,
      success: true,
      details: data.details
    });
  }

  /**
   * Log code execution event
   * @param {Object} data - Code execution data
   */
  async logCodeExecution(data) {
    return this.log({
      category: AuditCategory.CODE_EXECUTION,
      action: data.action || 'execute',
      severity: data.success ? AuditSeverity.INFO : AuditSeverity.ERROR,
      userId: data.userId,
      success: data.success,
      errorMessage: data.errorMessage,
      details: data.details
    });
  }

  /**
   * Log XSS prevention event
   * @param {Object} data - XSS prevention data
   */
  async logXSSPrevention(data) {
    return this.log({
      category: AuditCategory.XSS_PREVENTION,
      action: data.action || 'filter',
      severity: AuditSeverity.WARNING,
      userId: data.userId,
      success: true,
      details: data.details
    });
  }

  /**
   * Log sandbox violation
   * @param {Object} data - Sandbox violation data
   */
  async logSandboxViolation(data) {
    return this.log({
      category: AuditCategory.SANDBOX_VIOLATION,
      action: data.action,
      severity: AuditSeverity.CRITICAL,
      userId: data.userId,
      success: false,
      errorMessage: data.errorMessage,
      details: data.details
    });
  }

  /**
   * Log resource limit event
   * @param {Object} data - Resource limit data
   */
  async logResourceLimit(data) {
    return this.log({
      category: AuditCategory.RESOURCE_LIMIT,
      action: data.action,
      severity: data.severity || AuditSeverity.WARNING,
      userId: data.userId,
      success: data.success,
      errorMessage: data.errorMessage,
      details: data.details
    });
  }
}

/**
 * Global audit logger instance
 * @type {AuditLogger|null}
 */
let globalAuditLogger = null;

/**
 * Get or create global audit logger instance
 * @param {Object} [options] - Configuration options
 * @returns {AuditLogger}
 */
export function getAuditLogger(options = {}) {
  if (!globalAuditLogger) {
    const storage = typeof indexedDB !== 'undefined' 
      ? new IndexedDBAuditStorage()
      : new MemoryAuditStorage();
    
    globalAuditLogger = new AuditLogger(storage, options);
  }
  return globalAuditLogger;
}

/**
 * Set global audit logger instance
 * @param {AuditLogger} logger - Logger instance
 */
export function setAuditLogger(logger) {
  if (globalAuditLogger) {
    globalAuditLogger.stopAutoCleanup();
  }
  globalAuditLogger = logger;
}