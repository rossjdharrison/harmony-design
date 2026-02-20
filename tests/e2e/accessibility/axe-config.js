/**
 * @fileoverview Axe-core configuration for accessibility testing
 * @module tests/e2e/accessibility/axe-config
 * 
 * Configures axe-core for automated WCAG 2.1 AA compliance testing.
 * Used by E2E tests to validate component accessibility.
 * 
 * @see {@link https://github.com/dequelabs/axe-core|Axe-core Documentation}
 * @see DESIGN_SYSTEM.md#accessibility-testing
 */

/**
 * Standard axe-core configuration for Harmony Design System
 * Enforces WCAG 2.1 Level AA compliance
 * 
 * @type {Object}
 */
export const axeConfig = {
  // Run all WCAG 2.1 Level A and AA rules
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
  },
  
  // Rules to enable
  rules: {
    // Color contrast (WCAG 2.1 AA requires 4.5:1 for normal text, 3:1 for large)
    'color-contrast': { enabled: true },
    
    // Keyboard accessibility
    'keyboard': { enabled: true },
    'focus-order-semantics': { enabled: true },
    
    // Screen reader support
    'label': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    
    // Semantic HTML
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'image-alt': { enabled: true },
    
    // Form accessibility
    'label-title-only': { enabled: true },
    'form-field-multiple-labels': { enabled: true }
  },
  
  // Reporter configuration
  reporter: 'v2',
  
  // Performance: run checks in batches
  performanceTimer: true
};

/**
 * Strict configuration for critical components
 * No violations allowed
 * 
 * @type {Object}
 */
export const axeStrictConfig = {
  ...axeConfig,
  rules: {
    ...axeConfig.rules,
    // Fail on any violation
    'color-contrast': { enabled: true },
    'aria-required-attr': { enabled: true }
  }
};

/**
 * Configuration for components in development
 * Allows some warnings but fails on serious violations
 * 
 * @type {Object}
 */
export const axeDevConfig = {
  ...axeConfig,
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa']
  }
};

/**
 * Rules to disable for specific component types
 * Use sparingly and document reasons
 * 
 * @type {Object<string, string[]>}
 */
export const componentExceptions = {
  // Canvas-based visualizers don't need traditional accessibility
  'audio-visualizer': ['color-contrast', 'label'],
  
  // Custom controls may have non-standard patterns
  'custom-slider': ['aria-required-attr']
};

/**
 * Get configuration for a specific component type
 * 
 * @param {string} componentType - Component type identifier
 * @param {boolean} strict - Use strict configuration
 * @returns {Object} Axe configuration object
 */
export function getConfigForComponent(componentType, strict = false) {
  const baseConfig = strict ? axeStrictConfig : axeConfig;
  const exceptions = componentExceptions[componentType] || [];
  
  if (exceptions.length === 0) {
    return baseConfig;
  }
  
  // Clone config and disable exception rules
  const config = JSON.parse(JSON.stringify(baseConfig));
  exceptions.forEach(rule => {
    if (config.rules[rule]) {
      config.rules[rule].enabled = false;
    }
  });
  
  return config;
}

/**
 * Severity levels for accessibility violations
 * 
 * @type {Object<string, number>}
 */
export const severityLevels = {
  minor: 1,
  moderate: 2,
  serious: 3,
  critical: 4
};

/**
 * Check if violations exceed acceptable threshold
 * 
 * @param {Array} violations - Axe violations array
 * @param {number} maxSeverity - Maximum acceptable severity level
 * @returns {boolean} True if violations are within threshold
 */
export function checkViolationThreshold(violations, maxSeverity = severityLevels.moderate) {
  return violations.every(v => severityLevels[v.impact] <= maxSeverity);
}