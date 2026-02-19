/**
 * Feature Flag Context
 * 
 * React context for managing feature flags across the application.
 * Provides methods to check, enable, disable, and toggle feature flags.
 * 
 * @module contexts/feature-flag-context
 * @see {@link file://../DESIGN_SYSTEM.md#feature-flags} - Feature flag documentation
 * @see {@link file://../types/feature-flags.d.ts} - TypeScript type definitions
 * @see {@link file://../hooks/use-feature-flag.js} - Feature flag hook
 * @see {@link file://../gates/feature-gate.js} - Feature gate component
 */

/**
 * @typedef {import('../types/feature-flags').FeatureFlagKey} FeatureFlagKey
 * @typedef {import('../types/feature-flags').FeatureFlag} FeatureFlag
 * @typedef {import('../types/feature-flags').FeatureFlagConfig} FeatureFlagConfig
 * @typedef {import('../types/feature-flags').FeatureFlagContextValue} FeatureFlagContextValue
 */

import { isFeatureFlagKey, validateDependencies } from '../types/feature-flags.js';

/**
 * Default feature flag configuration
 * @type {FeatureFlagConfig}
 */
const DEFAULT_FLAGS = {
  'new-ui': {
    key: 'new-ui',
    name: 'New UI',
    description: 'Enable the new user interface',
    enabled: false
  },
  'advanced-audio': {
    key: 'advanced-audio',
    name: 'Advanced Audio',
    description: 'Enable advanced audio processing features',
    enabled: false
  },
  'gpu-acceleration': {
    key: 'gpu-acceleration',
    name: 'GPU Acceleration',
    description: 'Enable GPU-accelerated rendering',
    enabled: false
  },
  'experimental-waveform': {
    key: 'experimental-waveform',
    name: 'Experimental Waveform',
    description: 'Enable experimental waveform visualization',
    enabled: false,
    dependencies: ['gpu-acceleration']
  },
  'beta-collaboration': {
    key: 'beta-collaboration',
    name: 'Beta Collaboration',
    description: 'Enable beta collaboration features',
    enabled: false
  },
  'debug-mode': {
    key: 'debug-mode',
    name: 'Debug Mode',
    description: 'Enable debug mode with additional logging',
    enabled: false
  },
  'performance-metrics': {
    key: 'performance-metrics',
    name: 'Performance Metrics',
    description: 'Enable performance metrics collection',
    enabled: false
  },
  'accessibility-enhancements': {
    key: 'accessibility-enhancements',
    name: 'Accessibility Enhancements',
    description: 'Enable experimental accessibility features',
    enabled: false
  }
};

/**
 * Feature Flag Context Element
 * 
 * Web component that provides feature flag context to child elements.
 * 
 * @example
 * <feature-flag-context>
 *   <feature-gate feature="new-ui">
 *     <p>New UI content</p>
 *   </feature-gate>
 * </feature-flag-context>
 */
class FeatureFlagContext extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /** @type {FeatureFlagConfig} */
    this._flags = { ...DEFAULT_FLAGS };

    this._loadFlags();
    this._render();
  }

  /**
   * Load flags from localStorage
   * @private
   */
  _loadFlags() {
    try {
      const stored = localStorage.getItem('harmony-feature-flags');
      if (stored) {
        const parsed = JSON.parse(stored);
        this._flags = { ...DEFAULT_FLAGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  }

  /**
   * Save flags to localStorage
   * @private
   */
  _saveFlags() {
    try {
      localStorage.setItem('harmony-feature-flags', JSON.stringify(this._flags));
    } catch (error) {
      console.error('Failed to save feature flags:', error);
    }
  }

  /**
   * Check if a feature is enabled
   * 
   * @param {FeatureFlagKey} key - Feature flag key
   * @returns {boolean} True if the feature is enabled
   */
  isEnabled(key) {
    if (!isFeatureFlagKey(key)) {
      console.warn(`Invalid feature flag key: ${key}`);
      return false;
    }

    const flag = this._flags[key];
    if (!flag) {
      return false;
    }

    // Check dependencies
    if (flag.dependencies && flag.dependencies.length > 0) {
      if (!validateDependencies(key, flag.dependencies, this._flags)) {
        return false;
      }
    }

    return flag.enabled;
  }

  /**
   * Enable a feature flag
   * 
   * @param {FeatureFlagKey} key - Feature flag key
   */
  enable(key) {
    if (!isFeatureFlagKey(key)) {
      console.warn(`Invalid feature flag key: ${key}`);
      return;
    }

    const flag = this._flags[key];
    if (!flag) {
      console.warn(`Feature flag not found: ${key}`);
      return;
    }

    // Check dependencies before enabling
    if (flag.dependencies && flag.dependencies.length > 0) {
      if (!validateDependencies(key, flag.dependencies, this._flags)) {
        console.warn(`Cannot enable ${key}: dependencies not met`);
        return;
      }
    }

    flag.enabled = true;
    this._saveFlags();
    this._dispatchChange(key, true);
  }

  /**
   * Disable a feature flag
   * 
   * @param {FeatureFlagKey} key - Feature flag key
   */
  disable(key) {
    if (!isFeatureFlagKey(key)) {
      console.warn(`Invalid feature flag key: ${key}`);
      return;
    }

    const flag = this._flags[key];
    if (!flag) {
      console.warn(`Feature flag not found: ${key}`);
      return;
    }

    flag.enabled = false;
    this._saveFlags();
    this._dispatchChange(key, false);
  }

  /**
   * Toggle a feature flag
   * 
   * @param {FeatureFlagKey} key - Feature flag key
   */
  toggle(key) {
    if (this.isEnabled(key)) {
      this.disable(key);
    } else {
      this.enable(key);
    }
  }

  /**
   * Get flag configuration
   * 
   * @param {FeatureFlagKey} key - Feature flag key
   * @returns {FeatureFlag | undefined} Flag configuration
   */
  getFlag(key) {
    if (!isFeatureFlagKey(key)) {
      return undefined;
    }
    return this._flags[key];
  }

  /**
   * Update flag configuration
   * 
   * @param {FeatureFlagKey} key - Feature flag key
   * @param {Partial<FeatureFlag>} updates - Updates to apply
   */
  updateFlag(key, updates) {
    if (!isFeatureFlagKey(key)) {
      console.warn(`Invalid feature flag key: ${key}`);
      return;
    }

    const flag = this._flags[key];
    if (!flag) {
      console.warn(`Feature flag not found: ${key}`);
      return;
    }

    Object.assign(flag, updates);
    this._saveFlags();
    this._dispatchChange(key, flag.enabled);
  }

  /**
   * Get all flags
   * 
   * @returns {FeatureFlagConfig} All feature flags
   */
  getAllFlags() {
    return { ...this._flags };
  }

  /**
   * Dispatch feature flag change event
   * 
   * @private
   * @param {FeatureFlagKey} key - Feature flag key
   * @param {boolean} enabled - New enabled state
   */
  _dispatchChange(key, enabled) {
    const event = new CustomEvent('feature-flag-changed', {
      detail: {
        type: 'feature-flag-changed',
        key,
        enabled,
        timestamp: Date.now()
      },
      bubbles: true,
      composed: true
    });

    this.dispatchEvent(event);
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }
}

customElements.define('feature-flag-context', FeatureFlagContext);

export { FeatureFlagContext };