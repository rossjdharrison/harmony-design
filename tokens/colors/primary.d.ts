/**
 * Primary Color Palette Type Definitions
 * 
 * @module tokens/colors/primary
 */

/**
 * Valid primary color shades
 */
export type PrimaryShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

/**
 * Primary color scale mapping
 */
export type PrimaryScale = {
  [K in PrimaryShade]: string;
};

/**
 * Semantic color categories
 */
export type SemanticCategory = 'background' | 'border' | 'text' | 'icon';

/**
 * Background variants
 */
export type BackgroundVariant = 'subtle' | 'muted' | 'default' | 'hover' | 'active';

/**
 * Border variants
 */
export type BorderVariant = 'subtle' | 'default' | 'strong';

/**
 * Text variants
 */
export type TextVariant = 'subtle' | 'default' | 'strong' | 'onPrimary';

/**
 * Icon variants
 */
export type IconVariant = 'subtle' | 'default' | 'strong';

/**
 * Semantic color structure
 */
export interface PrimarySemantic {
  background: {
    [K in BackgroundVariant]: string;
  };
  border: {
    [K in BorderVariant]: string;
  };
  text: {
    [K in TextVariant]: string;
  };
  icon: {
    [K in IconVariant]: string;
  };
}

/**
 * Complete primary color system
 */
export interface PrimaryColors {
  scale: PrimaryScale;
  semantic: PrimarySemantic;
}

/**
 * RGB color object
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Primary color scale
 */
export const primaryScale: PrimaryScale;

/**
 * Semantic primary colors
 */
export const primarySemantic: PrimarySemantic;

/**
 * Complete primary color system
 */
export const primaryColors: PrimaryColors;

/**
 * Get a specific shade from the primary scale
 */
export function getPrimaryColor(shade: PrimaryShade): string;

/**
 * Get a semantic primary color
 */
export function getPrimarySemanticColor(
  category: SemanticCategory,
  variant: string
): string;

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): RGB | null;

/**
 * Calculate relative luminance for WCAG contrast calculations
 */
export function getRelativeLuminance(hex: string): number;

/**
 * Calculate WCAG contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number;

/**
 * Check if color combination meets WCAG AA standard
 */
export function meetsWCAG_AA(
  foreground: string,
  background: string,
  largeText?: boolean
): boolean;

/**
 * Check if color combination meets WCAG AAA standard
 */
export function meetsWCAG_AAA(
  foreground: string,
  background: string,
  largeText?: boolean
): boolean;