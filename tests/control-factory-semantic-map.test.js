/**
 * @fileoverview Tests for Control Factory Semantic Type Mapper
 * @module tests/control-factory-semantic-map
 */

import {
  SEMANTIC_TYPE_MAP,
  getComponentForSemanticType,
  hasSemanticType,
  getAllSemanticTypes,
  getAllComponentTags,
  registerSemanticType,
  createControlForSemanticType,
  validateComponentRegistration,
  getMapStatistics
} from '../harmony-web-components/control-factory-semantic-map.js';

/**
 * Test suite for semantic type mapping
 */
export function runSemanticMapTests() {
  console.group('Control Factory Semantic Map Tests');
  
  testBasicMapping();
  testCaseInsensitivity();
  testUnknownTypes();
  testCustomRegistration();
  testElementCreation();
  testValidation();
  testStatistics();
  
  console.groupEnd();
}

function testBasicMapping() {
  console.group('Basic Mapping');
  
  const tests = [
    { type: 'gain', expected: 'harmony-knob' },
    { type: 'frequency', expected: 'harmony-slider' },
    { type: 'toggle', expected: 'harmony-toggle' },
    { type: 'select', expected: 'harmony-select' },
    { type: 'xy', expected: 'harmony-xy-pad' },
  ];
  
  tests.forEach(({ type, expected }) => {
    const result = getComponentForSemanticType(type);
    console.assert(
      result === expected,
      `Expected ${type} -> ${expected}, got ${result}`
    );
  });
  
  console.log('✓ Basic mapping tests passed');
  console.groupEnd();
}

function testCaseInsensitivity() {
  console.group('Case Insensitivity');
  
  const tests = ['gain', 'GAIN', 'Gain', 'gAiN'];
  const expected = 'harmony-knob';
  
  tests.forEach(type => {
    const result = getComponentForSemanticType(type);
    console.assert(
      result === expected,
      `Expected ${type} -> ${expected}, got ${result}`
    );
  });
  
  console.log('✓ Case insensitivity tests passed');
  console.groupEnd();
}

function testUnknownTypes() {
  console.group('Unknown Types');
  
  const unknownType = 'this-type-does-not-exist';
  const result = getComponentForSemanticType(unknownType);
  const defaultComponent = SEMANTIC_TYPE_MAP.get('default');
  
  console.assert(
    result === defaultComponent,
    `Expected default component for unknown type, got ${result}`
  );
  
  console.assert(
    !hasSemanticType(unknownType),
    'hasSemanticType should return false for unknown types'
  );
  
  console.log('✓ Unknown type handling tests passed');
  console.groupEnd();
}

function testCustomRegistration() {
  console.group('Custom Registration');
  
  const customType = 'custom-test-param';
  const customTag = 'harmony-custom-control';
  
  registerSemanticType(customType, customTag);
  
  console.assert(
    hasSemanticType(customType),
    'Registered type should be available'
  );
  
  console.assert(
    getComponentForSemanticType(customType) === customTag,
    'Registered type should map to correct component'
  );
  
  console.log('✓ Custom registration tests passed');
  console.groupEnd();
}

function testElementCreation() {
  console.group('Element Creation');
  
  const element = createControlForSemanticType('gain', {
    min: '0',
    max: '1',
    value: '0.5',
    label: 'Test Gain'
  });
  
  console.assert(
    element.tagName.toLowerCase() === 'harmony-knob',
    'Created element should have correct tag name'
  );
  
  console.assert(
    element.getAttribute('min') === '0',
    'Attributes should be set correctly'
  );
  
  console.assert(
    element.getAttribute('label') === 'Test Gain',
    'Label attribute should be set'
  );
  
  console.log('✓ Element creation tests passed');
  console.groupEnd();
}

function testValidation() {
  console.group('Component Registration Validation');
  
  const validation = validateComponentRegistration();
  
  console.assert(
    typeof validation.valid === 'boolean',
    'Validation should return valid flag'
  );
  
  console.assert(
    Array.isArray(validation.missing),
    'Validation should return missing array'
  );
  
  console.log('Validation result:', validation);
  console.log('✓ Validation tests passed');
  console.groupEnd();
}

function testStatistics() {
  console.group('Statistics');
  
  const stats = getMapStatistics();
  
  console.assert(
    typeof stats.totalTypes === 'number',
    'Should return total types count'
  );
  
  console.assert(
    typeof stats.uniqueComponents === 'number',
    'Should return unique components count'
  );
  
  console.assert(
    typeof stats.componentUsage === 'object',
    'Should return component usage map'
  );
  
  console.log('Statistics:', stats);
  console.log('✓ Statistics tests passed');
  console.groupEnd();
}

// Auto-run tests if loaded directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSemanticMapTests();
}