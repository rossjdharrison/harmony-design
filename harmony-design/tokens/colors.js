/**
 * @fileoverview Color design tokens for Harmony Design System
 * Supports light and dark modes with semantic color definitions.
 * See DESIGN_SYSTEM.md#design-tokens for usage patterns.
 */

/**
 * Base color palette - theme-independent primitive colors
 * @type {Object.<string, string>}
 */
export const primitiveColors = {
  // Neutral grays
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  
  // Primary blues
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue300: '#93c5fd',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue800: '#1e40af',
  blue900: '#1e3a8a',
  
  // Success greens
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green300: '#86efac',
  green400: '#4ade80',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  green900: '#14532d',
  
  // Warning yellows
  yellow50: '#fefce8',
  yellow100: '#fef9c3',
  yellow200: '#fef08a',
  yellow300: '#fde047',
  yellow400: '#facc15',
  yellow500: '#eab308',
  yellow600: '#ca8a04',
  yellow700: '#a16207',
  yellow800: '#854d0e',
  yellow900: '#713f12',
  
  // Error reds
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  red300: '#fca5a5',
  red400: '#f87171',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',
  red800: '#991b1b',
  red900: '#7f1d1d',
  
  // Pure values
  white: '#ffffff',
  black: '#000000',
};

/**
 * Semantic color tokens for light mode
 * Maps design intent to primitive colors
 * @type {Object.<string, string>}
 */
export const lightModeColors = {
  // Backgrounds
  backgroundPrimary: primitiveColors.white,
  backgroundSecondary: primitiveColors.gray50,
  backgroundTertiary: primitiveColors.gray100,
  backgroundElevated: primitiveColors.white,
  
  // Surfaces
  surfaceDefault: primitiveColors.white,
  surfaceHover: primitiveColors.gray50,
  surfaceActive: primitiveColors.gray100,
  surfaceDisabled: primitiveColors.gray100,
  
  // Text
  textPrimary: primitiveColors.gray900,
  textSecondary: primitiveColors.gray600,
  textTertiary: primitiveColors.gray500,
  textDisabled: primitiveColors.gray400,
  textInverse: primitiveColors.white,
  
  // Borders
  borderDefault: primitiveColors.gray300,
  borderHover: primitiveColors.gray400,
  borderFocus: primitiveColors.blue500,
  borderDisabled: primitiveColors.gray200,
  
  // Brand/Primary
  brandPrimary: primitiveColors.blue600,
  brandPrimaryHover: primitiveColors.blue700,
  brandPrimaryActive: primitiveColors.blue800,
  brandSecondary: primitiveColors.blue100,
  
  // Feedback colors
  feedbackSuccess: primitiveColors.green600,
  feedbackSuccessBackground: primitiveColors.green50,
  feedbackWarning: primitiveColors.yellow600,
  feedbackWarningBackground: primitiveColors.yellow50,
  feedbackError: primitiveColors.red600,
  feedbackErrorBackground: primitiveColors.red50,
  feedbackInfo: primitiveColors.blue600,
  feedbackInfoBackground: primitiveColors.blue50,
  
  // Interactive elements
  interactivePrimary: primitiveColors.blue600,
  interactivePrimaryHover: primitiveColors.blue700,
  interactivePrimaryActive: primitiveColors.blue800,
  interactiveSecondary: primitiveColors.gray600,
  interactiveSecondaryHover: primitiveColors.gray700,
  interactiveSecondaryActive: primitiveColors.gray800,
  
  // Shadows
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowHeavy: 'rgba(0, 0, 0, 0.15)',
};

/**
 * Semantic color tokens for dark mode
 * Maps design intent to primitive colors
 * @type {Object.<string, string>}
 */
export const darkModeColors = {
  // Backgrounds
  backgroundPrimary: primitiveColors.gray900,
  backgroundSecondary: primitiveColors.gray800,
  backgroundTertiary: primitiveColors.gray700,
  backgroundElevated: primitiveColors.gray800,
  
  // Surfaces
  surfaceDefault: primitiveColors.gray800,
  surfaceHover: primitiveColors.gray700,
  surfaceActive: primitiveColors.gray600,
  surfaceDisabled: primitiveColors.gray800,
  
  // Text
  textPrimary: primitiveColors.gray50,
  textSecondary: primitiveColors.gray400,
  textTertiary: primitiveColors.gray500,
  textDisabled: primitiveColors.gray600,
  textInverse: primitiveColors.gray900,
  
  // Borders
  borderDefault: primitiveColors.gray700,
  borderHover: primitiveColors.gray600,
  borderFocus: primitiveColors.blue400,
  borderDisabled: primitiveColors.gray800,
  
  // Brand/Primary
  brandPrimary: primitiveColors.blue500,
  brandPrimaryHover: primitiveColors.blue400,
  brandPrimaryActive: primitiveColors.blue300,
  brandSecondary: primitiveColors.blue900,
  
  // Feedback colors
  feedbackSuccess: primitiveColors.green500,
  feedbackSuccessBackground: primitiveColors.green900,
  feedbackWarning: primitiveColors.yellow500,
  feedbackWarningBackground: primitiveColors.yellow900,
  feedbackError: primitiveColors.red500,
  feedbackErrorBackground: primitiveColors.red900,
  feedbackInfo: primitiveColors.blue500,
  feedbackInfoBackground: primitiveColors.blue900,
  
  // Interactive elements
  interactivePrimary: primitiveColors.blue500,
  interactivePrimaryHover: primitiveColors.blue400,
  interactivePrimaryActive: primitiveColors.blue300,
  interactiveSecondary: primitiveColors.gray400,
  interactiveSecondaryHover: primitiveColors.gray300,
  interactiveSecondaryActive: primitiveColors.gray200,
  
  // Shadows
  shadowLight: 'rgba(0, 0, 0, 0.2)',
  shadowMedium: 'rgba(0, 0, 0, 0.3)',
  shadowHeavy: 'rgba(0, 0, 0, 0.4)',
};