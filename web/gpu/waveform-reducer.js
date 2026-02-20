/**
 * @fileoverview WebGPU compute shader for waveform peak reduction
 * Processes audio samples to generate multi-resolution waveform data
 * @module web/gpu/waveform-reducer
 */

/**
 * Reduces audio samples to peak values at multiple resolutions
 * Uses WebGPU compute shaders for parallel processing
 * 
 * @class WaveformReducer
 * @see DESIGN_SYSTEM.md#waveform-visualization
 */
export class WaveformReducer {
  /**
   * @param {GPUDevice} device - WebGPU device
   * @param {import('./buffer-pool.js').BufferPool} bufferPool - GPU buffer pool
   */
  constructor(device, bufferPool) {
    /** @type {GPUDevice} */
    this.device = device;
    
    /** @type {import('./buffer-pool.js').BufferPool} */
    this.bufferPool = bufferPool;
    
    /** @type {GPUComputePipeline | null} */
    this.pipeline = null;
    
    /** @type {GPUBindGroupLayout | null} */
    this.bindGroupLayout = null;
    
    /** @type {number} */
    this.workgroupSize = 256;
  }

  /**
   * Initialize the compute pipeline
   * @returns {Promise<void>}
   */
  async initialize() {
    const shaderModule = this.device.createShaderModule({
      label: 'waveform-reducer-shader',
      code: this.getShaderCode()
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'waveform-reducer-bind-group-layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'waveform-reducer-pipeline-layout',
      bindGroupLayouts: [this.bindGroupLayout]
    });

    this.pipeline = await this.device.createComputePipelineAsync({
      label: 'waveform-reducer-pipeline',
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });
  }

  /**
   * Get WGSL shader code for peak reduction
   * @returns {string} WGSL shader code
   * @private
   */
  getShaderCode() {
    return /* wgsl */ `
      struct Params {
        sample_count: u32,
        reduction_factor: u32,
        output_count: u32,
        padding: u32,
      }

      @group(0) @binding(0) var<storage, read> input_samples: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output_peaks: array<vec2<f32>>;
      @group(0) @binding(2) var<uniform> params: Params;

      @compute @workgroup_size(${this.workgroupSize})
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let output_index = global_id.x;
        
        if (output_index >= params.output_count) {
          return;
        }

        let start_sample = output_index * params.reduction_factor;
        let end_sample = min(start_sample + params.reduction_factor, params.sample_count);
        
        var min_val: f32 = 1.0;
        var max_val: f32 = -1.0;
        
        for (var i = start_sample; i < end_sample; i = i + 1u) {
          let sample = input_samples[i];
          min_val = min(min_val, sample);
          max_val = max(max_val, sample);
        }
        
        output_peaks[output_index] = vec2<f32>(min_val, max_val);
      }
    `;
  }

  /**
   * Reduce audio samples to peak values
   * @param {Float32Array} samples - Input audio samples
   * @param {number} reductionFactor - Samples per peak (e.g., 256, 512, 1024)
   * @returns {Promise<Float32Array>} Peak values [min, max, min, max, ...]
   */
  async reduce(samples, reductionFactor) {
    if (!this.pipeline) {
      await this.initialize();
    }

    const outputCount = Math.ceil(samples.length / reductionFactor);
    const outputSize = outputCount * 2 * Float32Array.BYTES_PER_ELEMENT;

    // Create or acquire buffers
    const inputBuffer = this.bufferPool.acquire(
      samples.byteLength,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    const outputBuffer = this.bufferPool.acquire(
      outputSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    const paramsBuffer = this.device.createBuffer({
      label: 'waveform-params',
      size: 16, // 4 x u32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const stagingBuffer = this.device.createBuffer({
      label: 'waveform-staging',
      size: outputSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // Upload data
    this.device.queue.writeBuffer(inputBuffer, 0, samples);
    this.device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([
      samples.length,
      reductionFactor,
      outputCount,
      0 // padding
    ]));

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      label: 'waveform-reducer-bind-group',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } }
      ]
    });

    // Dispatch compute shader
    const commandEncoder = this.device.createCommandEncoder({
      label: 'waveform-reducer-encoder'
    });

    const computePass = commandEncoder.beginComputePass({
      label: 'waveform-reducer-pass'
    });

    computePass.setPipeline(this.pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(Math.ceil(outputCount / this.workgroupSize));
    computePass.end();

    // Copy to staging buffer
    commandEncoder.copyBufferToBuffer(
      outputBuffer, 0,
      stagingBuffer, 0,
      outputSize
    );

    this.device.queue.submit([commandEncoder.finish()]);

    // Read back results
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(stagingBuffer.getMappedRange()).slice();
    stagingBuffer.unmap();

    // Release buffers
    this.bufferPool.release(inputBuffer);
    this.bufferPool.release(outputBuffer);
    paramsBuffer.destroy();
    stagingBuffer.destroy();

    return result;
  }

  /**
   * Destroy resources
   */
  destroy() {
    this.pipeline = null;
    this.bindGroupLayout = null;
  }
}