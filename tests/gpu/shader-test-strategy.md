# GPU Compute Shader Testing Strategy

## Overview

This document defines the testing strategy for WebGPU compute shaders in the Harmony Design System. It covers unit testing, integration testing, performance validation, and correctness verification for all GPU-accelerated graph operations.

**Vision Alignment**: GPU-First Audio processing requires validated compute shaders that meet strict performance and correctness requirements.

## Test Categories

### 1. Correctness Tests
Verify shader logic produces expected outputs for known inputs.

### 2. Performance Tests
Validate shaders meet performance budgets under various workloads.

### 3. Boundary Tests
Test edge cases, limits, and error conditions.

### 4. Integration Tests
Verify shader interop with WASM, CPU, and other shaders.

### 5. Regression Tests
Prevent performance and correctness regressions.

## Shader Coverage

### Edge Propagation Shader (`edge-propagation.wgsl`)
- **Purpose**: Cascade state changes through graph edges
- **Test Focus**: Correctness of state propagation, workgroup synchronization
- **Performance Target**: < 1ms for 10,000 edges

### Cross-Graph Cascade Shader (`cross-graph-cascade.wgsl`)
- **Purpose**: Propagate state across graph boundaries
- **Test Focus**: Cross-graph edge indexing, buffer synchronization
- **Performance Target**: < 2ms for 1,000 cross-graph edges

### Intent Availability Shader (`intent-availability.wgsl`)
- **Purpose**: Query node availability for intent matching
- **Test Focus**: Bitwise operations, parallel reduction
- **Performance Target**: < 0.5ms for 5,000 nodes

## Test Infrastructure

### Test Harness Components

1. **GPU Test Runner** (`gpu-test-runner.js`)
   - WebGPU device initialization
   - Buffer management and cleanup
   - Test isolation and sequencing

2. **Shader Test Case** (`shader-test-case.js`)
   - Input/output buffer setup
   - Expected result comparison
   - Performance measurement

3. **Test Data Generator** (`test-data-generator.js`)
   - Synthetic graph generation
   - Edge case data creation
   - Performance stress data

4. **Validation Utilities** (`validation-utils.js`)
   - Float comparison with epsilon
   - Buffer content verification
   - Performance metric validation

## Test Execution Flow

```
1. Initialize WebGPU device
2. Load shader module
3. Create test pipeline
4. For each test case:
   a. Generate or load test data
   b. Create input buffers
   c. Dispatch compute pass
   d. Read output buffers
   e. Validate results
   f. Measure performance
   g. Clean up resources
5. Report results
6. Destroy device
```

## Performance Budgets

| Shader | Workload | Budget | Critical |
|--------|----------|--------|----------|
| Edge Propagation | 1K edges | 0.2ms | No |
| Edge Propagation | 10K edges | 1.0ms | Yes |
| Edge Propagation | 100K edges | 8ms | No |
| Cross-Graph Cascade | 100 edges | 0.5ms | No |
| Cross-Graph Cascade | 1K edges | 2.0ms | Yes |
| Intent Availability | 1K nodes | 0.1ms | No |
| Intent Availability | 5K nodes | 0.5ms | Yes |
| Intent Availability | 10K nodes | 1.0ms | No |

**Critical** = Must pass for CI to succeed

## Correctness Test Patterns

### Pattern 1: Known Input/Output
```javascript
{
  name: "Simple cascade",
  input: { nodes: [1, 0, 0], edges: [[0,1], [1,2]] },
  expected: { nodes: [1, 1, 1] },
  tolerance: 0.0001
}
```

### Pattern 2: Property-Based
```javascript
{
  name: "Propagation is transitive",
  property: (input, output) => {
    // If A->B and B->C and A is active, then C must be active
    return verifyTransitivity(input, output);
  }
}
```

### Pattern 3: Invariant Checking
```javascript
{
  name: "State conservation",
  invariant: (input, output) => {
    // Total active states should not decrease
    return countActive(output) >= countActive(input);
  }
}
```

## Integration Test Scenarios

### Scenario 1: WASM ↔ GPU Roundtrip
1. Generate graph in WASM
2. Transfer to GPU buffers
3. Run shader
4. Transfer results back
5. Validate in WASM
6. **Verify**: No data corruption, correct results

### Scenario 2: Multi-Shader Pipeline
1. Run intent-availability shader
2. Use results as input to edge-propagation shader
3. Verify pipeline correctness
4. **Verify**: Correct composition, no buffer conflicts

### Scenario 3: Concurrent Shader Execution
1. Dispatch multiple shaders in parallel
2. Verify correct synchronization
3. **Verify**: No race conditions, correct results

## Boundary Test Cases

### Memory Limits
- Empty graph (0 nodes, 0 edges)
- Single node, no edges
- Maximum buffer size (device limits)
- Odd workgroup sizes

### Numerical Edge Cases
- All zeros
- All ones
- Float precision boundaries
- NaN and Infinity handling

### Topology Edge Cases
- Disconnected components
- Cycles
- Self-loops
- Dense vs. sparse graphs

## Regression Test Protocol

### On Every Shader Change
1. Run full correctness suite
2. Run critical performance tests
3. Compare against baseline
4. Flag regressions > 5%

### Baseline Update Criteria
- Intentional optimization
- Algorithm change
- Reviewed and approved
- New baseline committed to repo

## CI Integration

### Pre-Commit Hook
- Lint shader files
- Validate WGSL syntax

### PR Validation
- Run correctness tests (all)
- Run critical performance tests
- Compare against main branch baseline
- Block merge if critical tests fail

### Nightly Build
- Full test suite (all shaders, all cases)
- Extended performance profiling
- Generate performance report
- Update performance dashboard

## Test Data Management

### Synthetic Data
- Generated on-demand
- Parameterized by size, density, topology
- Deterministic (seeded RNG)

### Real-World Data
- Captured from production scenarios
- Anonymized and committed to repo
- Used for integration and regression tests

### Stress Test Data
- Maximum sizes
- Pathological topologies
- Designed to expose limits

## Debugging Failed Tests

### Capture Artifacts
- Input buffers (raw bytes)
- Output buffers (raw bytes)
- Shader source
- Pipeline configuration
- Performance metrics

### Visualization Tools
- Buffer content viewer
- Graph topology visualizer
- Execution timeline
- Performance flame graph

### Reproduction Steps
1. Save test case to file
2. Document environment (GPU, driver, browser)
3. Create minimal reproduction
4. File issue with artifacts

## Performance Profiling

### Metrics Collected
- Dispatch time (CPU)
- Execution time (GPU)
- Buffer transfer time
- Total end-to-end time
- Memory usage

### Profiling Tools
- Chrome DevTools Performance panel
- WebGPU timestamp queries
- Custom performance markers
- Benchmark suite integration

## Test Maintenance

### Quarterly Review
- Evaluate test coverage
- Update performance baselines
- Add new test cases
- Remove obsolete tests

### On New Shader Addition
- Create correctness tests
- Add performance benchmarks
- Update this document
- Add CI integration

## Related Documentation

- [GPU Synchronization Specification](../../harmony-graph/docs/gpu-synchronization.md)
- [GPU Benchmark Suite](../../performance/gpu-benchmark-suite.js)
- [WASM-GPU Bridge](../../harmony-graph/wasm-gpu-bridge.js)
- [Shader Source Files](../../harmony-graph/shaders/)

## Implementation Checklist

- [x] Strategy document created
- [ ] GPU test runner implemented
- [ ] Shader test case framework implemented
- [ ] Test data generator implemented
- [ ] Validation utilities implemented
- [ ] Correctness tests for edge-propagation.wgsl
- [ ] Correctness tests for cross-graph-cascade.wgsl
- [ ] Correctness tests for intent-availability.wgsl
- [ ] Performance tests integrated with benchmark suite
- [ ] CI pipeline integration
- [ ] Documentation in DESIGN_SYSTEM.md