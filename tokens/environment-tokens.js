/**
 * @fileoverview Environment-Specific Design Token Overrides
 * 
 * Provides token overrides per environment (development, staging, production).
 * Tokens are loaded based on the current environment and merged with base tokens.
 * 
 * Related: config/environment-loader.js, config/environment-types.js
 * 
 * @module tokens/environment-tokens
 */

/**
 * Base design tokens shared across all environments
 * @type {Object}
 */
const BASE_TOKENS = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  zIndex: {
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070',
  },
};

/**
 * Development environment token overrides
 * Includes debugging aids and development-friendly colors
 * @type {Object}
 */
const DEVELOPMENT_TOKENS = {
  colors: {
    primary: '#0056b3', // Slightly darker for better contrast in dev
    danger: '#ff0000', // More vibrant red for debugging
    devHighlight: '#ffff00', // Debugging highlight color
    devBorder: '#ff00ff', // Debugging border color
  },
  shadows: {
    debug: '0 0 0 2px rgba(255, 0, 255, 0.5)', // Debug outline
  },
  transitions: {
    // Slower transitions in dev for easier debugging
    fast: '300ms',
    normal: '500ms',
    slow: '1000ms',
  },
};

/**
 * Staging environment token overrides
 * Mirrors production but with subtle indicators
 * @type {Object}
 */
const STAGING_TOKENS = {
  colors: {
    // Slightly muted colors to distinguish from production
    primary: '#0069d9',
    warning: '#e0a800', // Slightly darker warning
    stagingIndicator: '#ffa500', // Orange indicator for staging
  },
  shadows: {
    // Slightly reduced shadows
    md: '0 3px 5px -1px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 12px -3px rgba(0, 0, 0, 0.08)',
  },
};

/**
 * Production environment token overrides
 * Optimized for performance and polish
 * @type {Object}
 */
const PRODUCTION_TOKENS = {
  colors: {
    // Production-optimized colors
    primary: '#007bff',
    background: '#ffffff',
    surface: '#fafafa', // Slightly lighter surface
  },
  shadows: {
    // Optimized shadows for performance
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    md: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
    lg: '0 4px 8px 0 rgba(0, 0, 0, 0.12)',
  },
  transitions: {
    // Faster transitions in production
    fast: '100ms',
    normal: '200ms',
    slow: '400ms',
  },
};

/**
 * Environment-specific token map
 * @type {Object.<string, Object>}
 */
const ENVIRONMENT_OVERRIDES = {
  development: DEVELOPMENT_TOKENS,
  staging: STAGING_TOKENS,
  production: PRODUCTION_TOKENS,
};

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is a plain object
 * @param {*} item - Value to check
 * @returns {boolean} True if plain object
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get the current environment from various sources
 * @returns {string} Current environment name
 */
function getCurrentEnvironment() {
  // Check for explicit environment variable
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  
  // Check window location for environment hints
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'development';
    }
    
    if (hostname.includes('staging') || hostname.includes('stg')) {
      return 'staging';
    }
    
    if (hostname.includes('prod') || hostname.includes('app.')) {
      return 'production';
    }
  }
  
  // Default to development
  return 'development';
}

/**
 * Load tokens for the current environment
 * Merges base tokens with environment-specific overrides
 * @param {string} [environment] - Optional environment name (defaults to current)
 * @returns {Object} Merged token object
 */
export function loadEnvironmentTokens(environment) {
  const env = environment || getCurrentEnvironment();
  const overrides = ENVIRONMENT_OVERRIDES[env] || {};
  
  const tokens = deepMerge(BASE_TOKENS, overrides);
  
  // Add metadata
  tokens._meta = {
    environment: env,
    loadedAt: new Date().toISOString(),
    baseTokens: Object.keys(BASE_TOKENS).length,
    overrides: Object.keys(overrides).length,
  };
  
  return tokens;
}

/**
 * Get a specific token value by path
 * @param {string} path - Dot-notation path to token (e.g., 'colors.primary')
 * @param {Object} [tokens] - Optional token object (defaults to current environment)
 * @returns {*} Token value or undefined
 */
export function getToken(path, tokens) {
  const tokenObj = tokens || loadEnvironmentTokens();
  const parts = path.split('.');
  
  let value = tokenObj;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Set CSS custom properties from tokens
 * Useful for making tokens available to CSS
 * @param {Object} [tokens] - Optional token object (defaults to current environment)
 * @param {string} [prefix='--token'] - CSS custom property prefix
 */
export function setTokenCSSProperties(tokens, prefix = '--token') {
  const tokenObj = tokens || loadEnvironmentTokens();
  
  function setProperties(obj, path = []) {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === '_meta') return; // Skip metadata
      
      const currentPath = [...path, key];
      
      if (isObject(value)) {
        setProperties(value, currentPath);
      } else {
        const propertyName = `${prefix}-${currentPath.join('-')}`;
        document.documentElement.style.setProperty(propertyName, value);
      }
    });
  }
  
  setProperties(tokenObj);
}

/**
 * Create a token observer that reloads tokens when environment changes
 * @param {Function} callback - Callback function receiving new tokens
 * @returns {Function} Cleanup function
 */
export function observeEnvironmentTokens(callback) {
  let currentEnv = getCurrentEnvironment();
  let tokens = loadEnvironmentTokens(currentEnv);
  
  // Initial callback
  callback(tokens);
  
  // Check for environment changes periodically
  const intervalId = setInterval(() => {
    const newEnv = getCurrentEnvironment();
    if (newEnv !== currentEnv) {
      currentEnv = newEnv;
      tokens = loadEnvironmentTokens(currentEnv);
      callback(tokens);
    }
  }, 1000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Export base tokens and overrides for testing/documentation
 */
export const __testing__ = {
  BASE_TOKENS,
  DEVELOPMENT_TOKENS,
  STAGING_TOKENS,
  PRODUCTION_TOKENS,
  getCurrentEnvironment,
  deepMerge,
};