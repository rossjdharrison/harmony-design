/**
 * @fileoverview ExecutionContext - Provides context (inputs, outputs, events) to dispatched code
 * 
 * This component creates an execution context that wraps dispatched code with:
 * - Input data access
 * - Output data collection
 * - Event publishing capabilities
 * - Resource access control
 * 
 * Related files:
 * - dispatch-protocol.js: Message format definitions
 * - sandboxed-executor.js: Execution environment
 * - dispatch-router.js: Routing logic
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#execution-context
 */

/**
 * ExecutionContext provides a controlled environment for dispatched code
 * with access to inputs, outputs, and event publishing.
 * 
 * @class ExecutionContext
 * @example
 * const context = new ExecutionContext({
 *   inputs: { audioBuffer: Float32Array, sampleRate: 48000 },
 *   allowedEvents: ['processing.complete', 'processing.error'],
 *   resourceLimits: { maxMemory: 50 * 1024 * 1024 }
 * });
 * 
 * const result = await context.execute(codeBundle);
 */
export class ExecutionContext {
  /**
   * @param {Object} config - Configuration for the execution context
   * @param {Object} config.inputs - Input data available to the code
   * @param {string[]} config.allowedEvents - Event types that can be published
   * @param {Object} config.resourceLimits - Resource limits for execution
   * @param {number} config.resourceLimits.maxMemory - Maximum memory in bytes
   * @param {number} config.resourceLimits.maxExecutionTime - Maximum execution time in ms
   * @param {Function} config.eventPublisher - Function to publish events
   */
  constructor(config = {}) {
    this.inputs = config.inputs || {};
    this.outputs = {};
    this.allowedEvents = new Set(config.allowedEvents || []);
    this.resourceLimits = {
      maxMemory: config.resourceLimits?.maxMemory || 50 * 1024 * 1024, // 50MB default
      maxExecutionTime: config.resourceLimits?.maxExecutionTime || 5000, // 5s default
    };
    this.eventPublisher = config.eventPublisher || this._defaultEventPublisher.bind(this);
    this.publishedEvents = [];
    this.startTime = null;
    this.memoryUsage = 0;
  }

  /**
   * Creates a context object that will be passed to dispatched code
   * 
   * @returns {Object} Context object with controlled API
   */
  createContextAPI() {
    const self = this;
    
    return {
      /**
       * Access input data (read-only)
       */
      inputs: Object.freeze({ ...this.inputs }),
      
      /**
       * Set output data
       * 
       * @param {string} key - Output key
       * @param {*} value - Output value
       */
      setOutput(key, value) {
        self.outputs[key] = value;
      },
      
      /**
       * Get current outputs
       * 
       * @returns {Object} Current outputs
       */
      getOutputs() {
        return { ...self.outputs };
      },
      
      /**
       * Publish an event
       * 
       * @param {string} eventType - Event type
       * @param {*} payload - Event payload
       * @throws {Error} If event type is not allowed
       */
      publishEvent(eventType, payload) {
        if (!self.allowedEvents.has(eventType)) {
          throw new Error(`Event type not allowed: ${eventType}`);
        }
        
        const event = {
          type: eventType,
          payload,
          timestamp: performance.now(),
        };
        
        self.publishedEvents.push(event);
        self.eventPublisher(event);
      },
      
      /**
       * Check if execution time limit is approaching
       * 
       * @returns {boolean} True if more than 80% of time limit used
       */
      isTimeoutApproaching() {
        const elapsed = performance.now() - self.startTime;
        return elapsed > (self.resourceLimits.maxExecutionTime * 0.8);
      },
      
      /**
       * Get elapsed execution time
       * 
       * @returns {number} Elapsed time in milliseconds
       */
      getElapsedTime() {
        return performance.now() - self.startTime;
      },
      
      /**
       * Log a message (controlled logging)
       * 
       * @param {string} level - Log level (info, warn, error)
       * @param {string} message - Log message
       */
      log(level, message) {
        self.publishEvent('execution.log', { level, message });
      },
    };
  }

  /**
   * Execute code within this context
   * 
   * @param {Function} codeFunction - Function to execute
   * @returns {Promise<Object>} Execution result with outputs and events
   * @throws {Error} If execution fails or exceeds limits
   */
  async execute(codeFunction) {
    this.startTime = performance.now();
    this.outputs = {};
    this.publishedEvents = [];
    
    const contextAPI = this.createContextAPI();
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout after ${this.resourceLimits.maxExecutionTime}ms`));
      }, this.resourceLimits.maxExecutionTime);
    });
    
    try {
      // Execute with timeout
      const executionPromise = Promise.resolve(codeFunction(contextAPI));
      await Promise.race([executionPromise, timeoutPromise]);
      
      const executionTime = performance.now() - this.startTime;
      
      return {
        success: true,
        outputs: this.outputs,
        events: this.publishedEvents,
        executionTime,
        memoryUsage: this.memoryUsage,
      };
    } catch (error) {
      const executionTime = performance.now() - this.startTime;
      
      // Publish error event if allowed
      if (this.allowedEvents.has('execution.error')) {
        this.eventPublisher({
          type: 'execution.error',
          payload: {
            message: error.message,
            stack: error.stack,
          },
          timestamp: performance.now(),
        });
      }
      
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
        },
        outputs: this.outputs,
        events: this.publishedEvents,
        executionTime,
      };
    }
  }

  /**
   * Execute code from a string (with additional sandboxing)
   * 
   * @param {string} codeString - Code to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeString(codeString) {
    // Create a function from the code string
    // The code should expect a 'context' parameter
    const wrappedCode = `
      return (async function(context) {
        ${codeString}
      });
    `;
    
    try {
      // eslint-disable-next-line no-new-func
      const codeFunction = new Function(wrappedCode)();
      return await this.execute(codeFunction);
    } catch (error) {
      return {
        success: false,
        error: {
          message: `Code compilation error: ${error.message}`,
          stack: error.stack,
        },
        outputs: {},
        events: [],
        executionTime: 0,
      };
    }
  }

  /**
   * Default event publisher (logs to console)
   * 
   * @private
   * @param {Object} event - Event to publish
   */
  _defaultEventPublisher(event) {
    console.log('[ExecutionContext]', event.type, event.payload);
  }

  /**
   * Estimate memory usage (approximation)
   * 
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    // Rough estimation based on JSON serialization size
    const inputsSize = JSON.stringify(this.inputs).length;
    const outputsSize = JSON.stringify(this.outputs).length;
    const eventsSize = JSON.stringify(this.publishedEvents).length;
    
    this.memoryUsage = inputsSize + outputsSize + eventsSize;
    return this.memoryUsage;
  }

  /**
   * Check if memory limit is exceeded
   * 
   * @returns {boolean} True if memory limit exceeded
   */
  isMemoryLimitExceeded() {
    this.estimateMemoryUsage();
    return this.memoryUsage > this.resourceLimits.maxMemory;
  }

  /**
   * Clear context (reset outputs and events)
   */
  clear() {
    this.outputs = {};
    this.publishedEvents = [];
    this.startTime = null;
    this.memoryUsage = 0;
  }

  /**
   * Clone context with new inputs
   * 
   * @param {Object} newInputs - New input data
   * @returns {ExecutionContext} New context instance
   */
  clone(newInputs = {}) {
    return new ExecutionContext({
      inputs: { ...this.inputs, ...newInputs },
      allowedEvents: Array.from(this.allowedEvents),
      resourceLimits: { ...this.resourceLimits },
      eventPublisher: this.eventPublisher,
    });
  }
}

/**
 * Factory for creating execution contexts with common configurations
 * 
 * @class ExecutionContextFactory
 */
export class ExecutionContextFactory {
  /**
   * Create context for audio processing
   * 
   * @param {Object} inputs - Audio processing inputs
   * @returns {ExecutionContext} Configured context
   */
  static createAudioContext(inputs) {
    return new ExecutionContext({
      inputs,
      allowedEvents: [
        'audio.processing.complete',
        'audio.processing.error',
        'audio.processing.progress',
        'execution.log',
        'execution.error',
      ],
      resourceLimits: {
        maxMemory: 50 * 1024 * 1024, // 50MB
        maxExecutionTime: 10, // 10ms for audio processing
      },
    });
  }

  /**
   * Create context for graph node execution
   * 
   * @param {Object} inputs - Node inputs
   * @returns {ExecutionContext} Configured context
   */
  static createNodeContext(inputs) {
    return new ExecutionContext({
      inputs,
      allowedEvents: [
        'node.execution.complete',
        'node.execution.error',
        'node.output.updated',
        'execution.log',
        'execution.error',
      ],
      resourceLimits: {
        maxMemory: 10 * 1024 * 1024, // 10MB per node
        maxExecutionTime: 16, // 16ms per frame
      },
    });
  }

  /**
   * Create context for general computation
   * 
   * @param {Object} inputs - Computation inputs
   * @returns {ExecutionContext} Configured context
   */
  static createComputeContext(inputs) {
    return new ExecutionContext({
      inputs,
      allowedEvents: [
        'compute.complete',
        'compute.error',
        'compute.progress',
        'execution.log',
        'execution.error',
      ],
      resourceLimits: {
        maxMemory: 100 * 1024 * 1024, // 100MB
        maxExecutionTime: 5000, // 5s
      },
    });
  }
}