/**
 * @fileoverview HDS Button component migrated to GPU graph runtime
 * @module harmony-web-components/hds-button-gpu
 * 
 * This component demonstrates the integration of UI primitives with the GPU graph runtime.
 * State changes flow through the graph system for reactive updates and GPU-accelerated
 * property propagation.
 * 
 * Architecture:
 * - Component registers as a graph node in harmony-graph runtime
 * - State changes propagate through GPU compute shaders
 * - Visual updates triggered by graph node output events
 * - EventBus integration for cross-component communication
 * 
 * Related docs: harmony-design/DESIGN_SYSTEM.md § GPU Graph Runtime, § Web Components
 */

import { EventBus } from '../../core/event-bus.js';
import { GraphRuntime } from '../../harmony-graph/src/runtime.js';
import { GraphNode } from '../../harmony-graph/src/graph-node.js';

/**
 * Button component integrated with GPU graph runtime
 * 
 * @class HdsButtonGpu
 * @extends HTMLElement
 * 
 * @example
 * <hds-button-gpu 
 *   variant="primary" 
 *   size="medium"
 *   disabled="false">
 *   Click Me
 * </hds-button-gpu>
 * 
 * @fires button:click - Emitted when button is clicked (via EventBus)
 * @fires button:state-change - Emitted when button state changes (via EventBus)
 */
export class HdsButtonGpu extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @returns {string[]} List of observed attribute names
   */
  static get observedAttributes() {
    return ['variant', 'size', 'disabled', 'loading'];
  }

  constructor() {
    super();
    
    /** @type {ShadowRoot} */
    this.attachShadow({ mode: 'open' });
    
    /** @type {EventBus} */
    this._eventBus = EventBus.getInstance();
    
    /** @type {GraphRuntime|null} */
    this._graphRuntime = null;
    
    /** @type {GraphNode|null} */
    this._graphNode = null;
    
    /** @type {string} Unique identifier for this button instance */
    this._nodeId = `hds-button-${crypto.randomUUID()}`;
    
    /** @type {Object} Current component state */
    this._state = {
      variant: 'primary',
      size: 'medium',
      disabled: false,
      loading: false,
      pressed: false,
      focused: false
    };
    
    /** @type {number|null} Animation frame request ID */
    this._rafId = null;
    
    this._render();
    this._attachEventListeners();
  }

  /**
   * Lifecycle: Component connected to DOM
   * Initializes GPU graph node and registers with runtime
   */
  async connectedCallback() {
    // Initialize graph runtime connection
    try {
      this._graphRuntime = await GraphRuntime.getInstance();
      
      // Create graph node for this button
      this._graphNode = new GraphNode({
        id: this._nodeId,
        type: 'ui-button',
        inputs: {
          variant: { type: 'string', value: this._state.variant },
          size: { type: 'string', value: this._state.size },
          disabled: { type: 'boolean', value: this._state.disabled },
          loading: { type: 'boolean', value: this._state.loading }
        },
        outputs: {
          clicked: { type: 'event' },
          stateChanged: { type: 'object' }
        }
      });
      
      // Register node with runtime
      await this._graphRuntime.registerNode(this._graphNode);
      
      // Subscribe to node output events
      this._graphNode.on('output:stateChanged', (state) => {
        this._handleGraphStateChange(state);
      });
      
      // Emit initial state to graph
      this._syncStateToGraph();
      
    } catch (error) {
      console.warn('[HdsButtonGpu] GPU graph runtime not available, falling back to CPU mode', error);
      // Component still functions without GPU runtime, just without graph propagation
    }
    
    // Publish component mount event
    this._eventBus.publish({
      type: 'component:mounted',
      source: 'hds-button-gpu',
      payload: {
        nodeId: this._nodeId,
        state: { ...this._state }
      }
    });
  }

  /**
   * Lifecycle: Component disconnected from DOM
   * Cleans up GPU graph node and event listeners
   */
  disconnectedCallback() {
    // Unregister from graph runtime
    if (this._graphRuntime && this._graphNode) {
      this._graphRuntime.unregisterNode(this._nodeId);
    }
    
    // Cancel any pending animation frames
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    
    // Publish component unmount event
    this._eventBus.publish({
      type: 'component:unmounted',
      source: 'hds-button-gpu',
      payload: { nodeId: this._nodeId }
    });
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    // Update internal state
    if (name === 'disabled' || name === 'loading') {
      this._state[name] = newValue !== null && newValue !== 'false';
    } else {
      this._state[name] = newValue || this._state[name];
    }
    
    // Sync to graph runtime (GPU propagation)
    this._syncStateToGraph();
    
    // Schedule visual update (max 60fps)
    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._updateVisuals();
        this._rafId = null;
      });
    }
  }

  /**
   * Synchronize component state to GPU graph
   * @private
   */
  _syncStateToGraph() {
    if (!this._graphNode) return;
    
    // Update graph node inputs
    this._graphNode.setInput('variant', this._state.variant);
    this._graphNode.setInput('size', this._state.size);
    this._graphNode.setInput('disabled', this._state.disabled);
    this._graphNode.setInput('loading', this._state.loading);
    
    // Trigger graph computation (GPU shader execution)
    if (this._graphRuntime) {
      this._graphRuntime.computeNode(this._nodeId);
    }
    
    // Emit state change output
    this._graphNode.setOutput('stateChanged', { ...this._state });
  }

  /**
   * Handle state changes propagated through graph
   * @param {Object} state - New state from graph computation
   * @private
   */
  _handleGraphStateChange(state) {
    // Update local state from graph
    Object.assign(this._state, state);
    
    // Publish to EventBus for cross-component reactivity
    this._eventBus.publish({
      type: 'button:state-change',
      source: 'hds-button-gpu',
      payload: {
        nodeId: this._nodeId,
        state: { ...this._state }
      }
    });
    
    // Update visuals
    this._updateVisuals();
  }

  /**
   * Update visual appearance based on current state
   * @private
   */
  _updateVisuals() {
    const button = this.shadowRoot.querySelector('button');
    if (!button) return;
    
    // Update classes for variant and size
    button.className = `hds-button hds-button--${this._state.variant} hds-button--${this._state.size}`;
    
    // Update disabled state
    button.disabled = this._state.disabled || this._state.loading;
    
    // Update loading state
    const spinner = button.querySelector('.hds-button__spinner');
    const content = button.querySelector('.hds-button__content');
    
    if (this._state.loading) {
      spinner?.removeAttribute('hidden');
      content?.setAttribute('aria-hidden', 'true');
    } else {
      spinner?.setAttribute('hidden', '');
      content?.removeAttribute('aria-hidden');
    }
    
    // Update pressed state
    button.setAttribute('aria-pressed', this._state.pressed.toString());
    
    // Update ARIA attributes
    button.setAttribute('aria-busy', this._state.loading.toString());
  }

  /**
   * Attach event listeners to shadow DOM elements
   * @private
   */
  _attachEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (!button) return;
    
    button.addEventListener('click', (e) => this._handleClick(e));
    button.addEventListener('mousedown', () => this._handleMouseDown());
    button.addEventListener('mouseup', () => this._handleMouseUp());
    button.addEventListener('focus', () => this._handleFocus());
    button.addEventListener('blur', () => this._handleBlur());
  }

  /**
   * Handle button click event
   * @param {MouseEvent} event - Click event
   * @private
   */
  _handleClick(event) {
    if (this._state.disabled || this._state.loading) {
      event.preventDefault();
      return;
    }
    
    // Emit click output through graph
    if (this._graphNode) {
      this._graphNode.setOutput('clicked', {
        timestamp: performance.now(),
        nodeId: this._nodeId
      });
    }
    
    // Publish click event to EventBus
    this._eventBus.publish({
      type: 'button:click',
      source: 'hds-button-gpu',
      payload: {
        nodeId: this._nodeId,
        variant: this._state.variant,
        timestamp: performance.now()
      }
    });
  }

  /**
   * Handle mouse down event
   * @private
   */
  _handleMouseDown() {
    this._state.pressed = true;
    this._syncStateToGraph();
  }

  /**
   * Handle mouse up event
   * @private
   */
  _handleMouseUp() {
    this._state.pressed = false;
    this._syncStateToGraph();
  }

  /**
   * Handle focus event
   * @private
   */
  _handleFocus() {
    this._state.focused = true;
    this._syncStateToGraph();
  }

  /**
   * Handle blur event
   * @private
   */
  _handleBlur() {
    this._state.focused = false;
    this._syncStateToGraph();
  }

  /**
   * Render component shadow DOM
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --button-height-small: 32px;
          --button-height-medium: 40px;
          --button-height-large: 48px;
          --button-padding-small: 0 12px;
          --button-padding-medium: 0 16px;
          --button-padding-large: 0 24px;
          --button-font-size-small: 14px;
          --button-font-size-medium: 16px;
          --button-font-size-large: 18px;
          --button-border-radius: 4px;
          --button-transition: all 0.2s ease-in-out;
        }

        .hds-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: var(--button-border-radius);
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: var(--button-transition);
          outline: none;
        }

        /* Size variants */
        .hds-button--small {
          height: var(--button-height-small);
          padding: var(--button-padding-small);
          font-size: var(--button-font-size-small);
        }

        .hds-button--medium {
          height: var(--button-height-medium);
          padding: var(--button-padding-medium);
          font-size: var(--button-font-size-medium);
        }

        .hds-button--large {
          height: var(--button-height-large);
          padding: var(--button-padding-large);
          font-size: var(--button-font-size-large);
        }

        /* Color variants */
        .hds-button--primary {
          background: #0066cc;
          color: #ffffff;
        }

        .hds-button--primary:hover:not(:disabled) {
          background: #0052a3;
        }

        .hds-button--primary:active:not(:disabled) {
          background: #003d7a;
        }

        .hds-button--secondary {
          background: #6c757d;
          color: #ffffff;
        }

        .hds-button--secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .hds-button--secondary:active:not(:disabled) {
          background: #494f54;
        }

        .hds-button--tertiary {
          background: transparent;
          color: #0066cc;
          border: 1px solid #0066cc;
        }

        .hds-button--tertiary:hover:not(:disabled) {
          background: rgba(0, 102, 204, 0.1);
        }

        .hds-button--tertiary:active:not(:disabled) {
          background: rgba(0, 102, 204, 0.2);
        }

        .hds-button--danger {
          background: #dc3545;
          color: #ffffff;
        }

        .hds-button--danger:hover:not(:disabled) {
          background: #c82333;
        }

        .hds-button--danger:active:not(:disabled) {
          background: #bd2130;
        }

        /* Focus state */
        .hds-button:focus-visible {
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.3);
        }

        /* Disabled state */
        .hds-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Loading spinner */
        .hds-button__spinner {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .hds-button__content {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        [hidden] {
          display: none !important;
        }
      </style>
      
      <button class="hds-button hds-button--primary hds-button--medium" type="button">
        <span class="hds-button__spinner" hidden></span>
        <span class="hds-button__content">
          <slot></slot>
        </span>
      </button>
    `;
  }

  /**
   * Public API: Set button variant
   * @param {string} variant - Button variant (primary, secondary, tertiary, danger)
   */
  setVariant(variant) {
    this.setAttribute('variant', variant);
  }

  /**
   * Public API: Set button size
   * @param {string} size - Button size (small, medium, large)
   */
  setSize(size) {
    this.setAttribute('size', size);
  }

  /**
   * Public API: Set disabled state
   * @param {boolean} disabled - Whether button is disabled
   */
  setDisabled(disabled) {
    if (disabled) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Public API: Set loading state
   * @param {boolean} loading - Whether button is loading
   */
  setLoading(loading) {
    if (loading) {
      this.setAttribute('loading', '');
    } else {
      this.removeAttribute('loading');
    }
  }

  /**
   * Public API: Get current state
   * @returns {Object} Current component state
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Public API: Get graph node ID
   * @returns {string} Graph node identifier
   */
  getNodeId() {
    return this._nodeId;
  }
}

// Register custom element
customElements.define('hds-button-gpu', HdsButtonGpu);