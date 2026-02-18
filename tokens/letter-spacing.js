/**
 * Letter Spacing Design Tokens
 * 
 * Defines letter spacing (tracking) values for typography.
 * Letter spacing affects readability and visual density of text.
 * 
 * Values:
 * - tight: -0.02em (tighter tracking for headings)
 * - normal: 0 (default browser spacing)
 * - wide: 0.02em (looser tracking for improved readability)
 * 
 * Usage:
 * ```javascript
 * import { LETTER_SPACING } from './tokens/letter-spacing.js';
 * element.style.letterSpacing = LETTER_SPACING.normal;
 * ```
 * 
 * @module tokens/letter-spacing
 * @see {@link ../DESIGN_SYSTEM.md#letter-spacing-tokens}
 */

/**
 * Letter spacing token values
 * @type {Object.<string, string>}
 * @property {string} tight - Tighter tracking (-0.02em) for headings and display text
 * @property {string} normal - Default browser spacing (0) for body text
 * @property {string} wide - Looser tracking (0.02em) for improved readability
 */
export const LETTER_SPACING = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.02em'
};

/**
 * CSS custom property definitions for letter spacing tokens
 * Can be applied to :root or component shadow roots
 * 
 * @returns {string} CSS variable definitions
 */
export function getLetterSpacingCSSVariables() {
  return `
    --letter-spacing-tight: ${LETTER_SPACING.tight};
    --letter-spacing-normal: ${LETTER_SPACING.normal};
    --letter-spacing-wide: ${LETTER_SPACING.wide};
  `.trim();
}

/**
 * Apply letter spacing tokens to a CSS stylesheet or style element
 * 
 * @param {CSSStyleSheet|HTMLStyleElement} target - Target to apply variables to
 */
export function applyLetterSpacingTokens(target) {
  const cssText = `:root { ${getLetterSpacingCSSVariables()} }`;
  
  if (target instanceof CSSStyleSheet) {
    target.insertRule(cssText, 0);
  } else if (target instanceof HTMLStyleElement) {
    target.textContent = cssText + '\n' + (target.textContent || '');
  }
}

// Auto-apply to document if in browser context
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `:root { ${getLetterSpacingCSSVariables()} }`;
  document.head.appendChild(style);
}