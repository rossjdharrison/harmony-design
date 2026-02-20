/**
 * @fileoverview Graph binding layer for button component
 * Bridges button primitive with Harmony graph system for reactive state management
 * 
 * Vision Alignment: Reactive Component System
 * - Connects button component to graph-based state management
 * - Enables declarative reactive updates via graph nodes
 * - Supports atomic design by providing reusable binding pattern
 * 
 * @module harmony-graph/bindings/button-binding
 * @see {@link ../../DESIGN_SYSTEM.md#graph-bindings Graph Bindings}
 * @see {@link ../../primitives/button/button.js Button Component}
 */

import { ComponentBinding } from './component-binding.js';

/**
 * Graph binding for button component
 * Manages bidirectional data flow between button DOM element and graph nodes
 * 
 * Supported graph node properties:
 * - label: Button text content
 * - disabled: Disabled state
 * - variant: Visual variant (primary, secondary, tertiary)
 * - size: Size variant (small, medium, large)
 * - loading: Loading state indicator
 * - icon: Icon identifier
 * - iconPosition: Icon placement (left, right)
 * 
 * Events published to graph:
 * - button:click - User clicked button
 * - button:focus - Button received focus
 * - button:blur - Button lost focus
 * 
 * Performance: < 1ms per update cycle
 * 
 * @extends ComponentBinding
 */
export class ButtonBinding extends ComponentBinding {
  /**
   * Create button graph binding
   * @param {Object} config - Binding configuration
   * @param {string} config.nodeId - Graph node identifier
   * @param {HTMLElement} config.element - Button DOM element
   * @param {Object} config.graph - Graph instance reference
   * @param {Object} [config.eventBus] - EventBus instance for command pattern
   */
  constructor(config) {
    super(config);
    
    /** @private {Map<string, Function>} Property update handlers */
    this._propertyHandlers = new Map([
      ['label', this._updateLabel.bind(this)],
      ['disabled', this._updateDisabled.bind(this)],
      ['variant', this._updateVariant.bind(this)],
      ['size', this._updateSize.bind(this)],
      ['loading', this._updateLoading.bind(this)],
      ['icon', this._updateIcon.bind(this)],
      ['iconPosition', this._updateIconPosition.bind(this)]
    ]);

    /** @private {Set<string>} Tracked event types */
    this._trackedEvents = new Set(['click', 'focus', 'blur']);
    
    this._attachEventListeners();
  }

  /**
   * Attach DOM event listeners for graph synchronization
   * @private
   */
  _attachEventListeners() {
    if (!this.element) return;

    // Click events
    this.element.addEventListener('click', (event) => {
      this._publishEvent('button:click', {
        nodeId: this.nodeId,
        timestamp: performance.now(),
        modifiers: {
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey,
          meta: event.metaKey
        }
      });
    });

    // Focus events
    this.element.addEventListener('focus', () => {
      this._publishEvent('button:focus', {
        nodeId: this.nodeId,
        timestamp: performance.now()
      });
    });

    // Blur events
    this.element.addEventListener('blur', () => {
      this._publishEvent('button:blur', {
        nodeId: this.nodeId,
        timestamp: performance.now()
      });
    });
  }

  /**
   * Update button label from graph node
   * @private
   * @param {string} value - New label text
   */
  _updateLabel(value) {
    if (!this.element) return;
    
    const textNode = this.element.shadowRoot?.querySelector('.button-text') 
      || this.element.querySelector('.button-text');
    
    if (textNode) {
      textNode.textContent = value;
    } else {
      // Fallback: update entire button text content
      this.element.textContent = value;
    }
  }

  /**
   * Update button disabled state from graph node
   * @private
   * @param {boolean} value - Disabled state
   */
  _updateDisabled(value) {
    if (!this.element) return;
    
    if (value) {
      this.element.setAttribute('disabled', '');
      this.element.setAttribute('aria-disabled', 'true');
    } else {
      this.element.removeAttribute('disabled');
      this.element.setAttribute('aria-disabled', 'false');
    }
  }

  /**
   * Update button variant from graph node
   * @private
   * @param {string} value - Variant name (primary, secondary, tertiary)
   */
  _updateVariant(value) {
    if (!this.element) return;
    
    // Remove existing variant attributes
    ['primary', 'secondary', 'tertiary'].forEach(variant => {
      this.element.removeAttribute(variant);
    });
    
    // Set new variant
    if (value) {
      this.element.setAttribute(value, '');
    }
  }

  /**
   * Update button size from graph node
   * @private
   * @param {string} value - Size name (small, medium, large)
   */
  _updateSize(value) {
    if (!this.element) return;
    
    // Remove existing size attributes
    ['small', 'medium', 'large'].forEach(size => {
      this.element.removeAttribute(size);
    });
    
    // Set new size
    if (value) {
      this.element.setAttribute(value, '');
    }
  }

  /**
   * Update button loading state from graph node
   * @private
   * @param {boolean} value - Loading state
   */
  _updateLoading(value) {
    if (!this.element) return;
    
    if (value) {
      this.element.setAttribute('loading', '');
      this.element.setAttribute('aria-busy', 'true');
    } else {
      this.element.removeAttribute('loading');
      this.element.setAttribute('aria-busy', 'false');
    }
  }

  /**
   * Update button icon from graph node
   * @private
   * @param {string} value - Icon identifier
   */
  _updateIcon(value) {
    if (!this.element) return;
    
    if (value) {
      this.element.setAttribute('icon', value);
    } else {
      this.element.removeAttribute('icon');
    }
  }

  /**
   * Update icon position from graph node
   * @private
   * @param {string} value - Icon position (left, right)
   */
  _updateIconPosition(value) {
    if (!this.element) return;
    
    if (value) {
      this.element.setAttribute('icon-position', value);
    } else {
      this.element.removeAttribute('icon-position');
    }
  }

  /**
   * Synchronize component state with graph node
   * Called when graph node properties change
   * @param {Object} nodeData - Current graph node data
   * @returns {boolean} Success status
   */
  sync(nodeData) {
    if (!nodeData || !this.element) return false;

    const startTime = performance.now();

    try {
      // Update each property that has a handler
      for (const [property, handler] of this._propertyHandlers) {
        if (property in nodeData) {
          handler(nodeData[property]);
        }
      }

      const duration = performance.now() - startTime;
      
      // Performance budget check: < 1ms per sync
      if (duration > 1) {
        console.warn(`ButtonBinding sync exceeded budget: ${duration.toFixed(2)}ms`);
      }

      return true;
    } catch (error) {
      console.error('ButtonBinding sync error:', error);
      return false;
    }
  }

  /**
   * Publish event to graph system
   * @private
   * @param {string} eventType - Event type identifier
   * @param {Object} payload - Event payload data
   */
  _publishEvent(eventType, payload) {
    if (this.eventBus) {
      // Use EventBus command pattern
      this.eventBus.publish(eventType, payload);
    } else if (this.graph && typeof this.graph.publishEvent === 'function') {
      // Fallback to direct graph API
      this.graph.publishEvent(eventType, payload);
    }
  }

  /**
   * Read current component state into graph node format
   * @returns {Object} Current component state
   */
  readState() {
    if (!this.element) return {};

    return {
      label: this.element.textContent?.trim() || '',
      disabled: this.element.hasAttribute('disabled'),
      variant: this._getCurrentVariant(),
      size: this._getCurrentSize(),
      loading: this.element.hasAttribute('loading'),
      icon: this.element.getAttribute('icon') || null,
      iconPosition: this.element.getAttribute('icon-position') || 'left'
    };
  }

  /**
   * Get current variant from element attributes
   * @private
   * @returns {string|null} Current variant name
   */
  _getCurrentVariant() {
    const variants = ['primary', 'secondary', 'tertiary'];
    for (const variant of variants) {
      if (this.element.hasAttribute(variant)) {
        return variant;
      }
    }
    return null;
  }

  /**
   * Get current size from element attributes
   * @private
   * @returns {string|null} Current size name
   */
  _getCurrentSize() {
    const sizes = ['small', 'medium', 'large'];
    for (const size of sizes) {
      if (this.element.hasAttribute(size)) {
        return size;
      }
    }
    return null;
  }

  /**
   * Cleanup binding resources
   * Removes event listeners and graph subscriptions
   */
  destroy() {
    // Event listeners are automatically cleaned up when element is removed
    // Graph subscriptions cleaned up by parent class
    super.destroy();
  }
}

/**
 * Factory function to create button binding
 * Convenience wrapper for ButtonBinding constructor
 * 
 * @param {Object} config - Binding configuration
 * @param {string} config.nodeId - Graph node identifier
 * @param {HTMLElement} config.element - Button DOM element
 * @param {Object} config.graph - Graph instance reference
 * @param {Object} [config.eventBus] - EventBus instance
 * @returns {ButtonBinding} Configured binding instance
 * 
 * @example
 * const binding = createButtonBinding({
 *   nodeId: 'playButton',
 *   element: document.querySelector('harmony-button'),
 *   graph: graphInstance,
 *   eventBus: eventBusInstance
 * });
 */
export function createButtonBinding(config) {
  return new ButtonBinding(config);
}