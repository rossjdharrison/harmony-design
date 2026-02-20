/**
 * Runtime Brand Switching Utility
 * 
 * Manages dynamic switching between brand themes using CSS custom properties.
 * Provides synchronous updates to maintain 60fps performance target.
 * 
 * @module utils/brand-switcher
 * @see harmony-design/DESIGN_SYSTEM.md#brand-switching
 */

/**
 * Available brand identifiers
 * @enum {string}
 */
export const BrandId = {
  DEFAULT: 'default',
  VIBRANT: 'vibrant',
  MINIMAL: 'minimal'
};

/**
 * Brand registry storing loaded brand configurations
 * @type {Map<string, Object>}
 */
const brandRegistry = new Map();

/**
 * Current active brand identifier
 * @type {string}
 */
let currentBrand = BrandId.DEFAULT;

/**
 * Listeners for brand change events
 * @type {Set<Function>}
 */
const changeListeners = new Set();

/**
 * Loads a brand configuration from JSON
 * 
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Object>} Brand configuration object
 * @throws {Error} If brand file cannot be loaded
 */
export async function loadBrand(brandId) {
  if (brandRegistry.has(brandId)) {
    return brandRegistry.get(brandId);
  }

  try {
    const response = await fetch(`/tokens/brands/${brandId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load brand: ${brandId}`);
    }
    
    const brandData = await response.json();
    brandRegistry.set(brandId, brandData.brand);
    return brandData.brand;
  } catch (error) {
    console.error(`[BrandSwitcher] Error loading brand ${brandId}:`, error);
    throw error;
  }
}

/**
 * Applies brand tokens to CSS custom properties
 * 
 * Performance: Uses requestAnimationFrame to batch DOM updates
 * and maintain 60fps target (16ms budget).
 * 
 * @param {Object} brand - Brand configuration object
 */
function applyBrandToDOM(brand) {
  requestAnimationFrame(() => {
    const root = document.documentElement;
    const startTime = performance.now();

    // Apply color tokens
    if (brand.colors) {
      // Primary colors
      if (brand.colors.primary) {
        Object.entries(brand.colors.primary).forEach(([shade, value]) => {
          root.style.setProperty(`--harmony-color-primary-${shade}`, value);
        });
      }

      // Secondary colors
      if (brand.colors.secondary) {
        Object.entries(brand.colors.secondary).forEach(([shade, value]) => {
          root.style.setProperty(`--harmony-color-secondary-${shade}`, value);
        });
      }

      // Neutral colors
      if (brand.colors.neutral) {
        Object.entries(brand.colors.neutral).forEach(([shade, value]) => {
          root.style.setProperty(`--harmony-color-neutral-${shade}`, value);
        });
      }

      // Semantic colors
      ['success', 'warning', 'error', 'info'].forEach(semantic => {
        if (brand.colors[semantic]) {
          root.style.setProperty(`--harmony-color-${semantic}`, brand.colors[semantic]);
        }
      });
    }

    // Apply typography tokens
    if (brand.typography) {
      if (brand.typography.fontFamily) {
        Object.entries(brand.typography.fontFamily).forEach(([key, value]) => {
          root.style.setProperty(`--harmony-font-family-${key}`, value);
        });
      }

      if (brand.typography.fontSize) {
        Object.entries(brand.typography.fontSize).forEach(([key, value]) => {
          root.style.setProperty(`--harmony-font-size-${key}`, value);
        });
      }

      if (brand.typography.fontWeight) {
        Object.entries(brand.typography.fontWeight).forEach(([key, value]) => {
          root.style.setProperty(`--harmony-font-weight-${key}`, value);
        });
      }

      if (brand.typography.lineHeight) {
        Object.entries(brand.typography.lineHeight).forEach(([key, value]) => {
          root.style.setProperty(`--harmony-line-height-${key}`, value);
        });
      }
    }

    // Apply spacing tokens
    if (brand.spacing) {
      Object.entries(brand.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--harmony-spacing-${key}`, value);
      });
    }

    // Apply border radius tokens
    if (brand.borderRadius) {
      Object.entries(brand.borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--harmony-radius-${key}`, value);
      });
    }

    // Apply shadow tokens
    if (brand.shadows) {
      Object.entries(brand.shadows).forEach(([key, value]) => {
        root.style.setProperty(`--harmony-shadow-${key}`, value);
      });
    }

    const duration = performance.now() - startTime;
    
    // Warn if exceeding render budget
    if (duration > 16) {
      console.warn(`[BrandSwitcher] Brand application took ${duration.toFixed(2)}ms (exceeds 16ms budget)`);
    }
  });
}

/**
 * Switches to a different brand theme
 * 
 * @param {string} brandId - Brand identifier to switch to
 * @returns {Promise<void>}
 * @throws {Error} If brand cannot be loaded
 * 
 * @example
 * await switchBrand(BrandId.VIBRANT);
 */
export async function switchBrand(brandId) {
  if (currentBrand === brandId) {
    return; // Already active
  }

  try {
    const brand = await loadBrand(brandId);
    applyBrandToDOM(brand);
    currentBrand = brandId;

    // Persist preference
    try {
      localStorage.setItem('harmony-brand', brandId);
    } catch (e) {
      console.warn('[BrandSwitcher] Could not persist brand preference:', e);
    }

    // Notify listeners
    changeListeners.forEach(listener => {
      try {
        listener(brandId, brand);
      } catch (error) {
        console.error('[BrandSwitcher] Error in change listener:', error);
      }
    });

    // Publish event to EventBus if available
    if (window.EventBus) {
      window.EventBus.publish({
        type: 'BrandChanged',
        payload: { brandId, brandName: brand.name },
        source: 'BrandSwitcher'
      });
    }
  } catch (error) {
    console.error(`[BrandSwitcher] Failed to switch brand to ${brandId}:`, error);
    throw error;
  }
}

/**
 * Gets the currently active brand identifier
 * 
 * @returns {string} Current brand ID
 */
export function getCurrentBrand() {
  return currentBrand;
}

/**
 * Gets all available brand identifiers
 * 
 * @returns {string[]} Array of brand IDs
 */
export function getAvailableBrands() {
  return Object.values(BrandId);
}

/**
 * Registers a listener for brand change events
 * 
 * @param {Function} listener - Callback function (brandId, brandConfig) => void
 * @returns {Function} Unsubscribe function
 * 
 * @example
 * const unsubscribe = onBrandChange((brandId, brand) => {
 *   console.log('Brand changed to:', brand.name);
 * });
 */
export function onBrandChange(listener) {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/**
 * Initializes the brand switcher with persisted preference
 * 
 * @returns {Promise<void>}
 */
export async function initializeBrandSwitcher() {
  try {
    // Check for persisted preference
    const savedBrand = localStorage.getItem('harmony-brand');
    if (savedBrand && Object.values(BrandId).includes(savedBrand)) {
      await switchBrand(savedBrand);
    } else {
      // Load default brand
      await loadBrand(BrandId.DEFAULT);
    }
  } catch (error) {
    console.error('[BrandSwitcher] Initialization failed:', error);
    // Fallback: CSS variables are already set in css-variables.css
  }
}

/**
 * Preloads all available brands for instant switching
 * 
 * @returns {Promise<void>}
 */
export async function preloadAllBrands() {
  const brands = getAvailableBrands();
  await Promise.all(brands.map(brandId => loadBrand(brandId)));
}