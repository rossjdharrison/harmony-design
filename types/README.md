# Type Definitions

TypeScript type definitions for the Harmony Design System.

## Overview

This directory contains `.d.ts` files that provide TypeScript type definitions and autocomplete support for the design system's JavaScript code.

## Usage

### In TypeScript Files

\`\`\`typescript
import type { FeatureFlagKey, FeatureFlag } from '../types/feature-flags';

const flag: FeatureFlagKey = 'new-ui';
\`\`\`

### In JavaScript Files (with JSDoc)

\`\`\`javascript
/**
 * @typedef {import('../types/feature-flags').FeatureFlagKey} FeatureFlagKey
 * @typedef {import('../types/feature-flags').FeatureFlag} FeatureFlag
 */

/**
 * @param {FeatureFlagKey} key
 * @returns {boolean}
 */
function checkFeature(key) {
  // TypeScript will provide autocomplete for 'key'
}
\`\`\`

### In VS Code

The types automatically provide autocomplete when you:
1. Import the types via JSDoc
2. Use the typed parameters in your functions
3. Access properties on typed objects

## Available Types

### Feature Flags

- `FeatureFlagKey` - Union type of all valid feature flag keys
- `FeatureFlag` - Feature flag configuration object
- `FeatureFlagConfig` - Map of flag keys to configurations
- `FeatureFlagContextValue` - Context value interface
- `FeatureGateProps` - Feature gate component props
- `UseFeatureFlagReturn` - Hook return type
- `FeatureFlagEvent` - Event payload interface
- `FeatureFlagStorage` - Storage interface
- `FeatureFlagOverride` - Testing override interface
- `FeatureFlagAnalytics` - Analytics event interface

## Adding New Types

1. Create a new `.d.ts` file in this directory
2. Export types from `index.d.ts`
3. Add corresponding runtime validation in `.js` file
4. Update this README with the new types

## Type Guards

Runtime type guards are available in the corresponding `.js` files:

- `isFeatureFlagKey(key)` - Check if string is valid flag key
- `isFeatureFlag(obj)` - Check if object is valid flag
- `isValidFeatureFlagConfig(config)` - Validate flag configuration

## Performance

Type definitions have zero runtime cost - they are stripped during compilation and only used for development-time checking and autocomplete.

## See Also

- [Feature Flags Documentation](../DESIGN_SYSTEM.md#feature-flags)
- [Feature Flag Context](../contexts/feature-flag-context.js)
- [useFeatureFlag Hook](../hooks/use-feature-flag.js)
- [Feature Gate Component](../gates/feature-gate.js)