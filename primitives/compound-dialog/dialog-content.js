/**
 * @fileoverview Dialog.Content - Content container for dialog
 * @module primitives/compound-dialog/dialog-content
 * 
 * Container for dialog content with backdrop and positioning.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#compound-patterns}
 */

/**
 * DialogContent Web Component
 * 
 * Content container that renders dialog with backdrop and positioning.
 * Handles backdrop styling and content layout.
 * 
 * @element dialog-content
 * 
 * @attr {string} position - Dialog position: "center", "top", "bottom"
 * @attr {string} size - Dialog size: "small", "medium", "large", "full"
 * 
 * @example
 * <dialog-content position="center" size="medium">
 *   <h2>Dialog Title</h2>
 *   <p>Dialog content</p>
 * </dialog-content>
 */
class DialogContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['position', 'size'];
  }

  connectedCallback() {
    this.render();
    
    // Set ARIA attributes
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const position = this.getAttribute('position') || 'center';
    const size = this.getAttribute('size') || 'medium';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: none;
        }
        
        :host-context(dialog-root[open]) {
          display: flex;
        }
        
        .backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          animation: fadeIn 200ms ease-out;
        }
        
        .dialog {
          position: relative;
          background: var(--dialog-bg, white);
          border-radius: var(--dialog-radius, 8px);
          box-shadow: var(--dialog-shadow, 0 10px 40px rgba(0, 0, 0, 0.2));
          max-height: 90vh;
          overflow: auto;
          animation: slideIn 200ms ease-out;
          margin: auto;
        }
        
        /* Position variants */
        :host([position="center"]) {
          align-items: center;
          justify-content: center;
        }
        
        :host([position="top"]) {
          align-items: flex-start;
          justify-content: center;
          padding-top: 5vh;
        }
        
        :host([position="bottom"]) {
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 5vh;
        }
        
        /* Size variants */
        :host([size="small"]) .dialog {
          width: 90%;
          max-width: 400px;
        }
        
        :host([size="medium"]) .dialog {
          width: 90%;
          max-width: 600px;
        }
        
        :host([size="large"]) .dialog {
          width: 90%;
          max-width: 900px;
        }
        
        :host([size="full"]) .dialog {
          width: 95vw;
          height: 95vh;
          max-height: 95vh;
        }
        
        .content {
          padding: var(--dialog-padding, 24px);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Performance optimization */
        .backdrop,
        .dialog {
          will-change: opacity, transform;
        }
        
        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .backdrop,
          .dialog {
            animation: none;
          }
        }
      </style>
      <div class="backdrop"></div>
      <div class="dialog" part="dialog">
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('dialog-content', DialogContent);

export default DialogContent;