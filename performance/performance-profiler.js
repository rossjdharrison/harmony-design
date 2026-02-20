/**
 * @fileoverview PerformanceProfiler - Collects execution metrics per node/edge type
 * 
 * Tracks performance characteristics of graph execution:
 * - Per-node-type execution time statistics
 * - Per-edge-type traversal metrics
 * - Memory allocation patterns
 * - Execution frequency and patterns
 * 
 * Used by AdaptiveScheduler to optimize execution strategy.
 * See DESIGN_SYSTEM.md § Performance Monitoring
 * 
 * @module performance/performance-profiler
 */

/**
 * Metrics collected for each node type
 * @typedef {Object} NodeTypeMetrics
 * @property {string} nodeType - Type identifier for the node
 * @property {number} executionCount - Total number of executions
 * @property {number} totalTime - Total execution time in ms
 * @property {number} minTime - Minimum execution time in ms
 * @property {number} maxTime - Maximum execution time in ms
 * @property {number} avgTime - Average execution time in ms
 * @property {number} p50Time - 50th percentile execution time in ms
 * @property {number} p95Time - 95th percentile execution time in ms
 * @property {number} p99Time - 99th percentile execution time in ms
 * @property {number} memoryAllocated - Total memory allocated in bytes
 * @property {number} avgMemoryPerExecution - Average memory per execution
 * @property {number} errorCount - Number of execution errors
 * @property {number} lastExecutionTime - Timestamp of last execution
 * @property {Array<number>} recentTimings - Rolling window of recent timings
 */

/**
 * Metrics collected for each edge type
 * @typedef {Object} EdgeTypeMetrics
 * @property {string} edgeType - Type identifier for the edge
 * @property {number} traversalCount - Total number of traversals
 * @property {number} totalTime - Total traversal time in ms
 * @property {number} avgTime - Average traversal time in ms
 * @property {number} dataTransferred - Total data transferred in bytes
 * @property {number} avgDataPerTraversal - Average data per traversal
 * @property {number} lastTraversalTime - Timestamp of last traversal
 */

/**
 * Performance profile snapshot
 * @typedef {Object} PerformanceProfile
 * @property {number} timestamp - When the profile was captured
 * @property {Map<string, NodeTypeMetrics>} nodeMetrics - Metrics by node type
 * @property {Map<string, EdgeTypeMetrics>} edgeMetrics - Metrics by edge type
 * @property {Object} summary - Aggregate statistics
 */

/**
 * PerformanceProfiler collects and analyzes execution metrics
 * per node and edge type for optimization purposes.
 */
export class PerformanceProfiler {
  constructor() {
    /** @type {Map<string, NodeTypeMetrics>} */
    this.nodeMetrics = new Map();
    
    /** @type {Map<string, EdgeTypeMetrics>} */
    this.edgeMetrics = new Map();
    
    /** @type {number} Maximum number of recent timings to keep */
    this.maxRecentTimings = 100;
    
    /** @type {number} Time window for recent metrics (ms) */
    this.recentWindow = 60000; // 1 minute
    
    /** @type {number} When profiling started */
    this.startTime = performance.now();
    
    /** @type {Map<string, number>} Active execution start times */
    this.activeExecutions = new Map();
    
    /** @type {boolean} Whether profiling is enabled */
    this.enabled = true;
    
    /** @type {number} Total number of profiled executions */
    this.totalExecutions = 0;
  }

  /**
   * Start tracking execution for a node
   * @param {string} nodeId - Unique node identifier
   * @param {string} nodeType - Type of the node
   * @returns {string} Execution ID for stopping the timer
   */
  startNodeExecution(nodeId, nodeType) {
    if (!this.enabled) return null;
    
    const executionId = `${nodeId}-${Date.now()}`;
    this.activeExecutions.set(executionId, {
      nodeId,
      nodeType,
      startTime: performance.now(),
      startMemory: this._getMemoryUsage()
    });
    
    return executionId;
  }

  /**
   * Stop tracking execution and record metrics
   * @param {string} executionId - ID returned from startNodeExecution
   * @param {boolean} [hasError=false] - Whether execution resulted in error
   */
  stopNodeExecution(executionId, hasError = false) {
    if (!this.enabled || !executionId) return;
    
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      console.warn(`[PerformanceProfiler] Unknown execution ID: ${executionId}`);
      return;
    }
    
    const endTime = performance.now();
    const endMemory = this._getMemoryUsage();
    const duration = endTime - execution.startTime;
    const memoryDelta = endMemory - execution.startMemory;
    
    this._recordNodeMetrics(execution.nodeType, duration, memoryDelta, hasError);
    this.activeExecutions.delete(executionId);
    this.totalExecutions++;
  }

  /**
   * Record metrics for a node type
   * @private
   * @param {string} nodeType - Type of the node
   * @param {number} duration - Execution duration in ms
   * @param {number} memoryDelta - Memory change in bytes
   * @param {boolean} hasError - Whether execution had an error
   */
  _recordNodeMetrics(nodeType, duration, memoryDelta, hasError) {
    let metrics = this.nodeMetrics.get(nodeType);
    
    if (!metrics) {
      metrics = {
        nodeType,
        executionCount: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: -Infinity,
        avgTime: 0,
        p50Time: 0,
        p95Time: 0,
        p99Time: 0,
        memoryAllocated: 0,
        avgMemoryPerExecution: 0,
        errorCount: 0,
        lastExecutionTime: 0,
        recentTimings: []
      };
      this.nodeMetrics.set(nodeType, metrics);
    }
    
    // Update basic metrics
    metrics.executionCount++;
    metrics.totalTime += duration;
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.avgTime = metrics.totalTime / metrics.executionCount;
    metrics.lastExecutionTime = Date.now();
    
    if (hasError) {
      metrics.errorCount++;
    }
    
    // Update memory metrics
    if (memoryDelta > 0) {
      metrics.memoryAllocated += memoryDelta;
      metrics.avgMemoryPerExecution = metrics.memoryAllocated / metrics.executionCount;
    }
    
    // Update recent timings for percentile calculation
    metrics.recentTimings.push(duration);
    if (metrics.recentTimings.length > this.maxRecentTimings) {
      metrics.recentTimings.shift();
    }
    
    // Calculate percentiles
    this._updatePercentiles(metrics);
  }

  /**
   * Update percentile metrics for a node type
   * @private
   * @param {NodeTypeMetrics} metrics - Metrics to update
   */
  _updatePercentiles(metrics) {
    if (metrics.recentTimings.length === 0) return;
    
    const sorted = [...metrics.recentTimings].sort((a, b) => a - b);
    const len = sorted.length;
    
    metrics.p50Time = sorted[Math.floor(len * 0.50)];
    metrics.p95Time = sorted[Math.floor(len * 0.95)];
    metrics.p99Time = sorted[Math.floor(len * 0.99)];
  }

  /**
   * Track edge traversal
   * @param {string} edgeType - Type of the edge
   * @param {number} duration - Traversal duration in ms
   * @param {number} dataSize - Size of data transferred in bytes
   */
  recordEdgeTraversal(edgeType, duration, dataSize = 0) {
    if (!this.enabled) return;
    
    let metrics = this.edgeMetrics.get(edgeType);
    
    if (!metrics) {
      metrics = {
        edgeType,
        traversalCount: 0,
        totalTime: 0,
        avgTime: 0,
        dataTransferred: 0,
        avgDataPerTraversal: 0,
        lastTraversalTime: 0
      };
      this.edgeMetrics.set(edgeType, metrics);
    }
    
    metrics.traversalCount++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.traversalCount;
    metrics.dataTransferred += dataSize;
    metrics.avgDataPerTraversal = metrics.dataTransferred / metrics.traversalCount;
    metrics.lastTraversalTime = Date.now();
  }

  /**
   * Get metrics for a specific node type
   * @param {string} nodeType - Type of the node
   * @returns {NodeTypeMetrics|null} Metrics or null if not found
   */
  getNodeMetrics(nodeType) {
    return this.nodeMetrics.get(nodeType) || null;
  }

  /**
   * Get metrics for a specific edge type
   * @param {string} edgeType - Type of the edge
   * @returns {EdgeTypeMetrics|null} Metrics or null if not found
   */
  getEdgeMetrics(edgeType) {
    return this.edgeMetrics.get(edgeType) || null;
  }

  /**
   * Get all node types sorted by average execution time
   * @param {boolean} [ascending=false] - Sort order
   * @returns {Array<NodeTypeMetrics>} Sorted metrics
   */
  getNodeTypesByExecutionTime(ascending = false) {
    const metrics = Array.from(this.nodeMetrics.values());
    metrics.sort((a, b) => ascending ? a.avgTime - b.avgTime : b.avgTime - a.avgTime);
    return metrics;
  }

  /**
   * Get all node types sorted by execution count
   * @param {boolean} [ascending=false] - Sort order
   * @returns {Array<NodeTypeMetrics>} Sorted metrics
   */
  getNodeTypesByFrequency(ascending = false) {
    const metrics = Array.from(this.nodeMetrics.values());
    metrics.sort((a, b) => ascending ? a.executionCount - b.executionCount : b.executionCount - a.executionCount);
    return metrics;
  }

  /**
   * Get node types with high error rates
   * @param {number} [threshold=0.05] - Error rate threshold (0-1)
   * @returns {Array<NodeTypeMetrics>} Node types with errors above threshold
   */
  getProblematicNodeTypes(threshold = 0.05) {
    const metrics = Array.from(this.nodeMetrics.values());
    return metrics.filter(m => {
      const errorRate = m.errorCount / m.executionCount;
      return errorRate >= threshold;
    }).sort((a, b) => {
      const aRate = a.errorCount / a.executionCount;
      const bRate = b.errorCount / b.executionCount;
      return bRate - aRate;
    });
  }

  /**
   * Get complete performance profile snapshot
   * @returns {PerformanceProfile} Current performance profile
   */
  getProfile() {
    const now = Date.now();
    const uptime = performance.now() - this.startTime;
    
    // Calculate summary statistics
    const summary = {
      totalExecutions: this.totalExecutions,
      uniqueNodeTypes: this.nodeMetrics.size,
      uniqueEdgeTypes: this.edgeMetrics.size,
      uptimeMs: uptime,
      executionsPerSecond: (this.totalExecutions / (uptime / 1000)).toFixed(2),
      totalExecutionTime: Array.from(this.nodeMetrics.values())
        .reduce((sum, m) => sum + m.totalTime, 0),
      totalMemoryAllocated: Array.from(this.nodeMetrics.values())
        .reduce((sum, m) => sum + m.memoryAllocated, 0),
      totalErrors: Array.from(this.nodeMetrics.values())
        .reduce((sum, m) => sum + m.errorCount, 0),
      activeExecutions: this.activeExecutions.size
    };
    
    return {
      timestamp: now,
      nodeMetrics: new Map(this.nodeMetrics),
      edgeMetrics: new Map(this.edgeMetrics),
      summary
    };
  }

  /**
   * Export profile as JSON-serializable object
   * @returns {Object} Serializable profile data
   */
  exportProfile() {
    const profile = this.getProfile();
    
    return {
      timestamp: profile.timestamp,
      nodeMetrics: Array.from(profile.nodeMetrics.entries()).map(([type, metrics]) => ({
        type,
        ...metrics
      })),
      edgeMetrics: Array.from(profile.edgeMetrics.entries()).map(([type, metrics]) => ({
        type,
        ...metrics
      })),
      summary: profile.summary
    };
  }

  /**
   * Clear all collected metrics
   */
  reset() {
    this.nodeMetrics.clear();
    this.edgeMetrics.clear();
    this.activeExecutions.clear();
    this.startTime = performance.now();
    this.totalExecutions = 0;
  }

  /**
   * Clear metrics older than specified time window
   * @param {number} [windowMs=300000] - Time window in ms (default 5 minutes)
   */
  pruneOldMetrics(windowMs = 300000) {
    const cutoff = Date.now() - windowMs;
    
    // Remove node types with no recent executions
    for (const [nodeType, metrics] of this.nodeMetrics.entries()) {
      if (metrics.lastExecutionTime < cutoff) {
        this.nodeMetrics.delete(nodeType);
      }
    }
    
    // Remove edge types with no recent traversals
    for (const [edgeType, metrics] of this.edgeMetrics.entries()) {
      if (metrics.lastTraversalTime < cutoff) {
        this.edgeMetrics.delete(edgeType);
      }
    }
  }

  /**
   * Enable or disable profiling
   * @param {boolean} enabled - Whether to enable profiling
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      // Clear active executions when disabling
      this.activeExecutions.clear();
    }
  }

  /**
   * Get current memory usage (if available)
   * @private
   * @returns {number} Memory usage in bytes
   */
  _getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Generate optimization recommendations based on collected metrics
   * @returns {Array<Object>} Array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Find slow node types
    const slowNodes = this.getNodeTypesByExecutionTime(false).slice(0, 5);
    if (slowNodes.length > 0 && slowNodes[0].avgTime > 10) {
      recommendations.push({
        type: 'slow-nodes',
        severity: 'high',
        message: `Node type "${slowNodes[0].nodeType}" has high avg execution time: ${slowNodes[0].avgTime.toFixed(2)}ms`,
        suggestion: 'Consider optimizing or caching results for this node type',
        nodeTypes: slowNodes.map(n => n.nodeType)
      });
    }
    
    // Find frequently executed nodes
    const frequentNodes = this.getNodeTypesByFrequency(false).slice(0, 5);
    if (frequentNodes.length > 0 && frequentNodes[0].executionCount > 1000) {
      recommendations.push({
        type: 'hot-path',
        severity: 'medium',
        message: `Node type "${frequentNodes[0].nodeType}" executed ${frequentNodes[0].executionCount} times`,
        suggestion: 'Consider caching or batching operations for frequently executed nodes',
        nodeTypes: frequentNodes.map(n => n.nodeType)
      });
    }
    
    // Find problematic nodes
    const problematic = this.getProblematicNodeTypes(0.05);
    if (problematic.length > 0) {
      recommendations.push({
        type: 'high-error-rate',
        severity: 'critical',
        message: `${problematic.length} node type(s) have error rates above 5%`,
        suggestion: 'Investigate and fix error handling in these node types',
        nodeTypes: problematic.map(n => n.nodeType)
      });
    }
    
    // Check memory allocation
    const highMemoryNodes = Array.from(this.nodeMetrics.values())
      .filter(m => m.avgMemoryPerExecution > 1048576) // 1MB
      .sort((a, b) => b.avgMemoryPerExecution - a.avgMemoryPerExecution);
    
    if (highMemoryNodes.length > 0) {
      recommendations.push({
        type: 'high-memory',
        severity: 'medium',
        message: `Node type "${highMemoryNodes[0].nodeType}" allocates ${(highMemoryNodes[0].avgMemoryPerExecution / 1048576).toFixed(2)}MB per execution`,
        suggestion: 'Consider object pooling or reducing allocations',
        nodeTypes: highMemoryNodes.map(n => n.nodeType)
      });
    }
    
    return recommendations;
  }
}

/**
 * Global profiler instance
 * @type {PerformanceProfiler|null}
 */
let globalProfiler = null;

/**
 * Get or create the global profiler instance
 * @returns {PerformanceProfiler} Global profiler
 */
export function getGlobalProfiler() {
  if (!globalProfiler) {
    globalProfiler = new PerformanceProfiler();
  }
  return globalProfiler;
}

/**
 * Reset the global profiler instance
 */
export function resetGlobalProfiler() {
  if (globalProfiler) {
    globalProfiler.reset();
  }
}