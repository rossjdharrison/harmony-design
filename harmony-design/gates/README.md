# Quality Gates

Quality gates ensure components meet Harmony Design System standards before deployment.

## Gate Categories

### Performance Gates
- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap
- **Load Budget**: 200ms initial load time

### Accessibility Gates
- **ARIA Attributes**: Required role or label
- **Keyboard Navigation**: All interactive elements focusable
- **Color Contrast**: WCAG AA standard (4.5:1 minimum)

### Architecture Gates
- **No Forbidden Imports**: No npm runtime dependencies
- **Shadow DOM Required**: All components use shadow DOM
- **EventBus Pattern**: Components use EventBus, not direct BC calls

## Usage

### Running All Gates

\`\`\`javascript
import { GateRunner } from './gates/gate-runner.js';

const runner = new GateRunner();
const report = await runner.runAll({
  element: document.querySelector('my-component'),
  sourceCode: componentSource,
  metrics: {
    renderTime: 12,
    memoryMB: 35,
    loadTime: 150
  },
  colors: {
    foreground: '#000000',
    background: '#ffffff'
  }
});

if (!report.passed) {
  console.error('Quality gates failed:', report.failures);
}
\`\`\`

### Running Specific Gate Categories

\`\`\`javascript
// Performance only
const perfReport = runner.runPerformance({
  renderTime: 12,
  memoryMB: 35,
  loadTime: 150
});

// Accessibility only
const a11yReport = runner.runAccessibility(element, {
  foreground: '#000000',
  background: '#ffffff'
});

// Architecture only
const archReport = runner.runArchitecture(sourceCode, element);
\`\`\`

## Integration with CI

Quality gates should run in CI before deployment:

\`\`\`yaml
- name: Run Quality Gates
  run: npm run test:gates
\`\`\`

See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#quality-gates) for complete documentation.