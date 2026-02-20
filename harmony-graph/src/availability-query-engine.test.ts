/**
 * @fileoverview Tests for Availability Query Engine
 * @module harmony-graph/availability-query-engine.test
 */

import { AvailabilityQueryEngine } from './availability-query-engine.js';
import { QueryEngine } from './query-engine.js';
import type { GraphNode, GraphEdge } from './types.js';

/**
 * Mock query engine for testing
 */
class MockQueryEngine extends QueryEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
  }

  async queryById(id: string): Promise<GraphNode | null> {
    return this.nodes.get(id) || null;
  }

  async queryEdgeById(id: string): Promise<GraphEdge | null> {
    return this.edges.get(id) || null;
  }

  async query(criteria: Record<string, unknown>): Promise<GraphNode[]> {
    return Array.from(this.nodes.values()).filter(node => {
      return Object.entries(criteria).every(([key, value]) => {
        return node[key as keyof GraphNode] === value;
      });
    });
  }

  async queryEdges(criteria: Record<string, unknown>): Promise<GraphEdge[]> {
    return Array.from(this.edges.values()).filter(edge => {
      return Object.entries(criteria).every(([key, value]) => {
        return edge[key as keyof GraphEdge] === value;
      });
    });
  }
}

/**
 * Test: Check available node
 */
async function testAvailableNode(): Promise<void> {
  const queryEngine = new MockQueryEngine();
  const availabilityEngine = new AvailabilityQueryEngine(queryEngine);

  queryEngine.addNode({
    id: 'node-1',
    type: 'component',
    label: 'Test Node',
    metadata: {}
  });

  const result = await availabilityEngine.checkNodeAvailability('node-1');
  
  console.assert(result.status.available === true, 'Node should be available');
  console.assert(result.id === 'node-1', 'Result should have correct ID');
  console.log('✓ Test: Available node check passed');
}

/**
 * Test: Check unavailable node (not found)
 */
async function testUnavailableNodeNotFound(): Promise<void> {
  const queryEngine = new MockQueryEngine();
  const availabilityEngine = new AvailabilityQueryEngine(queryEngine);

  const result = await availabilityEngine.checkNodeAvailability('missing-node');
  
  console.assert(result.status.available === false, 'Missing node should be unavailable');
  console.assert(result.status.reason === 'Node not found', 'Should have correct reason');
  console.log('✓ Test: Unavailable node (not found) check passed');
}

/**
 * Test: Check unavailable node (archived)
 */
async function testUnavailableNodeArchived(): Promise<void> {
  const queryEngine = new MockQueryEngine();
  const availabilityEngine = new AvailabilityQueryEngine(queryEngine);

  queryEngine.addNode({
    id: 'node-2',
    type: 'component',
    label: 'Archived Node',
    metadata: { archived: true }
  });

  const result = await availabilityEngine.checkNodeAvailability('node-2');
  
  console.assert(result.status.available === false, 'Archived node should be unavailable');
  console.assert(result.status.reason?.includes('archived'), 'Should mention archived');
  console.log('✓ Test: Unavailable node (archived) check passed');
}

/**
 * Test: Check edge availability
 */
async function testEdgeAvailability(): Promise<void> {
  const queryEngine = new MockQueryEngine();
  const availabilityEngine = new AvailabilityQueryEngine(queryEngine);

  queryEngine.addNode({
    id: 'source',
    type: 'component',
    label: 'Source',
    metadata: {}
  });

  queryEngine.addNode({
    id: 'target',
    type: 'component',
    label: 'Target',
    metadata: {}
  });

  queryEngine.addEdge({
    id: 'edge-1',
    source: 'source',
    target: 'target',
    type: 'dependency',
    metadata: {}
  });

  const result = await availabilityEngine.checkEdgeAvailability('edge-1');
  
  console.assert(result.status.available === true, 'Edge should be available');
  console.assert(result.relatedEntities?.length === 2, 'Should have 2 related entities');
  console.log('✓ Test: Edge availability check passed');
}

/**
 * Test: Batch availability check
 */
async function testBatchAvailability(): Promise<void> {
  const queryEngine = new MockQueryEngine();
  const availabilityEngine = new AvailabilityQueryEngine(queryEngine);

  queryEngine.addNode({
    id: 'node-1',
    type: 'component',
    label: 'Node 1',
    metadata: {}
  });

  queryEngine.addNode({
    id: 'node-2',
    type: 'component',
    label: 'Node 2',
    metadata: { archived: true }
  });

  const results = await availabilityEngine.checkBatchAvailability(['node-1', 'node-2']);
  
  console.assert(results.length === 2, 'Should return 2 results');
  console.assert(results[0].status.available === true, 'First node should be available');
  console.assert(results[1].status.available === false, 'Second node should be unavailable');
  console.log('✓ Test: Batch availability check passed');
}

/**
 * Test: Cache functionality
 */
async function testCacheFunctionality(): Promise<void> {
  const queryEngine = new MockQueryEngine();
  const availabilityEngine = new AvailabilityQueryEngine(queryEngine);

  queryEngine.addNode({
    id: 'node-1',
    type: 'component',
    label: 'Test Node',
    metadata: {}
  });

  // First check - should query
  await availabilityEngine.checkNodeAvailability('node-1');
  
  const stats1 = availabilityEngine.getCacheStats();
  console.assert(stats1.size === 1, 'Cache should have 1 entry');

  // Second check - should use cache
  await availabilityEngine.checkNodeAvailability('node-1');
  
  const stats2 = availabilityEngine.getCacheStats();
  console.assert(stats2.size === 1, 'Cache should still have 1 entry');

  // Clear cache
  availabilityEngine.clearCache();
  const stats3 = availabilityEngine.getCacheStats();
  console.assert(stats3.size === 0, 'Cache should be empty after clear');
  
  console.log('✓ Test: Cache functionality passed');
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('Running Availability Query Engine tests...\n');
  
  try {
    await testAvailableNode();
    await testUnavailableNodeNotFound();
    await testUnavailableNodeArchived();
    await testEdgeAvailability();
    await testBatchAvailability();
    await testCacheFunctionality();
    
    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('\n✗ Tests failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };