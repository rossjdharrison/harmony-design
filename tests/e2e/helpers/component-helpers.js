/**
 * @fileoverview Component interaction helpers for E2E tests
 * @module tests/e2e/helpers/component-helpers
 */

/**
 * Wait for component to be ready
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} selector - Component selector
 * @returns {Promise<void>}
 */
export async function waitForComponent(page, selector) {
  await page.waitForSelector(selector, { state: 'attached' });
  
  // Wait for component to be fully initialized
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return new Promise((resolve) => {
      if (element && element.shadowRoot) {
        resolve();
      } else {
        const observer = new MutationObserver(() => {
          if (element.shadowRoot) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(element, { childList: true, subtree: true });
      }
    });
  }, selector);
}

/**
 * Get shadow root content
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} selector - Component selector
 * @returns {Promise<import('@playwright/test').ElementHandle>}
 */
export async function getShadowRoot(page, selector) {
  return await page.evaluateHandle((sel) => {
    return document.querySelector(sel).shadowRoot;
  }, selector);
}

/**
 * Click element in shadow DOM
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} componentSelector - Component selector
 * @param {string} innerSelector - Selector within shadow root
 * @returns {Promise<void>}
 */
export async function clickInShadow(page, componentSelector, innerSelector) {
  await page.evaluate(({ comp, inner }) => {
    const component = document.querySelector(comp);
    const element = component.shadowRoot.querySelector(inner);
    element.click();
  }, { comp: componentSelector, inner: innerSelector });
}

/**
 * Type text in shadow DOM input
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} componentSelector - Component selector
 * @param {string} innerSelector - Input selector within shadow root
 * @param {string} text - Text to type
 * @returns {Promise<void>}
 */
export async function typeInShadow(page, componentSelector, innerSelector, text) {
  await page.evaluate(({ comp, inner, value }) => {
    const component = document.querySelector(comp);
    const input = component.shadowRoot.querySelector(inner);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { comp: componentSelector, inner: innerSelector, value: text });
}

/**
 * Get component property
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} selector - Component selector
 * @param {string} property - Property name
 * @returns {Promise<any>}
 */
export async function getComponentProperty(page, selector, property) {
  return await page.evaluate(({ sel, prop }) => {
    return document.querySelector(sel)[prop];
  }, { sel: selector, prop: property });
}

/**
 * Set component property
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} selector - Component selector
 * @param {string} property - Property name
 * @param {any} value - Property value
 * @returns {Promise<void>}
 */
export async function setComponentProperty(page, selector, property, value) {
  await page.evaluate(({ sel, prop, val }) => {
    document.querySelector(sel)[prop] = val;
  }, { sel: selector, prop: property, val: value });
}

/**
 * Wait for event to be published
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} eventType - Event type to wait for
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} Event payload
 */
export async function waitForEvent(page, eventType, timeout = 5000) {
  return await page.evaluate(({ type, ms }) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${type} not received within ${ms}ms`));
      }, ms);
      
      const handler = (event) => {
        clearTimeout(timer);
        window.EventBus.unsubscribe(type, handler);
        resolve(event.detail);
      };
      
      window.EventBus.subscribe(type, handler);
    });
  }, { type: eventType, ms: timeout });
}