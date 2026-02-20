# Code Header Templates

Standard JSDoc header templates for different file types in the Harmony Design System.

## Usage

Copy the appropriate template when creating a new file, then:

1. Replace `[placeholders]` with actual values
2. Verify the `@see` anchor exists in `DESIGN_SYSTEM.md`
3. Update the corresponding documentation section to reference your new file

## Available Templates

### [`core-module-template.js`](./core-module-template.js)
For core infrastructure modules (event-bus, type-navigator, etc.)

### [`bounded-context-template.js`](./bounded-context-template.js)
For bounded context implementations

### [`ui-component-template.js`](./ui-component-template.js)
For Web Components (primitives, molecules, organisms)

### [`wasm-bridge-template.js`](./wasm-bridge-template.js)
For JavaScript ↔ Rust WASM interfaces

### [`utility-template.js`](./utility-template.js)
For utility functions and helpers

## Quick Start

```bash
# Copy template
cp templates/code-headers/core-module-template.js core/my-new-module.js

# Edit and fill in placeholders
# Verify with validation script
npm run validate:doc-links
```

## Validation

All templates are validated by:
- [`scripts/validate-code-doc-links.js`](../../scripts/validate-code-doc-links.js)

Run validation:
```bash
npm run validate:doc-links
```

## Related Documentation

- [Code-to-Doc Reference Pattern](../../docs/code-to-doc-reference-pattern.md)
- [Quick Reference](../../docs/code-to-doc-quick-reference.md)
- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#code-to-doc-reference-pattern)