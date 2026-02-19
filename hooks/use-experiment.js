/**
 * @fileoverview useExperiment Hook - Vanilla JS equivalent to React hook
 * @module hooks/use-experiment
 * 
 * Provides experiment state access for Web Components.
 * Mixin pattern for adding experiment functionality to components.
 * 
 * Related: See DESIGN_SYSTEM.md § Experiment System
 */

import { experimentContext } from '../contexts/experiment-context.js';

/**
 * @typedef {Object} ExperimentHook
 * @property {Function} getVariant - Get assigned variant for experiment
 * @property {Function} isVariant - Check if specific variant is assigned
 * @property {Function} getVariantConfig - Get variant configuration
 * @property {Function} subscribe - Subscribe to experiment changes
 */

/**
 * Create experiment hook for a component
 * @param {HTMLElement} component - Component instance
 * @returns {ExperimentHook} Experiment hook methods
 */
export function useExperiment(component) {
  let unsubscribe = null;

  /**
   * Get variant for experiment
   * @param {string} experimentId - Experiment identifier
   * @returns {string|null} Assigned variant ID
   */
  const getVariant = (experimentId) => {
    return experimentContext.getVariant(experimentId);
  };

  /**
   * Check if specific variant is assigned
   * @param {string} experimentId - Experiment identifier
   * @param {string} variantId - Variant identifier
   * @returns {boolean} True if variant is assigned
   */
  const isVariant = (experimentId, variantId) => {
    return experimentContext.isVariant(experimentId, variantId);
  };

  /**
   * Get variant configuration
   * @param {string} experimentId - Experiment identifier
   * @returns {Object|null} Variant configuration
   */
  const getVariantConfig = (experimentId) => {
    return experimentContext.getVariantConfig(experimentId);
  };

  /**
   * Subscribe to experiment changes
   * @param {Function} callback - Callback for changes
   * @returns {Function} Unsubscribe function
   */
  const subscribe = (callback) => {
    unsubscribe = experimentContext.subscribe((event) => {
      callback(event);
      
      // Trigger component update if it has a render method
      if (component.render && typeof component.render === 'function') {
        component.render();
      }
    });
    return unsubscribe;
  };

  /**
   * Cleanup subscriptions
   */
  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  // Auto-cleanup when component disconnects
  if (component.disconnectedCallback) {
    const originalDisconnected = component.disconnectedCallback.bind(component);
    component.disconnectedCallback = () => {
      cleanup();
      originalDisconnected();
    };
  } else {
    component.disconnectedCallback = cleanup;
  }

  return {
    getVariant,
    isVariant,
    getVariantConfig,
    subscribe,
    cleanup
  };
}

/**
 * Mixin for adding experiment functionality to Web Components
 * @param {typeof HTMLElement} Base - Base class to extend
 * @returns {typeof HTMLElement} Extended class with experiment methods
 */
export function ExperimentMixin(Base) {
  return class extends Base {
    constructor() {
      super();
      this._experimentHook = null;
    }

    connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }
      this._experimentHook = useExperiment(this);
    }

    /**
     * Get variant for experiment
     * @param {string} experimentId - Experiment identifier
     * @returns {string|null} Assigned variant ID
     */
    getVariant(experimentId) {
      return this._experimentHook ? this._experimentHook.getVariant(experimentId) : null;
    }

    /**
     * Check if specific variant is assigned
     * @param {string} experimentId - Experiment identifier
     * @param {string} variantId - Variant identifier
     * @returns {boolean} True if variant is assigned
     */
    isVariant(experimentId, variantId) {
      return this._experimentHook ? this._experimentHook.isVariant(experimentId, variantId) : false;
    }

    /**
     * Get variant configuration
     * @param {string} experimentId - Experiment identifier
     * @returns {Object|null} Variant configuration
     */
    getVariantConfig(experimentId) {
      return this._experimentHook ? this._experimentHook.getVariantConfig(experimentId) : null;
    }

    /**
     * Subscribe to experiment changes
     * @param {Function} callback - Callback for changes
     * @returns {Function} Unsubscribe function
     */
    subscribeToExperiments(callback) {
      return this._experimentHook ? this._experimentHook.subscribe(callback) : () => {};
    }
  };
}