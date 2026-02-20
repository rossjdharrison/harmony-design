/**
 * @fileoverview Tests for WASM-GPU Bridge
 * @module harmony-core/wasm-gpu-bridge.test
 */

import { WASMGPUBridge } from './wasm-gpu-bridge.js';

/**
 * Run basic bridge tests
 * @returns {Promise<boolean>}
 */
export async function runWASMGPUBridgeTests() {
  console.group('[WASMGPUBridge] Running tests...');
  
  try {
    // Check WebGPU support
    if (!navigator.gpu) {
      console.warn('[WASMGPUBridge] WebGPU not supported, skipping tests');
      console.groupEnd();
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('[WASMGPUBridge] No GPU adapter available');
      console.groupEnd();
      return false;
    }

    const device = await adapter.requestDevice();
    
    // Test 1: Basic buffer creation
    console.log('[Test 1] Creating bridge and buffer...');
    const bridge = new WASMGPUBridge(device);
    
    const buffer = bridge.createBuffer(
      'test-buffer',
      1024,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    );
    
    if (!buffer) {
      throw new Error('Buffer creation failed');
    }
    console.log('✓ Buffer created');

    // Test 2: Write data to buffer
    console.log('[Test 2] Writing data to buffer...');
    const testData = new Float32Array([1.0, 2.0, 3.0, 4.0]);
    await bridge.writeBuffer('test-buffer', testData);
    console.log('✓ Data written');

    // Test 3: Read data back
    console.log('[Test 3] Reading data from buffer...');
    const readData = await bridge.readBuffer('test-buffer', 0, 16);
    const readFloat32 = new Float32Array(readData);
    
    let match = true;
    for (let i = 0; i < testData.length; i++) {
      if (Math.abs(testData[i] - readFloat32[i]) > 0.001) {
        match = false;
        break;
      }
    }
    
    if (!match) {
      throw new Error('Data mismatch after read');
    }
    console.log('✓ Data read correctly');

    // Test 4: Staging buffer access
    console.log('[Test 4] Testing staging buffer...');
    const stagingBuffer = bridge.getStagingBuffer('test-buffer');
    if (!stagingBuffer) {
      throw new Error('Staging buffer not available');
    }
    
    const stagingView = new Float32Array(stagingBuffer);
    stagingView[0] = 10.0;
    await bridge.syncToGPU('test-buffer');
    
    const verifyData = await bridge.readBuffer('test-buffer', 0, 4);
    const verifyFloat = new Float32Array(verifyData);
    
    if (Math.abs(verifyFloat[0] - 10.0) > 0.001) {
      throw new Error('Staging buffer sync failed');
    }
    console.log('✓ Staging buffer works');

    // Test 5: Stats and cleanup
    console.log('[Test 5] Testing stats and cleanup...');
    const stats = bridge.getStats();
    console.log('Bridge stats:', stats);
    
    if (stats.bufferCount !== 1) {
      throw new Error('Incorrect buffer count');
    }
    
    bridge.destroyBuffer('test-buffer');
    const statsAfter = bridge.getStats();
    
    if (statsAfter.bufferCount !== 0) {
      throw new Error('Buffer not destroyed');
    }
    console.log('✓ Cleanup successful');

    bridge.destroy();
    device.destroy();
    
    console.log('[WASMGPUBridge] All tests passed ✓');
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('[WASMGPUBridge] Test failed:', error);
    console.groupEnd();
    return false;
  }
}

// Auto-run tests if loaded directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWASMGPUBridgeTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}