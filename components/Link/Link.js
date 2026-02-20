/**
 * @fileoverview Polymorphic Link Component
 * @module components/Link
 * 
 * A polymorphic link component that can render as either an anchor element
 * or integrate with a router. Supports the "as" prop pattern for flexibility.
 * 
 * Features:
 * - Polymorphic rendering (anchor or router link)
 * - Accessible by default (proper ARIA attributes)
 * - External link detection and security
 * - Disabled state support
 * - Event publishing for navigation tracking
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Polymorphic Components
 * 
 * @example
 * // Basic anchor link
 * <harmony-link href="/about">About</harmony-link>
 * 
 * @example
 * // Router link (client-side navigation)
 * <harmony-link href="/dashboard" as="router-link">Dashboard</harmony-link>
 * 
 * @example
 * // External link with security
 * <harmony-link href="https://example.com" external>External Site</harmony-link>
 * 
 * @example
 * // Disabled link
 * <harmony-link href="/admin" disabled>Admin (No Access)</harmony-link>
 */

/**
 * Polymorphic Link Web Component
 * Adapts between anchor element and router link based on configuration
 * 
 * @class HarmonyLink
 * @extends HTMLElement
 */
class HarmonyLink extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @returns {string[]} List of observed attribute names
   */
  static get observedAttributes() {
    return ['href', 'as', 'external', 'disabled', 'target', 'rel', 'aria-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Bind event handlers
    this._handleClick = this._handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Get the href attribute
   * @returns {string} The href value
   */
  get href() {
    return this.getAttribute('href') || '';
  }

  /**
   * Set the href attribute
   * @param {string} value - The href value
   */
  set href(value) {
    this.setAttribute('href', value);
  }

  /**
   * Get the polymorphic type (anchor or router-link)
   * @returns {string} The element type to render as
   */
  get as() {
    return this.getAttribute('as') || 'a';
  }

  /**
   * Set the polymorphic type
   * @param {string} value - The element type
   */
  set as(value) {
    this.setAttribute('as', value);
  }

  /**
   * Check if link is external
   * @returns {boolean} True if external link
   */
  get external() {
    return this.hasAttribute('external');
  }

  /**
   * Set external link flag
   * @param {boolean} value - External flag
   */
  set external(value) {
    if (value) {
      this.setAttribute('external', '');
    } else {
      this.removeAttribute('external');
    }
  }

  /**
   * Check if link is disabled
   * @returns {boolean} True if disabled
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  /**
   * Set disabled state
   * @param {boolean} value - Disabled flag
   */
  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Determine if href is external URL
   * @private
   * @param {string} href - The href to check
   * @returns {boolean} True if external
   */
  _isExternalUrl(href) {
    if (!href) return false;
    return /^https?:\/\//.test(href) || /^\/\//.test(href);
  }

  /**
   * Get computed rel attribute for security
   * @private
   * @returns {string} The rel attribute value
   */
  _getRelAttribute() {
    const customRel = this.getAttribute('rel');
    if (customRel) return customRel;

    const isExternal = this.external || this._isExternalUrl(this.href);
    const target = this.getAttribute('target');

    if (isExternal || target === '_blank') {
      return 'noopener noreferrer';
    }

    return '';
  }

  /**
   * Render the component
   * @private
   */
  render() {
    const href = this.href;
    const as = this.as;
    const disabled = this.disabled;
    const target = this.getAttribute('target') || '';
    const rel = this._getRelAttribute();
    const ariaLabel = this.getAttribute('aria-label') || '';

    // Build styles
    const styles = `
      :host {
        display: inline;
      }

      a, .link {
        color: var(--harmony-color-primary, #0066cc);
        text-decoration: none;
        cursor: pointer;
        transition: color 0.2s ease, text-decoration 0.2s ease;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
      }

      a:hover, .link:hover {
        color: var(--harmony-color-primary-hover, #0052a3);
        text-decoration: underline;
      }

      a:focus, .link:focus {
        outline: 2px solid var(--harmony-color-focus, #0066cc);
        outline-offset: 2px;
        border-radius: 2px;
      }

      a:active, .link:active {
        color: var(--harmony-color-primary-active, #003d7a);
      }

      a[disabled], .link[disabled] {
        color: var(--harmony-color-disabled, #999999);
        cursor: not-allowed;
        pointer-events: none;
        text-decoration: none;
      }

      a[aria-current="page"], .link[aria-current="page"] {
        color: var(--harmony-color-primary-active, #003d7a);
        font-weight: 600;
      }

      /* External link indicator */
      .external::after {
        content: '↗';
        display: inline-block;
        margin-left: 0.25em;
        font-size: 0.875em;
      }
    `;

    // Build element based on "as" prop
    let linkElement = '';
    
    if (as === 'router-link') {
      // Router link for client-side navigation
      const disabledAttr = disabled ? 'disabled' : '';
      const ariaLabelAttr = ariaLabel ? `aria-label="${ariaLabel}"` : '';
      
      linkElement = `
        <span 
          class="link ${this.external ? 'external' : ''}" 
          role="link"
          tabindex="${disabled ? '-1' : '0'}"
          data-href="${href}"
          ${disabledAttr}
          ${ariaLabelAttr}
        >
          <slot></slot>
        </span>
      `;
    } else {
      // Standard anchor element
      const disabledAttr = disabled ? 'disabled' : '';
      const targetAttr = target ? `target="${target}"` : '';
      const relAttr = rel ? `rel="${rel}"` : '';
      const ariaLabelAttr = ariaLabel ? `aria-label="${ariaLabel}"` : '';
      
      linkElement = `
        <a 
          href="${href}"
          class="${this.external ? 'external' : ''}"
          ${targetAttr}
          ${relAttr}
          ${disabledAttr}
          ${ariaLabelAttr}
        >
          <slot></slot>
        </a>
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      ${linkElement}
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    const linkElement = this.shadowRoot.querySelector('a, .link');
    if (linkElement) {
      linkElement.addEventListener('click', this._handleClick);
      
      // Handle keyboard navigation for router links
      if (this.as === 'router-link') {
        linkElement.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._handleClick(e);
          }
        });
      }
    }
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const linkElement = this.shadowRoot.querySelector('a, .link');
    if (linkElement) {
      linkElement.removeEventListener('click', this._handleClick);
    }
  }

  /**
   * Handle click events
   * @private
   * @param {Event} event - The click event
   */
  _handleClick(event) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    // Publish navigation event for tracking
    this._publishNavigationEvent(event);

    // Handle router navigation
    if (this.as === 'router-link') {
      event.preventDefault();
      this._handleRouterNavigation(event);
    }
  }

  /**
   * Publish navigation event to EventBus
   * @private
   * @param {Event} event - The navigation event
   */
  _publishNavigationEvent(event) {
    const navigationEvent = new CustomEvent('harmony:navigation', {
      bubbles: true,
      composed: true,
      detail: {
        href: this.href,
        type: this.as,
        external: this.external || this._isExternalUrl(this.href),
        timestamp: Date.now(),
        modifierKeys: {
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey,
          meta: event.metaKey
        }
      }
    });

    this.dispatchEvent(navigationEvent);

    // Log to console for debugging
    if (window.harmonyDebug) {
      console.log('[HarmonyLink] Navigation event:', navigationEvent.detail);
    }
  }

  /**
   * Handle router-based navigation
   * @private
   * @param {Event} event - The navigation event
   */
  _handleRouterNavigation(event) {
    // Check for modifier keys (open in new tab, etc.)
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      // Let browser handle modified clicks
      window.open(this.href, '_blank', 'noopener,noreferrer');
      return;
    }

    // Publish router navigation command
    const routerEvent = new CustomEvent('harmony:router:navigate', {
      bubbles: true,
      composed: true,
      detail: {
        href: this.href,
        timestamp: Date.now()
      }
    });

    this.dispatchEvent(routerEvent);

    // Fallback to history.pushState if no router is listening
    setTimeout(() => {
      if (!event.defaultPrevented) {
        window.history.pushState({}, '', this.href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }, 0);
  }
}

// Register the custom element
if (!customElements.get('harmony-link')) {
  customElements.define('harmony-link', HarmonyLink);
}

export { HarmonyLink };