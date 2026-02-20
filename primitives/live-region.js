/**
 * @fileoverview Live Region Web Component
 * @module primitives/live-region
 * 
 * Declarative web component for ARIA live regions.
 * Wraps LiveRegionManager for use in templates.
 * 
 * Usage:
 * <harmony-live-region politeness="polite" role="status">
 *   Message content
 * </harmony-live-region>
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#live-regions
 */

import { LiveRegionManager } from '../core/live_region_manager.js';

/**
 * Live Region Web Component
 * Provides declarative ARIA live region with automatic announcements
 */
export class HarmonyLiveRegion extends HTMLElement {
  /** @type {ShadowRoot} */
  #shadow;

  /** @type {LiveRegionManager} */
  #manager;

  /** @type {MutationObserver|null} */
  #observer = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#manager = LiveRegionManager.getInstance();
  }

  static get observedAttributes() {
    return ['politeness', 'role', 'atomic', 'relevant', 'visible'];
  }

  connectedCallback() {
    this.#render();
    this.#setupMutationObserver();
    
    // Announce initial content if present
    const initialText = this.textContent?.trim();
    if (initialText) {
      this.#announceContent(initialText);
    }
  }

  disconnectedCallback() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.#render();
    }
  }

  /**
   * Render the component
   * @private
   */
  #render() {
    const politeness = this.getAttribute('politeness') || 'polite';
    const role = this.getAttribute('role') || 'status';
    const atomic = this.getAttribute('atomic') || 'true';
    const relevant = this.getAttribute('relevant') || 'additions text';
    const visible = this.hasAttribute('visible');

    this.#shadow.innerHTML = `
      <style>
        :host {
          display: block;
        }

        :host([hidden]) {
          display: none;
        }

        .live-region {
          ${visible ? '' : `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
          `}
        }

        .live-region[aria-live="assertive"] {
          /* Assertive regions can be styled differently if visible */
        }
      </style>

      <div
        class="live-region"
        role="${role}"
        aria-live="${politeness}"
        aria-atomic="${atomic}"
        aria-relevant="${relevant}"
      >
        <slot></slot>
      </div>
    `;
  }

  /**
   * Setup mutation observer to watch for content changes
   * @private
   */
  #setupMutationObserver() {
    this.#observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const text = this.textContent?.trim();
          if (text) {
            this.#announceContent(text);
          }
        }
      }
    });

    this.#observer.observe(this, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  /**
   * Announce content using LiveRegionManager
   * @param {string} text - Text to announce
   * @private
   */
  #announceContent(text) {
    const politeness = this.getAttribute('politeness') || 'polite';
    const role = this.getAttribute('role') || 'status';

    this.#manager.announce(text, {
      politeness,
      role,
      clear: true,
      clearDelay: 1000
    });
  }

  /**
   * Programmatically announce a message
   * @param {string} message - Message to announce
   * @param {Object} [options={}] - Announcement options
   */
  announce(message, options = {}) {
    const politeness = options.politeness || this.getAttribute('politeness') || 'polite';
    const role = options.role || this.getAttribute('role') || 'status';

    this.#manager.announce(message, {
      politeness,
      role,
      ...options
    });
  }

  /**
   * Clear the live region
   */
  clear() {
    this.textContent = '';
  }
}

// Register custom element
if (!customElements.get('harmony-live-region')) {
  customElements.define('harmony-live-region', HarmonyLiveRegion);
}