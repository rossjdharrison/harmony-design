# Harmony Schemas

JSON schemas and validation utilities for the Harmony Design System.

## Overview

This directory contains JSON Schema definitions for validating design tokens and other configuration files used throughout the Harmony Design System.

**Related Documentation:** See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) § Design Tokens

## Token Schema

The `token-schema.json` file defines the structure for design token files:

- **Color Tokens** - Color values with WCAG contrast information
- **Spacing Tokens** - Spacing values based on a grid system
- **Typography Tokens** - Font families, sizes, weights, and text styles
- **Generic Tokens** - Extensible format for custom token types

### Token File Structure

All token files must include:

```json
{
  "$schema": "../harmony-schemas/token-schema.json",
  "type": "color|spacing|typography|...",
  "version": "1.0.0",
  "tokens": {
    "token-name": {
      "value": "...",
      "description": "Human-readable description",
      "category": "..."
    }
  },
  "metadata": {
    "author": "...",
    "lastModified": "...",
    "source": "..."
  }
}
```

## Validation

### CLI Usage

Validate a single token file:

```bash
node validate-tokens.js ../tokens/colors.json
```

Validate all token files in a directory:

```bash
node validate-tokens.js ../tokens
```

### Programmatic Usage

```javascript
import { validateTokenFile, validateTokenDirectory } from './validate-tokens.js';

// Validate single file
const result = validateTokenFile('./tokens/colors.json');
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Validate directory
const dirResults = validateTokenDirectory('./tokens');
console.log(`${dirResults.validFiles}/${dirResults.totalFiles} files valid`);
```

## Example Files

- `tokens/colors.example.json` - Example color token file
- `tokens/spacing.example.json` - Example spacing token file

These files demonstrate proper token structure and can be used as templates.

## Schema Features

### Color Tokens

- Supports hex, rgb, rgba, hsl, hsla, and CSS variable formats
- Includes WCAG contrast ratio validation
- Categories: primary, secondary, accent, neutral, semantic, surface, text, border, state

### Spacing Tokens

- Supports px, rem, em, %, and CSS variable formats
- Optional `baseUnit` property for grid systems
- Categories: micro, small, medium, large, macro, layout, component

### Typography Tokens

- Supports string values, numeric values, or composite objects
- Categories: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textStyle

### Deprecation Support

All token types support deprecation:

```json
{
  "old-token": {
    "value": "...",
    "deprecated": true,
    "replaceWith": "new-token"
  }
}
```

## Integration

### Build Process

Token validation should be integrated into the build process:

```json
{
  "scripts": {
    "prebuild": "cd harmony-schemas && npm run validate:tokens"
  }
}
```

### CI/CD

Add token validation to CI pipeline to catch invalid tokens before merge.

### Dev Tools

The validation utility can be used in dev tools to provide real-time feedback when editing token files.

## Token Naming Conventions

- Use kebab-case for token names: `primary-500`, `space-4`
- Start with lowercase letter
- Only alphanumeric characters and hyphens
- Be descriptive and consistent

## Performance Considerations

- Token validation runs at build time only (not runtime)
- Validation uses Ajv (fastest JSON Schema validator)
- No impact on runtime performance or bundle size

## Future Enhancements

- [ ] Shadow token validation (tokens referencing other tokens)
- [ ] Token transformation validation (light/dark mode)
- [ ] Figma sync validation
- [ ] Token usage tracking and reporting