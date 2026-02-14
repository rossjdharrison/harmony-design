/**
 * Test Helper Utilities
 * 
 * Common utilities for setting up and tearing down test environments.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#testing-utilities
 */

/**
 * Setup a clean test environment
 * @returns {HTMLElement} Test container element
 */
export function setupTestEnvironment() {
  const container = document.createElement('div');
  container.id = 'test-container';
  container.style.cssText = 'position: absolute; top: -9999px; left: -9999px;';
  document.body.appendChild(container);
  return container;
}

/**
 * Cleanup test environment
 * @param {HTMLElement} container - Test container to remove
 */
export function cleanupTestEnvironment(container) {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

/**
 * Wait for a custom element to be defined
 * @param {string} tagName - Custom element tag name
 * @returns {Promise<void>}
 */
export async function waitForElement(tagName) {
  await customElements.whenDefined(tagName);
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Wait for an animation to complete
 * @param {HTMLElement} element - Element with animation
 * @returns {Promise<void>}
 */
export function waitForAnimation(element) {
  return new Promise(resolve => {
    const onAnimationEnd = () => {
      element.removeEventListener('animationend', onAnimationEnd);
      resolve();
    };
    element.addEventListener('animationend', onAnimationEnd);
  });
}

/**
 * Wait for a transition to complete
 * @param {HTMLElement} element - Element with transition
 * @returns {Promise<void>}
 */
export function waitForTransition(element) {
  return new Promise(resolve => {
    const onTransitionEnd = () => {
      element.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };
    element.addEventListener('transitionend', onTransitionEnd);
  });
}

/**
 * Simulate user interaction with proper event timing
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Event type (click, focus, etc.)
 * @param {Object} options - Event options
 */
export function simulateUserInteraction(element, eventType, options = {}) {
  const event = new Event(eventType, {
    bubbles: true,
    cancelable: true,
    ...options
  });
  element.dispatchEvent(event);
}

/**
 * Measure render performance
 * @param {Function} fn - Function to measure
 * @returns {Promise<number>} Execution time in milliseconds
 */
export async function measurePerformance(fn) {
  const startTime = performance.now();
  await fn();
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Check if element is visible in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
 */
export function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

/**
 * Get computed styles for an element
 * @param {HTMLElement} element - Target element
 * @returns {CSSStyleDeclaration}
 */
export function getComputedStyles(element) {
  return window.getComputedStyle(element);
}

/**
 * Create a mock event bus for testing
 * @returns {Object} Mock event bus
 */
export function createMockEventBus() {
  const listeners = new Map();
  
  return {
    subscribe(eventType, callback) {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, []);
      }
      listeners.get(eventType).push(callback);
      
      return () => {
        const callbacks = listeners.get(eventType);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      };
    },
    
    publish(eventType, payload) {
      const callbacks = listeners.get(eventType) || [];
      callbacks.forEach(callback => callback(payload));
    },
    
    clear() {
      listeners.clear();
    }
  };
}