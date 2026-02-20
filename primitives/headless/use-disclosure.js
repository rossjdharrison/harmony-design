/**
 * @fileoverview Headless Disclosure Hook - Show/hide patterns with accessibility
 * @module primitives/headless/use-disclosure
 * 
 * Provides stateful logic for disclosure patterns (collapsible sections, dropdowns, etc.)
 * with full ARIA support and keyboard navigation.
 * 
 * Related: DESIGN_SYSTEM.md#headless-primitives
 */

/**
 * @typedef {Object} DisclosureState
 * @property {boolean} isOpen - Current open/closed state
 * @property {() => void} open - Open the disclosure
 * @property {() => void} close - Close the disclosure
 * @property {() => void} toggle - Toggle the disclosure state
 * @property {(event: Event) => void} handleTriggerClick - Click handler for trigger element
 * @property {(event: KeyboardEvent) => void} handleTriggerKeyDown - Keyboard handler for trigger
 * @property {Object} triggerProps - Props to spread on trigger element
 * @property {Object} contentProps - Props to spread on content element
 */

/**
 * @typedef {Object} DisclosureOptions
 * @property {boolean} [defaultOpen=false] - Initial open state
 * @property {boolean} [controlled=false] - Whether state is controlled externally
 * @property {(isOpen: boolean) => void} [onChange] - Callback when state changes
 * @property {string} [id] - Base ID for ARIA relationships (auto-generated if not provided)
 * @property {boolean} [closeOnEsc=true] - Close on Escape key
 * @property {boolean} [closeOnClickOutside=false] - Close when clicking outside
 */

/**
 * Creates a unique ID for disclosure components
 * @returns {string} Unique identifier
 */
function generateId() {
  return `disclosure-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * useDisclosure - Headless hook for show/hide patterns with accessibility
 * 
 * Manages state and accessibility attributes for disclosure patterns.
 * Follows WAI-ARIA Disclosure pattern guidelines.
 * 
 * @param {DisclosureOptions} [options={}] - Configuration options
 * @returns {DisclosureState} Disclosure state and handlers
 * 
 * @example
 * const disclosure = useDisclosure({ defaultOpen: false });
 * 
 * // In your component
 * button.setAttribute('aria-expanded', disclosure.triggerProps['aria-expanded']);
 * button.setAttribute('aria-controls', disclosure.triggerProps['aria-controls']);
 * button.onclick = disclosure.handleTriggerClick;
 * 
 * content.id = disclosure.contentProps.id;
 * content.hidden = !disclosure.isOpen;
 */
export function useDisclosure(options = {}) {
  const {
    defaultOpen = false,
    controlled = false,
    onChange = null,
    id = generateId(),
    closeOnEsc = true,
    closeOnClickOutside = false
  } = options;

  // Internal state
  let isOpen = defaultOpen;
  let listeners = [];
  let triggerElement = null;
  let contentElement = null;
  let outsideClickHandler = null;
  let escapeKeyHandler = null;

  const triggerId = `${id}-trigger`;
  const contentId = `${id}-content`;

  /**
   * Notify listeners of state change
   * @private
   */
  function notifyListeners() {
    listeners.forEach(listener => listener(isOpen));
    if (onChange) {
      onChange(isOpen);
    }
  }

  /**
   * Open the disclosure
   */
  function open() {
    if (!isOpen) {
      isOpen = true;
      notifyListeners();
      setupOutsideHandlers();
    }
  }

  /**
   * Close the disclosure
   */
  function close() {
    if (isOpen) {
      isOpen = false;
      notifyListeners();
      cleanupOutsideHandlers();
    }
  }

  /**
   * Toggle the disclosure state
   */
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  /**
   * Handle click on trigger element
   * @param {Event} event - Click event
   */
  function handleTriggerClick(event) {
    event.preventDefault();
    toggle();
  }

  /**
   * Handle keyboard events on trigger element
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleTriggerKeyDown(event) {
    // Space and Enter toggle the disclosure
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggle();
    }
    
    // Escape closes the disclosure
    if (event.key === 'Escape' && closeOnEsc && isOpen) {
      event.preventDefault();
      close();
      // Return focus to trigger
      if (triggerElement) {
        triggerElement.focus();
      }
    }
  }

  /**
   * Handle clicks outside the disclosure
   * @param {Event} event - Click event
   * @private
   */
  function handleClickOutside(event) {
    if (!triggerElement || !contentElement) return;

    const target = event.target;
    const clickedTrigger = triggerElement.contains(target);
    const clickedContent = contentElement.contains(target);

    if (!clickedTrigger && !clickedContent) {
      close();
    }
  }

  /**
   * Handle escape key globally
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  function handleEscapeKey(event) {
    if (event.key === 'Escape' && isOpen) {
      close();
      if (triggerElement) {
        triggerElement.focus();
      }
    }
  }

  /**
   * Setup handlers for outside interactions
   * @private
   */
  function setupOutsideHandlers() {
    if (closeOnClickOutside && !outsideClickHandler) {
      outsideClickHandler = handleClickOutside.bind(this);
      // Use capture phase to catch events before they bubble
      setTimeout(() => {
        document.addEventListener('click', outsideClickHandler, true);
      }, 0);
    }

    if (closeOnEsc && !escapeKeyHandler) {
      escapeKeyHandler = handleEscapeKey.bind(this);
      document.addEventListener('keydown', escapeKeyHandler);
    }
  }

  /**
   * Cleanup outside interaction handlers
   * @private
   */
  function cleanupOutsideHandlers() {
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler, true);
      outsideClickHandler = null;
    }

    if (escapeKeyHandler) {
      document.removeEventListener('keydown', escapeKeyHandler);
      escapeKeyHandler = null;
    }
  }

  /**
   * Subscribe to state changes
   * @param {(isOpen: boolean) => void} listener - Callback function
   * @returns {() => void} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }

  /**
   * Set the trigger element reference for outside click detection
   * @param {HTMLElement} element - Trigger element
   */
  function setTriggerElement(element) {
    triggerElement = element;
  }

  /**
   * Set the content element reference for outside click detection
   * @param {HTMLElement} element - Content element
   */
  function setContentElement(element) {
    contentElement = element;
  }

  /**
   * Get current state
   * @returns {boolean} Current open state
   */
  function getState() {
    return isOpen;
  }

  /**
   * Cleanup all event listeners
   */
  function destroy() {
    cleanupOutsideHandlers();
    listeners = [];
    triggerElement = null;
    contentElement = null;
  }

  // Props to spread on trigger element
  const triggerProps = {
    id: triggerId,
    'aria-expanded': isOpen.toString(),
    'aria-controls': contentId,
    role: 'button',
    tabIndex: 0
  };

  // Props to spread on content element
  const contentProps = {
    id: contentId,
    'aria-labelledby': triggerId,
    hidden: !isOpen
  };

  return {
    // State
    isOpen,
    
    // Actions
    open,
    close,
    toggle,
    
    // Event handlers
    handleTriggerClick,
    handleTriggerKeyDown,
    
    // Props
    triggerProps,
    contentProps,
    
    // Advanced API
    subscribe,
    setTriggerElement,
    setContentElement,
    getState,
    destroy
  };
}

/**
 * Create a reactive disclosure that updates DOM automatically
 * 
 * @param {HTMLElement} triggerElement - Trigger button/element
 * @param {HTMLElement} contentElement - Content to show/hide
 * @param {DisclosureOptions} [options={}] - Configuration options
 * @returns {DisclosureState} Disclosure state and cleanup
 * 
 * @example
 * const trigger = document.querySelector('#my-trigger');
 * const content = document.querySelector('#my-content');
 * const disclosure = createDisclosure(trigger, content, { defaultOpen: false });
 */
export function createDisclosure(triggerElement, contentElement, options = {}) {
  const disclosure = useDisclosure(options);
  
  // Store element references
  disclosure.setTriggerElement(triggerElement);
  disclosure.setContentElement(contentElement);
  
  /**
   * Update DOM based on current state
   */
  function updateDOM() {
    const state = disclosure.getState();
    
    // Update trigger attributes
    triggerElement.setAttribute('aria-expanded', state.toString());
    triggerElement.setAttribute('aria-controls', disclosure.contentProps.id);
    triggerElement.setAttribute('role', 'button');
    if (!triggerElement.hasAttribute('tabindex')) {
      triggerElement.setAttribute('tabindex', '0');
    }
    
    // Update content attributes
    contentElement.id = disclosure.contentProps.id;
    contentElement.setAttribute('aria-labelledby', disclosure.triggerProps.id);
    
    if (state) {
      contentElement.removeAttribute('hidden');
      contentElement.style.display = '';
    } else {
      contentElement.setAttribute('hidden', '');
      contentElement.style.display = 'none';
    }
  }
  
  // Subscribe to state changes
  const unsubscribe = disclosure.subscribe(updateDOM);
  
  // Attach event listeners
  triggerElement.addEventListener('click', disclosure.handleTriggerClick);
  triggerElement.addEventListener('keydown', disclosure.handleTriggerKeyDown);
  
  // Initial DOM update
  updateDOM();
  
  // Return disclosure with enhanced cleanup
  const originalDestroy = disclosure.destroy;
  disclosure.destroy = () => {
    unsubscribe();
    triggerElement.removeEventListener('click', disclosure.handleTriggerClick);
    triggerElement.removeEventListener('keydown', disclosure.handleTriggerKeyDown);
    originalDestroy();
  };
  
  return disclosure;
}

/**
 * Performance: This hook has minimal overhead
 * - No DOM manipulation (headless pattern)
 * - Event listeners only added when open (for outside click)
 * - State changes are synchronous
 * - Memory: ~1KB per instance
 */