/**
 * @fileoverview Intent Graph - Tracks user intent availability and propagates changes
 * @module harmony-graph/intent-graph
 * 
 * Related docs: docs/del-cross-graph-reactivity-flow.md
 */

/**
 * Represents a single intent node in the graph
 */
class IntentNode {
  /**
   * Create an intent node
   * @param {string} intentType - Type of intent (Play, Stop, Record, etc.)
   * @param {boolean} initialAvailability - Initial availability state
   */
  constructor(intentType, initialAvailability = true) {
    this.intentType = intentType;
    this.available = initialAvailability;
    this.dependents = new Set();
    this.lastChangeTimestamp = performance.now();
    this.changeCount = 0;
  }

  /**
   * Update availability and propagate changes
   * @param {boolean} available - New availability state
   */
  setAvailability(available) {
    if (this.available !== available) {
      this.available = available;
      this.lastChangeTimestamp = performance.now();
      this.changeCount++;
      this.propagateChange();
    }
  }

  /**
   * Notify all dependent components of the change
   */
  propagateChange() {
    for (const dependent of this.dependents) {
      dependent.onIntentChange(this.intentType, this.available);
    }
  }

  /**
   * Add a dependent component
   * @param {object} dependent - Component node to notify on changes
   */
  addDependent(dependent) {
    this.dependents.add(dependent);
  }

  /**
   * Remove a dependent component
   * @param {object} dependent - Component node to remove
   */
  removeDependent(dependent) {
    this.dependents.delete(dependent);
  }

  /**
   * Get diagnostic information
   * @returns {object} Diagnostic data
   */
  getDiagnostics() {
    return {
      intentType: this.intentType,
      available: this.available,
      dependentCount: this.dependents.size,
      lastChangeTimestamp: this.lastChangeTimestamp,
      changeCount: this.changeCount
    };
  }
}

/**
 * Intent Graph - Manages all intent nodes and their relationships
 */
class IntentGraph {
  constructor() {
    /** @type {Map<string, IntentNode>} */
    this.intents = new Map();
    
    /** @type {Array<{timestamp: number, intentType: string, available: boolean}>} */
    this.changeHistory = [];
    
    this.maxHistorySize = 100;
  }

  /**
   * Register an intent node
   * @param {string} intentType - Type of intent
   * @param {boolean} initialAvailability - Initial availability state
   * @returns {IntentNode} The created or existing intent node
   */
  registerIntent(intentType, initialAvailability = true) {
    if (!this.intents.has(intentType)) {
      const node = new IntentNode(intentType, initialAvailability);
      this.intents.set(intentType, node);
      return node;
    }
    return this.intents.get(intentType);
  }

  /**
   * Update intent availability
   * @param {string} intentType - Type of intent
   * @param {boolean} available - New availability state
   */
  setIntentAvailability(intentType, available) {
    const node = this.intents.get(intentType);
    if (!node) {
      console.warn(`Intent ${intentType} not registered`);
      return;
    }

    // Record change in history
    this.changeHistory.push({
      timestamp: performance.now(),
      intentType,
      available
    });

    // Trim history if needed
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }

    node.setAvailability(available);
  }

  /**
   * Get current availability of an intent
   * @param {string} intentType - Type of intent
   * @returns {boolean} Current availability
   */
  getIntentAvailability(intentType) {
    const node = this.intents.get(intentType);
    return node ? node.available : false;
  }

  /**
   * Register a component as dependent on an intent
   * @param {string} intentType - Type of intent
   * @param {object} componentNode - Component node to notify
   */
  registerDependent(intentType, componentNode) {
    const node = this.registerIntent(intentType);
    node.addDependent(componentNode);
  }

  /**
   * Unregister a component from an intent
   * @param {string} intentType - Type of intent
   * @param {object} componentNode - Component node to remove
   */
  unregisterDependent(intentType, componentNode) {
    const node = this.intents.get(intentType);
    if (node) {
      node.removeDependent(componentNode);
    }
  }

  /**
   * Get all registered intents
   * @returns {Array<string>} Array of intent types
   */
  getIntentTypes() {
    return Array.from(this.intents.keys());
  }

  /**
   * Get diagnostic information for all intents
   * @returns {object} Diagnostic data
   */
  getDiagnostics() {
    const intentDiagnostics = {};
    for (const [type, node] of this.intents) {
      intentDiagnostics[type] = node.getDiagnostics();
    }

    return {
      intentCount: this.intents.size,
      intents: intentDiagnostics,
      recentChanges: this.changeHistory.slice(-10)
    };
  }

  /**
   * Clear all intents (for testing)
   */
  clear() {
    this.intents.clear();
    this.changeHistory = [];
  }
}

// Singleton instance
const intentGraph = new IntentGraph();

export { IntentGraph, IntentNode, intentGraph };