/**
 * @fileoverview Tests for EventBus runtime validation
 */

import { 
  validateEvent, 
  registerEventSchema, 
  EventValidationError,
  clearSchemas,
  getRegisteredEventTypes,
  getEventSchema
} from '../src/core/event-bus-validator.js';

/**
 * Test suite for event validation
 */
export function runValidatorTests() {
  console.group('EventBus Validator Tests');

  // Setup
  clearSchemas();

  // Test 1: Register and retrieve schema
  console.log('Test 1: Register and retrieve schema');
  registerEventSchema('test.event', {
    payload: {
      value: { type: 'string', required: true }
    }
  });
  
  const schema = getEventSchema('test.event');
  console.assert(schema !== undefined, 'Schema should be registered');
  console.assert(schema.payload.value.type === 'string', 'Schema should match');
  console.log('✓ Schema registration works');

  // Test 2: Valid event passes validation
  console.log('\nTest 2: Valid event passes validation');
  try {
    validateEvent('test.event', {
      source: 'test-component',
      payload: { value: 'hello' }
    });
    console.log('✓ Valid event passes');
  } catch (err) {
    console.error('✗ Valid event should not throw', err);
  }

  // Test 3: Missing required field fails
  console.log('\nTest 3: Missing required field fails');
  try {
    validateEvent('test.event', {
      source: 'test-component',
      payload: {}
    });
    console.error('✗ Should have thrown for missing field');
  } catch (err) {
    console.assert(err instanceof EventValidationError, 'Should throw EventValidationError');
    console.assert(err.context.field === 'payload.value', 'Should identify missing field');
    console.log('✓ Missing field detected:', err.message);
  }

  // Test 4: Wrong type fails
  console.log('\nTest 4: Wrong type fails');
  registerEventSchema('test.number', {
    payload: {
      count: { type: 'number', required: true }
    }
  });
  
  try {
    validateEvent('test.number', {
      source: 'test-component',
      payload: { count: 'not-a-number' }
    });
    console.error('✗ Should have thrown for wrong type');
  } catch (err) {
    console.assert(err instanceof EventValidationError, 'Should throw EventValidationError');
    console.assert(err.context.expected === 'number', 'Should expect number');
    console.log('✓ Type mismatch detected:', err.message);
  }

  // Test 5: Custom validation
  console.log('\nTest 5: Custom validation');
  registerEventSchema('test.custom', {
    payload: {
      email: {
        type: 'string',
        required: true,
        validate: (v) => v.includes('@') || 'Must be valid email'
      }
    }
  });
  
  try {
    validateEvent('test.custom', {
      source: 'test-component',
      payload: { email: 'invalid' }
    });
    console.error('✗ Should have thrown for invalid email');
  } catch (err) {
    console.assert(err instanceof EventValidationError, 'Should throw EventValidationError');
    console.assert(err.message.includes('custom validation'), 'Should mention custom validation');
    console.log('✓ Custom validation works:', err.message);
  }

  // Test 6: Optional fields
  console.log('\nTest 6: Optional fields');
  registerEventSchema('test.optional', {
    payload: {
      required: { type: 'string', required: true },
      optional: { type: 'string', required: false }
    }
  });
  
  try {
    validateEvent('test.optional', {
      source: 'test-component',
      payload: { required: 'present' }
    });
    console.log('✓ Optional field can be omitted');
  } catch (err) {
    console.error('✗ Should allow optional fields', err);
  }

  // Test 7: Missing source when required
  console.log('\nTest 7: Missing source when required');
  registerEventSchema('test.source', {
    requiresSource: true,
    payload: {}
  });
  
  try {
    validateEvent('test.source', { payload: {} });
    console.error('✗ Should have thrown for missing source');
  } catch (err) {
    console.assert(err instanceof EventValidationError, 'Should throw EventValidationError');
    console.assert(err.message.includes('source'), 'Should mention source');
    console.log('✓ Missing source detected:', err.message);
  }

  // Test 8: Detailed error message
  console.log('\nTest 8: Detailed error message');
  try {
    validateEvent('test.event', {
      source: 'my-component',
      payload: { value: 123 }
    });
  } catch (err) {
    const detailed = err.getDetailedMessage();
    console.assert(detailed.includes('test.event'), 'Should include event type');
    console.assert(detailed.includes('my-component'), 'Should include source');
    console.assert(detailed.includes('payload.value'), 'Should include field');
    console.log('✓ Detailed error message:', detailed);
  }

  // Test 9: Get registered event types
  console.log('\nTest 9: Get registered event types');
  const types = getRegisteredEventTypes();
  console.assert(types.length > 0, 'Should have registered types');
  console.assert(types.includes('test.event'), 'Should include test.event');
  console.log('✓ Registered types:', types);

  // Test 10: Unregistered event type (warning only)
  console.log('\nTest 10: Unregistered event type');
  try {
    validateEvent('unregistered.event', {
      source: 'test',
      payload: { anything: true }
    });
    console.log('✓ Unregistered events allowed (with warning)');
  } catch (err) {
    console.error('✗ Should not throw for unregistered events', err);
  }

  console.groupEnd();
  console.log('\n✓ All validator tests completed');
}

// Run tests if executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test=validator')) {
  runValidatorTests();
}