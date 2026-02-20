/**
 * @fileoverview FFT Compute Shader (Radix-2 Cooley-Tukey)
 * 
 * Implements GPU-accelerated Fast Fourier Transform using the radix-2 Cooley-Tukey
 * algorithm via WebGPU compute shaders. Designed for real-time audio processing
 * with sub-10ms latency targets.
 * 
 * Vision Alignment:
 * - GPU-First Audio: Offloads FFT computation to GPU for parallel processing
 * - WASM Performance: Complements WASM audio pipeline with GPU acceleration
 * 
 * Performance Targets:
 * - FFT Size 256: < 1ms
 * - FFT Size 512: < 2ms
 * - FFT Size 1024: < 3ms
 * - FFT Size 2048: < 5ms
 * - FFT Size 4096: < 8ms
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#gpu-fft-compute-shader
 * 
 * @module core/gpu/fft-compute-shader
 */

/**
 * WGSL shader source for radix-2 Cooley-Tukey FFT
 * 
 * Implements butterfly operations in parallel across workgroups.
 * Uses bit-reversal permutation for in-place computation.
 * 
 * @constant {string}
 */
const FFT_SHADER_SOURCE = `
struct FFTParams {
  fft_size: u32,
  stage: u32,
  direction: i32,  // 1 for forward, -1 for inverse
  _padding: u32,
}

@group(0) @binding(0) var<storage, read_write> real_data: array<f32>;
@group(0) @binding(1) var<storage, read_write> imag_data: array<f32>;
@group(0) @binding(2) var<uniform> params: FFTParams;

// Bit-reversal permutation for in-place FFT
fn bit_reverse(x: u32, bits: u32) -> u32 {
  var result: u32 = 0u;
  var val: u32 = x;
  for (var i: u32 = 0u; i < bits; i = i + 1u) {
    result = (result << 1u) | (val & 1u);
    val = val >> 1u;
  }
  return result;
}

// Compute number of bits needed to represent n-1
fn log2_ceil(n: u32) -> u32 {
  var bits: u32 = 0u;
  var val: u32 = n - 1u;
  while (val > 0u) {
    bits = bits + 1u;
    val = val >> 1u;
  }
  return bits;
}

// Butterfly operation for radix-2 FFT
@compute @workgroup_size(256, 1, 1)
fn fft_butterfly(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  let n = params.fft_size;
  
  if (idx >= n / 2u) {
    return;
  }
  
  let stage = params.stage;
  let m = 1u << stage;
  let m2 = m >> 1u;
  
  let k = idx & (m2 - 1u);
  let j = ((idx >> (stage - 1u)) << stage) + k;
  
  // Twiddle factor: W_n^k = exp(-2πi * k / m)
  let angle = -2.0 * 3.14159265359 * f32(k) / f32(m) * f32(params.direction);
  let twiddle_real = cos(angle);
  let twiddle_imag = sin(angle);
  
  let idx1 = j;
  let idx2 = j + m2;
  
  // Load butterfly inputs
  let real1 = real_data[idx1];
  let imag1 = imag_data[idx1];
  let real2 = real_data[idx2];
  let imag2 = imag_data[idx2];
  
  // Complex multiplication: t = twiddle * x2
  let t_real = twiddle_real * real2 - twiddle_imag * imag2;
  let t_imag = twiddle_real * imag2 + twiddle_imag * real2;
  
  // Butterfly outputs
  real_data[idx1] = real1 + t_real;
  imag_data[idx1] = imag1 + t_imag;
  real_data[idx2] = real1 - t_real;
  imag_data[idx2] = imag1 - t_imag;
}

// Bit-reversal permutation kernel
@compute @workgroup_size(256, 1, 1)
fn bit_reverse_permutation(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  let n = params.fft_size;
  
  if (idx >= n) {
    return;
  }
  
  let bits = log2_ceil(n + 1u);
  let rev_idx = bit_reverse(idx, bits);
  
  if (idx < rev_idx) {
    // Swap real parts
    let temp_real = real_data[idx];
    real_data[idx] = real_data[rev_idx];
    real_data[rev_idx] = temp_real;
    
    // Swap imaginary parts
    let temp_imag = imag_data[idx];
    imag_data[idx] = imag_data[rev_idx];
    imag_data[rev_idx] = temp_imag;
  }
}

// Normalization kernel for inverse FFT
@compute @workgroup_size(256, 1, 1)
fn normalize(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  let n = params.fft_size;
  
  if (idx >= n) {
    return;
  }
  
  let scale = 1.0 / f32(n);
  real_data[idx] = real_data[idx] * scale;
  imag_data[idx] = imag_data[idx] * scale;
}
`;

/**
 * FFT Compute Shader Manager
 * 
 * Manages WebGPU compute pipelines for FFT operations.
 * Supports forward and inverse transforms with configurable sizes.
 * 
 * @class FFTComputeShader
 */
export class FFTComputeShader {
  /**
   * @param {import('./device-manager.js').DeviceManager} deviceManager
   * @param {import('./buffer-pool.js').BufferPool} bufferPool
   */
  constructor(deviceManager, bufferPool) {
    /** @private */
    this.deviceManager = deviceManager;
    
    /** @private */
    this.bufferPool = bufferPool;
    
    /** @private @type {GPUDevice|null} */
    this.device = null;
    
    /** @private @type {GPUShaderModule|null} */
    this.shaderModule = null;
    
    /** @private @type {GPUComputePipeline|null} */
    this.butterflyPipeline = null;
    
    /** @private @type {GPUComputePipeline|null} */
    this.bitReversePipeline = null;
    
    /** @private @type {GPUComputePipeline|null} */
    this.normalizePipeline = null;
    
    /** @private @type {Map<number, GPUBuffer>} */
    this.paramBuffers = new Map();
    
    /** @private @type {boolean} */
    this.initialized = false;
  }
  
  /**
   * Initialize FFT compute shader pipelines
   * 
   * @returns {Promise<void>}
   * @throws {Error} If WebGPU device is not available
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    this.device = await this.deviceManager.getDevice();
    if (!this.device) {
      throw new Error('FFTComputeShader: WebGPU device not available');
    }
    
    // Compile shader module
    this.shaderModule = this.device.createShaderModule({
      label: 'FFT Compute Shader',
      code: FFT_SHADER_SOURCE,
    });
    
    // Create bind group layout
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'FFT Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
      ],
    });
    
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'FFT Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });
    
    // Create butterfly pipeline
    this.butterflyPipeline = this.device.createComputePipeline({
      label: 'FFT Butterfly Pipeline',
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: 'fft_butterfly',
      },
    });
    
    // Create bit-reverse pipeline
    this.bitReversePipeline = this.device.createComputePipeline({
      label: 'FFT Bit-Reverse Pipeline',
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: 'bit_reverse_permutation',
      },
    });
    
    // Create normalize pipeline
    this.normalizePipeline = this.device.createComputePipeline({
      label: 'FFT Normalize Pipeline',
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: 'normalize',
      },
    });
    
    this.initialized = true;
    console.log('[FFTComputeShader] Initialized successfully');
  }
  
  /**
   * Validate FFT size (must be power of 2)
   * 
   * @private
   * @param {number} size - FFT size to validate
   * @returns {boolean}
   */
  _isValidFFTSize(size) {
    return size > 0 && (size & (size - 1)) === 0;
  }
  
  /**
   * Compute log2 of a power-of-2 number
   * 
   * @private
   * @param {number} n - Power of 2
   * @returns {number}
   */
  _log2(n) {
    return Math.log2(n);
  }
  
  /**
   * Get or create parameter buffer for FFT size
   * 
   * @private
   * @param {number} fftSize - FFT size
   * @returns {GPUBuffer}
   */
  _getParamBuffer(fftSize) {
    if (!this.paramBuffers.has(fftSize)) {
      const buffer = this.device.createBuffer({
        label: `FFT Params Buffer (size=${fftSize})`,
        size: 16, // 4 u32 values
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.paramBuffers.set(fftSize, buffer);
    }
    return this.paramBuffers.get(fftSize);
  }
  
  /**
   * Execute FFT on GPU buffers
   * 
   * @param {GPUBuffer} realBuffer - Real component buffer (storage)
   * @param {GPUBuffer} imagBuffer - Imaginary component buffer (storage)
   * @param {number} fftSize - FFT size (must be power of 2)
   * @param {boolean} [inverse=false] - If true, compute inverse FFT
   * @returns {Promise<void>}
   * @throws {Error} If FFT size is invalid or shader not initialized
   */
  async execute(realBuffer, imagBuffer, fftSize, inverse = false) {
    if (!this.initialized) {
      throw new Error('FFTComputeShader: Not initialized');
    }
    
    if (!this._isValidFFTSize(fftSize)) {
      throw new Error(`FFTComputeShader: Invalid FFT size ${fftSize} (must be power of 2)`);
    }
    
    const direction = inverse ? -1 : 1;
    const numStages = this._log2(fftSize);
    const paramBuffer = this._getParamBuffer(fftSize);
    
    const commandEncoder = this.device.createCommandEncoder({
      label: 'FFT Command Encoder',
    });
    
    // Step 1: Bit-reversal permutation
    {
      const params = new Uint32Array([fftSize, 0, direction, 0]);
      this.device.queue.writeBuffer(paramBuffer, 0, params);
      
      const bindGroup = this.device.createBindGroup({
        label: 'FFT Bit-Reverse Bind Group',
        layout: this.bitReversePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: realBuffer } },
          { binding: 1, resource: { buffer: imagBuffer } },
          { binding: 2, resource: { buffer: paramBuffer } },
        ],
      });
      
      const passEncoder = commandEncoder.beginComputePass({
        label: 'FFT Bit-Reverse Pass',
      });
      passEncoder.setPipeline(this.bitReversePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(fftSize / 256));
      passEncoder.end();
    }
    
    // Step 2: Butterfly stages
    for (let stage = 1; stage <= numStages; stage++) {
      const params = new Uint32Array([fftSize, stage, direction, 0]);
      this.device.queue.writeBuffer(paramBuffer, 0, params);
      
      const bindGroup = this.device.createBindGroup({
        label: `FFT Butterfly Bind Group (stage=${stage})`,
        layout: this.butterflyPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: realBuffer } },
          { binding: 1, resource: { buffer: imagBuffer } },
          { binding: 2, resource: { buffer: paramBuffer } },
        ],
      });
      
      const passEncoder = commandEncoder.beginComputePass({
        label: `FFT Butterfly Pass (stage=${stage})`,
      });
      passEncoder.setPipeline(this.butterflyPipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(fftSize / 512)); // n/2 threads
      passEncoder.end();
    }
    
    // Step 3: Normalization (inverse FFT only)
    if (inverse) {
      const params = new Uint32Array([fftSize, 0, direction, 0]);
      this.device.queue.writeBuffer(paramBuffer, 0, params);
      
      const bindGroup = this.device.createBindGroup({
        label: 'FFT Normalize Bind Group',
        layout: this.normalizePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: realBuffer } },
          { binding: 1, resource: { buffer: imagBuffer } },
          { binding: 2, resource: { buffer: paramBuffer } },
        ],
      });
      
      const passEncoder = commandEncoder.beginComputePass({
        label: 'FFT Normalize Pass',
      });
      passEncoder.setPipeline(this.normalizePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(fftSize / 256));
      passEncoder.end();
    }
    
    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);
    
    // Wait for completion
    await this.device.queue.onSubmittedWorkDone();
  }
  
  /**
   * Execute FFT on Float32Array data (convenience method)
   * 
   * Creates temporary GPU buffers, executes FFT, and reads back results.
   * For repeated operations, use execute() with persistent buffers.
   * 
   * @param {Float32Array} realData - Real component input
   * @param {Float32Array} imagData - Imaginary component input
   * @param {boolean} [inverse=false] - If true, compute inverse FFT
   * @returns {Promise<{real: Float32Array, imag: Float32Array}>}
   */
  async executeOnCPUData(realData, imagData, inverse = false) {
    const fftSize = realData.length;
    
    if (imagData.length !== fftSize) {
      throw new Error('FFTComputeShader: Real and imaginary arrays must have same length');
    }
    
    // Create GPU buffers
    const realBuffer = this.device.createBuffer({
      label: 'FFT Real Buffer (temp)',
      size: fftSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    const imagBuffer = this.device.createBuffer({
      label: 'FFT Imag Buffer (temp)',
      size: fftSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    // Upload data
    this.device.queue.writeBuffer(realBuffer, 0, realData);
    this.device.queue.writeBuffer(imagBuffer, 0, imagData);
    
    // Execute FFT
    await this.execute(realBuffer, imagBuffer, fftSize, inverse);
    
    // Read back results
    const realResult = new Float32Array(fftSize);
    const imagResult = new Float32Array(fftSize);
    
    const realStaging = this.device.createBuffer({
      size: fftSize * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    
    const imagStaging = this.device.createBuffer({
      size: fftSize * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(realBuffer, 0, realStaging, 0, fftSize * 4);
    commandEncoder.copyBufferToBuffer(imagBuffer, 0, imagStaging, 0, fftSize * 4);
    this.device.queue.submit([commandEncoder.finish()]);
    
    await realStaging.mapAsync(GPUMapMode.READ);
    await imagStaging.mapAsync(GPUMapMode.READ);
    
    realResult.set(new Float32Array(realStaging.getMappedRange()));
    imagResult.set(new Float32Array(imagStaging.getMappedRange()));
    
    realStaging.unmap();
    imagStaging.unmap();
    
    // Cleanup
    realBuffer.destroy();
    imagBuffer.destroy();
    realStaging.destroy();
    imagStaging.destroy();
    
    return { real: realResult, imag: imagResult };
  }
  
  /**
   * Dispose of all GPU resources
   */
  dispose() {
    for (const buffer of this.paramBuffers.values()) {
      buffer.destroy();
    }
    this.paramBuffers.clear();
    
    this.butterflyPipeline = null;
    this.bitReversePipeline = null;
    this.normalizePipeline = null;
    this.shaderModule = null;
    this.device = null;
    this.initialized = false;
    
    console.log('[FFTComputeShader] Disposed');
  }
}

/**
 * Create FFT compute shader instance
 * 
 * @param {import('./device-manager.js').DeviceManager} deviceManager
 * @param {import('./buffer-pool.js').BufferPool} bufferPool
 * @returns {FFTComputeShader}
 */
export function createFFTComputeShader(deviceManager, bufferPool) {
  return new FFTComputeShader(deviceManager, bufferPool);
}