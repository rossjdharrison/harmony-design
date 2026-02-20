# Codemod Transforms

Collection of AST transformations for the Harmony Design System.

## Available Transforms

### example-add-jsdoc
Adds JSDoc comments to functions missing documentation.

```bash
node tools/codemod-runner/run.js --transform=example-add-jsdoc --path=components
```

### example-update-event-pattern
Updates old event dispatch patterns to use EventBus.

```bash
node tools/codemod-runner/run.js --transform=example-update-event-pattern --path=components
```

## Creating Custom Transforms

A transform is a JavaScript module that exports a default function:

```javascript
export default function myTransform(ast, context) {
  let modified = false;
  
  // Walk the AST and make modifications
  walk(ast, {
    enter(node, parent) {
      // Your transformation logic
      if (shouldModify(node)) {
        modify(node);
        modified = true;
      }
    }
  });

  return {
    ast,
    modified
  };
}
```

### Transform Function Signature

- **ast**: The Abstract Syntax Tree (Acorn format)
- **context**: Object containing:
  - `filePath`: Path to the file being transformed
  - `source`: Original source code

### Return Value

Return an object with:
- **ast**: Modified AST
- **modified**: Boolean indicating if changes were made

## Best Practices

1. **Always return modified flag**: Prevents unnecessary file writes
2. **Preserve comments**: Use AST comments array when possible
3. **Handle edge cases**: Check for null/undefined before accessing properties
4. **Test thoroughly**: Use dry-run mode first
5. **Document patterns**: Add comments explaining what patterns you're matching

## Testing Transforms

```bash
# Dry run to preview changes
node tools/codemod-runner/run.js --transform=my-transform --path=test-file.js --dry-run

# Verbose output for debugging
node tools/codemod-runner/run.js --transform=my-transform --path=test-file.js --verbose --dry-run
```

## Common Patterns

### Finding Function Declarations

```javascript
if (node.type === 'FunctionDeclaration') {
  // Process function
}
```

### Finding Method Calls

```javascript
if (node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.name === 'methodName') {
  // Process method call
}
```

### Replacing Identifiers

```javascript
if (node.type === 'Identifier' && node.name === 'oldName') {
  node.name = 'newName';
  modified = true;
}
```

## Related Documentation

See [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md#codemod-runner) for integration details.