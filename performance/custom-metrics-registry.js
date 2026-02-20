/**
 * @fileoverview Custom Metrics Registry - Define and collect custom metrics
 * @module performance/custom-metrics-registry
 * 
 * Provides a centralized registry for defining, collecting, and reporting
 * custom performance metrics beyond standard Web Vitals.
 * 
 * Related: performance/web-vitals-collector.js, performance/performance-monitor.js
 * Documentation: DESIGN_SYSTEM.md#custom-metrics-registry
 */

/**
 * @typedef {Object} MetricDefinition
 * @property {string} name - Unique metric name
 * @property {string} type - Metric type: 'gauge', 'counter', 'histogram', 'timer'
 * @property {string} [unit] - Unit of measurement (ms, bytes, count, etc.)
 * @property {string} [description] - Human-readable description
 * @property {Array<string>} [tags] - Tags for categorization
 * @property {Function} [aggregator] - Custom aggregation function
 */

/**
 * @typedef {Object} MetricValue
 * @property {string} name - Metric name
 * @property {number} value - Metric value
 * @property {number} timestamp - When the metric was recorded
 * @property {Object<string, any>} [metadata] - Additional context
 * @property {Array<string>} [tags] - Tags for this specific value
 */

/**
 * @typedef {Object} MetricSnapshot
 * @property {string} name - Metric name
 * @property {string} type - Metric type
 * @property {number} count - Number of values recorded
 * @property {number} [sum] - Sum of all values
 * @property {number} [min] - Minimum value
 * @property {number} [max] - Maximum value
 * @property {number} [mean] - Average value
 * @property {number} [median] - Median value
 * @property {number} [p95] - 95th percentile
 * @property {number} [p99] - 99th percentile
 * @property {number} [current] - Current value (for gauges)
 */

class CustomMetricsRegistry {
  constructor() {
    /** @type {Map<string, MetricDefinition>} */
    this.definitions = new Map();
    
    /** @type {Map<string, Array<MetricValue>>} */
    this.values = new Map();
    
    /** @type {Map<string, number>} */
    this.counters = new Map();
    
    /** @type {Map<string, number>} */
    this.gauges = new Map();
    
    /** @type {Array<Function>} */
    this.collectors = [];
    
    /** @type {number} */
    this.maxValuesPerMetric = 1000;
    
    /** @type {number} */
    this.retentionPeriodMs = 5 * 60 * 1000; // 5 minutes
    
    this._initializeBuiltInMetrics();
    this._startCleanupInterval();
  }

  /**
   * Initialize built-in metrics for common use cases
   * @private
   */
  _initializeBuiltInMetrics() {
    // Component lifecycle metrics
    this.define({
      name: 'component.mount.duration',
      type: 'histogram',
      unit: 'ms',
      description: 'Time taken to mount a component',
      tags: ['component', 'lifecycle']
    });

    this.define({
      name: 'component.render.duration',
      type: 'histogram',
      unit: 'ms',
      description: 'Time taken to render a component',
      tags: ['component', 'lifecycle']
    });

    this.define({
      name: 'component.active.count',
      type: 'gauge',
      unit: 'count',
      description: 'Number of active component instances',
      tags: ['component']
    });

    // WASM metrics
    this.define({
      name: 'wasm.execution.duration',
      type: 'histogram',
      unit: 'ms',
      description: 'WASM function execution time',
      tags: ['wasm', 'performance']
    });

    this.define({
      name: 'wasm.memory.usage',
      type: 'gauge',
      unit: 'bytes',
      description: 'WASM heap memory usage',
      tags: ['wasm', 'memory']
    });

    // Audio processing metrics
    this.define({
      name: 'audio.processing.latency',
      type: 'histogram',
      unit: 'ms',
      description: 'Audio processing latency',
      tags: ['audio', 'performance']
    });

    this.define({
      name: 'audio.buffer.underruns',
      type: 'counter',
      unit: 'count',
      description: 'Number of audio buffer underruns',
      tags: ['audio', 'quality']
    });

    // Graph operations
    this.define({
      name: 'graph.query.duration',
      type: 'histogram',
      unit: 'ms',
      description: 'Graph query execution time',
      tags: ['graph', 'performance']
    });

    this.define({
      name: 'graph.node.count',
      type: 'gauge',
      unit: 'count',
      description: 'Number of nodes in the graph',
      tags: ['graph']
    });

    // EventBus metrics
    this.define({
      name: 'eventbus.event.count',
      type: 'counter',
      unit: 'count',
      description: 'Number of events processed',
      tags: ['eventbus']
    });

    this.define({
      name: 'eventbus.dispatch.duration',
      type: 'histogram',
      unit: 'ms',
      description: 'Event dispatch duration',
      tags: ['eventbus', 'performance']
    });
  }

  /**
   * Define a new custom metric
   * @param {MetricDefinition} definition - Metric definition
   * @returns {boolean} True if metric was defined successfully
   */
  define(definition) {
    if (!definition.name) {
      console.error('[CustomMetricsRegistry] Metric name is required');
      return false;
    }

    if (!['gauge', 'counter', 'histogram', 'timer'].includes(definition.type)) {
      console.error('[CustomMetricsRegistry] Invalid metric type:', definition.type);
      return false;
    }

    if (this.definitions.has(definition.name)) {
      console.warn('[CustomMetricsRegistry] Metric already defined:', definition.name);
      return false;
    }

    this.definitions.set(definition.name, {
      ...definition,
      tags: definition.tags || [],
      unit: definition.unit || 'count'
    });

    // Initialize storage for this metric
    if (definition.type === 'counter') {
      this.counters.set(definition.name, 0);
    } else if (definition.type === 'gauge') {
      this.gauges.set(definition.name, 0);
    } else {
      this.values.set(definition.name, []);
    }

    return true;
  }

  /**
   * Record a metric value
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Object} [options] - Additional options
   * @param {Object<string, any>} [options.metadata] - Metadata
   * @param {Array<string>} [options.tags] - Tags
   */
  record(name, value, options = {}) {
    const definition = this.definitions.get(name);
    if (!definition) {
      console.warn('[CustomMetricsRegistry] Unknown metric:', name);
      return;
    }

    const timestamp = performance.now();

    switch (definition.type) {
      case 'counter':
        this.counters.set(name, (this.counters.get(name) || 0) + value);
        break;

      case 'gauge':
        this.gauges.set(name, value);
        break;

      case 'histogram':
      case 'timer':
        const values = this.values.get(name);
        values.push({
          name,
          value,
          timestamp,
          metadata: options.metadata,
          tags: options.tags
        });

        // Trim if exceeds max values
        if (values.length > this.maxValuesPerMetric) {
          values.shift();
        }
        break;
    }
  }

  /**
   * Increment a counter metric
   * @param {string} name - Counter name
   * @param {number} [delta=1] - Amount to increment
   */
  increment(name, delta = 1) {
    this.record(name, delta);
  }

  /**
   * Set a gauge value
   * @param {string} name - Gauge name
   * @param {number} value - New value
   */
  set(name, value) {
    this.record(name, value);
  }

  /**
   * Time a function execution and record as histogram
   * @param {string} name - Metric name
   * @param {Function} fn - Function to time
   * @param {Object} [options] - Additional options
   * @returns {Promise<any>} Function result
   */
  async time(name, fn, options = {}) {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.record(name, duration, options);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(name, duration, {
        ...options,
        metadata: { ...options.metadata, error: true }
      });
      throw error;
    }
  }

  /**
   * Create a timer that can be stopped manually
   * @param {string} name - Metric name
   * @param {Object} [options] - Additional options
   * @returns {Function} Stop function
   */
  startTimer(name, options = {}) {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.record(name, duration, options);
      return duration;
    };
  }

  /**
   * Register a custom collector function
   * @param {Function} collector - Function that collects metrics
   */
  registerCollector(collector) {
    if (typeof collector !== 'function') {
      console.error('[CustomMetricsRegistry] Collector must be a function');
      return;
    }
    this.collectors.push(collector);
  }

  /**
   * Run all registered collectors
   */
  async collect() {
    for (const collector of this.collectors) {
      try {
        await collector(this);
      } catch (error) {
        console.error('[CustomMetricsRegistry] Collector error:', error);
      }
    }
  }

  /**
   * Get a snapshot of a specific metric
   * @param {string} name - Metric name
   * @returns {MetricSnapshot|null} Metric snapshot
   */
  getSnapshot(name) {
    const definition = this.definitions.get(name);
    if (!definition) {
      return null;
    }

    const snapshot = {
      name,
      type: definition.type,
      unit: definition.unit,
      description: definition.description,
      tags: definition.tags
    };

    switch (definition.type) {
      case 'counter':
        snapshot.count = this.counters.get(name) || 0;
        snapshot.current = snapshot.count;
        break;

      case 'gauge':
        snapshot.current = this.gauges.get(name) || 0;
        break;

      case 'histogram':
      case 'timer':
        const values = this.values.get(name) || [];
        if (values.length === 0) {
          snapshot.count = 0;
          break;
        }

        const sorted = values.map(v => v.value).sort((a, b) => a - b);
        snapshot.count = sorted.length;
        snapshot.sum = sorted.reduce((a, b) => a + b, 0);
        snapshot.min = sorted[0];
        snapshot.max = sorted[sorted.length - 1];
        snapshot.mean = snapshot.sum / snapshot.count;
        snapshot.median = this._percentile(sorted, 50);
        snapshot.p95 = this._percentile(sorted, 95);
        snapshot.p99 = this._percentile(sorted, 99);
        break;
    }

    return snapshot;
  }

  /**
   * Get snapshots of all metrics
   * @param {Object} [options] - Filter options
   * @param {Array<string>} [options.tags] - Filter by tags
   * @returns {Array<MetricSnapshot>} Array of snapshots
   */
  getAllSnapshots(options = {}) {
    const snapshots = [];
    
    for (const [name, definition] of this.definitions) {
      // Filter by tags if specified
      if (options.tags && options.tags.length > 0) {
        const hasTag = options.tags.some(tag => definition.tags.includes(tag));
        if (!hasTag) continue;
      }

      const snapshot = this.getSnapshot(name);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Reset a specific metric
   * @param {string} name - Metric name
   */
  reset(name) {
    const definition = this.definitions.get(name);
    if (!definition) return;

    switch (definition.type) {
      case 'counter':
        this.counters.set(name, 0);
        break;
      case 'gauge':
        this.gauges.set(name, 0);
        break;
      case 'histogram':
      case 'timer':
        this.values.set(name, []);
        break;
    }
  }

  /**
   * Reset all metrics
   */
  resetAll() {
    for (const name of this.definitions.keys()) {
      this.reset(name);
    }
  }

  /**
   * Calculate percentile from sorted array
   * @private
   * @param {Array<number>} sorted - Sorted array of values
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  _percentile(sorted, percentile) {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Clean up old metric values
   * @private
   */
  _cleanup() {
    const now = performance.now();
    const cutoff = now - this.retentionPeriodMs;

    for (const [name, values] of this.values) {
      const filtered = values.filter(v => v.timestamp > cutoff);
      this.values.set(name, filtered);
    }
  }

  /**
   * Start periodic cleanup
   * @private
   */
  _startCleanupInterval() {
    // Clean up every minute
    setInterval(() => this._cleanup(), 60000);
  }

  /**
   * Export metrics in a specific format
   * @param {string} format - Export format: 'json', 'prometheus'
   * @returns {string} Formatted metrics
   */
  export(format = 'json') {
    const snapshots = this.getAllSnapshots();

    switch (format) {
      case 'json':
        return JSON.stringify({
          timestamp: Date.now(),
          metrics: snapshots
        }, null, 2);

      case 'prometheus':
        return this._exportPrometheus(snapshots);

      default:
        console.error('[CustomMetricsRegistry] Unknown export format:', format);
        return '';
    }
  }

  /**
   * Export metrics in Prometheus format
   * @private
   * @param {Array<MetricSnapshot>} snapshots - Metric snapshots
   * @returns {string} Prometheus-formatted metrics
   */
  _exportPrometheus(snapshots) {
    const lines = [];

    for (const snapshot of snapshots) {
      const metricName = snapshot.name.replace(/\./g, '_');
      
      // Add HELP and TYPE
      if (snapshot.description) {
        lines.push(`# HELP ${metricName} ${snapshot.description}`);
      }
      lines.push(`# TYPE ${metricName} ${this._prometheusType(snapshot.type)}`);

      // Add metric values
      switch (snapshot.type) {
        case 'counter':
          lines.push(`${metricName}_total ${snapshot.count}`);
          break;

        case 'gauge':
          lines.push(`${metricName} ${snapshot.current}`);
          break;

        case 'histogram':
        case 'timer':
          if (snapshot.count > 0) {
            lines.push(`${metricName}_sum ${snapshot.sum}`);
            lines.push(`${metricName}_count ${snapshot.count}`);
            lines.push(`${metricName}_min ${snapshot.min}`);
            lines.push(`${metricName}_max ${snapshot.max}`);
            lines.push(`${metricName}_mean ${snapshot.mean}`);
            lines.push(`${metricName}{quantile="0.5"} ${snapshot.median}`);
            lines.push(`${metricName}{quantile="0.95"} ${snapshot.p95}`);
            lines.push(`${metricName}{quantile="0.99"} ${snapshot.p99}`);
          }
          break;
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert metric type to Prometheus type
   * @private
   * @param {string} type - Internal metric type
   * @returns {string} Prometheus type
   */
  _prometheusType(type) {
    switch (type) {
      case 'counter': return 'counter';
      case 'gauge': return 'gauge';
      case 'histogram':
      case 'timer': return 'summary';
      default: return 'untyped';
    }
  }
}

// Global singleton instance
const customMetricsRegistry = new CustomMetricsRegistry();

// Auto-register system collectors
customMetricsRegistry.registerCollector(async (registry) => {
  // Collect memory usage
  if (performance.memory) {
    registry.set('system.memory.used', performance.memory.usedJSHeapSize);
    registry.set('system.memory.total', performance.memory.totalJSHeapSize);
    registry.set('system.memory.limit', performance.memory.jsHeapSizeLimit);
  }

  // Collect navigation timing
  if (performance.timing) {
    const timing = performance.timing;
    const navigationStart = timing.navigationStart;
    
    if (timing.loadEventEnd > 0) {
      registry.record('system.page.load', timing.loadEventEnd - navigationStart);
    }
  }
});

export { CustomMetricsRegistry, customMetricsRegistry };