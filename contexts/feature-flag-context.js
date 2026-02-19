/**
 * @fileoverview Feature Flag Context - Vanilla JS context for feature flag state management
 * @module contexts/feature-flag-context
 * 
 * Provides a Web Component-based context for managing feature flags across the application.
 * Uses EventBus for state propagation and follows vanilla JS patterns (no React).
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#Feature-Flags} for feature flag documentation
 * @see {@link ../config/feature-flags.js} for feature flag configuration
 * @see {@link ../core/event-bus.js} for EventBus implementation
 */

import { getFeatureFlags } from '../config/feature-flags.js';

/**
 * @typedef {Object} FeatureFlagState
 * @property {Object<string, boolean>} flags - Map of feature flag names to enabled state
 * @property {Function} isEnabled - Check if a feature flag is enabled
 * @property {Function} subscribe - Subscribe to feature flag changes
 * @property {Function} unsubscribe - Unsubscribe from feature flag changes
 */

/**
 * Feature Flag Context Web Component
 * Provides feature flag state to child components via custom events and context API
 * 
 * @example
 * <feature-flag-context>
 *   <my-component></my-component>
 * </feature-flag-context>
 * 
 * // In child component:
 * const context = this.closest('feature-flag-context');
 * const isEnabled = context.isEnabled('newFeature');
 */
class FeatureFlagContext extends HTMLElement {
  constructor() {
    super();
    
    /**
     * @private
     * @type {Object<string, boolean>}
     */
    this._flags = {};
    
    /**
     * @private
     * @type {Set<Function>}
     */
    this._subscribers = new Set();
    
    /**
     * @private
     * @type {AbortController|null}
     */
    this._abortController = null;
  }

  /**
   * Initialize component when connected to DOM
   */
  connectedCallback() {
    this._abortController = new AbortController();
    this._loadFeatureFlags();
    this._setupEventListeners();
    
    // Provide context to child components
    this.setAttribute('role', 'none');
    this.style.display = 'contents'; // Don't affect layout
  }

  /**
   * Cleanup when disconnected from DOM
   */
  disconnectedCallback() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this._subscribers.clear();
  }

  /**
   * Load feature flags from configuration
   * @private
   */
  async _loadFeatureFlags() {
    try {
      this._flags = await getFeatureFlags();
      this._notifySubscribers();
      this._dispatchStateChange();
    } catch (error) {
      console.error('[FeatureFlagContext] Failed to load feature flags:', error);
      this._flags = {};
    }
  }

  /**
   * Setup event listeners for feature flag updates
   * @private
   */
  _setupEventListeners() {
    // Listen for feature flag updates via EventBus
    window.addEventListener(
      'feature-flag:updated',
      this._handleFeatureFlagUpdate.bind(this),
      { signal: this._abortController.signal }
    );

    // Listen for environment changes that might affect feature flags
    window.addEventListener(
      'environment:changed',
      this._handleEnvironmentChange.bind(this),
      { signal: this._abortController.signal }
    );
  }

  /**
   * Handle feature flag update events
   * @private
   * @param {CustomEvent} event - Feature flag update event
   */
  _handleFeatureFlagUpdate(event) {
    const { flagName, enabled } = event.detail;
    
    if (typeof flagName === 'string' && typeof enabled === 'boolean') {
      this._flags[flagName] = enabled;
      this._notifySubscribers();
      this._dispatchStateChange();
    }
  }

  /**
   * Handle environment change events
   * @private
   * @param {CustomEvent} event - Environment change event
   */
  _handleEnvironmentChange(event) {
    // Reload feature flags when environment changes
    this._loadFeatureFlags();
  }

  /**
   * Check if a feature flag is enabled
   * @public
   * @param {string} flagName - Name of the feature flag
   * @returns {boolean} True if flag is enabled, false otherwise
   */
  isEnabled(flagName) {
    return this._flags[flagName] === true;
  }

  /**
   * Get all feature flags
   * @public
   * @returns {Object<string, boolean>} Map of all feature flags
   */
  getAllFlags() {
    return { ...this._flags };
  }

  /**
   * Subscribe to feature flag changes
   * @public
   * @param {Function} callback - Callback function to invoke on changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.error('[FeatureFlagContext] Subscribe callback must be a function');
      return () => {};
    }

    this._subscribers.add(callback);

    // Immediately invoke with current state
    callback(this._flags);

    // Return unsubscribe function
    return () => {
      this._subscribers.delete(callback);
    };
  }

  /**
   * Unsubscribe a callback from feature flag changes
   * @public
   * @param {Function} callback - Callback function to remove
   */
  unsubscribe(callback) {
    this._subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of state changes
   * @private
   */
  _notifySubscribers() {
    const flags = { ...this._flags };
    this._subscribers.forEach(callback => {
      try {
        callback(flags);
      } catch (error) {
        console.error('[FeatureFlagContext] Subscriber callback error:', error);
      }
    });
  }

  /**
   * Dispatch state change event for child components
   * @private
   */
  _dispatchStateChange() {
    this.dispatchEvent(new CustomEvent('feature-flags:changed', {
      bubbles: true,
      composed: true,
      detail: {
        flags: { ...this._flags },
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Update a feature flag programmatically
   * @public
   * @param {string} flagName - Name of the feature flag
   * @param {boolean} enabled - Whether the flag should be enabled
   */
  updateFlag(flagName, enabled) {
    if (typeof flagName !== 'string') {
      console.error('[FeatureFlagContext] Flag name must be a string');
      return;
    }

    if (typeof enabled !== 'boolean') {
      console.error('[FeatureFlagContext] Enabled value must be a boolean');
      return;
    }

    this._flags[flagName] = enabled;
    this._notifySubscribers();
    this._dispatchStateChange();

    // Publish to EventBus for other components
    window.dispatchEvent(new CustomEvent('feature-flag:updated', {
      detail: { flagName, enabled }
    }));
  }
}

// Register the custom element
if (!customElements.get('feature-flag-context')) {
  customElements.define('feature-flag-context', FeatureFlagContext);
}

/**
 * Utility function to get the nearest feature flag context
 * @param {HTMLElement} element - Element to start searching from
 * @returns {FeatureFlagContext|null} The nearest feature flag context or null
 */
export function getFeatureFlagContext(element) {
  if (!element) {
    console.error('[FeatureFlagContext] Element is required');
    return null;
  }

  const context = element.closest('feature-flag-context');
  
  if (!context) {
    console.warn('[FeatureFlagContext] No feature flag context found in component tree');
  }

  return context;
}

/**
 * Utility hook-like function for components to use feature flags
 * Returns an object with feature flag utilities
 * @param {HTMLElement} element - Component element
 * @returns {FeatureFlagState} Feature flag state and utilities
 */
export function useFeatureFlags(element) {
  const context = getFeatureFlagContext(element);

  if (!context) {
    return {
      flags: {},
      isEnabled: () => false,
      subscribe: () => () => {},
      unsubscribe: () => {}
    };
  }

  return {
    flags: context.getAllFlags(),
    isEnabled: (flagName) => context.isEnabled(flagName),
    subscribe: (callback) => context.subscribe(callback),
    unsubscribe: (callback) => context.unsubscribe(callback)
  };
}

export { FeatureFlagContext };