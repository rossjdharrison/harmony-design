/**
 * @fileoverview Web Vitals Collector - Collects LCP, FID, CLS, TTFB metrics
 * @module performance/web-vitals-collector
 * 
 * Core Web Vitals monitoring following Google's performance standards.
 * Tracks:
 * - LCP (Largest Contentful Paint): Visual loading performance
 * - FID (First Input Delay): Interactivity responsiveness
 * - CLS (Cumulative Layout Shift): Visual stability
 * - TTFB (Time to First Byte): Server response time
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#web-vitals-monitoring}
 */

/**
 * @typedef {Object} WebVitalMetric
 * @property {string} name - Metric name (LCP, FID, CLS, TTFB)
 * @property {number} value - Metric value
 * @property {number} rating - Performance rating (0=good, 1=needs-improvement, 2=poor)
 * @property {number} timestamp - When metric was recorded
 * @property {string} id - Unique metric ID
 * @property {Object} [attribution] - Additional context about the metric
 */

/**
 * @typedef {Object} WebVitalsConfig
 * @property {boolean} [reportAllChanges=false] - Report all changes or only final values
 * @property {Function} [onMetric] - Callback when metric is collected
 * @property {number} [sampleRate=1.0] - Sampling rate (0.0-1.0)
 */

/**
 * Web Vitals Collector class
 * Implements Core Web Vitals collection using PerformanceObserver API
 */
class WebVitalsCollector {
  /**
   * @param {WebVitalsConfig} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      reportAllChanges: false,
      sampleRate: 1.0,
      ...config
    };

    /** @type {Map<string, WebVitalMetric>} */
    this.metrics = new Map();

    /** @type {Map<string, PerformanceObserver>} */
    this.observers = new Map();

    /** @type {number} */
    this.clsValue = 0;

    /** @type {number} */
    this.clsEntries = 0;

    /** @type {string|null} */
    this.sessionId = null;

    this.initialize();
  }

  /**
   * Initialize the collector and start observing metrics
   */
  initialize() {
    // Check if we should sample this session
    if (Math.random() > this.config.sampleRate) {
      console.log('[WebVitalsCollector] Session not sampled');
      return;
    }

    this.sessionId = this.generateSessionId();

    // Collect TTFB immediately
    this.collectTTFB();

    // Start observing other metrics
    this.observeLCP();
    this.observeFID();
    this.observeCLS();

    // Report metrics on page visibility change
    this.setupVisibilityListener();
  }

  /**
   * Generate unique session ID
   * @returns {string}
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Collect Time to First Byte (TTFB)
   * Good: < 800ms, Needs Improvement: 800-1800ms, Poor: > 1800ms
   */
  collectTTFB() {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      if (!navigationEntry) {
        return;
      }

      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      
      const metric = {
        name: 'TTFB',
        value: ttfb,
        rating: this.rateTTFB(ttfb),
        timestamp: Date.now(),
        id: this.generateMetricId('TTFB'),
        attribution: {
          waitingTime: navigationEntry.responseStart - navigationEntry.fetchStart,
          dnsTime: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
          connectionTime: navigationEntry.connectEnd - navigationEntry.connectStart,
          requestTime: navigationEntry.responseStart - navigationEntry.requestStart
        }
      };

      this.recordMetric(metric);
    } catch (error) {
      console.error('[WebVitalsCollector] TTFB collection failed:', error);
    }
  }

  /**
   * Observe Largest Contentful Paint (LCP)
   * Good: < 2.5s, Needs Improvement: 2.5-4s, Poor: > 4s
   */
  observeLCP() {
    try {
      if (!('PerformanceObserver' in window)) {
        console.warn('[WebVitalsCollector] PerformanceObserver not supported');
        return;
      }

      let lastEntry = null;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        lastEntry = entries[entries.length - 1];

        if (this.config.reportAllChanges) {
          this.reportLCP(lastEntry);
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.set('lcp', observer);

      // Report final LCP on page hide
      const reportFinalLCP = () => {
        if (lastEntry) {
          this.reportLCP(lastEntry);
        }
      };

      ['visibilitychange', 'pagehide'].forEach(event => {
        addEventListener(event, reportFinalLCP, { once: true, capture: true });
      });
    } catch (error) {
      console.error('[WebVitalsCollector] LCP observation failed:', error);
    }
  }

  /**
   * Report LCP metric
   * @param {PerformanceEntry} entry - LCP entry
   */
  reportLCP(entry) {
    const metric = {
      name: 'LCP',
      value: entry.renderTime || entry.loadTime,
      rating: this.rateLCP(entry.renderTime || entry.loadTime),
      timestamp: Date.now(),
      id: this.generateMetricId('LCP'),
      attribution: {
        element: entry.element ? this.getElementSelector(entry.element) : null,
        url: entry.url || null,
        size: entry.size || 0
      }
    };

    this.recordMetric(metric);
  }

  /**
   * Observe First Input Delay (FID)
   * Good: < 100ms, Needs Improvement: 100-300ms, Poor: > 300ms
   */
  observeFID() {
    try {
      if (!('PerformanceObserver' in window)) {
        return;
      }

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const metric = {
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: this.rateFID(entry.processingStart - entry.startTime),
            timestamp: Date.now(),
            id: this.generateMetricId('FID'),
            attribution: {
              eventType: entry.name,
              eventTarget: entry.target ? this.getElementSelector(entry.target) : null,
              loadState: document.readyState
            }
          };

          this.recordMetric(metric);
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.set('fid', observer);
    } catch (error) {
      console.error('[WebVitalsCollector] FID observation failed:', error);
    }
  }

  /**
   * Observe Cumulative Layout Shift (CLS)
   * Good: < 0.1, Needs Improvement: 0.1-0.25, Poor: > 0.25
   */
  observeCLS() {
    try {
      if (!('PerformanceObserver' in window)) {
        return;
      }

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach(entry => {
          // Only count layout shifts without recent user input
          if (!entry.hadRecentInput) {
            this.clsValue += entry.value;
            this.clsEntries++;

            if (this.config.reportAllChanges) {
              this.reportCLS();
            }
          }
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('cls', observer);

      // Report final CLS on page hide
      const reportFinalCLS = () => {
        this.reportCLS();
      };

      ['visibilitychange', 'pagehide'].forEach(event => {
        addEventListener(event, reportFinalCLS, { once: true, capture: true });
      });
    } catch (error) {
      console.error('[WebVitalsCollector] CLS observation failed:', error);
    }
  }

  /**
   * Report CLS metric
   */
  reportCLS() {
    const metric = {
      name: 'CLS',
      value: this.clsValue,
      rating: this.rateCLS(this.clsValue),
      timestamp: Date.now(),
      id: this.generateMetricId('CLS'),
      attribution: {
        shiftCount: this.clsEntries
      }
    };

    this.recordMetric(metric);
  }

  /**
   * Rate TTFB value
   * @param {number} value - TTFB in milliseconds
   * @returns {number} Rating (0=good, 1=needs-improvement, 2=poor)
   */
  rateTTFB(value) {
    if (value <= 800) return 0;
    if (value <= 1800) return 1;
    return 2;
  }

  /**
   * Rate LCP value
   * @param {number} value - LCP in milliseconds
   * @returns {number} Rating (0=good, 1=needs-improvement, 2=poor)
   */
  rateLCP(value) {
    if (value <= 2500) return 0;
    if (value <= 4000) return 1;
    return 2;
  }

  /**
   * Rate FID value
   * @param {number} value - FID in milliseconds
   * @returns {number} Rating (0=good, 1=needs-improvement, 2=poor)
   */
  rateFID(value) {
    if (value <= 100) return 0;
    if (value <= 300) return 1;
    return 2;
  }

  /**
   * Rate CLS value
   * @param {number} value - CLS score
   * @returns {number} Rating (0=good, 1=needs-improvement, 2=poor)
   */
  rateCLS(value) {
    if (value <= 0.1) return 0;
    if (value <= 0.25) return 1;
    return 2;
  }

  /**
   * Record a metric
   * @param {WebVitalMetric} metric - Metric to record
   */
  recordMetric(metric) {
    this.metrics.set(metric.name, metric);

    // Log to console
    const ratingLabels = ['good', 'needs-improvement', 'poor'];
    console.log(
      `[WebVitalsCollector] ${metric.name}: ${metric.value.toFixed(2)} (${ratingLabels[metric.rating]})`
    );

    // Call custom callback if provided
    if (this.config.onMetric) {
      try {
        this.config.onMetric(metric);
      } catch (error) {
        console.error('[WebVitalsCollector] onMetric callback failed:', error);
      }
    }

    // Publish event to EventBus if available
    this.publishMetricEvent(metric);
  }

  /**
   * Publish metric event to EventBus
   * @param {WebVitalMetric} metric - Metric to publish
   */
  publishMetricEvent(metric) {
    if (typeof window !== 'undefined' && window.eventBus) {
      window.eventBus.publish({
        type: 'WebVitalCollected',
        payload: {
          sessionId: this.sessionId,
          metric: metric
        },
        source: 'WebVitalsCollector',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Generate unique metric ID
   * @param {string} metricName - Name of the metric
   * @returns {string}
   */
  generateMetricId(metricName) {
    return `${metricName}-${this.sessionId}-${Date.now()}`;
  }

  /**
   * Get CSS selector for an element
   * @param {Element} element - DOM element
   * @returns {string}
   */
  getElementSelector(element) {
    if (!element) return 'unknown';
    
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      return `.${element.className.split(' ').join('.')}`;
    }
    
    return element.tagName.toLowerCase();
  }

  /**
   * Setup visibility change listener
   */
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportAllMetrics();
      }
    });
  }

  /**
   * Report all collected metrics
   */
  reportAllMetrics() {
    const metrics = this.getAllMetrics();
    console.log('[WebVitalsCollector] Session metrics:', metrics);

    // Publish summary event
    if (typeof window !== 'undefined' && window.eventBus) {
      window.eventBus.publish({
        type: 'WebVitalsSessionComplete',
        payload: {
          sessionId: this.sessionId,
          metrics: metrics,
          timestamp: Date.now()
        },
        source: 'WebVitalsCollector'
      });
    }
  }

  /**
   * Get all collected metrics
   * @returns {Object.<string, WebVitalMetric>}
   */
  getAllMetrics() {
    const result = {};
    this.metrics.forEach((metric, name) => {
      result[name] = metric;
    });
    return result;
  }

  /**
   * Get a specific metric
   * @param {string} name - Metric name
   * @returns {WebVitalMetric|null}
   */
  getMetric(name) {
    return this.metrics.get(name) || null;
  }

  /**
   * Disconnect all observers and cleanup
   */
  disconnect() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    console.log('[WebVitalsCollector] Disconnected');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebVitalsCollector };
}

// Auto-initialize if in browser and not explicitly disabled
if (typeof window !== 'undefined' && !window.DISABLE_AUTO_WEB_VITALS) {
  window.webVitalsCollector = new WebVitalsCollector({
    reportAllChanges: false,
    sampleRate: 1.0
  });
}