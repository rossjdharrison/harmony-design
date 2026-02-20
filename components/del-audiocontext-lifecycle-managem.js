/**
 * @fileoverview AudioContext Lifecycle Management Component
 * @module components/del-audiocontext-lifecycle-managem
 * 
 * Manages AudioContext lifecycle with automatic state transitions,
 * user gesture handling, and proper cleanup. Follows Web Audio API
 * best practices for context creation, suspension, and resumption.
 * 
 * Design Level: Molecule (manages state and user interaction)
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#audio-components}
 */

import { EventBus } from '../core/event-bus.js';

/**
 * @typedef {Object} AudioContextState
 * @property {'suspended'|'running'|'closed'|'interrupted'} state - Current AudioContext state
 * @property {number} sampleRate - Sample rate in Hz
 * @property {number} currentTime - Current time in seconds
 * @property {number} baseLatency - Base latency in seconds
 */

/**
 * AudioContext Lifecycle Management Component
 * 
 * Handles AudioContext creation, state management, and cleanup.
 * Publishes lifecycle events via EventBus for bounded context integration.
 * 
 * @class AudioContextLifecycleManager
 * @extends HTMLElement
 * 
 * @example
 * <audio-context-lifecycle-manager 
 *   value="suspended"
 *   placeholder="Click to enable audio">
 * </audio-context-lifecycle-manager>
 * 
 * @fires audiocontext:created - When AudioContext is created
 * @fires audiocontext:statechange - When state changes
 * @fires audiocontext:closed - When context is closed
 * @fires audiocontext:error - When an error occurs
 */
class AudioContextLifecycleManager extends HTMLElement {
  /**
   * @private
   * @type {AudioContext|null}
   */
  #audioContext = null;

  /**
   * @private
   * @type {EventBus|null}
   */
  #eventBus = null;

  /**
   * @private
   * @type {boolean}
   */
  #userGestureReceived = false;

  /**
   * @private
   * @type {AbortController}
   */
  #abortController = new AbortController();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]} Attribute names to observe
   */
  static get observedAttributes() {
    return ['value', 'placeholder', 'disabled', 'sample-rate', 'latency-hint'];
  }

  /**
   * Component connected to DOM
   */
  connectedCallback() {
    this.#eventBus = EventBus.getInstance();
    this._attachEventListeners();
    this._initializeContext();
  }

  /**
   * Component disconnected from DOM
   */
  disconnectedCallback() {
    this.#abortController.abort();
    this._cleanup();
  }

  /**
   * Attribute changed callback
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'value':
        this._handleValueChange(newValue);
        break;
      case 'placeholder':
      case 'disabled':
        this._render();
        break;
      case 'sample-rate':
      case 'latency-hint':
        if (this.#audioContext) {
          this._recreateContext();
        }
        break;
    }
  }

  /**
   * Get current state value
   * @returns {string} Current AudioContext state
   */
  get value() {
    return this.getAttribute('value') || 'suspended';
  }

  /**
   * Set state value
   * @param {string} val - New state value
   */
  set value(val) {
    this.setAttribute('value', val);
  }

  /**
   * Get placeholder text
   * @returns {string} Placeholder text
   */
  get placeholder() {
    return this.getAttribute('placeholder') || 'Click to enable audio';
  }

  /**
   * Set placeholder text
   * @param {string} val - Placeholder text
   */
  set placeholder(val) {
    this.setAttribute('placeholder', val);
  }

  /**
   * Get disabled state
   * @returns {boolean} Whether component is disabled
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  /**
   * Set disabled state
   * @param {boolean} val - Disabled state
   */
  set disabled(val) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Get AudioContext instance
   * @returns {AudioContext|null} The managed AudioContext
   */
  get context() {
    return this.#audioContext;
  }

  /**
   * Get current context state
   * @returns {AudioContextState|null} Current state object
   */
  getState() {
    if (!this.#audioContext) return null;

    return {
      state: this.#audioContext.state,
      sampleRate: this.#audioContext.sampleRate,
      currentTime: this.#audioContext.currentTime,
      baseLatency: this.#audioContext.baseLatency || 0
    };
  }

  /**
   * Initialize AudioContext
   * @private
   */
  _initializeContext() {
    if (this.#audioContext) return;

    try {
      const sampleRate = this.getAttribute('sample-rate');
      const latencyHint = this.getAttribute('latency-hint') || 'interactive';

      const options = {
        latencyHint,
        ...(sampleRate && { sampleRate: parseInt(sampleRate, 10) })
      };

      this.#audioContext = new AudioContext(options);

      // Listen for state changes
      this.#audioContext.addEventListener(
        'statechange',
        this._handleStateChange.bind(this),
        { signal: this.#abortController.signal }
      );

      this._publishEvent('audiocontext:created', {
        context: this.#audioContext,
        state: this.getState()
      });

      this._updateValue(this.#audioContext.state);
      this._render();
    } catch (error) {
      this._handleError('Failed to create AudioContext', error);
    }
  }

  /**
   * Recreate AudioContext with new settings
   * @private
   */
  async _recreateContext() {
    await this._cleanup();
    this._initializeContext();
  }

  /**
   * Handle AudioContext state change
   * @private
   */
  _handleStateChange() {
    if (!this.#audioContext) return;

    const state = this.#audioContext.state;
    this._updateValue(state);

    this._publishEvent('audiocontext:statechange', {
      state: this.getState(),
      userGestureReceived: this.#userGestureReceived
    });

    this._render();
  }

  /**
   * Handle value attribute change
   * @private
   * @param {string} newValue - New value
   */
  async _handleValueChange(newValue) {
    if (!this.#audioContext || this.disabled) return;

    try {
      switch (newValue) {
        case 'running':
          if (this.#audioContext.state === 'suspended') {
            await this.#audioContext.resume();
          }
          break;
        case 'suspended':
          if (this.#audioContext.state === 'running') {
            await this.#audioContext.suspend();
          }
          break;
        case 'closed':
          await this._cleanup();
          break;
      }
    } catch (error) {
      this._handleError('Failed to change AudioContext state', error);
    }
  }

  /**
   * Update value attribute
   * @private
   * @param {string} state - New state
   */
  _updateValue(state) {
    if (this.value !== state) {
      this.setAttribute('value', state);
      this._fireChangeEvent(state);
    }
  }

  /**
   * Fire change event
   * @private
   * @param {string} state - Current state
   */
  _fireChangeEvent(state) {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        value: state,
        state: this.getState()
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (!button) return;

    button.addEventListener(
      'click',
      this._handleClick.bind(this),
      { signal: this.#abortController.signal }
    );
  }

  /**
   * Handle button click
   * @private
   */
  async _handleClick() {
    if (this.disabled || !this.#audioContext) return;

    this.#userGestureReceived = true;

    try {
      if (this.#audioContext.state === 'suspended') {
        await this.#audioContext.resume();
      } else if (this.#audioContext.state === 'running') {
        await this.#audioContext.suspend();
      }
    } catch (error) {
      this._handleError('Failed to toggle AudioContext state', error);
    }
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event detail
   */
  _publishEvent(type, detail) {
    if (!this.#eventBus) return;

    try {
      this.#eventBus.publish({
        type,
        source: 'AudioContextLifecycleManager',
        payload: detail,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`[AudioContextLifecycleManager] Failed to publish ${type}:`, error);
    }
  }

  /**
   * Handle error
   * @private
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  _handleError(message, error) {
    console.error(`[AudioContextLifecycleManager] ${message}:`, error);

    this._publishEvent('audiocontext:error', {
      message,
      error: error.message,
      stack: error.stack
    });

    this.dispatchEvent(new CustomEvent('error', {
      detail: { message, error },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Cleanup resources
   * @private
   */
  async _cleanup() {
    if (this.#audioContext && this.#audioContext.state !== 'closed') {
      try {
        await this.#audioContext.close();
        this._publishEvent('audiocontext:closed', {
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[AudioContextLifecycleManager] Cleanup error:', error);
      }
    }
    this.#audioContext = null;
  }

  /**
   * Render component UI
   * @private
   */
  _render() {
    const state = this.#audioContext ? this.#audioContext.state : 'suspended';
    const disabled = this.disabled;
    const placeholder = this.placeholder;

    const stateLabels = {
      suspended: 'Suspended',
      running: 'Running',
      closed: 'Closed',
      interrupted: 'Interrupted'
    };

    const stateIcons = {
      suspended: '⏸',
      running: '▶',
      closed: '⏹',
      interrupted: '⚠'
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #fff;
        }

        :host([disabled]) .container {
          opacity: 0.5;
          cursor: not-allowed;
        }

        button {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 1rem;
          border: 1px solid #007bff;
          border-radius: 4px;
          background: #007bff;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        button:hover:not(:disabled) {
          background: #0056b3;
          border-color: #0056b3;
        }

        button:active:not(:disabled) {
          transform: translateY(1px);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .state-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #333;
        }

        .state-icon {
          font-size: 1rem;
        }

        .state-running {
          color: #28a745;
        }

        .state-suspended {
          color: #ffc107;
        }

        .state-closed {
          color: #dc3545;
        }

        .state-interrupted {
          color: #fd7e14;
        }

        .placeholder {
          font-size: 0.75rem;
          color: #6c757d;
          font-style: italic;
        }
      </style>

      <div class="container">
        <button ${disabled ? 'disabled' : ''}>
          <span class="state-icon">${stateIcons[state]}</span>
          <span>${state === 'suspended' ? 'Resume' : 'Suspend'} Audio</span>
        </button>
        <div class="state-indicator state-${state}">
          <span>State:</span>
          <strong>${stateLabels[state]}</strong>
        </div>
        ${!this.#audioContext ? `<div class="placeholder">${placeholder}</div>` : ''}
      </div>
    `;

    this._attachEventListeners();
  }
}

// Register custom element
if (!customElements.get('audio-context-lifecycle-manager')) {
  customElements.define('audio-context-lifecycle-manager', AudioContextLifecycleManager);
}

export default AudioContextLifecycleManager;
export { AudioContextLifecycleManager };