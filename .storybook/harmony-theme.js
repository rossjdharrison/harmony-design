/**
 * @fileoverview Custom Storybook theme matching Harmony Design System
 * @module .storybook/harmony-theme
 * 
 * Implements a custom theme for Storybook that aligns with the Harmony Design System
 * visual identity, including colors, typography, and spacing.
 * 
 * @see {@link https://storybook.js.org/docs/react/configure/theming|Storybook Theming}
 * @see DESIGN_SYSTEM.md#design-tokens for token definitions
 */

import { create } from '@storybook/theming/create';

/**
 * Harmony Design System color palette
 * Extracted from design tokens for consistency
 */
const colors = {
  // Primary brand colors
  primary: '#6366f1',      // Indigo-500
  primaryDark: '#4f46e5',  // Indigo-600
  primaryLight: '#818cf8', // Indigo-400
  
  // Neutral colors
  background: '#ffffff',
  backgroundDark: '#0f172a',  // Slate-900
  surface: '#f8fafc',         // Slate-50
  surfaceDark: '#1e293b',     // Slate-800
  
  // Text colors
  textPrimary: '#0f172a',     // Slate-900
  textSecondary: '#475569',   // Slate-600
  textTertiary: '#94a3b8',    // Slate-400
  textInverse: '#f8fafc',     // Slate-50
  
  // Border colors
  border: '#e2e8f0',          // Slate-200
  borderDark: '#334155',      // Slate-700
  
  // Semantic colors
  success: '#10b981',         // Green-500
  warning: '#f59e0b',         // Amber-500
  error: '#ef4444',           // Red-500
  info: '#3b82f6',            // Blue-500
};

/**
 * Typography scale based on Harmony Design System
 */
const typography = {
  fontBase: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontCode: '"Fira Code", "Monaco", "Consolas", monospace',
  
  // Font sizes
  size: {
    s1: '12px',
    s2: '14px',
    s3: '16px',
    m1: '18px',
    m2: '20px',
    m3: '24px',
    l1: '32px',
    l2: '40px',
    l3: '48px',
  },
};

/**
 * Light theme configuration for Storybook
 * Matches Harmony Design System light mode
 */
export const lightTheme = create({
  base: 'light',
  
  // Brand
  brandTitle: 'Harmony Design System',
  brandUrl: 'https://github.com/your-org/harmony-design',
  brandImage: undefined, // Can be set to logo URL
  brandTarget: '_self',
  
  // Colors
  colorPrimary: colors.primary,
  colorSecondary: colors.primaryDark,
  
  // UI
  appBg: colors.surface,
  appContentBg: colors.background,
  appBorderColor: colors.border,
  appBorderRadius: 8,
  
  // Typography
  fontBase: typography.fontBase,
  fontCode: typography.fontCode,
  
  // Text colors
  textColor: colors.textPrimary,
  textInverseColor: colors.textInverse,
  textMutedColor: colors.textSecondary,
  
  // Toolbar
  barTextColor: colors.textSecondary,
  barSelectedColor: colors.primary,
  barBg: colors.background,
  
  // Form colors
  inputBg: colors.background,
  inputBorder: colors.border,
  inputTextColor: colors.textPrimary,
  inputBorderRadius: 6,
  
  // Button colors
  buttonBg: colors.surface,
  buttonBorder: colors.border,
  
  // Grid
  gridCellSize: 8,
});

/**
 * Dark theme configuration for Storybook
 * Matches Harmony Design System dark mode
 */
export const darkTheme = create({
  base: 'dark',
  
  // Brand
  brandTitle: 'Harmony Design System',
  brandUrl: 'https://github.com/your-org/harmony-design',
  brandImage: undefined, // Can be set to logo URL
  brandTarget: '_self',
  
  // Colors
  colorPrimary: colors.primaryLight,
  colorSecondary: colors.primary,
  
  // UI
  appBg: colors.backgroundDark,
  appContentBg: colors.surfaceDark,
  appBorderColor: colors.borderDark,
  appBorderRadius: 8,
  
  // Typography
  fontBase: typography.fontBase,
  fontCode: typography.fontCode,
  
  // Text colors
  textColor: colors.textInverse,
  textInverseColor: colors.textPrimary,
  textMutedColor: colors.textTertiary,
  
  // Toolbar
  barTextColor: colors.textTertiary,
  barSelectedColor: colors.primaryLight,
  barBg: colors.surfaceDark,
  
  // Form colors
  inputBg: colors.backgroundDark,
  inputBorder: colors.borderDark,
  inputTextColor: colors.textInverse,
  inputBorderRadius: 6,
  
  // Button colors
  buttonBg: colors.surfaceDark,
  buttonBorder: colors.borderDark,
  
  // Grid
  gridCellSize: 8,
});

/**
 * Default export - light theme
 * Can be swapped in manager.js based on user preference
 */
export default lightTheme;