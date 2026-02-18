/**
 * @fileoverview Tests for ComponentNode type definitions
 */

import {
  createComponentNode,
  validateComponentNode,
  serializeComponentNode,
  createProp,
  createSlot,
  createEvent,
} from './component-node.js';

/**
 * Simple test runner
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 */
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

/**
 * Simple assertion
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test: createComponentNode with minimal config
test('createComponentNode creates minimal component', () => {
  const node = createComponentNode({
    metadata: { name: 'test-component' }
  });
  
  assert(node.metadata.name === 'test-component', 'Name should match');
  assert(node.props.length === 0, 'Props should be empty');
  assert(node.slots.length === 0, 'Slots should be empty');
  assert(node.events.length === 0, 'Events should be empty');
  assert(node.useShadowDOM === true, 'Should use shadow DOM by default');
  assert(typeof node.render === 'function', 'Render should be a function');
});

// Test: createComponentNode with full config
test('createComponentNode creates full component', () => {
  const node = createComponentNode({
    metadata: {
      name: 'full-component',
      version: '2.0.0',
      description: 'A full component',
      category: 'molecule',
      tags: ['test', 'example'],
    },
    props: [
      createProp('label', 'string', { required: true }),
      createProp('count', 'number', { defaultValue: 0 }),
    ],
    slots: [
      createSlot('default'),
      createSlot('header', { required: true }),
    ],
    events: [
      createEvent('click'),
      createEvent('change', { detail: { value: 'string' } }),
    ],
    lifecycle: {
      onConnect: () => console.log('Connected'),
      onDisconnect: () => console.log('Disconnected'),
    },
    render: () => '<div>Test</div>',
  });
  
  assert(node.metadata.name === 'full-component', 'Name should match');
  assert(node.metadata.version === '2.0.0', 'Version should match');
  assert(node.props.length === 2, 'Should have 2 props');
  assert(node.slots.length === 2, 'Should have 2 slots');
  assert(node.events.length === 2, 'Should have 2 events');
  assert(typeof node.lifecycle.onConnect === 'function', 'Lifecycle hook should exist');
});

// Test: validateComponentNode with valid component
test('validateComponentNode accepts valid component', () => {
  const node = createComponentNode({
    metadata: { name: 'valid-component' },
    props: [createProp('title', 'string')],
    render: () => '<div></div>',
  });
  
  const result = validateComponentNode(node);
  assert(result.valid === true, 'Should be valid');
  assert(result.errors.length === 0, 'Should have no errors');
});

// Test: validateComponentNode catches missing hyphen
test('validateComponentNode catches missing hyphen in name', () => {
  const node = createComponentNode({
    metadata: { name: 'invalidname' },
  });
  
  const result = validateComponentNode(node);
  assert(result.valid === false, 'Should be invalid');
  assert(result.errors.some(e => e.includes('hyphen')), 'Should mention hyphen requirement');
});

// Test: validateComponentNode catches invalid prop type
test('validateComponentNode catches invalid prop type', () => {
  const node = createComponentNode({
    metadata: { name: 'test-component' },
    props: [{ name: 'badProp', type: 'invalid' }],
  });
  
  const result = validateComponentNode(node);
  assert(result.valid === false, 'Should be invalid');
  assert(result.errors.some(e => e.includes('invalid type')), 'Should mention invalid type');
});

// Test: validateComponentNode catches duplicate slot names
test('validateComponentNode catches duplicate slot names', () => {
  const node = createComponentNode({
    metadata: { name: 'test-component' },
    slots: [
      createSlot('header'),
      createSlot('header'),
    ],
  });
  
  const result = validateComponentNode(node);
  assert(result.valid === false, 'Should be invalid');
  assert(result.errors.some(e => e.includes('Duplicate slot')), 'Should mention duplicate slot');
});

// Test: serializeComponentNode
test('serializeComponentNode creates serializable object', () => {
  const node = createComponentNode({
    metadata: { name: 'serialize-test' },
    props: [createProp('value', 'string', { defaultValue: 'test' })],
    slots: [createSlot('default')],
    events: [createEvent('change')],
  });
  
  const serialized = serializeComponentNode(node);
  const json = JSON.stringify(serialized);
  const parsed = JSON.parse(json);
  
  assert(parsed.metadata.name === 'serialize-test', 'Metadata should be preserved');
  assert(parsed.props.length === 1, 'Props should be preserved');
  assert(parsed.slots.length === 1, 'Slots should be preserved');
  assert(parsed.events.length === 1, 'Events should be preserved');
});

// Test: createProp helper
test('createProp creates valid prop definition', () => {
  const prop = createProp('title', 'string', {
    required: true,
    defaultValue: 'Default Title',
    reactive: true,
  });
  
  assert(prop.name === 'title', 'Name should match');
  assert(prop.type === 'string', 'Type should match');
  assert(prop.required === true, 'Required should match');
  assert(prop.defaultValue === 'Default Title', 'Default value should match');
  assert(prop.reactive === true, 'Reactive should match');
});

// Test: createSlot helper
test('createSlot creates valid slot definition', () => {
  const slot = createSlot('header', {
    description: 'Header content',
    required: true,
    fallback: '<div>Default header</div>',
  });
  
  assert(slot.name === 'header', 'Name should match');
  assert(slot.description === 'Header content', 'Description should match');
  assert(slot.required === true, 'Required should match');
  assert(slot.fallback === '<div>Default header</div>', 'Fallback should match');
});

// Test: createEvent helper
test('createEvent creates valid event definition', () => {
  const event = createEvent('custom-change', {
    description: 'Fired when value changes',
    detail: { oldValue: 'string', newValue: 'string' },
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  
  assert(event.name === 'custom-change', 'Name should match');
  assert(event.description === 'Fired when value changes', 'Description should match');
  assert(event.detail.oldValue === 'string', 'Detail structure should match');
  assert(event.bubbles === true, 'Bubbles should match');
  assert(event.cancelable === true, 'Cancelable should match');
  assert(event.composed === true, 'Composed should match');
});

console.log('\n=== ComponentNode Tests ===\n');