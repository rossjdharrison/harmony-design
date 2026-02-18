/**
 * @fileoverview Line Height Design Tokens
 * @module tokens/line-height
 * 
 * Defines the line height scale for typography.
 * Line height controls the vertical spacing between lines of text.
 * 
 * Usage:
 * - tight (1.2): Headings, UI labels, compact layouts
 * - normal (1.5): Body text, default for most content
 * - relaxed (1.75): Long-form reading, increased readability
 * 
 * @see {@link ../DESIGN_SYSTEM.md#line-height-tokens}
 */

/**
 * Line height token definitions
 * @constant {Object.<string, number>}
 */
export const LINE_HEIGHT = {
  /** Tight line height for headings and compact UI - unitless multiplier */
  tight: 1.2,
  
  /** Normal line height for body text - unitless multiplier */
  normal: 1.5,
  
  /** Relaxed line height for long-form content - unitless multiplier */
  relaxed: 1.75
};

/**
 * Get line height value by name
 * @param {string} name - Line height token name (tight, normal, relaxed)
 * @returns {number|null} Line height multiplier or null if not found
 */
export function getLineHeight(name) {
  return LINE_HEIGHT[name] || null;
}

/**
 * Apply line height to an element
 * @param {HTMLElement} element - Target element
 * @param {string} lineHeightName - Line height token name
 */
export function applyLineHeight(element, lineHeightName) {
  const value = getLineHeight(lineHeightName);
  if (value !== null) {
    element.style.lineHeight = value;
  }
}

// Freeze to prevent modifications
Object.freeze(LINE_HEIGHT);