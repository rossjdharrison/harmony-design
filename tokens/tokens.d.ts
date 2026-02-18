/**
 * Design Token Registry Type Definitions
 * @module tokens
 */

import type { ColorPalette, PrimaryScale, NeutralScale, AccentColors, AlphaColors } from './colors';
import type { SpacingScale, SemanticSpacingName } from './spacing';

/**
 * Complete token registry structure
 */
export interface Tokens {
  colors: {
    primary: Record<PrimaryScale, string>;
    neutral: Record<NeutralScale, string>;
    accent: AccentColors;
    alpha: AlphaColors;
    [key: string]: any;
  };
  spacing: {
    scale: Record<SpacingScale, number>;
    semantic: Record<SemanticSpacingName, number>;
  };
}

/**
 * All design tokens organized by category
 */
export const tokens: Tokens;

/**
 * Token accessor with validation and fallback
 */
export function getToken(path: string, fallback?: any): any;

/**
 * Check if a token exists
 */
export function hasToken(path: string): boolean;

/**
 * Generate all CSS custom properties
 */
export function generateAllCssVars(): string;

// Re-exports
export * from './colors';
export * from './spacing';
export { getToken as default };