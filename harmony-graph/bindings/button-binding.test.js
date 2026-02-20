/**
 * @fileoverview Tests for button graph binding
 * @module harmony-graph/bindings/button-binding.test
 */

import { ButtonBinding, createButtonBinding } from './button-binding.js';

/**
 * Mock graph instance for testing
 */
class MockGraph {
  constructor() {
    this.events = [];
  }

  publishEvent(type, payload) {
    this.events.push({ type, payload });
  }
}

/**
 * Mock EventBus instance for testing
 */
class MockEventBus {
  constructor() {
    this.published = [];
  }

  publish(type, payload) {
    this.published.push({ type, payload });
  }
}

/**
 * Create mock button element
 */
function createMockButton() {
  const button = document.createElement('button');
  button.className = 'harmony-button';
  
  // Add shadow DOM for realistic testing
  const shadow = button.attachShadow({ mode: 'open' });
  const textSpan = document.createElement('span');
  textSpan.className = 'button-text';
  textSpan.textContent = 'Click me';
  shadow.appendChild(textSpan);
  
  return button;
}

/**
 * Run all button binding tests
 */
export function runButtonBindingTests() {
  console.group('ButtonBinding Tests');

  testBindingCreation();
  testLabelUpdate();
  testDisabledStateUpdate();
  testVariantUpdate();
  testSizeUpdate();
  testLoadingStateUpdate();
  testIconUpdate();
  testClickEventPublishing();
  testFocusEventPublishing();
  testStateReading();
  testFactoryFunction();
  testPerformanceBudget();

  console.groupEnd();
}

function testBindingCreation() {
  const button = createMockButton();
  const graph = new MockGraph();
  
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: graph
  });

  console.assert(binding.nodeId === 'testButton', 'Should set nodeId');
  console.assert(binding.element === button, 'Should set element');
  console.assert(binding.graph === graph, 'Should set graph');
  console.log('✓ Binding creation');
}

function testLabelUpdate() {
  const button = createMockButton();
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  binding.sync({ label: 'New Label' });
  
  const textNode = button.shadowRoot.querySelector('.button-text');
  console.assert(textNode.textContent === 'New Label', 'Should update label');
  console.log('✓ Label update');
}

function testDisabledStateUpdate() {
  const button = createMockButton();
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  binding.sync({ disabled: true });
  console.assert(button.hasAttribute('disabled'), 'Should add disabled attribute');
  console.assert(button.getAttribute('aria-disabled') === 'true', 'Should set aria-disabled');

  binding.sync({ disabled: false });
  console.assert(!button.hasAttribute('disabled'), 'Should remove disabled attribute');
  console.assert(button.getAttribute('aria-disabled') === 'false', 'Should update aria-disabled');
  
  console.log('✓ Disabled state update');
}

function testVariantUpdate() {
  const button = createMockButton();
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  binding.sync({ variant: 'primary' });
  console.assert(button.hasAttribute('primary'), 'Should add primary attribute');

  binding.sync({ variant: 'secondary' });
  console.assert(!button.hasAttribute('primary'), 'Should remove primary attribute');
  console.assert(button.hasAttribute('secondary'), 'Should add secondary attribute');
  
  console.log('✓ Variant update');
}

function testSizeUpdate() {
  const button = createMockButton();
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  binding.sync({ size: 'large' });
  console.assert(button.hasAttribute('large'), 'Should add large attribute');

  binding.sync({ size: 'small' });
  console.assert(!button.hasAttribute('large'), 'Should remove large attribute');
  console.assert(button.hasAttribute('small'), 'Should add small attribute');
  
  console.log('✓ Size update');
}

function testLoadingStateUpdate() {
  const button = createMockButton();
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  binding.sync({ loading: true });
  console.assert(button.hasAttribute('loading'), 'Should add loading attribute');
  console.assert(button.getAttribute('aria-busy') === 'true', 'Should set aria-busy');

  binding.sync({ loading: false });
  console.assert(!button.hasAttribute('loading'), 'Should remove loading attribute');
  console.assert(button.getAttribute('aria-busy') === 'false', 'Should update aria-busy');
  
  console.log('✓ Loading state update');
}

function testIconUpdate() {
  const button = createMockButton();
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  binding.sync({ icon: 'play', iconPosition: 'left' });
  console.assert(button.getAttribute('icon') === 'play', 'Should set icon attribute');
  console.assert(button.getAttribute('icon-position') === 'left', 'Should set icon-position');
  
  console.log('✓ Icon update');
}

function testClickEventPublishing() {
  const button = createMockButton();
  const eventBus = new MockEventBus();
  
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph(),
    eventBus: eventBus
  });

  button.click();
  
  console.assert(eventBus.published.length === 1, 'Should publish one event');
  console.assert(eventBus.published[0].type === 'button:click', 'Should publish click event');
  console.assert(eventBus.published[0].payload.nodeId === 'testButton', 'Should include nodeId');
  
  console.log('✓ Click event publishing');
}

function testFocusEventPublishing() {
  const button = createMockButton();
  const eventBus = new MockEventBus();
  
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph(),
    eventBus: eventBus
  });

  button.dispatchEvent(new Event('focus'));
  console.assert(eventBus.published.some(e => e.type === 'button:focus'), 'Should publish focus event');

  button.dispatchEvent(new Event('blur'));
  console.assert(eventBus.published.some(e => e.type === 'button:blur'), 'Should publish blur event');
  
  console.log('✓ Focus/blur event publishing');
}

function testStateReading() {
  const button = createMockButton();
  button.setAttribute('disabled', '');
  button.setAttribute('primary', '');
  button.setAttribute('large', '');
  button.setAttribute('loading', '');
  button.setAttribute('icon', 'play');
  
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  const state = binding.readState();
  
  console.assert(state.disabled === true, 'Should read disabled state');
  console.assert(state.variant === 'primary', 'Should read variant');
  console.assert(state.size === 'large', 'Should read size');
  console.assert(state.loading === true, 'Should read loading state');
  console.assert(state.icon === 'play', 'Should read icon');
  
  console.log('✓ State reading');
}

function testFactoryFunction() {
  const button = createMockButton();
  const binding = createButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  console.assert(binding instanceof ButtonBinding, 'Should create ButtonBinding instance');
  console.log('✓ Factory function');
}

function testPerformanceBudget() {
  const button = createMockButton();
  const binding = new ButtonBinding({
    nodeId: 'testButton',
    element: button,
    graph: new MockGraph()
  });

  const iterations = 100;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    binding.sync({
      label: `Button ${i}`,
      disabled: i % 2 === 0,
      variant: i % 3 === 0 ? 'primary' : 'secondary',
      size: 'medium',
      loading: false
    });
  }

  const duration = performance.now() - startTime;
  const avgDuration = duration / iterations;

  console.assert(avgDuration < 1, `Average sync should be < 1ms (was ${avgDuration.toFixed(3)}ms)`);
  console.log(`✓ Performance budget (avg: ${avgDuration.toFixed(3)}ms per sync)`);
}

// Auto-run tests if in browser environment
if (typeof window !== 'undefined' && document.readyState === 'complete') {
  runButtonBindingTests();
} else if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', runButtonBindingTests);
}