/**
 * @fileoverview Tests for Lifecycle Manager
 * @module harmony-web/js/lifecycle-manager.test
 */

import { LifecycleManager, LifecycleState } from './lifecycle-manager.js';

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
 * Assertion helper
 * @param {boolean} condition - Condition to assert
 * @param {string} message - Error message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Run tests
test('LifecycleManager initializes with no history', () => {
  const manager = new LifecycleManager('test-component');
  assert(manager.history.length === 0, 'History should be empty');
  assert(manager.getCurrentState() === null, 'Current state should be null');
});

test('Can transition from no state to DRAFT', () => {
  const manager = new LifecycleManager('test-component');
  assert(manager.canTransitionTo(LifecycleState.DRAFT), 'Should allow transition to DRAFT');
  
  const entry = manager.transitionTo(LifecycleState.DRAFT);
  assert(entry.state === LifecycleState.DRAFT, 'State should be DRAFT');
  assert(manager.history.length === 1, 'History should have one entry');
});

test('Valid forward transitions work', () => {
  const manager = new LifecycleManager('test-component');
  
  manager.transitionTo(LifecycleState.DRAFT);
  assert(manager.canTransitionTo(LifecycleState.DESIGN_COMPLETE), 'Should allow DRAFT -> DESIGN_COMPLETE');
  
  manager.transitionTo(LifecycleState.DESIGN_COMPLETE);
  assert(manager.canTransitionTo(LifecycleState.IN_DEVELOPMENT), 'Should allow DESIGN_COMPLETE -> IN_DEVELOPMENT');
  
  manager.transitionTo(LifecycleState.IN_DEVELOPMENT);
  assert(manager.canTransitionTo(LifecycleState.IMPLEMENTED), 'Should allow IN_DEVELOPMENT -> IMPLEMENTED');
  
  manager.transitionTo(LifecycleState.IMPLEMENTED);
  assert(manager.canTransitionTo(LifecycleState.PUBLISHED), 'Should allow IMPLEMENTED -> PUBLISHED');
  
  manager.transitionTo(LifecycleState.PUBLISHED);
  assert(manager.history.length === 5, 'History should have 5 entries');
});

test('Invalid transitions are rejected', () => {
  const manager = new LifecycleManager('test-component');
  manager.transitionTo(LifecycleState.DRAFT);
  
  assert(!manager.canTransitionTo(LifecycleState.PUBLISHED), 'Should reject DRAFT -> PUBLISHED');
  
  try {
    manager.transitionTo(LifecycleState.PUBLISHED);
    assert(false, 'Should have thrown error');
  } catch (error) {
    assert(error.message.includes('Invalid transition'), 'Should throw transition error');
  }
});

test('Backward transitions work', () => {
  const manager = new LifecycleManager('test-component');
  
  manager.transitionTo(LifecycleState.DRAFT);
  manager.transitionTo(LifecycleState.DESIGN_COMPLETE);
  
  assert(manager.canTransitionTo(LifecycleState.DRAFT), 'Should allow backward to DRAFT');
  manager.transitionTo(LifecycleState.DRAFT);
  
  assert(manager.getCurrentState().state === LifecycleState.DRAFT, 'Should be back in DRAFT');
});

test('Deprecated is terminal state', () => {
  const manager = new LifecycleManager('test-component');
  
  manager.transitionTo(LifecycleState.DRAFT);
  manager.transitionTo(LifecycleState.DEPRECATED);
  
  const validTransitions = LifecycleManager.getValidTransitions(LifecycleState.DEPRECATED);
  assert(validTransitions.length === 0, 'Deprecated should have no valid transitions');
});

test('Metadata is stored with transitions', () => {
  const manager = new LifecycleManager('test-component');
  
  const metadata = {
    reason: 'Initial draft',
    changedBy: 'designer@example.com',
    notes: 'Starting new component'
  };
  
  const entry = manager.transitionTo(LifecycleState.DRAFT, metadata);
  assert(entry.metadata.reason === metadata.reason, 'Metadata should be stored');
  assert(entry.metadata.changedBy === metadata.changedBy, 'ChangedBy should be stored');
});

test('JSON serialization works', () => {
  const manager = new LifecycleManager('test-component');
  manager.transitionTo(LifecycleState.DRAFT);
  manager.transitionTo(LifecycleState.DESIGN_COMPLETE);
  
  const json = manager.toJSON();
  const restored = LifecycleManager.fromJSON(json);
  
  assert(restored.componentId === manager.componentId, 'Component ID should match');
  assert(restored.history.length === manager.history.length, 'History length should match');
  assert(restored.getCurrentState().state === LifecycleState.DESIGN_COMPLETE, 'Current state should match');
});

test('Static helper methods work', () => {
  const allStates = LifecycleManager.getAllStates();
  assert(allStates.length === 6, 'Should have 6 states');
  
  const description = LifecycleManager.getStateDescription(LifecycleState.DRAFT);
  assert(description.length > 0, 'Should have description');
  
  const transitions = LifecycleManager.getValidTransitions(LifecycleState.DRAFT);
  assert(transitions.includes(LifecycleState.DESIGN_COMPLETE), 'Should include valid transition');
});

console.log('\n=== Lifecycle Manager Tests Complete ===\n');