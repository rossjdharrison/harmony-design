/**
 * @fileoverview Tests for AudioContext Lifecycle Manager
 * Validates initialization, state transitions, and cleanup
 * 
 * @module tests/audio-context-manager
 */

import { AudioContextManager, AudioContextState } from '../bounded-contexts/audio/audio-context-manager.js';

/**
 * Mock EventBus for testing
 */
class MockEventBus {
  constructor() {
    this.subscriptions = new Map();
    this.published = [];
  }

  subscribe(event, handler) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }
    this.subscriptions.get(event).push(handler);
  }

  publish(event, payload) {
    this.published.push({ event, payload, timestamp: Date.now() });
    const handlers = this.subscriptions.get(event) || [];
    handlers.forEach(handler => handler(payload));
  }

  getPublished(event) {
    return this.published.filter(p => p.event === event);
  }

  clear() {
    this.published = [];
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 AudioContextManager Tests\n');

  const tests = [
    testInitialization,
    testStateTransitions,
    testEventBusIntegration,
    testAutoplayHandling,
    testVisibilityHandling,
    testMetrics,
    testErrorHandling,
    testCleanup
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name}`);
      console.error(`   ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test: AudioContext initialization
 */
async function testInitialization() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  // Should start uninitialized
  if (manager.getState() !== AudioContextState.UNINITIALIZED) {
    throw new Error('Manager should start in UNINITIALIZED state');
  }

  // Initialize with custom options
  await manager.initialize({
    sampleRate: 48000,
    latencyHint: 0.010,
    autoSuspendOnHidden: true
  });

  // Should be suspended after init (autoplay policy)
  if (manager.getState() !== AudioContextState.SUSPENDED) {
    throw new Error('Manager should be SUSPENDED after initialization');
  }

  // Should have AudioContext
  const context = manager.getContext();
  if (!context) {
    throw new Error('Manager should have AudioContext after initialization');
  }

  // Should publish initialization event
  const initEvents = eventBus.getPublished('AudioContext.Initialized');
  if (initEvents.length !== 1) {
    throw new Error('Should publish AudioContext.Initialized event');
  }

  await manager.close();
}

/**
 * Test: State transitions
 */
async function testStateTransitions() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  await manager.initialize();

  // Test resume
  await manager.resume();
  if (manager.getState() !== AudioContextState.RUNNING) {
    throw new Error('Should be RUNNING after resume');
  }
  if (!manager.isReady()) {
    throw new Error('Should be ready after resume');
  }

  // Test suspend
  await manager.suspend();
  if (manager.getState() !== AudioContextState.SUSPENDED) {
    throw new Error('Should be SUSPENDED after suspend');
  }
  if (manager.isReady()) {
    throw new Error('Should not be ready when suspended');
  }

  // Test close
  await manager.close();
  if (manager.getState() !== AudioContextState.CLOSED) {
    throw new Error('Should be CLOSED after close');
  }

  // Should not be able to resume closed context
  try {
    await manager.resume();
    throw new Error('Should not be able to resume closed context');
  } catch (error) {
    if (!error.message.includes('closed')) {
      throw error;
    }
  }
}

/**
 * Test: EventBus command integration
 */
async function testEventBusIntegration() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  // Test initialization via command
  eventBus.publish('AudioContext.Initialize', {
    options: { sampleRate: 48000 }
  });

  // Wait for async initialization
  await new Promise(resolve => setTimeout(resolve, 100));

  if (manager.getState() === AudioContextState.UNINITIALIZED) {
    throw new Error('Should initialize via command');
  }

  // Test resume via command
  eventBus.publish('AudioContext.Resume');
  await new Promise(resolve => setTimeout(resolve, 50));

  // Test suspend via command
  eventBus.publish('AudioContext.Suspend');
  await new Promise(resolve => setTimeout(resolve, 50));

  // Test state query via command
  eventBus.clear();
  eventBus.publish('AudioContext.GetState');
  await new Promise(resolve => setTimeout(resolve, 10));

  const stateEvents = eventBus.getPublished('AudioContext.State');
  if (stateEvents.length === 0) {
    throw new Error('Should publish state in response to query');
  }

  await manager.close();
}

/**
 * Test: Autoplay policy handling
 */
async function testAutoplayHandling() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  await manager.initialize();

  // Context should be suspended initially (autoplay policy)
  const context = manager.getContext();
  if (context.state !== 'suspended') {
    throw new Error('Context should be suspended due to autoplay policy');
  }

  // Simulate user interaction
  const clickEvent = new MouseEvent('click');
  document.dispatchEvent(clickEvent);

  // Wait for async resume
  await new Promise(resolve => setTimeout(resolve, 100));

  // Context should now be running
  if (context.state !== 'running') {
    throw new Error('Context should resume after user interaction');
  }

  await manager.close();
}

/**
 * Test: Page visibility handling
 */
async function testVisibilityHandling() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  await manager.initialize({ autoSuspendOnHidden: true });
  await manager.resume();

  // Simulate page hidden
  Object.defineProperty(document, 'hidden', {
    writable: true,
    value: true
  });
  document.dispatchEvent(new Event('visibilitychange'));

  // Wait for async suspend
  await new Promise(resolve => setTimeout(resolve, 50));

  // Should auto-suspend
  if (manager.getState() !== AudioContextState.SUSPENDED) {
    throw new Error('Should auto-suspend when page hidden');
  }

  // Check for auto-suspend event
  const autoSuspendEvents = eventBus.getPublished('AudioContext.AutoSuspended');
  if (autoSuspendEvents.length === 0) {
    throw new Error('Should publish AutoSuspended event');
  }

  // Reset document.hidden
  Object.defineProperty(document, 'hidden', {
    writable: true,
    value: false
  });

  await manager.close();
}

/**
 * Test: Metrics collection
 */
async function testMetrics() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  // Should return null before initialization
  if (manager.getMetrics() !== null) {
    throw new Error('Metrics should be null before initialization');
  }

  await manager.initialize();

  // Should return metrics after initialization
  const metrics = manager.getMetrics();
  if (!metrics) {
    throw new Error('Should return metrics after initialization');
  }

  // Validate metrics structure
  if (!metrics.state || !metrics.nativeState || !metrics.sampleRate) {
    throw new Error('Metrics should include state, nativeState, and sampleRate');
  }

  if (typeof metrics.currentTime !== 'number') {
    throw new Error('Metrics should include currentTime');
  }

  if (typeof metrics.baseLatency !== 'number') {
    throw new Error('Metrics should include baseLatency');
  }

  await manager.close();
}

/**
 * Test: Error handling
 */
async function testErrorHandling() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  // Test double initialization
  await manager.initialize();
  try {
    await manager.initialize();
    throw new Error('Should not allow double initialization');
  } catch (error) {
    if (!error.message.includes('already initialized')) {
      throw error;
    }
  }

  await manager.close();

  // Test operations on closed context
  const manager2 = new AudioContextManager(eventBus);
  await manager2.initialize();
  await manager2.close();

  try {
    await manager2.resume();
    throw new Error('Should not allow resume on closed context');
  } catch (error) {
    if (!error.message.includes('closed')) {
      throw error;
    }
  }
}

/**
 * Test: Cleanup and resource management
 */
async function testCleanup() {
  const eventBus = new MockEventBus();
  const manager = new AudioContextManager(eventBus);

  await manager.initialize();
  const context = manager.getContext();

  // Add state change listener
  let listenerCalled = false;
  const unsubscribe = manager.addStateChangeListener(() => {
    listenerCalled = true;
  });

  // Close should clean up
  await manager.close();

  // Context should be closed
  if (context.state !== 'closed') {
    throw new Error('AudioContext should be closed');
  }

  // Should publish close event
  const closeEvents = eventBus.getPublished('AudioContext.Closed');
  if (closeEvents.length === 0) {
    throw new Error('Should publish Closed event');
  }

  // Test destroy
  await manager.destroy();

  // Unsubscribe should work
  unsubscribe();
}

// Run tests if this file is executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runTests };