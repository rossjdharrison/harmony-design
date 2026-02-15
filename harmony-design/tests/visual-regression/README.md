# Visual Regression Testing Suite

This suite captures and compares screenshots of UI components to detect unintended visual changes.

## Architecture

- **Python-based**: Uses pytest + Playwright for browser automation (policy-compliant)
- **Chrome-only**: Tests run in Chrome as per policy requirement
- **Snapshot storage**: Baseline images stored in `snapshots/baseline/`
- **Diff output**: Comparison results in `snapshots/diffs/`

## Usage

```bash
# Install dependencies (dev only)
pip install -r tests/visual-regression/requirements.txt

# Run all visual tests
pytest tests/visual-regression/

# Update baselines (after intentional design changes)
pytest tests/visual-regression/ --update-baselines

# Run specific component tests
pytest tests/visual-regression/test_primitives.py
```

## Test Structure

Each component is tested in all required states:
- Default
- Hover
- Focus
- Active
- Disabled
- Error (if applicable)
- Loading (if applicable)
- Empty (if applicable)

## Performance Validation

Tests also validate:
- 60fps animation performance
- 16ms render budget compliance
- Memory usage within 50MB budget

See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#visual-regression-testing) for integration details.