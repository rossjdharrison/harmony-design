/**
 * @fileoverview Worker script for sandboxed code execution
 * 
 * Runs in a WebWorker context to execute dispatched code in isolation.
 * Communicates with WorkerPool via DispatchProtocol messages.
 * 
 * Related: See DESIGN_SYSTEM.md § WASM Edge Executor - Sandboxed Worker
 * 
 * @module bounded-contexts/wasm-edge-executor/sandboxed-executor-worker
 */

import { DispatchProtocol } from './dispatch-protocol.js';

/**
 * Execute code in sandboxed context.
 * 
 * @param {string} code - JavaScript code to execute
 * @param {Object} context - Execution context (inputs, dependencies)
 * @returns {Object} Execution result
 */
function executeCode(code, context) {
  // Create a sandboxed function
  const fn = new Function('context', `
    'use strict';
    const { inputs, dependencies } = context;
    ${code}
  `);

  // Execute with context
  return fn(context);
}

/**
 * Handle messages from the main thread.
 */
self.onmessage = async (event) => {
  const message = event.data;

  // Validate message
  if (!DispatchProtocol.validate(message)) {
    const errorResponse = DispatchProtocol.createErrorMessage(
      'Invalid message format',
      message.taskId || 'unknown'
    );
    self.postMessage(errorResponse);
    return;
  }

  if (message.type !== 'execute') {
    const errorResponse = DispatchProtocol.createErrorMessage(
      `Unsupported message type: ${message.type}`,
      message.taskId
    );
    self.postMessage(errorResponse);
    return;
  }

  try {
    // Execute the code
    const result = executeCode(message.code, message.context);

    // Send result back
    const response = DispatchProtocol.createResultMessage(
      result,
      message.taskId
    );
    self.postMessage(response);

  } catch (error) {
    // Send error back
    const errorResponse = DispatchProtocol.createErrorMessage(
      error.message,
      message.taskId
    );
    self.postMessage(errorResponse);
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });