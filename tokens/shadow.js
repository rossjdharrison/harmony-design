/**
 * Shadow Design Tokens
 * 
 * Defines elevation levels through shadow tokens for the Harmony Design System.
 * Shadows create visual hierarchy and depth, indicating layering and interactivity.
 * 
 * Usage:
 * ```javascript
 * import { SHADOW_TOKENS } from './tokens/shadow.js';
 * element.style.boxShadow = SHADOW_TOKENS.default;
 * ```
 * 
 * @module tokens/shadow
 * @see {@link file://../DESIGN_SYSTEM.md#shadow-tokens}
 */

/**
 * Shadow token definitions for elevation levels
 * 
 * Token structure follows the pattern:
 * - none: No shadow (flat, on-surface elements)
 * - sm: Small shadow (subtle elevation, cards at rest)
 * - default: Default shadow (standard elevation, buttons, cards)
 * - md: Medium shadow (raised elements, dropdowns)
 * - lg: Large shadow (modals, overlays)
 * - xl: Extra large shadow (prominent modals, notifications)
 * 
 * Each shadow uses multiple layers for realistic depth perception:
 * - Ambient shadow: Soft, diffused shadow
 * - Direct shadow: Sharper shadow simulating direct light
 * 
 * @type {Object.<string, string>}
 * @property {string} none - No shadow (elevation 0)
 * @property {string} sm - Small shadow (elevation 1)
 * @property {string} default - Default shadow (elevation 2)
 * @property {string} md - Medium shadow (elevation 3)
 * @property {string} lg - Large shadow (elevation 4)
 * @property {string} xl - Extra large shadow (elevation 5)
 */
export const SHADOW_TOKENS = {
  none: 'none',
  
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  
  default: [
    '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    '0 1px 2px 0 rgba(0, 0, 0, 0.06)'
  ].join(', '),
  
  md: [
    '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  ].join(', '),
  
  lg: [
    '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  ].join(', '),
  
  xl: [
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  ].join(', ')
};

/**
 * CSS custom property names for shadow tokens
 * 
 * Use these property names in CSS to reference shadow tokens:
 * ```css
 * .card {
 *   box-shadow: var(--shadow-default);
 * }
 * ```
 * 
 * @type {Object.<string, string>}
 */
export const SHADOW_CSS_VARS = {
  none: '--shadow-none',
  sm: '--shadow-sm',
  default: '--shadow-default',
  md: '--shadow-md',
  lg: '--shadow-lg',
  xl: '--shadow-xl'
};

/**
 * Applies shadow tokens as CSS custom properties to a target element
 * 
 * @param {HTMLElement} target - Element to apply shadow custom properties to
 * @returns {void}
 * 
 * @example
 * applyShadowTokens(document.documentElement);
 */
export function applyShadowTokens(target = document.documentElement) {
  Object.entries(SHADOW_TOKENS).forEach(([key, value]) => {
    target.style.setProperty(SHADOW_CSS_VARS[key], value);
  });
}

/**
 * Gets a shadow token value by name
 * 
 * @param {string} name - Token name (none, sm, default, md, lg, xl)
 * @returns {string|null} Shadow value or null if not found
 * 
 * @example
 * const shadow = getShadowToken('default');
 * element.style.boxShadow = shadow;
 */
export function getShadowToken(name) {
  return SHADOW_TOKENS[name] || null;
}