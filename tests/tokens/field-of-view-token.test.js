/**
 * Field-of-View Token Tests
 * 
 * Tests for field-of-view token validation, conversion, and calculation utilities.
 * 
 * @module tests/tokens/field-of-view-token
 */

import {
  isValidFieldOfViewToken,
  extractFOVDegrees,
  verticalToHorizontalFOV,
  horizontalToVerticalFOV,
  calculateComplementaryFOV,
  createFOVToken,
  createDetailedFOVToken,
  calculateProjectionParams,
} from '../../tokens/field-of-view-utils.js';

/**
 * Test suite for field-of-view token validation
 */
export function testFieldOfViewValidation() {
  console.group('Field-of-View Token Validation Tests');

  // Valid simple token
  const simpleToken = {
    $type: 'fieldOfView',
    value: 60,
  };
  console.assert(
    isValidFieldOfViewToken(simpleToken),
    'Should validate simple FOV token'
  );

  // Valid detailed token
  const detailedToken = {
    $type: 'fieldOfView',
    value: {
      degrees: 75,
      orientation: 'vertical',
      aspectRatio: 1.777777,
    },
  };
  console.assert(
    isValidFieldOfViewToken(detailedToken),
    'Should validate detailed FOV token'
  );

  // Valid reference token
  const referenceToken = {
    $type: 'fieldOfView',
    value: '{camera.fov.standard}',
  };
  console.assert(
    isValidFieldOfViewToken(referenceToken),
    'Should validate reference token'
  );

  // Invalid: FOV out of range
  const invalidRange = {
    $type: 'fieldOfView',
    value: 200,
  };
  console.assert(
    !isValidFieldOfViewToken(invalidRange),
    'Should reject FOV >= 180 degrees'
  );

  // Invalid: negative FOV
  const negativeToken = {
    $type: 'fieldOfView',
    value: -10,
  };
  console.assert(
    !isValidFieldOfViewToken(negativeToken),
    'Should reject negative FOV'
  );

  // Invalid: wrong type
  const wrongType = {
    $type: 'dimension',
    value: 60,
  };
  console.assert(
    !isValidFieldOfViewToken(wrongType),
    'Should reject wrong $type'
  );

  console.groupEnd();
}

/**
 * Test suite for FOV extraction
 */
export function testFOVExtraction() {
  console.group('FOV Extraction Tests');

  const simpleToken = createFOVToken(60);
  const degrees = extractFOVDegrees(simpleToken);
  console.assert(degrees === 60, 'Should extract degrees from simple token');

  const detailedToken = createDetailedFOVToken(75, 'vertical', 1.777777);
  const detailedDegrees = extractFOVDegrees(detailedToken);
  console.assert(detailedDegrees === 75, 'Should extract degrees from detailed token');

  const referenceToken = {
    $type: 'fieldOfView',
    value: '{camera.fov.standard}',
  };

  try {
    extractFOVDegrees(referenceToken);
    console.assert(false, 'Should throw on reference token');
  } catch (e) {
    console.assert(
      e.message.includes('reference'),
      'Should throw reference error'
    );
  }

  console.groupEnd();
}

/**
 * Test suite for FOV conversions
 */
export function testFOVConversions() {
  console.group('FOV Conversion Tests');

  // 16:9 aspect ratio
  const aspectRatio = 16 / 9;
  const verticalFOV = 60;

  const horizontal = verticalToHorizontalFOV(verticalFOV, aspectRatio);
  console.assert(
    horizontal > verticalFOV,
    'Horizontal FOV should be larger for widescreen'
  );
  console.assert(
    Math.abs(horizontal - 90.0) < 5,
    'Should calculate reasonable horizontal FOV'
  );

  // Round-trip conversion
  const backToVertical = horizontalToVerticalFOV(horizontal, aspectRatio);
  console.assert(
    Math.abs(backToVertical - verticalFOV) < 0.01,
    'Round-trip conversion should preserve value'
  );

  console.groupEnd();
}

/**
 * Test suite for complementary FOV calculation
 */
export function testComplementaryFOV() {
  console.group('Complementary FOV Tests');

  const simpleToken = createFOVToken(60);
  const simple = calculateComplementaryFOV(simpleToken);
  console.assert(simple.vertical === 60, 'Should return vertical FOV');
  console.assert(simple.horizontal === null, 'Should not calculate horizontal without aspect ratio');

  const detailedToken = createDetailedFOVToken(60, 'vertical', 16 / 9);
  const detailed = calculateComplementaryFOV(detailedToken);
  console.assert(detailed.vertical === 60, 'Should preserve vertical FOV');
  console.assert(detailed.horizontal !== null, 'Should calculate horizontal FOV');
  console.assert(detailed.horizontal > 60, 'Horizontal should be wider');

  const horizontalToken = createDetailedFOVToken(90, 'horizontal', 16 / 9);
  const fromHorizontal = calculateComplementaryFOV(horizontalToken);
  console.assert(fromHorizontal.horizontal === 90, 'Should preserve horizontal FOV');
  console.assert(fromHorizontal.vertical !== null, 'Should calculate vertical FOV');
  console.assert(fromHorizontal.vertical < 90, 'Vertical should be narrower');

  console.groupEnd();
}

/**
 * Test suite for token creation
 */
export function testTokenCreation() {
  console.group('Token Creation Tests');

  const simple = createFOVToken(60, 'Standard FOV');
  console.assert(simple.$type === 'fieldOfView', 'Should set correct type');
  console.assert(simple.value === 60, 'Should set correct value');
  console.assert(simple.description === 'Standard FOV', 'Should set description');

  const detailed = createDetailedFOVToken(75, 'vertical', 1.777777, 'Wide FOV');
  console.assert(detailed.value.degrees === 75, 'Should set degrees');
  console.assert(detailed.value.orientation === 'vertical', 'Should set orientation');
  console.assert(detailed.value.aspectRatio === 1.777777, 'Should set aspect ratio');

  try {
    createFOVToken(200);
    console.assert(false, 'Should reject FOV >= 180');
  } catch (e) {
    console.assert(true, 'Should throw on invalid FOV');
  }

  try {
    createDetailedFOVToken(60, 'invalid', 1.777777);
    console.assert(false, 'Should reject invalid orientation');
  } catch (e) {
    console.assert(true, 'Should throw on invalid orientation');
  }

  console.groupEnd();
}

/**
 * Test suite for projection parameters
 */
export function testProjectionParams() {
  console.group('Projection Parameters Tests');

  const token = createFOVToken(60);
  const params = calculateProjectionParams(token, 0.1, 1000);

  console.assert(params.fov === 60, 'Should preserve FOV');
  console.assert(params.near === 0.1, 'Should preserve near plane');
  console.assert(params.far === 1000, 'Should preserve far plane');
  console.assert(params.range === 999.9, 'Should calculate range');
  console.assert(params.f > 0, 'Should calculate f parameter');
  console.assert(params.fovRadians > 0, 'Should convert to radians');

  console.groupEnd();
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('Running Field-of-View Token Tests...');
  testFieldOfViewValidation();
  testFOVExtraction();
  testFOVConversions();
  testComplementaryFOV();
  testTokenCreation();
  testProjectionParams();
  console.log('All Field-of-View Token Tests Complete');
}

// Auto-run if loaded directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}