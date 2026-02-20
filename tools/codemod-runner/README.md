# Codemod Runner

AST transformation runner for bulk code updates across the Harmony Design System.

## Purpose

Automates code transformations using AST parsing and manipulation. Useful for:
- Migrating API patterns across components
- Adding/updating JSDoc comments
- Refactoring event patterns
- Updating import statements

## Usage

```bash
node tools/codemod-runner/cli.js --transform=<transform-name> --path=<target-path>
```

### Options

- `--transform`: Name of transform to run (from transforms/ directory)
- `--path`: Target file or directory path
- `--dry-run`: Preview changes without writing
- `--verbose`: Show detailed output

### Example

```bash
# Add JSDoc comments to all components
node tools/codemod-runner/cli.js --transform=add-jsdoc --path=components/

# Update event patterns (dry run)
node tools/codemod-runner/cli.js --transform=update-event-pattern --path=primitives/ --dry-run
```

## Creating Transforms

Create a new file in `tools/codemod-runner/transforms/`:

```javascript
/**
 * Transform description
 * @param {Object} ast - Parsed AST
 * @param {string} filePath - File being transformed
 * @returns {Object} Modified AST
 */
export function transform(ast, filePath) {
  // Modify AST here
  return ast;
}
```

## Architecture

- `cli.js` - Command line interface
- `src/runner.js` - Orchestrates transformation pipeline
- `src/parser.js` - Parses JavaScript to AST
- `src/writer.js` - Writes modified AST back to files
- `src/file-scanner.js` - Finds files to transform
- `src/transform-loader.js` - Loads transform modules
- `transforms/` - Individual transformation implementations

## Performance

- Processes files in parallel (max 4 concurrent)
- Skips unchanged files
- Memory efficient streaming for large codebases

See: harmony-design/DESIGN_SYSTEM.md#codemod-runner