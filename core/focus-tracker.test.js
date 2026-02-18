/**
 * @fileoverview Tests for FocusTracker
 */

import { FocusTracker, createFocusTracker } from './focus-tracker.js';

/**
 * Create a test element
 * @returns {HTMLButtonElement}
 */
function createTestElement() {
  const button = document.createElement('button');
  button.textContent = 'Test Button';
  document.body.appendChild(button);
  return button;
}

/**
 * Clean up test element
 * @param {HTMLElement} element
 */
function cleanupTestElement(element) {
  element.remove();
}

/**
 * Wait for next tick
 * @returns {Promise<void>}
 */
function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Test: Basic initialization
(() => {
  const element = createTestElement();
  const states = [];
  
  const tracker = new FocusTracker({
    element,
    onStateChange: (state) => states.push(state)
  });

  const initialState = tracker.getState();
  console.assert(
    !initialState.focused && !initialState.hovered && 
    !initialState.active && !initialState.disabled,
    'Initial state should be all false'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Basic initialization test passed');
})();

// Test: Focus state tracking
(async () => {
  const element = createTestElement();
  const states = [];
  
  const tracker = new FocusTracker({
    element,
    onStateChange: (state) => states.push({ ...state })
  });

  element.focus();
  await nextTick();

  console.assert(
    states.some(s => s.focused === true),
    'Focus state should be tracked'
  );

  element.blur();
  await nextTick();

  console.assert(
    states.some(s => s.focused === false),
    'Blur state should be tracked'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Focus state tracking test passed');
})();

// Test: Hover state tracking
(async () => {
  const element = createTestElement();
  const states = [];
  
  const tracker = new FocusTracker({
    element,
    onStateChange: (state) => states.push({ ...state })
  });

  element.dispatchEvent(new MouseEvent('mouseenter'));
  await nextTick();

  console.assert(
    states.some(s => s.hovered === true),
    'Hover state should be tracked'
  );

  element.dispatchEvent(new MouseEvent('mouseleave'));
  await nextTick();

  console.assert(
    states[states.length - 1].hovered === false,
    'Mouse leave should clear hover'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Hover state tracking test passed');
})();

// Test: Active state tracking
(async () => {
  const element = createTestElement();
  const states = [];
  
  const tracker = new FocusTracker({
    element,
    onStateChange: (state) => states.push({ ...state })
  });

  element.dispatchEvent(new MouseEvent('mousedown'));
  await nextTick();

  console.assert(
    states.some(s => s.active === true),
    'Active state should be tracked on mousedown'
  );

  element.dispatchEvent(new MouseEvent('mouseup'));
  await nextTick();

  console.assert(
    states[states.length - 1].active === false,
    'Mouse up should clear active'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Active state tracking test passed');
})();

// Test: Disabled state tracking
(async () => {
  const element = createTestElement();
  const states = [];
  
  const tracker = new FocusTracker({
    element,
    onStateChange: (state) => states.push({ ...state })
  });

  element.setAttribute('disabled', '');
  await nextTick();

  console.assert(
    states.some(s => s.disabled === true),
    'Disabled state should be tracked'
  );

  element.removeAttribute('disabled');
  await nextTick();

  console.assert(
    states[states.length - 1].disabled === false,
    'Removing disabled should update state'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Disabled state tracking test passed');
})();

// Test: Class name generation
(() => {
  const element = createTestElement();
  
  const tracker = new FocusTracker({
    element,
    onStateChange: () => {}
  });

  tracker.state.focused = true;
  tracker.state.hovered = true;

  const classes = tracker.getClassNames('test-');
  console.assert(
    classes.includes('test-focused') && classes.includes('test-hovered'),
    'Class names should be generated with prefix'
  );

  const classString = tracker.getClassString('btn-');
  console.assert(
    classString.includes('btn-focused') && classString.includes('btn-hovered'),
    'Class string should contain all active states'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Class name generation test passed');
})();

// Test: isInteractive method
(() => {
  const element = createTestElement();
  
  const tracker = new FocusTracker({
    element,
    onStateChange: () => {}
  });

  console.assert(
    !tracker.isInteractive(),
    'Should not be interactive initially'
  );

  tracker.state.focused = true;
  console.assert(
    tracker.isInteractive(),
    'Should be interactive when focused'
  );

  tracker.state.disabled = true;
  console.assert(
    !tracker.isInteractive(),
    'Should not be interactive when disabled'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ isInteractive method test passed');
})();

// Test: Programmatic disabled state
(async () => {
  const element = createTestElement();
  const states = [];
  
  const tracker = new FocusTracker({
    element,
    onStateChange: (state) => states.push({ ...state })
  });

  tracker.setDisabled(true);
  await nextTick();

  console.assert(
    element.hasAttribute('disabled'),
    'Element should have disabled attribute'
  );
  console.assert(
    states.some(s => s.disabled === true),
    'State should reflect disabled'
  );

  tracker.setDisabled(false);
  await nextTick();

  console.assert(
    !element.hasAttribute('disabled'),
    'Disabled attribute should be removed'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Programmatic disabled state test passed');
})();

// Test: Factory function
(() => {
  const element = createTestElement();
  
  const tracker = createFocusTracker({
    element,
    onStateChange: () => {}
  });

  console.assert(
    tracker instanceof FocusTracker,
    'Factory should create FocusTracker instance'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Factory function test passed');
})();

// Test: Selective tracking
(() => {
  const element = createTestElement();
  const states = [];
  
  const tracker = new FocusTracker({
    element,
    onStateChange: (state) => states.push({ ...state }),
    trackHover: false,
    trackActive: false
  });

  element.dispatchEvent(new MouseEvent('mouseenter'));
  element.dispatchEvent(new MouseEvent('mousedown'));

  console.assert(
    states.length === 0,
    'Should not track disabled events'
  );

  tracker.destroy();
  cleanupTestElement(element);
  console.log('✓ Selective tracking test passed');
})();

console.log('\n✅ All FocusTracker tests passed');