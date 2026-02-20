/**
 * @fileoverview Error Fingerprinting System
 * Groups similar errors for deduplication and aggregation.
 * 
 * Architecture:
 * - Generates stable fingerprints from error characteristics
 * - Groups errors by fingerprint for deduplication
 * - Tracks occurrence counts and metadata
 * - Integrates with structured logger
 * 
 * Performance:
 * - O(1) fingerprint generation
 * - O(1) group lookup
 * - Memory budget: <5MB for 10k unique errors
 * 
 * @module security/error-fingerprinting
 */

/**
 * @typedef {Object} ErrorFingerprint
 * @property {string} id - Unique fingerprint identifier
 * @property {string} message - Normalized error message
 * @property {string} type - Error type/class
 * @property {string} stackHash - Hash of stack trace structure
 * @property {string} location - Primary error location
 */

/**
 * @typedef {Object} ErrorGroup
 * @property {ErrorFingerprint} fingerprint - Group fingerprint
 * @property {number} count - Number of occurrences
 * @property {number} firstSeen - Timestamp of first occurrence
 * @property {number} lastSeen - Timestamp of last occurrence
 * @property {Array<Object>} samples - Sample error instances (max 5)
 * @property {Map<string, number>} contexts - Occurrence count by context
 * @property {Map<string, number>} users - Occurrence count by user (if available)
 */

/**
 * Error Fingerprinting System
 * Groups similar errors for deduplication and analysis
 */
class ErrorFingerprintingSystem {
  constructor() {
    /** @type {Map<string, ErrorGroup>} */
    this.errorGroups = new Map();
    
    /** @type {number} */
    this.maxSamplesPerGroup = 5;
    
    /** @type {number} */
    this.maxGroups = 10000;
    
    /** @type {number} */
    this.cleanupThreshold = 11000;
    
    /** @type {Set<Function>} */
    this.listeners = new Set();
    
    this.initialized = true;
  }

  /**
   * Generate fingerprint for an error
   * @param {Error|Object} error - Error to fingerprint
   * @param {Object} [context={}] - Additional context
   * @returns {ErrorFingerprint}
   */
  generateFingerprint(error, context = {}) {
    const type = error.name || error.constructor?.name || 'Error';
    const message = this._normalizeMessage(error.message || String(error));
    const stackHash = this._hashStack(error.stack);
    const location = this._extractLocation(error.stack);
    
    // Generate stable ID from components
    const id = this._generateId(type, message, stackHash, location);
    
    return {
      id,
      type,
      message,
      stackHash,
      location
    };
  }

  /**
   * Record an error occurrence
   * @param {Error|Object} error - Error to record
   * @param {Object} [context={}] - Additional context
   * @returns {ErrorGroup} The error group
   */
  recordError(error, context = {}) {
    const fingerprint = this.generateFingerprint(error, context);
    const now = Date.now();
    
    let group = this.errorGroups.get(fingerprint.id);
    
    if (!group) {
      // Create new group
      group = {
        fingerprint,
        count: 0,
        firstSeen: now,
        lastSeen: now,
        samples: [],
        contexts: new Map(),
        users: new Map()
      };
      this.errorGroups.set(fingerprint.id, group);
      
      // Check if cleanup needed
      if (this.errorGroups.size > this.cleanupThreshold) {
        this._cleanup();
      }
    }
    
    // Update group
    group.count++;
    group.lastSeen = now;
    
    // Add sample if space available
    if (group.samples.length < this.maxSamplesPerGroup) {
      group.samples.push({
        error: this._serializeError(error),
        context,
        timestamp: now
      });
    }
    
    // Track context
    const contextKey = context.component || context.module || 'unknown';
    group.contexts.set(contextKey, (group.contexts.get(contextKey) || 0) + 1);
    
    // Track user if available
    if (context.userId) {
      group.users.set(context.userId, (group.users.get(context.userId) || 0) + 1);
    }
    
    // Notify listeners
    this._notifyListeners('error-recorded', { fingerprint, group });
    
    return group;
  }

  /**
   * Get error group by fingerprint ID
   * @param {string} fingerprintId - Fingerprint ID
   * @returns {ErrorGroup|null}
   */
  getGroup(fingerprintId) {
    return this.errorGroups.get(fingerprintId) || null;
  }

  /**
   * Get all error groups
   * @param {Object} [options={}] - Filter options
   * @returns {Array<ErrorGroup>}
   */
  getGroups(options = {}) {
    let groups = Array.from(this.errorGroups.values());
    
    // Filter by type
    if (options.type) {
      groups = groups.filter(g => g.fingerprint.type === options.type);
    }
    
    // Filter by minimum count
    if (options.minCount) {
      groups = groups.filter(g => g.count >= options.minCount);
    }
    
    // Filter by time range
    if (options.since) {
      groups = groups.filter(g => g.lastSeen >= options.since);
    }
    
    // Sort
    if (options.sortBy === 'count') {
      groups.sort((a, b) => b.count - a.count);
    } else if (options.sortBy === 'recent') {
      groups.sort((a, b) => b.lastSeen - a.lastSeen);
    }
    
    // Limit
    if (options.limit) {
      groups = groups.slice(0, options.limit);
    }
    
    return groups;
  }

  /**
   * Get summary statistics
   * @returns {Object}
   */
  getSummary() {
    const groups = Array.from(this.errorGroups.values());
    const totalErrors = groups.reduce((sum, g) => sum + g.count, 0);
    const uniqueErrors = groups.length;
    
    // Top error types
    const typeMap = new Map();
    groups.forEach(g => {
      typeMap.set(g.fingerprint.type, (typeMap.get(g.fingerprint.type) || 0) + g.count);
    });
    const topTypes = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
    
    // Top errors
    const topErrors = groups
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(g => ({
        id: g.fingerprint.id,
        type: g.fingerprint.type,
        message: g.fingerprint.message,
        count: g.count,
        lastSeen: g.lastSeen
      }));
    
    return {
      totalErrors,
      uniqueErrors,
      deduplicationRatio: uniqueErrors > 0 ? totalErrors / uniqueErrors : 0,
      topTypes,
      topErrors,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  /**
   * Clear error groups
   * @param {Object} [options={}] - Clear options
   */
  clear(options = {}) {
    if (options.olderThan) {
      // Clear old groups
      for (const [id, group] of this.errorGroups.entries()) {
        if (group.lastSeen < options.olderThan) {
          this.errorGroups.delete(id);
        }
      }
    } else if (options.type) {
      // Clear by type
      for (const [id, group] of this.errorGroups.entries()) {
        if (group.fingerprint.type === options.type) {
          this.errorGroups.delete(id);
        }
      }
    } else {
      // Clear all
      this.errorGroups.clear();
    }
    
    this._notifyListeners('groups-cleared', { options });
  }

  /**
   * Subscribe to fingerprinting events
   * @param {Function} callback - Event callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Normalize error message for fingerprinting
   * @private
   * @param {string} message - Raw error message
   * @returns {string}
   */
  _normalizeMessage(message) {
    if (!message) return '';
    
    // Remove dynamic values (numbers, UUIDs, timestamps, URLs)
    return message
      .replace(/\b\d+\b/g, '<num>')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>')
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\b/g, '<timestamp>')
      .replace(/https?:\/\/[^\s]+/g, '<url>')
      .replace(/file:\/\/[^\s]+/g, '<file>')
      .replace(/\bat line \d+/g, 'at line <num>')
      .replace(/\bcolumn \d+/g, 'column <num>')
      .trim();
  }

  /**
   * Hash stack trace structure
   * @private
   * @param {string} [stack] - Stack trace
   * @returns {string}
   */
  _hashStack(stack) {
    if (!stack) return '';
    
    // Extract function names and file paths (without line numbers)
    const frames = stack
      .split('\n')
      .slice(0, 10) // Top 10 frames
      .map(line => {
        // Extract function name and file
        const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?)(?::\d+:\d+\)?)$/);
        if (match) {
          const func = match[1] || 'anonymous';
          const file = match[2]?.replace(/:\d+:\d+$/, '') || '';
          return `${func}@${file}`;
        }
        return line.trim();
      })
      .filter(Boolean)
      .join('|');
    
    // Simple hash
    return this._simpleHash(frames);
  }

  /**
   * Extract primary error location
   * @private
   * @param {string} [stack] - Stack trace
   * @returns {string}
   */
  _extractLocation(stack) {
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    for (const line of lines) {
      const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)/);
      if (match) {
        const func = match[1] || 'anonymous';
        const file = match[2]?.split('/').pop() || '';
        return `${file}:${func}`;
      }
    }
    
    return 'unknown';
  }

  /**
   * Generate stable fingerprint ID
   * @private
   * @param {string} type - Error type
   * @param {string} message - Normalized message
   * @param {string} stackHash - Stack hash
   * @param {string} location - Error location
   * @returns {string}
   */
  _generateId(type, message, stackHash, location) {
    const combined = `${type}:${message}:${stackHash}:${location}`;
    return this._simpleHash(combined);
  }

  /**
   * Simple string hash function
   * @private
   * @param {string} str - String to hash
   * @returns {string}
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Serialize error for storage
   * @private
   * @param {Error|Object} error - Error to serialize
   * @returns {Object}
   */
  _serializeError(error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'), // Truncate stack
      code: error.code,
      ...Object.getOwnPropertyNames(error).reduce((acc, key) => {
        if (!['name', 'message', 'stack'].includes(key)) {
          acc[key] = error[key];
        }
        return acc;
      }, {})
    };
  }

  /**
   * Cleanup old error groups
   * @private
   */
  _cleanup() {
    const groups = Array.from(this.errorGroups.entries());
    
    // Sort by last seen (oldest first)
    groups.sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    
    // Remove oldest groups to get back to max
    const toRemove = groups.length - this.maxGroups;
    for (let i = 0; i < toRemove; i++) {
      this.errorGroups.delete(groups[i][0]);
    }
    
    this._notifyListeners('cleanup', { removed: toRemove });
  }

  /**
   * Estimate memory usage
   * @private
   * @returns {number} Estimated bytes
   */
  _estimateMemoryUsage() {
    // Rough estimate: 1KB per group + samples
    return this.errorGroups.size * 1024;
  }

  /**
   * Notify event listeners
   * @private
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in fingerprinting listener:', error);
      }
    });
  }
}

// Global instance
const errorFingerprinting = new ErrorFingerprintingSystem();

// Auto-integrate with window.onerror if available
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (error) {
      errorFingerprinting.recordError(error, {
        source,
        lineno,
        colno
      });
    }
    
    if (originalOnError) {
      return originalOnError.apply(this, arguments);
    }
  };
}

export { ErrorFingerprintingSystem, errorFingerprinting };