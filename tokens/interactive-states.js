/**
 * @fileoverview Interactive State Tokens
 * Defines tokens for interactive UI states: default, hover, active, focus
 * 
 * Design Principles:
 * - Clear visual feedback for each interaction state
 * - Accessibility-first (WCAG 2.1 AA compliant)
 * - Consistent across all interactive components
 * - Performance-optimized (GPU-accelerated transitions)
 * 
 * @see DESIGN_SYSTEM.md#interactive-state-tokens
 */

/**
 * Interactive state tokens for UI components
 * Provides consistent visual feedback across all interactive elements
 * 
 * @typedef {Object} InteractiveStateTokens
 * @property {Object} default - Default/resting state
 * @property {Object} hover - Mouse hover state
 * @property {Object} active - Pressed/activated state
 * @property {Object} focus - Keyboard focus state
 */
export const interactiveStateTokens = {
  // Default State - Resting state of interactive elements
  'interactive-default': {
    background: 'var(--color-surface-primary, #1a1a1a)',
    foreground: 'var(--color-text-primary, #ffffff)',
    border: 'var(--color-border-default, #333333)',
    opacity: '1.0',
    transform: 'scale(1.0)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'none',
  },

  // Hover State - Mouse pointer over element
  'interactive-hover': {
    background: 'var(--color-surface-hover, #252525)',
    foreground: 'var(--color-text-primary, #ffffff)',
    border: 'var(--color-border-hover, #444444)',
    opacity: '1.0',
    transform: 'scale(1.02)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },

  // Active State - Element being pressed/clicked
  'interactive-active': {
    background: 'var(--color-surface-active, #0a0a0a)',
    foreground: 'var(--color-text-primary, #ffffff)',
    border: 'var(--color-border-active, #555555)',
    opacity: '0.9',
    transform: 'scale(0.98)',
    transition: 'all 0.08s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  },

  // Focus State - Keyboard focus (WCAG 2.1 AA compliant)
  'interactive-focus': {
    background: 'var(--color-surface-primary, #1a1a1a)',
    foreground: 'var(--color-text-primary, #ffffff)',
    border: 'var(--color-border-focus, #0066ff)',
    opacity: '1.0',
    transform: 'scale(1.0)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: '2px solid var(--color-focus-ring, #0066ff)',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(0, 102, 255, 0.2)',
  },
};

/**
 * Interactive state tokens for primary/accent elements
 * Used for CTAs, primary buttons, and emphasized interactions
 */
export const interactiveStatePrimaryTokens = {
  'interactive-default': {
    background: 'var(--color-primary, #0066ff)',
    foreground: 'var(--color-text-on-primary, #ffffff)',
    border: 'var(--color-primary-border, #0066ff)',
    opacity: '1.0',
    transform: 'scale(1.0)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0, 102, 255, 0.3)',
  },

  'interactive-hover': {
    background: 'var(--color-primary-hover, #0052cc)',
    foreground: 'var(--color-text-on-primary, #ffffff)',
    border: 'var(--color-primary-border-hover, #0052cc)',
    opacity: '1.0',
    transform: 'scale(1.02)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 4px 12px rgba(0, 102, 255, 0.4)',
  },

  'interactive-active': {
    background: 'var(--color-primary-active, #003d99)',
    foreground: 'var(--color-text-on-primary, #ffffff)',
    border: 'var(--color-primary-border-active, #003d99)',
    opacity: '0.95',
    transform: 'scale(0.98)',
    transition: 'all 0.08s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  },

  'interactive-focus': {
    background: 'var(--color-primary, #0066ff)',
    foreground: 'var(--color-text-on-primary, #ffffff)',
    border: 'var(--color-primary-border, #0066ff)',
    opacity: '1.0',
    transform: 'scale(1.0)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: '2px solid var(--color-focus-ring, #ffffff)',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(0, 102, 255, 0.4)',
  },
};

/**
 * Interactive state tokens for danger/destructive actions
 * Used for delete buttons, critical actions, warnings
 */
export const interactiveStateDangerTokens = {
  'interactive-default': {
    background: 'var(--color-danger, #cc0000)',
    foreground: 'var(--color-text-on-danger, #ffffff)',
    border: 'var(--color-danger-border, #cc0000)',
    opacity: '1.0',
    transform: 'scale(1.0)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(204, 0, 0, 0.3)',
  },

  'interactive-hover': {
    background: 'var(--color-danger-hover, #990000)',
    foreground: 'var(--color-text-on-danger, #ffffff)',
    border: 'var(--color-danger-border-hover, #990000)',
    opacity: '1.0',
    transform: 'scale(1.02)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 4px 12px rgba(204, 0, 0, 0.4)',
  },

  'interactive-active': {
    background: 'var(--color-danger-active, #660000)',
    foreground: 'var(--color-text-on-danger, #ffffff)',
    border: 'var(--color-danger-border-active, #660000)',
    opacity: '0.95',
    transform: 'scale(0.98)',
    transition: 'all 0.08s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  },

  'interactive-focus': {
    background: 'var(--color-danger, #cc0000)',
    foreground: 'var(--color-text-on-danger, #ffffff)',
    border: 'var(--color-danger-border, #cc0000)',
    opacity: '1.0',
    transform: 'scale(1.0)',
    transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    cursor: 'pointer',
    outline: '2px solid var(--color-focus-ring-danger, #ff6666)',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(204, 0, 0, 0.3)',
  },
};

/**
 * Apply interactive state tokens to an element
 * Automatically handles state transitions and cleanup
 * 
 * @param {HTMLElement} element - Target element
 * @param {Object} tokens - Token set to apply (interactiveStateTokens, interactiveStatePrimaryTokens, etc.)
 * @returns {Function} Cleanup function to remove event listeners
 * 
 * @example
 * const button = document.querySelector('button');
 * const cleanup = applyInteractiveStates(button, interactiveStatePrimaryTokens);
 * // Later: cleanup();
 */
export function applyInteractiveStates(element, tokens = interactiveStateTokens) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn('[InteractiveStates] Invalid element provided');
    return () => {};
  }

  // Apply default state
  applyTokensToElement(element, tokens['interactive-default']);

  // Event handlers
  const handleMouseEnter = () => {
    if (!element.matches(':active') && !element.matches(':focus-visible')) {
      applyTokensToElement(element, tokens['interactive-hover']);
    }
  };

  const handleMouseLeave = () => {
    if (!element.matches(':active') && !element.matches(':focus-visible')) {
      applyTokensToElement(element, tokens['interactive-default']);
    }
  };

  const handleMouseDown = () => {
    applyTokensToElement(element, tokens['interactive-active']);
  };

  const handleMouseUp = () => {
    if (element.matches(':hover')) {
      applyTokensToElement(element, tokens['interactive-hover']);
    } else if (element.matches(':focus-visible')) {
      applyTokensToElement(element, tokens['interactive-focus']);
    } else {
      applyTokensToElement(element, tokens['interactive-default']);
    }
  };

  const handleFocus = () => {
    applyTokensToElement(element, tokens['interactive-focus']);
  };

  const handleBlur = () => {
    if (element.matches(':hover')) {
      applyTokensToElement(element, tokens['interactive-hover']);
    } else {
      applyTokensToElement(element, tokens['interactive-default']);
    }
  };

  // Attach event listeners
  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);
  element.addEventListener('mousedown', handleMouseDown);
  element.addEventListener('mouseup', handleMouseUp);
  element.addEventListener('focus', handleFocus);
  element.addEventListener('blur', handleBlur);

  // Return cleanup function
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    element.removeEventListener('mousedown', handleMouseDown);
    element.removeEventListener('mouseup', handleMouseUp);
    element.removeEventListener('focus', handleFocus);
    element.removeEventListener('blur', handleBlur);
  };
}

/**
 * Apply token values to element styles
 * Uses GPU-accelerated properties (transform, opacity) for performance
 * 
 * @param {HTMLElement} element - Target element
 * @param {Object} tokens - Token values to apply
 * @private
 */
function applyTokensToElement(element, tokens) {
  if (!element || !tokens) return;

  // Apply styles with GPU acceleration hints
  Object.entries(tokens).forEach(([key, value]) => {
    const cssProperty = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    element.style[key] = value;
    
    // Force GPU acceleration for transforms and opacity
    if (key === 'transform' || key === 'opacity') {
      element.style.willChange = element.style.willChange || 'transform, opacity';
    }
  });
}

/**
 * Generate CSS custom properties from interactive state tokens
 * Useful for integrating with existing CSS-based styling systems
 * 
 * @param {Object} tokens - Token set to convert
 * @param {string} prefix - CSS custom property prefix
 * @returns {string} CSS custom properties as string
 * 
 * @example
 * const css = generateInteractiveStateCSSVars(interactiveStateTokens, 'button');
 * // Outputs: --button-interactive-default-background: #1a1a1a; ...
 */
export function generateInteractiveStateCSSVars(tokens, prefix = 'interactive') {
  const cssVars = [];
  
  Object.entries(tokens).forEach(([stateName, stateTokens]) => {
    Object.entries(stateTokens).forEach(([property, value]) => {
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      const varName = `--${prefix}-${stateName}-${cssProperty}`;
      cssVars.push(`${varName}: ${value};`);
    });
  });

  return cssVars.join('\n');
}

/**
 * Create a style element with interactive state CSS variables
 * Injects global CSS custom properties for use in stylesheets
 * 
 * @param {string} selector - CSS selector to scope variables (default: ':root')
 * @returns {HTMLStyleElement} Created style element
 * 
 * @example
 * injectInteractiveStateStyles();
 * // Now you can use var(--interactive-interactive-default-background) in CSS
 */
export function injectInteractiveStateStyles(selector = ':root') {
  const style = document.createElement('style');
  style.id = 'harmony-interactive-state-tokens';
  
  const defaultVars = generateInteractiveStateCSSVars(interactiveStateTokens, 'interactive');
  const primaryVars = generateInteractiveStateCSSVars(interactiveStatePrimaryTokens, 'primary');
  const dangerVars = generateInteractiveStateCSSVars(interactiveStateDangerTokens, 'danger');
  
  style.textContent = `
    ${selector} {
      /* Default Interactive States */
      ${defaultVars}
      
      /* Primary Interactive States */
      ${primaryVars}
      
      /* Danger Interactive States */
      ${dangerVars}
    }
  `;
  
  document.head.appendChild(style);
  return style;
}