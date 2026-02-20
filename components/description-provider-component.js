/**
 * @fileoverview Description Provider Web Component
 * 
 * Web Component wrapper for the Description Provider system.
 * Provides declarative API for associating descriptions with elements.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Components - Description Provider
 * 
 * @module components/description-provider-component
 */

import { descriptionProvider } from '../core/description_provider.js';
import { EventBus } from '../core/event_bus.js';

/**
 * Description Provider Component
 * 
 * Usage:
 * ```html
 * <description-provider 
 *   target="button-id"
 *   description="Click to submit the form"
 *   announce="false">
 * </description-provider>
 * ```
 * 
 * @element description-provider
 * @attr {string} target - ID of target element to describe
 * @attr {string} description - Description text
 * @attr {boolean} append - Append to existing descriptions
 * @attr {boolean} announce - Announce via live region
 * @attr {string} priority - Announcement priority (polite|assertive)
 * @attr {boolean} inline - Use aria-description instead of aria-describedby
 * @attr {boolean} error - Style as error description
 */
class DescriptionProviderComponent extends HTMLElement {
  /**
   * @private
   * @type {string|null}
   */
  #descriptionId = null;

  /**
   * @private
   * @type {Element|null}
   */
  #targetElement = null;

  static get observedAttributes() {
    return ['target', 'description', 'append', 'announce', 'priority', 'inline', 'error'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#render();
    this.#applyDescription();
  }

  disconnectedCallback() {
    this.#cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) {
      if (name === 'description') {
        this.#updateDescription();
      } else {
        this.#applyDescription();
      }
    }
  }

  /**
   * Render component (hidden, as it's just a controller)
   * @private
   */
  #render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
        }
      </style>
    `;
  }

  /**
   * Get target element
   * @private
   * @returns {Element|null}
   */
  #getTargetElement() {
    const targetId = this.getAttribute('target');
    if (!targetId) {
      console.error('[DescriptionProviderComponent] No target attribute specified');
      return null;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      console.error('[DescriptionProviderComponent] Target element not found:', targetId);
      return null;
    }

    return target;
  }

  /**
   * Apply description to target element
   * @private
   */
  #applyDescription() {
    this.#cleanup();

    const target = this.#getTargetElement();
    if (!target) return;

    this.#targetElement = target;

    const description = this.getAttribute('description');
    if (!description) return;

    const append = this.hasAttribute('append');
    const announce = this.hasAttribute('announce');
    const priority = this.getAttribute('priority') || 'polite';
    const inline = this.hasAttribute('inline');
    const isError = this.hasAttribute('error');

    if (isError) {
      this.#descriptionId = descriptionProvider.setErrorDescription(target, description);
    } else if (inline) {
      descriptionProvider.setInlineDescription(target, description, {
        announce,
        priority
      });
    } else {
      this.#descriptionId = descriptionProvider.setDescription(target, description, {
        append,
        announce,
        priority
      });
    }

    // Publish event
    EventBus.publish('DescriptionProviderComponent:Applied', {
      target: target.id,
      description,
      inline,
      error: isError,
      timestamp: Date.now()
    });
  }

  /**
   * Update existing description
   * @private
   */
  #updateDescription() {
    const description = this.getAttribute('description');
    const inline = this.hasAttribute('inline');
    const announce = this.hasAttribute('announce');
    const priority = this.getAttribute('priority') || 'polite';

    if (!description) {
      this.#cleanup();
      return;
    }

    if (inline && this.#targetElement) {
      descriptionProvider.setInlineDescription(this.#targetElement, description, {
        announce,
        priority
      });
    } else if (this.#descriptionId) {
      descriptionProvider.updateDescription(this.#descriptionId, description, {
        announce,
        priority
      });
    } else {
      this.#applyDescription();
    }
  }

  /**
   * Cleanup descriptions
   * @private
   */
  #cleanup() {
    if (this.#targetElement) {
      const isError = this.hasAttribute('error');
      if (isError) {
        descriptionProvider.clearErrorDescription(this.#targetElement);
      } else if (this.#descriptionId) {
        descriptionProvider.removeDescription(this.#targetElement, this.#descriptionId);
      }
    }
    this.#descriptionId = null;
    this.#targetElement = null;
  }
}

customElements.define('description-provider', DescriptionProviderComponent);

export { DescriptionProviderComponent };