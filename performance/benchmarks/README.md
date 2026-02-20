# Performance Benchmarks

This directory contains benchmark scripts that enforce the Harmony Design System's absolute performance constraints.

## Performance Budgets

| Metric | Budget | Rationale |
|--------|--------|-----------|
| Render Time | 16ms/frame | 60fps requirement |
| WASM Memory | 50MB heap | Browser compatibility |
| Load Time | 200ms | User experience threshold |
| Audio Latency | 10ms | Real-time audio requirement |

## Benchmark Scripts

### Budget Enforcement

- **`budget-gate.js`** - Checks all results against budgets
- **`enforce-budgets.js`** - Final CI gate, fails build if violated
- **`generate-report.js`** - Creates HTML and markdown reports

### Individual Benchmarks

These scripts are referenced by the CI workflow but should also work locally:

- **`wasm-performance.js`** - Measures WASM execution performance
- **`wasm-memory-check.js`** - Profiles WASM heap usage
- **`gpu-benchmark-runner.js`** - Tests GPU compute and render performance
- **`render-budget-check.js`** - Validates frame time budgets
- **`audio-latency-check.js`** - Measures audio processing latency
- **`audio-budget-check.js`** - Validates audio latency budget
- **`load-time-check.js`** - Measures initial page load time
- **`load-budget-check.js`** - Validates load time budget

### Reporting

- **`update-history.js`** - Appends results to historical tracking

## Running Locally

```bash
# Run all benchmarks
node performance/benchmarks/budget-gate.js

# Run specific benchmark
node performance/benchmarks/wasm-memory-check.js

# Generate report from results
node performance/benchmarks/generate-report.js
```

Results are written to `performance/results/`.

## CI Integration

The benchmark workflow runs on:
- Push to `main` or `develop`
- Pull requests that modify performance-sensitive code
- Manual trigger via `workflow_dispatch`

See `.github/workflows/benchmark.yml` for the full pipeline.

## Adding New Benchmarks

1. Create benchmark script in this directory
2. Add job to `.github/workflows/benchmark.yml`
3. Update `budget-gate.js` to check new metric
4. Update `generate-report.js` to display new metric
5. Document in this README

## Performance History

Historical performance data is tracked in `performance/history/` (main branch only). This enables trend analysis and regression detection.