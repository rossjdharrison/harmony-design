# GitHub Actions CI/CD Workflows

This directory contains GitHub Actions workflows for the Harmony Design System.

## Workflows

### ci-build.yml
Main CI build pipeline that runs on every push and pull request.

**Jobs:**
1. **lint** - Code quality checks (ESLint, CSS lint, formatting)
2. **test** - Unit and component tests with coverage
3. **build** - Build JavaScript/CSS artifacts
4. **rust-build** - Build Rust bounded contexts to WASM
5. **quality-gates** - Bundle size, performance budgets, composition validation
6. **integration** - Integration and E2E tests
7. **summary** - Aggregate results and determine overall status

### bundle-size-check.yml
Monitors bundle size and enforces performance budgets.

### validate-composition.yml
Validates component composition rules and design system constraints.

## Required npm Scripts

For the CI pipeline to work fully, add these scripts to your package.json:

```json
{
  "scripts": {
    "lint:js": "eslint '**/*.js' --ignore-pattern 'node_modules/'",
    "lint:css": "stylelint '**/*.css'",
    "format:check": "prettier --check '**/*.{js,css,html,md}'",
    "test": "node scripts/run-tests.js",
    "test:components": "node scripts/test-components.js",
    "test:coverage": "node scripts/test-coverage.js",
    "test:integration": "node scripts/test-integration.js",
    "test:e2e": "node scripts/test-e2e.js",
    "build": "node scripts/build.js",
    "serve:test": "python -m http.server 8080",
    "check:bundle-size": "node scripts/check-bundle-size.js",
    "check:performance": "node scripts/check-performance.js",
    "validate:composition": "node scripts/validate-composition.js"
  }
}
```

## Performance Budgets

The CI pipeline enforces these budgets:
- **Render Budget:** 16ms per frame (60fps)
- **Memory Budget:** 50MB WASM heap
- **Load Budget:** 200ms initial load time
- **Audio Latency:** 10ms end-to-end

## Continuous Integration Flow

```
Push/PR → Lint → Test → Build (JS + Rust) → Quality Gates → Integration → Summary
```

All jobs must pass for the pipeline to succeed. Quality gates enforce:
- Bundle size limits
- Performance budgets
- Composition rules
- No technical debt introduction

## Local Development

Run CI checks locally before pushing:

```bash
# Lint
npm run lint:js
npm run lint:css

# Test
npm test
npm run test:components

# Build
npm run build

# Quality gates
npm run check:bundle-size
npm run validate:composition
```

## Artifacts

The pipeline produces artifacts retained for 7 days:
- **build-artifacts:** Compiled JavaScript/CSS in dist/
- **wasm-artifacts:** Compiled WASM modules from Rust bounded contexts

## Troubleshooting

**Job fails with "script not configured":**
- This is expected for new projects
- Add the corresponding npm script to package.json
- Scripts use `continue-on-error: true` during initial setup

**Rust build fails:**
- Ensure Cargo.toml exists in bounded-contexts/
- Check wasm32-unknown-unknown target is installed
- Verify wasm-pack is compatible with your Rust version

**Quality gates fail:**
- Review bundle-size-check.yml for size limits
- Check performance budgets in scripts/check-performance.js
- Validate composition rules match design system constraints