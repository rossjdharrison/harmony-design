/**
 * @fileoverview Virtual List Component - Efficient rendering of large lists with variable item heights
 * @module primitives/virtual-list
 * 
 * Performance characteristics:
 * - Only renders visible items + buffer
 * - Handles variable item heights via measurement cache
 * - Maintains 60fps scrolling performance
 * - Memory efficient for lists with 10k+ items
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Virtual List
 */

/**
 * VirtualList Web Component
 * Renders only visible items in viewport for optimal performance
 * 
 * @element virtual-list
 * 
 * @attr {number} buffer-size - Number of items to render outside viewport (default: 3)
 * @attr {number} estimated-item-height - Initial estimate for unmeasured items (default: 50)
 * @attr {string} item-key - Property name to use as unique key (default: 'id')
 * 
 * @fires virtual-list:scroll - Dispatched on scroll with visible range
 * @fires virtual-list:items-rendered - Dispatched after render with item count
 * 
 * @example
 * <virtual-list buffer-size="5" estimated-item-height="80">
 *   <template data-item-template>
 *     <div class="item">${item.name}</div>
 *   </template>
 * </virtual-list>
 */
class VirtualList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Data management
    this._items = [];
    this._itemHeights = new Map(); // Cache of measured heights
    this._itemOffsets = new Map(); // Cache of top offsets
    
    // Viewport state
    this._scrollTop = 0;
    this._viewportHeight = 0;
    this._totalHeight = 0;
    
    // Render state
    this._visibleRange = { start: 0, end: 0 };
    this._renderedItems = new Map(); // DOM element cache
    
    // Performance optimization
    this._rafId = null;
    this._resizeObserver = null;
    this._measurementQueue = new Set();
    
    // Template
    this._itemTemplate = null;
  }

  static get observedAttributes() {
    return ['buffer-size', 'estimated-item-height', 'item-key'];
  }

  connectedCallback() {
    this._render();
    this._setupEventListeners();
    this._setupResizeObserver();
    this._extractTemplate();
  }

  disconnectedCallback() {
    this._cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._updateConfig();
      this._scheduleUpdate();
    }
  }

  /**
   * Set the data items to render
   * @param {Array} items - Array of data objects
   */
  setItems(items) {
    this._items = items || [];
    this._invalidateCache();
    this._scheduleUpdate();
  }

  /**
   * Get current items
   * @returns {Array} Current items array
   */
  getItems() {
    return this._items;
  }

  /**
   * Scroll to specific item index
   * @param {number} index - Item index to scroll to
   * @param {string} align - Alignment: 'start', 'center', 'end' (default: 'start')
   */
  scrollToIndex(index, align = 'start') {
    if (index < 0 || index >= this._items.length) {
      console.warn(`VirtualList: Invalid index ${index}`);
      return;
    }

    const offset = this._getItemOffset(index);
    const itemHeight = this._getItemHeight(index);
    
    let scrollTop = offset;
    
    if (align === 'center') {
      scrollTop = offset - (this._viewportHeight / 2) + (itemHeight / 2);
    } else if (align === 'end') {
      scrollTop = offset - this._viewportHeight + itemHeight;
    }
    
    const container = this.shadowRoot.querySelector('.virtual-list-container');
    if (container) {
      container.scrollTop = Math.max(0, scrollTop);
    }
  }

  /**
   * Force remeasurement of all items
   */
  remeasure() {
    this._invalidateCache();
    this._scheduleUpdate();
  }

  _render() {
    const styles = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        contain: strict;
      }

      .virtual-list-container {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
        will-change: scroll-position;
      }

      .virtual-list-spacer {
        width: 100%;
        pointer-events: none;
      }

      .virtual-list-content {
        position: relative;
        width: 100%;
      }

      .virtual-list-item {
        position: absolute;
        left: 0;
        right: 0;
        will-change: transform;
      }

      /* Scrollbar styling */
      .virtual-list-container::-webkit-scrollbar {
        width: 8px;
      }

      .virtual-list-container::-webkit-scrollbar-track {
        background: var(--color-surface-secondary, #f5f5f5);
      }

      .virtual-list-container::-webkit-scrollbar-thumb {
        background: var(--color-border-primary, #ccc);
        border-radius: 4px;
      }

      .virtual-list-container::-webkit-scrollbar-thumb:hover {
        background: var(--color-border-hover, #999);
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="virtual-list-container" part="container">
        <div class="virtual-list-spacer" part="spacer"></div>
        <div class="virtual-list-content" part="content"></div>
      </div>
    `;
  }

  _setupEventListeners() {
    const container = this.shadowRoot.querySelector('.virtual-list-container');
    
    container.addEventListener('scroll', () => {
      this._handleScroll();
    }, { passive: true });
  }

  _setupResizeObserver() {
    const container = this.shadowRoot.querySelector('.virtual-list-container');
    
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this._viewportHeight = entry.contentRect.height;
        this._scheduleUpdate();
      }
    });
    
    this._resizeObserver.observe(container);
  }

  _extractTemplate() {
    const template = this.querySelector('template[data-item-template]');
    if (template) {
      this._itemTemplate = template.innerHTML;
    }
  }

  _updateConfig() {
    this._config = {
      bufferSize: parseInt(this.getAttribute('buffer-size')) || 3,
      estimatedItemHeight: parseInt(this.getAttribute('estimated-item-height')) || 50,
      itemKey: this.getAttribute('item-key') || 'id'
    };
  }

  _handleScroll() {
    const container = this.shadowRoot.querySelector('.virtual-list-container');
    this._scrollTop = container.scrollTop;
    
    this._scheduleUpdate();
    
    // Emit scroll event
    this.dispatchEvent(new CustomEvent('virtual-list:scroll', {
      detail: {
        scrollTop: this._scrollTop,
        visibleRange: this._visibleRange
      },
      bubbles: true,
      composed: true
    }));
  }

  _scheduleUpdate() {
    if (this._rafId !== null) {
      return; // Update already scheduled
    }

    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this._update();
    });
  }

  _update() {
    if (!this._config) {
      this._updateConfig();
    }

    // Calculate visible range
    const newRange = this._calculateVisibleRange();
    
    // Only update if range changed
    if (newRange.start !== this._visibleRange.start || 
        newRange.end !== this._visibleRange.end) {
      this._visibleRange = newRange;
      this._updateDOM();
    }

    // Update total height
    this._updateTotalHeight();
  }

  _calculateVisibleRange() {
    if (this._items.length === 0) {
      return { start: 0, end: 0 };
    }

    const scrollTop = this._scrollTop;
    const viewportHeight = this._viewportHeight;
    const bufferSize = this._config.bufferSize;

    // Binary search for start index
    let start = this._findStartIndex(scrollTop);
    let end = start;

    // Find end index
    let currentOffset = this._getItemOffset(start);
    while (end < this._items.length && currentOffset < scrollTop + viewportHeight) {
      currentOffset += this._getItemHeight(end);
      end++;
    }

    // Apply buffer
    start = Math.max(0, start - bufferSize);
    end = Math.min(this._items.length, end + bufferSize);

    return { start, end };
  }

  _findStartIndex(scrollTop) {
    let low = 0;
    let high = this._items.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const offset = this._getItemOffset(mid);
      const height = this._getItemHeight(mid);

      if (offset + height < scrollTop) {
        low = mid + 1;
      } else if (offset > scrollTop) {
        high = mid - 1;
      } else {
        return mid;
      }
    }

    return Math.max(0, low);
  }

  _getItemHeight(index) {
    const item = this._items[index];
    if (!item) return this._config.estimatedItemHeight;

    const key = this._getItemKey(item, index);
    
    if (this._itemHeights.has(key)) {
      return this._itemHeights.get(key);
    }

    return this._config.estimatedItemHeight;
  }

  _getItemOffset(index) {
    if (index === 0) return 0;

    const item = this._items[index];
    if (!item) return 0;

    const key = this._getItemKey(item, index);
    
    if (this._itemOffsets.has(key)) {
      return this._itemOffsets.get(key);
    }

    // Calculate offset by summing previous heights
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this._getItemHeight(i);
    }

    this._itemOffsets.set(key, offset);
    return offset;
  }

  _getItemKey(item, index) {
    const keyProp = this._config.itemKey;
    return item[keyProp] !== undefined ? item[keyProp] : index;
  }

  _updateDOM() {
    const content = this.shadowRoot.querySelector('.virtual-list-content');
    const { start, end } = this._visibleRange;

    // Remove items outside visible range
    const keysToRemove = [];
    this._renderedItems.forEach((element, key) => {
      const index = this._findItemIndexByKey(key);
      if (index < start || index >= end) {
        element.remove();
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(key => this._renderedItems.delete(key));

    // Add/update items in visible range
    for (let i = start; i < end; i++) {
      const item = this._items[i];
      const key = this._getItemKey(item, i);
      
      let element = this._renderedItems.get(key);
      
      if (!element) {
        element = this._createItemElement(item, i);
        content.appendChild(element);
        this._renderedItems.set(key, element);
        this._measurementQueue.add(key);
      }

      // Position element
      const offset = this._getItemOffset(i);
      element.style.transform = `translateY(${offset}px)`;
    }

    // Measure queued items
    this._measureItems();

    // Emit render event
    this.dispatchEvent(new CustomEvent('virtual-list:items-rendered', {
      detail: {
        count: end - start,
        range: { start, end }
      },
      bubbles: true,
      composed: true
    }));
  }

  _createItemElement(item, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'virtual-list-item';
    wrapper.setAttribute('part', 'item');
    wrapper.setAttribute('data-index', index);

    if (this._itemTemplate) {
      // Simple template interpolation
      let html = this._itemTemplate;
      html = html.replace(/\$\{item\.(\w+)\}/g, (match, prop) => {
        return item[prop] !== undefined ? item[prop] : '';
      });
      wrapper.innerHTML = html;
    } else {
      // Fallback: JSON representation
      wrapper.textContent = JSON.stringify(item);
    }

    return wrapper;
  }

  _measureItems() {
    if (this._measurementQueue.size === 0) return;

    let needsRecalculation = false;

    this._measurementQueue.forEach(key => {
      const element = this._renderedItems.get(key);
      if (!element) return;

      const height = element.offsetHeight;
      const oldHeight = this._itemHeights.get(key);

      if (oldHeight !== height) {
        this._itemHeights.set(key, height);
        needsRecalculation = true;
      }
    });

    this._measurementQueue.clear();

    if (needsRecalculation) {
      // Invalidate offset cache since heights changed
      this._itemOffsets.clear();
      this._scheduleUpdate();
    }
  }

  _updateTotalHeight() {
    let totalHeight = 0;
    for (let i = 0; i < this._items.length; i++) {
      totalHeight += this._getItemHeight(i);
    }

    this._totalHeight = totalHeight;

    const spacer = this.shadowRoot.querySelector('.virtual-list-spacer');
    if (spacer) {
      spacer.style.height = `${totalHeight}px`;
    }
  }

  _findItemIndexByKey(key) {
    for (let i = 0; i < this._items.length; i++) {
      if (this._getItemKey(this._items[i], i) === key) {
        return i;
      }
    }
    return -1;
  }

  _invalidateCache() {
    this._itemHeights.clear();
    this._itemOffsets.clear();
    this._renderedItems.forEach(el => el.remove());
    this._renderedItems.clear();
    this._measurementQueue.clear();
  }

  _cleanup() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    this._invalidateCache();
  }
}

customElements.define('virtual-list', VirtualList);

export { VirtualList };