/**
 * @fileoverview Infinite Loader Component
 * @module components/infinite-loader
 * 
 * Intersection Observer based infinite content loading component.
 * Detects when sentinel element enters viewport and triggers load events.
 * 
 * Performance:
 * - Uses native Intersection Observer (no polling)
 * - Debounced loading to prevent rapid triggers
 * - Memory-efficient (no scroll event listeners)
 * 
 * Events Published:
 * - infinite-loader:load-more { page, threshold, direction }
 * - infinite-loader:sentinel-visible { isVisible, intersectionRatio }
 * 
 * @see DESIGN_SYSTEM.md#infinite-loader
 */

/**
 * InfiniteLoaderComponent - Intersection Observer based content loading
 * 
 * @class InfiniteLoaderComponent
 * @extends HTMLElement
 * 
 * @attr {string} threshold - Intersection threshold (0-1), default: 0.1
 * @attr {string} root-margin - Root margin for observer, default: "50px"
 * @attr {string} direction - Loading direction: "down" | "up" | "both", default: "down"
 * @attr {string} debounce - Debounce delay in ms, default: 300
 * @attr {boolean} disabled - Disable loading trigger
 * @attr {boolean} loading - Loading state (prevents duplicate triggers)
 * 
 * @example
 * <infinite-loader threshold="0.2" root-margin="100px">
 *   <div slot="content">Your scrollable content</div>
 *   <div slot="loader">Loading...</div>
 *   <div slot="end">No more items</div>
 * </infinite-loader>
 */
class InfiniteLoaderComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._page = 0;
    this._hasMore = true;
    this._observer = null;
    this._debounceTimer = null;
    this._lastTriggerTime = 0;
    
    // Bound methods
    this._handleIntersection = this._handleIntersection.bind(this);
  }

  static get observedAttributes() {
    return ['threshold', 'root-margin', 'direction', 'debounce', 'disabled', 'loading'];
  }

  connectedCallback() {
    this._render();
    this._setupObserver();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._cleanupObserver();
    this._clearDebounce();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'threshold' || name === 'root-margin') {
      this._setupObserver();
    } else if (name === 'disabled' && newValue === null) {
      this._setupObserver();
    } else if (name === 'disabled' && newValue !== null) {
      this._cleanupObserver();
    }
  }

  /**
   * Render component template
   * @private
   */
  _render() {
    const threshold = this.getAttribute('threshold') || '0.1';
    const direction = this.getAttribute('direction') || 'down';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
        }

        :host([hidden]) {
          display: none;
        }

        .infinite-loader {
          display: flex;
          flex-direction: column;
          width: 100%;
          min-height: 100%;
        }

        .sentinel {
          width: 100%;
          height: 1px;
          pointer-events: none;
          visibility: hidden;
        }

        .sentinel--top {
          order: -1;
        }

        .sentinel--bottom {
          order: 999;
        }

        .content {
          flex: 1;
          width: 100%;
        }

        .loader {
          display: none;
          width: 100%;
          padding: 1rem;
          text-align: center;
        }

        .loader--visible {
          display: block;
        }

        .end-message {
          display: none;
          width: 100%;
          padding: 1rem;
          text-align: center;
          color: var(--color-text-secondary, #666);
        }

        .end-message--visible {
          display: block;
        }

        /* Performance optimization */
        .sentinel,
        .loader,
        .end-message {
          will-change: auto;
          contain: layout style paint;
        }
      </style>

      <div class="infinite-loader">
        ${direction === 'up' || direction === 'both' ? 
          '<div class="sentinel sentinel--top" data-direction="up"></div>' : ''}
        
        <div class="content">
          <slot name="content"></slot>
        </div>

        <div class="loader" part="loader">
          <slot name="loader">
            <div>Loading more...</div>
          </slot>
        </div>

        <div class="end-message" part="end-message">
          <slot name="end">
            <div>No more items to load</div>
          </slot>
        </div>

        ${direction === 'down' || direction === 'both' ? 
          '<div class="sentinel sentinel--bottom" data-direction="down"></div>' : ''}
      </div>
    `;
  }

  /**
   * Setup Intersection Observer
   * @private
   */
  _setupObserver() {
    // Cleanup existing observer
    this._cleanupObserver();

    if (this.hasAttribute('disabled')) {
      return;
    }

    const threshold = parseFloat(this.getAttribute('threshold') || '0.1');
    const rootMargin = this.getAttribute('root-margin') || '50px';

    const options = {
      root: null, // viewport
      rootMargin,
      threshold: [0, threshold, 1.0]
    };

    this._observer = new IntersectionObserver(this._handleIntersection, options);

    // Observe sentinels
    const sentinels = this.shadowRoot.querySelectorAll('.sentinel');
    sentinels.forEach(sentinel => {
      this._observer.observe(sentinel);
    });
  }

  /**
   * Cleanup Intersection Observer
   * @private
   */
  _cleanupObserver() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  /**
   * Handle intersection changes
   * @private
   * @param {IntersectionObserverEntry[]} entries
   */
  _handleIntersection(entries) {
    entries.forEach(entry => {
      const direction = entry.target.dataset.direction;
      const isIntersecting = entry.isIntersecting;
      const intersectionRatio = entry.intersectionRatio;

      // Publish visibility event
      this._publishEvent('infinite-loader:sentinel-visible', {
        isVisible: isIntersecting,
        intersectionRatio,
        direction
      });

      // Trigger load if intersecting and not already loading
      if (isIntersecting && !this.hasAttribute('loading') && this._hasMore) {
        this._triggerLoad(direction);
      }
    });
  }

  /**
   * Trigger load with debouncing
   * @private
   * @param {string} direction
   */
  _triggerLoad(direction) {
    const debounceMs = parseInt(this.getAttribute('debounce') || '300', 10);
    const now = Date.now();
    
    // Prevent rapid triggers
    if (now - this._lastTriggerTime < debounceMs) {
      return;
    }

    this._clearDebounce();

    this._debounceTimer = setTimeout(() => {
      if (this.hasAttribute('loading') || !this._hasMore) {
        return;
      }

      this._lastTriggerTime = Date.now();
      this._page++;

      // Show loader
      this._updateLoaderVisibility(true);

      // Publish load event
      this._publishEvent('infinite-loader:load-more', {
        page: this._page,
        threshold: parseFloat(this.getAttribute('threshold') || '0.1'),
        direction
      });
    }, debounceMs);
  }

  /**
   * Clear debounce timer
   * @private
   */
  _clearDebounce() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  /**
   * Update loader visibility
   * @private
   * @param {boolean} visible
   */
  _updateLoaderVisibility(visible) {
    const loader = this.shadowRoot.querySelector('.loader');
    if (loader) {
      loader.classList.toggle('loader--visible', visible && this._hasMore);
    }
  }

  /**
   * Update end message visibility
   * @private
   */
  _updateEndMessageVisibility() {
    const endMessage = this.shadowRoot.querySelector('.end-message');
    if (endMessage) {
      endMessage.classList.toggle('end-message--visible', !this._hasMore);
    }
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Listen for external reset/complete events
    this.addEventListener('infinite-loader:reset', () => {
      this.reset();
    });

    this.addEventListener('infinite-loader:complete', () => {
      this.complete();
    });
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} type
   * @param {Object} detail
   */
  _publishEvent(type, detail) {
    const event = new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);

    // Log for debugging
    if (window.DEBUG_EVENTS) {
      console.log(`[InfiniteLoader] Event: ${type}`, detail);
    }
  }

  /**
   * Reset loader state
   * @public
   */
  reset() {
    this._page = 0;
    this._hasMore = true;
    this._lastTriggerTime = 0;
    this.removeAttribute('loading');
    this._updateLoaderVisibility(false);
    this._updateEndMessageVisibility();
    this._setupObserver();
  }

  /**
   * Mark loading as complete (no more items)
   * @public
   */
  complete() {
    this._hasMore = false;
    this.removeAttribute('loading');
    this._updateLoaderVisibility(false);
    this._updateEndMessageVisibility();
    this._cleanupObserver();
  }

  /**
   * Finish current load operation
   * @public
   * @param {boolean} hasMore - Whether more items are available
   */
  finishLoading(hasMore = true) {
    this.removeAttribute('loading');
    this._hasMore = hasMore;
    this._updateLoaderVisibility(false);
    
    if (!hasMore) {
      this.complete();
    }
  }

  /**
   * Get current page number
   * @public
   * @returns {number}
   */
  get page() {
    return this._page;
  }

  /**
   * Get whether more items are available
   * @public
   * @returns {boolean}
   */
  get hasMore() {
    return this._hasMore;
  }

  /**
   * Set loading state
   * @public
   * @param {boolean} loading
   */
  set loading(loading) {
    if (loading) {
      this.setAttribute('loading', '');
    } else {
      this.removeAttribute('loading');
    }
    this._updateLoaderVisibility(loading);
  }
}

// Register custom element
if (!customElements.get('infinite-loader')) {
  customElements.define('infinite-loader', InfiniteLoaderComponent);
}

export default InfiniteLoaderComponent;