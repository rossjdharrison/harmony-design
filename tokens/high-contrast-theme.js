/**
 * @fileoverview High Contrast Theme Tokens
 * @module tokens/high-contrast-theme
 * 
 * Provides theme variant optimized for users who need high contrast.
 * Meets WCAG AAA contrast requirements (7:1 for normal text, 4.5:1 for large text).
 * 
 * @see {@link ../DESIGN_SYSTEM.md#high-contrast-theme}
 */

/**
 * High contrast color palette with maximum contrast ratios
 * @constant {Object} HIGH_CONTRAST_COLORS
 */
export const HIGH_CONTRAST_COLORS = {
  // Pure black and white for maximum contrast
  background: {
    primary: '#000000',      // Pure black
    secondary: '#1a1a1a',    // Near black for subtle layering
    tertiary: '#0d0d0d',     // Intermediate black
    elevated: '#262626',     // Slightly elevated surfaces
  },
  
  foreground: {
    primary: '#ffffff',      // Pure white
    secondary: '#f0f0f0',    // Near white for secondary text
    tertiary: '#d9d9d9',     // Dimmed white for tertiary content
    disabled: '#808080',     // Mid-gray for disabled state
  },
  
  // High contrast accent colors
  accent: {
    primary: '#00ffff',      // Cyan - high visibility
    secondary: '#ffff00',    // Yellow - high visibility
    success: '#00ff00',      // Bright green
    warning: '#ffaa00',      // Bright orange
    error: '#ff0000',        // Bright red
    info: '#00aaff',         // Bright blue
  },
  
  // Border colors for clear delineation
  border: {
    default: '#ffffff',      // White borders
    focus: '#00ffff',        // Cyan focus indicator
    active: '#ffff00',       // Yellow active state
    disabled: '#666666',     // Gray for disabled
  },
  
  // Interactive states
  interactive: {
    hover: '#333333',        // Dark hover background
    active: '#404040',       // Dark active background
    focus: '#1a1a1a',        // Focus background
    disabled: '#0d0d0d',     // Disabled background
  },
};

/**
 * High contrast theme configuration
 * @constant {Object} HIGH_CONTRAST_THEME
 */
export const HIGH_CONTRAST_THEME = {
  id: 'high-contrast',
  name: 'High Contrast',
  description: 'Maximum contrast theme for improved accessibility',
  
  colors: HIGH_CONTRAST_COLORS,
  
  // Typography adjustments for high contrast
  typography: {
    fontWeight: {
      normal: 500,           // Slightly heavier for better visibility
      medium: 600,
      bold: 700,
      heavy: 800,
    },
    
    letterSpacing: {
      tight: '0.01em',       // Slightly increased for clarity
      normal: '0.02em',
      wide: '0.05em',
    },
  },
  
  // Enhanced borders for clear boundaries
  borders: {
    width: {
      thin: '2px',           // Thicker borders for visibility
      medium: '3px',
      thick: '4px',
    },
    
    style: 'solid',          // Always solid, never dashed/dotted
  },
  
  // Focus indicators - critical for keyboard navigation
  focus: {
    outlineWidth: '3px',     // Thick outline
    outlineStyle: 'solid',
    outlineColor: HIGH_CONTRAST_COLORS.border.focus,
    outlineOffset: '2px',
  },
  
  // Spacing - slightly increased for clarity
  spacing: {
    multiplier: 1.1,         // 10% increase in spacing
  },
  
  // Shadow removal - shadows reduce contrast
  shadows: {
    enabled: false,          // No shadows in high contrast mode
  },
  
  // Transitions - keep for smooth UX but ensure contrast maintained
  transitions: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: 'ease-in-out',
  },
};

/**
 * CSS custom properties for high contrast theme
 * @returns {string} CSS custom properties declaration
 */
export function getHighContrastCSSVariables() {
  const colors = HIGH_CONTRAST_COLORS;
  
  return `
    /* Background colors */
    --hc-bg-primary: ${colors.background.primary};
    --hc-bg-secondary: ${colors.background.secondary};
    --hc-bg-tertiary: ${colors.background.tertiary};
    --hc-bg-elevated: ${colors.background.elevated};
    
    /* Foreground colors */
    --hc-fg-primary: ${colors.foreground.primary};
    --hc-fg-secondary: ${colors.foreground.secondary};
    --hc-fg-tertiary: ${colors.foreground.tertiary};
    --hc-fg-disabled: ${colors.foreground.disabled};
    
    /* Accent colors */
    --hc-accent-primary: ${colors.accent.primary};
    --hc-accent-secondary: ${colors.accent.secondary};
    --hc-accent-success: ${colors.accent.success};
    --hc-accent-warning: ${colors.accent.warning};
    --hc-accent-error: ${colors.accent.error};
    --hc-accent-info: ${colors.accent.info};
    
    /* Border colors */
    --hc-border-default: ${colors.border.default};
    --hc-border-focus: ${colors.border.focus};
    --hc-border-active: ${colors.border.active};
    --hc-border-disabled: ${colors.border.disabled};
    
    /* Interactive states */
    --hc-interactive-hover: ${colors.interactive.hover};
    --hc-interactive-active: ${colors.interactive.active};
    --hc-interactive-focus: ${colors.interactive.focus};
    --hc-interactive-disabled: ${colors.interactive.disabled};
    
    /* Typography */
    --hc-font-weight-normal: ${HIGH_CONTRAST_THEME.typography.fontWeight.normal};
    --hc-font-weight-medium: ${HIGH_CONTRAST_THEME.typography.fontWeight.medium};
    --hc-font-weight-bold: ${HIGH_CONTRAST_THEME.typography.fontWeight.bold};
    --hc-letter-spacing-normal: ${HIGH_CONTRAST_THEME.typography.letterSpacing.normal};
    
    /* Borders */
    --hc-border-width-thin: ${HIGH_CONTRAST_THEME.borders.width.thin};
    --hc-border-width-medium: ${HIGH_CONTRAST_THEME.borders.width.medium};
    --hc-border-width-thick: ${HIGH_CONTRAST_THEME.borders.width.thick};
    
    /* Focus indicators */
    --hc-focus-outline-width: ${HIGH_CONTRAST_THEME.focus.outlineWidth};
    --hc-focus-outline-color: ${HIGH_CONTRAST_THEME.focus.outlineColor};
    --hc-focus-outline-offset: ${HIGH_CONTRAST_THEME.focus.outlineOffset};
  `;
}

/**
 * Apply high contrast theme to document
 * Adds CSS custom properties and data attribute
 */
export function applyHighContrastTheme() {
  const root = document.documentElement;
  
  // Add data attribute for CSS selectors
  root.setAttribute('data-theme', 'high-contrast');
  
  // Inject CSS variables
  let styleEl = document.getElementById('high-contrast-theme-vars');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'high-contrast-theme-vars';
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `
    :root[data-theme="high-contrast"] {
      ${getHighContrastCSSVariables()}
    }
  `;
  
  // Disable animations if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.style.setProperty('--transition-duration', '0ms');
  }
  
  // Emit theme change event
  window.dispatchEvent(new CustomEvent('theme-changed', {
    detail: { theme: 'high-contrast' }
  }));
}

/**
 * Remove high contrast theme from document
 */
export function removeHighContrastTheme() {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  
  const styleEl = document.getElementById('high-contrast-theme-vars');
  if (styleEl) {
    styleEl.remove();
  }
  
  window.dispatchEvent(new CustomEvent('theme-changed', {
    detail: { theme: 'default' }
  }));
}

/**
 * Check if high contrast mode is preferred by system
 * @returns {boolean} True if high contrast is preferred
 */
export function prefersHighContrast() {
  // Check for Windows High Contrast Mode
  if (window.matchMedia('(prefers-contrast: more)').matches) {
    return true;
  }
  
  // Check for forced colors mode (Windows High Contrast)
  if (window.matchMedia('(forced-colors: active)').matches) {
    return true;
  }
  
  return false;
}

/**
 * Auto-apply high contrast theme if system preference detected
 */
export function autoApplyHighContrast() {
  if (prefersHighContrast()) {
    applyHighContrastTheme();
  }
  
  // Listen for system preference changes
  const contrastQuery = window.matchMedia('(prefers-contrast: more)');
  contrastQuery.addEventListener('change', (e) => {
    if (e.matches) {
      applyHighContrastTheme();
    } else {
      removeHighContrastTheme();
    }
  });
}