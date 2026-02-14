/**
 * @fileoverview Transition validation for state machine state changes
 * Checks prerequisites before allowing transitions between states
 * @see harmony-design/DESIGN_SYSTEM.md#state-machine-validation
 */

/**
 * Validation result for a state transition
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the transition is valid
 * @property {string[]} errors - List of validation errors (empty if valid)
 * @property {string[]} warnings - List of warnings (non-blocking)
 */

/**
 * Prerequisites for state transitions
 * Maps each transition to required conditions
 */
const TRANSITION_PREREQUISITES = {
  'draft_to_design_complete': {
    requiredFields: ['component_name', 'component_type', 'design_spec'],
    requiredLinks: [],
    checks: [
      {
        name: 'design_spec_exists',
        message: 'Design specification file must exist',
        validate: (context) => context.design_spec && context.design_spec.length > 0
      }
    ]
  },
  'design_complete_to_in_progress': {
    requiredFields: ['component_name', 'component_type', 'design_spec', 'assigned_to'],
    requiredLinks: [],
    checks: [
      {
        name: 'assignee_set',
        message: 'Component must be assigned to a developer',
        validate: (context) => context.assigned_to && context.assigned_to.length > 0
      }
    ]
  },
  'in_progress_to_code_review': {
    requiredFields: ['component_name', 'implementation_file'],
    requiredLinks: ['domain_links', 'intent_links'],
    checks: [
      {
        name: 'implementation_exists',
        message: 'Implementation file must exist',
        validate: (context) => context.implementation_file && context.implementation_file.length > 0
      },
      {
        name: 'has_domain_links',
        message: 'Component must have at least one domain link',
        validate: (context) => context.domain_links && context.domain_links.length > 0
      },
      {
        name: 'has_intent_links',
        message: 'Component must have at least one intent link',
        validate: (context) => context.intent_links && context.intent_links.length > 0
      }
    ]
  },
  'code_review_to_testing': {
    requiredFields: ['component_name', 'implementation_file', 'review_approved'],
    requiredLinks: ['domain_links', 'intent_links', 'ui_links'],
    checks: [
      {
        name: 'review_approved',
        message: 'Code review must be approved',
        validate: (context) => context.review_approved === true
      },
      {
        name: 'has_ui_links',
        message: 'Component must document where it is used in UI',
        validate: (context) => context.ui_links && context.ui_links.length > 0
      }
    ]
  },
  'testing_to_complete': {
    requiredFields: ['component_name', 'implementation_file', 'tests_passed'],
    requiredLinks: ['domain_links', 'intent_links', 'ui_links'],
    checks: [
      {
        name: 'tests_passed',
        message: 'All tests must pass',
        validate: (context) => context.tests_passed === true
      },
      {
        name: 'chrome_tested',
        message: 'Component must be tested in Chrome (Policy #10)',
        validate: (context) => context.chrome_tested === true
      },
      {
        name: 'all_states_verified',
        message: 'All component states must be verified (Policy #11)',
        validate: (context) => context.states_verified === true
      },
      {
        name: 'performance_validated',
        message: 'Performance must meet budgets: 16ms render, 50MB memory (Policy #12)',
        validate: (context) => context.performance_validated === true
      }
    ]
  }
};

/**
 * Validates whether a state transition can occur
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @param {Object} context - Context object containing component data
 * @returns {ValidationResult} Validation result with errors and warnings
 */
export function validateTransition(fromState, toState, context) {
  const transitionKey = `${fromState}_to_${toState}`;
  const prerequisites = TRANSITION_PREREQUISITES[transitionKey];

  if (!prerequisites) {
    return {
      valid: false,
      errors: [`Unknown transition: ${fromState} → ${toState}`],
      warnings: []
    };
  }

  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of prerequisites.requiredFields) {
    if (!context[field] || context[field] === null || context[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check required links
  for (const linkType of prerequisites.requiredLinks) {
    if (!context[linkType] || !Array.isArray(context[linkType]) || context[linkType].length === 0) {
      errors.push(`Missing required links: ${linkType}`);
    }
  }

  // Run custom validation checks
  for (const check of prerequisites.checks) {
    try {
      const result = check.validate(context);
      if (!result) {
        errors.push(check.message);
      }
    } catch (error) {
      errors.push(`Validation check failed: ${check.name} - ${error.message}`);
    }
  }

  // Add warnings for optional but recommended fields
  if (toState === 'complete' && !context.documentation_updated) {
    warnings.push('Documentation update recommended before marking complete (Policy #19)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Gets the prerequisites for a specific transition
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {Object|null} Prerequisites object or null if transition unknown
 */
export function getTransitionPrerequisites(fromState, toState) {
  const transitionKey = `${fromState}_to_${toState}`;
  return TRANSITION_PREREQUISITES[transitionKey] || null;
}

/**
 * Lists all possible transitions from a given state
 * @param {string} state - Current state
 * @returns {string[]} Array of possible target states
 */
export function getPossibleTransitions(state) {
  const transitions = [];
  for (const key in TRANSITION_PREREQUISITES) {
    const [fromState, toState] = key.split('_to_');
    if (fromState === state) {
      transitions.push(toState);
    }
  }
  return transitions;
}

/**
 * Validates multiple transitions in sequence
 * @param {Array<{from: string, to: string, context: Object}>} transitions - Array of transitions
 * @returns {ValidationResult} Combined validation result
 */
export function validateTransitionSequence(transitions) {
  const allErrors = [];
  const allWarnings = [];

  for (let i = 0; i < transitions.length; i++) {
    const { from, to, context } = transitions[i];
    const result = validateTransition(from, to, context);
    
    if (!result.valid) {
      allErrors.push(`Transition ${i + 1} (${from} → ${to}): ${result.errors.join(', ')}`);
    }
    
    allWarnings.push(...result.warnings.map(w => `Transition ${i + 1}: ${w}`));
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}