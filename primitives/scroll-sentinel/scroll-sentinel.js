/**
 * @fileoverview Scroll Sentinel - Trigger element for load-more detection
 * @module primitives/scroll-sentinel
 * 
 * Vision Alignment: Reactive Component System
 * - Uses Intersection Observer API for efficient viewport detection
 * - Publishes events via EventBus for reactive load-more behavior
 * - Zero-dependency, GPU-accelerated visibility detection
 * 
 * Performance Targets:
 * - Render Budget: <1ms (minimal DOM, observer-based)
 * - Memory Budget: <100KB per instance
 * - Event latency: <16ms from visibility to event publish
 * 
 * Related Documentation: See harmony-design/DESIGN_SYSTEM.md § Scroll Sentinel
 * Related Components: infinite-loader (consumer of sentinel events)
 */

import { EventBus } from '../../core/event-bus.js';

/**
 * Scroll Sentinel Web Component
 * 
 * Invisible trigger element that detects when it enters/exits viewport.
 * Used for infinite scroll, lazy loading, and progressive content loading.
 * 
 * @class ScrollSentinelElement
 * @extends HTMLElement
 * 
 * @fires sentinel:visible - When sentinel enters viewport
 * @fires sentinel:hidden - When sentinel exits viewport
 * @fires sentinel:triggered - When sentinel enters viewport (one-time trigger)
 * 
 * @example
 * <!-- Basic usage -->
 * <scroll-sentinel 
 *   threshold="0.5"
 *   root-margin="200px"
 *   trigger-once="true">
 * </scroll-sentinel>
 * 
 * @example
 * // Listen for visibility events
 * document.addEventListener('sentinel:visible', (e) => {
 *   console.log('Sentinel visible:', e.detail);
 *   // Trigger load more content
 * });
 */
class ScrollSentinelElement extends HTMLElement {
  /**
   * @private
   * @type {IntersectionObserver|null}
   */
  #observer = null;

  /**
   * @private
   * @type {boolean}
   */
  #hasTriggered = false;

  /**
   * @private
   * @type {boolean}
   */
  #isVisible = false;

  /**
   * @private
   * @type {number}
   */
  #visibilityStartTime = 0;

  static get observedAttributes() {
    return [
      'threshold',
      'root-margin',
      'trigger-once',
      'disabled',
      'debug'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupObserver();
    
    if (this.hasAttribute('debug')) {
      this.logDebug('Sentinel connected', {
        threshold: this.threshold,
        rootMargin: this.rootMargin,
        triggerOnce: this.triggerOnce
      });
    }
  }

  disconnectedCallback() {
    this.destroyObserver();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'threshold':
      case 'root-margin':
        // Recreate observer with new settings
        this.destroyObserver();
        this.setupObserver();
        break;
      
      case 'trigger-once':
        // Reset trigger state if changing from true to false
        if (oldValue === 'true' && newValue === 'false') {
          this.#hasTriggered = false;
        }
        break;
      
      case 'disabled':
        if (newValue !== null) {
          this.destroyObserver();
        } else {
          this.setupObserver();
        }
        break;
    }
  }

  /**
   * Threshold at which to trigger visibility (0.0 to 1.0)
   * @type {number}
   */
  get threshold() {
    const value = parseFloat(this.getAttribute('threshold') || '0');
    return Math.max(0, Math.min(1, value));
  }

  set threshold(value) {
    this.setAttribute('threshold', String(value));
  }

  /**
   * Root margin for intersection observer (e.g., "200px")
   * @type {string}
   */
  get rootMargin() {
    return this.getAttribute('root-margin') || '0px';
  }

  set rootMargin(value) {
    this.setAttribute('root-margin', value);
  }

  /**
   * Whether to trigger only once
   * @type {boolean}
   */
  get triggerOnce() {
    return this.hasAttribute('trigger-once');
  }

  set triggerOnce(value) {
    if (value) {
      this.setAttribute('trigger-once', '');
    } else {
      this.removeAttribute('trigger-once');
    }
  }

  /**
   * Whether sentinel is disabled
   * @type {boolean}
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Whether sentinel is currently visible
   * @type {boolean}
   */
  get isVisible() {
    return this.#isVisible;
  }

  /**
   * Whether sentinel has triggered (for trigger-once mode)
   * @type {boolean}
   */
  get hasTriggered() {
    return this.#hasTriggered;
  }

  /**
   * Reset the triggered state (useful for trigger-once mode)
   */
  reset() {
    this.#hasTriggered = false;
    this.#isVisible = false;
    this.#visibilityStartTime = 0;
    
    if (this.hasAttribute('debug')) {
      this.logDebug('Sentinel reset');
    }
  }

  /**
   * Setup Intersection Observer
   * @private
   */
  setupObserver() {
    if (this.disabled || this.#observer) return;

    const options = {
      threshold: this.threshold,
      rootMargin: this.rootMargin
    };

    this.#observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      options
    );

    this.#observer.observe(this);

    if (this.hasAttribute('debug')) {
      this.logDebug('Observer created', options);
    }
  }

  /**
   * Destroy Intersection Observer
   * @private
   */
  destroyObserver() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
  }

  /**
   * Handle intersection changes
   * @private
   * @param {IntersectionObserverEntry[]} entries
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      const wasVisible = this.#isVisible;
      this.#isVisible = entry.isIntersecting;

      if (this.hasAttribute('debug')) {
        this.logDebug('Intersection change', {
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          wasVisible,
          hasTriggered: this.#hasTriggered
        });
      }

      // Entering viewport
      if (entry.isIntersecting && !wasVisible) {
        this.#visibilityStartTime = performance.now();
        this.handleVisible(entry);
      }
      
      // Exiting viewport
      if (!entry.isIntersecting && wasVisible) {
        this.handleHidden(entry);
      }
    });
  }

  /**
   * Handle sentinel becoming visible
   * @private
   * @param {IntersectionObserverEntry} entry
   */
  handleVisible(entry) {
    // Check if should trigger
    if (this.triggerOnce && this.#hasTriggered) {
      return;
    }

    const detail = {
      sentinel: this,
      entry,
      intersectionRatio: entry.intersectionRatio,
      boundingClientRect: entry.boundingClientRect,
      timestamp: performance.now()
    };

    // Publish visible event
    this.publishEvent('sentinel:visible', detail);

    // Publish triggered event (semantic alias for visible)
    if (!this.#hasTriggered) {
      this.publishEvent('sentinel:triggered', detail);
      this.#hasTriggered = true;

      // If trigger-once, disconnect observer to save resources
      if (this.triggerOnce) {
        this.destroyObserver();
      }
    }
  }

  /**
   * Handle sentinel becoming hidden
   * @private
   * @param {IntersectionObserverEntry} entry
   */
  handleHidden(entry) {
    const visibilityDuration = performance.now() - this.#visibilityStartTime;

    const detail = {
      sentinel: this,
      entry,
      intersectionRatio: entry.intersectionRatio,
      boundingClientRect: entry.boundingClientRect,
      visibilityDuration,
      timestamp: performance.now()
    };

    // Publish hidden event
    this.publishEvent('sentinel:hidden', detail);
  }

  /**
   * Publish event via EventBus and DOM
   * @private
   * @param {string} type - Event type
   * @param {object} detail - Event detail
   */
  publishEvent(type, detail) {
    // DOM event (for local listeners)
    const domEvent = new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail
    });
    this.dispatchEvent(domEvent);

    // EventBus event (for global coordination)
    if (window.EventBus || EventBus) {
      const bus = window.EventBus || EventBus;
      bus.publish({
        type,
        payload: detail,
        source: 'scroll-sentinel',
        timestamp: performance.now()
      });
    }
  }

  /**
   * Log debug information
   * @private
   * @param {string} message
   * @param {object} [data]
   */
  logDebug(message, data = {}) {
    console.log(`[ScrollSentinel]`, message, {
      id: this.id || '(no id)',
      ...data
    });
  }

  /**
   * Render component
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 1px;
          min-height: 1px;
          pointer-events: none;
          visibility: visible;
        }

        :host([disabled]) {
          display: none;
        }

        :host([debug]) {
          height: 20px;
          background: repeating-linear-gradient(
            45deg,
            rgba(255, 0, 0, 0.1),
            rgba(255, 0, 0, 0.1) 10px,
            rgba(0, 0, 255, 0.1) 10px,
            rgba(0, 0, 255, 0.1) 20px
          );
          border: 1px dashed rgba(255, 0, 0, 0.5);
          visibility: visible;
        }

        :host([debug])::before {
          content: 'Sentinel: ' attr(id);
          position: absolute;
          top: 2px;
          left: 4px;
          font-size: 10px;
          font-family: monospace;
          color: rgba(255, 0, 0, 0.8);
          pointer-events: none;
        }

        /* Ensure sentinel is in document flow */
        :host {
          contain: layout style;
        }
      </style>
      <slot></slot>
    `;
  }
}

// Register custom element
if (!customElements.get('scroll-sentinel')) {
  customElements.define('scroll-sentinel', ScrollSentinelElement);
}

export { ScrollSentinelElement };