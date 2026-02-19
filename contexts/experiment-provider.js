/**
 * @fileoverview Experiment Provider Web Component
 * @module contexts/experiment-provider
 * 
 * Web Component that provides experiment context to child components.
 * Vanilla JS equivalent to React Context Provider.
 * 
 * Usage:
 * <experiment-provider>
 *   <my-component></my-component>
 * </experiment-provider>
 * 
 * Related: See DESIGN_SYSTEM.md § Experiment System
 */

import { experimentContext } from './experiment-context.js';

/**
 * ExperimentProvider - Web Component that provides experiment context
 * @extends HTMLElement
 */
class ExperimentProvider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.setupContext();
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  /**
   * Setup experiment context for child components
   * @private
   */
  setupContext() {
    // Make context available to children via property
    this._experimentContext = experimentContext;

    // Subscribe to context changes
    this.unsubscribe = experimentContext.subscribe((event) => {
      this.handleContextChange(event);
    });

    // Dispatch event to notify children context is ready
    this.dispatchEvent(new CustomEvent('experiment-context-ready', {
      bubbles: true,
      composed: true,
      detail: { context: experimentContext }
    }));
  }

  /**
   * Handle context changes
   * @param {Object} event - Change event
   * @private
   */
  handleContextChange(event) {
    // Dispatch event to notify children of changes
    this.dispatchEvent(new CustomEvent('experiment-context-change', {
      bubbles: true,
      composed: true,
      detail: event
    }));
  }

  /**
   * Get experiment context (for child components)
   * @returns {ExperimentContext} Experiment context instance
   */
  getExperimentContext() {
    return this._experimentContext;
  }

  /**
   * Render component
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }
}

// Register custom element
if (typeof customElements !== 'undefined') {
  customElements.define('experiment-provider', ExperimentProvider);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExperimentProvider };
}