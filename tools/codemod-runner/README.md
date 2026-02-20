# Codemod Runner

AST transformation runner for bulk code updates across the Harmony Design System.

## Purpose

Automates code transformations using Abstract Syntax Tree (AST) manipulation to:
- Refactor components consistently
- Update API patterns across codebase
- Migrate deprecated patterns
- Enforce coding standards

## Usage

```bash
node tools/codemod-runner/run.js --transform=<transform-name> --path=<target-path>
```

### Examples

```bash
# Run a specific transform on components directory
node tools/codemod-runner/run.js --transform=update-event-pattern --path=components

# Dry run (preview changes without applying)
node tools/codemod-runner/run.js --transform=update-event-pattern --path=components --dry-run

# Run on specific file
node tools/codemod-runner/run.js --transform=add-jsdoc --path=components/Button.js
```

## Creating Transforms

See `transforms/` directory for examples. Each transform exports a function that receives AST and returns modified AST.

## Architecture

- **Parser**: Uses Acorn for JavaScript parsing
- **Transformer**: Applies registered transforms
- **Writer**: Outputs modified code
- **Reporter**: Logs changes and statistics

## Related Documentation

See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#codemod-runner) for integration details.