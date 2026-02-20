/**
 * @fileoverview Skip Links Component - Provides keyboard navigation shortcuts
 * @module primitives/skip-links
 * 
 * Skip links allow keyboard users to bypass repetitive navigation and jump
 * directly to important page landmarks. Links are visually hidden until focused.
 * 
 * Related Documentation: DESIGN_SYSTEM.md § Accessibility Primitives
 * Related Components: core/focus_manager.js
 * 
 * @example
 * <skip-links>
 *   <a href="#main-content">Skip to main content</a>
 *   <a href="#navigation">Skip to navigation</a>
 *   <a href="#footer">Skip to footer</a>
 * </skip-links>
 */

/**
 * SkipLinksComponent - Accessible skip navigation links for keyboard users
 * 
 * Features:
 * - Visually hidden until keyboard focused
 * - High contrast focus indicator
 * - Smooth scroll to target
 * - ARIA-compliant
 * - Zero layout shift
 * 
 * Performance:
 * - Zero render cost when not focused
 * - CSS-only visibility toggle
 * - No JavaScript required for basic function
 * 
 * @class SkipLinksComponent
 * @extends HTMLElement
 */
class SkipLinksComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._handleLinkClick = this._handleLinkClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  /**
   * Render the skip links with accessible styles
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          z-index: 9999;
        }

        .skip-links-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          pointer-events: none;
        }

        ::slotted(a) {
          position: absolute;
          left: -10000px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
          background: var(--skip-link-bg, #000);
          color: var(--skip-link-color, #fff);
          padding: 0.75rem 1.5rem;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 0 0 0.25rem 0.25rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          pointer-events: auto;
          transition: none;
          z-index: 10000;
        }

        ::slotted(a:focus) {
          position: absolute;
          left: 0.5rem;
          top: 0.5rem;
          width: auto;
          height: auto;
          overflow: visible;
          clip: auto;
          outline: 3px solid var(--skip-link-focus-outline, #4a90e2);
          outline-offset: 2px;
        }

        ::slotted(a:hover) {
          background: var(--skip-link-hover-bg, #333);
        }

        ::slotted(a:active) {
          background: var(--skip-link-active-bg, #555);
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          ::slotted(a) {
            border: 2px solid currentColor;
          }

          ::slotted(a:focus) {
            outline-width: 4px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          ::slotted(a) {
            transition: none;
          }
        }

        /* Multiple links layout */
        ::slotted(a:nth-of-type(2):focus) {
          top: 3.5rem;
        }

        ::slotted(a:nth-of-type(3):focus) {
          top: 6.5rem;
        }

        ::slotted(a:nth-of-type(4):focus) {
          top: 9.5rem;
        }
      </style>
      <div class="skip-links-container" role="navigation" aria-label="Skip links">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Attach event listeners for enhanced functionality
   * @private
   */
  _attachEventListeners() {
    const links = this.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', this._handleLinkClick);
    });
  }

  /**
   * Detach event listeners on disconnect
   * @private
   */
  _detachEventListeners() {
    const links = this.querySelectorAll('a');
    links.forEach(link => {
      link.removeEventListener('click', this._handleLinkClick);
    });
  }

  /**
   * Handle skip link click with smooth scroll and focus management
   * @param {Event} event - Click event
   * @private
   */
  _handleLinkClick(event) {
    const link = event.currentTarget;
    const targetId = link.getAttribute('href');
    
    if (!targetId || !targetId.startsWith('#')) {
      return; // Let default behavior handle external links
    }

    event.preventDefault();
    
    const targetElement = document.getElementById(targetId.substring(1));
    
    if (!targetElement) {
      console.warn(`[SkipLinks] Target element not found: ${targetId}`);
      return;
    }

    // Scroll to target with smooth behavior (respects prefers-reduced-motion)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    targetElement.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });

    // Set focus to target element for screen readers
    // Make element focusable if it isn't already
    const originalTabIndex = targetElement.getAttribute('tabindex');
    if (!targetElement.hasAttribute('tabindex')) {
      targetElement.setAttribute('tabindex', '-1');
    }

    targetElement.focus();

    // Restore original tabindex after focus
    if (originalTabIndex === null) {
      // Remove tabindex after a short delay to allow focus to settle
      setTimeout(() => {
        targetElement.removeAttribute('tabindex');
      }, 100);
    }

    // Publish event for analytics/logging
    this.dispatchEvent(new CustomEvent('skip-link-activated', {
      bubbles: true,
      composed: true,
      detail: {
        target: targetId,
        timestamp: Date.now()
      }
    }));
  }
}

// Register the custom element
if (!customElements.get('skip-links')) {
  customElements.define('skip-links', SkipLinksComponent);
}

export { SkipLinksComponent };