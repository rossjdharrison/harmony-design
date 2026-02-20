/**
 * @fileoverview Memory Leak Detection System
 * Monitors memory usage in long-running scenarios and detects potential leaks.
 * 
 * Related: DESIGN_SYSTEM.md § Testing Infrastructure § Memory Leak Detection
 * @module tests/memory/leak-detector
 */

/**
 * Memory snapshot for leak comparison
 * @typedef {Object} MemorySnapshot
 * @property {number} timestamp - When snapshot was taken
 * @property {number} usedJSHeapSize - Used JS heap size in bytes
 * @property {number} totalJSHeapSize - Total JS heap size in bytes
 * @property {number} jsHeapSizeLimit - JS heap size limit in bytes
 * @property {number} domNodes - Number of DOM nodes
 * @property {number} eventListeners - Number of event listeners
 * @property {Map<string, number>} objectCounts - Count of tracked objects by type
 */

/**
 * Leak detection result
 * @typedef {Object} LeakDetectionResult
 * @property {boolean} hasLeak - Whether a leak was detected
 * @property {string} severity - 'none' | 'minor' | 'moderate' | 'severe'
 * @property {Array<LeakIndicator>} indicators - Specific leak indicators found
 * @property {MemorySnapshot} initialSnapshot - Initial memory state
 * @property {MemorySnapshot} finalSnapshot - Final memory state
 * @property {number} duration - Test duration in milliseconds
 * @property {Object} metrics - Calculated metrics
 */

/**
 * Specific leak indicator
 * @typedef {Object} LeakIndicator
 * @property {string} type - Type of leak indicator
 * @property {string} description - Human-readable description
 * @property {number} value - Measured value
 * @property {number} threshold - Threshold that was exceeded
 * @property {string} severity - 'minor' | 'moderate' | 'severe'
 */

export class MemoryLeakDetector {
  constructor() {
    /** @type {Array<MemorySnapshot>} */
    this.snapshots = [];
    
    /** @type {Map<string, WeakRef>} */
    this.trackedObjects = new Map();
    
    /** @type {number} */
    this.snapshotInterval = 1000; // 1 second
    
    /** @type {number|null} */
    this.monitoringInterval = null;
    
    /** @type {PerformanceObserver|null} */
    this.performanceObserver = null;
    
    this.thresholds = {
      memoryGrowthRate: 1024 * 1024, // 1MB per second
      domNodeGrowth: 100, // nodes per second
      eventListenerGrowth: 50, // listeners per second
      gcFailureRate: 0.3, // 30% of memory not reclaimed after GC
    };
  }

  /**
   * Captures current memory snapshot
   * @returns {MemorySnapshot}
   */
  captureSnapshot() {
    const memory = performance.memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };

    const domNodes = document.querySelectorAll('*').length;
    const eventListeners = this._countEventListeners();
    const objectCounts = this._countTrackedObjects();

    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      domNodes,
      eventListeners,
      objectCounts,
    };
  }

  /**
   * Counts event listeners in the document
   * @private
   * @returns {number}
   */
  _countEventListeners() {
    // Approximation: count elements with common event attributes
    let count = 0;
    const elements = document.querySelectorAll('*');
    
    elements.forEach(el => {
      // Check for inline event handlers
      const attrs = el.attributes;
      for (let i = 0; i < attrs.length; i++) {
        if (attrs[i].name.startsWith('on')) {
          count++;
        }
      }
    });

    return count;
  }

  /**
   * Counts tracked objects that are still alive
   * @private
   * @returns {Map<string, number>}
   */
  _countTrackedObjects() {
    const counts = new Map();
    
    for (const [type, weakRef] of this.trackedObjects.entries()) {
      const obj = weakRef.deref();
      if (obj) {
        counts.set(type, (counts.get(type) || 0) + 1);
      }
    }

    return counts;
  }

  /**
   * Tracks an object for leak detection
   * @param {string} type - Object type identifier
   * @param {Object} object - Object to track
   */
  trackObject(type, object) {
    const id = `${type}_${Date.now()}_${Math.random()}`;
    this.trackedObjects.set(id, new WeakRef(object));
  }

  /**
   * Starts monitoring memory usage
   * @param {number} [interval=1000] - Snapshot interval in milliseconds
   */
  startMonitoring(interval = 1000) {
    this.snapshotInterval = interval;
    this.snapshots = [];
    
    // Capture initial snapshot
    this.snapshots.push(this.captureSnapshot());

    // Start periodic snapshots
    this.monitoringInterval = setInterval(() => {
      this.snapshots.push(this.captureSnapshot());
    }, interval);

    // Monitor long tasks that might indicate memory pressure
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
      
      try {
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // longtask not supported in all browsers
        console.warn('Long task monitoring not supported');
      }
    }
  }

  /**
   * Stops monitoring and returns leak detection results
   * @returns {LeakDetectionResult}
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    // Capture final snapshot
    this.snapshots.push(this.captureSnapshot());

    return this.analyzeLeaks();
  }

  /**
   * Analyzes snapshots for memory leaks
   * @returns {LeakDetectionResult}
   */
  analyzeLeaks() {
    if (this.snapshots.length < 2) {
      return {
        hasLeak: false,
        severity: 'none',
        indicators: [],
        initialSnapshot: this.snapshots[0],
        finalSnapshot: this.snapshots[0],
        duration: 0,
        metrics: {},
      };
    }

    const initialSnapshot = this.snapshots[0];
    const finalSnapshot = this.snapshots[this.snapshots.length - 1];
    const duration = finalSnapshot.timestamp - initialSnapshot.timestamp;
    const durationSeconds = duration / 1000;

    const indicators = [];

    // Check memory growth rate
    const memoryGrowth = finalSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize;
    const memoryGrowthRate = memoryGrowth / durationSeconds;

    if (memoryGrowthRate > this.thresholds.memoryGrowthRate) {
      indicators.push({
        type: 'memory_growth',
        description: `Memory growing at ${(memoryGrowthRate / 1024 / 1024).toFixed(2)} MB/s`,
        value: memoryGrowthRate,
        threshold: this.thresholds.memoryGrowthRate,
        severity: this._calculateSeverity(memoryGrowthRate, this.thresholds.memoryGrowthRate),
      });
    }

    // Check DOM node growth
    const domGrowth = finalSnapshot.domNodes - initialSnapshot.domNodes;
    const domGrowthRate = domGrowth / durationSeconds;

    if (domGrowthRate > this.thresholds.domNodeGrowth) {
      indicators.push({
        type: 'dom_growth',
        description: `DOM nodes growing at ${domGrowthRate.toFixed(2)} nodes/s`,
        value: domGrowthRate,
        threshold: this.thresholds.domNodeGrowth,
        severity: this._calculateSeverity(domGrowthRate, this.thresholds.domNodeGrowth),
      });
    }

    // Check event listener growth
    const listenerGrowth = finalSnapshot.eventListeners - initialSnapshot.eventListeners;
    const listenerGrowthRate = listenerGrowth / durationSeconds;

    if (listenerGrowthRate > this.thresholds.eventListenerGrowth) {
      indicators.push({
        type: 'listener_growth',
        description: `Event listeners growing at ${listenerGrowthRate.toFixed(2)} listeners/s`,
        value: listenerGrowthRate,
        threshold: this.thresholds.eventListenerGrowth,
        severity: this._calculateSeverity(listenerGrowthRate, this.thresholds.eventListenerGrowth),
      });
    }

    // Check for monotonic growth (never decreasing)
    const hasMonotonicGrowth = this._checkMonotonicGrowth();
    if (hasMonotonicGrowth) {
      indicators.push({
        type: 'monotonic_growth',
        description: 'Memory never decreases (GC may not be working)',
        value: 1,
        threshold: 0,
        severity: 'severe',
      });
    }

    // Calculate overall severity
    const maxSeverity = this._getMaxSeverity(indicators);

    return {
      hasLeak: indicators.length > 0,
      severity: maxSeverity,
      indicators,
      initialSnapshot,
      finalSnapshot,
      duration,
      metrics: {
        memoryGrowth,
        memoryGrowthRate,
        domGrowth,
        domGrowthRate,
        listenerGrowth,
        listenerGrowthRate,
        memoryUtilization: finalSnapshot.usedJSHeapSize / finalSnapshot.jsHeapSizeLimit,
      },
    };
  }

  /**
   * Checks if memory grows monotonically
   * @private
   * @returns {boolean}
   */
  _checkMonotonicGrowth() {
    if (this.snapshots.length < 5) return false;

    let previousSize = this.snapshots[0].usedJSHeapSize;
    let decreaseCount = 0;

    for (let i = 1; i < this.snapshots.length; i++) {
      const currentSize = this.snapshots[i].usedJSHeapSize;
      if (currentSize < previousSize) {
        decreaseCount++;
      }
      previousSize = currentSize;
    }

    // If memory decreased less than 10% of the time, consider it monotonic
    return decreaseCount / (this.snapshots.length - 1) < 0.1;
  }

  /**
   * Calculates severity based on how much threshold was exceeded
   * @private
   * @param {number} value - Measured value
   * @param {number} threshold - Threshold value
   * @returns {string}
   */
  _calculateSeverity(value, threshold) {
    const ratio = value / threshold;
    if (ratio < 2) return 'minor';
    if (ratio < 5) return 'moderate';
    return 'severe';
  }

  /**
   * Gets maximum severity from indicators
   * @private
   * @param {Array<LeakIndicator>} indicators
   * @returns {string}
   */
  _getMaxSeverity(indicators) {
    if (indicators.length === 0) return 'none';
    
    const severityLevels = { minor: 1, moderate: 2, severe: 3 };
    let maxLevel = 0;
    let maxSeverity = 'minor';

    for (const indicator of indicators) {
      const level = severityLevels[indicator.severity] || 0;
      if (level > maxLevel) {
        maxLevel = level;
        maxSeverity = indicator.severity;
      }
    }

    return maxSeverity;
  }

  /**
   * Triggers garbage collection if available (Chrome with --expose-gc)
   * @returns {Promise<void>}
   */
  async forceGarbageCollection() {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    } else if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
    
    // Wait for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generates a detailed report
   * @param {LeakDetectionResult} result
   * @returns {string}
   */
  generateReport(result) {
    const lines = [];
    
    lines.push('=== Memory Leak Detection Report ===');
    lines.push('');
    lines.push(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
    lines.push(`Leak Detected: ${result.hasLeak ? 'YES' : 'NO'}`);
    lines.push(`Severity: ${result.severity.toUpperCase()}`);
    lines.push('');

    if (result.indicators.length > 0) {
      lines.push('Indicators:');
      result.indicators.forEach((indicator, i) => {
        lines.push(`  ${i + 1}. [${indicator.severity.toUpperCase()}] ${indicator.description}`);
        lines.push(`     Value: ${indicator.value.toFixed(2)}, Threshold: ${indicator.threshold.toFixed(2)}`);
      });
      lines.push('');
    }

    lines.push('Metrics:');
    lines.push(`  Memory Growth: ${(result.metrics.memoryGrowth / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  Memory Growth Rate: ${(result.metrics.memoryGrowthRate / 1024 / 1024).toFixed(2)} MB/s`);
    lines.push(`  DOM Node Growth: ${result.metrics.domGrowth} nodes`);
    lines.push(`  DOM Growth Rate: ${result.metrics.domGrowthRate.toFixed(2)} nodes/s`);
    lines.push(`  Listener Growth: ${result.metrics.listenerGrowth} listeners`);
    lines.push(`  Listener Growth Rate: ${result.metrics.listenerGrowthRate.toFixed(2)} listeners/s`);
    lines.push(`  Memory Utilization: ${(result.metrics.memoryUtilization * 100).toFixed(2)}%`);
    lines.push('');

    lines.push('Initial State:');
    lines.push(`  Memory: ${(result.initialSnapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  DOM Nodes: ${result.initialSnapshot.domNodes}`);
    lines.push(`  Event Listeners: ${result.initialSnapshot.eventListeners}`);
    lines.push('');

    lines.push('Final State:');
    lines.push(`  Memory: ${(result.finalSnapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  DOM Nodes: ${result.finalSnapshot.domNodes}`);
    lines.push(`  Event Listeners: ${result.finalSnapshot.eventListeners}`);

    return lines.join('\n');
  }
}