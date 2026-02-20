/**
 * @fileoverview Component Test Mount Helpers
 * @module tests/helpers/mount-helpers
 * 
 * Provides mount helpers for testing components with all necessary providers:
 * - Theme provider (light/dark mode, tokens)
 * - i18n provider (translations, locale switching)
 * - Router provider (navigation context)
 * 
 * Performance: All helpers designed for <16ms mount time
 * Memory: Cleanup utilities prevent memory leaks in test suites
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#testing-infrastructure}
 */

import { createMockEventBus } from '../utils/test-utils.js';

/**
 * Default theme configuration for tests
 * @const {Object}
 */
const DEFAULT_THEME = {
  mode: 'light',
  tokens: {
    colors: {
      primary: '#0066cc',
      secondary: '#6c757d',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px'
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '24px',
        xxl: '32px'
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75
      }
    },
    borderRadius: {
      sm: '2px',
      md: '4px',
      lg: '8px',
      xl: '16px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
      xl: '0 20px 25px rgba(0,0,0,0.1)'
    },
    transitions: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms'
    }
  }
};

/**
 * Default i18n configuration for tests
 * @const {Object}
 */
const DEFAULT_I18N = {
  locale: 'en-US',
  fallbackLocale: 'en-US',
  translations: {
    'en-US': {
      common: {
        ok: 'OK',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success'
      }
    }
  }
};

/**
 * Default router configuration for tests
 * @const {Object}
 */
const DEFAULT_ROUTER = {
  currentPath: '/',
  basePath: '',
  routes: new Map(),
  params: {},
  query: {}
};

/**
 * Theme Provider for test environments
 * Provides theme tokens and mode to child components
 */
class TestThemeProvider extends HTMLElement {
  constructor() {
    super();
    this._theme = DEFAULT_THEME;
  }

  /**
   * Set theme configuration
   * @param {Object} theme - Theme configuration
   */
  setTheme(theme) {
    this._theme = { ...DEFAULT_THEME, ...theme };
    this.dispatchEvent(new CustomEvent('theme-change', {
      detail: this._theme,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Get current theme
   * @returns {Object} Current theme configuration
   */
  getTheme() {
    return this._theme;
  }

  connectedCallback() {
    // Expose theme to children via context
    this.style.display = 'contents';
  }
}

/**
 * i18n Provider for test environments
 * Provides translation functions and locale management
 */
class TestI18nProvider extends HTMLElement {
  constructor() {
    super();
    this._config = DEFAULT_I18N;
  }

  /**
   * Set i18n configuration
   * @param {Object} config - i18n configuration
   */
  setConfig(config) {
    this._config = { ...DEFAULT_I18N, ...config };
    this.dispatchEvent(new CustomEvent('locale-change', {
      detail: { locale: this._config.locale },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Get translation for key
   * @param {string} key - Translation key (dot notation)
   * @param {Object} params - Interpolation parameters
   * @returns {string} Translated string
   */
  t(key, params = {}) {
    const locale = this._config.locale;
    const translations = this._config.translations[locale] || {};
    
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = key; // Return key if translation not found
        break;
      }
    }

    if (typeof value === 'string') {
      // Simple interpolation
      return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }

    return key;
  }

  /**
   * Get current locale
   * @returns {string} Current locale
   */
  getLocale() {
    return this._config.locale;
  }

  /**
   * Set current locale
   * @param {string} locale - Locale code
   */
  setLocale(locale) {
    this._config.locale = locale;
    this.dispatchEvent(new CustomEvent('locale-change', {
      detail: { locale },
      bubbles: true,
      composed: true
    }));
  }

  connectedCallback() {
    this.style.display = 'contents';
  }
}

/**
 * Router Provider for test environments
 * Provides navigation context and route parameters
 */
class TestRouterProvider extends HTMLElement {
  constructor() {
    super();
    this._router = { ...DEFAULT_ROUTER };
  }

  /**
   * Set router configuration
   * @param {Object} config - Router configuration
   */
  setConfig(config) {
    this._router = { ...DEFAULT_ROUTER, ...config };
    this.dispatchEvent(new CustomEvent('route-change', {
      detail: this._router,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Navigate to path
   * @param {string} path - Target path
   * @param {Object} options - Navigation options
   */
  navigate(path, options = {}) {
    this._router.currentPath = path;
    this._router.params = options.params || {};
    this._router.query = options.query || {};
    
    this.dispatchEvent(new CustomEvent('route-change', {
      detail: this._router,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Get current route
   * @returns {Object} Current route information
   */
  getRoute() {
    return this._router;
  }

  connectedCallback() {
    this.style.display = 'contents';
  }
}

// Register custom elements
if (!customElements.get('test-theme-provider')) {
  customElements.define('test-theme-provider', TestThemeProvider);
}
if (!customElements.get('test-i18n-provider')) {
  customElements.define('test-i18n-provider', TestI18nProvider);
}
if (!customElements.get('test-router-provider')) {
  customElements.define('test-router-provider', TestRouterProvider);
}

/**
 * Mount result object
 * @typedef {Object} MountResult
 * @property {HTMLElement} container - Test container element
 * @property {HTMLElement} component - Mounted component
 * @property {TestThemeProvider} themeProvider - Theme provider instance
 * @property {TestI18nProvider} i18nProvider - i18n provider instance
 * @property {TestRouterProvider} routerProvider - Router provider instance
 * @property {Object} eventBus - Mock event bus
 * @property {Function} unmount - Cleanup function
 * @property {Function} rerender - Rerender with new props
 * @property {Function} setTheme - Update theme
 * @property {Function} setLocale - Update locale
 * @property {Function} navigate - Navigate to route
 */

/**
 * Mount options
 * @typedef {Object} MountOptions
 * @property {Object} theme - Theme configuration override
 * @property {Object} i18n - i18n configuration override
 * @property {Object} router - Router configuration override
 * @property {Object} props - Component properties
 * @property {Object} attributes - Component attributes
 * @property {HTMLElement} container - Custom container element
 * @property {boolean} attachToDocument - Whether to attach to document.body
 */

/**
 * Mount a component with all providers
 * 
 * @param {string|Function} component - Component tag name or constructor
 * @param {MountOptions} options - Mount options
 * @returns {MountResult} Mount result with utilities
 * 
 * @example
 * const { container, component, unmount } = mount('my-button', {
 *   props: { label: 'Click me' },
 *   theme: { mode: 'dark' }
 * });
 * 
 * // Test component
 * expect(component.textContent).toBe('Click me');
 * 
 * // Cleanup
 * unmount();
 */
export function mount(component, options = {}) {
  const startTime = performance.now();

  // Create container
  const container = options.container || document.createElement('div');
  container.setAttribute('data-testid', 'test-container');
  
  if (options.attachToDocument !== false) {
    document.body.appendChild(container);
  }

  // Create providers
  const themeProvider = document.createElement('test-theme-provider');
  const i18nProvider = document.createElement('test-i18n-provider');
  const routerProvider = document.createElement('test-router-provider');

  // Configure providers
  if (options.theme) {
    themeProvider.setTheme(options.theme);
  }
  if (options.i18n) {
    i18nProvider.setConfig(options.i18n);
  }
  if (options.router) {
    routerProvider.setConfig(options.router);
  }

  // Create component
  let componentElement;
  if (typeof component === 'string') {
    componentElement = document.createElement(component);
  } else if (typeof component === 'function') {
    componentElement = new component();
  } else {
    throw new Error('Component must be a tag name string or constructor function');
  }

  // Set props
  if (options.props) {
    Object.entries(options.props).forEach(([key, value]) => {
      componentElement[key] = value;
    });
  }

  // Set attributes
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      componentElement.setAttribute(key, value);
    });
  }

  // Build provider tree
  container.appendChild(themeProvider);
  themeProvider.appendChild(i18nProvider);
  i18nProvider.appendChild(routerProvider);
  routerProvider.appendChild(componentElement);

  // Create mock event bus
  const eventBus = createMockEventBus();

  // Wait for component to connect
  if (componentElement.updateComplete) {
    componentElement.updateComplete.then(() => {
      const mountTime = performance.now() - startTime;
      if (mountTime > 16) {
        console.warn(`Mount took ${mountTime.toFixed(2)}ms (exceeds 16ms budget)`);
      }
    });
  }

  /**
   * Unmount and cleanup
   */
  function unmount() {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    eventBus.clear();
  }

  /**
   * Rerender with new props
   * @param {Object} newProps - New properties
   */
  function rerender(newProps) {
    Object.entries(newProps).forEach(([key, value]) => {
      componentElement[key] = value;
    });
    
    if (componentElement.requestUpdate) {
      componentElement.requestUpdate();
    }
  }

  /**
   * Update theme
   * @param {Object} theme - New theme configuration
   */
  function setTheme(theme) {
    themeProvider.setTheme(theme);
  }

  /**
   * Update locale
   * @param {string} locale - New locale
   */
  function setLocale(locale) {
    i18nProvider.setLocale(locale);
  }

  /**
   * Navigate to route
   * @param {string} path - Target path
   * @param {Object} navOptions - Navigation options
   */
  function navigate(path, navOptions) {
    routerProvider.navigate(path, navOptions);
  }

  return {
    container,
    component: componentElement,
    themeProvider,
    i18nProvider,
    routerProvider,
    eventBus,
    unmount,
    rerender,
    setTheme,
    setLocale,
    navigate
  };
}

/**
 * Mount multiple components in the same provider context
 * Useful for testing component interactions
 * 
 * @param {Array<{component: string|Function, props?: Object}>} components - Components to mount
 * @param {MountOptions} options - Shared mount options
 * @returns {Object} Mount result with array of components
 * 
 * @example
 * const { components, unmount } = mountMultiple([
 *   { component: 'my-button', props: { label: 'Button 1' } },
 *   { component: 'my-button', props: { label: 'Button 2' } }
 * ]);
 */
export function mountMultiple(components, options = {}) {
  const container = options.container || document.createElement('div');
  container.setAttribute('data-testid', 'test-container-multiple');
  
  if (options.attachToDocument !== false) {
    document.body.appendChild(container);
  }

  // Create providers
  const themeProvider = document.createElement('test-theme-provider');
  const i18nProvider = document.createElement('test-i18n-provider');
  const routerProvider = document.createElement('test-router-provider');

  // Configure providers
  if (options.theme) {
    themeProvider.setTheme(options.theme);
  }
  if (options.i18n) {
    i18nProvider.setConfig(options.i18n);
  }
  if (options.router) {
    routerProvider.setConfig(options.router);
  }

  // Build provider tree
  container.appendChild(themeProvider);
  themeProvider.appendChild(i18nProvider);
  i18nProvider.appendChild(routerProvider);

  // Mount all components
  const componentElements = components.map(({ component, props, attributes }) => {
    let element;
    if (typeof component === 'string') {
      element = document.createElement(component);
    } else if (typeof component === 'function') {
      element = new component();
    } else {
      throw new Error('Component must be a tag name string or constructor function');
    }

    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        element[key] = value;
      });
    }

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    routerProvider.appendChild(element);
    return element;
  });

  const eventBus = createMockEventBus();

  function unmount() {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    eventBus.clear();
  }

  return {
    container,
    components: componentElements,
    themeProvider,
    i18nProvider,
    routerProvider,
    eventBus,
    unmount,
    setTheme: (theme) => themeProvider.setTheme(theme),
    setLocale: (locale) => i18nProvider.setLocale(locale),
    navigate: (path, navOptions) => routerProvider.navigate(path, navOptions)
  };
}

/**
 * Create a test wrapper with providers but no component
 * Useful for testing hooks or context consumers
 * 
 * @param {MountOptions} options - Mount options
 * @returns {Object} Wrapper result
 */
export function createWrapper(options = {}) {
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'test-wrapper');
  
  if (options.attachToDocument !== false) {
    document.body.appendChild(container);
  }

  const themeProvider = document.createElement('test-theme-provider');
  const i18nProvider = document.createElement('test-i18n-provider');
  const routerProvider = document.createElement('test-router-provider');

  if (options.theme) {
    themeProvider.setTheme(options.theme);
  }
  if (options.i18n) {
    i18nProvider.setConfig(options.i18n);
  }
  if (options.router) {
    routerProvider.setConfig(options.router);
  }

  container.appendChild(themeProvider);
  themeProvider.appendChild(i18nProvider);
  i18nProvider.appendChild(routerProvider);

  function unmount() {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  function appendChild(element) {
    routerProvider.appendChild(element);
    return element;
  }

  return {
    container,
    themeProvider,
    i18nProvider,
    routerProvider,
    unmount,
    appendChild,
    setTheme: (theme) => themeProvider.setTheme(theme),
    setLocale: (locale) => i18nProvider.setLocale(locale),
    navigate: (path, navOptions) => routerProvider.navigate(path, navOptions)
  };
}

/**
 * Wait for condition to be true
 * @param {Function} condition - Condition function
 * @param {Object} options - Wait options
 * @returns {Promise<void>}
 */
export async function waitFor(condition, options = {}) {
  const timeout = options.timeout || 1000;
  const interval = options.interval || 50;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Wait for element to be present in DOM
 * @param {string} selector - CSS selector
 * @param {HTMLElement} container - Container to search in
 * @param {Object} options - Wait options
 * @returns {Promise<HTMLElement>}
 */
export async function waitForElement(selector, container = document, options = {}) {
  let element = null;
  
  await waitFor(() => {
    element = container.querySelector(selector);
    return element !== null;
  }, options);

  return element;
}

/**
 * Simulate user event
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Event type
 * @param {Object} eventInit - Event initialization
 */
export function fireEvent(element, eventType, eventInit = {}) {
  const event = new Event(eventType, {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...eventInit
  });
  
  element.dispatchEvent(event);
}

/**
 * Simulate click event
 * @param {HTMLElement} element - Target element
 */
export function click(element) {
  fireEvent(element, 'click');
}

/**
 * Simulate input event
 * @param {HTMLElement} element - Target element
 * @param {string} value - Input value
 */
export function input(element, value) {
  element.value = value;
  fireEvent(element, 'input');
}

/**
 * Get accessible role element
 * @param {string} role - ARIA role
 * @param {HTMLElement} container - Container to search in
 * @returns {HTMLElement|null}
 */
export function getByRole(role, container = document) {
  return container.querySelector(`[role="${role}"]`);
}

/**
 * Get all accessible role elements
 * @param {string} role - ARIA role
 * @param {HTMLElement} container - Container to search in
 * @returns {NodeList}
 */
export function getAllByRole(role, container = document) {
  return container.querySelectorAll(`[role="${role}"]`);
}

/**
 * Get element by test ID
 * @param {string} testId - Test ID
 * @param {HTMLElement} container - Container to search in
 * @returns {HTMLElement|null}
 */
export function getByTestId(testId, container = document) {
  return container.querySelector(`[data-testid="${testId}"]`);
}

/**
 * Get element by label text
 * @param {string} text - Label text
 * @param {HTMLElement} container - Container to search in
 * @returns {HTMLElement|null}
 */
export function getByLabelText(text, container = document) {
  const labels = container.querySelectorAll('label');
  for (const label of labels) {
    if (label.textContent.trim() === text) {
      const forId = label.getAttribute('for');
      if (forId) {
        return container.querySelector(`#${forId}`);
      }
      return label.querySelector('input, textarea, select');
    }
  }
  return null;
}

export {
  TestThemeProvider,
  TestI18nProvider,
  TestRouterProvider,
  DEFAULT_THEME,
  DEFAULT_I18N,
  DEFAULT_ROUTER
};