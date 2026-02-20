/**
 * @fileoverview PerformanceObserver API for Runtime Metrics
 * @module performance/performance-observer
 * 
 * Provides unified interface for observing various performance entry types
 * including navigation, resource, measure, paint, and long tasks.
 * 
 * Related Documentation: harmony-design/DESIGN_SYSTEM.md#performance-monitoring
 * 
 * Performance Budget Compliance:
 * - Observer overhead: <1ms per entry
 * - Memory: <5MB for buffered entries
 * - No blocking operations on main thread
 */

import { EventBus } from '../core/event-bus.js';

/**
 * @typedef {Object} PerformanceObserverConfig
 * @property {string[]} entryTypes - Types to observe (e.g., 'navigation', 'resource', 'measure')
 * @property {boolean} [buffered=false] - Include buffered entries from before observer creation
 * @property {number} [maxBufferSize=1000] - Maximum entries to keep in memory
 * @property {Function} [filter] - Optional filter function for entries
 */

/**
 * @typedef {Object} ObserverMetrics
 * @property {number} totalEntries - Total entries observed
 * @property {number} droppedEntries - Entries dropped due to buffer overflow
 * @property {number} lastObservedTime - Timestamp of last observation
 * @property {Object<string, number>} entriesByType - Count by entry type
 */

/**
 * Unified Performance Observer for Runtime Metrics
 * 
 * Observes multiple performance entry types and publishes metrics to EventBus.
 * Handles buffering, filtering, and metric aggregation.
 * 
 * @class PerformanceObserverManager
 */
export class PerformanceObserverManager {
  constructor() {
    /** @type {Map<string, PerformanceObserver>} */
    this.observers = new Map();
    
    /** @type {Map<string, PerformanceEntry[]>} */
    this.entryBuffer = new Map();
    
    /** @type {ObserverMetrics} */
    this.metrics = {
      totalEntries: 0,
      droppedEntries: 0,
      lastObservedTime: 0,
      entriesByType: {}
    };
    
    /** @type {Map<string, PerformanceObserverConfig>} */
    this.configs = new Map();
    
    /** @type {boolean} */
    this.isSupported = typeof PerformanceObserver !== 'undefined';
    
    if (!this.isSupported) {
      console.warn('[PerformanceObserver] PerformanceObserver API not supported');
    }
  }

  /**
   * Start observing performance entries
   * 
   * @param {string} observerId - Unique identifier for this observer
   * @param {PerformanceObserverConfig} config - Observer configuration
   * @returns {boolean} Success status
   */
  observe(observerId, config) {
    if (!this.isSupported) {
      console.warn('[PerformanceObserver] Cannot observe - API not supported');
      return false;
    }

    if (this.observers.has(observerId)) {
      console.warn(`[PerformanceObserver] Observer ${observerId} already exists`);
      return false;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        this.handlePerformanceEntries(observerId, list, config);
      });

      // Validate entry types are supported
      const supportedTypes = this.getSupportedEntryTypes();
      const validTypes = config.entryTypes.filter(type => 
        supportedTypes.includes(type)
      );

      if (validTypes.length === 0) {
        console.error('[PerformanceObserver] No valid entry types provided');
        return false;
      }

      if (validTypes.length < config.entryTypes.length) {
        const unsupported = config.entryTypes.filter(t => !validTypes.includes(t));
        console.warn(`[PerformanceObserver] Unsupported entry types: ${unsupported.join(', ')}`);
      }

      observer.observe({
        entryTypes: validTypes,
        buffered: config.buffered || false
      });

      this.observers.set(observerId, observer);
      this.configs.set(observerId, config);
      this.entryBuffer.set(observerId, []);

      console.log(`[PerformanceObserver] Started observing: ${observerId}`, {
        entryTypes: validTypes,
        buffered: config.buffered
      });

      return true;
    } catch (error) {
      console.error(`[PerformanceObserver] Failed to create observer ${observerId}:`, error);
      return false;
    }
  }

  /**
   * Handle incoming performance entries
   * 
   * @private
   * @param {string} observerId - Observer identifier
   * @param {PerformanceObserverEntryList} list - Entry list from observer
   * @param {PerformanceObserverConfig} config - Observer configuration
   */
  handlePerformanceEntries(observerId, list, config) {
    const startTime = performance.now();
    const entries = list.getEntries();
    
    let processedCount = 0;
    let filteredCount = 0;

    for (const entry of entries) {
      // Apply filter if provided
      if (config.filter && !config.filter(entry)) {
        filteredCount++;
        continue;
      }

      // Update metrics
      this.metrics.totalEntries++;
      this.metrics.entriesByType[entry.entryType] = 
        (this.metrics.entriesByType[entry.entryType] || 0) + 1;

      // Add to buffer
      const buffer = this.entryBuffer.get(observerId);
      const maxSize = config.maxBufferSize || 1000;

      if (buffer.length >= maxSize) {
        buffer.shift(); // Remove oldest entry
        this.metrics.droppedEntries++;
      }

      buffer.push(this.serializeEntry(entry));
      processedCount++;

      // Publish individual entry event
      EventBus.publish('performance:entry', {
        observerId,
        entry: this.serializeEntry(entry),
        timestamp: Date.now()
      });
    }

    this.metrics.lastObservedTime = Date.now();

    // Publish batch event
    EventBus.publish('performance:entries-batch', {
      observerId,
      count: processedCount,
      filtered: filteredCount,
      types: [...new Set(entries.map(e => e.entryType))],
      timestamp: Date.now()
    });

    const processingTime = performance.now() - startTime;
    
    // Warn if processing takes too long (>1ms target)
    if (processingTime > 1) {
      console.warn(`[PerformanceObserver] Slow entry processing: ${processingTime.toFixed(2)}ms for ${entries.length} entries`);
    }
  }

  /**
   * Serialize performance entry to plain object
   * 
   * @private
   * @param {PerformanceEntry} entry - Performance entry
   * @returns {Object} Serialized entry
   */
  serializeEntry(entry) {
    const base = {
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration
    };

    // Add type-specific properties
    switch (entry.entryType) {
      case 'navigation':
        return {
          ...base,
          domComplete: entry.domComplete,
          domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
          domInteractive: entry.domInteractive,
          loadEventEnd: entry.loadEventEnd,
          redirectCount: entry.redirectCount,
          type: entry.type,
          transferSize: entry.transferSize
        };

      case 'resource':
        return {
          ...base,
          initiatorType: entry.initiatorType,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          nextHopProtocol: entry.nextHopProtocol,
          renderBlockingStatus: entry.renderBlockingStatus
        };

      case 'measure':
      case 'mark':
        return {
          ...base,
          detail: entry.detail
        };

      case 'paint':
        return {
          ...base,
          // Paint entries have minimal properties
        };

      case 'longtask':
        return {
          ...base,
          attribution: entry.attribution?.map(attr => ({
            name: attr.name,
            entryType: attr.entryType,
            startTime: attr.startTime,
            duration: attr.duration,
            containerType: attr.containerType,
            containerId: attr.containerId,
            containerName: attr.containerName,
            containerSrc: attr.containerSrc
          }))
        };

      case 'layout-shift':
        return {
          ...base,
          value: entry.value,
          hadRecentInput: entry.hadRecentInput,
          lastInputTime: entry.lastInputTime
        };

      case 'largest-contentful-paint':
        return {
          ...base,
          renderTime: entry.renderTime,
          loadTime: entry.loadTime,
          size: entry.size,
          id: entry.id,
          url: entry.url,
          element: entry.element?.tagName
        };

      case 'first-input':
        return {
          ...base,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
          cancelable: entry.cancelable
        };

      default:
        return base;
    }
  }

  /**
   * Stop observing performance entries
   * 
   * @param {string} observerId - Observer identifier
   * @returns {boolean} Success status
   */
  disconnect(observerId) {
    const observer = this.observers.get(observerId);
    
    if (!observer) {
      console.warn(`[PerformanceObserver] Observer ${observerId} not found`);
      return false;
    }

    observer.disconnect();
    this.observers.delete(observerId);
    this.configs.delete(observerId);

    console.log(`[PerformanceObserver] Disconnected observer: ${observerId}`);
    return true;
  }

  /**
   * Disconnect all observers
   */
  disconnectAll() {
    for (const [observerId, observer] of this.observers) {
      observer.disconnect();
      console.log(`[PerformanceObserver] Disconnected observer: ${observerId}`);
    }

    this.observers.clear();
    this.configs.clear();
    
    console.log('[PerformanceObserver] All observers disconnected');
  }

  /**
   * Get buffered entries for an observer
   * 
   * @param {string} observerId - Observer identifier
   * @param {Object} [options] - Query options
   * @param {string} [options.entryType] - Filter by entry type
   * @param {number} [options.limit] - Maximum entries to return
   * @param {number} [options.since] - Only entries after this timestamp
   * @returns {PerformanceEntry[]} Buffered entries
   */
  getEntries(observerId, options = {}) {
    const buffer = this.entryBuffer.get(observerId);
    
    if (!buffer) {
      console.warn(`[PerformanceObserver] No buffer found for ${observerId}`);
      return [];
    }

    let entries = [...buffer];

    // Apply filters
    if (options.entryType) {
      entries = entries.filter(e => e.entryType === options.entryType);
    }

    if (options.since) {
      entries = entries.filter(e => e.startTime >= options.since);
    }

    // Apply limit
    if (options.limit) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  }

  /**
   * Clear buffered entries for an observer
   * 
   * @param {string} observerId - Observer identifier
   */
  clearBuffer(observerId) {
    const buffer = this.entryBuffer.get(observerId);
    
    if (buffer) {
      const count = buffer.length;
      buffer.length = 0;
      console.log(`[PerformanceObserver] Cleared ${count} entries from ${observerId}`);
    }
  }

  /**
   * Get current observer metrics
   * 
   * @returns {ObserverMetrics} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeObservers: this.observers.size,
      bufferSizes: Array.from(this.entryBuffer.entries()).reduce((acc, [id, buffer]) => {
        acc[id] = buffer.length;
        return acc;
      }, {})
    };
  }

  /**
   * Get supported entry types for this browser
   * 
   * @returns {string[]} Supported entry types
   */
  getSupportedEntryTypes() {
    if (!this.isSupported) {
      return [];
    }

    try {
      return PerformanceObserver.supportedEntryTypes || [];
    } catch (error) {
      console.error('[PerformanceObserver] Failed to get supported types:', error);
      return [];
    }
  }

  /**
   * Create a filtered observer for specific resource types
   * 
   * @param {string} observerId - Observer identifier
   * @param {string[]} resourceTypes - Resource types to observe (e.g., 'script', 'stylesheet')
   * @param {Object} [options] - Additional options
   * @returns {boolean} Success status
   */
  observeResources(observerId, resourceTypes, options = {}) {
    return this.observe(observerId, {
      entryTypes: ['resource'],
      buffered: options.buffered || false,
      maxBufferSize: options.maxBufferSize || 1000,
      filter: (entry) => {
        return resourceTypes.includes(entry.initiatorType);
      }
    });
  }

  /**
   * Create observer for long tasks (>50ms)
   * 
   * @param {string} observerId - Observer identifier
   * @param {Object} [options] - Additional options
   * @returns {boolean} Success status
   */
  observeLongTasks(observerId, options = {}) {
    return this.observe(observerId, {
      entryTypes: ['longtask'],
      buffered: options.buffered || false,
      maxBufferSize: options.maxBufferSize || 500
    });
  }

  /**
   * Create observer for user timing marks and measures
   * 
   * @param {string} observerId - Observer identifier
   * @param {Object} [options] - Additional options
   * @returns {boolean} Success status
   */
  observeUserTiming(observerId, options = {}) {
    return this.observe(observerId, {
      entryTypes: ['mark', 'measure'],
      buffered: options.buffered || false,
      maxBufferSize: options.maxBufferSize || 1000
    });
  }

  /**
   * Get memory usage estimate
   * 
   * @returns {number} Estimated memory usage in bytes
   */
  getMemoryUsage() {
    let totalSize = 0;

    for (const buffer of this.entryBuffer.values()) {
      // Rough estimate: ~500 bytes per entry
      totalSize += buffer.length * 500;
    }

    return totalSize;
  }

  /**
   * Export all buffered entries as JSON
   * 
   * @returns {Object} All entries by observer ID
   */
  exportEntries() {
    const exported = {};

    for (const [observerId, buffer] of this.entryBuffer) {
      exported[observerId] = buffer;
    }

    return {
      metrics: this.getMetrics(),
      entries: exported,
      exportedAt: Date.now()
    };
  }
}

// Singleton instance
export const performanceObserver = new PerformanceObserverManager();

// Auto-initialize common observers if supported
if (performanceObserver.isSupported) {
  // Observe navigation timing
  performanceObserver.observe('navigation', {
    entryTypes: ['navigation'],
    buffered: true,
    maxBufferSize: 10
  });

  // Observe paint timing
  performanceObserver.observe('paint', {
    entryTypes: ['paint'],
    buffered: true,
    maxBufferSize: 10
  });

  // Observe user timing
  performanceObserver.observe('user-timing', {
    entryTypes: ['mark', 'measure'],
    buffered: true,
    maxBufferSize: 1000
  });

  console.log('[PerformanceObserver] Auto-initialized observers:', {
    supported: performanceObserver.getSupportedEntryTypes()
  });
}