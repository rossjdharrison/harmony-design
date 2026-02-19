/**
 * @fileoverview User Targeting - Target features based on user attributes
 * @module gates/user-targeting
 * 
 * Provides targeting rules to enable features for specific users based on:
 * - User IDs (whitelist/blacklist)
 * - User roles (admin, editor, viewer, etc.)
 * - User attributes (custom properties)
 * - Percentage-based rollout with user bucketing
 * - Compound rules (AND/OR combinations)
 * 
 * Related: {@link gates/feature-flag-context.js}, {@link gates/gradual-rollout.js}
 * Documentation: {@link ../../DESIGN_SYSTEM.md#user-targeting}
 */

/**
 * @typedef {Object} UserContext
 * @property {string} id - Unique user identifier
 * @property {string[]} [roles] - User roles (e.g., ['admin', 'editor'])
 * @property {Object<string, any>} [attributes] - Custom user attributes
 * @property {string} [email] - User email
 * @property {string} [organization] - Organization ID
 * @property {string[]} [permissions] - User permissions
 */

/**
 * @typedef {Object} TargetingRule
 * @property {'userId'|'role'|'attribute'|'percentage'|'compound'} type - Rule type
 * @property {any} value - Rule value (depends on type)
 * @property {'equals'|'contains'|'startsWith'|'endsWith'|'gt'|'lt'|'in'|'notIn'} [operator] - Comparison operator
 * @property {TargetingRule[]} [rules] - Sub-rules for compound type
 * @property {'AND'|'OR'} [combinator] - How to combine sub-rules
 */

/**
 * Hash function for consistent user bucketing
 * Uses simple string hash for deterministic bucketing
 * 
 * @param {string} str - String to hash
 * @returns {number} Hash value between 0 and 1
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash % 10000) / 10000;
}

/**
 * Evaluates a single targeting rule against user context
 * 
 * @param {TargetingRule} rule - Rule to evaluate
 * @param {UserContext} user - User context
 * @returns {boolean} True if rule matches
 */
function evaluateRule(rule, user) {
  if (!rule || !user) {
    return false;
  }

  switch (rule.type) {
    case 'userId':
      return evaluateUserIdRule(rule, user);
    
    case 'role':
      return evaluateRoleRule(rule, user);
    
    case 'attribute':
      return evaluateAttributeRule(rule, user);
    
    case 'percentage':
      return evaluatePercentageRule(rule, user);
    
    case 'compound':
      return evaluateCompoundRule(rule, user);
    
    default:
      console.warn(`[UserTargeting] Unknown rule type: ${rule.type}`);
      return false;
  }
}

/**
 * Evaluates user ID targeting rule
 * 
 * @param {TargetingRule} rule - Rule with userId type
 * @param {UserContext} user - User context
 * @returns {boolean} True if user ID matches
 */
function evaluateUserIdRule(rule, user) {
  const operator = rule.operator || 'in';
  const value = rule.value;

  switch (operator) {
    case 'equals':
      return user.id === value;
    
    case 'in':
      return Array.isArray(value) && value.includes(user.id);
    
    case 'notIn':
      return Array.isArray(value) && !value.includes(user.id);
    
    default:
      return false;
  }
}

/**
 * Evaluates role targeting rule
 * 
 * @param {TargetingRule} rule - Rule with role type
 * @param {UserContext} user - User context
 * @returns {boolean} True if user has required role
 */
function evaluateRoleRule(rule, user) {
  if (!user.roles || !Array.isArray(user.roles)) {
    return false;
  }

  const operator = rule.operator || 'in';
  const value = rule.value;

  switch (operator) {
    case 'equals':
      return user.roles.includes(value);
    
    case 'in':
      return Array.isArray(value) && value.some(role => user.roles.includes(role));
    
    case 'notIn':
      return Array.isArray(value) && !value.some(role => user.roles.includes(role));
    
    default:
      return false;
  }
}

/**
 * Evaluates custom attribute targeting rule
 * 
 * @param {TargetingRule} rule - Rule with attribute type
 * @param {UserContext} user - User context
 * @returns {boolean} True if attribute matches
 */
function evaluateAttributeRule(rule, user) {
  if (!user.attributes || !rule.value || !rule.value.key) {
    return false;
  }

  const attrValue = user.attributes[rule.value.key];
  const expectedValue = rule.value.value;
  const operator = rule.operator || 'equals';

  if (attrValue === undefined) {
    return false;
  }

  switch (operator) {
    case 'equals':
      return attrValue === expectedValue;
    
    case 'contains':
      return String(attrValue).includes(String(expectedValue));
    
    case 'startsWith':
      return String(attrValue).startsWith(String(expectedValue));
    
    case 'endsWith':
      return String(attrValue).endsWith(String(expectedValue));
    
    case 'gt':
      return Number(attrValue) > Number(expectedValue);
    
    case 'lt':
      return Number(attrValue) < Number(expectedValue);
    
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(attrValue);
    
    case 'notIn':
      return Array.isArray(expectedValue) && !expectedValue.includes(attrValue);
    
    default:
      return false;
  }
}

/**
 * Evaluates percentage-based targeting rule with user bucketing
 * Uses consistent hashing to ensure same user always gets same bucket
 * 
 * @param {TargetingRule} rule - Rule with percentage type
 * @param {UserContext} user - User context
 * @returns {boolean} True if user falls within percentage
 */
function evaluatePercentageRule(rule, user) {
  const percentage = Number(rule.value);
  
  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    console.warn(`[UserTargeting] Invalid percentage: ${rule.value}`);
    return false;
  }

  // Use user ID for consistent bucketing
  const bucket = hashString(user.id);
  return bucket <= (percentage / 100);
}

/**
 * Evaluates compound targeting rule (AND/OR combinations)
 * 
 * @param {TargetingRule} rule - Rule with compound type
 * @param {UserContext} user - User context
 * @returns {boolean} True if compound rule matches
 */
function evaluateCompoundRule(rule, user) {
  if (!rule.rules || !Array.isArray(rule.rules)) {
    return false;
  }

  const combinator = rule.combinator || 'AND';
  const results = rule.rules.map(subRule => evaluateRule(subRule, user));

  if (combinator === 'AND') {
    return results.every(result => result === true);
  } else if (combinator === 'OR') {
    return results.some(result => result === true);
  }

  return false;
}

/**
 * Checks if a feature is enabled for a specific user
 * 
 * @param {TargetingRule|TargetingRule[]} rules - Targeting rule(s)
 * @param {UserContext} user - User context
 * @returns {boolean} True if feature is enabled for user
 * 
 * @example
 * // Single rule
 * const enabled = isFeatureEnabledForUser(
 *   { type: 'role', operator: 'in', value: ['admin', 'editor'] },
 *   { id: 'user123', roles: ['admin'] }
 * );
 * 
 * @example
 * // Multiple rules (treated as AND)
 * const enabled = isFeatureEnabledForUser([
 *   { type: 'role', operator: 'equals', value: 'admin' },
 *   { type: 'attribute', operator: 'equals', value: { key: 'beta', value: true } }
 * ], user);
 * 
 * @example
 * // Compound rule with OR
 * const enabled = isFeatureEnabledForUser({
 *   type: 'compound',
 *   combinator: 'OR',
 *   rules: [
 *     { type: 'role', operator: 'equals', value: 'admin' },
 *     { type: 'percentage', value: 10 }
 *   ]
 * }, user);
 */
export function isFeatureEnabledForUser(rules, user) {
  if (!user || !user.id) {
    console.warn('[UserTargeting] Invalid user context - missing user.id');
    return false;
  }

  if (!rules) {
    return true; // No targeting rules = enabled for everyone
  }

  // Handle array of rules (implicit AND)
  if (Array.isArray(rules)) {
    return rules.every(rule => evaluateRule(rule, user));
  }

  // Handle single rule
  return evaluateRule(rules, user);
}

/**
 * Creates a user ID whitelist rule
 * 
 * @param {string[]} userIds - Array of user IDs to whitelist
 * @returns {TargetingRule} Targeting rule
 * 
 * @example
 * const rule = createUserIdWhitelist(['user1', 'user2', 'user3']);
 */
export function createUserIdWhitelist(userIds) {
  return {
    type: 'userId',
    operator: 'in',
    value: userIds
  };
}

/**
 * Creates a role-based targeting rule
 * 
 * @param {string|string[]} roles - Role(s) to target
 * @returns {TargetingRule} Targeting rule
 * 
 * @example
 * const rule = createRoleRule(['admin', 'editor']);
 */
export function createRoleRule(roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return {
    type: 'role',
    operator: 'in',
    value: roleArray
  };
}

/**
 * Creates a custom attribute targeting rule
 * 
 * @param {string} key - Attribute key
 * @param {any} value - Expected value
 * @param {string} [operator='equals'] - Comparison operator
 * @returns {TargetingRule} Targeting rule
 * 
 * @example
 * const rule = createAttributeRule('plan', 'premium');
 * const rule2 = createAttributeRule('signupDate', '2024-01', 'startsWith');
 */
export function createAttributeRule(key, value, operator = 'equals') {
  return {
    type: 'attribute',
    operator,
    value: { key, value }
  };
}

/**
 * Creates a percentage-based targeting rule
 * 
 * @param {number} percentage - Percentage of users (0-100)
 * @returns {TargetingRule} Targeting rule
 * 
 * @example
 * const rule = createPercentageRule(25); // 25% of users
 */
export function createPercentageRule(percentage) {
  return {
    type: 'percentage',
    value: percentage
  };
}

/**
 * Creates a compound targeting rule with multiple conditions
 * 
 * @param {TargetingRule[]} rules - Array of rules to combine
 * @param {'AND'|'OR'} [combinator='AND'] - How to combine rules
 * @returns {TargetingRule} Compound targeting rule
 * 
 * @example
 * const rule = createCompoundRule([
 *   createRoleRule('admin'),
 *   createAttributeRule('beta', true)
 * ], 'OR');
 */
export function createCompoundRule(rules, combinator = 'AND') {
  return {
    type: 'compound',
    combinator,
    rules
  };
}

/**
 * Validates a targeting rule structure
 * 
 * @param {TargetingRule} rule - Rule to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateTargetingRule(rule) {
  const errors = [];

  if (!rule || typeof rule !== 'object') {
    errors.push('Rule must be an object');
    return { valid: false, errors };
  }

  if (!rule.type) {
    errors.push('Rule must have a type');
  }

  const validTypes = ['userId', 'role', 'attribute', 'percentage', 'compound'];
  if (rule.type && !validTypes.includes(rule.type)) {
    errors.push(`Invalid rule type: ${rule.type}`);
  }

  if (rule.type === 'percentage') {
    const percentage = Number(rule.value);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      errors.push('Percentage must be between 0 and 100');
    }
  }

  if (rule.type === 'compound') {
    if (!rule.rules || !Array.isArray(rule.rules)) {
      errors.push('Compound rule must have rules array');
    }
    if (rule.combinator && !['AND', 'OR'].includes(rule.combinator)) {
      errors.push('Compound rule combinator must be AND or OR');
    }
  }

  if (rule.type === 'attribute' && (!rule.value || !rule.value.key)) {
    errors.push('Attribute rule must have value.key');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}