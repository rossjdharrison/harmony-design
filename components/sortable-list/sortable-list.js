/**
 * @fileoverview Sortable List Component - Drag-to-reorder list with smooth animations
 * @module components/sortable-list
 * 
 * Performance Targets:
 * - Render: <16ms per frame (60fps)
 * - Animation: GPU-accelerated transforms
 * - Memory: Minimal DOM manipulation
 * 
 * Events Published:
 * - sortable-list:reorder - When items are reordered
 * - sortable-list:drag-start - When drag begins
 * - sortable-list:drag-end - When drag ends
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#sortable-list}
 */

class SortableList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._items = [];
    this._draggedItem = null;
    this._draggedIndex = -1;
    this._dropTargetIndex = -1;
    this._placeholder = null;
    this._isDragging = false;
    this._startY = 0;
    this._currentY = 0;
    this._itemHeight = 0;
    
    // Bind methods
    this._handleDragStart = this._handleDragStart.bind(this);
    this._handleDragMove = this._handleDragMove.bind(this);
    this._handleDragEnd = this._handleDragEnd.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
  }

  static get observedAttributes() {
    return ['disabled', 'animation-duration'];
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
    this._parseSlottedItems();
  }

  disconnectedCallback() {
    this._cleanupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Parse items from slotted content
   * @private
   */
  _parseSlottedItems() {
    const slot = this.shadowRoot.querySelector('slot');
    if (!slot) return;

    const assignedNodes = slot.assignedElements();
    this._items = Array.from(assignedNodes).map((node, index) => ({
      id: node.dataset.id || `item-${index}`,
      element: node,
      originalIndex: index
    }));

    this._items.forEach((item, index) => {
      item.element.setAttribute('draggable', !this.disabled);
      item.element.dataset.index = index;
      item.element.style.transition = `transform ${this.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    });
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    const slot = this.shadowRoot.querySelector('slot');
    if (!slot) return;

    slot.addEventListener('slotchange', () => {
      this._parseSlottedItems();
    });

    // Mouse events
    this.addEventListener('dragstart', this._handleDragStart);
    this.addEventListener('dragover', this._handleDragOver.bind(this));
    this.addEventListener('drop', this._handleDrop.bind(this));
    this.addEventListener('dragend', this._handleDragEnd);

    // Touch events for mobile
    this.addEventListener('touchstart', this._handleTouchStart, { passive: false });
  }

  /**
   * Cleanup event listeners
   * @private
   */
  _cleanupEventListeners() {
    this.removeEventListener('dragstart', this._handleDragStart);
    this.removeEventListener('dragend', this._handleDragEnd);
    this.removeEventListener('touchstart', this._handleTouchStart);
    
    if (this._isDragging) {
      document.removeEventListener('touchmove', this._handleTouchMove);
      document.removeEventListener('touchend', this._handleTouchEnd);
    }
  }

  /**
   * Handle drag start
   * @param {DragEvent} event
   * @private
   */
  _handleDragStart(event) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    const target = event.target.closest('[data-index]');
    if (!target) return;

    this._draggedIndex = parseInt(target.dataset.index, 10);
    this._draggedItem = this._items[this._draggedIndex];
    this._isDragging = true;

    // Set drag image
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', target.innerHTML);

    // Add dragging class with slight delay to avoid flash
    requestAnimationFrame(() => {
      target.classList.add('dragging');
      target.style.opacity = '0.5';
    });

    this._publishEvent('sortable-list:drag-start', {
      index: this._draggedIndex,
      item: this._draggedItem.id
    });
  }

  /**
   * Handle drag over
   * @param {DragEvent} event
   * @private
   */
  _handleDragOver(event) {
    if (!this._isDragging) return;
    
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const target = event.target.closest('[data-index]');
    if (!target || target === this._draggedItem.element) return;

    const targetIndex = parseInt(target.dataset.index, 10);
    if (targetIndex === this._dropTargetIndex) return;

    this._dropTargetIndex = targetIndex;
    this._animateReorder(this._draggedIndex, targetIndex);
  }

  /**
   * Handle drop
   * @param {DragEvent} event
   * @private
   */
  _handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this._dropTargetIndex !== -1 && this._dropTargetIndex !== this._draggedIndex) {
      this._commitReorder(this._draggedIndex, this._dropTargetIndex);
    }
  }

  /**
   * Handle drag end
   * @param {DragEvent} event
   * @private
   */
  _handleDragEnd(event) {
    if (this._draggedItem) {
      this._draggedItem.element.classList.remove('dragging');
      this._draggedItem.element.style.opacity = '';
    }

    // Reset transforms
    this._items.forEach(item => {
      item.element.style.transform = '';
    });

    this._publishEvent('sortable-list:drag-end', {
      index: this._dropTargetIndex !== -1 ? this._dropTargetIndex : this._draggedIndex,
      item: this._draggedItem?.id
    });

    this._isDragging = false;
    this._draggedItem = null;
    this._draggedIndex = -1;
    this._dropTargetIndex = -1;
  }

  /**
   * Handle touch start
   * @param {TouchEvent} event
   * @private
   */
  _handleTouchStart(event) {
    if (this.disabled) return;

    const target = event.target.closest('[data-index]');
    if (!target) return;

    // Prevent default to avoid scrolling while dragging
    event.preventDefault();

    this._draggedIndex = parseInt(target.dataset.index, 10);
    this._draggedItem = this._items[this._draggedIndex];
    this._isDragging = true;
    this._startY = event.touches[0].clientY;
    this._currentY = this._startY;

    const rect = target.getBoundingClientRect();
    this._itemHeight = rect.height;

    target.classList.add('dragging');
    target.style.opacity = '0.8';
    target.style.zIndex = '1000';

    document.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    document.addEventListener('touchend', this._handleTouchEnd);

    this._publishEvent('sortable-list:drag-start', {
      index: this._draggedIndex,
      item: this._draggedItem.id
    });
  }

  /**
   * Handle touch move
   * @param {TouchEvent} event
   * @private
   */
  _handleTouchMove(event) {
    if (!this._isDragging) return;

    event.preventDefault();
    this._currentY = event.touches[0].clientY;
    const deltaY = this._currentY - this._startY;

    // Move dragged item
    this._draggedItem.element.style.transform = `translateY(${deltaY}px)`;
    this._draggedItem.element.style.transition = 'none';

    // Calculate target index
    const offset = Math.round(deltaY / this._itemHeight);
    const targetIndex = Math.max(0, Math.min(this._items.length - 1, this._draggedIndex + offset));

    if (targetIndex !== this._dropTargetIndex) {
      this._dropTargetIndex = targetIndex;
      this._animateReorder(this._draggedIndex, targetIndex, true);
    }
  }

  /**
   * Handle touch end
   * @param {TouchEvent} event
   * @private
   */
  _handleTouchEnd(event) {
    if (!this._isDragging) return;

    document.removeEventListener('touchmove', this._handleTouchMove);
    document.removeEventListener('touchend', this._handleTouchEnd);

    if (this._draggedItem) {
      this._draggedItem.element.classList.remove('dragging');
      this._draggedItem.element.style.transition = '';
      this._draggedItem.element.style.opacity = '';
      this._draggedItem.element.style.zIndex = '';
    }

    if (this._dropTargetIndex !== -1 && this._dropTargetIndex !== this._draggedIndex) {
      this._commitReorder(this._draggedIndex, this._dropTargetIndex);
    } else {
      // Reset all transforms
      this._items.forEach(item => {
        item.element.style.transform = '';
      });
    }

    this._publishEvent('sortable-list:drag-end', {
      index: this._dropTargetIndex !== -1 ? this._dropTargetIndex : this._draggedIndex,
      item: this._draggedItem?.id
    });

    this._isDragging = false;
    this._draggedItem = null;
    this._draggedIndex = -1;
    this._dropTargetIndex = -1;
  }

  /**
   * Animate reorder preview using GPU-accelerated transforms
   * @param {number} fromIndex
   * @param {number} toIndex
   * @param {boolean} skipDragged - Skip animating the dragged item (for touch)
   * @private
   */
  _animateReorder(fromIndex, toIndex, skipDragged = false) {
    const direction = toIndex > fromIndex ? -1 : 1;
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    this._items.forEach((item, index) => {
      if (skipDragged && index === fromIndex) return;

      if (index === fromIndex) {
        // Don't transform the dragged item in drag-over mode
        if (!skipDragged) {
          item.element.style.transform = '';
        }
      } else if (index >= start && index <= end) {
        // Move items between source and target
        const offset = direction * 100;
        item.element.style.transform = `translateY(${offset}%)`;
      } else {
        // Reset other items
        item.element.style.transform = '';
      }
    });
  }

  /**
   * Commit the reorder by updating the DOM
   * @param {number} fromIndex
   * @param {number} toIndex
   * @private
   */
  _commitReorder(fromIndex, toIndex) {
    // Move the item in the array
    const [movedItem] = this._items.splice(fromIndex, 1);
    this._items.splice(toIndex, 0, movedItem);

    // Update indices
    this._items.forEach((item, index) => {
      item.element.dataset.index = index;
    });

    // Reset transforms
    requestAnimationFrame(() => {
      this._items.forEach(item => {
        item.element.style.transform = '';
      });
    });

    // Reorder in DOM
    const parent = this._draggedItem.element.parentElement;
    if (parent) {
      const referenceNode = toIndex < this._items.length - 1 
        ? this._items[toIndex + 1].element 
        : null;
      parent.insertBefore(this._draggedItem.element, referenceNode);
    }

    this._publishEvent('sortable-list:reorder', {
      fromIndex,
      toIndex,
      item: movedItem.id,
      items: this._items.map(item => item.id)
    });
  }

  /**
   * Publish event to EventBus
   * @param {string} eventType
   * @param {Object} detail
   * @private
   */
  _publishEvent(eventType, detail) {
    // Dispatch custom event
    this.dispatchEvent(new CustomEvent(eventType, {
      detail,
      bubbles: true,
      composed: true
    }));

    // Publish to EventBus if available
    if (window.EventBus) {
      window.EventBus.publish({
        type: eventType,
        source: 'sortable-list',
        payload: detail,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get disabled state
   * @returns {boolean}
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  /**
   * Set disabled state
   * @param {boolean} value
   */
  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Get animation duration in milliseconds
   * @returns {number}
   */
  get animationDuration() {
    return parseInt(this.getAttribute('animation-duration') || '200', 10);
  }

  /**
   * Set animation duration
   * @param {number} value
   */
  set animationDuration(value) {
    this.setAttribute('animation-duration', value.toString());
  }

  /**
   * Get current item order
   * @returns {Array<string>}
   */
  getItemOrder() {
    return this._items.map(item => item.id);
  }

  /**
   * Programmatically reorder items
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  reorderItem(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this._items.length ||
        toIndex < 0 || toIndex >= this._items.length) {
      console.error('Invalid indices for reorder');
      return;
    }

    this._animateReorder(fromIndex, toIndex);
    
    // Commit after animation
    setTimeout(() => {
      this._commitReorder(fromIndex, toIndex);
    }, this.animationDuration);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
        }

        :host([disabled]) {
          opacity: 0.6;
          pointer-events: none;
        }

        .sortable-container {
          position: relative;
          user-select: none;
        }

        ::slotted(*) {
          position: relative;
          cursor: grab;
          touch-action: none;
          will-change: transform;
        }

        ::slotted(*.dragging) {
          cursor: grabbing;
          z-index: 1000;
        }

        :host([disabled]) ::slotted(*) {
          cursor: default;
        }

        /* Visual feedback */
        .drag-indicator {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--harmony-color-primary, #0066cc);
          opacity: 0;
          transition: opacity 150ms ease;
          pointer-events: none;
        }

        .drag-indicator.active {
          opacity: 1;
        }
      </style>
      <div class="sortable-container">
        <slot></slot>
        <div class="drag-indicator"></div>
      </div>
    `;
  }
}

customElements.define('sortable-list', SortableList);

export default SortableList;