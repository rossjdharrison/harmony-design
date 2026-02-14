/**
 * @fileoverview Base Web Component class for Harmony Design System.
 * All Harmony components extend this base class.
 * See DESIGN_SYSTEM.md#web-components for component architecture.
 */

/**
 * @typedef {Object} ComponentState
 * @property {*} [key] - Component state values
 */

/**
 * Base class for all Harmony Design System web components.
 * Provides common functionality for state management, lifecycle, and event handling.
 * 
 * @class HarmonyBaseComponent
 * @extends HTMLElement
 * @example
 * class MyComponent extends HarmonyBaseComponent {
 *   constructor() {
 *     super();
 *     this.state = { count: 0 };
 *   }
 *   
 *   render() {
 *     return `<div>${this.state.count}</div>`;
 *   }
 * }
 */
class HarmonyBaseComponent extends HTMLElement {
  /**
   * Creates a HarmonyBaseComponent instance.
   * @constructor
   */
  constructor() {
    super();
    
    /** @protected @type {ShadowRoot} */
    this.shadowRoot = this.attachShadow({ mode: 'open' });
    
    /** @protected @type {ComponentState} */
    this.state = {};
    
    /** @private @type {boolean} */
    this._mounted = false;
    
    /** @private @type {Array<string>} */
    this._eventSubscriptions = [];
  }

  /**
   * Called when component is added to DOM.
   * @protected
   */
  connectedCallback() {
    this._mounted = true;
    this.onMount();
    this.update();
  }

  /**
   * Called when component is removed from DOM.
   * @protected
   */
  disconnectedCallback() {
    this._mounted = false;
    this.onUnmount();
    this._cleanupSubscriptions();
  }

  /**
   * Called when observed attribute changes.
   * @protected
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.onAttributeChange(name, oldValue, newValue);
      if (this._mounted) {
        this.update();
      }
    }
  }

  /**
   * Updates component state and triggers re-render.
   * 
   * @param {Object} newState - Partial state to merge
   * 
   * @example
   * this.setState({ count: this.state.count + 1 });
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this._mounted) {
      this.update();
    }
  }

  /**
   * Updates the component's rendered output.
   * Called automatically when state changes.
   * 
   * @protected
   */
  update() {
    const startTime = performance.now();
    
    const html = this.render();
    this.shadowRoot.innerHTML = html;
    this.attachStyles();
    this.attachEventListeners();
    
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`[${this.constructor.name}] Render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Renders component HTML. Override in subclasses.
   * 
   * @protected
   * @returns {string} HTML string
   * 
   * @example
   * render() {
   *   return `<div class="my-component">${this.state.text}</div>`;
   * }
   */
  render() {
    return '';
  }

  /**
   * Attaches component styles. Override in subclasses.
   * 
   * @protected
   * 
   * @example
   * attachStyles() {
   *   const style = document.createElement('style');
   *   style.textContent = `.my-class { color: red; }`;
   *   this.shadowRoot.appendChild(style);
   * }
   */
  attachStyles() {
    // Override in subclasses
  }

  /**
   * Attaches event listeners. Override in subclasses.
   * 
   * @protected
   * 
   * @example
   * attachEventListeners() {
   *   this.shadowRoot.querySelector('button')
   *     .addEventListener('click', () => this.handleClick());
   * }
   */
  attachEventListeners() {
    // Override in subclasses
  }

  /**
   * Lifecycle hook called when component mounts.
   * 
   * @protected
   * 
   * @example
   * onMount() {
   *   console.log('Component mounted');
   * }
   */
  onMount() {
    // Override in subclasses
  }

  /**
   * Lifecycle hook called when component unmounts.
   * 
   * @protected
   * 
   * @example
   * onUnmount() {
   *   console.log('Component unmounting');
   * }
   */
  onUnmount() {
    // Override in subclasses
  }

  /**
   * Lifecycle hook called when attribute changes.
   * 
   * @protected
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   * 
   * @example
   * onAttributeChange(name, oldValue, newValue) {
   *   console.log(`${name} changed from ${oldValue} to ${newValue}`);
   * }
   */
  onAttributeChange(name, oldValue, newValue) {
    // Override in subclasses
  }

  /**
   * Publishes an event through the EventBus.
   * 
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   * @returns {string} Event ID
   * 
   * @example
   * this.publishEvent('ButtonClicked', { buttonId: 'play' });
   */
  publishEvent(eventType, payload) {
    // Import EventBus dynamically to avoid circular dependencies
    return window.HarmonyEventBus?.publish(eventType, payload, this.constructor.name);
  }

  /**
   * Subscribes to EventBus events.
   * Automatically cleaned up on unmount.
   * 
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler
   * @returns {string} Subscription ID
   * 
   * @example
   * this.subscribeToEvent('StateChanged', (event) => {
   *   console.log('State changed:', event.payload);
   * });
   */
  subscribeToEvent(eventType, handler) {
    const subId = window.HarmonyEventBus?.subscribe(eventType, handler);
    if (subId) {
      this._eventSubscriptions.push(subId);
    }
    return subId;
  }

  /**
   * Cleans up event subscriptions.
   * @private
   */
  _cleanupSubscriptions() {
    this._eventSubscriptions.forEach(subId => {
      window.HarmonyEventBus?.unsubscribe(subId);
    });
    this._eventSubscriptions = [];
  }

  /**
   * Gets an attribute as a boolean.
   * 
   * @param {string} name - Attribute name
   * @returns {boolean} Attribute value as boolean
   * 
   * @example
   * const isDisabled = this.getBooleanAttribute('disabled');
   */
  getBooleanAttribute(name) {
    return this.hasAttribute(name);
  }

  /**
   * Gets an attribute as a number.
   * 
   * @param {string} name - Attribute name
   * @param {number} [defaultValue=0] - Default value if not set
   * @returns {number} Attribute value as number
   * 
   * @example
   * const count = this.getNumberAttribute('count', 0);
   */
  getNumberAttribute(name, defaultValue = 0) {
    const value = this.getAttribute(name);
    return value ? parseFloat(value) : defaultValue;
  }
}

export default HarmonyBaseComponent;