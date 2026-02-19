/**
 * @fileoverview Experiment Context - State management for A/B testing and feature flags
 * @module contexts/experiment-context
 * 
 * Provides experiment state management and variant assignment for A/B testing.
 * Uses vanilla JS with Web Components pattern instead of React context.
 * Integrates with EventBus for cross-component communication.
 * 
 * Related: See DESIGN_SYSTEM.md § Experiment System
 */

/**
 * @typedef {Object} ExperimentVariant
 * @property {string} id - Unique variant identifier
 * @property {string} name - Human-readable variant name
 * @property {number} weight - Assignment weight (0-1)
 * @property {Object} config - Variant-specific configuration
 */

/**
 * @typedef {Object} Experiment
 * @property {string} id - Unique experiment identifier
 * @property {string} name - Human-readable experiment name
 * @property {boolean} enabled - Whether experiment is active
 * @property {ExperimentVariant[]} variants - Available variants
 * @property {string} assignmentStrategy - 'random' | 'deterministic' | 'manual'
 */

/**
 * @typedef {Object} ExperimentAssignment
 * @property {string} experimentId - Experiment identifier
 * @property {string} variantId - Assigned variant identifier
 * @property {number} timestamp - Assignment timestamp
 * @property {string} userId - User identifier (optional)
 */

/**
 * ExperimentContext - Manages experiment state and variant assignments
 * Vanilla JS equivalent to React Context for experiment management
 */
class ExperimentContext {
  constructor() {
    /** @type {Map<string, Experiment>} */
    this.experiments = new Map();
    
    /** @type {Map<string, ExperimentAssignment>} */
    this.assignments = new Map();
    
    /** @type {Set<Function>} */
    this.subscribers = new Set();
    
    /** @type {string|null} */
    this.userId = null;
    
    this.loadFromStorage();
  }

  /**
   * Register an experiment definition
   * @param {Experiment} experiment - Experiment configuration
   */
  registerExperiment(experiment) {
    if (!experiment.id || !experiment.variants || experiment.variants.length === 0) {
      console.error('[ExperimentContext] Invalid experiment definition', experiment);
      return;
    }

    // Validate variant weights sum to 1
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      console.warn('[ExperimentContext] Variant weights do not sum to 1.0', experiment.id, totalWeight);
    }

    this.experiments.set(experiment.id, experiment);
    this.notifySubscribers({ type: 'experiment-registered', experimentId: experiment.id });
    
    // Publish event for EventBus integration
    this.publishEvent('ExperimentRegistered', { experimentId: experiment.id, experiment });
  }

  /**
   * Get variant assignment for an experiment
   * Creates assignment if none exists
   * @param {string} experimentId - Experiment identifier
   * @returns {string|null} Assigned variant ID or null if experiment not found
   */
  getVariant(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      console.warn('[ExperimentContext] Experiment not found', experimentId);
      return null;
    }

    if (!experiment.enabled) {
      return null;
    }

    // Check for existing assignment
    let assignment = this.assignments.get(experimentId);
    if (assignment) {
      return assignment.variantId;
    }

    // Create new assignment
    const variantId = this.assignVariant(experiment);
    assignment = {
      experimentId,
      variantId,
      timestamp: Date.now(),
      userId: this.userId
    };

    this.assignments.set(experimentId, assignment);
    this.saveToStorage();
    this.notifySubscribers({ type: 'variant-assigned', experimentId, variantId });
    this.publishEvent('VariantAssigned', { experimentId, variantId, assignment });

    return variantId;
  }

  /**
   * Assign a variant based on experiment strategy
   * @param {Experiment} experiment - Experiment configuration
   * @returns {string} Assigned variant ID
   * @private
   */
  assignVariant(experiment) {
    switch (experiment.assignmentStrategy) {
      case 'deterministic':
        return this.deterministicAssignment(experiment);
      case 'manual':
        // Return first variant for manual assignment (should be set explicitly)
        return experiment.variants[0].id;
      case 'random':
      default:
        return this.randomAssignment(experiment);
    }
  }

  /**
   * Random weighted variant assignment
   * @param {Experiment} experiment - Experiment configuration
   * @returns {string} Assigned variant ID
   * @private
   */
  randomAssignment(experiment) {
    const random = Math.random();
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant.id;
      }
    }

    // Fallback to first variant
    return experiment.variants[0].id;
  }

  /**
   * Deterministic variant assignment based on user ID
   * Ensures same user gets same variant consistently
   * @param {Experiment} experiment - Experiment configuration
   * @returns {string} Assigned variant ID
   * @private
   */
  deterministicAssignment(experiment) {
    if (!this.userId) {
      console.warn('[ExperimentContext] Deterministic assignment requires userId');
      return this.randomAssignment(experiment);
    }

    // Simple hash function for deterministic assignment
    const hash = this.hashString(`${this.userId}-${experiment.id}`);
    const normalized = hash / 0xFFFFFFFF; // Normalize to 0-1
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (normalized <= cumulative) {
        return variant.id;
      }
    }

    return experiment.variants[0].id;
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {number} Hash value
   * @private
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Manually set variant assignment
   * @param {string} experimentId - Experiment identifier
   * @param {string} variantId - Variant identifier
   */
  setVariant(experimentId, variantId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      console.error('[ExperimentContext] Experiment not found', experimentId);
      return;
    }

    const variant = experiment.variants.find(v => v.id === variantId);
    if (!variant) {
      console.error('[ExperimentContext] Variant not found', variantId);
      return;
    }

    const assignment = {
      experimentId,
      variantId,
      timestamp: Date.now(),
      userId: this.userId
    };

    this.assignments.set(experimentId, assignment);
    this.saveToStorage();
    this.notifySubscribers({ type: 'variant-assigned', experimentId, variantId });
    this.publishEvent('VariantAssigned', { experimentId, variantId, assignment });
  }

  /**
   * Get variant configuration
   * @param {string} experimentId - Experiment identifier
   * @returns {Object|null} Variant configuration
   */
  getVariantConfig(experimentId) {
    const variantId = this.getVariant(experimentId);
    if (!variantId) return null;

    const experiment = this.experiments.get(experimentId);
    const variant = experiment.variants.find(v => v.id === variantId);
    return variant ? variant.config : null;
  }

  /**
   * Check if variant is assigned
   * @param {string} experimentId - Experiment identifier
   * @param {string} variantId - Variant identifier to check
   * @returns {boolean} True if variant is assigned
   */
  isVariant(experimentId, variantId) {
    return this.getVariant(experimentId) === variantId;
  }

  /**
   * Set user identifier for deterministic assignment
   * @param {string} userId - User identifier
   */
  setUserId(userId) {
    this.userId = userId;
    this.saveToStorage();
    this.notifySubscribers({ type: 'user-id-set', userId });
  }

  /**
   * Reset all assignments (useful for testing)
   */
  resetAssignments() {
    this.assignments.clear();
    this.saveToStorage();
    this.notifySubscribers({ type: 'assignments-reset' });
    this.publishEvent('AssignmentsReset', {});
  }

  /**
   * Subscribe to context changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of changes
   * @param {Object} event - Change event
   * @private
   */
  notifySubscribers(event) {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[ExperimentContext] Subscriber error', error);
      }
    });
  }

  /**
   * Publish event to EventBus
   * @param {string} type - Event type
   * @param {Object} detail - Event detail
   * @private
   */
  publishEvent(type, detail) {
    if (typeof window !== 'undefined' && window.EventBus) {
      window.EventBus.publish({
        type: `Experiment.${type}`,
        source: 'ExperimentContext',
        timestamp: Date.now(),
        payload: detail
      });
    }
  }

  /**
   * Load assignments from localStorage
   * @private
   */
  loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const stored = localStorage.getItem('harmony-experiments');
      if (stored) {
        const data = JSON.parse(stored);
        this.userId = data.userId || null;
        
        if (data.assignments) {
          Object.entries(data.assignments).forEach(([id, assignment]) => {
            this.assignments.set(id, assignment);
          });
        }
      }
    } catch (error) {
      console.error('[ExperimentContext] Failed to load from storage', error);
    }
  }

  /**
   * Save assignments to localStorage
   * @private
   */
  saveToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const data = {
        userId: this.userId,
        assignments: Object.fromEntries(this.assignments)
      };
      localStorage.setItem('harmony-experiments', JSON.stringify(data));
    } catch (error) {
      console.error('[ExperimentContext] Failed to save to storage', error);
    }
  }

  /**
   * Get all experiments
   * @returns {Experiment[]} Array of experiments
   */
  getAllExperiments() {
    return Array.from(this.experiments.values());
  }

  /**
   * Get all assignments
   * @returns {ExperimentAssignment[]} Array of assignments
   */
  getAllAssignments() {
    return Array.from(this.assignments.values());
  }
}

// Create singleton instance
const experimentContext = new ExperimentContext();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExperimentContext, experimentContext };
}

// Global access
if (typeof window !== 'undefined') {
  window.ExperimentContext = experimentContext;
}