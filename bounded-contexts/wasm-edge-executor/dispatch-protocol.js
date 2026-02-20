/**
 * @fileoverview DispatchProtocol - Message format for dispatching code to workers/remotes
 * 
 * Defines standardized message structure for:
 * - Code bundle dispatch to Web Workers
 * - Remote execution requests
 * - Result streaming back to main thread
 * - Error propagation
 * - Resource cleanup
 * 
 * Performance constraints:
 * - Serialization overhead < 1ms per message
 * - Zero-copy transfers using Transferable objects
 * - Supports SharedArrayBuffer for audio data
 * 
 * Related: See DESIGN_SYSTEM.md § Distributed Execution
 * 
 * @module DispatchProtocol
 */

/**
 * Message type enumeration for dispatch protocol
 * @enum {string}
 */
export const MessageType = {
  // Dispatch operations
  DISPATCH_CODE: 'dispatch:code',
  DISPATCH_WASM: 'dispatch:wasm',
  DISPATCH_BUNDLE: 'dispatch:bundle',
  
  // Execution control
  EXECUTE: 'execute',
  CANCEL: 'cancel',
  PAUSE: 'pause',
  RESUME: 'resume',
  
  // Results and status
  RESULT: 'result',
  PROGRESS: 'progress',
  ERROR: 'error',
  COMPLETE: 'complete',
  
  // Resource management
  CLEANUP: 'cleanup',
  MEMORY_PRESSURE: 'memory:pressure',
  
  // Heartbeat and health
  PING: 'ping',
  PONG: 'pong',
  HEALTH_CHECK: 'health:check',
  HEALTH_REPORT: 'health:report'
};

/**
 * Priority levels for dispatch messages
 * @enum {number}
 */
export const Priority = {
  CRITICAL: 0,  // Audio processing, real-time operations
  HIGH: 1,      // User-initiated actions
  NORMAL: 2,    // Background graph computation
  LOW: 3        // Prefetch, cleanup
};

/**
 * Execution target types
 * @enum {string}
 */
export const TargetType = {
  WEB_WORKER: 'worker',
  SHARED_WORKER: 'shared-worker',
  SERVICE_WORKER: 'service-worker',
  WASM_MODULE: 'wasm',
  REMOTE_EDGE: 'remote-edge',
  GPU_COMPUTE: 'gpu-compute'
};

/**
 * Create a dispatch message for code execution
 * 
 * @param {Object} options - Message options
 * @param {string} options.type - Message type from MessageType enum
 * @param {string} options.requestId - Unique request identifier
 * @param {string} options.targetType - Target execution environment
 * @param {Object} options.payload - Message payload
 * @param {number} [options.priority=Priority.NORMAL] - Message priority
 * @param {number} [options.timeout=30000] - Execution timeout in ms
 * @param {Array<Transferable>} [options.transfer] - Transferable objects
 * @returns {DispatchMessage} Formatted dispatch message
 */
export function createDispatchMessage({
  type,
  requestId,
  targetType,
  payload,
  priority = Priority.NORMAL,
  timeout = 30000,
  transfer = []
}) {
  return {
    version: '1.0',
    type,
    requestId,
    targetType,
    priority,
    timestamp: performance.now(),
    timeout,
    payload,
    transfer
  };
}

/**
 * Create a code dispatch message
 * 
 * @param {Object} options - Code dispatch options
 * @param {string} options.requestId - Unique request identifier
 * @param {string} options.code - JavaScript code to execute
 * @param {string} [options.codeHash] - Content-addressable hash
 * @param {Object} [options.context] - Execution context/arguments
 * @param {Array<string>} [options.dependencies] - Required dependencies
 * @param {string} options.targetType - Target execution environment
 * @param {number} [options.priority] - Execution priority
 * @returns {DispatchMessage} Code dispatch message
 */
export function createCodeDispatch({
  requestId,
  code,
  codeHash,
  context = {},
  dependencies = [],
  targetType = TargetType.WEB_WORKER,
  priority = Priority.NORMAL
}) {
  return createDispatchMessage({
    type: MessageType.DISPATCH_CODE,
    requestId,
    targetType,
    priority,
    payload: {
      code,
      codeHash,
      context,
      dependencies,
      sourceMap: null // Optional source map for debugging
    }
  });
}

/**
 * Create a WASM dispatch message
 * 
 * @param {Object} options - WASM dispatch options
 * @param {string} options.requestId - Unique request identifier
 * @param {ArrayBuffer} options.wasmBinary - WASM module binary
 * @param {string} [options.wasmHash] - Content-addressable hash
 * @param {string} options.entryPoint - Function to execute
 * @param {Object} [options.imports] - WASM imports
 * @param {Object} [options.memory] - Memory configuration
 * @param {Array<any>} [options.args] - Function arguments
 * @param {string} options.targetType - Target execution environment
 * @param {number} [options.priority] - Execution priority
 * @returns {DispatchMessage} WASM dispatch message
 */
export function createWasmDispatch({
  requestId,
  wasmBinary,
  wasmHash,
  entryPoint,
  imports = {},
  memory = { initial: 256, maximum: 512 },
  args = [],
  targetType = TargetType.WASM_MODULE,
  priority = Priority.NORMAL
}) {
  return createDispatchMessage({
    type: MessageType.DISPATCH_WASM,
    requestId,
    targetType,
    priority,
    payload: {
      wasmBinary,
      wasmHash,
      entryPoint,
      imports,
      memory,
      args
    },
    transfer: [wasmBinary]
  });
}

/**
 * Create a bundle dispatch message
 * 
 * @param {Object} options - Bundle dispatch options
 * @param {string} options.requestId - Unique request identifier
 * @param {Object} options.manifest - Bundle manifest
 * @param {Map<string, ArrayBuffer>} options.modules - Module binaries
 * @param {string} options.entryPoint - Entry module/function
 * @param {Object} [options.context] - Execution context
 * @param {string} options.targetType - Target execution environment
 * @param {number} [options.priority] - Execution priority
 * @returns {DispatchMessage} Bundle dispatch message
 */
export function createBundleDispatch({
  requestId,
  manifest,
  modules,
  entryPoint,
  context = {},
  targetType = TargetType.WEB_WORKER,
  priority = Priority.NORMAL
}) {
  const modulesArray = Array.from(modules.entries()).map(([id, binary]) => ({
    id,
    binary
  }));
  
  const transferables = modulesArray.map(m => m.binary);
  
  return createDispatchMessage({
    type: MessageType.DISPATCH_BUNDLE,
    requestId,
    targetType,
    priority,
    payload: {
      manifest,
      modules: modulesArray,
      entryPoint,
      context
    },
    transfer: transferables
  });
}

/**
 * Create an execution message
 * 
 * @param {string} requestId - Request identifier
 * @param {Object} [args={}] - Execution arguments
 * @param {number} [priority] - Execution priority
 * @returns {DispatchMessage} Execution message
 */
export function createExecuteMessage(requestId, args = {}, priority = Priority.NORMAL) {
  return createDispatchMessage({
    type: MessageType.EXECUTE,
    requestId,
    targetType: TargetType.WEB_WORKER,
    priority,
    payload: { args }
  });
}

/**
 * Create a result message
 * 
 * @param {string} requestId - Request identifier
 * @param {any} result - Execution result
 * @param {Object} [metadata={}] - Result metadata (timing, memory, etc.)
 * @returns {DispatchMessage} Result message
 */
export function createResultMessage(requestId, result, metadata = {}) {
  return createDispatchMessage({
    type: MessageType.RESULT,
    requestId,
    targetType: TargetType.WEB_WORKER,
    payload: {
      result,
      metadata: {
        executionTime: metadata.executionTime || 0,
        memoryUsed: metadata.memoryUsed || 0,
        ...metadata
      }
    }
  });
}

/**
 * Create a progress message
 * 
 * @param {string} requestId - Request identifier
 * @param {number} progress - Progress value (0-1)
 * @param {string} [status] - Status message
 * @returns {DispatchMessage} Progress message
 */
export function createProgressMessage(requestId, progress, status = '') {
  return createDispatchMessage({
    type: MessageType.PROGRESS,
    requestId,
    targetType: TargetType.WEB_WORKER,
    payload: { progress, status }
  });
}

/**
 * Create an error message
 * 
 * @param {string} requestId - Request identifier
 * @param {Error|string} error - Error object or message
 * @param {Object} [context={}] - Error context
 * @returns {DispatchMessage} Error message
 */
export function createErrorMessage(requestId, error, context = {}) {
  const errorPayload = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name
  } : {
    message: String(error)
  };
  
  return createDispatchMessage({
    type: MessageType.ERROR,
    requestId,
    targetType: TargetType.WEB_WORKER,
    payload: {
      error: errorPayload,
      context
    }
  });
}

/**
 * Create a completion message
 * 
 * @param {string} requestId - Request identifier
 * @param {Object} [summary={}] - Execution summary
 * @returns {DispatchMessage} Completion message
 */
export function createCompleteMessage(requestId, summary = {}) {
  return createDispatchMessage({
    type: MessageType.COMPLETE,
    requestId,
    targetType: TargetType.WEB_WORKER,
    payload: { summary }
  });
}

/**
 * Create a cancel message
 * 
 * @param {string} requestId - Request identifier
 * @param {string} [reason] - Cancellation reason
 * @returns {DispatchMessage} Cancel message
 */
export function createCancelMessage(requestId, reason = '') {
  return createDispatchMessage({
    type: MessageType.CANCEL,
    requestId,
    targetType: TargetType.WEB_WORKER,
    priority: Priority.HIGH,
    payload: { reason }
  });
}

/**
 * Create a cleanup message
 * 
 * @param {string} requestId - Request identifier
 * @param {Array<string>} [resources=[]] - Resources to cleanup
 * @returns {DispatchMessage} Cleanup message
 */
export function createCleanupMessage(requestId, resources = []) {
  return createDispatchMessage({
    type: MessageType.CLEANUP,
    requestId,
    targetType: TargetType.WEB_WORKER,
    priority: Priority.LOW,
    payload: { resources }
  });
}

/**
 * Create a health check message
 * 
 * @param {string} requestId - Request identifier
 * @returns {DispatchMessage} Health check message
 */
export function createHealthCheckMessage(requestId) {
  return createDispatchMessage({
    type: MessageType.HEALTH_CHECK,
    requestId,
    targetType: TargetType.WEB_WORKER,
    priority: Priority.HIGH,
    timeout: 5000,
    payload: {}
  });
}

/**
 * Create a health report message
 * 
 * @param {string} requestId - Request identifier
 * @param {Object} health - Health metrics
 * @returns {DispatchMessage} Health report message
 */
export function createHealthReportMessage(requestId, health) {
  return createDispatchMessage({
    type: MessageType.HEALTH_REPORT,
    requestId,
    targetType: TargetType.WEB_WORKER,
    payload: {
      health: {
        memoryUsage: health.memoryUsage || 0,
        cpuUsage: health.cpuUsage || 0,
        queueDepth: health.queueDepth || 0,
        activeRequests: health.activeRequests || 0,
        uptime: health.uptime || 0,
        ...health
      }
    }
  });
}

/**
 * Validate a dispatch message
 * 
 * @param {Object} message - Message to validate
 * @returns {{valid: boolean, errors: Array<string>}} Validation result
 */
export function validateMessage(message) {
  const errors = [];
  
  if (!message || typeof message !== 'object') {
    errors.push('Message must be an object');
    return { valid: false, errors };
  }
  
  if (!message.version) {
    errors.push('Missing version field');
  }
  
  if (!message.type || !Object.values(MessageType).includes(message.type)) {
    errors.push('Invalid or missing message type');
  }
  
  if (!message.requestId || typeof message.requestId !== 'string') {
    errors.push('Invalid or missing requestId');
  }
  
  if (!message.targetType || !Object.values(TargetType).includes(message.targetType)) {
    errors.push('Invalid or missing targetType');
  }
  
  if (typeof message.priority !== 'number' || 
      !Object.values(Priority).includes(message.priority)) {
    errors.push('Invalid priority');
  }
  
  if (typeof message.timestamp !== 'number') {
    errors.push('Invalid timestamp');
  }
  
  if (typeof message.timeout !== 'number' || message.timeout <= 0) {
    errors.push('Invalid timeout');
  }
  
  if (!message.payload || typeof message.payload !== 'object') {
    errors.push('Missing or invalid payload');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Serialize a message for transmission
 * Performance target: < 1ms for typical messages
 * 
 * @param {DispatchMessage} message - Message to serialize
 * @returns {{data: string, transfer: Array<Transferable>}} Serialized message
 */
export function serializeMessage(message) {
  const transfer = message.transfer || [];
  
  // Clone message without transfer array to avoid serialization issues
  const { transfer: _, ...serializableMessage } = message;
  
  return {
    data: JSON.stringify(serializableMessage),
    transfer
  };
}

/**
 * Deserialize a message from transmission
 * 
 * @param {string} data - Serialized message data
 * @returns {DispatchMessage} Deserialized message
 */
export function deserializeMessage(data) {
  try {
    const message = JSON.parse(data);
    return message;
  } catch (error) {
    throw new Error(`Failed to deserialize message: ${error.message}`);
  }
}

/**
 * Create a message router for handling dispatch messages
 * 
 * @returns {MessageRouter} Message router instance
 */
export function createMessageRouter() {
  const handlers = new Map();
  
  return {
    /**
     * Register a handler for a message type
     * @param {string} type - Message type
     * @param {Function} handler - Handler function
     */
    on(type, handler) {
      if (!handlers.has(type)) {
        handlers.set(type, []);
      }
      handlers.get(type).push(handler);
    },
    
    /**
     * Unregister a handler
     * @param {string} type - Message type
     * @param {Function} handler - Handler function
     */
    off(type, handler) {
      if (handlers.has(type)) {
        const typeHandlers = handlers.get(type);
        const index = typeHandlers.indexOf(handler);
        if (index !== -1) {
          typeHandlers.splice(index, 1);
        }
      }
    },
    
    /**
     * Route a message to registered handlers
     * @param {DispatchMessage} message - Message to route
     * @returns {Promise<Array<any>>} Handler results
     */
    async route(message) {
      const validation = validateMessage(message);
      if (!validation.valid) {
        console.error('Invalid message:', validation.errors);
        throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
      }
      
      const typeHandlers = handlers.get(message.type) || [];
      if (typeHandlers.length === 0) {
        console.warn(`No handlers registered for message type: ${message.type}`);
        return [];
      }
      
      const results = await Promise.all(
        typeHandlers.map(handler => handler(message))
      );
      
      return results;
    },
    
    /**
     * Clear all handlers
     */
    clear() {
      handlers.clear();
    }
  };
}

/**
 * @typedef {Object} DispatchMessage
 * @property {string} version - Protocol version
 * @property {string} type - Message type
 * @property {string} requestId - Unique request identifier
 * @property {string} targetType - Target execution environment
 * @property {number} priority - Message priority
 * @property {number} timestamp - Message timestamp (performance.now())
 * @property {number} timeout - Execution timeout in milliseconds
 * @property {Object} payload - Message payload
 * @property {Array<Transferable>} [transfer] - Transferable objects
 */

/**
 * @typedef {Object} MessageRouter
 * @property {Function} on - Register message handler
 * @property {Function} off - Unregister message handler
 * @property {Function} route - Route message to handlers
 * @property {Function} clear - Clear all handlers
 */