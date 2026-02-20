/**
 * Intent Query Executor Tests
 * 
 * @module harmony-graph/gpu/intent-query.test
 */

import { IntentQueryExecutor, IntentState, NodeState, EdgeState } from './intent-query.js';

/**
 * Mock GPU device for testing
 */
class MockGPUDevice {
  createShaderModule() {
    return {};
  }
  createBindGroupLayout() {
    return {};
  }
  createPipelineLayout() {
    return {};
  }
  createComputePipeline() {
    return {};
  }
  createBuffer() {
    return { destroy: () => {} };
  }
  get queue() {
    return {
      writeBuffer: () => {},
      submit: () => {},
    };
  }
  createCommandEncoder() {
    return {
      beginComputePass: () => ({
        setPipeline: () => {},
        setBindGroup: () => {},
        dispatchWorkgroups: () => {},
        end: () => {},
      }),
      copyBufferToBuffer: () => {},
      finish: () => ({}),
    };
  }
  createBindGroup() {
    return {};
  }
}

/**
 * Test suite for IntentQueryExecutor
 */
export async function runTests() {
  console.log('Running IntentQueryExecutor tests...');

  // Test 1: Initialization
  {
    const device = new MockGPUDevice();
    const executor = new IntentQueryExecutor(device);
    
    console.assert(!executor.initialized, 'Should not be initialized on construction');
    
    // Note: Full initialization requires WebGPU and shader loading
    console.log('✓ Initialization test passed');
  }

  // Test 2: State constants
  {
    console.assert(IntentState.PENDING === 0, 'PENDING should be 0');
    console.assert(IntentState.AVAILABLE === 1, 'AVAILABLE should be 1');
    console.assert(IntentState.UNAVAILABLE === 2, 'UNAVAILABLE should be 2');
    console.assert(IntentState.SATISFIED === 3, 'SATISFIED should be 3');
    
    console.assert(NodeState.INACTIVE === 0, 'INACTIVE should be 0');
    console.assert(NodeState.ACTIVE === 1, 'ACTIVE should be 1');
    
    console.assert(EdgeState.DISCONNECTED === 0, 'DISCONNECTED should be 0');
    console.assert(EdgeState.CONNECTED === 1, 'CONNECTED should be 1');
    
    console.log('✓ State constants test passed');
  }

  // Test 3: Destroy
  {
    const device = new MockGPUDevice();
    const executor = new IntentQueryExecutor(device);
    
    executor.destroy();
    console.assert(!executor.initialized, 'Should not be initialized after destroy');
    
    console.log('✓ Destroy test passed');
  }

  console.log('All IntentQueryExecutor tests passed!');
}

// Auto-run tests if executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test=intent-query')) {
  runTests().catch(console.error);
}