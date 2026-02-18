/**
 * Border Color Tokens
 * 
 * Semantic border colors for UI elements.
 * These tokens provide consistent border styling across components.
 * 
 * Usage:
 * - border-default: Standard borders for most UI elements
 * - border-subtle: Lighter borders for less emphasis
 * - border-strong: Stronger borders for emphasis or active states
 * - border-focus: Focus indicator borders (accessibility)
 * 
 * @module tokens/border
 * @see {@link file://./../DESIGN_SYSTEM.md#border-tokens}
 */

/**
 * Border color token definitions
 * Maps semantic border purposes to HSL color values
 * 
 * @type {Object.<string, string>}
 */
export const borderTokens = {
  // Standard border for most UI elements
  'border-default': 'hsl(220, 10%, 80%)',
  
  // Subtle border for less emphasis
  'border-subtle': 'hsl(220, 10%, 90%)',
  
  // Strong border for emphasis or active states
  'border-strong': 'hsl(220, 15%, 60%)',
  
  // Focus indicator border (accessibility)
  'border-focus': 'hsl(220, 90%, 55%)'
};

/**
 * Dark mode border color overrides
 * Adjusted for better contrast on dark backgrounds
 * 
 * @type {Object.<string, string>}
 */
export const borderTokensDark = {
  'border-default': 'hsl(220, 10%, 30%)',
  'border-subtle': 'hsl(220, 10%, 20%)',
  'border-strong': 'hsl(220, 15%, 45%)',
  'border-focus': 'hsl(220, 90%, 60%)'
};

/**
 * Registers border tokens as CSS custom properties
 * Applies to :root for light mode and [data-theme="dark"] for dark mode
 * 
 * @returns {void}
 */
export function registerBorderTokens() {
  const root = document.documentElement;
  
  // Register light mode tokens
  Object.entries(borderTokens).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value);
  });
  
  // Register dark mode tokens
  const darkModeStyles = Object.entries(borderTokensDark)
    .map(([name, value]) => `--${name}: ${value};`)
    .join('\n    ');
  
  const styleId = 'border-tokens-dark';
  let styleEl = document.getElementById(styleId);
  
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `
    [data-theme="dark"] {
      ${darkModeStyles}
    }
  `;
}

// Auto-register on module load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerBorderTokens);
  } else {
    registerBorderTokens();
  }
}