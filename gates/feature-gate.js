/**
 * @fileoverview Feature Gate Component - Conditionally renders content based on feature flags
 * @module gates/feature-gate
 * 
 * Renders child content only when specified feature flag is enabled.
 * Integrates with FeatureFlagContext and publishes gate evaluation events.
 * 
 * @example
 * <feature-gate flag="new-ui">
 *   <button>New Feature Button</button>
 * </feature-gate>
 * 
 * @see {@link file://./contexts/feature-flag-context.js} FeatureFlagContext
 * @see {@link file://./hooks/use-feature-flag.js} useFeatureFlag Hook
 * @see {@link file://./../DESIGN_SYSTEM.md#feature-gates} Feature Gates Documentation
 */

/**
 * FeatureGateComponent - Web Component for conditional rendering based on feature flags
 * 
 * Attributes:
 * - flag: (required) Feature flag key to check
 * - fallback: (optional) If "true", renders fallback slot when feature is disabled
 * - debug: (optional) If "true", shows debug info about gate evaluation
 * 
 * Slots:
 * - default: Content to render when feature is enabled
 * - fallback: Content to render when feature is disabled (if fallback="true")
 * 
 * Events Published:
 * - feature-gate:evaluated - When gate evaluation completes
 * - feature-gate:enabled - When feature is enabled
 * - feature-gate:disabled - When feature is disabled
 * 
 * Performance:
 * - Synchronous evaluation (< 1ms)
 * - No DOM manipulation when feature unchanged
 * - Minimal memory footprint
 * 
 * @extends HTMLElement
 */
class FeatureGateComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {string|null} */
    this._currentFlag = null;
    
    /** @type {boolean} */
    this._isEnabled = false;
    
    /** @type {Function|null} */
    this._unsubscribe = null;
  }

  /**
   * Observed attributes for change detection
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['flag', 'fallback', 'debug'];
  }

  /**
   * Lifecycle: Connected to DOM
   */
  connectedCallback() {
    this._render();
    this._subscribeToContext();
    this._evaluateGate();
  }

  /**
   * Lifecycle: Disconnected from DOM
   */
  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'flag') {
      this._currentFlag = newValue;
      this._evaluateGate();
    } else if (name === 'fallback' || name === 'debug') {
      this._render();
    }
  }

  /**
   * Subscribe to FeatureFlagContext for flag updates
   * @private
   */
  _subscribeToContext() {
    // Check if FeatureFlagContext is available
    const contextElement = document.querySelector('feature-flag-context');
    if (!contextElement) {
      console.warn('[FeatureGate] FeatureFlagContext not found. Gate will always evaluate to false.');
      return;
    }

    // Subscribe to flag changes
    this._unsubscribe = contextElement.subscribe(() => {
      this._evaluateGate();
    });
  }

  /**
   * Evaluate the feature gate
   * @private
   */
  _evaluateGate() {
    const flag = this.getAttribute('flag');
    
    if (!flag) {
      console.error('[FeatureGate] No flag attribute specified');
      this._isEnabled = false;
      this._updateVisibility();
      return;
    }

    const startTime = performance.now();
    
    // Get feature flag value from context
    const contextElement = document.querySelector('feature-flag-context');
    const isEnabled = contextElement ? contextElement.isEnabled(flag) : false;
    
    const evaluationTime = performance.now() - startTime;
    
    // Update state
    const previousState = this._isEnabled;
    this._isEnabled = isEnabled;
    
    // Publish evaluation event
    this._publishEvent('feature-gate:evaluated', {
      flag,
      enabled: isEnabled,
      evaluationTime,
      previousState
    });

    // Publish specific state event
    if (isEnabled) {
      this._publishEvent('feature-gate:enabled', { flag });
    } else {
      this._publishEvent('feature-gate:disabled', { flag });
    }

    // Update visibility
    this._updateVisibility();

    // Debug logging
    if (this.hasAttribute('debug')) {
      console.log(`[FeatureGate] ${flag}: ${isEnabled ? 'ENABLED' : 'DISABLED'} (${evaluationTime.toFixed(2)}ms)`);
    }
  }

  /**
   * Update content visibility based on gate state
   * @private
   */
  _updateVisibility() {
    const defaultSlot = this.shadowRoot.querySelector('slot:not([name])');
    const fallbackSlot = this.shadowRoot.querySelector('slot[name="fallback"]');
    
    if (this._isEnabled) {
      // Show default content
      if (defaultSlot) defaultSlot.style.display = '';
      if (fallbackSlot) fallbackSlot.style.display = 'none';
    } else {
      // Show fallback if enabled, otherwise hide all
      const showFallback = this.getAttribute('fallback') === 'true';
      
      if (defaultSlot) defaultSlot.style.display = 'none';
      if (fallbackSlot) {
        fallbackSlot.style.display = showFallback ? '' : 'none';
      }
    }
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event detail
   */
  _publishEvent(type, detail) {
    const event = new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);

    // Also publish to EventBus if available
    const eventBus = window.eventBus;
    if (eventBus && typeof eventBus.publish === 'function') {
      eventBus.publish(type, detail);
    }
  }

  /**
   * Render shadow DOM structure
   * @private
   */
  _render() {
    const debug = this.hasAttribute('debug');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }

        .debug-info {
          display: ${debug ? 'block' : 'none'};
          padding: 8px;
          margin: 4px 0;
          background: #f0f0f0;
          border-left: 3px solid #666;
          font-family: monospace;
          font-size: 12px;
          color: #333;
        }

        .debug-info.enabled {
          border-left-color: #4caf50;
          background: #e8f5e9;
        }

        .debug-info.disabled {
          border-left-color: #f44336;
          background: #ffebee;
        }
      </style>

      ${debug ? `
        <div class="debug-info ${this._isEnabled ? 'enabled' : 'disabled'}">
          Feature Gate: ${this.getAttribute('flag') || 'none'} - ${this._isEnabled ? 'ENABLED' : 'DISABLED'}
        </div>
      ` : ''}

      <slot></slot>
      <slot name="fallback"></slot>
    `;

    this._updateVisibility();
  }

  /**
   * Public API: Check if gate is currently enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._isEnabled;
  }

  /**
   * Public API: Force re-evaluation of gate
   */
  refresh() {
    this._evaluateGate();
  }
}

// Register custom element
if (!customElements.get('feature-gate')) {
  customElements.define('feature-gate', FeatureGateComponent);
}

export default FeatureGateComponent;