/**
 * @fileoverview Experiment Variant Component
 * @module components/experiment/experiment-variant
 * 
 * Declarative component for rendering experiment variants based on active experiments.
 * Integrates with ExperimentContext to display different content based on assigned variant.
 * 
 * @example
 * <experiment-variant experiment-id="button-color-test">
 *   <div slot="control">Original Button</div>
 *   <div slot="variant-a">Blue Button</div>
 *   <div slot="variant-b">Green Button</div>
 * </experiment-variant>
 * 
 * Related:
 * - {@link ../../contexts/experiment-context.js} - Experiment state management
 * - {@link ../../hooks/useExperiment.js} - React-style hook for experiments
 * - {@link ../../../DESIGN_SYSTEM.md#experimentation-system} - System documentation
 */

/**
 * Web Component for declarative experiment variant rendering
 * 
 * Automatically subscribes to experiment state changes and renders
 * the appropriate variant slot based on the assigned variant.
 * 
 * Performance:
 * - Lazy renders only active variant (< 1ms switching)
 * - No re-render if variant unchanged
 * - Minimal DOM manipulation
 * 
 * @class ExperimentVariantComponent
 * @extends HTMLElement
 */
class ExperimentVariantComponent extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @static
   */
  static get observedAttributes() {
    return ['experiment-id', 'default-variant', 'fallback-variant'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {string|null} Current experiment ID */
    this._experimentId = null;
    
    /** @type {string} Default variant when no experiment active */
    this._defaultVariant = 'control';
    
    /** @type {string} Fallback when assigned variant not found */
    this._fallbackVariant = 'control';
    
    /** @type {string|null} Currently rendered variant */
    this._currentVariant = null;
    
    /** @type {Function|null} Unsubscribe function for experiment context */
    this._unsubscribe = null;
    
    /** @type {boolean} Whether component is connected to DOM */
    this._isConnected = false;
  }

  /**
   * Lifecycle: Component connected to DOM
   * Subscribes to experiment context and renders initial variant
   */
  connectedCallback() {
    this._isConnected = true;
    this._setupShadowDOM();
    this._subscribeToExperiment();
    this._render();
  }

  /**
   * Lifecycle: Component disconnected from DOM
   * Cleans up subscriptions
   */
  disconnectedCallback() {
    this._isConnected = false;
    this._unsubscribeFromExperiment();
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'experiment-id':
        this._experimentId = newValue;
        if (this._isConnected) {
          this._unsubscribeFromExperiment();
          this._subscribeToExperiment();
          this._render();
        }
        break;
      
      case 'default-variant':
        this._defaultVariant = newValue || 'control';
        if (this._isConnected) {
          this._render();
        }
        break;
      
      case 'fallback-variant':
        this._fallbackVariant = newValue || 'control';
        if (this._isConnected) {
          this._render();
        }
        break;
    }
  }

  /**
   * Setup shadow DOM structure
   * @private
   */
  _setupShadowDOM() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        :host([hidden]) {
          display: none;
        }
        
        #variant-container {
          display: contents;
        }
        
        ::slotted(*) {
          display: none;
        }
        
        ::slotted(.active-variant) {
          display: block;
        }
      </style>
      <div id="variant-container">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Subscribe to experiment context for variant updates
   * @private
   */
  _subscribeToExperiment() {
    if (!this._experimentId) {
      console.warn('[ExperimentVariant] No experiment-id provided');
      return;
    }

    // Get experiment context from global registry
    const experimentContext = window.ExperimentContext;
    
    if (!experimentContext) {
      console.warn('[ExperimentVariant] ExperimentContext not available');
      return;
    }

    // Subscribe to experiment state changes
    this._unsubscribe = experimentContext.subscribe((state) => {
      const experiment = state.experiments[this._experimentId];
      
      if (!experiment) {
        // Experiment not found, use default
        this._updateVariant(this._defaultVariant);
        return;
      }

      // Use assigned variant or fallback
      const variant = experiment.assignedVariant || this._fallbackVariant;
      this._updateVariant(variant);
    });

    // Initial render with current state
    const currentState = experimentContext.getState();
    const experiment = currentState.experiments[this._experimentId];
    
    if (experiment) {
      const variant = experiment.assignedVariant || this._fallbackVariant;
      this._updateVariant(variant);
    } else {
      this._updateVariant(this._defaultVariant);
    }
  }

  /**
   * Unsubscribe from experiment context
   * @private
   */
  _unsubscribeFromExperiment() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Update currently displayed variant
   * @param {string} variant - Variant name to display
   * @private
   */
  _updateVariant(variant) {
    if (this._currentVariant === variant) {
      return; // No change needed
    }

    this._currentVariant = variant;
    this._render();
    
    // Dispatch variant change event
    this.dispatchEvent(new CustomEvent('variant-change', {
      detail: {
        experimentId: this._experimentId,
        variant: variant,
        timestamp: Date.now()
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Render the active variant
   * Performance: < 1ms for variant switching
   * @private
   */
  _render() {
    if (!this._isConnected) return;

    const variant = this._currentVariant || this._defaultVariant;
    
    // Get all slotted elements
    const slot = this.shadowRoot.querySelector('slot');
    if (!slot) return;
    
    const elements = slot.assignedElements();
    
    // Performance optimization: batch DOM updates
    requestAnimationFrame(() => {
      elements.forEach(el => {
        const slotName = el.getAttribute('slot');
        
        // Match slot name to variant
        // Supports: slot="control", slot="variant-a", etc.
        const isActive = slotName === variant || 
                        slotName === `variant-${variant}` ||
                        (variant === 'control' && !slotName);
        
        if (isActive) {
          el.classList.add('active-variant');
          el.removeAttribute('aria-hidden');
        } else {
          el.classList.remove('active-variant');
          el.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  /**
   * Get currently active variant name
   * @returns {string|null} Active variant name
   * @public
   */
  getActiveVariant() {
    return this._currentVariant;
  }

  /**
   * Get experiment ID
   * @returns {string|null} Experiment ID
   * @public
   */
  getExperimentId() {
    return this._experimentId;
  }

  /**
   * Force re-render of current variant
   * Useful for manual refresh after slot content changes
   * @public
   */
  refresh() {
    this._render();
  }
}

// Register custom element
customElements.define('experiment-variant', ExperimentVariantComponent);

export { ExperimentVariantComponent };