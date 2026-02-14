/**
 * Design Tokens - Colors
 * 
 * Centralized color definitions for the Harmony Design System.
 * These tokens should be used throughout all components to ensure consistency.
 * 
 * @module tokens/colors
 * @see {@link ../DESIGN_SYSTEM.md#design-tokens}
 */

export const colors = {
  // Primary palette
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },

  // Secondary palette
  secondary: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0',
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c',
  },

  // Neutral palette
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    1000: '#000000',
  },

  // Semantic colors
  semantic: {
    success: {
      light: '#81c784',
      main: '#4caf50',
      dark: '#388e3c',
      contrast: '#ffffff',
    },
    warning: {
      light: '#ffb74d',
      main: '#ff9800',
      dark: '#f57c00',
      contrast: '#000000',
    },
    error: {
      light: '#e57373',
      main: '#f44336',
      dark: '#d32f2f',
      contrast: '#ffffff',
    },
    info: {
      light: '#64b5f6',
      main: '#2196f3',
      dark: '#1976d2',
      contrast: '#ffffff',
    },
  },

  // UI-specific tokens
  ui: {
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#eeeeee',
      inverse: '#212121',
    },
    text: {
      primary: '#212121',
      secondary: '#616161',
      disabled: '#9e9e9e',
      inverse: '#ffffff',
    },
    border: {
      light: '#e0e0e0',
      main: '#bdbdbd',
      dark: '#757575',
    },
    focus: {
      ring: '#2196f3',
      ringAlpha: 'rgba(33, 150, 243, 0.3)',
    },
    overlay: {
      light: 'rgba(0, 0, 0, 0.04)',
      main: 'rgba(0, 0, 0, 0.12)',
      dark: 'rgba(0, 0, 0, 0.24)',
      darker: 'rgba(0, 0, 0, 0.48)',
    },
  },
};

/**
 * Get a color token by path (e.g., 'primary.500' or 'semantic.success.main')
 * @param {string} path - Dot-separated path to color token
 * @returns {string|undefined} Color value or undefined if not found
 */
export function getColor(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], colors);
}

/**
 * Create CSS custom properties from color tokens
 * @returns {string} CSS custom properties string
 */
export function generateCSSCustomProperties() {
  const props = [];
  
  function traverse(obj, prefix = '--color') {
    for (const [key, value] of Object.entries(obj)) {
      const propName = `${prefix}-${key}`;
      if (typeof value === 'string') {
        props.push(`  ${propName}: ${value};`);
      } else if (typeof value === 'object') {
        traverse(value, propName);
      }
    }
  }
  
  traverse(colors);
  return props.join('\n');
}