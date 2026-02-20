/**
 * @fileoverview Droppable Zone Component
 * @module components/droppable-zone
 * 
 * Drop target with acceptance criteria and visual indicators.
 * Validates dragged items against acceptance rules and provides
 * visual feedback for valid/invalid drop targets.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#droppable-zone}
 * 
 * Events Published:
 * - drop:accepted - When valid item is dropped
 * - drop:rejected - When invalid item is dropped
 * - drop:enter - When valid item enters zone
 * - drop:leave - When item leaves zone
 * 
 * @performance Target: <1ms validation, <16ms render
 */

/**
 * DroppableZone Web Component
 * 
 * @class DroppableZoneComponent
 * @extends HTMLElement
 * 
 * @example
 * <droppable-zone
 *   accept-types="image/png,image/jpeg"
 *   accept-data-type="file"
 *   max-size="5242880"
 *   disabled="false">
 *   <div slot="content">Drop files here</div>
 *   <div slot="indicator">Valid drop target</div>
 * </droppable-zone>
 */
class DroppableZoneComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._isDragOver = false;
    this._isValidDrag = false;
    this._dragCounter = 0; // Track nested drag events
    
    // Acceptance criteria
    this._acceptTypes = [];
    this._acceptDataType = null;
    this._maxSize = Infinity;
    this._minSize = 0;
    this._maxItems = Infinity;
    this._validator = null; // Custom validation function
    
    // Performance tracking
    this._validationStartTime = 0;
  }

  static get observedAttributes() {
    return [
      'accept-types',
      'accept-data-type',
      'max-size',
      'min-size',
      'max-items',
      'disabled',
      'highlight-on-drag'
    ];
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
    this._parseAcceptanceCriteria();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._parseAcceptanceCriteria();
      this._updateState();
    }
  }

  /**
   * Parse acceptance criteria from attributes
   * @private
   */
  _parseAcceptanceCriteria() {
    // Accept types (MIME types or extensions)
    const acceptTypes = this.getAttribute('accept-types');
    this._acceptTypes = acceptTypes ? acceptTypes.split(',').map(t => t.trim()) : [];
    
    // Accept data type (file, text, url, etc.)
    this._acceptDataType = this.getAttribute('accept-data-type') || null;
    
    // Size constraints (in bytes)
    const maxSize = this.getAttribute('max-size');
    this._maxSize = maxSize ? parseInt(maxSize, 10) : Infinity;
    
    const minSize = this.getAttribute('min-size');
    this._minSize = minSize ? parseInt(minSize, 10) : 0;
    
    // Item count constraint
    const maxItems = this.getAttribute('max-items');
    this._maxItems = maxItems ? parseInt(maxItems, 10) : Infinity;
  }

  /**
   * Set custom validation function
   * @param {Function} validator - Function that takes DataTransfer and returns boolean
   */
  setValidator(validator) {
    if (typeof validator === 'function') {
      this._validator = validator;
    }
  }

  /**
   * Validate dragged items against acceptance criteria
   * @param {DataTransfer} dataTransfer
   * @returns {Object} Validation result with isValid and reason
   * @private
   */
  _validateDrop(dataTransfer) {
    this._validationStartTime = performance.now();
    
    const result = {
      isValid: true,
      reason: null,
      items: []
    };

    // Check if disabled
    if (this.hasAttribute('disabled')) {
      result.isValid = false;
      result.reason = 'Zone is disabled';
      return result;
    }

    // Custom validator takes precedence
    if (this._validator) {
      const customResult = this._validator(dataTransfer);
      if (typeof customResult === 'boolean') {
        result.isValid = customResult;
        result.reason = customResult ? null : 'Custom validation failed';
      } else if (typeof customResult === 'object') {
        return customResult;
      }
      return result;
    }

    // Check item count
    if (dataTransfer.items.length > this._maxItems) {
      result.isValid = false;
      result.reason = `Too many items (max: ${this._maxItems})`;
      return result;
    }

    // Validate each item
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      const itemResult = this._validateItem(item);
      
      if (!itemResult.isValid) {
        result.isValid = false;
        result.reason = itemResult.reason;
        return result;
      }
      
      result.items.push(itemResult);
    }

    // Performance check
    const validationTime = performance.now() - this._validationStartTime;
    if (validationTime > 1) {
      console.warn(`[DroppableZone] Validation took ${validationTime.toFixed(2)}ms (target: <1ms)`);
    }

    return result;
  }

  /**
   * Validate individual item
   * @param {DataTransferItem} item
   * @returns {Object} Validation result
   * @private
   */
  _validateItem(item) {
    const result = {
      isValid: true,
      reason: null,
      type: item.type,
      kind: item.kind
    };

    // Check data type if specified
    if (this._acceptDataType && item.kind !== this._acceptDataType) {
      result.isValid = false;
      result.reason = `Invalid data type (expected: ${this._acceptDataType})`;
      return result;
    }

    // Check MIME type if specified
    if (this._acceptTypes.length > 0) {
      const matches = this._acceptTypes.some(acceptType => {
        // Exact match
        if (item.type === acceptType) return true;
        
        // Wildcard match (e.g., "image/*")
        if (acceptType.endsWith('/*')) {
          const prefix = acceptType.slice(0, -2);
          return item.type.startsWith(prefix);
        }
        
        return false;
      });

      if (!matches) {
        result.isValid = false;
        result.reason = `Invalid file type (accepted: ${this._acceptTypes.join(', ')})`;
        return result;
      }
    }

    return result;
  }

  /**
   * Attach drag and drop event listeners
   * @private
   */
  _attachEventListeners() {
    this._boundHandlers = {
      dragenter: this._handleDragEnter.bind(this),
      dragover: this._handleDragOver.bind(this),
      dragleave: this._handleDragLeave.bind(this),
      drop: this._handleDrop.bind(this)
    };

    Object.entries(this._boundHandlers).forEach(([event, handler]) => {
      this.addEventListener(event, handler);
    });
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    if (this._boundHandlers) {
      Object.entries(this._boundHandlers).forEach(([event, handler]) => {
        this.removeEventListener(event, handler);
      });
    }
  }

  /**
   * Handle drag enter event
   * @param {DragEvent} event
   * @private
   */
  _handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this._dragCounter++;
    
    // Only process on first enter (to handle nested elements)
    if (this._dragCounter === 1) {
      const validation = this._validateDrop(event.dataTransfer);
      this._isValidDrag = validation.isValid;
      this._isDragOver = true;
      
      this._updateState();
      this._publishEvent('drop:enter', {
        isValid: validation.isValid,
        reason: validation.reason
      });
    }
  }

  /**
   * Handle drag over event
   * @param {DragEvent} event
   * @private
   */
  _handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Set drop effect based on validation
    event.dataTransfer.dropEffect = this._isValidDrag ? 'copy' : 'none';
  }

  /**
   * Handle drag leave event
   * @param {DragEvent} event
   * @private
   */
  _handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this._dragCounter--;
    
    // Only clear state when leaving the zone completely
    if (this._dragCounter === 0) {
      this._isDragOver = false;
      this._isValidDrag = false;
      
      this._updateState();
      this._publishEvent('drop:leave', {});
    }
  }

  /**
   * Handle drop event
   * @param {DragEvent} event
   * @private
   */
  _handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this._dragCounter = 0;
    
    const validation = this._validateDrop(event.dataTransfer);
    
    if (validation.isValid) {
      // Extract data based on type
      const data = this._extractDropData(event.dataTransfer);
      
      this._publishEvent('drop:accepted', {
        validation,
        data,
        dataTransfer: event.dataTransfer
      });
    } else {
      this._publishEvent('drop:rejected', {
        validation,
        dataTransfer: event.dataTransfer
      });
    }
    
    // Reset state
    this._isDragOver = false;
    this._isValidDrag = false;
    this._updateState();
  }

  /**
   * Extract data from DataTransfer object
   * @param {DataTransfer} dataTransfer
   * @returns {Array} Extracted data items
   * @private
   */
  _extractDropData(dataTransfer) {
    const items = [];
    
    if (dataTransfer.files.length > 0) {
      // File data
      for (const file of dataTransfer.files) {
        items.push({
          type: 'file',
          file,
          name: file.name,
          size: file.size,
          mimeType: file.type
        });
      }
    } else {
      // Other data types
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        items.push({
          type: item.kind,
          mimeType: item.type,
          item
        });
      }
    }
    
    return items;
  }

  /**
   * Publish event to EventBus
   * @param {string} eventType
   * @param {Object} detail
   * @private
   */
  _publishEvent(eventType, detail) {
    const event = new CustomEvent(eventType, {
      bubbles: true,
      composed: true,
      detail: {
        ...detail,
        zoneId: this.id || null,
        timestamp: Date.now()
      }
    });
    
    this.dispatchEvent(event);
    
    // Also publish to EventBus if available
    if (window.EventBus) {
      window.EventBus.publish(eventType, event.detail);
    }
  }

  /**
   * Update component state and visual indicators
   * @private
   */
  _updateState() {
    const container = this.shadowRoot.querySelector('.droppable-zone');
    if (!container) return;
    
    // Update CSS classes
    container.classList.toggle('drag-over', this._isDragOver);
    container.classList.toggle('valid-drag', this._isDragOver && this._isValidDrag);
    container.classList.toggle('invalid-drag', this._isDragOver && !this._isValidDrag);
    container.classList.toggle('disabled', this.hasAttribute('disabled'));
    
    // Update indicator visibility
    const indicator = this.shadowRoot.querySelector('.drop-indicator');
    if (indicator) {
      indicator.style.display = this._isDragOver ? 'flex' : 'none';
      indicator.classList.toggle('valid', this._isValidDrag);
      indicator.classList.toggle('invalid', !this._isValidDrag);
    }
  }

  /**
   * Render component template
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
        }

        .droppable-zone {
          position: relative;
          min-height: 100px;
          border: 2px dashed var(--border-color, #ccc);
          border-radius: var(--border-radius, 8px);
          padding: var(--spacing, 16px);
          transition: all 0.2s ease;
          background-color: var(--bg-color, transparent);
        }

        .droppable-zone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .droppable-zone.drag-over {
          border-style: solid;
          background-color: var(--drag-bg-color, rgba(0, 0, 0, 0.02));
        }

        .droppable-zone.valid-drag {
          border-color: var(--valid-color, #22c55e);
          background-color: var(--valid-bg-color, rgba(34, 197, 94, 0.1));
        }

        .droppable-zone.invalid-drag {
          border-color: var(--invalid-color, #ef4444);
          background-color: var(--invalid-bg-color, rgba(239, 68, 68, 0.1));
        }

        .drop-indicator {
          display: none;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 10;
          background-color: var(--indicator-bg, rgba(255, 255, 255, 0.9));
          border-radius: var(--border-radius, 8px);
        }

        .drop-indicator.valid {
          background-color: var(--valid-indicator-bg, rgba(34, 197, 94, 0.95));
          color: var(--valid-indicator-color, white);
        }

        .drop-indicator.invalid {
          background-color: var(--invalid-indicator-bg, rgba(239, 68, 68, 0.95));
          color: var(--invalid-indicator-color, white);
        }

        .indicator-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
        }

        .indicator-icon {
          font-size: 48px;
          line-height: 1;
        }

        .indicator-text {
          font-size: 16px;
          font-weight: 500;
        }

        ::slotted([slot="content"]) {
          display: block;
        }
      </style>

      <div class="droppable-zone">
        <slot name="content">
          <div style="text-align: center; color: #666;">
            Drop items here
          </div>
        </slot>
        
        <div class="drop-indicator">
          <div class="indicator-content">
            <div class="indicator-icon">
              <slot name="valid-icon">✓</slot>
            </div>
            <div class="indicator-text">
              <slot name="indicator">Drop to upload</slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Register custom element
if (!customElements.get('droppable-zone')) {
  customElements.define('droppable-zone', DroppableZoneComponent);
}

export { DroppableZoneComponent };