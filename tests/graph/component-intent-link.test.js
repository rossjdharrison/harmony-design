/**
 * @fileoverview Tests for Component Intent Link
 * 
 * @module harmony-design/tests/graph/component-intent-link.test
 */

import { 
  createComponentIntentLink, 
  updateComponentIntentLink, 
  validateComponentIntentLink 
} from '../../src/graph/component-intent-link.js';

/**
 * Runs all component intent link tests.
 */
export function runComponentIntentLinkTests() {
  console.group('Component Intent Link Tests');
  
  testCreateComponentIntentLink();
  testUpdateComponentIntentLink();
  testValidateComponentIntentLink();
  
  console.groupEnd();
}

function testCreateComponentIntentLink() {
  console.log('Testing createComponentIntentLink...');
  
  const link = createComponentIntentLink('button-1', 'submit-form', {
    triggerMechanism: 'click',
    isPrimary: true,
    defaultPayload: { formId: 'main-form' },
    conditions: ['form-valid']
  });
  
  console.assert(link.id, 'Link should have an id');
  console.assert(link.componentId === 'button-1', 'componentId should match');
  console.assert(link.intentId === 'submit-form', 'intentId should match');
  console.assert(link.triggerMechanism === 'click', 'triggerMechanism should match');
  console.assert(link.isPrimary === true, 'isPrimary should be true');
  console.assert(link.defaultPayload.formId === 'main-form', 'defaultPayload should match');
  console.assert(link.conditions.length === 1, 'Should have one condition');
  
  console.log('✓ createComponentIntentLink tests passed');
}

function testUpdateComponentIntentLink() {
  console.log('Testing updateComponentIntentLink...');
  
  const link = createComponentIntentLink('button-1', 'submit-form', {
    triggerMechanism: 'click',
    isPrimary: false
  });
  
  const updated = updateComponentIntentLink(link, {
    isPrimary: true,
    conditions: ['enabled']
  });
  
  console.assert(updated.id === link.id, 'ID should be preserved');
  console.assert(updated.componentId === link.componentId, 'componentId should be preserved');
  console.assert(updated.intentId === link.intentId, 'intentId should be preserved');
  console.assert(updated.isPrimary === true, 'isPrimary should be updated');
  console.assert(updated.conditions.length === 1, 'conditions should be updated');
  console.assert(updated.updatedAt >= link.updatedAt, 'updatedAt should be newer or equal');
  
  console.log('✓ updateComponentIntentLink tests passed');
}

function testValidateComponentIntentLink() {
  console.log('Testing validateComponentIntentLink...');
  
  const validLink = createComponentIntentLink('button-1', 'submit-form', {
    triggerMechanism: 'click'
  });
  
  const validation1 = validateComponentIntentLink(validLink);
  console.assert(validation1.valid === true, 'Valid link should pass validation');
  console.assert(validation1.errors.length === 0, 'Valid link should have no errors');
  
  const invalidLink = {
    id: 'test',
    componentId: 'button-1',
    // Missing intentId
    triggerMechanism: 'click',
    isPrimary: 'not-a-boolean' // Wrong type
  };
  
  const validation2 = validateComponentIntentLink(invalidLink);
  console.assert(validation2.valid === false, 'Invalid link should fail validation');
  console.assert(validation2.errors.length > 0, 'Invalid link should have errors');
  
  console.log('✓ validateComponentIntentLink tests passed');
}