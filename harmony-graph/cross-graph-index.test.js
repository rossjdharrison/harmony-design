/**
 * @fileoverview Tests for Cross-Graph Edge Index
 * @see DESIGN_SYSTEM.md § Graph Engine → Cross-Graph Edges
 */

import { CrossGraphIndex } from './cross-graph-index.js';

/**
 * Test suite for CrossGraphIndex.
 */
export function runCrossGraphIndexTests() {
  console.group('CrossGraphIndex Tests');
  
  testBasicOperations();
  testIndexQueries();
  testEdgeTypes();
  testSerialization();
  testPerformance();
  testValidation();
  
  console.groupEnd();
}

function testBasicOperations() {
  console.group('Basic Operations');
  
  const index = new CrossGraphIndex();
  
  // Test adding edge
  const edge1 = {
    id: 'edge-1',
    sourceGraph: 'domain',
    sourceNode: 'domain-1',
    targetGraph: 'intent',
    targetNode: 'intent-1',
    edgeType: 'implements'
  };
  
  index.addEdge(edge1);
  console.assert(index.edges.size === 1, 'Edge should be added');
  console.assert(index.version === 1, 'Version should increment');
  
  // Test updating edge
  const edge1Updated = { ...edge1, edgeType: 'refines' };
  index.addEdge(edge1Updated);
  console.assert(index.edges.size === 1, 'Edge count should stay same on update');
  console.assert(index.version === 2, 'Version should increment on update');
  
  const retrieved = index.edges.get('edge-1');
  console.assert(retrieved.edgeType === 'refines', 'Edge should be updated');
  
  // Test removing edge
  const removed = index.removeEdge('edge-1');
  console.assert(removed === true, 'Should return true when edge removed');
  console.assert(index.edges.size === 0, 'Edge should be removed');
  console.assert(index.version === 3, 'Version should increment on remove');
  
  const removedAgain = index.removeEdge('edge-1');
  console.assert(removedAgain === false, 'Should return false when edge not found');
  
  console.log('✓ Basic operations work correctly');
  console.groupEnd();
}

function testIndexQueries() {
  console.group('Index Queries');
  
  const index = new CrossGraphIndex();
  
  // Add test edges
  index.addEdge({
    id: 'edge-1',
    sourceGraph: 'domain',
    sourceNode: 'domain-1',
    targetGraph: 'intent',
    targetNode: 'intent-1',
    edgeType: 'implements'
  });
  
  index.addEdge({
    id: 'edge-2',
    sourceGraph: 'domain',
    sourceNode: 'domain-1',
    targetGraph: 'component',
    targetNode: 'comp-1',
    edgeType: 'implements'
  });
  
  index.addEdge({
    id: 'edge-3',
    sourceGraph: 'intent',
    sourceNode: 'intent-1',
    targetGraph: 'component',
    targetNode: 'comp-1',
    edgeType: 'requires'
  });
  
  // Test query by source node
  const fromDomain1 = index.query({ sourceNode: 'domain-1' });
  console.assert(fromDomain1.length === 2, 'Should find 2 edges from domain-1');
  
  // Test query by target node
  const toComp1 = index.query({ targetNode: 'comp-1' });
  console.assert(toComp1.length === 2, 'Should find 2 edges to comp-1');
  
  // Test query by edge type
  const implements = index.query({ edgeType: 'implements' });
  console.assert(implements.length === 2, 'Should find 2 implements edges');
  
  // Test query by graph pair
  const domainToIntent = index.query({ 
    sourceGraph: 'domain', 
    targetGraph: 'intent' 
  });
  console.assert(domainToIntent.length === 1, 'Should find 1 domain→intent edge');
  
  // Test combined query
  const combined = index.query({
    sourceGraph: 'domain',
    sourceNode: 'domain-1',
    edgeType: 'implements'
  });
  console.assert(combined.length === 2, 'Should find 2 edges matching all criteria');
  
  // Test convenience methods
  const outgoing = index.getOutgoingEdges('domain', 'domain-1');
  console.assert(outgoing.length === 2, 'getOutgoingEdges should work');
  
  const incoming = index.getIncomingEdges('component', 'comp-1');
  console.assert(incoming.length === 2, 'getIncomingEdges should work');
  
  const byType = index.getEdgesByType('requires');
  console.assert(byType.length === 1, 'getEdgesByType should work');
  
  const betweenGraphs = index.getEdgesBetweenGraphs('intent', 'component');
  console.assert(betweenGraphs.length === 1, 'getEdgesBetweenGraphs should work');
  
  console.log('✓ Index queries work correctly');
  console.groupEnd();
}

function testEdgeTypes() {
  console.group('Edge Types');
  
  const index = new CrossGraphIndex();
  
  const edgeTypes = [
    'implements',
    'requires',
    'refines',
    'contains',
    'extends',
    'depends-on'
  ];
  
  edgeTypes.forEach((type, i) => {
    index.addEdge({
      id: `edge-${i}`,
      sourceGraph: 'domain',
      sourceNode: `node-${i}`,
      targetGraph: 'intent',
      targetNode: `target-${i}`,
      edgeType: type
    });
  });
  
  console.assert(index.edges.size === edgeTypes.length, 'All edge types should be added');
  
  edgeTypes.forEach(type => {
    const edges = index.getEdgesByType(type);
    console.assert(edges.length === 1, `Should find edge of type ${type}`);
  });
  
  console.log('✓ Edge types work correctly');
  console.groupEnd();
}

function testSerialization() {
  console.group('Serialization');
  
  const index1 = new CrossGraphIndex();
  
  // Add edges with metadata
  index1.addEdge({
    id: 'edge-1',
    sourceGraph: 'domain',
    sourceNode: 'domain-1',
    targetGraph: 'intent',
    targetNode: 'intent-1',
    edgeType: 'implements',
    metadata: { priority: 'high', tags: ['critical'] }
  });
  
  index1.addEdge({
    id: 'edge-2',
    sourceGraph: 'intent',
    sourceNode: 'intent-1',
    targetGraph: 'component',
    targetNode: 'comp-1',
    edgeType: 'requires'
  });
  
  // Serialize
  const json = index1.toJSON();
  console.assert(json.edges.length === 2, 'JSON should contain all edges');
  console.assert(json.version === 2, 'JSON should contain version');
  console.assert(typeof json.timestamp === 'number', 'JSON should contain timestamp');
  
  // Deserialize
  const index2 = new CrossGraphIndex();
  index2.fromJSON(json);
  
  console.assert(index2.edges.size === 2, 'Deserialized index should have all edges');
  console.assert(index2.version === 2, 'Deserialized index should have correct version');
  
  const edge1 = index2.edges.get('edge-1');
  console.assert(edge1.metadata.priority === 'high', 'Metadata should be preserved');
  
  // Test queries work after deserialization
  const results = index2.query({ sourceNode: 'domain-1' });
  console.assert(results.length === 1, 'Queries should work after deserialization');
  
  console.log('✓ Serialization works correctly');
  console.groupEnd();
}

function testPerformance() {
  console.group('Performance');
  
  const index = new CrossGraphIndex();
  
  // Add many edges
  const edgeCount = 1000;
  const startAdd = performance.now();
  
  for (let i = 0; i < edgeCount; i++) {
    index.addEdge({
      id: `edge-${i}`,
      sourceGraph: i % 2 === 0 ? 'domain' : 'intent',
      sourceNode: `node-${i % 100}`,
      targetGraph: i % 2 === 0 ? 'intent' : 'component',
      targetNode: `target-${i % 100}`,
      edgeType: ['implements', 'requires', 'refines'][i % 3]
    });
  }
  
  const addTime = performance.now() - startAdd;
  console.log(`Added ${edgeCount} edges in ${addTime.toFixed(2)}ms`);
  console.assert(addTime < 100, 'Adding edges should be fast');
  
  // Test query performance
  const startQuery = performance.now();
  const results = index.query({ sourceNode: 'node-50' });
  const queryTime = performance.now() - startQuery;
  
  console.log(`Queried ${results.length} edges in ${queryTime.toFixed(2)}ms`);
  console.assert(queryTime < 16, 'Query should meet 16ms budget');
  
  // Test stats
  const stats = index.getStats();
  console.log('Index stats:', stats);
  console.assert(stats.totalEdges === edgeCount, 'Stats should be accurate');
  
  console.log('✓ Performance meets requirements');
  console.groupEnd();
}

function testValidation() {
  console.group('Validation');
  
  const index = new CrossGraphIndex();
  
  // Test missing required fields
  try {
    index.addEdge({ id: 'bad-edge' });
    console.assert(false, 'Should throw on missing fields');
  } catch (e) {
    console.assert(e.message.includes('required field'), 'Should throw meaningful error');
  }
  
  // Test invalid graph type
  try {
    index.addEdge({
      id: 'bad-edge',
      sourceGraph: 'invalid',
      sourceNode: 'node-1',
      targetGraph: 'intent',
      targetNode: 'target-1',
      edgeType: 'implements'
    });
    console.assert(false, 'Should throw on invalid graph type');
  } catch (e) {
    console.assert(e.message.includes('Invalid sourceGraph'), 'Should validate graph type');
  }
  
  // Test null/undefined edge
  try {
    index.addEdge(null);
    console.assert(false, 'Should throw on null edge');
  } catch (e) {
    console.assert(e.message.includes('must be an object'), 'Should validate edge object');
  }
  
  console.log('✓ Validation works correctly');
  console.groupEnd();
}

// Auto-run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCrossGraphIndexTests();
}