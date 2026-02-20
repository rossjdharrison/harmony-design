# Storybook Test Runner

Automated test execution for all Storybook stories in the Harmony Design System.

## Overview

The Storybook Test Runner validates that all component stories meet quality standards:

- **Accessibility**: All stories pass axe-core accessibility checks
- **Performance**: Components render within 16ms budget (60fps target)
- **Functionality**: Components work without console errors
- **EventBus Integration**: Components properly integrate with EventBus when required

## Usage

### Run All Tests

```bash
node tests/storybook/runner.js
```

### Run Specific Stories

```bash
node tests/storybook/runner.js --grep="Button"
```

### Run in Headed Mode (Debug)

```bash
node tests/storybook/runner.js --headed
```

### Custom Storybook URL

```bash
node tests/storybook/runner.js --url=http://localhost:9009
```

## Prerequisites

1. **Storybook must be running**:
   ```bash
   npm run storybook
   ```

2. **Playwright must be installed**:
   ```bash
   npm install -D playwright
   ```

## Test Coverage

The runner automatically tests:

- ✅ All stories in `.stories.js` files
- ✅ Accessibility violations (WCAG 2.1 AA)
- ✅ Console errors and warnings
- ✅ Performance budgets (16ms render, 50MB memory)
- ✅ EventBus availability when required
- ✅ Shadow DOM encapsulation

## Configuration

Edit `tests/storybook/test-runner.config.js` to customize:

- Browser launch options
- Timeout values
- Tags to include/exclude
- Pre/post visit hooks

## Story Parameters

Add parameters to your stories to control test behavior:

```javascript
export default {
  title: 'Components/Button',
  parameters: {
    requiresEventBus: true, // Verify EventBus is available
    skipA11y: false,        // Skip accessibility tests
    performanceBudget: {    // Custom performance budgets
      renderTime: 16,
      memory: 50 * 1024 * 1024,
    },
  },
};
```

## CI Integration

The test runner is designed for CI environments:

```yaml
- name: Run Storybook Tests
  run: |
    npm run storybook:build
    npx http-server storybook-static -p 6006 &
    node tests/storybook/runner.js
```

## Mandatory Rules Compliance

This test runner enforces:

- **Mandatory Rule #10**: All UI components tested in Chrome
- **Mandatory Rule #11**: All states verified (default, hover, focus, active, disabled)
- **Mandatory Rule #16**: EventBus availability checked
- **Mandatory Rule #17**: EventBus errors logged with context
- **Absolute Constraint #1**: 16ms render budget enforced
- **Absolute Constraint #2**: 50MB memory budget enforced

## Troubleshooting

### Storybook not found

Ensure Storybook is running on the correct port (default: 6006).

### Tests timing out

Increase timeout in `test-runner.config.js` or check for slow-loading stories.

### Performance budget failures

Review component implementation for optimization opportunities. Check:
- Excessive DOM operations
- Unoptimized animations
- Memory leaks
- Large bundle sizes

## Related Documentation

See `DESIGN_SYSTEM.md` § Testing Infrastructure for complete testing strategy.