/**
 * @fileoverview Error Recovery Strategies - Configurable recovery patterns
 * @module core/error-recovery/recovery-strategies
 * 
 * Provides retry, fallback, and circuit-breaker patterns for different error types.
 * Integrates with EventBus for error reporting and recovery coordination.
 * 
 * @see DESIGN_SYSTEM.md#error-recovery-strategies
 */

/**
 * @typedef {Object} RetryConfig
 * @property {number} maxAttempts - Maximum number of retry attempts
 * @property {number} initialDelay - Initial delay in ms before first retry
 * @property {number} maxDelay - Maximum delay in ms between retries
 * @property {number} backoffMultiplier - Multiplier for exponential backoff
 * @property {boolean} jitter - Add random jitter to prevent thundering herd
 * @property {Function} shouldRetry - Predicate to determine if error is retryable
 */

/**
 * @typedef {Object} FallbackConfig
 * @property {Function} fallbackFn - Function to execute as fallback
 * @property {any} defaultValue - Default value to return on failure
 * @property {boolean} cacheResult - Whether to cache fallback results
 * @property {number} cacheTTL - Cache TTL in ms
 */

/**
 * @typedef {Object} CircuitBreakerConfig
 * @property {number} failureThreshold - Number of failures before opening circuit
 * @property {number} successThreshold - Number of successes to close circuit
 * @property {number} timeout - Timeout in ms before attempting half-open
 * @property {number} monitoringWindow - Window in ms for failure rate calculation
 * @property {Function} onStateChange - Callback when circuit state changes
 */

/**
 * @typedef {Object} RecoveryStrategy
 * @property {'retry'|'fallback'|'circuit-breaker'|'composite'} type
 * @property {RetryConfig} [retry]
 * @property {FallbackConfig} [fallback]
 * @property {CircuitBreakerConfig} [circuitBreaker]
 * @property {RecoveryStrategy[]} [strategies] - For composite strategies
 */

/**
 * Circuit breaker states
 * @enum {string}
 */
const CircuitState = {
  CLOSED: 'closed',      // Normal operation
  OPEN: 'open',          // Blocking requests
  HALF_OPEN: 'half-open' // Testing if service recovered
};

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: (error) => {
    // Retry on network errors and 5xx server errors
    return error.code === 'NETWORK_ERROR' || 
           (error.statusCode >= 500 && error.statusCode < 600);
  }
};

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringWindow: 10000, // 10 seconds
  onStateChange: null
};

/**
 * Recovery strategy registry - maps error types to recovery strategies
 */
class RecoveryStrategyRegistry {
  constructor() {
    /** @type {Map<string, RecoveryStrategy>} */
    this.strategies = new Map();
    
    /** @type {Map<string, CircuitBreaker>} */
    this.circuitBreakers = new Map();
    
    /** @type {Map<string, any>} */
    this.fallbackCache = new Map();
    
    this.registerDefaultStrategies();
  }

  /**
   * Register default recovery strategies for common error types
   * @private
   */
  registerDefaultStrategies() {
    // Network errors - retry with exponential backoff
    this.register('NETWORK_ERROR', {
      type: 'retry',
      retry: {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3,
        initialDelay: 200
      }
    });

    // API errors - circuit breaker with fallback
    this.register('API_ERROR', {
      type: 'composite',
      strategies: [
        {
          type: 'circuit-breaker',
          circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG
        },
        {
          type: 'retry',
          retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxAttempts: 2
          }
        }
      ]
    });

    // Validation errors - no retry, immediate fallback
    this.register('VALIDATION_ERROR', {
      type: 'fallback',
      fallback: {
        fallbackFn: null, // Must be provided by caller
        defaultValue: null,
        cacheResult: false
      }
    });

    // Timeout errors - retry with shorter delays
    this.register('TIMEOUT_ERROR', {
      type: 'retry',
      retry: {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 2,
        initialDelay: 50,
        maxDelay: 1000
      }
    });

    // Resource exhaustion - circuit breaker
    this.register('RESOURCE_EXHAUSTED', {
      type: 'circuit-breaker',
      circuitBreaker: {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        failureThreshold: 3,
        timeout: 30000
      }
    });
  }

  /**
   * Register a recovery strategy for an error type
   * @param {string} errorType - Error type identifier
   * @param {RecoveryStrategy} strategy - Recovery strategy configuration
   */
  register(errorType, strategy) {
    this.strategies.set(errorType, strategy);
    
    // Initialize circuit breaker if needed
    if (strategy.type === 'circuit-breaker' || 
        (strategy.type === 'composite' && 
         strategy.strategies.some(s => s.type === 'circuit-breaker'))) {
      this.initializeCircuitBreaker(errorType, strategy);
    }
  }

  /**
   * Initialize circuit breaker for error type
   * @private
   * @param {string} errorType
   * @param {RecoveryStrategy} strategy
   */
  initializeCircuitBreaker(errorType, strategy) {
    const config = strategy.type === 'circuit-breaker' 
      ? strategy.circuitBreaker 
      : strategy.strategies.find(s => s.type === 'circuit-breaker')?.circuitBreaker;
    
    if (config) {
      this.circuitBreakers.set(errorType, new CircuitBreaker(errorType, config));
    }
  }

  /**
   * Get recovery strategy for error type
   * @param {string} errorType - Error type identifier
   * @returns {RecoveryStrategy|null}
   */
  get(errorType) {
    return this.strategies.get(errorType) || null;
  }

  /**
   * Get circuit breaker for error type
   * @param {string} errorType
   * @returns {CircuitBreaker|null}
   */
  getCircuitBreaker(errorType) {
    return this.circuitBreakers.get(errorType) || null;
  }

  /**
   * Clear all registered strategies
   */
  clear() {
    this.strategies.clear();
    this.circuitBreakers.clear();
    this.fallbackCache.clear();
  }
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  /**
   * @param {string} name - Circuit breaker identifier
   * @param {CircuitBreakerConfig} config - Configuration
   */
  constructor(name, config) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    /** @type {Array<{timestamp: number, success: boolean}>} */
    this.recentAttempts = [];
  }

  /**
   * Check if circuit allows request
   * @returns {boolean}
   */
  allowRequest() {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now >= this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        this.notifyStateChange();
        return true;
      }
      return false;
    }
    
    // HALF_OPEN - allow limited requests
    return true;
  }

  /**
   * Record successful request
   */
  recordSuccess() {
    this.cleanupOldAttempts();
    this.recentAttempts.push({ timestamp: Date.now(), success: true });
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  /**
   * Record failed request
   */
  recordFailure() {
    this.cleanupOldAttempts();
    this.recentAttempts.push({ timestamp: Date.now(), success: false });
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount++;
      const failureRate = this.calculateFailureRate();
      if (this.failureCount >= this.config.failureThreshold || failureRate > 0.5) {
        this.open();
      }
    }
  }

  /**
   * Calculate failure rate in monitoring window
   * @private
   * @returns {number}
   */
  calculateFailureRate() {
    if (this.recentAttempts.length === 0) return 0;
    
    const failures = this.recentAttempts.filter(a => !a.success).length;
    return failures / this.recentAttempts.length;
  }

  /**
   * Clean up attempts outside monitoring window
   * @private
   */
  cleanupOldAttempts() {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.recentAttempts = this.recentAttempts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Open the circuit
   * @private
   */
  open() {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.notifyStateChange();
  }

  /**
   * Close the circuit
   * @private
   */
  close() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.notifyStateChange();
  }

  /**
   * Notify state change callback
   * @private
   */
  notifyStateChange() {
    if (this.config.onStateChange) {
      this.config.onStateChange(this.state, {
        name: this.name,
        failureCount: this.failureCount,
        successCount: this.successCount,
        failureRate: this.calculateFailureRate()
      });
    }
  }

  /**
   * Get current circuit state
   * @returns {Object}
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate: this.calculateFailureRate(),
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

/**
 * Error recovery executor - applies recovery strategies to operations
 */
class ErrorRecoveryExecutor {
  /**
   * @param {RecoveryStrategyRegistry} registry
   */
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * Execute operation with recovery strategy
   * @param {Function} operation - Async operation to execute
   * @param {string} errorType - Error type for strategy lookup
   * @param {Object} [options] - Additional options
   * @returns {Promise<any>}
   */
  async execute(operation, errorType, options = {}) {
    const strategy = this.registry.get(errorType);
    
    if (!strategy) {
      // No strategy - execute directly
      return await operation();
    }

    switch (strategy.type) {
      case 'retry':
        return await this.executeWithRetry(operation, strategy.retry, options);
      
      case 'fallback':
        return await this.executeWithFallback(operation, strategy.fallback, options);
      
      case 'circuit-breaker':
        return await this.executeWithCircuitBreaker(operation, errorType, options);
      
      case 'composite':
        return await this.executeComposite(operation, strategy, errorType, options);
      
      default:
        return await operation();
    }
  }

  /**
   * Execute with retry strategy
   * @private
   * @param {Function} operation
   * @param {RetryConfig} config
   * @param {Object} options
   * @returns {Promise<any>}
   */
  async executeWithRetry(operation, config, options) {
    let lastError;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - publish recovery event if this was a retry
        if (attempt > 1 && window.eventBus) {
          window.eventBus.publish('error:recovered', {
            strategy: 'retry',
            attempt,
            ...options
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!config.shouldRetry(error)) {
          throw error;
        }
        
        // Last attempt - throw error
        if (attempt === config.maxAttempts) {
          if (window.eventBus) {
            window.eventBus.publish('error:recovery-failed', {
              strategy: 'retry',
              attempts: attempt,
              error: error.message,
              ...options
            });
          }
          throw error;
        }
        
        // Calculate delay with exponential backoff and jitter
        const backoffDelay = Math.min(
          delay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        const finalDelay = config.jitter 
          ? backoffDelay * (0.5 + Math.random() * 0.5)
          : backoffDelay;
        
        // Publish retry event
        if (window.eventBus) {
          window.eventBus.publish('error:retrying', {
            attempt,
            maxAttempts: config.maxAttempts,
            delay: finalDelay,
            error: error.message,
            ...options
          });
        }
        
        await this.sleep(finalDelay);
      }
    }

    throw lastError;
  }

  /**
   * Execute with fallback strategy
   * @private
   * @param {Function} operation
   * @param {FallbackConfig} config
   * @param {Object} options
   * @returns {Promise<any>}
   */
  async executeWithFallback(operation, config, options) {
    try {
      return await operation();
    } catch (error) {
      // Check cache first
      if (config.cacheResult && options.cacheKey) {
        const cached = this.registry.fallbackCache.get(options.cacheKey);
        if (cached && Date.now() < cached.expiry) {
          if (window.eventBus) {
            window.eventBus.publish('error:fallback-cache-hit', {
              cacheKey: options.cacheKey,
              ...options
            });
          }
          return cached.value;
        }
      }

      // Execute fallback
      let fallbackResult;
      if (config.fallbackFn) {
        fallbackResult = await config.fallbackFn(error);
      } else {
        fallbackResult = config.defaultValue;
      }

      // Cache result if configured
      if (config.cacheResult && options.cacheKey) {
        this.registry.fallbackCache.set(options.cacheKey, {
          value: fallbackResult,
          expiry: Date.now() + (config.cacheTTL || 60000)
        });
      }

      if (window.eventBus) {
        window.eventBus.publish('error:fallback-used', {
          error: error.message,
          hasFallbackFn: !!config.fallbackFn,
          ...options
        });
      }

      return fallbackResult;
    }
  }

  /**
   * Execute with circuit breaker
   * @private
   * @param {Function} operation
   * @param {string} errorType
   * @param {Object} options
   * @returns {Promise<any>}
   */
  async executeWithCircuitBreaker(operation, errorType, options) {
    const breaker = this.registry.getCircuitBreaker(errorType);
    
    if (!breaker) {
      return await operation();
    }

    if (!breaker.allowRequest()) {
      const error = new Error(`Circuit breaker open for ${errorType}`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      error.breakerState = breaker.getState();
      
      if (window.eventBus) {
        window.eventBus.publish('error:circuit-breaker-open', {
          errorType,
          state: breaker.getState(),
          ...options
        });
      }
      
      throw error;
    }

    try {
      const result = await operation();
      breaker.recordSuccess();
      return result;
    } catch (error) {
      breaker.recordFailure();
      throw error;
    }
  }

  /**
   * Execute with composite strategy
   * @private
   * @param {Function} operation
   * @param {RecoveryStrategy} strategy
   * @param {string} errorType
   * @param {Object} options
   * @returns {Promise<any>}
   */
  async executeComposite(operation, strategy, errorType, options) {
    let wrappedOperation = operation;

    // Apply strategies in reverse order (innermost first)
    for (let i = strategy.strategies.length - 1; i >= 0; i--) {
      const subStrategy = strategy.strategies[i];
      const currentOp = wrappedOperation;

      switch (subStrategy.type) {
        case 'retry':
          wrappedOperation = () => this.executeWithRetry(currentOp, subStrategy.retry, options);
          break;
        
        case 'fallback':
          wrappedOperation = () => this.executeWithFallback(currentOp, subStrategy.fallback, options);
          break;
        
        case 'circuit-breaker':
          wrappedOperation = () => this.executeWithCircuitBreaker(currentOp, errorType, options);
          break;
      }
    }

    return await wrappedOperation();
  }

  /**
   * Sleep for specified duration
   * @private
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instances
const recoveryRegistry = new RecoveryStrategyRegistry();
const recoveryExecutor = new ErrorRecoveryExecutor(recoveryRegistry);

/**
 * Execute operation with error recovery
 * @param {Function} operation - Async operation to execute
 * @param {string} errorType - Error type for strategy lookup
 * @param {Object} [options] - Additional options
 * @returns {Promise<any>}
 */
export async function withRecovery(operation, errorType, options = {}) {
  return await recoveryExecutor.execute(operation, errorType, options);
}

/**
 * Register custom recovery strategy
 * @param {string} errorType - Error type identifier
 * @param {RecoveryStrategy} strategy - Recovery strategy configuration
 */
export function registerRecoveryStrategy(errorType, strategy) {
  recoveryRegistry.register(errorType, strategy);
}

/**
 * Get circuit breaker state
 * @param {string} errorType - Error type identifier
 * @returns {Object|null}
 */
export function getCircuitBreakerState(errorType) {
  const breaker = recoveryRegistry.getCircuitBreaker(errorType);
  return breaker ? breaker.getState() : null;
}

/**
 * Get all circuit breaker states
 * @returns {Object}
 */
export function getAllCircuitBreakerStates() {
  const states = {};
  for (const [errorType, breaker] of recoveryRegistry.circuitBreakers) {
    states[errorType] = breaker.getState();
  }
  return states;
}

export {
  RecoveryStrategyRegistry,
  CircuitBreaker,
  ErrorRecoveryExecutor,
  CircuitState,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG
};