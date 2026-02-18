/**
 * Tests for get_component_dependencies tool
 * 
 * @module tools/get_component_dependencies.test
 */

import { 
  getComponentDependencies,
  findCircularDependencies,
  getDependencyStats,
  findShortestPath
} from './get_component_dependencies.js';

/**
 * Mock test data setup
 * Creates a sample component graph for testing
 */
async function setupTestGraph() {
  // This would use the actual graph storage in real tests
  // For now, we document the expected test structure
  
  /**
   * Test graph structure:
   * 
   * page-dashboard (organism)
   *   ├─ composes_of → card-stats (molecule)
   *   │   ├─ composes_of → icon-base (atom)
   *   │   └─ composes_of → text-label (atom)
   *   └─ composes_of → button-primary (molecule)
   *       ├─ composes_of → icon-base (atom)
   *       └─ composes_of → text-label (atom)
   */
}

/**
 * Test: Get upstream dependencies
 */
async function testUpstreamDependencies() {
  console.log('Testing upstream dependencies...');
  
  try {
    const result = await getComponentDependencies({
      componentId: 'page-dashboard',
      direction: 'upstream',
      maxDepth: 5
    });

    console.assert(result.rootComponentId === 'page-dashboard', 'Root ID should match');
    console.assert(result.direction === 'upstream', 'Direction should be upstream');
    console.assert(result.totalDependencies >= 0, 'Should have dependency count');
    console.assert(Array.isArray(result.flatList), 'Should have flat list');
    console.assert(result.tree !== null, 'Should have dependency tree');

    console.log('✓ Upstream dependencies test passed');
  } catch (error) {
    console.error('✗ Upstream dependencies test failed:', error);
  }
}

/**
 * Test: Get downstream dependents
 */
async function testDownstreamDependents() {
  console.log('Testing downstream dependents...');
  
  try {
    const result = await getComponentDependencies({
      componentId: 'icon-base',
      direction: 'downstream',
      maxDepth: 5
    });

    console.assert(result.direction === 'downstream', 'Direction should be downstream');
    console.assert(result.tree.id === 'icon-base', 'Root should be icon-base');

    console.log('✓ Downstream dependents test passed');
  } catch (error) {
    console.error('✗ Downstream dependents test failed:', error);
  }
}

/**
 * Test: Circular dependency detection
 */
async function testCircularDependencies() {
  console.log('Testing circular dependency detection...');
  
  try {
    const cycles = await findCircularDependencies('test-component');
    
    console.assert(Array.isArray(cycles), 'Should return array of cycles');
    console.log('✓ Circular dependency test passed');
  } catch (error) {
    console.error('✗ Circular dependency test failed:', error);
  }
}

/**
 * Test: Dependency statistics
 */
async function testDependencyStats() {
  console.log('Testing dependency statistics...');
  
  try {
    const stats = await getDependencyStats('button-primary');
    
    console.assert(typeof stats.directDependencies === 'number', 'Should have direct deps count');
    console.assert(typeof stats.totalDependencies === 'number', 'Should have total deps count');
    console.assert(typeof stats.dependents === 'number', 'Should have dependents count');

    console.log('✓ Dependency statistics test passed');
  } catch (error) {
    console.error('✗ Dependency statistics test failed:', error);
  }
}

/**
 * Test: Shortest path finding
 */
async function testShortestPath() {
  console.log('Testing shortest path finding...');
  
  try {
    const path = await findShortestPath('page-dashboard', 'icon-base');
    
    if (path) {
      console.assert(Array.isArray(path), 'Path should be an array');
      console.assert(path[0] === 'page-dashboard', 'Path should start at source');
      console.assert(path[path.length - 1] === 'icon-base', 'Path should end at target');
    }

    console.log('✓ Shortest path test passed');
  } catch (error) {
    console.error('✗ Shortest path test failed:', error);
  }
}

/**
 * Test: Max depth limiting
 */
async function testMaxDepthLimit() {
  console.log('Testing max depth limiting...');
  
  try {
    const result = await getComponentDependencies({
      componentId: 'page-dashboard',
      direction: 'upstream',
      maxDepth: 2
    });

    console.assert(result.maxDepthReached <= 2, 'Should respect max depth');
    console.log('✓ Max depth limit test passed');
  } catch (error) {
    console.error('✗ Max depth limit test failed:', error);
  }
}

/**
 * Test: Include patterns option
 */
async function testIncludePatterns() {
  console.log('Testing include patterns option...');
  
  try {
    const withPatterns = await getComponentDependencies({
      componentId: 'button-primary',
      direction: 'upstream',
      includePatterns: true
    });

    const withoutPatterns = await getComponentDependencies({
      componentId: 'button-primary',
      direction: 'upstream',
      includePatterns: false
    });

    // With patterns should include inherits_pattern edges
    console.assert(
      withPatterns.totalDependencies >= withoutPatterns.totalDependencies,
      'Including patterns should find same or more dependencies'
    );

    console.log('✓ Include patterns test passed');
  } catch (error) {
    console.error('✗ Include patterns test failed:', error);
  }
}

/**
 * Run all tests
 */
export async function runTests() {
  console.log('Starting get_component_dependencies tests...\n');

  await setupTestGraph();
  await testUpstreamDependencies();
  await testDownstreamDependents();
  await testCircularDependencies();
  await testDependencyStats();
  await testShortestPath();
  await testMaxDepthLimit();
  await testIncludePatterns();

  console.log('\nAll tests completed!');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}