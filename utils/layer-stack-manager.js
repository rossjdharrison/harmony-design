/**
 * @fileoverview Layer Stack Manager - Z-index management for stacked modals/dialogs
 * @module utils/layer-stack-manager
 * 
 * Manages z-index values for overlays, modals, dialogs, and other stacked UI elements.
 * Ensures proper stacking order and prevents z-index conflicts.
 * 
 * Related: See DESIGN_SYSTEM.md § Layer Stack Management
 */

/**
 * Base z-index values for different layer types
 * @const {Object<string, number>}
 */
const LAYER_BASE_VALUES = {
  base: 0,           // Default page content
  dropdown: 1000,    // Dropdowns, tooltips, popovers
  sticky: 2000,      // Sticky headers, fixed navigation
  overlay: 3000,     // Backdrop overlays
  modal: 4000,       // Modal dialogs
  popover: 5000,     // High-priority popovers
  toast: 6000,       // Toast notifications
  tooltip: 7000,     // Tooltips (always on top)
};

/**
 * Maximum layers allowed per type before warning
 * @const {number}
 */
const MAX_STACK_DEPTH = 10;

/**
 * Z-index increment between stacked items of same type
 * @const {number}
 */
const STACK_INCREMENT = 10;

/**
 * Manages z-index values for layered UI elements
 * @class LayerStackManager
 */
class LayerStackManager {
  constructor() {
    /**
     * Active layers organized by type
     * @type {Map<string, Array<{id: string, element: HTMLElement, zIndex: number}>>}
     * @private
     */
    this._layers = new Map();

    /**
     * Layer metadata for quick lookups
     * @type {Map<string, {type: string, zIndex: number}>}
     * @private
     */
    this._layerById = new Map();

    // Initialize layer type arrays
    Object.keys(LAYER_BASE_VALUES).forEach(type => {
      this._layers.set(type, []);
    });
  }

  /**
   * Registers a new layer and assigns appropriate z-index
   * @param {string} id - Unique identifier for the layer
   * @param {HTMLElement} element - DOM element to manage
   * @param {string} type - Layer type (modal, overlay, tooltip, etc.)
   * @returns {number} Assigned z-index value
   */
  pushLayer(id, element, type = 'modal') {
    if (!LAYER_BASE_VALUES.hasOwnProperty(type)) {
      console.warn(`[LayerStackManager] Unknown layer type: ${type}, defaulting to 'modal'`);
      type = 'modal';
    }

    // Check if layer already exists
    if (this._layerById.has(id)) {
      console.warn(`[LayerStackManager] Layer ${id} already registered, updating instead`);
      return this.updateLayer(id, element);
    }

    const stack = this._layers.get(type);
    const baseZIndex = LAYER_BASE_VALUES[type];
    const stackPosition = stack.length;
    const zIndex = baseZIndex + (stackPosition * STACK_INCREMENT);

    // Warn if stack is getting too deep
    if (stackPosition >= MAX_STACK_DEPTH) {
      console.warn(
        `[LayerStackManager] Stack depth for ${type} exceeds ${MAX_STACK_DEPTH}. ` +
        `This may indicate a memory leak or UX issue.`
      );
    }

    const layerData = { id, element, zIndex };
    stack.push(layerData);
    this._layerById.set(id, { type, zIndex });

    // Apply z-index to element
    element.style.zIndex = zIndex.toString();

    this._logStackState(`Layer pushed: ${id} (${type})`);

    return zIndex;
  }

  /**
   * Removes a layer from the stack
   * @param {string} id - Layer identifier to remove
   * @returns {boolean} True if layer was removed
   */
  popLayer(id) {
    const layerInfo = this._layerById.get(id);
    if (!layerInfo) {
      console.warn(`[LayerStackManager] Attempted to pop non-existent layer: ${id}`);
      return false;
    }

    const { type } = layerInfo;
    const stack = this._layers.get(type);
    const index = stack.findIndex(layer => layer.id === id);

    if (index === -1) {
      console.error(`[LayerStackManager] Layer ${id} metadata inconsistency`);
      this._layerById.delete(id);
      return false;
    }

    // Remove from stack
    stack.splice(index, 1);
    this._layerById.delete(id);

    // Recalculate z-indices for remaining layers of this type
    this._recalculateStack(type);

    this._logStackState(`Layer popped: ${id} (${type})`);

    return true;
  }

  /**
   * Updates an existing layer (e.g., if element changes)
   * @param {string} id - Layer identifier
   * @param {HTMLElement} newElement - New DOM element
   * @returns {number} Current z-index value
   */
  updateLayer(id, newElement) {
    const layerInfo = this._layerById.get(id);
    if (!layerInfo) {
      console.warn(`[LayerStackManager] Cannot update non-existent layer: ${id}`);
      return -1;
    }

    const { type, zIndex } = layerInfo;
    const stack = this._layers.get(type);
    const layer = stack.find(l => l.id === id);

    if (layer) {
      layer.element = newElement;
      newElement.style.zIndex = zIndex.toString();
    }

    return zIndex;
  }

  /**
   * Brings a layer to the front of its type stack
   * @param {string} id - Layer identifier
   * @returns {number} New z-index value
   */
  bringToFront(id) {
    const layerInfo = this._layerById.get(id);
    if (!layerInfo) {
      console.warn(`[LayerStackManager] Cannot bring non-existent layer to front: ${id}`);
      return -1;
    }

    const { type } = layerInfo;
    const stack = this._layers.get(type);
    const index = stack.findIndex(layer => layer.id === id);

    if (index === -1 || index === stack.length - 1) {
      // Already at front or not found
      return layerInfo.zIndex;
    }

    // Move to end of stack
    const [layer] = stack.splice(index, 1);
    stack.push(layer);

    // Recalculate z-indices
    this._recalculateStack(type);

    const newZIndex = this._layerById.get(id).zIndex;
    this._logStackState(`Layer brought to front: ${id} (${type})`);

    return newZIndex;
  }

  /**
   * Gets the current z-index for a layer
   * @param {string} id - Layer identifier
   * @returns {number} Z-index value, or -1 if not found
   */
  getZIndex(id) {
    const layerInfo = this._layerById.get(id);
    return layerInfo ? layerInfo.zIndex : -1;
  }

  /**
   * Gets the topmost layer of a specific type
   * @param {string} type - Layer type
   * @returns {Object|null} Layer data or null
   */
  getTopLayer(type = 'modal') {
    const stack = this._layers.get(type);
    return stack && stack.length > 0 ? stack[stack.length - 1] : null;
  }

  /**
   * Gets all layers of a specific type
   * @param {string} type - Layer type
   * @returns {Array} Array of layer data
   */
  getLayersByType(type) {
    return [...(this._layers.get(type) || [])];
  }

  /**
   * Gets the count of active layers by type
   * @param {string} type - Layer type
   * @returns {number} Number of active layers
   */
  getStackDepth(type) {
    const stack = this._layers.get(type);
    return stack ? stack.length : 0;
  }

  /**
   * Checks if any layers of a type are active
   * @param {string} type - Layer type
   * @returns {boolean} True if layers exist
   */
  hasActiveLayers(type) {
    return this.getStackDepth(type) > 0;
  }

  /**
   * Clears all layers of a specific type
   * @param {string} type - Layer type to clear
   */
  clearType(type) {
    const stack = this._layers.get(type);
    if (!stack) return;

    // Remove all layer metadata
    stack.forEach(layer => {
      this._layerById.delete(layer.id);
    });

    // Clear the stack
    stack.length = 0;

    this._logStackState(`Cleared all layers of type: ${type}`);
  }

  /**
   * Clears all layers (reset state)
   */
  clearAll() {
    this._layerById.clear();
    this._layers.forEach(stack => stack.length = 0);
    this._logStackState('Cleared all layers');
  }

  /**
   * Recalculates z-indices for a specific type stack
   * @param {string} type - Layer type
   * @private
   */
  _recalculateStack(type) {
    const stack = this._layers.get(type);
    const baseZIndex = LAYER_BASE_VALUES[type];

    stack.forEach((layer, index) => {
      const newZIndex = baseZIndex + (index * STACK_INCREMENT);
      layer.zIndex = newZIndex;
      layer.element.style.zIndex = newZIndex.toString();

      // Update metadata
      const layerInfo = this._layerById.get(layer.id);
      if (layerInfo) {
        layerInfo.zIndex = newZIndex;
      }
    });
  }

  /**
   * Logs current stack state for debugging
   * @param {string} action - Action that triggered the log
   * @private
   */
  _logStackState(action) {
    if (typeof window !== 'undefined' && window.__HARMONY_DEBUG__) {
      const state = {};
      this._layers.forEach((stack, type) => {
        if (stack.length > 0) {
          state[type] = stack.map(l => ({ id: l.id, zIndex: l.zIndex }));
        }
      });
      console.log(`[LayerStackManager] ${action}`, state);
    }
  }

  /**
   * Gets debug information about current state
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    const info = {
      totalLayers: this._layerById.size,
      byType: {},
      layers: []
    };

    this._layers.forEach((stack, type) => {
      info.byType[type] = stack.length;
      stack.forEach(layer => {
        info.layers.push({
          id: layer.id,
          type,
          zIndex: layer.zIndex,
          elementTag: layer.element.tagName
        });
      });
    });

    return info;
  }
}

/**
 * Singleton instance
 * @type {LayerStackManager}
 */
const layerStackManager = new LayerStackManager();

// Enable debug mode if flag is set
if (typeof window !== 'undefined') {
  window.__HARMONY_LAYER_STACK__ = layerStackManager;
}

export { LayerStackManager, layerStackManager, LAYER_BASE_VALUES, STACK_INCREMENT };