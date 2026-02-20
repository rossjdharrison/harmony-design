# Code-to-Doc Reference Pattern - Quick Reference

## TL;DR

Every `.js` file needs:

```javascript
/**
 * @fileoverview What this file does
 * @see {@link file://./DESIGN_SYSTEM.md#anchor Section Name}
 * @module path/to/this/file
 */
```

Every section in `DESIGN_SYSTEM.md` needs:

```markdown
## Section Name {#anchor}

**Implementation**: [`path/to/file.js`](./path/to/file.js)
```

## Common Anchors

| Topic | Anchor | Usage |
|-------|--------|-------|
| Event Bus | `#event-bus` | Core messaging system |
| Bounded Contexts | `#bounded-contexts` | BC files |
| Atomic Design | `#atomic-design` | UI components |
| WASM Architecture | `#wasm-architecture` | WASM bridges |
| Audio Processing | `#audio-processing` | Audio code |
| Primitives | `#primitives` | Primitive components |
| Molecules | `#molecules` | Molecule components |
| Organisms | `#organisms` | Organism components |
| Performance | `#performance` | Performance-critical code |
| Singleton Pattern | `#singleton-pattern` | Singleton implementations |

## Templates by File Type

### Core Module
```javascript
/**
 * @fileoverview [Purpose]
 * @see {@link file://./DESIGN_SYSTEM.md#[anchor] [Topic]}
 * @module core/[name]
 */
```

### Bounded Context
```javascript
/**
 * @fileoverview [Context Name] - [responsibility]
 * @see {@link file://./DESIGN_SYSTEM.md#bounded-contexts Bounded Contexts}
 * @see {@link file://./DESIGN_SYSTEM.md#[specific] [Specific Topic]}
 * @module bounded-contexts/[name]
 */
```

### UI Component
```javascript
/**
 * @fileoverview [Component Name] - [type] for [purpose]
 * @see {@link file://./DESIGN_SYSTEM.md#atomic-design Atomic Design}
 * @see {@link file://./DESIGN_SYSTEM.md#[level] [Level]}
 * @module components/[level]/[name]
 * @element harmony-[name]
 */
```

### Utility
```javascript
/**
 * @fileoverview [Utility purpose]
 * @see {@link file://./DESIGN_SYSTEM.md#[anchor] [Topic]}
 * @module utils/[name]
 */
```

## Validation

```bash
# Check all files
node scripts/validate-code-doc-links.js

# Expected output
✅ Valid files: 150
❌ Invalid files: 0
✅ All referenced files exist
🎉 All validations passed!
```

## Common Issues

### Missing @fileoverview
**Problem**: File has no `@fileoverview`  
**Fix**: Add JSDoc comment block at top of file

### Missing @see link
**Problem**: File has no `@see` link to DESIGN_SYSTEM.md  
**Fix**: Add `@see {@link file://./DESIGN_SYSTEM.md#anchor Topic}`

### Invalid anchor
**Problem**: `@see` references non-existent anchor  
**Fix**: Check DESIGN_SYSTEM.md for correct anchor, or add anchor if missing

### Broken reverse reference
**Problem**: DESIGN_SYSTEM.md links to non-existent file  
**Fix**: Update path or create referenced file

## Benefits

- 🔍 **Discoverability**: Navigate from code to concepts
- 📚 **Learning**: New developers see context immediately
- 🔗 **Traceability**: Track implementation to specification
- ✅ **Validation**: Automated checks prevent drift
- 🏗️ **Architecture**: Enforce documented patterns

## Related

- Full spec: [`docs/code-to-doc-reference-pattern.md`](./code-to-doc-reference-pattern.md)
- Templates: [`../templates/code-headers/`](../templates/code-headers/)
- Validator: [`../scripts/validate-code-doc-links.js`](../scripts/validate-code-doc-links.js)