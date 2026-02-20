/**
 * @fileoverview Plugin Lifecycle Validation
 * Validates lifecycle hook implementations and state transitions
 * 
 * @module core/plugin-lifecycle-validator
 * @see DESIGN_SYSTEM.md#plugin-lifecycle-hooks
 */

/**
 * Validate lifecycle hooks object
 * @param {Object} hooks - Hooks object to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateLifecycleHooks(hooks) {
  const errors = [];
  
  if (!hooks || typeof hooks !== 'object') {
    errors.push('Hooks must be an object');
    return { valid: false, errors };
  }

  const validHooks = ['onLoad', 'onUnload', 'onActivate', 'onDeactivate'];
  const providedHooks = Object.keys(hooks);

  // Check for unknown hooks
  for (const hook of providedHooks) {
    if (!validHooks.includes(hook)) {
      errors.push(`Unknown lifecycle hook: ${hook}`);
    }
  }

  // Validate hook functions
  for (const hook of validHooks) {
    if (hooks[hook] !== undefined) {
      if (typeof hooks[hook] !== 'function') {
        errors.push(`Hook ${hook} must be a function, got ${typeof hooks[hook]}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate lifecycle state transition
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateStateTransition(fromState, toState) {
  const validTransitions = {
    'unloaded': ['loaded'],
    'loaded': ['active', 'inactive', 'unloaded'],
    'active': ['inactive', 'unloaded'],
    'inactive': ['active', 'unloaded'],
    'error': ['unloaded']
  };

  const allowedTransitions = validTransitions[fromState];
  
  if (!allowedTransitions) {
    return {
      valid: false,
      error: `Unknown state: ${fromState}`
    };
  }

  if (!allowedTransitions.includes(toState)) {
    return {
      valid: false,
      error: `Invalid transition from ${fromState} to ${toState}. Allowed: ${allowedTransitions.join(', ')}`
    };
  }

  return { valid: true, error: null };
}

/**
 * Check if a plugin can be activated
 * @param {Object} state - Current plugin state
 * @returns {{canActivate: boolean, reason: string|null}}
 */
export function canActivate(state) {
  if (!state) {
    return { canActivate: false, reason: 'Plugin state not found' };
  }

  if (state.status === 'unloaded') {
    return { canActivate: false, reason: 'Plugin must be loaded before activation' };
  }

  if (state.status === 'active') {
    return { canActivate: false, reason: 'Plugin is already active' };
  }

  if (state.status === 'error') {
    return { canActivate: false, reason: 'Plugin is in error state' };
  }

  return { canActivate: true, reason: null };
}

/**
 * Check if a plugin can be deactivated
 * @param {Object} state - Current plugin state
 * @returns {{canDeactivate: boolean, reason: string|null}}
 */
export function canDeactivate(state) {
  if (!state) {
    return { canDeactivate: false, reason: 'Plugin state not found' };
  }

  if (state.status !== 'active') {
    return { canDeactivate: false, reason: 'Plugin is not active' };
  }

  return { canDeactivate: true, reason: null };
}