/**
 * Tests for Color Contrast Validation
 * Run with: python -m pytest (via test runner that executes JS tests)
 * 
 * @module utils/color-contrast.test
 */

import {
  hexToRgb,
  rgbToLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  validateColorPair
} from './color-contrast.js';

/**
 * Test suite for color contrast utilities
 */
export function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function assert(condition, message) {
    if (condition) {
      results.passed++;
      results.tests.push({ status: 'PASS', message });
    } else {
      results.failed++;
      results.tests.push({ status: 'FAIL', message });
      console.error(`❌ ${message}`);
    }
  }
  
  // Test hexToRgb
  const rgb1 = hexToRgb('#FFFFFF');
  assert(rgb1.r === 255 && rgb1.g === 255 && rgb1.b === 255, 'hexToRgb converts white correctly');
  
  const rgb2 = hexToRgb('#000000');
  assert(rgb2.r === 0 && rgb2.g === 0 && rgb2.b === 0, 'hexToRgb converts black correctly');
  
  const rgb3 = hexToRgb('#F00');
  assert(rgb3.r === 255 && rgb3.g === 0 && rgb3.b === 0, 'hexToRgb handles short format');
  
  // Test rgbToLuminance
  const lumWhite = rgbToLuminance({ r: 255, g: 255, b: 255 });
  assert(Math.abs(lumWhite - 1.0) < 0.01, 'White has luminance of 1.0');
  
  const lumBlack = rgbToLuminance({ r: 0, g: 0, b: 0 });
  assert(Math.abs(lumBlack - 0.0) < 0.01, 'Black has luminance of 0.0');
  
  // Test getContrastRatio
  const ratioWhiteBlack = getContrastRatio('#FFFFFF', '#000000');
  assert(Math.abs(ratioWhiteBlack - 21.0) < 0.1, 'White/black contrast is 21:1');
  
  const ratioSame = getContrastRatio('#808080', '#808080');
  assert(Math.abs(ratioSame - 1.0) < 0.01, 'Same color has 1:1 contrast');
  
  // Test WCAG AA compliance
  assert(meetsWCAGAA(4.5, false), '4.5:1 passes AA for normal text');
  assert(!meetsWCAGAA(4.4, false), '4.4:1 fails AA for normal text');
  assert(meetsWCAGAA(3.0, true), '3:1 passes AA for large text');
  assert(!meetsWCAGAA(2.9, true), '2.9:1 fails AA for large text');
  
  // Test WCAG AAA compliance
  assert(meetsWCAGAAA(7.0, false), '7:1 passes AAA for normal text');
  assert(!meetsWCAGAAA(6.9, false), '6.9:1 fails AAA for normal text');
  assert(meetsWCAGAAA(4.5, true), '4.5:1 passes AAA for large text');
  
  // Test validateColorPair
  const validation1 = validateColorPair('#FFFFFF', '#000000');
  assert(validation1.passAA && validation1.passAAA, 'White/black passes both AA and AAA');
  assert(validation1.level === 'AAA', 'White/black achieves AAA level');
  
  const validation2 = validateColorPair('#777777', '#FFFFFF');
  assert(validation2.passAA && !validation2.passAAA, 'Gray/white passes AA but not AAA');
  
  const validation3 = validateColorPair('#AAAAAA', '#FFFFFF');
  assert(!validation3.passAA, 'Light gray/white fails AA');
  assert(validation3.level === 'FAIL', 'Failing pair reports FAIL level');
  
  console.log(`\n✅ Tests passed: ${results.passed}`);
  console.log(`❌ Tests failed: ${results.failed}`);
  
  return results;
}