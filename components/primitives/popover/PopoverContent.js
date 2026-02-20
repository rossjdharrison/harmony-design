/**
 * @fileoverview Popover Content Component with Positioning
 * @module components/primitives/popover/PopoverContent
 * 
 * Positioned content container for popovers with smart placement.
 * Automatically positions relative to trigger with collision detection.
 * 
 * Related: DESIGN_SYSTEM.md § Compound Components > Popover Pattern
 */

/**
 * PopoverContent Web Component
 * 
 * Content container that appears when popover is open.
 * Handles positioning, animations, and accessibility.
 * 
 * @element harmony-popover-content
 * 
 * @attr {boolean} arrow - Show positioning arrow (default: false)
 * @attr {string} align - Alignment relative to trigger (start|center|end)
 * 
 * @example
 * <harmony-popover-content arrow align="center">
 *   <div>Popover content here</div>
 * </harmony-popover-content>
 */
class PopoverContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._isOpen = false;
    
    /** @type {HTMLElement|null} */
    this._triggerElement = null;
    
    /** @type {string} */
    this._placement = 'bottom';
    
    /** @type {number} */
    this._offset = 8;
    
    /** @type {boolean} */
    this._modal = false;
    
    /** @type {ResizeObserver|null} */
    this._resizeObserver = null;
  }

  connectedCallback() {
    this.render();
    this.registerWithRoot();
    this.setupEventListeners();
    this.setupResizeObserver();
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  render() {
    const hasArrow = this.hasAttribute('arrow');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 1000;
          display: none;
        }

        :host([data-state="open"]) {
          display: block;
        }

        .backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.1);
          z-index: -1;
        }

        :host([data-modal]) .backdrop {
          display: block;
        }

        .content {
          background: var(--harmony-color-surface, white);
          border: 1px solid var(--harmony-color-border, #e0e0e0);
          border-radius: var(--harmony-radius-md, 8px);
          box-shadow: var(--harmony-shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.15));
          padding: var(--harmony-spacing-md, 12px);
          max-width: min(calc(100vw - 32px), 400px);
          max-height: calc(100vh - 32px);
          overflow: auto;
          opacity: 0;
          transform: scale(0.95);
          transition: opacity 150ms ease, transform 150ms ease;
        }

        :host([data-state="open"]) .content {
          opacity: 1;
          transform: scale(1);
        }

        .arrow {
          display: ${hasArrow ? 'block' : 'none'};
          position: absolute;
          width: 12px;
          height: 12px;
          background: var(--harmony-color-surface, white);
          border: 1px solid var(--harmony-color-border, #e0e0e0);
          transform: rotate(45deg);
          z-index: -1;
        }

        /* Arrow positioning based on placement */
        :host([data-placement="bottom"]) .arrow {
          top: -6px;
          border-right: none;
          border-bottom: none;
        }

        :host([data-placement="top"]) .arrow {
          bottom: -6px;
          border-left: none;
          border-top: none;
        }

        :host([data-placement="right"]) .arrow {
          left: -6px;
          border-right: none;
          border-top: none;
        }

        :host([data-placement="left"]) .arrow {
          right: -6px;
          border-left: none;
          border-bottom: none;
        }

        /* Scrollbar styling */
        .content::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .content::-webkit-scrollbar-track {
          background: transparent;
        }

        .content::-webkit-scrollbar-thumb {
          background: var(--harmony-color-border, #e0e0e0);
          border-radius: 4px;
        }

        .content::-webkit-scrollbar-thumb:hover {
          background: var(--harmony-color-border-hover, #bdbdbd);
        }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="content" part="content" role="dialog" aria-modal="${this._modal}">
        ${hasArrow ? '<div class="arrow" part="arrow"></div>' : ''}
        <slot></slot>
      </div>
    `;
  }

  setupEventListeners() {
    // Listen for state changes from root
    this.addEventListener('popover-state-change', (e) => {
      this._isOpen = e.detail.isOpen;
      this._triggerElement = e.detail.triggerElement;
      this._placement = e.detail.placement;
      this._offset = e.detail.offset;
      this._modal = e.detail.modal;
      
      this.updateState();
      
      if (this._isOpen) {
        requestAnimationFrame(() => this.updatePosition());
      }
    });
  }

  /**
   * Sets up ResizeObserver to reposition on size changes
   * @private
   */
  setupResizeObserver() {
    this._resizeObserver = new ResizeObserver(() => {
      if (this._isOpen) {
        this.updatePosition();
      }
    });
    
    this._resizeObserver.observe(this);
  }

  /**
   * Registers this content with parent PopoverRoot
   * @private
   */
  registerWithRoot() {
    this.dispatchEvent(new CustomEvent('popover-content-register', {
      bubbles: true,
      composed: true,
      detail: { element: this }
    }));
  }

  /**
   * Updates content visibility and attributes
   * @private
   */
  updateState() {
    this.setAttribute('data-state', this._isOpen ? 'open' : 'closed');
    this.setAttribute('data-placement', this._placement);
    
    if (this._modal) {
      this.setAttribute('data-modal', '');
    } else {
      this.removeAttribute('data-modal');
    }
    
    const content = this.shadowRoot.querySelector('.content');
    if (content) {
      content.setAttribute('aria-modal', this._modal);
    }
  }

  /**
   * Calculates and applies optimal position
   * @private
   */
  updatePosition() {
    if (!this._triggerElement) return;

    const triggerRect = this._triggerElement.getBoundingClientRect();
    const contentRect = this.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let placement = this._placement;
    let { top, left } = this.calculatePosition(triggerRect, contentRect, placement);

    // Collision detection - flip if doesn't fit
    const fitsInViewport = this.checkFit(top, left, contentRect, viewportWidth, viewportHeight);
    
    if (!fitsInViewport) {
      const flippedPlacement = this.getFlippedPlacement(placement);
      const flippedPos = this.calculatePosition(triggerRect, contentRect, flippedPlacement);
      const fitsFlipped = this.checkFit(flippedPos.top, flippedPos.left, contentRect, viewportWidth, viewportHeight);
      
      if (fitsFlipped) {
        placement = flippedPlacement;
        top = flippedPos.top;
        left = flippedPos.left;
      }
    }

    // Apply alignment
    const align = this.getAttribute('align') || 'center';
    const alignedPos = this.applyAlignment(top, left, triggerRect, contentRect, placement, align);

    // Ensure content stays within viewport bounds
    const finalPos = this.constrainToViewport(alignedPos.top, alignedPos.left, contentRect, viewportWidth, viewportHeight);

    this.style.top = `${finalPos.top}px`;
    this.style.left = `${finalPos.left}px`;
    
    // Update arrow position if present
    if (this.hasAttribute('arrow')) {
      this.updateArrowPosition(placement, triggerRect, contentRect, finalPos);
    }
  }

  /**
   * Calculates base position for given placement
   * @private
   */
  calculatePosition(triggerRect, contentRect, placement) {
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - contentRect.height - this._offset;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + this._offset;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.left - contentRect.width - this._offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.right + this._offset;
        break;
    }

    return { top, left };
  }

  /**
   * Applies alignment adjustment
   * @private
   */
  applyAlignment(top, left, triggerRect, contentRect, placement, align) {
    if (placement === 'top' || placement === 'bottom') {
      switch (align) {
        case 'start':
          left = triggerRect.left;
          break;
        case 'end':
          left = triggerRect.right - contentRect.width;
          break;
        // 'center' is already applied in calculatePosition
      }
    } else {
      switch (align) {
        case 'start':
          top = triggerRect.top;
          break;
        case 'end':
          top = triggerRect.bottom - contentRect.height;
          break;
        // 'center' is already applied in calculatePosition
      }
    }

    return { top, left };
  }

  /**
   * Checks if content fits in viewport at given position
   * @private
   */
  checkFit(top, left, contentRect, viewportWidth, viewportHeight) {
    return (
      top >= 16 &&
      left >= 16 &&
      top + contentRect.height <= viewportHeight - 16 &&
      left + contentRect.width <= viewportWidth - 16
    );
  }

  /**
   * Gets opposite placement for collision flipping
   * @private
   */
  getFlippedPlacement(placement) {
    const flips = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left'
    };
    return flips[placement] || placement;
  }

  /**
   * Constrains position to viewport bounds
   * @private
   */
  constrainToViewport(top, left, contentRect, viewportWidth, viewportHeight) {
    const margin = 16;
    
    top = Math.max(margin, Math.min(top, viewportHeight - contentRect.height - margin));
    left = Math.max(margin, Math.min(left, viewportWidth - contentRect.width - margin));

    return { top, left };
  }

  /**
   * Updates arrow position to point at trigger
   * @private
   */
  updateArrowPosition(placement, triggerRect, contentRect, finalPos) {
    const arrow = this.shadowRoot.querySelector('.arrow');
    if (!arrow) return;

    const triggerCenter = {
      x: triggerRect.left + triggerRect.width / 2,
      y: triggerRect.top + triggerRect.height / 2
    };

    if (placement === 'top' || placement === 'bottom') {
      const arrowLeft = Math.max(12, Math.min(
        triggerCenter.x - finalPos.left - 6,
        contentRect.width - 12
      ));
      arrow.style.left = `${arrowLeft}px`;
      arrow.style.top = '';
    } else {
      const arrowTop = Math.max(12, Math.min(
        triggerCenter.y - finalPos.top - 6,
        contentRect.height - 12
      ));
      arrow.style.top = `${arrowTop}px`;
      arrow.style.left = '';
    }
  }
}

customElements.define('harmony-popover-content', PopoverContent);

export default PopoverContent;