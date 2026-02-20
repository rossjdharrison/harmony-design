/**
 * @fileoverview Optimistic Mutation Wrapper
 * 
 * Provides instant UI updates with automatic rollback on failure.
 * Integrates with EventBus for command/event pattern.
 * 
 * @module utils/optimistic-mutation
 * @see {@link file://./DESIGN_SYSTEM.md#optimistic-mutations}
 */

/**
 * @typedef {Object} MutationConfig
 * @property {Function} mutationFn - Async function that performs the actual mutation
 * @property {Function} onMutate - Function called immediately before mutation (returns rollback data)
 * @property {Function} onSuccess - Function called on successful mutation
 * @property {Function} onError - Function called on mutation failure (receives rollback data)
 * @property {Function} onSettled - Function called after mutation completes (success or failure)
 * @property {number} [timeout=5000] - Timeout in ms before mutation is considered failed
 * @property {boolean} [autoRollback=true] - Whether to automatically rollback on error
 */

/**
 * @typedef {Object} MutationResult
 * @property {Function} execute - Execute the mutation with given variables
 * @property {boolean} isLoading - Whether mutation is currently in progress
 * @property {Error|null} error - Error from last mutation attempt
 * @property {*} data - Data from last successful mutation
 * @property {Function} reset - Reset mutation state
 */

/**
 * Creates an optimistic mutation wrapper
 * 
 * @param {MutationConfig} config - Mutation configuration
 * @returns {MutationResult} Mutation controller
 * 
 * @example
 * const updateUserMutation = createOptimisticMutation({
 *   mutationFn: async (userData) => {
 *     return await fetch('/api/user', {
 *       method: 'PUT',
 *       body: JSON.stringify(userData)
 *     }).then(r => r.json());
 *   },
 *   onMutate: (userData) => {
 *     const previousData = getCurrentUser();
 *     updateUIWithUser(userData); // Instant UI update
 *     return { previousData }; // For rollback
 *   },
 *   onError: (error, variables, context) => {
 *     updateUIWithUser(context.previousData); // Rollback
 *   },
 *   onSuccess: (data) => {
 *     console.log('User updated:', data);
 *   }
 * });
 * 
 * // Execute mutation
 * await updateUserMutation.execute({ name: 'John' });
 */
export function createOptimisticMutation(config) {
  const {
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    timeout = 5000,
    autoRollback = true
  } = config;

  let state = {
    isLoading: false,
    error: null,
    data: null
  };

  const listeners = new Set();

  /**
   * Notify all listeners of state change
   */
  function notifyListeners() {
    listeners.forEach(listener => listener(state));
  }

  /**
   * Subscribe to mutation state changes
   * @param {Function} listener - Callback for state changes
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Execute the mutation with optimistic update
   * @param {*} variables - Variables to pass to mutation function
   * @returns {Promise<*>} Result of mutation
   */
  async function execute(variables) {
    if (state.isLoading) {
      console.warn('[OptimisticMutation] Mutation already in progress');
      return Promise.reject(new Error('Mutation already in progress'));
    }

    state.isLoading = true;
    state.error = null;
    notifyListeners();

    let context = null;

    try {
      // Call onMutate for optimistic update
      if (onMutate) {
        context = await onMutate(variables);
      }

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mutation timeout')), timeout);
      });

      // Execute mutation with timeout
      const result = await Promise.race([
        mutationFn(variables),
        timeoutPromise
      ]);

      state.data = result;
      state.isLoading = false;
      notifyListeners();

      // Call onSuccess
      if (onSuccess) {
        await onSuccess(result, variables, context);
      }

      // Call onSettled
      if (onSettled) {
        await onSettled(result, null, variables, context);
      }

      return result;

    } catch (error) {
      state.error = error;
      state.isLoading = false;
      notifyListeners();

      // Call onError with rollback
      if (onError) {
        await onError(error, variables, context);
      } else if (autoRollback && context) {
        console.warn('[OptimisticMutation] Auto-rollback triggered but no onError handler provided');
      }

      // Call onSettled
      if (onSettled) {
        await onSettled(null, error, variables, context);
      }

      throw error;
    }
  }

  /**
   * Reset mutation state
   */
  function reset() {
    state = {
      isLoading: false,
      error: null,
      data: null
    };
    notifyListeners();
  }

  return {
    execute,
    subscribe,
    reset,
    get isLoading() { return state.isLoading; },
    get error() { return state.error; },
    get data() { return state.data; }
  };
}

/**
 * Creates a mutation that integrates with EventBus
 * 
 * @param {Object} config - EventBus mutation configuration
 * @param {string} config.commandType - EventBus command type to publish
 * @param {string} config.successType - EventBus event type to listen for success
 * @param {string} config.errorType - EventBus event type to listen for error
 * @param {Function} config.onMutate - Optimistic update function
 * @param {Function} [config.onSuccess] - Success callback
 * @param {Function} [config.onError] - Error callback with rollback
 * @param {number} [config.timeout=5000] - Timeout in ms
 * @returns {MutationResult} Mutation controller
 * 
 * @example
 * const playTrackMutation = createEventBusMutation({
 *   commandType: 'PlayTrack',
 *   successType: 'PlaybackStarted',
 *   errorType: 'PlaybackError',
 *   onMutate: (trackId) => {
 *     const previousState = getPlayerState();
 *     updatePlayerUI({ trackId, state: 'playing' });
 *     return { previousState };
 *   },
 *   onError: (error, trackId, context) => {
 *     updatePlayerUI(context.previousState);
 *   }
 * });
 * 
 * await playTrackMutation.execute({ trackId: '123' });
 */
export function createEventBusMutation(config) {
  const {
    commandType,
    successType,
    errorType,
    onMutate,
    onSuccess,
    onError,
    timeout = 5000
  } = config;

  return createOptimisticMutation({
    mutationFn: async (variables) => {
      return new Promise((resolve, reject) => {
        const eventBus = window.eventBus;
        if (!eventBus) {
          reject(new Error('EventBus not available'));
          return;
        }

        let successUnsubscribe;
        let errorUnsubscribe;
        let timeoutId;

        // Cleanup function
        const cleanup = () => {
          if (successUnsubscribe) successUnsubscribe();
          if (errorUnsubscribe) errorUnsubscribe();
          if (timeoutId) clearTimeout(timeoutId);
        };

        // Listen for success
        successUnsubscribe = eventBus.subscribe(successType, (event) => {
          cleanup();
          resolve(event.payload);
        });

        // Listen for error
        errorUnsubscribe = eventBus.subscribe(errorType, (event) => {
          cleanup();
          reject(new Error(event.payload?.message || 'Mutation failed'));
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('EventBus mutation timeout'));
        }, timeout);

        // Publish command
        try {
          eventBus.publish({
            type: commandType,
            payload: variables,
            source: 'OptimisticMutation'
          });
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    },
    onMutate,
    onSuccess,
    onError,
    timeout
  });
}

/**
 * Batch multiple mutations with coordinated rollback
 * 
 * @param {Array<MutationResult>} mutations - Array of mutation results
 * @returns {Object} Batch controller
 * 
 * @example
 * const batch = batchMutations([
 *   updateUserMutation,
 *   updateSettingsMutation
 * ]);
 * 
 * await batch.executeAll([
 *   { name: 'John' },
 *   { theme: 'dark' }
 * ]);
 */
export function batchMutations(mutations) {
  /**
   * Execute all mutations in sequence
   * @param {Array<*>} variablesArray - Array of variables for each mutation
   * @returns {Promise<Array<*>>} Array of results
   */
  async function executeAll(variablesArray) {
    if (variablesArray.length !== mutations.length) {
      throw new Error('Variables array length must match mutations array length');
    }

    const results = [];
    const completedIndices = [];

    try {
      for (let i = 0; i < mutations.length; i++) {
        const result = await mutations[i].execute(variablesArray[i]);
        results.push(result);
        completedIndices.push(i);
      }
      return results;
    } catch (error) {
      // Rollback completed mutations in reverse order
      console.error('[BatchMutation] Batch failed, rolling back completed mutations', error);
      
      for (let i = completedIndices.length - 1; i >= 0; i--) {
        const index = completedIndices[i];
        try {
          mutations[index].reset();
        } catch (rollbackError) {
          console.error('[BatchMutation] Rollback failed for mutation', index, rollbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Execute all mutations in parallel
   * @param {Array<*>} variablesArray - Array of variables for each mutation
   * @returns {Promise<Array<*>>} Array of results
   */
  async function executeAllParallel(variablesArray) {
    if (variablesArray.length !== mutations.length) {
      throw new Error('Variables array length must match mutations array length');
    }

    try {
      const promises = mutations.map((mutation, i) => 
        mutation.execute(variablesArray[i])
      );
      return await Promise.all(promises);
    } catch (error) {
      // Reset all mutations on any failure
      console.error('[BatchMutation] Parallel batch failed, resetting all mutations', error);
      mutations.forEach(mutation => {
        try {
          mutation.reset();
        } catch (resetError) {
          console.error('[BatchMutation] Reset failed', resetError);
        }
      });
      throw error;
    }
  }

  /**
   * Reset all mutations
   */
  function resetAll() {
    mutations.forEach(mutation => mutation.reset());
  }

  return {
    executeAll,
    executeAllParallel,
    resetAll
  };
}

/**
 * Create a mutation queue for sequential processing
 * 
 * @returns {Object} Queue controller
 * 
 * @example
 * const queue = createMutationQueue();
 * queue.enqueue(mutation1, variables1);
 * queue.enqueue(mutation2, variables2);
 * await queue.process();
 */
export function createMutationQueue() {
  const queue = [];
  let isProcessing = false;

  /**
   * Add mutation to queue
   * @param {MutationResult} mutation - Mutation to enqueue
   * @param {*} variables - Variables for mutation
   */
  function enqueue(mutation, variables) {
    queue.push({ mutation, variables });
  }

  /**
   * Process all queued mutations
   * @returns {Promise<Array<*>>} Array of results
   */
  async function process() {
    if (isProcessing) {
      throw new Error('Queue is already processing');
    }

    isProcessing = true;
    const results = [];

    try {
      while (queue.length > 0) {
        const { mutation, variables } = queue.shift();
        const result = await mutation.execute(variables);
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('[MutationQueue] Processing failed', error);
      throw error;
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Clear the queue
   */
  function clear() {
    queue.length = 0;
  }

  return {
    enqueue,
    process,
    clear,
    get length() { return queue.length; },
    get isProcessing() { return isProcessing; }
  };
}