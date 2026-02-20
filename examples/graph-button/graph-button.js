/**
 * Graph-connected button component
 * Demonstrates component state extraction pattern
 * 
 * @see docs/guides/component-state-extraction.md
 */

import { graphEngine } from '../../harmony-graph/src/index.js';
import { eventBus } from '../../core/event-bus.js';

/**
 * Button component that renders state from graph
 * All state is stored in graph node, component is pure view
 * 
 * @example
 * ```html
 * <graph-button></graph-button>
 * <script>
 *   const button = document.querySelector('graph-button');
 *   button.setNode('button-node-id');
 * </script>
 * ```
 */
class GraphButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {string|null} Graph node ID this component renders */
    this.nodeId = null;
    
    /** @type {Function|null} Unsubscribe function for graph updates */
    this.unsubscribe = null;
  }
  
  /**
   * Connect component to graph node
   * @param {string} nodeId - Graph node identifier
   */
  setNode(nodeId) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    this.nodeId = nodeId;
    this.subscribe();
  }
  
  /**
   * Subscribe to graph node updates
   * Component re-renders when state changes
   */
  subscribe() {
    if (!this.nodeId) return;
    
    this.unsubscribe = graphEngine.subscribe(this.nodeId, (state) => {
      this.render(state);
    });
    
    // Initial render
    const state = graphEngine.getNode(this.nodeId);
    if (state) {
      this.render(state);
    }
  }
  
  /**
   * Render component from graph state
   * Pure function: same state → same output
   * 
   * @param {Object} state - Node state from graph
   * @param {string} state.label - Button text
   * @param {boolean} state.is_enabled - Enabled state
   * @param {boolean} state.is_loading - Loading state
   * @param {string} state.variant - Visual variant (primary, secondary, etc.)
   */
  render(state) {
    const { label, is_enabled, is_loading, variant } = state;
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        
        button {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        
        button.primary {
          background: #4A90E2;
          color: white;
        }
        
        button.secondary {
          background: #E0E0E0;
          color: #333;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        button.loading::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          margin-left: 8px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      
      <button 
        class="${variant} ${is_loading ? 'loading' : ''}"
        ?disabled="${!is_enabled || is_loading}"
      >
        ${label}
      </button>
    `;
    
    // Attach event listener
    const button = this.shadowRoot.querySelector('button');
    button.addEventListener('click', () => this.handleClick());
  }
  
  /**
   * Handle button click
   * Publishes event instead of updating state directly
   * Controller will handle the event and update graph
   */
  handleClick() {
    if (!this.nodeId) return;
    
    eventBus.publish({
      type: 'button.clicked',
      payload: { nodeId: this.nodeId },
    });
  }
  
  connectedCallback() {
    if (this.nodeId) {
      this.subscribe();
    }
  }
  
  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

customElements.define('graph-button', GraphButton);

export { GraphButton };