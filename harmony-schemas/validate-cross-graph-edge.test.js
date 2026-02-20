/**
 * Tests for Cross-Graph Edge Validator
 * 
 * Run with: node harmony-schemas/validate-cross-graph-edge.test.js
 * 
 * @module harmony-schemas/validate-cross-graph-edge.test
 */

import { validateCrossGraphEdge, validateCrossGraphEdges, createDefaultEdge } from './validate-cross-graph-edge.js';

/**
 * Simple test runner
 */
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    try {
      fn();
      this.passed++;
      console.log(`✓ ${name}`);
    } catch (error) {
      this.failed++;
      console.error(`✗ ${name}`);
      console.error(`  ${error.message}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  summary() {
    console.log('\n' + '='.repeat(50));
    console.log(`Tests: ${this.passed + this.failed}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log('='.repeat(50));
    return this.failed === 0;
  }
}

const runner = new TestRunner();

// Test valid edge
runner.test('Valid edge passes validation', () => {
  const edge = {
    id: 'test-edge',
    sourceGraph: 'ui',
    sourceNode: 'button-1',
    targetGraph: 'audio',
    targetNode: 'player-1',
    edgeType: 'event',
    dataType: 'event',
    latencyBudget: 5,
    indexed: true
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(result.valid, 'Edge should be valid');
  runner.assert(result.errors.length === 0, 'Should have no errors');
});

// Test missing required fields
runner.test('Missing required fields fails validation', () => {
  const edge = {
    id: 'test-edge'
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(!result.valid, 'Edge should be invalid');
  runner.assert(result.errors.length > 0, 'Should have errors');
});

// Test invalid graph context
runner.test('Invalid graph context fails validation', () => {
  const edge = {
    id: 'test-edge',
    sourceGraph: 'invalid',
    sourceNode: 'node-1',
    targetGraph: 'audio',
    targetNode: 'node-2',
    edgeType: 'event',
    indexed: true
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(!result.valid, 'Edge should be invalid');
  runner.assert(result.errors.some(e => e.includes('sourceGraph')), 'Should have sourceGraph error');
});

// Test audio latency budget requirement
runner.test('Audio edge requires latency budget', () => {
  const edge = {
    id: 'test-edge',
    sourceGraph: 'ui',
    sourceNode: 'button-1',
    targetGraph: 'audio',
    targetNode: 'player-1',
    edgeType: 'event',
    indexed: true
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(!result.valid, 'Edge should be invalid without latency budget');
  runner.assert(result.errors.some(e => e.includes('latencyBudget')), 'Should require latency budget');
});

// Test audio latency budget maximum (10ms policy)
runner.test('Audio edge latency budget must be <= 10ms', () => {
  const edge = {
    id: 'test-edge',
    sourceGraph: 'ui',
    sourceNode: 'button-1',
    targetGraph: 'audio',
    targetNode: 'player-1',
    edgeType: 'event',
    latencyBudget: 15,
    indexed: true
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(!result.valid, 'Edge should be invalid with latency > 10ms');
  runner.assert(result.errors.some(e => e.includes('10ms')), 'Should enforce 10ms limit');
});

// Test indexed requirement (policy #22)
runner.test('Cross-graph edges must be indexed', () => {
  const edge = {
    id: 'test-edge',
    sourceGraph: 'ui',
    sourceNode: 'button-1',
    targetGraph: 'audio',
    targetNode: 'player-1',
    edgeType: 'event',
    latencyBudget: 5,
    indexed: false
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(!result.valid, 'Edge should be invalid when not indexed');
  runner.assert(result.errors.some(e => e.includes('indexed')), 'Should require indexed: true');
});

// Test buffer size requirement
runner.test('Buffer data type requires bufferSize', () => {
  const edge = {
    id: 'test-edge',
    sourceGraph: 'ui',
    sourceNode: 'node-1',
    targetGraph: 'state',
    targetNode: 'node-2',
    edgeType: 'data',
    dataType: 'buffer',
    indexed: true
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(!result.valid, 'Edge should be invalid without bufferSize');
  runner.assert(result.errors.some(e => e.includes('bufferSize')), 'Should require bufferSize');
});

// Test valid buffer edge
runner.test('Valid buffer edge with bufferSize', () => {
  const edge = {
    id: 'test-edge',
    sourceGraph: 'ui',
    sourceNode: 'node-1',
    targetGraph: 'state',
    targetNode: 'node-2',
    edgeType: 'data',
    dataType: 'buffer',
    bufferSize: 1024,
    indexed: true
  };
  const result = validateCrossGraphEdge(edge);
  runner.assert(result.valid, 'Edge should be valid with bufferSize');
});

// Test multiple edges validation
runner.test('Validates multiple edges', () => {
  const edges = [
    {
      id: 'edge-1',
      sourceGraph: 'ui',
      sourceNode: 'button-1',
      targetGraph: 'audio',
      targetNode: 'player-1',
      edgeType: 'event',
      latencyBudget: 5,
      indexed: true
    },
    {
      id: 'edge-2',
      sourceGraph: 'ui',
      sourceNode: 'button-2',
      targetGraph: 'state',
      targetNode: 'store-1',
      edgeType: 'event',
      indexed: true
    }
  ];
  const result = validateCrossGraphEdges(edges);
  runner.assert(result.valid, 'All edges should be valid');
  runner.assert(result.totalEdges === 2, 'Should have 2 edges');
  runner.assert(result.validEdges === 2, 'Should have 2 valid edges');
});

// Test createDefaultEdge
runner.test('Creates default edge with required fields', () => {
  const edge = createDefaultEdge('test-id', 'ui', 'node-1', 'audio', 'node-2');
  runner.assert(edge.id === 'test-id', 'Should have correct id');
  runner.assert(edge.sourceGraph === 'ui', 'Should have correct sourceGraph');
  runner.assert(edge.indexed === true, 'Should be indexed by default');
  runner.assert(edge.edgeType === 'event', 'Should have default edgeType');
});

// Run summary
const success = runner.summary();
if (!success) {
  process.exit(1);
}