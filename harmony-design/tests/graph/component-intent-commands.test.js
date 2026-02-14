/**
 * @fileoverview Tests for Component Intent Commands
 * 
 * @module harmony-design/tests/graph/component-intent-commands.test
 */

import { addComponentIntentLink } from '../../src/graph/commands/add-component-intent-link.js';
import { removeComponentIntentLink } from '../../src/graph/commands/remove-component-intent-link.js';

/**
 * Runs all component intent command tests.
 */
export function runComponentIntentCommandTests() {
  console.group('Component Intent Command Tests');
  
  testAddComponentIntentLink();
  testRemoveComponentIntentLink();
  
  console.groupEnd();
}

function createMockGraphState() {
  return {
    components: [
      { id: 'button-1', name: 'SubmitButton' }
    ],
    intents: [
      { id: 'intent-1', name: 'submit-form' }
    ],
    componentIntentLinks: []
  };
}

function testAddComponentIntentLink() {
  console.log('Testing addComponentIntentLink...');
  
  const graphState = createMockGraphState();
  
  // Test successful addition
  const result1 = addComponentIntentLink(graphState, {
    componentId: 'button-1',
    intentId: 'intent-1',
    triggerMechanism: 'click',
    isPrimary: true
  });
  
  console.assert(result1.success === true, 'Should succeed with valid data');
  console.assert(result1.graphState.componentIntentLinks.length === 1, 'Should add link to graph');
  console.assert(result1.link.componentId === 'button-1', 'Link should have correct componentId');
  
  // Test missing componentId
  const result2 = addComponentIntentLink(graphState, {
    intentId: 'intent-1',
    triggerMechanism: 'click'
  });
  
  console.assert(result2.success === false, 'Should fail without componentId');
  console.assert(result2.error.includes('componentId'), 'Error should mention componentId');
  
  // Test nonexistent component
  const result3 = addComponentIntentLink(graphState, {
    componentId: 'nonexistent',
    intentId: 'intent-1',
    triggerMechanism: 'click'
  });
  
  console.assert(result3.success === false, 'Should fail with nonexistent component');
  console.assert(result3.error.includes('not found'), 'Error should mention component not found');
  
  // Test duplicate prevention
  const result4 = addComponentIntentLink(result1.graphState, {
    componentId: 'button-1',
    intentId: 'intent-1',
    triggerMechanism: 'click'
  });
  
  console.assert(result4.success === false, 'Should fail with duplicate link');
  console.assert(result4.error.includes('already exists'), 'Error should mention duplicate');
  
  console.log('✓ addComponentIntentLink tests passed');
}

function testRemoveComponentIntentLink() {
  console.log('Testing removeComponentIntentLink...');
  
  const graphState = createMockGraphState();
  
  // Add a link first
  const addResult = addComponentIntentLink(graphState, {
    componentId: 'button-1',
    intentId: 'intent-1',
    triggerMechanism: 'click'
  });
  
  const linkId = addResult.link.id;
  
  // Test successful removal
  const result1 = removeComponentIntentLink(addResult.graphState, { linkId });
  
  console.assert(result1.success === true, 'Should succeed with valid linkId');
  console.assert(result1.graphState.componentIntentLinks.length === 0, 'Should remove link from graph');
  
  // Test missing linkId
  const result2 = removeComponentIntentLink(graphState, {});
  
  console.assert(result2.success === false, 'Should fail without linkId');
  console.assert(result2.error.includes('linkId'), 'Error should mention linkId');
  
  // Test nonexistent link
  const result3 = removeComponentIntentLink(graphState, { linkId: 'nonexistent' });
  
  console.assert(result3.success === false, 'Should fail with nonexistent link');
  console.assert(result3.error.includes('not found'), 'Error should mention link not found');
  
  console.log('✓ removeComponentIntentLink tests passed');
}