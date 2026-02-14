/**
 * @fileoverview Tests for DesignTokenNode type
 * @module harmony-design/types/__tests__/DesignTokenNode.test
 */

import {
  TokenCategory,
  ColorTokenType,
  SpacingTokenType,
  TypographyTokenType,
  createDesignTokenNode,
  validateDesignTokenNode,
  resolveTokenValue,
  tokenToCSSValue,
  tokenIdToCSSVar,
  createColorToken,
  createSpacingToken,
  createTypographyToken
} from '../DesignTokenNode.js';

/**
 * Simple test runner
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running DesignTokenNode tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✓ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.error(`✗ ${test.name}`);
        console.error(`  ${error.message}`);
      }
    }
    
    console.log(`\nTests: ${this.passed} passed, ${this.failed} failed, ${this.tests.length} total`);
    return this.failed === 0;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Tests
const runner = new TestRunner();

runner.test('createDesignTokenNode creates valid color token', () => {
  const token = createDesignTokenNode({
    id: 'color.primary.500',
    name: 'Primary 500',
    category: TokenCategory.COLOR,
    type: ColorTokenType.PRIMARY,
    value: { hex: '#0066FF' },
    metadata: { description: 'Primary brand color' }
  });
  
  assert(token.id === 'color.primary.500', 'Token ID should match');
  assert(token.category === TokenCategory.COLOR, 'Category should be COLOR');
  assert(token.value.hex === '#0066FF', 'Hex value should match');
  assert(typeof token.createdAt === 'number', 'Should have createdAt timestamp');
  assert(token.version === 1, 'Initial version should be 1');
});

runner.test('createDesignTokenNode creates valid spacing token', () => {
  const token = createDesignTokenNode({
    id: 'spacing.scale.4',
    name: 'Spacing Scale 4',
    category: TokenCategory.SPACING,
    type: SpacingTokenType.SCALE,
    value: { value: 16, unit: 'px', computed: '16px' },
    metadata: { description: 'Base spacing unit' }
  });
  
  assert(token.category === TokenCategory.SPACING, 'Category should be SPACING');
  assert(token.value.value === 16, 'Value should be 16');
  assert(token.value.computed === '16px', 'Computed should be 16px');
});

runner.test('createDesignTokenNode creates valid typography token', () => {
  const token = createDesignTokenNode({
    id: 'typography.heading.h1',
    name: 'Heading 1',
    category: TokenCategory.TYPOGRAPHY,
    type: TypographyTokenType.TEXT_STYLE,
    value: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: 1.2
    },
    metadata: { description: 'Main heading style' }
  });
  
  assert(token.category === TokenCategory.TYPOGRAPHY, 'Category should be TYPOGRAPHY');
  assert(token.value.fontSize === '32px', 'Font size should match');
  assert(token.value.fontWeight === 700, 'Font weight should match');
});

runner.test('validateDesignTokenNode accepts valid token', () => {
  const token = createColorToken('color.test', 'Test Color', '#FF0000');
  const result = validateDesignTokenNode(token);
  
  assert(result.valid === true, 'Valid token should pass validation');
  assert(result.errors.length === 0, 'Should have no errors');
});

runner.test('validateDesignTokenNode rejects token without id', () => {
  const token = { name: 'Test', category: TokenCategory.COLOR, type: 'test', value: '#FF0000' };
  const result = validateDesignTokenNode(token);
  
  assert(result.valid === false, 'Token without id should fail');
  assert(result.errors.length > 0, 'Should have errors');
});

runner.test('validateDesignTokenNode rejects token with invalid category', () => {
  const token = createDesignTokenNode({
    id: 'test',
    name: 'Test',
    category: 'invalid',
    type: 'test',
    value: 'test',
    metadata: {}
  });
  const result = validateDesignTokenNode(token);
  
  assert(result.valid === false, 'Token with invalid category should fail');
});

runner.test('resolveTokenValue returns direct value for non-referenced token', () => {
  const token = createColorToken('color.primary', 'Primary', '#0066FF');
  const registry = new Map();
  
  const resolved = resolveTokenValue(token, registry);
  assert(resolved.hex === '#0066FF', 'Should return direct value');
});

runner.test('resolveTokenValue resolves reference', () => {
  const baseToken = createColorToken('color.base', 'Base', '#0066FF');
  const aliasToken = createDesignTokenNode({
    id: 'color.alias',
    name: 'Alias',
    category: TokenCategory.COLOR,
    type: ColorTokenType.PRIMARY,
    value: { hex: '#000000' }, // Fallback value
    reference: 'color.base',
    metadata: {}
  });
  
  const registry = new Map([
    ['color.base', baseToken],
    ['color.alias', aliasToken]
  ]);
  
  const resolved = resolveTokenValue(aliasToken, registry);
  assert(resolved.hex === '#0066FF', 'Should resolve to referenced token value');
});

runner.test('tokenToCSSValue converts color token correctly', () => {
  const token = createColorToken('color.primary', 'Primary', '#0066FF');
  const cssValue = tokenToCSSValue(token);
  
  assertEquals(cssValue, '#0066FF', 'Should convert to hex string');
});

runner.test('tokenToCSSValue converts spacing token correctly', () => {
  const token = createSpacingToken('spacing.4', 'Spacing 4', 16, 'px');
  const cssValue = tokenToCSSValue(token);
  
  assertEquals(cssValue, '16px', 'Should convert to computed value');
});

runner.test('tokenIdToCSSVar converts token ID to CSS variable name', () => {
  const cssVar = tokenIdToCSSVar('color.primary.500');
  assertEquals(cssVar, '--color-primary-500', 'Should convert dots to hyphens');
});

runner.test('createColorToken helper creates valid color token', () => {
  const token = createColorToken('color.test', 'Test Color', '#FF5733', {
    description: 'Test description',
    type: ColorTokenType.ACCENT
  });
  
  assert(token.category === TokenCategory.COLOR, 'Should be color category');
  assert(token.type === ColorTokenType.ACCENT, 'Should have specified type');
  assert(token.value.hex === '#FF5733', 'Should have hex value');
  assert(token.metadata.description === 'Test description', 'Should have description');
});

runner.test('createSpacingToken helper creates valid spacing token', () => {
  const token = createSpacingToken('spacing.test', 'Test Spacing', 24, 'px', {
    description: 'Test spacing',
    type: SpacingTokenType.COMPONENT
  });
  
  assert(token.category === TokenCategory.SPACING, 'Should be spacing category');
  assert(token.value.value === 24, 'Should have numeric value');
  assert(token.value.unit === 'px', 'Should have unit');
  assert(token.value.computed === '24px', 'Should have computed value');
});

runner.test('createTypographyToken helper creates valid typography token', () => {
  const token = createTypographyToken('typography.test', 'Test Typography', {
    fontFamily: 'Arial',
    fontSize: '16px',
    fontWeight: 400
  }, {
    description: 'Test typography',
    type: TypographyTokenType.TEXT_STYLE
  });
  
  assert(token.category === TokenCategory.TYPOGRAPHY, 'Should be typography category');
  assert(token.value.fontFamily === 'Arial', 'Should have font family');
  assert(token.value.fontSize === '16px', 'Should have font size');
});

runner.test('color token with alpha channel converts correctly', () => {
  const token = createColorToken('color.overlay', 'Overlay', '#000000', {
    alpha: 0.5
  });
  
  const cssValue = tokenToCSSValue(token);
  assert(cssValue.includes('7f'), 'Should include alpha in hex (7f = 127 ≈ 50%)');
});

// Run tests
runner.run().then(success => {
  if (!success) {
    process.exit(1);
  }
});