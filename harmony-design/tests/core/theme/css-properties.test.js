/**
 * @fileoverview Tests for CSS Custom Properties Generator
 * 
 * @module harmony-design/tests/core/theme/css-properties
 */

import {
  generateCSSProperties,
  injectCSSProperties,
  getCSSProperty,
  setCSSProperty,
  removeCSSProperties,
  createCSSPropertyMap
} from '../../../src/core/theme/css-properties.js';

/**
 * Test tokens for validation
 */
const testTokens = {
  color: {
    primary: {
      base: '#007bff',
      hover: '#0056b3'
    },
    text: '#212529'
  },
  spacing: {
    small: '8px',
    medium: '16px'
  }
};

/**
 * Test suite for CSS properties generation
 */
export function runCSSPropertiesTests() {
  console.group('CSS Properties Tests');

  testGenerateCSSProperties();
  testInjectCSSProperties();
  testGetSetCSSProperty();
  testRemoveCSSProperties();
  testCreateCSSPropertyMap();

  console.groupEnd();
}

function testGenerateCSSProperties() {
  console.log('Testing generateCSSProperties...');

  const css = generateCSSProperties(testTokens);

  // Verify all tokens are converted
  const assertions = [
    css.includes('--color-primary-base: #007bff'),
    css.includes('--color-primary-hover: #0056b3'),
    css.includes('--color-text: #212529'),
    css.includes('--spacing-small: 8px'),
    css.includes('--spacing-medium: 16px')
  ];

  const passed = assertions.every(a => a);
  console.log(passed ? '✓ Generate CSS properties' : '✗ Generate CSS properties FAILED');

  if (!passed) {
    console.error('Generated CSS:', css);
  }
}

function testInjectCSSProperties() {
  console.log('Testing injectCSSProperties...');

  const styleElement = injectCSSProperties(testTokens, ':root');

  const assertions = [
    styleElement instanceof HTMLStyleElement,
    styleElement.id === 'harmony-theme-root',
    document.head.contains(styleElement),
    styleElement.textContent.includes('--color-primary-base')
  ];

  const passed = assertions.every(a => a);
  console.log(passed ? '✓ Inject CSS properties' : '✗ Inject CSS properties FAILED');

  // Cleanup
  styleElement.remove();
}

function testGetSetCSSProperty() {
  console.log('Testing getCSSProperty and setCSSProperty...');

  // Inject properties first
  const styleElement = injectCSSProperties(testTokens, ':root');

  // Test get with CSS var name
  const value1 = getCSSProperty('--color-primary-base');
  
  // Test get with token key
  const value2 = getCSSProperty('color.primary.base');

  // Test set
  setCSSProperty('--test-property', '#ff0000');
  const value3 = getCSSProperty('--test-property');

  const assertions = [
    value1 === '#007bff',
    value2 === '#007bff',
    value3 === '#ff0000'
  ];

  const passed = assertions.every(a => a);
  console.log(passed ? '✓ Get/Set CSS properties' : '✗ Get/Set CSS properties FAILED');

  if (!passed) {
    console.error('Values:', { value1, value2, value3 });
  }

  // Cleanup
  styleElement.remove();
}

function testRemoveCSSProperties() {
  console.log('Testing removeCSSProperties...');

  // Inject then remove
  injectCSSProperties(testTokens, ':root');
  const beforeRemove = document.getElementById('harmony-theme-root');
  
  removeCSSProperties(':root');
  const afterRemove = document.getElementById('harmony-theme-root');

  const assertions = [
    beforeRemove !== null,
    afterRemove === null
  ];

  const passed = assertions.every(a => a);
  console.log(passed ? '✓ Remove CSS properties' : '✗ Remove CSS properties FAILED');
}

function testCreateCSSPropertyMap() {
  console.log('Testing createCSSPropertyMap...');

  const map = createCSSPropertyMap(testTokens);

  const assertions = [
    map instanceof Map,
    map.size === 5,
    map.get('--color-primary-base') === '#007bff',
    map.get('--spacing-medium') === '16px',
    map.has('--color-text')
  ];

  const passed = assertions.every(a => a);
  console.log(passed ? '✓ Create CSS property map' : '✗ Create CSS property map FAILED');

  if (!passed) {
    console.error('Map entries:', Array.from(map.entries()));
  }
}

// Auto-run tests if this module is loaded directly
if (import.meta.url === `${window.location.origin}${window.location.pathname}`) {
  runCSSPropertiesTests();
}