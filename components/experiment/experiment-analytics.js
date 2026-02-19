/**
 * @fileoverview Experiment Analytics - Track experiment exposure and conversion events
 * @module components/experiment/experiment-analytics
 * 
 * Provides analytics tracking for A/B testing experiments:
 * - Tracks when users are exposed to experiment variants
 * - Records conversion events (success metrics)
 * - Batches events for efficient network usage
 * - Integrates with EventBus for system-wide event handling
 * 
 * Performance: Events batched every 5s or 10 events (whichever comes first)
 * Memory: ~1KB per 100 events in buffer
 * 
 * @see DESIGN_SYSTEM.md#experiment-analytics
 */

/**
 * @typedef {Object} ExperimentExposureEvent
 * @property {string} experimentId - Unique experiment identifier
 * @property {string} variantId - Assigned variant identifier
 * @property {string} userId - User identifier (anonymous or authenticated)
 * @property {number} timestamp - Event timestamp (ms since epoch)
 * @property {Object} [metadata] - Additional context data
 */

/**
 * @typedef {Object} ExperimentConversionEvent
 * @property {string} experimentId - Unique experiment identifier
 * @property {string} variantId - Assigned variant identifier
 * @property {string} userId - User identifier
 * @property {string} conversionType - Type of conversion (e.g., 'click', 'purchase')
 * @property {number} timestamp - Event timestamp (ms since epoch)
 * @property {number} [value] - Numeric value associated with conversion
 * @property {Object} [metadata] - Additional context data
 */

/**
 * @typedef {Object} AnalyticsConfig
 * @property {number} [batchSize=10] - Max events before auto-flush
 * @property {number} [batchInterval=5000] - Max ms between flushes
 * @property {string} [endpoint='/api/analytics/experiments'] - Analytics endpoint
 * @property {boolean} [enabled=true] - Enable/disable tracking
 * @property {Function} [transport] - Custom transport function
 */

/**
 * ExperimentAnalytics - Tracks and reports experiment metrics
 * 
 * Usage:
 * ```javascript
 * const analytics = new ExperimentAnalytics({
 *   batchSize: 10,
 *   batchInterval: 5000,
 *   endpoint: '/api/analytics/experiments'
 * });
 * 
 * // Track exposure
 * analytics.trackExposure('exp-001', 'variant-b', 'user-123');
 * 
 * // Track conversion
 * analytics.trackConversion('exp-001', 'variant-b', 'user-123', 'purchase', 99.99);
 * ```
 */
export class ExperimentAnalytics {
  /**
   * @param {AnalyticsConfig} config - Analytics configuration
   */
  constructor(config = {}) {
    this.config = {
      batchSize: 10,
      batchInterval: 5000,
      endpoint: '/api/analytics/experiments',
      enabled: true,
      transport: null,
      ...config
    };

    /** @type {Array<ExperimentExposureEvent|ExperimentConversionEvent>} */
    this.eventBuffer = [];

    /** @type {Set<string>} */
    this.trackedExposures = new Set();

    /** @type {number|null} */
    this.flushTimer = null;

    /** @type {boolean} */
    this.isFlushingBuffer = false;

    // Start flush timer
    this._startFlushTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Track experiment exposure (user sees a variant)
   * Automatically de-duplicates exposures per experiment+variant+user
   * 
   * @param {string} experimentId - Experiment identifier
   * @param {string} variantId - Variant identifier
   * @param {string} userId - User identifier
   * @param {Object} [metadata] - Additional context
   * @returns {boolean} True if exposure was tracked (not duplicate)
   */
  trackExposure(experimentId, variantId, userId, metadata = {}) {
    if (!this.config.enabled) {
      return false;
    }

    // Create unique key for deduplication
    const exposureKey = `${experimentId}:${variantId}:${userId}`;

    // Skip if already tracked this session
    if (this.trackedExposures.has(exposureKey)) {
      return false;
    }

    this.trackedExposures.add(exposureKey);

    /** @type {ExperimentExposureEvent} */
    const event = {
      type: 'exposure',
      experimentId,
      variantId,
      userId,
      timestamp: Date.now(),
      metadata
    };

    this._addEvent(event);

    // Publish to EventBus for other systems
    this._publishEvent('experiment:exposure', event);

    return true;
  }

  /**
   * Track conversion event (user completes goal action)
   * 
   * @param {string} experimentId - Experiment identifier
   * @param {string} variantId - Variant identifier
   * @param {string} userId - User identifier
   * @param {string} conversionType - Type of conversion
   * @param {number} [value] - Numeric value (e.g., revenue)
   * @param {Object} [metadata] - Additional context
   * @returns {boolean} True if conversion was tracked
   */
  trackConversion(experimentId, variantId, userId, conversionType, value = null, metadata = {}) {
    if (!this.config.enabled) {
      return false;
    }

    /** @type {ExperimentConversionEvent} */
    const event = {
      type: 'conversion',
      experimentId,
      variantId,
      userId,
      conversionType,
      timestamp: Date.now(),
      ...(value !== null && { value }),
      metadata
    };

    this._addEvent(event);

    // Publish to EventBus for other systems
    this._publishEvent('experiment:conversion', event);

    return true;
  }

  /**
   * Add event to buffer and trigger flush if needed
   * @private
   * @param {ExperimentExposureEvent|ExperimentConversionEvent} event
   */
  _addEvent(event) {
    this.eventBuffer.push(event);

    // Auto-flush if batch size reached
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Publish event to EventBus if available
   * @private
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   */
  _publishEvent(eventType, payload) {
    if (typeof window !== 'undefined' && window.eventBus) {
      window.eventBus.publish(eventType, payload);
    }
  }

  /**
   * Start periodic flush timer
   * @private
   */
  _startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flush();
      }
    }, this.config.batchInterval);
  }

  /**
   * Flush event buffer to analytics endpoint
   * Uses sendBeacon for reliability during page unload
   * 
   * @returns {Promise<boolean>} True if flush succeeded
   */
  async flush() {
    if (this.eventBuffer.length === 0 || this.isFlushingBuffer) {
      return true;
    }

    this.isFlushingBuffer = true;

    // Take snapshot of buffer
    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Use custom transport if provided
      if (this.config.transport) {
        await this.config.transport(eventsToSend);
        this.isFlushingBuffer = false;
        return true;
      }

      // Use sendBeacon if available (reliable for page unload)
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob(
          [JSON.stringify({ events: eventsToSend })],
          { type: 'application/json' }
        );
        const sent = navigator.sendBeacon(this.config.endpoint, blob);
        this.isFlushingBuffer = false;
        return sent;
      }

      // Fallback to fetch
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
        keepalive: true // Keep request alive during page unload
      });

      this.isFlushingBuffer = false;
      return response.ok;

    } catch (error) {
      console.error('[ExperimentAnalytics] Flush failed:', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToSend);
      this.isFlushingBuffer = false;
      return false;
    }
  }

  /**
   * Get current analytics statistics
   * 
   * @returns {Object} Analytics stats
   */
  getStats() {
    return {
      bufferedEvents: this.eventBuffer.length,
      trackedExposures: this.trackedExposures.size,
      enabled: this.config.enabled
    };
  }

  /**
   * Clear tracked exposures (useful for testing)
   */
  clearExposures() {
    this.trackedExposures.clear();
  }

  /**
   * Enable analytics tracking
   */
  enable() {
    this.config.enabled = true;
  }

  /**
   * Disable analytics tracking
   */
  disable() {
    this.config.enabled = false;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

/**
 * Global singleton instance
 * @type {ExperimentAnalytics|null}
 */
let globalAnalytics = null;

/**
 * Get or create global analytics instance
 * 
 * @param {AnalyticsConfig} [config] - Configuration (only used on first call)
 * @returns {ExperimentAnalytics}
 */
export function getExperimentAnalytics(config) {
  if (!globalAnalytics) {
    globalAnalytics = new ExperimentAnalytics(config);
  }
  return globalAnalytics;
}

/**
 * Reset global analytics instance (useful for testing)
 */
export function resetExperimentAnalytics() {
  if (globalAnalytics) {
    globalAnalytics.destroy();
    globalAnalytics = null;
  }
}