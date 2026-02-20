/**
 * @fileoverview Worker-side heartbeat responder
 * 
 * This module runs inside WebWorkers to respond to heartbeat pings.
 * Lightweight implementation to minimize overhead on worker threads.
 * 
 * Performance: < 0.1ms per heartbeat response
 * 
 * Usage:
 * Import this module in worker scripts to enable heartbeat responses:
 * importScripts('worker-heartbeat-responder.js');
 * 
 * @module WorkerHeartbeatResponder
 */

/**
 * Handle heartbeat messages from main thread
 * @param {MessageEvent} event - Message event
 */
function handleHeartbeat(event) {
  const data = event.data;
  
  if (data.type === 'heartbeat') {
    // Respond immediately with heartbeat acknowledgment
    self.postMessage({
      type: 'heartbeat-response',
      heartbeatId: data.heartbeatId,
      timestamp: Date.now(),
      workerId: self.name || 'unknown'
    });
  }
}

// Register heartbeat handler
self.addEventListener('message', handleHeartbeat);

// Export for ES modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleHeartbeat };
}