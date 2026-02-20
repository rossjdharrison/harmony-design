/**
 * @fileoverview Composite Tokens - Tokens that reference other tokens for complex compositions
 * @module tokens/composite
 * 
 * Composite tokens build on primitive tokens to create semantic design decisions.
 * They reference other tokens using CSS custom properties, enabling theme switching
 * and maintaining consistency across the design system.
 * 
 * Pattern: Composite tokens = f(primitive tokens)
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#composite-tokens}
 */

/**
 * Creates a composite token that references other tokens
 * @param {string} tokenReference - CSS custom property reference (e.g., 'var(--color-primary)')
 * @param {Object} metadata - Additional metadata for the composite token
 * @returns {Object} Composite token object
 */
export function createCompositeToken(tokenReference, metadata = {}) {
  return {
    value: tokenReference,
    type: 'composite',
    ...metadata
  };
}

/**
 * Resolves a composite token to its final value by following references
 * @param {string} tokenValue - Token value that may contain var() references
 * @param {CSSStyleDeclaration} computedStyle - Computed style to resolve from
 * @returns {string} Resolved value
 */
export function resolveCompositeToken(tokenValue, computedStyle) {
  if (!tokenValue || typeof tokenValue !== 'string') {
    return tokenValue;
  }

  // Match var(--token-name) or var(--token-name, fallback)
  const varPattern = /var\((--[a-zA-Z0-9-]+)(?:,\s*([^)]+))?\)/g;
  
  return tokenValue.replace(varPattern, (match, varName, fallback) => {
    const value = computedStyle.getPropertyValue(varName).trim();
    return value || fallback || match;
  });
}

/**
 * Composite Color Tokens
 * Colors composed from primitive color tokens for semantic purposes
 */
export const compositeColors = {
  // Surface colors
  'surface-primary': createCompositeToken('var(--color-neutral-50)', {
    description: 'Primary surface background',
    references: ['color-neutral-50']
  }),
  'surface-secondary': createCompositeToken('var(--color-neutral-100)', {
    description: 'Secondary surface background',
    references: ['color-neutral-100']
  }),
  'surface-tertiary': createCompositeToken('var(--color-neutral-200)', {
    description: 'Tertiary surface background',
    references: ['color-neutral-200']
  }),
  'surface-inverse': createCompositeToken('var(--color-neutral-900)', {
    description: 'Inverse surface for dark-on-light',
    references: ['color-neutral-900']
  }),
  
  // Interactive colors
  'interactive-primary': createCompositeToken('var(--color-primary-600)', {
    description: 'Primary interactive elements',
    references: ['color-primary-600']
  }),
  'interactive-primary-hover': createCompositeToken('var(--color-primary-700)', {
    description: 'Primary interactive hover state',
    references: ['color-primary-700']
  }),
  'interactive-primary-active': createCompositeToken('var(--color-primary-800)', {
    description: 'Primary interactive active state',
    references: ['color-primary-800']
  }),
  'interactive-secondary': createCompositeToken('var(--color-neutral-600)', {
    description: 'Secondary interactive elements',
    references: ['color-neutral-600']
  }),
  
  // Text colors
  'text-primary': createCompositeToken('var(--color-neutral-900)', {
    description: 'Primary text color',
    references: ['color-neutral-900']
  }),
  'text-secondary': createCompositeToken('var(--color-neutral-700)', {
    description: 'Secondary text color',
    references: ['color-neutral-700']
  }),
  'text-tertiary': createCompositeToken('var(--color-neutral-500)', {
    description: 'Tertiary text color',
    references: ['color-neutral-500']
  }),
  'text-inverse': createCompositeToken('var(--color-neutral-50)', {
    description: 'Inverse text for dark backgrounds',
    references: ['color-neutral-50']
  }),
  'text-link': createCompositeToken('var(--color-primary-600)', {
    description: 'Link text color',
    references: ['color-primary-600']
  }),
  
  // Border colors
  'border-default': createCompositeToken('var(--color-neutral-300)', {
    description: 'Default border color',
    references: ['color-neutral-300']
  }),
  'border-strong': createCompositeToken('var(--color-neutral-500)', {
    description: 'Strong border color',
    references: ['color-neutral-500']
  }),
  'border-subtle': createCompositeToken('var(--color-neutral-200)', {
    description: 'Subtle border color',
    references: ['color-neutral-200']
  }),
  
  // Status colors
  'status-success': createCompositeToken('var(--color-success-600)', {
    description: 'Success status color',
    references: ['color-success-600']
  }),
  'status-warning': createCompositeToken('var(--color-warning-600)', {
    description: 'Warning status color',
    references: ['color-warning-600']
  }),
  'status-error': createCompositeToken('var(--color-error-600)', {
    description: 'Error status color',
    references: ['color-error-600']
  }),
  'status-info': createCompositeToken('var(--color-info-600)', {
    description: 'Info status color',
    references: ['color-info-600']
  })
};

/**
 * Composite Spacing Tokens
 * Spacing values composed from primitive spacing tokens
 */
export const compositeSpacing = {
  // Component spacing
  'component-padding-sm': createCompositeToken('var(--spacing-2) var(--spacing-3)', {
    description: 'Small component padding',
    references: ['spacing-2', 'spacing-3']
  }),
  'component-padding-md': createCompositeToken('var(--spacing-3) var(--spacing-4)', {
    description: 'Medium component padding',
    references: ['spacing-3', 'spacing-4']
  }),
  'component-padding-lg': createCompositeToken('var(--spacing-4) var(--spacing-6)', {
    description: 'Large component padding',
    references: ['spacing-4', 'spacing-6']
  }),
  
  // Layout spacing
  'layout-gap-sm': createCompositeToken('var(--spacing-2)', {
    description: 'Small layout gap',
    references: ['spacing-2']
  }),
  'layout-gap-md': createCompositeToken('var(--spacing-4)', {
    description: 'Medium layout gap',
    references: ['spacing-4']
  }),
  'layout-gap-lg': createCompositeToken('var(--spacing-6)', {
    description: 'Large layout gap',
    references: ['spacing-6']
  }),
  'layout-gap-xl': createCompositeToken('var(--spacing-8)', {
    description: 'Extra large layout gap',
    references: ['spacing-8']
  }),
  
  // Stack spacing
  'stack-gap-xs': createCompositeToken('var(--spacing-1)', {
    description: 'Extra small stack gap',
    references: ['spacing-1']
  }),
  'stack-gap-sm': createCompositeToken('var(--spacing-2)', {
    description: 'Small stack gap',
    references: ['spacing-2']
  }),
  'stack-gap-md': createCompositeToken('var(--spacing-4)', {
    description: 'Medium stack gap',
    references: ['spacing-4']
  }),
  'stack-gap-lg': createCompositeToken('var(--spacing-6)', {
    description: 'Large stack gap',
    references: ['spacing-6']
  })
};

/**
 * Composite Typography Tokens
 * Typography compositions from primitive font tokens
 */
export const compositeTypography = {
  // Heading styles
  'heading-xl': createCompositeToken('var(--font-size-6) / var(--line-height-tight) var(--font-family-heading)', {
    description: 'Extra large heading',
    references: ['font-size-6', 'line-height-tight', 'font-family-heading'],
    weight: 'var(--font-weight-bold)'
  }),
  'heading-lg': createCompositeToken('var(--font-size-5) / var(--line-height-tight) var(--font-family-heading)', {
    description: 'Large heading',
    references: ['font-size-5', 'line-height-tight', 'font-family-heading'],
    weight: 'var(--font-weight-bold)'
  }),
  'heading-md': createCompositeToken('var(--font-size-4) / var(--line-height-normal) var(--font-family-heading)', {
    description: 'Medium heading',
    references: ['font-size-4', 'line-height-normal', 'font-family-heading'],
    weight: 'var(--font-weight-semibold)'
  }),
  'heading-sm': createCompositeToken('var(--font-size-3) / var(--line-height-normal) var(--font-family-heading)', {
    description: 'Small heading',
    references: ['font-size-3', 'line-height-normal', 'font-family-heading'],
    weight: 'var(--font-weight-semibold)'
  }),
  
  // Body styles
  'body-lg': createCompositeToken('var(--font-size-3) / var(--line-height-relaxed) var(--font-family-body)', {
    description: 'Large body text',
    references: ['font-size-3', 'line-height-relaxed', 'font-family-body'],
    weight: 'var(--font-weight-normal)'
  }),
  'body-md': createCompositeToken('var(--font-size-2) / var(--line-height-normal) var(--font-family-body)', {
    description: 'Medium body text',
    references: ['font-size-2', 'line-height-normal', 'font-family-body'],
    weight: 'var(--font-weight-normal)'
  }),
  'body-sm': createCompositeToken('var(--font-size-1) / var(--line-height-normal) var(--font-family-body)', {
    description: 'Small body text',
    references: ['font-size-1', 'line-height-normal', 'font-family-body'],
    weight: 'var(--font-weight-normal)'
  }),
  
  // Code styles
  'code-inline': createCompositeToken('var(--font-size-2) / var(--line-height-normal) var(--font-family-mono)', {
    description: 'Inline code text',
    references: ['font-size-2', 'line-height-normal', 'font-family-mono']
  }),
  'code-block': createCompositeToken('var(--font-size-1) / var(--line-height-relaxed) var(--font-family-mono)', {
    description: 'Code block text',
    references: ['font-size-1', 'line-height-relaxed', 'font-family-mono']
  })
};

/**
 * Composite Shadow Tokens
 * Shadow compositions for elevation and depth
 */
export const compositeShadows = {
  'elevation-1': createCompositeToken('0 1px 2px 0 rgba(0, 0, 0, 0.05)', {
    description: 'Lowest elevation shadow',
    elevation: 1
  }),
  'elevation-2': createCompositeToken('0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', {
    description: 'Low elevation shadow',
    elevation: 2
  }),
  'elevation-3': createCompositeToken('0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', {
    description: 'Medium elevation shadow',
    elevation: 3
  }),
  'elevation-4': createCompositeToken('0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', {
    description: 'High elevation shadow',
    elevation: 4
  }),
  'elevation-5': createCompositeToken('0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', {
    description: 'Highest elevation shadow',
    elevation: 5
  })
};

/**
 * Composite Border Tokens
 * Border compositions combining width, style, and color
 */
export const compositeBorders = {
  'border-default': createCompositeToken('var(--border-width-1) solid var(--border-default)', {
    description: 'Default border',
    references: ['border-width-1', 'border-default']
  }),
  'border-strong': createCompositeToken('var(--border-width-2) solid var(--border-strong)', {
    description: 'Strong border',
    references: ['border-width-2', 'border-strong']
  }),
  'border-subtle': createCompositeToken('var(--border-width-1) solid var(--border-subtle)', {
    description: 'Subtle border',
    references: ['border-width-1', 'border-subtle']
  }),
  'border-focus': createCompositeToken('var(--border-width-2) solid var(--interactive-primary)', {
    description: 'Focus border',
    references: ['border-width-2', 'interactive-primary']
  }),
  'border-error': createCompositeToken('var(--border-width-1) solid var(--status-error)', {
    description: 'Error border',
    references: ['border-width-1', 'status-error']
  })
};

/**
 * Composite Transition Tokens
 * Transition compositions for consistent animations
 */
export const compositeTransitions = {
  'transition-fast': createCompositeToken('all var(--duration-fast) var(--easing-standard)', {
    description: 'Fast transition',
    references: ['duration-fast', 'easing-standard']
  }),
  'transition-normal': createCompositeToken('all var(--duration-normal) var(--easing-standard)', {
    description: 'Normal transition',
    references: ['duration-normal', 'easing-standard']
  }),
  'transition-slow': createCompositeToken('all var(--duration-slow) var(--easing-standard)', {
    description: 'Slow transition',
    references: ['duration-slow', 'easing-standard']
  }),
  'transition-color': createCompositeToken('color var(--duration-fast) var(--easing-standard), background-color var(--duration-fast) var(--easing-standard)', {
    description: 'Color transition',
    references: ['duration-fast', 'easing-standard']
  }),
  'transition-transform': createCompositeToken('transform var(--duration-normal) var(--easing-emphasized)', {
    description: 'Transform transition',
    references: ['duration-normal', 'easing-emphasized']
  })
};

/**
 * Generates CSS custom properties for all composite tokens
 * @returns {string} CSS custom properties
 */
export function generateCompositeTokensCSS() {
  const sections = [
    { name: 'Colors', tokens: compositeColors },
    { name: 'Spacing', tokens: compositeSpacing },
    { name: 'Typography', tokens: compositeTypography },
    { name: 'Shadows', tokens: compositeShadows },
    { name: 'Borders', tokens: compositeBorders },
    { name: 'Transitions', tokens: compositeTransitions }
  ];

  let css = ':root {\n';
  css += '  /* Composite Tokens - Reference other tokens for complex compositions */\n\n';

  for (const section of sections) {
    css += `  /* ${section.name} */\n`;
    for (const [key, token] of Object.entries(section.tokens)) {
      css += `  --${key}: ${token.value};\n`;
    }
    css += '\n';
  }

  css += '}\n';
  return css;
}

/**
 * Validates that all token references exist in the document
 * @param {Document} doc - Document to validate against
 * @returns {Array<Object>} Array of validation errors
 */
export function validateCompositeTokens(doc = document) {
  const errors = [];
  const computedStyle = getComputedStyle(doc.documentElement);
  
  const allTokens = {
    ...compositeColors,
    ...compositeSpacing,
    ...compositeTypography,
    ...compositeShadows,
    ...compositeBorders,
    ...compositeTransitions
  };

  for (const [tokenName, token] of Object.entries(allTokens)) {
    if (token.references) {
      for (const ref of token.references) {
        const value = computedStyle.getPropertyValue(`--${ref}`).trim();
        if (!value) {
          errors.push({
            token: tokenName,
            missingReference: ref,
            message: `Composite token "${tokenName}" references missing token "${ref}"`
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Gets all composite tokens organized by category
 * @returns {Object} Composite tokens by category
 */
export function getCompositeTokens() {
  return {
    colors: compositeColors,
    spacing: compositeSpacing,
    typography: compositeTypography,
    shadows: compositeShadows,
    borders: compositeBorders,
    transitions: compositeTransitions
  };
}

/**
 * Gets a specific composite token by name
 * @param {string} tokenName - Name of the token (without -- prefix)
 * @returns {Object|null} Token object or null if not found
 */
export function getCompositeToken(tokenName) {
  const allTokens = {
    ...compositeColors,
    ...compositeSpacing,
    ...compositeTypography,
    ...compositeShadows,
    ...compositeBorders,
    ...compositeTransitions
  };
  
  return allTokens[tokenName] || null;
}