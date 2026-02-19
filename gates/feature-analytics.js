/**
 * @fileoverview Feature Analytics - Track feature flag usage and adoption
 * @module gates/feature-analytics
 * 
 * Tracks:
 * - Feature flag evaluations (how often flags are checked)
 * - Feature adoption (how often enabled features are actually used)
 * - User exposure (which users see which features)
 * - Performance impact (timing data for feature code paths)
 * 
 * All data is stored locally and can be exported for analysis.
 * No external analytics services - privacy-first approach.
 * 
 * Related: contexts/feature-flag-context.js, hooks/useFeatureFlag.js
 */

/**
 * @typedef {Object} FeatureEvaluation
 * @property {string} featureKey - Feature flag key
 * @property {boolean} enabled - Whether feature was enabled
 * @property {number} timestamp - When evaluation occurred
 * @property {string} userId - User identifier (if available)
 * @property {Object} context - Evaluation context (environment, etc.)
 */

/**
 * @typedef {Object} FeatureUsage
 * @property {string} featureKey - Feature flag key
 * @property {string} action - Action taken within feature
 * @property {number} timestamp - When action occurred
 * @property {number} duration - Time spent (ms, if applicable)
 * @property {Object} metadata - Additional usage data
 */

/**
 * @typedef {Object} FeatureMetrics
 * @property {number} evaluationCount - Total evaluations
 * @property {number} enabledCount - Times feature was enabled
 * @property {number} usageCount - Times feature was actually used
 * @property {number} uniqueUsers - Unique user count
 * @property {number} avgDuration - Average usage duration (ms)
 * @property {number} adoptionRate - Percentage of enabled users who use feature
 */

class FeatureAnalytics {
  constructor() {
    /** @type {Map<string, FeatureEvaluation[]>} */
    this.evaluations = new Map();
    
    /** @type {Map<string, FeatureUsage[]>} */
    this.usage = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.userExposure = new Map();
    
    /** @type {boolean} */
    this.enabled = true;
    
    /** @type {number} */
    this.maxEventsPerFeature = 1000;
    
    /** @type {number} */
    this.flushInterval = 60000; // 1 minute
    
    this._startAutoFlush();
    this._loadFromStorage();
  }

  /**
   * Track a feature flag evaluation
   * @param {string} featureKey - Feature flag key
   * @param {boolean} enabled - Whether feature is enabled
   * @param {Object} context - Evaluation context
   */
  trackEvaluation(featureKey, enabled, context = {}) {
    if (!this.enabled) return;

    const evaluation = {
      featureKey,
      enabled,
      timestamp: Date.now(),
      userId: context.userId || 'anonymous',
      context: {
        environment: context.environment,
        userAttributes: context.userAttributes,
        rolloutPercentage: context.rolloutPercentage
      }
    };

    // Store evaluation
    if (!this.evaluations.has(featureKey)) {
      this.evaluations.set(featureKey, []);
    }
    
    const evals = this.evaluations.get(featureKey);
    evals.push(evaluation);
    
    // Limit stored events
    if (evals.length > this.maxEventsPerFeature) {
      evals.shift();
    }

    // Track user exposure
    if (enabled) {
      if (!this.userExposure.has(featureKey)) {
        this.userExposure.set(featureKey, new Set());
      }
      this.userExposure.get(featureKey).add(evaluation.userId);
    }

    // Publish analytics event
    this._publishEvent('feature:evaluation', evaluation);
  }

  /**
   * Track feature usage (when user actually interacts with feature)
   * @param {string} featureKey - Feature flag key
   * @param {string} action - Action taken
   * @param {Object} options - Usage options
   */
  trackUsage(featureKey, action, options = {}) {
    if (!this.enabled) return;

    const usage = {
      featureKey,
      action,
      timestamp: Date.now(),
      duration: options.duration || 0,
      metadata: options.metadata || {}
    };

    // Store usage
    if (!this.usage.has(featureKey)) {
      this.usage.set(featureKey, []);
    }
    
    const usages = this.usage.get(featureKey);
    usages.push(usage);
    
    // Limit stored events
    if (usages.length > this.maxEventsPerFeature) {
      usages.shift();
    }

    // Publish analytics event
    this._publishEvent('feature:usage', usage);
  }

  /**
   * Get metrics for a specific feature
   * @param {string} featureKey - Feature flag key
   * @returns {FeatureMetrics}
   */
  getMetrics(featureKey) {
    const evals = this.evaluations.get(featureKey) || [];
    const usages = this.usage.get(featureKey) || [];
    const users = this.userExposure.get(featureKey) || new Set();

    const enabledEvals = evals.filter(e => e.enabled);
    const totalDuration = usages.reduce((sum, u) => sum + u.duration, 0);
    
    const adoptionRate = enabledEvals.length > 0 
      ? (usages.length / enabledEvals.length) * 100 
      : 0;

    return {
      evaluationCount: evals.length,
      enabledCount: enabledEvals.length,
      usageCount: usages.length,
      uniqueUsers: users.size,
      avgDuration: usages.length > 0 ? totalDuration / usages.length : 0,
      adoptionRate: Math.min(100, adoptionRate)
    };
  }

  /**
   * Get metrics for all features
   * @returns {Map<string, FeatureMetrics>}
   */
  getAllMetrics() {
    const allFeatures = new Set([
      ...this.evaluations.keys(),
      ...this.usage.keys()
    ]);

    const metrics = new Map();
    for (const featureKey of allFeatures) {
      metrics.set(featureKey, this.getMetrics(featureKey));
    }

    return metrics;
  }

  /**
   * Get recent activity for a feature
   * @param {string} featureKey - Feature flag key
   * @param {number} limit - Maximum events to return
   * @returns {Object}
   */
  getActivity(featureKey, limit = 50) {
    const evals = (this.evaluations.get(featureKey) || []).slice(-limit);
    const usages = (this.usage.get(featureKey) || []).slice(-limit);

    return {
      evaluations: evals,
      usage: usages,
      timeline: this._mergeTimeline(evals, usages, limit)
    };
  }

  /**
   * Export all analytics data
   * @returns {Object}
   */
  export() {
    const data = {
      timestamp: Date.now(),
      evaluations: Object.fromEntries(this.evaluations),
      usage: Object.fromEntries(this.usage),
      userExposure: Object.fromEntries(
        Array.from(this.userExposure.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      metrics: Object.fromEntries(this.getAllMetrics())
    };

    return data;
  }

  /**
   * Clear all analytics data
   * @param {string} [featureKey] - Optional: clear only specific feature
   */
  clear(featureKey = null) {
    if (featureKey) {
      this.evaluations.delete(featureKey);
      this.usage.delete(featureKey);
      this.userExposure.delete(featureKey);
    } else {
      this.evaluations.clear();
      this.usage.clear();
      this.userExposure.clear();
    }

    this._saveToStorage();
    this._publishEvent('analytics:cleared', { featureKey });
  }

  /**
   * Enable or disable analytics collection
   * @param {boolean} enabled - Whether to enable
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this._publishEvent('analytics:toggled', { enabled });
  }

  /**
   * Merge evaluations and usage into single timeline
   * @private
   */
  _mergeTimeline(evaluations, usage, limit) {
    const timeline = [
      ...evaluations.map(e => ({ ...e, type: 'evaluation' })),
      ...usage.map(u => ({ ...u, type: 'usage' }))
    ];

    timeline.sort((a, b) => b.timestamp - a.timestamp);
    return timeline.slice(0, limit);
  }

  /**
   * Publish analytics event to EventBus
   * @private
   */
  _publishEvent(type, data) {
    if (typeof window !== 'undefined' && window.EventBus) {
      window.EventBus.publish({
        type,
        payload: data,
        source: 'FeatureAnalytics'
      });
    }
  }

  /**
   * Start automatic flush to storage
   * @private
   */
  _startAutoFlush() {
    if (typeof window !== 'undefined') {
      this._flushTimer = setInterval(() => {
        this._saveToStorage();
      }, this.flushInterval);
    }
  }

  /**
   * Save analytics data to localStorage
   * @private
   */
  _saveToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const data = this.export();
      localStorage.setItem('harmony:feature-analytics', JSON.stringify(data));
    } catch (error) {
      console.warn('[FeatureAnalytics] Failed to save to storage:', error);
    }
  }

  /**
   * Load analytics data from localStorage
   * @private
   */
  _loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const stored = localStorage.getItem('harmony:feature-analytics');
      if (!stored) return;

      const data = JSON.parse(stored);
      
      // Restore evaluations
      if (data.evaluations) {
        this.evaluations = new Map(Object.entries(data.evaluations));
      }
      
      // Restore usage
      if (data.usage) {
        this.usage = new Map(Object.entries(data.usage));
      }
      
      // Restore user exposure
      if (data.userExposure) {
        this.userExposure = new Map(
          Object.entries(data.userExposure).map(([k, v]) => [k, new Set(v)])
        );
      }
    } catch (error) {
      console.warn('[FeatureAnalytics] Failed to load from storage:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
    }
    this._saveToStorage();
  }
}

// Singleton instance
const featureAnalytics = new FeatureAnalytics();

// Global access
if (typeof window !== 'undefined') {
  window.FeatureAnalytics = featureAnalytics;
}

export default featureAnalytics;