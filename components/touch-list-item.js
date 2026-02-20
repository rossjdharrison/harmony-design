/**
 * Touch-Friendly List Item Component
 * Provides accessible list item with appropriate touch targets (44px minimum)
 * Suitable for navigation menus, settings lists, and interactive lists
 * @see DESIGN_SYSTEM.md#touch-friendly-variants
 */

class TouchListItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['size', 'disabled', 'selected', 'href', 'aria-label'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Renders the list item with touch-friendly sizing
   * @private
   */
  render() {
    const size = this.getAttribute('size') || 'comfortable';
    const disabled = this.hasAttribute('disabled');
    const selected = this.hasAttribute('selected');
    const href = this.getAttribute('href');
    const ariaLabel = this.getAttribute('aria-label') || '';
    const isLink = !!href;
    const tag = isLink ? 'a' : 'div';

    this.shadowRoot.innerHTML = `
      <style>
        @import url('/styles/touch-friendly.css');

        :host {
          display: block;
        }

        .list-item {
          all: unset;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: var(--target-spacing);
          width: 100%;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          position: relative;
          transition: background-color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }

        /* Size variants */
        .list-item.size-minimum {
          min-height: var(--touch-target-minimum);
          padding: var(--touch-spacing-minimum);
          font-size: var(--touch-font-minimum);
        }

        .list-item.size-comfortable {
          min-height: var(--touch-target-comfortable);
          padding: var(--touch-spacing-comfortable);
          font-size: var(--touch-font-comfortable);
        }

        .list-item.size-spacious {
          min-height: var(--touch-target-spacious);
          padding: var(--touch-spacing-spacious);
          font-size: var(--touch-font-spacious);
        }

        /* Hover states (pointer devices only) */
        @media (hover: hover) {
          .list-item:hover:not(.disabled) {
            background-color: rgba(0, 0, 0, 0.05);
          }
        }

        /* Active/pressed state */
        .list-item:active:not(.disabled) {
          background-color: rgba(0, 0, 0, 0.1);
          transform: scale(0.99);
        }

        /* Selected state */
        .list-item.selected {
          background-color: rgba(0, 102, 204, 0.1);
          border-left: 4px solid #0066cc;
        }

        /* Focus visible for keyboard navigation */
        .list-item:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: -2px;
        }

        /* Disabled state */
        .list-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Slot containers */
        .leading {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .content {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .trailing {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        /* Text content */
        .title {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .subtitle {
          font-size: 0.875em;
          opacity: 0.7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 2px;
        }
      </style>

      <${tag}
        class="list-item size-${size} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}"
        ${href ? `href="${href}"` : ''}
        ${ariaLabel ? `aria-label="${ariaLabel}"` : ''}
        ${disabled ? 'aria-disabled="true"' : ''}
        ${selected ? 'aria-selected="true"' : ''}
        role="${isLink ? 'link' : 'listitem'}"
        tabindex="${disabled ? '-1' : '0'}"
        part="list-item"
      >
        <div class="leading" part="leading">
          <slot name="leading"></slot>
        </div>
        <div class="content" part="content">
          <div class="title">
            <slot name="title"><slot></slot></slot>
          </div>
          <div class="subtitle">
            <slot name="subtitle"></slot>
          </div>
        </div>
        <div class="trailing" part="trailing">
          <slot name="trailing"></slot>
        </div>
      </${tag}>
    `;
  }

  /**
   * Sets up event listeners
   * @private
   */
  setupEventListeners() {
    this._listItem = this.shadowRoot.querySelector('.list-item');
    this._handleClick = this.handleClick.bind(this);
    this._handleKeyDown = this.handleKeyDown.bind(this);
    
    this._listItem.addEventListener('click', this._handleClick);
    this._listItem.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Removes event listeners
   * @private
   */
  removeEventListeners() {
    if (this._listItem) {
      this._listItem.removeEventListener('click', this._handleClick);
      this._listItem.removeEventListener('keydown', this._handleKeyDown);
    }
  }

  /**
   * Handles click events
   * @param {Event} event - Click event
   * @private
   */
  handleClick(event) {
    if (this.hasAttribute('disabled')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Don't dispatch custom event if it's a link (let navigation happen)
    if (!this.hasAttribute('href')) {
      this.dispatchEvent(new CustomEvent('touch-list-item-click', {
        bubbles: true,
        composed: true,
        detail: {
          timestamp: Date.now(),
          selected: this.hasAttribute('selected')
        }
      }));
    }
  }

  /**
   * Handles keyboard events (Enter/Space)
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyDown(event) {
    if (this.hasAttribute('disabled')) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._listItem.click();
    }
  }
}

customElements.define('touch-list-item', TouchListItem);