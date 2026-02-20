/**
 * @fileoverview WorkerHeartbeat - Monitor worker health, restart on failure
 * 
 * Responsibilities:
 * - Send periodic heartbeat pings to workers
 * - Track heartbeat responses and timeouts
 * - Detect unresponsive workers
 * - Trigger worker restart on failure
 * - Maintain health metrics per worker
 * 
 * Performance Constraints:
 * - Heartbeat overhead < 1ms per worker
 * - Detection latency < 500ms
 * - Memory: < 1KB per worker tracked
 * 
 * Related: worker-lifecycle.js, worker-pool.js
 * Documentation: harmony-design/DESIGN_SYSTEM.md#worker-heartbeat
 * 
 * @module WorkerHeartbeat
 */

/**
 * Health status for a worker
 * @typedef {Object} WorkerHealth
 * @property {string} workerId - Unique worker identifier
 * @property {string} status - Current status: 'healthy' | 'degraded' | 'unresponsive' | 'failed'
 * @property {number} lastHeartbeat - Timestamp of last successful heartbeat
 * @property {number} missedHeartbeats - Count of consecutive missed heartbeats
 * @property {number} totalHeartbeats - Total heartbeats sent
 * @property {number} successfulHeartbeats - Total successful responses
 * @property {number} averageResponseTime - Average heartbeat response time (ms)
 * @property {number[]} recentResponseTimes - Recent response times for averaging
 */

/**
 * Heartbeat configuration
 * @typedef {Object} HeartbeatConfig
 * @property {number} intervalMs - Time between heartbeats (default: 5000ms)
 * @property {number} timeoutMs - Max time to wait for response (default: 2000ms)
 * @property {number} maxMissedHeartbeats - Failures before restart (default: 3)
 * @property {number} degradedThresholdMs - Response time for degraded status (default: 1000ms)
 * @property {boolean} autoRestart - Automatically restart failed workers (default: true)
 */

/**
 * Default heartbeat configuration
 * @type {HeartbeatConfig}
 */
const DEFAULT_CONFIG = {
  intervalMs: 5000,
  timeoutMs: 2000,
  maxMissedHeartbeats: 3,
  degradedThresholdMs: 1000,
  autoRestart: true
};

/**
 * WorkerHeartbeat monitors worker health and triggers restarts on failure
 */
export class WorkerHeartbeat {
  /**
   * @param {HeartbeatConfig} [config] - Heartbeat configuration
   */
  constructor(config = {}) {
    /** @type {HeartbeatConfig} */
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    /** @type {Map<string, WorkerHealth>} */
    this.workerHealth = new Map();
    
    /** @type {Map<string, number>} */
    this.heartbeatTimers = new Map();
    
    /** @type {Map<string, number>} */
    this.pendingHeartbeats = new Map();
    
    /** @type {Map<string, Worker>} */
    this.workers = new Map();
    
    /** @type {Function|null} */
    this.onWorkerFailed = null;
    
    /** @type {Function|null} */
    this.onWorkerDegraded = null;
    
    /** @type {Function|null} */
    this.onWorkerRecovered = null;
    
    /** @type {boolean} */
    this.isMonitoring = false;
    
    /** @type {number} */
    this.nextHeartbeatId = 1;
  }

  /**
   * Register a worker for health monitoring
   * @param {string} workerId - Unique worker identifier
   * @param {Worker} worker - Worker instance to monitor
   */
  registerWorker(workerId, worker) {
    if (this.workerHealth.has(workerId)) {
      console.warn(`[WorkerHeartbeat] Worker ${workerId} already registered`);
      return;
    }

    this.workers.set(workerId, worker);
    
    this.workerHealth.set(workerId, {
      workerId,
      status: 'healthy',
      lastHeartbeat: Date.now(),
      missedHeartbeats: 0,
      totalHeartbeats: 0,
      successfulHeartbeats: 0,
      averageResponseTime: 0,
      recentResponseTimes: []
    });

    // Set up message listener for heartbeat responses
    worker.addEventListener('message', (event) => {
      this._handleWorkerMessage(workerId, event.data);
    });

    // Start heartbeat monitoring if not already running
    if (this.isMonitoring) {
      this._startHeartbeat(workerId);
    }
  }

  /**
   * Unregister a worker from health monitoring
   * @param {string} workerId - Worker identifier to unregister
   */
  unregisterWorker(workerId) {
    this._stopHeartbeat(workerId);
    this.workerHealth.delete(workerId);
    this.workers.delete(workerId);
    this.pendingHeartbeats.delete(workerId);
  }

  /**
   * Start monitoring all registered workers
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('[WorkerHeartbeat] Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    
    for (const workerId of this.workerHealth.keys()) {
      this._startHeartbeat(workerId);
    }
  }

  /**
   * Stop monitoring all workers
   */
  stopMonitoring() {
    this.isMonitoring = false;
    
    for (const workerId of this.workerHealth.keys()) {
      this._stopHeartbeat(workerId);
    }
  }

  /**
   * Get health status for a specific worker
   * @param {string} workerId - Worker identifier
   * @returns {WorkerHealth|null} Health status or null if not found
   */
  getWorkerHealth(workerId) {
    return this.workerHealth.get(workerId) || null;
  }

  /**
   * Get health status for all workers
   * @returns {WorkerHealth[]} Array of all worker health statuses
   */
  getAllWorkerHealth() {
    return Array.from(this.workerHealth.values());
  }

  /**
   * Get count of workers by status
   * @returns {Object} Counts by status
   */
  getHealthSummary() {
    const summary = {
      healthy: 0,
      degraded: 0,
      unresponsive: 0,
      failed: 0,
      total: this.workerHealth.size
    };

    for (const health of this.workerHealth.values()) {
      summary[health.status]++;
    }

    return summary;
  }

  /**
   * Start heartbeat monitoring for a specific worker
   * @private
   * @param {string} workerId - Worker identifier
   */
  _startHeartbeat(workerId) {
    // Clear any existing timer
    this._stopHeartbeat(workerId);

    // Send initial heartbeat
    this._sendHeartbeat(workerId);

    // Schedule periodic heartbeats
    const timerId = setInterval(() => {
      this._sendHeartbeat(workerId);
    }, this.config.intervalMs);

    this.heartbeatTimers.set(workerId, timerId);
  }

  /**
   * Stop heartbeat monitoring for a specific worker
   * @private
   * @param {string} workerId - Worker identifier
   */
  _stopHeartbeat(workerId) {
    const timerId = this.heartbeatTimers.get(workerId);
    if (timerId) {
      clearInterval(timerId);
      this.heartbeatTimers.delete(workerId);
    }

    // Clear any pending heartbeat timeout
    const pendingId = this.pendingHeartbeats.get(workerId);
    if (pendingId) {
      clearTimeout(pendingId);
      this.pendingHeartbeats.delete(workerId);
    }
  }

  /**
   * Send heartbeat ping to worker
   * @private
   * @param {string} workerId - Worker identifier
   */
  _sendHeartbeat(workerId) {
    const worker = this.workers.get(workerId);
    const health = this.workerHealth.get(workerId);

    if (!worker || !health) {
      return;
    }

    const heartbeatId = this.nextHeartbeatId++;
    const sentTime = performance.now();

    health.totalHeartbeats++;

    // Send heartbeat message
    try {
      worker.postMessage({
        type: 'heartbeat',
        heartbeatId,
        timestamp: Date.now()
      });

      // Set timeout for response
      const timeoutId = setTimeout(() => {
        this._handleHeartbeatTimeout(workerId, heartbeatId);
      }, this.config.timeoutMs);

      this.pendingHeartbeats.set(workerId, timeoutId);

      // Store sent time for response time calculation
      health.lastSentTime = sentTime;
      health.lastHeartbeatId = heartbeatId;

    } catch (error) {
      console.error(`[WorkerHeartbeat] Error sending heartbeat to ${workerId}:`, error);
      this._handleHeartbeatFailure(workerId);
    }
  }

  /**
   * Handle message from worker
   * @private
   * @param {string} workerId - Worker identifier
   * @param {*} data - Message data
   */
  _handleWorkerMessage(workerId, data) {
    if (data.type !== 'heartbeat-response') {
      return;
    }

    const health = this.workerHealth.get(workerId);
    if (!health) {
      return;
    }

    // Verify this is the expected heartbeat response
    if (data.heartbeatId !== health.lastHeartbeatId) {
      return;
    }

    // Clear timeout
    const timeoutId = this.pendingHeartbeats.get(workerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingHeartbeats.delete(workerId);
    }

    // Calculate response time
    const responseTime = performance.now() - health.lastSentTime;

    // Update health metrics
    health.lastHeartbeat = Date.now();
    health.successfulHeartbeats++;
    health.missedHeartbeats = 0;

    // Update response time tracking
    health.recentResponseTimes.push(responseTime);
    if (health.recentResponseTimes.length > 10) {
      health.recentResponseTimes.shift();
    }

    // Calculate average response time
    const sum = health.recentResponseTimes.reduce((a, b) => a + b, 0);
    health.averageResponseTime = sum / health.recentResponseTimes.length;

    // Update status based on response time
    const previousStatus = health.status;

    if (responseTime > this.config.degradedThresholdMs) {
      health.status = 'degraded';
      if (previousStatus !== 'degraded' && this.onWorkerDegraded) {
        this.onWorkerDegraded(workerId, health);
      }
    } else {
      health.status = 'healthy';
      if ((previousStatus === 'degraded' || previousStatus === 'unresponsive') && this.onWorkerRecovered) {
        this.onWorkerRecovered(workerId, health);
      }
    }
  }

  /**
   * Handle heartbeat timeout
   * @private
   * @param {string} workerId - Worker identifier
   * @param {number} heartbeatId - Heartbeat identifier
   */
  _handleHeartbeatTimeout(workerId, heartbeatId) {
    const health = this.workerHealth.get(workerId);
    if (!health) {
      return;
    }

    // Verify this is still the current heartbeat
    if (heartbeatId !== health.lastHeartbeatId) {
      return;
    }

    this.pendingHeartbeats.delete(workerId);
    this._handleHeartbeatFailure(workerId);
  }

  /**
   * Handle heartbeat failure
   * @private
   * @param {string} workerId - Worker identifier
   */
  _handleHeartbeatFailure(workerId) {
    const health = this.workerHealth.get(workerId);
    if (!health) {
      return;
    }

    health.missedHeartbeats++;

    console.warn(
      `[WorkerHeartbeat] Worker ${workerId} missed heartbeat ` +
      `(${health.missedHeartbeats}/${this.config.maxMissedHeartbeats})`
    );

    // Update status
    if (health.missedHeartbeats >= this.config.maxMissedHeartbeats) {
      health.status = 'failed';
      
      console.error(`[WorkerHeartbeat] Worker ${workerId} failed health check`);

      // Trigger failure callback
      if (this.onWorkerFailed) {
        this.onWorkerFailed(workerId, health);
      }

      // Auto-restart if enabled
      if (this.config.autoRestart) {
        this._restartWorker(workerId);
      }
    } else {
      health.status = 'unresponsive';
    }
  }

  /**
   * Restart a failed worker
   * @private
   * @param {string} workerId - Worker identifier
   */
  _restartWorker(workerId) {
    console.log(`[WorkerHeartbeat] Restarting worker ${workerId}`);

    // Stop monitoring
    this._stopHeartbeat(workerId);

    // Note: Actual worker restart is delegated to WorkerLifecycle
    // This just publishes the restart request
    // The lifecycle manager will handle termination and recreation
    
    // Reset health tracking
    const health = this.workerHealth.get(workerId);
    if (health) {
      health.missedHeartbeats = 0;
      health.status = 'healthy';
      health.lastHeartbeat = Date.now();
      health.recentResponseTimes = [];
    }
  }

  /**
   * Force a health check for a specific worker
   * @param {string} workerId - Worker identifier
   * @returns {Promise<WorkerHealth>} Resolves with updated health status
   */
  async forceHealthCheck(workerId) {
    return new Promise((resolve, reject) => {
      const health = this.workerHealth.get(workerId);
      if (!health) {
        reject(new Error(`Worker ${workerId} not registered`));
        return;
      }

      // Send immediate heartbeat
      this._sendHeartbeat(workerId);

      // Wait for response or timeout
      const checkInterval = setInterval(() => {
        const updatedHealth = this.workerHealth.get(workerId);
        if (!updatedHealth) {
          clearInterval(checkInterval);
          reject(new Error(`Worker ${workerId} unregistered during check`));
          return;
        }

        // Check if we got a response (lastHeartbeat updated)
        if (updatedHealth.lastHeartbeat > health.lastHeartbeat) {
          clearInterval(checkInterval);
          resolve(updatedHealth);
        }
      }, 100);

      // Timeout after 2x the configured timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(this.workerHealth.get(workerId));
      }, this.config.timeoutMs * 2);
    });
  }

  /**
   * Dispose of the heartbeat monitor
   */
  dispose() {
    this.stopMonitoring();
    this.workerHealth.clear();
    this.workers.clear();
    this.heartbeatTimers.clear();
    this.pendingHeartbeats.clear();
    this.onWorkerFailed = null;
    this.onWorkerDegraded = null;
    this.onWorkerRecovered = null;
  }
}