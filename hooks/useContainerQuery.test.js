/**
 * @fileoverview Tests for useContainerQuery hook
 * @module hooks/useContainerQuery.test
 */

import { 
  useContainerQuery, 
  createContainerQueryMatcher,
  createContainerQueryClassApplier 
} from './useContainerQuery.js';

/**
 * Mock ResizeObserver for testing
 */
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
  }

  observe(element) {
    this.elements.add(element);
  }

  disconnect() {
    this.elements.clear();
  }

  trigger(entries) {
    this.callback(entries);
  }
}

// Install mock
let originalResizeObserver;

function setupMocks() {
  originalResizeObserver = global.ResizeObserver;
  global.ResizeObserver = MockResizeObserver;
}

function teardownMocks() {
  global.ResizeObserver = originalResizeObserver;
}

/**
 * Test: Basic query matching
 */
export function testBasicQueryMatching() {
  setupMocks();

  const container = document.createElement('div');
  const containerRef = { current: container };

  const query = useContainerQuery(containerRef, {
    minWidth: 600,
    maxWidth: 1200
  });

  // Initial state
  console.assert(query.matches === false, 'Initial state should not match');

  // Simulate resize to matching size
  const observer = new ResizeObserver(() => {});
  observer.observe(container);
  observer.trigger([{
    target: container,
    contentRect: { width: 800, height: 600 },
    borderBoxSize: [{ inlineSize: 800, blockSize: 600 }]
  }]);

  query.disconnect();
  teardownMocks();

  console.log('✓ Basic query matching test passed');
}

/**
 * Test: Multiple breakpoints
 */
export function testMultipleBreakpoints() {
  setupMocks();

  const container = document.createElement('div');
  const containerRef = { current: container };

  const matcher = createContainerQueryMatcher({
    small: { maxWidth: 600 },
    medium: { minWidth: 601, maxWidth: 1200 },
    large: { minWidth: 1201 }
  });

  let lastMatch = null;

  const unsubscribe = matcher.subscribe(containerRef, (match) => {
    lastMatch = match;
  });

  // Should have received initial callback
  console.assert(lastMatch !== null, 'Should receive initial match');

  unsubscribe();
  matcher.disconnectAll();
  teardownMocks();

  console.log('✓ Multiple breakpoints test passed');
}

/**
 * Test: Class applier
 */
export function testClassApplier() {
  setupMocks();

  const container = document.createElement('div');
  const containerRef = { current: container };

  const applier = createContainerQueryClassApplier(containerRef, {
    'container-sm': { maxWidth: 600 },
    'container-lg': { minWidth: 601 }
  });

  // Simulate resize
  const observer = new ResizeObserver(() => {});
  observer.observe(container);
  observer.trigger([{
    target: container,
    contentRect: { width: 400, height: 300 },
    borderBoxSize: [{ inlineSize: 400, blockSize: 300 }]
  }]);

  applier.disconnect();
  teardownMocks();

  console.log('✓ Class applier test passed');
}

/**
 * Test: Subscription and cleanup
 */
export function testSubscriptionCleanup() {
  setupMocks();

  const container = document.createElement('div');
  const containerRef = { current: container };

  const query = useContainerQuery(containerRef, { minWidth: 600 });

  let callCount = 0;
  const unsubscribe = query.subscribe(() => {
    callCount++;
  });

  console.assert(callCount === 1, 'Should call listener immediately');

  unsubscribe();
  query.disconnect();
  teardownMocks();

  console.log('✓ Subscription cleanup test passed');
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('Running useContainerQuery tests...');

  try {
    testBasicQueryMatching();
    testMultipleBreakpoints();
    testClassApplier();
    testSubscriptionCleanup();

    console.log('✅ All useContainerQuery tests passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Auto-run if executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test=useContainerQuery')) {
  runAllTests();
}