/**
 * @fileoverview Tests for Component Intent Queries
 * 
 * @module harmony-design/tests/graph/component-intent-queries.test
 */

import { 
  getComponentIntents,
  getPrimaryComponentIntent,
  getComponentIntentsByTrigger,
  hasComponentIntent
} from '../../src/graph/queries/get-component-intents.js';

/**
 * Runs all component intent query tests.
 */
export function runComponentIntentQueryTests() {
  console.group('Component Intent Query Tests');
  
  testGetComponentIntents();
  testGetPrimaryComponentIntent();
  testGetComponentIntentsByTrigger();
  testHasComponentIntent();
  
  console.groupEnd();
}

function createMockGraphState() {
  return {
    components: [
      { id: 'button-1', name: 'SubmitButton' }
    ],
    intents: [
      { id: 'intent-1', name: 'submit-form' },
      { id: 'intent-2', name: 'cancel-form' }
    ],
    componentIntentLinks: [
      {
        id: 'link-1',
        componentId: 'button-1',
        intentId: 'intent-1',
        triggerMechanism: 'click',
        isPrimary: true,
        conditions: []
      },
      {
        id: 'link-2',
        componentId: 'button-1',
        intentId: 'intent-2',
        triggerMechanism: 'secondary-click',
        isPrimary: false,
        conditions: []
      }
    ]
  };
}

function testGetComponentIntents() {
  console.log('Testing getComponentIntents...');
  
  const graphState = createMockGraphState();
  const intents = getComponentIntents(graphState, 'button-1');
  
  console.assert(intents.length === 2, 'Should return 2 intents');
  console.assert(intents[0].intent.id === 'intent-1', 'First intent should match');
  console.assert(intents[0].link.id === 'link-1', 'First link should match');
  
  const emptyIntents = getComponentIntents(graphState, 'nonexistent');
  console.assert(emptyIntents.length === 0, 'Should return empty array for nonexistent component');
  
  console.log('✓ getComponentIntents tests passed');
}

function testGetPrimaryComponentIntent() {
  console.log('Testing getPrimaryComponentIntent...');
  
  const graphState = createMockGraphState();
  const primary = getPrimaryComponentIntent(graphState, 'button-1');
  
  console.assert(primary !== null, 'Should find primary intent');
  console.assert(primary.intent.id === 'intent-1', 'Primary intent should match');
  console.assert(primary.link.isPrimary === true, 'Link should be marked as primary');
  
  console.log('✓ getPrimaryComponentIntent tests passed');
}

function testGetComponentIntentsByTrigger() {
  console.log('Testing getComponentIntentsByTrigger...');
  
  const graphState = createMockGraphState();
  const clickIntents = getComponentIntentsByTrigger(graphState, 'button-1', 'click');
  
  console.assert(clickIntents.length === 1, 'Should return 1 intent for click trigger');
  console.assert(clickIntents[0].intent.id === 'intent-1', 'Intent should match');
  
  const emptyIntents = getComponentIntentsByTrigger(graphState, 'button-1', 'hover');
  console.assert(emptyIntents.length === 0, 'Should return empty array for nonexistent trigger');
  
  console.log('✓ getComponentIntentsByTrigger tests passed');
}

function testHasComponentIntent() {
  console.log('Testing hasComponentIntent...');
  
  const graphState = createMockGraphState();
  
  console.assert(
    hasComponentIntent(graphState, 'button-1', 'intent-1') === true,
    'Should return true for existing link'
  );
  
  console.assert(
    hasComponentIntent(graphState, 'button-1', 'nonexistent') === false,
    'Should return false for nonexistent intent'
  );
  
  console.log('✓ hasComponentIntent tests passed');
}