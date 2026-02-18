/**
 * @fileoverview Tests for Line Height Tokens
 * @module tests/tokens/line-height.test
 */

import { LINE_HEIGHT, getLineHeight, applyLineHeight } from '../../tokens/line-height.js';

/**
 * Test suite for line height tokens
 */
export function runLineHeightTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  /**
   * Assert helper
   */
  function assert(condition, testName, expected, actual) {
    if (condition) {
      results.passed++;
      results.tests.push({ name: testName, status: 'PASS' });
      console.log(`✓ ${testName}`);
    } else {
      results.failed++;
      results.tests.push({ 
        name: testName, 
        status: 'FAIL',
        expected,
        actual
      });
      console.error(`✗ ${testName}`);
      console.error(`  Expected: ${expected}, Got: ${actual}`);
    }
  }

  console.log('Running Line Height Token Tests...\n');

  // Test 1: LINE_HEIGHT object exists
  assert(
    typeof LINE_HEIGHT === 'object',
    'LINE_HEIGHT object exists',
    'object',
    typeof LINE_HEIGHT
  );

  // Test 2: tight value is correct
  assert(
    LINE_HEIGHT.tight === 1.2,
    'LINE_HEIGHT.tight equals 1.2',
    1.2,
    LINE_HEIGHT.tight
  );

  // Test 3: normal value is correct
  assert(
    LINE_HEIGHT.normal === 1.5,
    'LINE_HEIGHT.normal equals 1.5',
    1.5,
    LINE_HEIGHT.normal
  );

  // Test 4: relaxed value is correct
  assert(
    LINE_HEIGHT.relaxed === 1.75,
    'LINE_HEIGHT.relaxed equals 1.75',
    1.75,
    LINE_HEIGHT.relaxed
  );

  // Test 5: getLineHeight returns correct value for 'tight'
  assert(
    getLineHeight('tight') === 1.2,
    'getLineHeight("tight") returns 1.2',
    1.2,
    getLineHeight('tight')
  );

  // Test 6: getLineHeight returns correct value for 'normal'
  assert(
    getLineHeight('normal') === 1.5,
    'getLineHeight("normal") returns 1.5',
    1.5,
    getLineHeight('normal')
  );

  // Test 7: getLineHeight returns correct value for 'relaxed'
  assert(
    getLineHeight('relaxed') === 1.75,
    'getLineHeight("relaxed") returns 1.75',
    1.75,
    getLineHeight('relaxed')
  );

  // Test 8: getLineHeight returns null for invalid name
  assert(
    getLineHeight('invalid') === null,
    'getLineHeight("invalid") returns null',
    null,
    getLineHeight('invalid')
  );

  // Test 9: applyLineHeight sets style correctly
  const testElement = document.createElement('div');
  applyLineHeight(testElement, 'tight');
  assert(
    testElement.style.lineHeight === '1.2',
    'applyLineHeight sets lineHeight style',
    '1.2',
    testElement.style.lineHeight
  );

  // Test 10: applyLineHeight handles invalid name gracefully
  const testElement2 = document.createElement('div');
  testElement2.style.lineHeight = '1.5';
  applyLineHeight(testElement2, 'invalid');
  assert(
    testElement2.style.lineHeight === '1.5',
    'applyLineHeight does not modify style for invalid name',
    '1.5',
    testElement2.style.lineHeight
  );

  // Test 11: LINE_HEIGHT object is frozen
  let isFrozen = false;
  try {
    LINE_HEIGHT.newValue = 2.0;
    isFrozen = LINE_HEIGHT.newValue === undefined;
  } catch (e) {
    isFrozen = true;
  }
  assert(
    isFrozen,
    'LINE_HEIGHT object is frozen (immutable)',
    true,
    isFrozen
  );

  // Test 12: All values are numbers
  const allNumbers = Object.values(LINE_HEIGHT).every(v => typeof v === 'number');
  assert(
    allNumbers,
    'All LINE_HEIGHT values are numbers',
    true,
    allNumbers
  );

  // Test 13: Values are in ascending order
  const inOrder = LINE_HEIGHT.tight < LINE_HEIGHT.normal && 
                  LINE_HEIGHT.normal < LINE_HEIGHT.relaxed;
  assert(
    inOrder,
    'Line height values are in ascending order',
    true,
    inOrder
  );

  console.log('\n' + '='.repeat(50));
  console.log(`Tests Passed: ${results.passed}`);
  console.log(`Tests Failed: ${results.failed}`);
  console.log('='.repeat(50));

  return results;
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  runLineHeightTests();
}