/**
 * @fileoverview Description Provider - Associates descriptions with interactive elements
 * 
 * Manages accessible descriptions for UI elements using aria-describedby and
 * aria-description attributes. Provides centralized description management
 * with automatic cleanup and validation.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Accessibility - Description Provider
 * 
 * @module core/description_provider
 */

import { EventBus } from './event_bus.js';

/**
 * Description Provider manages accessible descriptions for interactive elements.
 * 
 * Features:
 * - Associates descriptions with elements via aria-describedby
 * - Manages hidden description elements in the DOM
 * - Supports multiple descriptions per element
 * - Automatic cleanup on element removal
 * - Live region announcements for dynamic descriptions
 * 
 * @class DescriptionProvider
 */
export class DescriptionProvider {
  /**
   * @private
   * @type {Map<Element, Set<string>>}
   */
  #elementDescriptions = new Map();

  /**
   * @private
   * @type {Map<string, HTMLElement>}
   */
  #descriptionElements = new Map();

  /**
   * @private
   * @type {HTMLElement|null}
   */
  #container = null;

  /**
   * @private
   * @type {number}
   */
  #idCounter = 0;

  /**
   * @private
   * @type {MutationObserver|null}
   */
  #observer = null;

  constructor() {
    this.#initialize();
  }

  /**
   * Initialize the description provider
   * @private
   */
  #initialize() {
    // Create hidden container for description elements
    this.#container = document.createElement('div');
    this.#container.id = 'harmony-descriptions';
    this.#container.setAttribute('aria-hidden', 'true');
    this.#container.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;

    // Add to DOM when ready
    if (document.body) {
      document.body.appendChild(this.#container);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.#container);
      });
    }

    // Observe DOM for removed elements to cleanup descriptions
    this.#observer = new MutationObserver((mutations) => {
      this.#handleMutations(mutations);
    });

    this.#observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Publish initialization event
    EventBus.publish('DescriptionProvider:Initialized', {
      timestamp: Date.now()
    });
  }

  /**
   * Handle DOM mutations to cleanup removed elements
   * @private
   * @param {MutationRecord[]} mutations
   */
  #handleMutations(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.#cleanupElement(node);
          // Also cleanup descendants
          const descendants = node.querySelectorAll('[aria-describedby]');
          descendants.forEach(el => this.#cleanupElement(el));
        }
      }
    }
  }

  /**
   * Cleanup descriptions for a removed element
   * @private
   * @param {Element} element
   */
  #cleanupElement(element) {
    if (this.#elementDescriptions.has(element)) {
      const descriptionIds = this.#elementDescriptions.get(element);
      for (const id of descriptionIds) {
        const descElement = this.#descriptionElements.get(id);
        if (descElement && descElement.parentNode) {
          descElement.parentNode.removeChild(descElement);
        }
        this.#descriptionElements.delete(id);
      }
      this.#elementDescriptions.delete(element);
    }
  }

  /**
   * Generate unique ID for description element
   * @private
   * @returns {string}
   */
  #generateId() {
    return `harmony-desc-${++this.#idCounter}-${Date.now()}`;
  }

  /**
   * Associate a description with an element
   * 
   * @param {Element} element - Target element to describe
   * @param {string} description - Description text
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.append=false] - Append to existing descriptions
   * @param {boolean} [options.announce=false] - Announce via live region
   * @param {'polite'|'assertive'} [options.priority='polite'] - Announcement priority
   * @returns {string} ID of the created description element
   */
  setDescription(element, description, options = {}) {
    if (!(element instanceof Element)) {
      console.error('[DescriptionProvider] Invalid element provided');
      return null;
    }

    if (typeof description !== 'string' || !description.trim()) {
      console.error('[DescriptionProvider] Invalid description provided');
      return null;
    }

    const {
      append = false,
      announce = false,
      priority = 'polite'
    } = options;

    // Create description element
    const descId = this.#generateId();
    const descElement = document.createElement('div');
    descElement.id = descId;
    descElement.textContent = description.trim();

    // Add to container
    if (this.#container) {
      this.#container.appendChild(descElement);
    }

    // Track description element
    this.#descriptionElements.set(descId, descElement);

    // Update element's aria-describedby
    const existingIds = element.getAttribute('aria-describedby');
    let newIds;

    if (append && existingIds) {
      newIds = `${existingIds} ${descId}`;
    } else {
      newIds = descId;
      // Clean up old descriptions if not appending
      if (existingIds && this.#elementDescriptions.has(element)) {
        const oldIds = this.#elementDescriptions.get(element);
        for (const oldId of oldIds) {
          const oldElement = this.#descriptionElements.get(oldId);
          if (oldElement && oldElement.parentNode) {
            oldElement.parentNode.removeChild(oldElement);
          }
          this.#descriptionElements.delete(oldId);
        }
      }
    }

    element.setAttribute('aria-describedby', newIds);

    // Track element descriptions
    if (!this.#elementDescriptions.has(element)) {
      this.#elementDescriptions.set(element, new Set());
    }
    this.#elementDescriptions.get(element).add(descId);

    // Announce if requested
    if (announce) {
      EventBus.publish('LiveRegion:Announce', {
        message: description,
        priority,
        source: 'DescriptionProvider'
      });
    }

    // Publish event
    EventBus.publish('DescriptionProvider:DescriptionSet', {
      element,
      descriptionId: descId,
      description,
      append,
      timestamp: Date.now()
    });

    return descId;
  }

  /**
   * Set inline description using aria-description attribute
   * 
   * @param {Element} element - Target element
   * @param {string} description - Description text
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.announce=false] - Announce via live region
   * @param {'polite'|'assertive'} [options.priority='polite'] - Announcement priority
   */
  setInlineDescription(element, description, options = {}) {
    if (!(element instanceof Element)) {
      console.error('[DescriptionProvider] Invalid element provided');
      return;
    }

    if (typeof description !== 'string') {
      console.error('[DescriptionProvider] Invalid description provided');
      return;
    }

    const {
      announce = false,
      priority = 'polite'
    } = options;

    if (description.trim()) {
      element.setAttribute('aria-description', description.trim());
    } else {
      element.removeAttribute('aria-description');
    }

    // Announce if requested
    if (announce && description.trim()) {
      EventBus.publish('LiveRegion:Announce', {
        message: description,
        priority,
        source: 'DescriptionProvider'
      });
    }

    // Publish event
    EventBus.publish('DescriptionProvider:InlineDescriptionSet', {
      element,
      description,
      timestamp: Date.now()
    });
  }

  /**
   * Remove description from an element
   * 
   * @param {Element} element - Target element
   * @param {string} [descriptionId] - Specific description ID to remove (removes all if not provided)
   */
  removeDescription(element, descriptionId = null) {
    if (!(element instanceof Element)) {
      console.error('[DescriptionProvider] Invalid element provided');
      return;
    }

    if (descriptionId) {
      // Remove specific description
      const descElement = this.#descriptionElements.get(descriptionId);
      if (descElement && descElement.parentNode) {
        descElement.parentNode.removeChild(descElement);
      }
      this.#descriptionElements.delete(descriptionId);

      if (this.#elementDescriptions.has(element)) {
        this.#elementDescriptions.get(element).delete(descriptionId);
      }

      // Update aria-describedby
      const currentIds = element.getAttribute('aria-describedby');
      if (currentIds) {
        const ids = currentIds.split(/\s+/).filter(id => id !== descriptionId);
        if (ids.length > 0) {
          element.setAttribute('aria-describedby', ids.join(' '));
        } else {
          element.removeAttribute('aria-describedby');
        }
      }
    } else {
      // Remove all descriptions
      this.#cleanupElement(element);
      element.removeAttribute('aria-describedby');
      element.removeAttribute('aria-description');
    }

    // Publish event
    EventBus.publish('DescriptionProvider:DescriptionRemoved', {
      element,
      descriptionId,
      timestamp: Date.now()
    });
  }

  /**
   * Get current description text for an element
   * 
   * @param {Element} element - Target element
   * @returns {string} Combined description text
   */
  getDescription(element) {
    if (!(element instanceof Element)) {
      return '';
    }

    const descriptions = [];

    // Get aria-description
    const inlineDesc = element.getAttribute('aria-description');
    if (inlineDesc) {
      descriptions.push(inlineDesc);
    }

    // Get aria-describedby descriptions
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const ids = describedBy.split(/\s+/);
      for (const id of ids) {
        const descElement = document.getElementById(id);
        if (descElement) {
          descriptions.push(descElement.textContent.trim());
        }
      }
    }

    return descriptions.join(' ');
  }

  /**
   * Update existing description text
   * 
   * @param {string} descriptionId - ID of description to update
   * @param {string} newDescription - New description text
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.announce=false] - Announce change via live region
   * @param {'polite'|'assertive'} [options.priority='polite'] - Announcement priority
   */
  updateDescription(descriptionId, newDescription, options = {}) {
    const descElement = this.#descriptionElements.get(descriptionId);
    if (!descElement) {
      console.error('[DescriptionProvider] Description ID not found:', descriptionId);
      return;
    }

    const {
      announce = false,
      priority = 'polite'
    } = options;

    descElement.textContent = newDescription.trim();

    // Announce if requested
    if (announce) {
      EventBus.publish('LiveRegion:Announce', {
        message: newDescription,
        priority,
        source: 'DescriptionProvider'
      });
    }

    // Publish event
    EventBus.publish('DescriptionProvider:DescriptionUpdated', {
      descriptionId,
      description: newDescription,
      timestamp: Date.now()
    });
  }

  /**
   * Associate error message as description
   * 
   * @param {Element} element - Target element
   * @param {string} errorMessage - Error message text
   * @returns {string} ID of the created description element
   */
  setErrorDescription(element, errorMessage) {
    if (!(element instanceof Element)) {
      console.error('[DescriptionProvider] Invalid element provided');
      return null;
    }

    // Set aria-invalid
    element.setAttribute('aria-invalid', 'true');

    // Create error description
    const descId = this.setDescription(element, errorMessage, {
      append: false,
      announce: true,
      priority: 'assertive'
    });

    // Mark description element with error role
    const descElement = this.#descriptionElements.get(descId);
    if (descElement) {
      descElement.setAttribute('role', 'alert');
    }

    return descId;
  }

  /**
   * Clear error description and aria-invalid state
   * 
   * @param {Element} element - Target element
   */
  clearErrorDescription(element) {
    if (!(element instanceof Element)) {
      return;
    }

    element.removeAttribute('aria-invalid');
    this.removeDescription(element);
  }

  /**
   * Destroy the description provider and cleanup
   */
  destroy() {
    // Disconnect observer
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }

    // Remove container
    if (this.#container && this.#container.parentNode) {
      this.#container.parentNode.removeChild(this.#container);
    }

    // Clear maps
    this.#elementDescriptions.clear();
    this.#descriptionElements.clear();

    // Publish event
    EventBus.publish('DescriptionProvider:Destroyed', {
      timestamp: Date.now()
    });
  }
}

// Create singleton instance
export const descriptionProvider = new DescriptionProvider();

// Export for testing
if (typeof window !== 'undefined') {
  window.HarmonyDescriptionProvider = descriptionProvider;
}