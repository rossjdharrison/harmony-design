/**
 * @fileoverview Example: Using WASM-GPU Bridge for audio processing
 * @module harmony-core/examples/wasm-gpu-audio-example
 * 
 * Demonstrates zero-copy audio buffer processing using GPU compute shaders
 * with data shared via WASM linear memory.
 * 
 * @see DESIGN_SYSTEM.md#wasm-gpu-bridge
 */

import { WASMGPUBridge } from '../wasm-gpu-bridge.js';

/**
 * Example audio processor using WASM-GPU bridge
 */
export class AudioGPUProcessor {
  /**
   * @param {GPUDevice} device - WebGPU device
   * @param {number} bufferSize - Audio buffer size (samples)
   */
  constructor(device, bufferSize = 512) {
    this.device = device;
    this.bufferSize = bufferSize;
    this.bridge = new WASMGPUBridge(device);
    
    // Create input/output buffers
    this.bridge.createBuffer(
      'audio-input',
      bufferSize * 4, // Float32 = 4 bytes
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );
    
    this.bridge.createBuffer(
      'audio-output',
      bufferSize * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    console.log('[AudioGPUProcessor] Initialized', { bufferSize });
  }

  /**
   * Process audio buffer using GPU compute shader
   * @param {Float32Array} inputSamples - Input audio samples
   * @returns {Promise<Float32Array>} Processed audio samples
   */
  async processAudioBuffer(inputSamples) {
    const startTime = performance.now();

    // Write input to GPU
    await this.bridge.writeBuffer('audio-input', inputSamples);

    // TODO: Execute compute shader here
    // For now, just copy input to output (passthrough)
    const commandEncoder = this.device.createCommandEncoder();
    const inputBuffer = this.bridge.getBuffer('audio-input');
    const outputBuffer = this.bridge.getBuffer('audio-output');
    
    commandEncoder.copyBufferToBuffer(
      inputBuffer,
      0,
      outputBuffer,
      0,
      inputSamples.byteLength
    );
    
    this.device.queue.submit([commandEncoder.finish()]);

    // Read output from GPU
    const outputData = await this.bridge.readBuffer('audio-output');
    const outputSamples = new Float32Array(outputData);

    const duration = performance.now() - startTime;
    
    // Check latency budget (target: <10ms)
    if (duration > 10) {
      console.warn(
        `[AudioGPUProcessor] Processing took ${duration.toFixed(2)}ms (target: <10ms)`
      );
    }

    return outputSamples;
  }

  /**
   * Process audio using staging buffers (lower latency)
   * @param {Float32Array} inputSamples - Input audio samples
   * @returns {Promise<Float32Array>}
   */
  async processAudioBufferFast(inputSamples) {
    const startTime = performance.now();

    // Get staging buffers for zero-copy access
    const inputStaging = this.bridge.getStagingBuffer('audio-input');
    const outputStaging = this.bridge.getStagingBuffer('audio-output');

    if (!inputStaging || !outputStaging) {
      throw new Error('[AudioGPUProcessor] Staging buffers not available');
    }

    // Write directly to staging buffer
    const inputView = new Float32Array(inputStaging);
    inputView.set(inputSamples);

    // Sync to GPU
    await this.bridge.syncToGPU('audio-input');

    // Execute compute shader (same as above)
    const commandEncoder = this.device.createCommandEncoder();
    const inputBuffer = this.bridge.getBuffer('audio-input');
    const outputBuffer = this.bridge.getBuffer('audio-output');
    
    commandEncoder.copyBufferToBuffer(
      inputBuffer,
      0,
      outputBuffer,
      0,
      inputSamples.byteLength
    );
    
    this.device.queue.submit([commandEncoder.finish()]);

    // Sync from GPU
    await this.bridge.syncFromGPU('audio-output');

    // Read from staging buffer
    const outputView = new Float32Array(outputStaging);
    const result = new Float32Array(outputView.length);
    result.set(outputView);

    const duration = performance.now() - startTime;
    
    if (duration > 10) {
      console.warn(
        `[AudioGPUProcessor] Fast processing took ${duration.toFixed(2)}ms (target: <10ms)`
      );
    }

    return result;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.bridge.destroy();
    console.log('[AudioGPUProcessor] Destroyed');
  }
}

/**
 * Run example demonstration
 * @returns {Promise<void>}
 */
export async function runAudioGPUExample() {
  console.group('[AudioGPUExample] Running example...');

  try {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      console.groupEnd();
      return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('No GPU adapter');
      console.groupEnd();
      return;
    }

    const device = await adapter.requestDevice();
    const processor = new AudioGPUProcessor(device, 512);

    // Generate test audio (sine wave)
    const sampleRate = 48000;
    const frequency = 440; // A4
    const duration = 512 / sampleRate;
    const samples = new Float32Array(512);
    
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      samples[i] = Math.sin(2 * Math.PI * frequency * t);
    }

    console.log('Processing audio buffer (standard method)...');
    const output1 = await processor.processAudioBuffer(samples);
    console.log('Output samples:', output1.slice(0, 4));

    console.log('Processing audio buffer (fast method)...');
    const output2 = await processor.processAudioBufferFast(samples);
    console.log('Output samples:', output2.slice(0, 4));

    processor.destroy();
    device.destroy();

    console.log('[AudioGPUExample] Example completed ✓');
    console.groupEnd();

  } catch (error) {
    console.error('[AudioGPUExample] Error:', error);
    console.groupEnd();
  }
}