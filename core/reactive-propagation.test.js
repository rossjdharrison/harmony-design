/**
 * @fileoverview Tests for Reactive Propagation System
 * 
 * Tests cover:
 * - Observable creation and updates
 * - Computed value dependencies
 * - Effect execution and cleanup
 * - EventBus integration
 * - Performance constraints
 */

import { 
  Observable, 
  Computed, 
  Effect,
  reactivePropagationSystem 
} from './reactive-propagation.js';

/**
 * Test suite for Observable
 */
function testObservable() {
  console.log('Testing Observable...');
  
  // Test basic get/set
  const obs = new Observable(10);
  console.assert(obs.get() === 10, 'Initial value should be 10');
  
  obs.set(20);
  console.assert(obs.get() === 20, 'Value should update to 20');
  
  // Test subscription
  let callCount = 0;
  let lastNew = null;
  let lastOld = null;
  
  const unsubscribe = obs.subscribe((newVal, oldVal) => {
    callCount++;
    lastNew = newVal;
    lastOld = oldVal;
  });
  
  obs.set(30);
  console.assert(callCount === 1, 'Subscriber should be called once');
  console.assert(lastNew === 30, 'New value should be 30');
  console.assert(lastOld === 20, 'Old value should be 20');
  
  // Test unsubscribe
  unsubscribe();
  obs.set(40);
  console.assert(callCount === 1, 'Subscriber should not be called after unsubscribe');
  
  // Test update method
  obs.update(val => val + 10);
  console.assert(obs.get() === 50, 'Update should add 10');
  
  // Test no notification on same value
  callCount = 0;
  obs.subscribe(() => callCount++);
  obs.set(50);
  console.assert(callCount === 0, 'Should not notify if value unchanged');
  
  console.log('✓ Observable tests passed');
}

/**
 * Test suite for Computed
 */
function testComputed() {
  console.log('Testing Computed...');
  
  const a = new Observable(5);
  const b = new Observable(10);
  
  // Test basic computation
  const sum = new Computed(() => a.get() + b.get());
  console.assert(sum.get() === 15, 'Sum should be 15');
  
  // Test automatic update
  a.set(10);
  console.assert(sum.get() === 20, 'Sum should update to 20');
  
  b.set(20);
  console.assert(sum.get() === 30, 'Sum should update to 30');
  
  // Test computed subscription
  let notifyCount = 0;
  let lastValue = null;
  
  sum.subscribe((newVal) => {
    notifyCount++;
    lastValue = newVal;
  });
  
  a.set(15);
  console.assert(notifyCount === 1, 'Computed subscriber should be called');
  console.assert(lastValue === 35, 'Computed value should be 35');
  
  // Test chained computed
  const doubled = new Computed(() => sum.get() * 2);
  console.assert(doubled.get() === 70, 'Doubled should be 70');
  
  a.set(20);
  console.assert(doubled.get() === 80, 'Doubled should update to 80');
  
  console.log('✓ Computed tests passed');
}

/**
 * Test suite for Effect
 */
function testEffect() {
  console.log('Testing Effect...');
  
  const counter = new Observable(0);
  let effectRuns = 0;
  let lastValue = null;
  
  // Test immediate execution
  const effect = new Effect(() => {
    effectRuns++;
    lastValue = counter.get();
  });
  
  console.assert(effectRuns === 1, 'Effect should run immediately');
  console.assert(lastValue === 0, 'Effect should see initial value');
  
  // Test reactive updates
  counter.set(5);
  console.assert(effectRuns === 2, 'Effect should run on update');
  console.assert(lastValue === 5, 'Effect should see new value');
  
  // Test cleanup
  let cleanupCalled = false;
  const effect2 = new Effect(() => {
    counter.get();
    return () => { cleanupCalled = true; };
  });
  
  counter.set(10);
  console.assert(cleanupCalled === true, 'Cleanup should be called on re-run');
  
  // Test stop
  cleanupCalled = false;
  effect2.stop();
  console.assert(cleanupCalled === true, 'Cleanup should be called on stop');
  
  const runsBefore = effectRuns;
  counter.set(15);
  console.assert(effectRuns === runsBefore, 'Stopped effect should not run');
  
  console.log('✓ Effect tests passed');
}

/**
 * Test suite for ReactivePropagationSystem
 */
function testReactivePropagationSystem() {
  console.log('Testing ReactivePropagationSystem...');
  
  reactivePropagationSystem.reset();
  
  // Test observable creation
  const obs = reactivePropagationSystem.observable(100, 'test-key');
  console.assert(obs.get() === 100, 'Observable should be created with value');
  
  // Test retrieval
  const retrieved = reactivePropagationSystem.getObservable('test-key');
  console.assert(retrieved === obs, 'Should retrieve same observable');
  
  // Test computed creation
  const doubled = reactivePropagationSystem.computed(() => obs.get() * 2);
  console.assert(doubled.get() === 200, 'Computed should work');
  
  // Test effect creation
  let effectValue = null;
  reactivePropagationSystem.effect(() => {
    effectValue = obs.get();
  });
  console.assert(effectValue === 100, 'Effect should run');
  
  // Test propagation
  reactivePropagationSystem.propagate('test-source', 'test-key', 150);
  console.assert(obs.get() === 150, 'Propagation should update observable');
  
  // Test stats
  const stats = reactivePropagationSystem.getStats();
  console.assert(stats.propagations > 0, 'Stats should track propagations');
  
  console.log('✓ ReactivePropagationSystem tests passed');
}

/**
 * Test performance constraints
 */
function testPerformance() {
  console.log('Testing Performance...');
  
  reactivePropagationSystem.reset();
  
  // Create many observables
  const observables = [];
  for (let i = 0; i < 100; i++) {
    observables.push(new Observable(i));
  }
  
  // Create computed that depends on all
  const startCompute = performance.now();
  const sum = new Computed(() => {
    return observables.reduce((acc, obs) => acc + obs.get(), 0);
  });
  const computeTime = performance.now() - startCompute;
  
  console.assert(computeTime < 16, `Compute time ${computeTime}ms should be < 16ms`);
  
  // Test propagation performance
  const startPropagate = performance.now();
  for (let i = 0; i < 100; i++) {
    observables[i].set(i * 2);
  }
  const propagateTime = performance.now() - startPropagate;
  
  console.assert(propagateTime < 16, `Propagate time ${propagateTime}ms should be < 16ms`);
  
  // Test memory usage (approximate)
  const memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;
  const manyObs = [];
  for (let i = 0; i < 1000; i++) {
    manyObs.push(new Observable(i));
  }
  const memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
  const memoryUsed = memoryAfter - memoryBefore;
  
  if (performance.memory) {
    console.log(`Memory used for 1000 observables: ${(memoryUsed / 1024).toFixed(2)}KB`);
    console.assert(memoryUsed < 1024 * 1024, 'Should use less than 1MB for 1000 observables');
  }
  
  console.log('✓ Performance tests passed');
}

/**
 * Run all tests
 */
export function runTests() {
  console.log('=== Reactive Propagation System Tests ===');
  
  try {
    testObservable();
    testComputed();
    testEffect();
    testReactivePropagationSystem();
    testPerformance();
    
    console.log('=== All tests passed ✓ ===');
    return true;
  } catch (error) {
    console.error('=== Test failed ✗ ===');
    console.error(error);
    return false;
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const passed = runTests();
  // Explicitly exit so open Effect/Observable subscriptions don't hang the process.
  process.exit(passed ? 0 : 1);
}