/**
 * @fileoverview Worker Resource Monitor - Monitors Web Worker resource usage
 * @module security/worker-resource-monitor
 * 
 * Tracks resource usage for code executing in Web Workers.
 * Provides termination capabilities when limits are exceeded.
 * 
 * Related: security/resource-limits-enforcer.js
 * Documentation: harmony-design/DESIGN_SYSTEM.md#worker-resource-monitoring
 */

import { globalResourceLimits } from './resource-limits-enforcer.js';

/**
 * Monitor resource usage for Web Workers
 */
export class WorkerResourceMonitor {
  /**
   * @param {ResourceLimitsEnforcer} [enforcer] - Resource limits enforcer to use
   */
  constructor(enforcer = globalResourceLimits) {
    this.enforcer = enforcer;

    /** @type {Map<string, Worker>} */
    this.workers = new Map();

    /** @type {Map<string, number>} */
    this.startTimes = new Map();

    /** @type {Map<string, MessageChannel>} */
    this.channels = new Map();
  }

  /**
   * Register a Worker for monitoring
   * @param {string} executionId - Unique execution ID
   * @param {Worker} worker - Worker instance
   * @returns {void}
   */
  registerWorker(executionId, worker) {
    this.workers.set(executionId, worker);
    this.startTimes.set(executionId, performance.now());

    // Create message channel for resource updates
    const channel = new MessageChannel();
    this.channels.set(executionId, channel);

    // Listen for resource updates from worker
    channel.port1.onmessage = (event) => {
      this._handleWorkerMessage(executionId, event.data);
    };

    // Send port to worker for reporting
    worker.postMessage({
      type: 'resource-monitor-init',
      executionId,
      port: channel.port2
    }, [channel.port2]);

    // Start monitoring with enforcer
    this.enforcer.startMonitoring(executionId, {
      terminate: () => this.terminateWorker(executionId)
    });
  }

  /**
   * Unregister a Worker
   * @param {string} executionId - Execution ID
   * @returns {void}
   */
  unregisterWorker(executionId) {
    this.enforcer.stopMonitoring(executionId);
    
    const channel = this.channels.get(executionId);
    if (channel) {
      channel.port1.close();
    }

    this.workers.delete(executionId);
    this.startTimes.delete(executionId);
    this.channels.delete(executionId);
  }

  /**
   * Terminate a Worker
   * @param {string} executionId - Execution ID
   * @returns {void}
   */
  terminateWorker(executionId) {
    const worker = this.workers.get(executionId);
    if (!worker) return;

    console.warn(`[WorkerResourceMonitor] Terminating worker: ${executionId}`);

    worker.terminate();
    this.unregisterWorker(executionId);
  }

  /**
   * Handle message from worker
   * @private
   * @param {string} executionId - Execution ID
   * @param {Object} data - Message data
   * @returns {void}
   */
  _handleWorkerMessage(executionId, data) {
    if (data.type === 'resource-usage') {
      // Update memory usage
      if (data.memoryUsed !== undefined) {
        this.enforcer.updateMemoryUsage(executionId, data.memoryUsed);
      }

      // Update CPU time
      const startTime = this.startTimes.get(executionId);
      if (startTime !== undefined) {
        const cpuTime = performance.now() - startTime;
        this.enforcer.updateCpuTime(executionId, cpuTime);
      }
    }
  }

  /**
   * Get worker monitoring script
   * This script should be injected into workers to enable monitoring
   * @returns {string} Worker script code
   */
  static getMonitoringScript() {
    return `
      let resourceMonitorPort = null;
      let executionId = null;
      let memoryCheckInterval = null;

      self.addEventListener('message', (event) => {
        if (event.data.type === 'resource-monitor-init') {
          executionId = event.data.executionId;
          resourceMonitorPort = event.data.port;

          // Start periodic memory reporting
          memoryCheckInterval = setInterval(() => {
            reportResourceUsage();
          }, 100); // Report every 100ms
        }
      });

      function reportResourceUsage() {
        if (!resourceMonitorPort) return;

        const memoryUsed = performance.memory 
          ? performance.memory.usedJSHeapSize 
          : 0;

        resourceMonitorPort.postMessage({
          type: 'resource-usage',
          memoryUsed,
          timestamp: performance.now()
        });
      }

      // Clean up on termination
      self.addEventListener('beforeunload', () => {
        if (memoryCheckInterval) {
          clearInterval(memoryCheckInterval);
        }
      });
    `;
  }
}

/**
 * Global Worker resource monitor instance
 * @type {WorkerResourceMonitor}
 */
export const globalWorkerMonitor = new WorkerResourceMonitor();