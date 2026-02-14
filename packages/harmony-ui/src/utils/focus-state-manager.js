/**
 * @fileoverview Focus State Manager for serializing and restoring focus states
 * @module harmony-ui/utils/focus-state-manager
 * 
 * Provides utilities to capture, serialize, and restore focus states across
 * navigation and state changes. See DESIGN_SYSTEM.md § Focus Management
 */

/**
 * @typedef {Object} FocusState
 * @property {string} selector - CSS selector for the focused element
 * @property {number} timestamp - When the focus state was captured
 * @property {string} [elementId] - ID of focused element if available
 * @property {number} [tabIndex] - Tab index of focused element
 * @property {Object} [metadata] - Additional metadata for complex focus scenarios
 */

/**
 * Focus State Manager class for capturing and restoring focus
 */
export class FocusStateManager {
  constructor() {
    /** @type {Map<string, FocusState>} */
    this.stateCache = new Map();
    
    /** @type {number} */
    this.maxCacheSize = 50;
    
    /** @type {string} */
    this.storageKey = 'harmony-focus-state';
  }

  /**
   * Captures the current focus state
   * @param {string} contextKey - Unique key for this focus context
   * @returns {FocusState|null} Serialized focus state or null if no focus
   */
  captureFocusState(contextKey) {
    const activeElement = document.activeElement;
    
    if (!activeElement || activeElement === document.body) {
      return null;
    }

    const focusState = {
      selector: this._generateSelector(activeElement),
      timestamp: Date.now(),
      elementId: activeElement.id || undefined,
      tabIndex: activeElement.tabIndex,
      metadata: this._captureMetadata(activeElement)
    };

    this.stateCache.set(contextKey, focusState);
    this._pruneCache();

    return focusState;
  }

  /**
   * Restores focus state for a given context
   * @param {string} contextKey - Unique key for this focus context
   * @param {Object} options - Restoration options
   * @param {boolean} [options.fallbackToFirst=true] - Focus first focusable if target not found
   * @param {number} [options.timeout=100] - Timeout in ms to wait for element
   * @returns {Promise<boolean>} True if focus was restored
   */
  async restoreFocusState(contextKey, options = {}) {
    const { fallbackToFirst = true, timeout = 100 } = options;
    const focusState = this.stateCache.get(contextKey);

    if (!focusState) {
      return false;
    }

    try {
      const element = await this._findElement(focusState, timeout);
      
      if (element) {
        element.focus();
        this._restoreMetadata(element, focusState.metadata);
        return true;
      }

      if (fallbackToFirst) {
        return this._focusFirstFocusable();
      }

      return false;
    } catch (error) {
      console.warn('[FocusStateManager] Failed to restore focus:', error);
      return false;
    }
  }

  /**
   * Serializes focus state to JSON string
   * @param {string} contextKey - Context key to serialize
   * @returns {string|null} JSON string or null
   */
  serializeState(contextKey) {
    const state = this.stateCache.get(contextKey);
    return state ? JSON.stringify(state) : null;
  }

  /**
   * Deserializes focus state from JSON string
   * @param {string} contextKey - Context key to store under
   * @param {string} serializedState - JSON string
   * @returns {boolean} True if deserialization succeeded
   */
  deserializeState(contextKey, serializedState) {
    try {
      const state = JSON.parse(serializedState);
      this.stateCache.set(contextKey, state);
      return true;
    } catch (error) {
      console.error('[FocusStateManager] Failed to deserialize state:', error);
      return false;
    }
  }

  /**
   * Persists focus state to localStorage
   * @param {string} contextKey - Context key to persist
   * @returns {boolean} True if persistence succeeded
   */
  persistState(contextKey) {
    const serialized = this.serializeState(contextKey);
    if (!serialized) {
      return false;
    }

    try {
      const stored = this._getStoredStates();
      stored[contextKey] = serialized;
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
      return true;
    } catch (error) {
      console.error('[FocusStateManager] Failed to persist state:', error);
      return false;
    }
  }

  /**
   * Loads focus state from localStorage
   * @param {string} contextKey - Context key to load
   * @returns {boolean} True if load succeeded
   */
  loadState(contextKey) {
    try {
      const stored = this._getStoredStates();
      const serialized = stored[contextKey];
      
      if (serialized) {
        return this.deserializeState(contextKey, serialized);
      }
      
      return false;
    } catch (error) {
      console.error('[FocusStateManager] Failed to load state:', error);
      return false;
    }
  }

  /**
   * Clears focus state for a context
   * @param {string} contextKey - Context key to clear
   */
  clearState(contextKey) {
    this.stateCache.delete(contextKey);
    
    try {
      const stored = this._getStoredStates();
      delete stored[contextKey];
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    } catch (error) {
      console.warn('[FocusStateManager] Failed to clear persisted state:', error);
    }
  }

  /**
   * Clears all focus states
   */
  clearAllStates() {
    this.stateCache.clear();
    
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('[FocusStateManager] Failed to clear all persisted states:', error);
    }
  }

  /**
   * Generates a unique CSS selector for an element
   * @private
   * @param {Element} element - Target element
   * @returns {string} CSS selector
   */
  _generateSelector(element) {
    // Prefer ID selector
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    // Build path from root
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        const classes = Array.from(current.classList)
          .map(c => `.${CSS.escape(c)}`)
          .join('');
        selector += classes;
      }

      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current);
        if (siblings.filter(s => s.tagName === current.tagName).length > 1) {
          selector += `:nth-child(${index + 1})`;
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }

  /**
   * Captures additional metadata for focus restoration
   * @private
   * @param {Element} element - Target element
   * @returns {Object} Metadata object
   */
  _captureMetadata(element) {
    const metadata = {};

    // Capture selection state for input elements
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      metadata.selectionStart = element.selectionStart;
      metadata.selectionEnd = element.selectionEnd;
      metadata.selectionDirection = element.selectionDirection;
    }

    // Capture scroll position for scrollable elements
    if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
      metadata.scrollTop = element.scrollTop;
      metadata.scrollLeft = element.scrollLeft;
    }

    return metadata;
  }

  /**
   * Restores metadata to an element
   * @private
   * @param {Element} element - Target element
   * @param {Object} metadata - Metadata to restore
   */
  _restoreMetadata(element, metadata) {
    if (!metadata) {
      return;
    }

    // Restore selection state
    if (metadata.selectionStart !== undefined && 
        (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      element.setSelectionRange(
        metadata.selectionStart,
        metadata.selectionEnd,
        metadata.selectionDirection
      );
    }

    // Restore scroll position
    if (metadata.scrollTop !== undefined) {
      element.scrollTop = metadata.scrollTop;
    }
    if (metadata.scrollLeft !== undefined) {
      element.scrollLeft = metadata.scrollLeft;
    }
  }

  /**
   * Finds element from focus state with retry logic
   * @private
   * @param {FocusState} focusState - Focus state to find
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Element|null>} Found element or null
   */
  async _findElement(focusState, timeout) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Try by ID first
      if (focusState.elementId) {
        const element = document.getElementById(focusState.elementId);
        if (element) {
          return element;
        }
      }

      // Try by selector
      try {
        const element = document.querySelector(focusState.selector);
        if (element) {
          return element;
        }
      } catch (error) {
        console.warn('[FocusStateManager] Invalid selector:', focusState.selector);
      }

      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
  }

  /**
   * Focuses the first focusable element in the document
   * @private
   * @returns {boolean} True if an element was focused
   */
  _focusFirstFocusable() {
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const firstFocusable = document.querySelector(focusableSelector);
    
    if (firstFocusable) {
      firstFocusable.focus();
      return true;
    }

    return false;
  }

  /**
   * Prunes cache to maintain size limit
   * @private
   */
  _pruneCache() {
    if (this.stateCache.size <= this.maxCacheSize) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.stateCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([key]) => this.stateCache.delete(key));
  }

  /**
   * Gets stored states from localStorage
   * @private
   * @returns {Object} Stored states object
   */
  _getStoredStates() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[FocusStateManager] Failed to get stored states:', error);
      return {};
    }
  }
}

// Singleton instance
export const focusStateManager = new FocusStateManager();