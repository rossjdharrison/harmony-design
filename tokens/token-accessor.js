/**
 * @fileoverview Design token accessor utility.
 *
 * Provides type-safe (via JSDoc) runtime access to all design tokens.
 * Zero dependencies — imports only from sibling token files using relative paths.
 *
 * @module tokens/token-accessor
 *
 * @example
 * import { getToken, getAllTokens } from './token-accessor.js';
 * const blue = getToken('colors.primary.500');   // '#2196f3'
 * const tokens = getAllTokens();                  // full DesignTokens object
 */

// @ts-check
/// <reference path="../src/tokens/types.d.ts" />

import {
  colors,
  getColor,
} from './colors.js';

import {
  BASE_SPACING_UNIT,
  spacing,
  componentSpacing,
} from './spacing.js';

import {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  textStyles,
} from './typography.js';

import {
  duration,
  easing,
  transitions,
  animations,
} from './animation.js';

import {
  lightShadows,
  darkShadows,
  zIndex,
} from './elevation.js';

import {
  borderWidth,
  borderRadius,
  borderStyle,
} from './borders.js';

// ── Token registry ─────────────────────────────────────────────────────────

/**
 * All design tokens as a flat-accessible registry.
 * @type {import('../src/tokens/types.d.ts').DesignTokens}
 */
const TOKEN_REGISTRY = {
  colors,
  spacing,
  componentSpacing,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  textStyles,
  duration,
  easing,
  transitions,
  animations,
  lightShadows,
  darkShadows,
  zIndex,
  borderWidth,
  borderRadius,
  borderStyle,
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get a token value by dot-separated path.
 *
 * @param {string} path - Dot-separated path, e.g. 'colors.primary.500'
 * @returns {string|number|undefined} Token value, or undefined if not found
 *
 * @example
 * getToken('colors.primary.500')       // '#2196f3'
 * getToken('spacing.md')               // '16px'
 * getToken('fontWeights.bold')         // 700
 * getToken('zIndex.modal')             // 1400
 * getToken('duration.fast')            // '150ms'
 */
export function getToken(path) {
  return path.split('.').reduce((obj, key) => {
    if (obj === null || obj === undefined) return undefined;
    return obj[key];
  }, /** @type {any} */ (TOKEN_REGISTRY));
}

/**
 * Get a token value with full result metadata.
 *
 * @param {string} path - Dot-separated path
 * @returns {{ path: string, value: string|number|undefined, found: boolean }}
 */
export function getTokenResult(path) {
  const value = getToken(path);
  return {
    path,
    value,
    found: value !== undefined,
  };
}

/**
 * Get all design tokens.
 * Returns the full registry — use for iteration or bulk operations.
 *
 * @returns {import('../src/tokens/types.d.ts').DesignTokens}
 */
export function getAllTokens() {
  return TOKEN_REGISTRY;
}

/**
 * Check whether a token path resolves to a value.
 *
 * @param {string} path - Dot-separated path
 * @returns {boolean}
 */
export function hasToken(path) {
  return getToken(path) !== undefined;
}

/**
 * Get all tokens under a namespace prefix.
 * e.g. getTokenGroup('colors.primary') returns the full primary color scale.
 *
 * @param {string} prefix - Top-level or nested key path
 * @returns {Record<string, any>|undefined}
 */
export function getTokenGroup(prefix) {
  const result = getToken(prefix);
  if (result !== null && typeof result === 'object') return result;
  return undefined;
}

/**
 * Resolve a color token specifically, with fallback.
 * Delegates to the color module's own resolver for compound paths like 'primary.500'.
 *
 * @param {string} path - Color path relative to `colors`, e.g. 'primary.500'
 * @param {string} [fallback=''] - Value to return if path not found
 * @returns {string}
 */
export function resolveColor(path, fallback = '') {
  return getColor(path) ?? fallback;
}

/**
 * Flatten all leaf token values into a single key→value map.
 * Useful for generating CSS custom properties or debug output.
 *
 * @param {string} [prefix=''] - Optional namespace prefix in output keys
 * @returns {Record<string, string|number>}
 *
 * @example
 * flattenTokens('colors')
 * // { 'colors.primary.50': '#e3f2fd', 'colors.primary.100': '#bbdefb', ... }
 */
export function flattenTokens(prefix = '') {
  /** @type {Record<string, string|number>} */
  const result = {};
  const root = prefix ? getToken(prefix) : TOKEN_REGISTRY;

  function walk(obj, path) {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'string' || typeof obj === 'number') {
      result[path] = obj;
      return;
    }
    if (typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj)) {
        walk(val, path ? `${path}.${key}` : key);
      }
    }
  }

  walk(root, prefix);
  return result;
}

/**
 * Generate a CSS custom properties block from all color tokens.
 * Each token path becomes --token-{path} (dots replaced with hyphens).
 *
 * @param {string} [namespace='token'] - CSS variable prefix
 * @returns {string} CSS block content (without :root wrapper)
 *
 * @example
 * generateCSSVariables('hds')
 * // '--hds-colors-primary-500: #2196f3;\n  --hds-spacing-md: 16px;\n ...'
 */
export function generateCSSVariables(namespace = 'token') {
  const flat = flattenTokens();
  return Object.entries(flat)
    .map(([path, value]) => {
      const varName = `--${namespace}-${path.replaceAll('.', '-')}`;
      return `  ${varName}: ${value};`;
    })
    .join('\n');
}

// Re-export individual token groups for direct import convenience
export {
  colors,
  spacing,
  componentSpacing,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  textStyles,
  duration,
  easing,
  transitions,
  animations,
  lightShadows,
  darkShadows,
  zIndex,
  borderWidth,
  borderRadius,
  borderStyle,
  BASE_SPACING_UNIT,
};
