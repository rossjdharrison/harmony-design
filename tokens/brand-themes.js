/**
 * Brand-Specific Themes - Extend base theme with brand overrides
 * @module tokens/brand-themes
 * 
 * Each brand theme inherits from base-theme.js and overrides specific
 * tokens to match brand guidelines while maintaining consistency.
 * 
 * Related: tokens/base-theme.js, contexts/ThemeContext.js
 */

import { composeTheme } from './base-theme.js';

/**
 * Harmony brand theme - Default brand identity
 */
export const harmonyTheme = composeTheme({
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
  },
  
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    },
  },
});

/**
 * Enterprise brand theme - Professional, conservative styling
 */
export const enterpriseTheme = composeTheme({
  colors: {
    primary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    
    semantic: {
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#2563eb',
    },
  },
  
  typography: {
    fontFamily: {
      sans: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    },
  },
  
  borderRadius: {
    base: '0.125rem',  // More angular
    md: '0.25rem',
    lg: '0.375rem',
  },
});

/**
 * Creative brand theme - Bold, vibrant styling
 */
export const creativeTheme = composeTheme({
  colors: {
    primary: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    
    semantic: {
      success: '#22c55e',
      warning: '#eab308',
      error: '#f43f5e',
      info: '#8b5cf6',
    },
  },
  
  typography: {
    fontFamily: {
      sans: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
    },
  },
  
  borderRadius: {
    base: '0.5rem',   // More rounded
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
});

/**
 * Dark theme variant - Can be composed with any brand theme
 */
export const darkThemeOverrides = {
  colors: {
    surface: {
      background: '#0a0a0a',
      foreground: '#fafafa',
      card: '#171717',
      overlay: 'rgba(255, 255, 255, 0.1)',
    },
    
    neutral: {
      50: '#171717',
      100: '#262626',
      200: '#404040',
      300: '#525252',
      400: '#737373',
      500: '#a3a3a3',
      600: '#d4d4d4',
      700: '#e5e5e5',
      800: '#f5f5f5',
      900: '#fafafa',
    },
  },
};

/**
 * All available brand themes
 */
export const brandThemes = {
  harmony: harmonyTheme,
  enterprise: enterpriseTheme,
  creative: creativeTheme,
};

/**
 * Get a theme by brand name, optionally with dark mode
 * @param {string} brandName - Brand identifier
 * @param {boolean} darkMode - Whether to apply dark mode overrides
 * @returns {Object} Composed theme
 */
export function getTheme(brandName = 'harmony', darkMode = false) {
  const baseTheme = brandThemes[brandName] || brandThemes.harmony;
  
  if (darkMode) {
    return composeTheme(darkThemeOverrides, baseTheme);
  }
  
  return baseTheme;
}