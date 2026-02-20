/**
 * @fileoverview GraphTransaction - Groups multiple mutations into atomic transactions
 * @module harmony-graph/graph-transaction
 * 
 * Provides atomic transaction semantics for graph mutations. All mutations within
 * a transaction either succeed together or fail together with automatic rollback.
 * 
 * Performance Budget:
 * - Transaction overhead: < 1ms per transaction
 * - Rollback time: < 5ms for typical transactions
 * - Memory overhead: < 1KB per active transaction
 * 
 * @see DESIGN_SYSTEM.md#graph-transaction
 */

/**
 * Transaction state enumeration
 * @enum {string}
 */
const TransactionState = {
  PENDING: 'pending',
  COMMITTED: 'committed',
  ROLLED_BACK: 'rolled_back',
  FAILED: 'failed'
};

/**
 * Mutation operation types
 * @enum {string}
 */
const MutationType = {
  ADD_NODE: 'add_node',
  REMOVE_NODE: 'remove_node',
  UPDATE_NODE: 'update_node',
  ADD_EDGE: 'add_edge',
  REMOVE_EDGE: 'remove_edge',
  UPDATE_EDGE: 'update_edge'
};

/**
 * Represents a single mutation operation within a transaction
 * @typedef {Object} MutationOp
 * @property {MutationType} type - Type of mutation
 * @property {*} params - Parameters for the mutation
 * @property {*} rollbackData - Data needed to rollback this operation
 */

/**
 * Transaction result
 * @typedef {Object} TransactionResult
 * @property {boolean} success - Whether transaction succeeded
 * @property {string} transactionId - Unique transaction identifier
 * @property {number} mutationCount - Number of mutations applied
 * @property {number} duration - Transaction duration in milliseconds
 * @property {Error|null} error - Error if transaction failed
 */

/**
 * GraphTransaction - Atomic transaction for graph mutations
 * 
 * Example usage:
 * ```javascript
 * const tx = new GraphTransaction(graphStore);
 * 
 * try {
 *   tx.begin();
 *   tx.addNode({ id: 'node1', data: { value: 1 } });
 *   tx.addEdge({ from: 'node1', to: 'node2', label: 'connects' });
 *   tx.updateNode('node2', { data: { value: 2 } });
 *   await tx.commit();
 * } catch (error) {
 *   await tx.rollback();
 *   console.error('Transaction failed:', error);
 * }
 * ```
 */
export class GraphTransaction {
  /**
   * Creates a new GraphTransaction
   * @param {Object} graphStore - The graph store to operate on
   * @param {Object} options - Transaction options
   * @param {number} options.timeout - Transaction timeout in ms (default: 5000)
   * @param {boolean} options.autoRollback - Auto-rollback on error (default: true)
   */
  constructor(graphStore, options = {}) {
    if (!graphStore) {
      throw new Error('GraphTransaction requires a graph store');
    }

    /** @private */
    this._graphStore = graphStore;
    
    /** @private */
    this._transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    /** @private */
    this._state = TransactionState.PENDING;
    
    /** @private */
    this._mutations = [];
    
    /** @private */
    this._startTime = null;
    
    /** @private */
    this._timeout = options.timeout || 5000;
    
    /** @private */
    this._autoRollback = options.autoRollback !== false;
    
    /** @private */
    this._timeoutHandle = null;
    
    /** @private */
    this._listeners = new Map();
  }

  /**
   * Gets the transaction ID
   * @returns {string} Transaction identifier
   */
  get id() {
    return this._transactionId;
  }

  /**
   * Gets the current transaction state
   * @returns {TransactionState} Current state
   */
  get state() {
    return this._state;
  }

  /**
   * Gets the number of mutations in this transaction
   * @returns {number} Mutation count
   */
  get mutationCount() {
    return this._mutations.length;
  }

  /**
   * Begins the transaction
   * @throws {Error} If transaction already started
   */
  begin() {
    if (this._startTime !== null) {
      throw new Error('Transaction already started');
    }

    this._startTime = performance.now();
    this._state = TransactionState.PENDING;

    // Set timeout
    this._timeoutHandle = setTimeout(() => {
      if (this._state === TransactionState.PENDING) {
        this._handleTimeout();
      }
    }, this._timeout);

    this._emit('begin', { transactionId: this._transactionId });
  }

  /**
   * Adds a node to the graph
   * @param {Object} nodeData - Node data
   * @param {string} nodeData.id - Node identifier
   * @param {*} nodeData.data - Node payload
   * @returns {GraphTransaction} This transaction for chaining
   * @throws {Error} If transaction not in pending state
   */
  addNode(nodeData) {
    this._ensurePending();

    const mutation = {
      type: MutationType.ADD_NODE,
      params: nodeData,
      rollbackData: null // Node doesn't exist yet
    };

    this._mutations.push(mutation);
    return this;
  }

  /**
   * Removes a node from the graph
   * @param {string} nodeId - Node identifier
   * @returns {GraphTransaction} This transaction for chaining
   * @throws {Error} If transaction not in pending state
   */
  removeNode(nodeId) {
    this._ensurePending();

    // Store current node state for rollback
    const currentNode = this._graphStore.getNode(nodeId);
    const currentEdges = this._graphStore.getEdgesForNode(nodeId);

    const mutation = {
      type: MutationType.REMOVE_NODE,
      params: { nodeId },
      rollbackData: { node: currentNode, edges: currentEdges }
    };

    this._mutations.push(mutation);
    return this;
  }

  /**
   * Updates a node in the graph
   * @param {string} nodeId - Node identifier
   * @param {Object} updates - Updates to apply
   * @returns {GraphTransaction} This transaction for chaining
   * @throws {Error} If transaction not in pending state
   */
  updateNode(nodeId, updates) {
    this._ensurePending();

    // Store current node state for rollback
    const currentNode = this._graphStore.getNode(nodeId);

    const mutation = {
      type: MutationType.UPDATE_NODE,
      params: { nodeId, updates },
      rollbackData: { previousState: currentNode }
    };

    this._mutations.push(mutation);
    return this;
  }

  /**
   * Adds an edge to the graph
   * @param {Object} edgeData - Edge data
   * @param {string} edgeData.from - Source node ID
   * @param {string} edgeData.to - Target node ID
   * @param {string} edgeData.label - Edge label
   * @param {*} edgeData.data - Edge payload
   * @returns {GraphTransaction} This transaction for chaining
   * @throws {Error} If transaction not in pending state
   */
  addEdge(edgeData) {
    this._ensurePending();

    const mutation = {
      type: MutationType.ADD_EDGE,
      params: edgeData,
      rollbackData: null // Edge doesn't exist yet
    };

    this._mutations.push(mutation);
    return this;
  }

  /**
   * Removes an edge from the graph
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @param {string} label - Edge label
   * @returns {GraphTransaction} This transaction for chaining
   * @throws {Error} If transaction not in pending state
   */
  removeEdge(from, to, label) {
    this._ensurePending();

    // Store current edge state for rollback
    const currentEdge = this._graphStore.getEdge(from, to, label);

    const mutation = {
      type: MutationType.REMOVE_EDGE,
      params: { from, to, label },
      rollbackData: { edge: currentEdge }
    };

    this._mutations.push(mutation);
    return this;
  }

  /**
   * Updates an edge in the graph
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @param {string} label - Edge label
   * @param {Object} updates - Updates to apply
   * @returns {GraphTransaction} This transaction for chaining
   * @throws {Error} If transaction not in pending state
   */
  updateEdge(from, to, label, updates) {
    this._ensurePending();

    // Store current edge state for rollback
    const currentEdge = this._graphStore.getEdge(from, to, label);

    const mutation = {
      type: MutationType.UPDATE_EDGE,
      params: { from, to, label, updates },
      rollbackData: { previousState: currentEdge }
    };

    this._mutations.push(mutation);
    return this;
  }

  /**
   * Commits the transaction, applying all mutations atomically
   * @returns {Promise<TransactionResult>} Transaction result
   * @throws {Error} If transaction not in pending state
   */
  async commit() {
    this._ensurePending();

    try {
      // Apply all mutations
      for (const mutation of this._mutations) {
        await this._applyMutation(mutation);
      }

      this._state = TransactionState.COMMITTED;
      this._clearTimeout();

      const duration = performance.now() - this._startTime;
      const result = {
        success: true,
        transactionId: this._transactionId,
        mutationCount: this._mutations.length,
        duration,
        error: null
      };

      this._emit('commit', result);
      return result;

    } catch (error) {
      console.error('Transaction commit failed:', error);
      
      if (this._autoRollback) {
        await this.rollback();
      } else {
        this._state = TransactionState.FAILED;
      }

      const duration = performance.now() - this._startTime;
      const result = {
        success: false,
        transactionId: this._transactionId,
        mutationCount: this._mutations.length,
        duration,
        error
      };

      this._emit('error', result);
      throw error;
    }
  }

  /**
   * Rolls back the transaction, undoing all mutations
   * @returns {Promise<void>}
   * @throws {Error} If transaction already committed or rolled back
   */
  async rollback() {
    if (this._state === TransactionState.COMMITTED) {
      throw new Error('Cannot rollback committed transaction');
    }
    if (this._state === TransactionState.ROLLED_BACK) {
      throw new Error('Transaction already rolled back');
    }

    try {
      // Rollback mutations in reverse order
      for (let i = this._mutations.length - 1; i >= 0; i--) {
        await this._rollbackMutation(this._mutations[i]);
      }

      this._state = TransactionState.ROLLED_BACK;
      this._clearTimeout();

      this._emit('rollback', { transactionId: this._transactionId });

    } catch (error) {
      console.error('Transaction rollback failed:', error);
      this._state = TransactionState.FAILED;
      throw error;
    }
  }

  /**
   * Adds an event listener
   * @param {string} event - Event name (begin, commit, rollback, error, timeout)
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * Removes an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    const callbacks = this._listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Applies a single mutation
   * @private
   * @param {MutationOp} mutation - Mutation to apply
   */
  async _applyMutation(mutation) {
    switch (mutation.type) {
      case MutationType.ADD_NODE:
        await this._graphStore.addNode(mutation.params);
        break;
      case MutationType.REMOVE_NODE:
        await this._graphStore.removeNode(mutation.params.nodeId);
        break;
      case MutationType.UPDATE_NODE:
        await this._graphStore.updateNode(mutation.params.nodeId, mutation.params.updates);
        break;
      case MutationType.ADD_EDGE:
        await this._graphStore.addEdge(mutation.params);
        break;
      case MutationType.REMOVE_EDGE:
        await this._graphStore.removeEdge(
          mutation.params.from,
          mutation.params.to,
          mutation.params.label
        );
        break;
      case MutationType.UPDATE_EDGE:
        await this._graphStore.updateEdge(
          mutation.params.from,
          mutation.params.to,
          mutation.params.label,
          mutation.params.updates
        );
        break;
      default:
        throw new Error(`Unknown mutation type: ${mutation.type}`);
    }
  }

  /**
   * Rolls back a single mutation
   * @private
   * @param {MutationOp} mutation - Mutation to rollback
   */
  async _rollbackMutation(mutation) {
    switch (mutation.type) {
      case MutationType.ADD_NODE:
        // Remove the node that was added
        await this._graphStore.removeNode(mutation.params.id);
        break;
      case MutationType.REMOVE_NODE:
        // Restore the node that was removed
        if (mutation.rollbackData.node) {
          await this._graphStore.addNode(mutation.rollbackData.node);
          // Restore edges
          for (const edge of mutation.rollbackData.edges) {
            await this._graphStore.addEdge(edge);
          }
        }
        break;
      case MutationType.UPDATE_NODE:
        // Restore previous node state
        if (mutation.rollbackData.previousState) {
          await this._graphStore.updateNode(
            mutation.params.nodeId,
            mutation.rollbackData.previousState.data
          );
        }
        break;
      case MutationType.ADD_EDGE:
        // Remove the edge that was added
        await this._graphStore.removeEdge(
          mutation.params.from,
          mutation.params.to,
          mutation.params.label
        );
        break;
      case MutationType.REMOVE_EDGE:
        // Restore the edge that was removed
        if (mutation.rollbackData.edge) {
          await this._graphStore.addEdge(mutation.rollbackData.edge);
        }
        break;
      case MutationType.UPDATE_EDGE:
        // Restore previous edge state
        if (mutation.rollbackData.previousState) {
          await this._graphStore.updateEdge(
            mutation.params.from,
            mutation.params.to,
            mutation.params.label,
            mutation.rollbackData.previousState.data
          );
        }
        break;
    }
  }

  /**
   * Ensures transaction is in pending state
   * @private
   * @throws {Error} If not in pending state
   */
  _ensurePending() {
    if (this._state !== TransactionState.PENDING) {
      throw new Error(`Cannot modify transaction in ${this._state} state`);
    }
  }

  /**
   * Handles transaction timeout
   * @private
   */
  async _handleTimeout() {
    console.warn(`Transaction ${this._transactionId} timed out after ${this._timeout}ms`);
    
    if (this._autoRollback) {
      await this.rollback();
    } else {
      this._state = TransactionState.FAILED;
    }

    this._emit('timeout', { transactionId: this._transactionId });
  }

  /**
   * Clears the timeout handle
   * @private
   */
  _clearTimeout() {
    if (this._timeoutHandle) {
      clearTimeout(this._timeoutHandle);
      this._timeoutHandle = null;
    }
  }

  /**
   * Emits an event to listeners
   * @private
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  _emit(event, data) {
    if (!this._listeners.has(event)) return;
    for (const callback of this._listeners.get(event)) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in transaction ${event} listener:`, error);
      }
    }
  }
}

/**
 * Creates and begins a new transaction
 * @param {Object} graphStore - The graph store to operate on
 * @param {Object} options - Transaction options
 * @returns {GraphTransaction} Started transaction
 */
export function createTransaction(graphStore, options = {}) {
  const tx = new GraphTransaction(graphStore, options);
  tx.begin();
  return tx;
}

/**
 * Executes a function within a transaction with automatic commit/rollback
 * @param {Object} graphStore - The graph store to operate on
 * @param {Function} fn - Function to execute (receives transaction as argument)
 * @param {Object} options - Transaction options
 * @returns {Promise<TransactionResult>} Transaction result
 */
export async function withTransaction(graphStore, fn, options = {}) {
  const tx = createTransaction(graphStore, options);
  
  try {
    await fn(tx);
    return await tx.commit();
  } catch (error) {
    if (tx.state === TransactionState.PENDING) {
      await tx.rollback();
    }
    throw error;
  }
}

export { TransactionState, MutationType };