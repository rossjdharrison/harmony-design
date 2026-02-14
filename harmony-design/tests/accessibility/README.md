# Accessibility Testing

Automated accessibility testing using axe-core for all Harmony Design System components.

## Quick Start

1. Open `test-all-components.html` in Chrome
2. Click "Run All Tests" to test all components
3. Review results for violations and warnings

## Test Files

- `axe-setup.js` - Core axe-core configuration and utilities
- `component-test-runner.js` - Component testing infrastructure
- `test-all-components.html` - Interactive testing dashboard

## Usage in Development

```javascript
import { testComponent } from './component-test-runner.js';

// Test a single component
const button = document.createElement('button');
button.textContent = 'Click me';
button.setAttribute('aria-label', 'Action button');

const results = await testComponent('Button', button);
```

## Testing Component States

```javascript
import { testComponentStates } from './component-test-runner.js';

const states = [
  { name: 'default', setup: null },
  { name: 'disabled', setup: (el) => el.disabled = true },
  { name: 'focused', setup: (el) => el.focus() }
];

const results = await testComponentStates('Button', () => {
  return document.createElement('button');
}, states);
```

## CI Integration

Add to your test pipeline:

```bash
# Using a headless browser
python -m http.server 8000 &
# Run tests with headless Chrome
# Parse results and fail if violations found
```

## What Gets Tested

- ARIA roles and attributes
- Color contrast (4.5:1 minimum)
- Keyboard navigation
- Focus management
- Form labels and descriptions
- Semantic HTML structure
- Screen reader compatibility

## See Also

- [DESIGN_SYSTEM.md § Accessibility Testing](../../DESIGN_SYSTEM.md)
- [axe-core documentation](https://github.com/dequelabs/axe-core)