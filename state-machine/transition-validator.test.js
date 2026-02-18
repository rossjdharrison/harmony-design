/**
 * @fileoverview Tests for transition validator
 * Validates prerequisite checking for state transitions
 */

import {
  validateTransition,
  getTransitionPrerequisites,
  getPossibleTransitions,
  validateTransitionSequence
} from './transition-validator.js';

/**
 * Test suite for transition validation
 */
export function runTransitionValidatorTests() {
  console.group('TransitionValidator Tests');

  // Test 1: Valid draft to design_complete transition
  {
    const context = {
      component_name: 'Button',
      component_type: 'primitive',
      design_spec: 'button.pen'
    };
    const result = validateTransition('draft', 'design_complete', context);
    console.assert(result.valid === true, 'Valid draft→design_complete should pass');
    console.assert(result.errors.length === 0, 'Should have no errors');
  }

  // Test 2: Invalid draft to design_complete (missing design_spec)
  {
    const context = {
      component_name: 'Button',
      component_type: 'primitive'
    };
    const result = validateTransition('draft', 'design_complete', context);
    console.assert(result.valid === false, 'Missing design_spec should fail');
    console.assert(result.errors.length > 0, 'Should have errors');
  }

  // Test 3: Valid in_progress to code_review transition
  {
    const context = {
      component_name: 'Button',
      implementation_file: 'button.js',
      domain_links: ['AudioFile', 'Track'],
      intent_links: ['Play', 'Stop']
    };
    const result = validateTransition('in_progress', 'code_review', context);
    console.assert(result.valid === true, 'Valid in_progress→code_review should pass');
  }

  // Test 4: Invalid in_progress to code_review (missing links)
  {
    const context = {
      component_name: 'Button',
      implementation_file: 'button.js',
      domain_links: [],
      intent_links: []
    };
    const result = validateTransition('in_progress', 'code_review', context);
    console.assert(result.valid === false, 'Missing links should fail');
    console.assert(result.errors.some(e => e.includes('domain_links')), 'Should mention domain_links');
    console.assert(result.errors.some(e => e.includes('intent_links')), 'Should mention intent_links');
  }

  // Test 5: Valid testing to complete transition
  {
    const context = {
      component_name: 'Button',
      implementation_file: 'button.js',
      tests_passed: true,
      chrome_tested: true,
      states_verified: true,
      performance_validated: true,
      domain_links: ['AudioFile'],
      intent_links: ['Play'],
      ui_links: ['PlayerControls']
    };
    const result = validateTransition('testing', 'complete', context);
    console.assert(result.valid === true, 'Valid testing→complete should pass');
  }

  // Test 6: Invalid testing to complete (policy violations)
  {
    const context = {
      component_name: 'Button',
      implementation_file: 'button.js',
      tests_passed: true,
      chrome_tested: false, // Policy #10 violation
      states_verified: false, // Policy #11 violation
      performance_validated: false, // Policy #12 violation
      domain_links: ['AudioFile'],
      intent_links: ['Play'],
      ui_links: ['PlayerControls']
    };
    const result = validateTransition('testing', 'complete', context);
    console.assert(result.valid === false, 'Policy violations should fail');
    console.assert(result.errors.some(e => e.includes('Chrome')), 'Should mention Chrome testing');
    console.assert(result.errors.some(e => e.includes('states')), 'Should mention state verification');
    console.assert(result.errors.some(e => e.includes('performance')), 'Should mention performance');
  }

  // Test 7: Unknown transition
  {
    const result = validateTransition('unknown_state', 'another_state', {});
    console.assert(result.valid === false, 'Unknown transition should fail');
    console.assert(result.errors[0].includes('Unknown transition'), 'Should indicate unknown transition');
  }

  // Test 8: Get prerequisites
  {
    const prereqs = getTransitionPrerequisites('draft', 'design_complete');
    console.assert(prereqs !== null, 'Should return prerequisites');
    console.assert(prereqs.requiredFields.includes('design_spec'), 'Should include design_spec');
  }

  // Test 9: Get possible transitions
  {
    const transitions = getPossibleTransitions('draft');
    console.assert(transitions.includes('design_complete'), 'Should include design_complete');
  }

  // Test 10: Validate transition sequence
  {
    const sequence = [
      {
        from: 'draft',
        to: 'design_complete',
        context: { component_name: 'Button', component_type: 'primitive', design_spec: 'button.pen' }
      },
      {
        from: 'design_complete',
        to: 'in_progress',
        context: { component_name: 'Button', component_type: 'primitive', design_spec: 'button.pen', assigned_to: 'dev1' }
      }
    ];
    const result = validateTransitionSequence(sequence);
    console.assert(result.valid === true, 'Valid sequence should pass');
  }

  // Test 11: Invalid transition sequence
  {
    const sequence = [
      {
        from: 'draft',
        to: 'design_complete',
        context: { component_name: 'Button' } // Missing required fields
      }
    ];
    const result = validateTransitionSequence(sequence);
    console.assert(result.valid === false, 'Invalid sequence should fail');
  }

  console.groupEnd();
  console.log('✓ All TransitionValidator tests completed');
}

// Auto-run tests if loaded directly
if (typeof window !== 'undefined') {
  runTransitionValidatorTests();
}