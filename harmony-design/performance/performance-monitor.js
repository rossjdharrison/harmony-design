/**
 * @fileoverview Performance monitoring system for Harmony Design System
 * Tracks render times, memory usage, and animation performance against budgets
 * See DESIGN_SYSTEM.md#performance-monitoring for usage
 */

/**
 * @typedef {Object} PerformanceMetric
 * @property {string} name - Metric name
 * @property {number} value - Metric value
 * @property {string} unit - Unit of measurement
 * @property {number} timestamp - When metric was recorded
 * @property {string} [component] - Component name if applicable
 */

/**
 * @typedef {Object} BudgetViolation
 * @property {string} metric - Which budget was violated
 * @property {number} actual - Actual value
 * @property {number} budget - Budget limit
 * @property {string} severity - 'warning' or 'error'
 * @property {number} timestamp - When violation occurred
 */

/**
 * Performance monitoring system
 * Singleton that tracks metrics and enforces budgets
 */
class PerformanceMonitor {
  constructor() {
    if (PerformanceMonitor.instance) {
      return PerformanceMonitor.instance;
    }

    this.metrics = [];
    this.violations = [];
    this.budgets = null;
    this.observers = new Set();
    this.isMonitoring = false;
    this.frameTimings = [];
    this.componentTimings = new Map();

    PerformanceMonitor.instance = this;
  }

  /**
   * Initialize monitor with budgets
   * @param {Object} budgets - Budget configuration
   */
  async initialize(budgets) {
    this.budgets = budgets;
    this.startMonitoring();
    console.log('[PerformanceMonitor] Initialized with budgets', budgets);
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupFrameMonitoring();
    this.setupMemoryMonitoring();
    this.setupNavigationMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    if (this.frameObserver) {
      this.frameObserver.disconnect();
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
  }

  /**
   * Setup frame timing monitoring for 60fps target
   */
  setupFrameMonitoring() {
    let lastFrameTime = performance.now();
    
    const measureFrame = (timestamp) => {
      if (!this.isMonitoring) return;

      const frameTime = timestamp - lastFrameTime;
      lastFrameTime = timestamp;

      this.recordMetric({
        name: 'frameTime',
        value: frameTime,
        unit: 'ms',
        timestamp: Date.now()
      });

      // Check against render budget
      if (this.budgets?.budgets?.render) {
        const budget = this.budgets.budgets.render.maxFrameTime;
        const warningThreshold = budget * this.budgets.thresholds.warning;
        
        if (frameTime > budget) {
          this.recordViolation({
            metric: 'frameTime',
            actual: frameTime,
            budget: budget,
            severity: 'error',
            timestamp: Date.now()
          });
        } else if (frameTime > warningThreshold) {
          this.recordViolation({
            metric: 'frameTime',
            actual: frameTime,
            budget: budget,
            severity: 'warning',
            timestamp: Date.now()
          });
        }
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    // Check if memory API is available
    if (!performance.memory) {
      console.warn('[PerformanceMonitor] Memory API not available');
      return;
    }

    this.memoryInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      const usedMemoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
      
      this.recordMetric({
        name: 'memoryUsage',
        value: usedMemoryMB,
        unit: 'MB',
        timestamp: Date.now()
      });

      // Check against memory budget
      if (this.budgets?.budgets?.memory) {
        const budget = this.budgets.budgets.memory.maxWasmHeap;
        const warningThreshold = budget * this.budgets.thresholds.warning;

        if (usedMemoryMB > budget) {
          this.recordViolation({
            metric: 'memoryUsage',
            actual: usedMemoryMB,
            budget: budget,
            severity: 'error',
            timestamp: Date.now()
          });
        } else if (usedMemoryMB > warningThreshold) {
          this.recordViolation({
            metric: 'memoryUsage',
            actual: usedMemoryMB,
            budget: budget,
            severity: 'warning',
            timestamp: Date.now()
          });
        }
      }
    }, 1000); // Check every second
  }

  /**
   * Setup navigation timing monitoring
   */
  setupNavigationMonitoring() {
    if (!window.PerformanceObserver) {
      console.warn('[PerformanceMonitor] PerformanceObserver not available');
      return;
    }

    // Monitor navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const loadTime = entry.loadEventEnd - entry.fetchStart;
          
          this.recordMetric({
            name: 'pageLoad',
            value: loadTime,
            unit: 'ms',
            timestamp: Date.now()
          });

          // Check against load budget
          if (this.budgets?.budgets?.load) {
            const budget = this.budgets.budgets.load.maxInitialLoad;
            const warningThreshold = budget * this.budgets.thresholds.warning;

            if (loadTime > budget) {
              this.recordViolation({
                metric: 'pageLoad',
                actual: loadTime,
                budget: budget,
                severity: 'error',
                timestamp: Date.now()
              });
            } else if (loadTime > warningThreshold) {
              this.recordViolation({
                metric: 'pageLoad',
                actual: loadTime,
                budget: budget,
                severity: 'warning',
                timestamp: Date.now()
              });
            }
          }
        }
      }
    });

    navObserver.observe({ entryTypes: ['navigation'] });
  }

  /**
   * Start measuring component render time
   * @param {string} componentName - Name of component
   * @returns {Function} End measurement function
   */
  measureComponent(componentName) {
    const startTime = performance.now();
    const markName = `component-${componentName}-start`;
    performance.mark(markName);

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      const endMarkName = `component-${componentName}-end`;
      performance.mark(endMarkName);

      try {
        performance.measure(
          `component-${componentName}`,
          markName,
          endMarkName
        );
      } catch (e) {
        console.warn('[PerformanceMonitor] Could not create measure', e);
      }

      this.recordMetric({
        name: 'componentRender',
        value: renderTime,
        unit: 'ms',
        timestamp: Date.now(),
        component: componentName
      });

      // Check against component budget
      if (this.budgets?.budgets?.components) {
        const budget = this.budgets.budgets.components.maxRenderTime;
        const warningThreshold = budget * this.budgets.thresholds.warning;

        if (renderTime > budget) {
          this.recordViolation({
            metric: 'componentRender',
            actual: renderTime,
            budget: budget,
            severity: 'error',
            timestamp: Date.now(),
            component: componentName
          });
        } else if (renderTime > warningThreshold) {
          this.recordViolation({
            metric: 'componentRender',
            actual: renderTime,
            budget: budget,
            severity: 'warning',
            timestamp: Date.now(),
            component: componentName
          });
        }
      }

      // Store timing for component
      if (!this.componentTimings.has(componentName)) {
        this.componentTimings.set(componentName, []);
      }
      this.componentTimings.get(componentName).push(renderTime);

      return renderTime;
    };
  }

  /**
   * Measure animation performance
   * @param {string} animationName - Name of animation
   * @param {Function} callback - Animation function
   * @returns {Promise<Object>} Animation metrics
   */
  async measureAnimation(animationName, callback) {
    const frames = [];
    let animationId;
    let startTime = performance.now();
    let frameCount = 0;
    let droppedFrames = 0;
    const targetFrameTime = 1000 / 60; // 16.67ms for 60fps

    const measureFrame = (timestamp) => {
      const frameTime = timestamp - startTime;
      frames.push(frameTime);
      frameCount++;

      if (frameTime > targetFrameTime * 1.5) {
        droppedFrames++;
      }

      startTime = timestamp;

      const shouldContinue = callback(timestamp, frameCount);
      if (shouldContinue) {
        animationId = requestAnimationFrame(measureFrame);
      } else {
        this.recordAnimationMetrics(animationName, frames, droppedFrames);
      }
    };

    return new Promise((resolve) => {
      animationId = requestAnimationFrame((timestamp) => {
        startTime = timestamp;
        callback(timestamp, 0);
        animationId = requestAnimationFrame(measureFrame);
      });

      // Store resolve for callback
      this._animationResolve = () => {
        const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
        const fps = 1000 / avgFrameTime;
        
        resolve({
          name: animationName,
          frameCount,
          droppedFrames,
          avgFrameTime,
          fps,
          frames
        });
      };
    });
  }

  /**
   * Record animation metrics
   * @param {string} name - Animation name
   * @param {number[]} frames - Frame timings
   * @param {number} droppedFrames - Number of dropped frames
   */
  recordAnimationMetrics(name, frames, droppedFrames) {
    const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
    const fps = 1000 / avgFrameTime;

    this.recordMetric({
      name: 'animationFps',
      value: fps,
      unit: 'fps',
      timestamp: Date.now(),
      component: name
    });

    // Check against animation budget
    if (this.budgets?.budgets?.animations) {
      const targetFps = this.budgets.budgets.animations.targetFps;
      const maxDropped = this.budgets.budgets.animations.maxDroppedFrames;

      if (fps < targetFps * this.budgets.thresholds.warning) {
        this.recordViolation({
          metric: 'animationFps',
          actual: fps,
          budget: targetFps,
          severity: fps < targetFps * 0.5 ? 'error' : 'warning',
          timestamp: Date.now(),
          component: name
        });
      }

      if (droppedFrames > maxDropped) {
        this.recordViolation({
          metric: 'droppedFrames',
          actual: droppedFrames,
          budget: maxDropped,
          severity: 'error',
          timestamp: Date.now(),
          component: name
        });
      }
    }

    if (this._animationResolve) {
      this._animationResolve();
      this._animationResolve = null;
    }
  }

  /**
   * Record a performance metric
   * @param {PerformanceMetric} metric - Metric to record
   */
  recordMetric(metric) {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    this.notifyObservers('metric', metric);
  }

  /**
   * Record a budget violation
   * @param {BudgetViolation} violation - Violation to record
   */
  recordViolation(violation) {
    this.violations.push(violation);

    // Keep only last 100 violations
    if (this.violations.length > 100) {
      this.violations.shift();
    }

    // Log to console
    const level = violation.severity === 'error' ? 'error' : 'warn';
    console[level](
      `[PerformanceMonitor] Budget violation: ${violation.metric}`,
      `Actual: ${violation.actual.toFixed(2)}, Budget: ${violation.budget}`,
      violation.component ? `Component: ${violation.component}` : ''
    );

    this.notifyObservers('violation', violation);
  }

  /**
   * Get metrics summary
   * @returns {Object} Summary of metrics
   */
  getSummary() {
    const now = Date.now();
    const last5Minutes = now - 5 * 60 * 1000;
    
    const recentMetrics = this.metrics.filter(m => m.timestamp > last5Minutes);
    const recentViolations = this.violations.filter(v => v.timestamp > last5Minutes);

    const summary = {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.length,
      totalViolations: this.violations.length,
      recentViolations: recentViolations.length,
      byMetric: {},
      components: {}
    };

    // Group metrics by name
    for (const metric of recentMetrics) {
      if (!summary.byMetric[metric.name]) {
        summary.byMetric[metric.name] = {
          count: 0,
          values: [],
          avg: 0,
          min: Infinity,
          max: -Infinity
        };
      }

      const group = summary.byMetric[metric.name];
      group.count++;
      group.values.push(metric.value);
      group.min = Math.min(group.min, metric.value);
      group.max = Math.max(group.max, metric.value);
    }

    // Calculate averages
    for (const [name, data] of Object.entries(summary.byMetric)) {
      data.avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
      delete data.values; // Don't include all values in summary
    }

    // Component-specific metrics
    for (const [component, timings] of this.componentTimings.entries()) {
      const recent = timings.slice(-10); // Last 10 renders
      summary.components[component] = {
        renders: timings.length,
        avgTime: recent.reduce((a, b) => a + b, 0) / recent.length,
        minTime: Math.min(...recent),
        maxTime: Math.max(...recent)
      };
    }

    return summary;
  }

  /**
   * Get all violations
   * @param {string} [severity] - Filter by severity
   * @returns {BudgetViolation[]} Violations
   */
  getViolations(severity = null) {
    if (severity) {
      return this.violations.filter(v => v.severity === severity);
    }
    return [...this.violations];
  }

  /**
   * Get component timings
   * @param {string} componentName - Component name
   * @returns {number[]} Timing measurements
   */
  getComponentTimings(componentName) {
    return this.componentTimings.get(componentName) || [];
  }

  /**
   * Subscribe to performance events
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Notify observers of events
   * @param {string} type - Event type
   * @param {*} data - Event data
   */
  notifyObservers(type, data) {
    for (const observer of this.observers) {
      try {
        observer(type, data);
      } catch (e) {
        console.error('[PerformanceMonitor] Observer error', e);
      }
    }
  }

  /**
   * Export metrics to JSON
   * @returns {Object} All metrics and violations
   */
  export() {
    return {
      budgets: this.budgets,
      metrics: this.metrics,
      violations: this.violations,
      summary: this.getSummary(),
      timestamp: Date.now()
    };
  }

  /**
   * Clear all recorded data
   */
  clear() {
    this.metrics = [];
    this.violations = [];
    this.componentTimings.clear();
    console.log('[PerformanceMonitor] Cleared all data');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();