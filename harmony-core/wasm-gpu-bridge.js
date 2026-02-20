/**
 * @fileoverview WASM-GPU Bridge for efficient buffer access
 * @module harmony-core/wasm-gpu-bridge
 * 
 * Provides zero-copy data transfer between WebAssembly linear memory
 * and GPU buffers using SharedArrayBuffer when available.
 * 
 * Performance targets:
 * - Buffer mapping: < 1ms
 * - Data transfer: < 5ms for 1MB
 * - Total latency budget: < 10ms end-to-end
 * 
 * @see DESIGN_SYSTEM.md#wasm-gpu-bridge
 */

/**
 * @typedef {Object} GPUBufferDescriptor
 * @property {number} size - Buffer size in bytes
 * @property {number} usage - GPUBufferUsage flags
 * @property {boolean} mappedAtCreation - Whether buffer is mapped at creation
 */

/**
 * @typedef {Object} WASMMemoryView
 * @property {Uint8Array} uint8 - Uint8 view of WASM memory
 * @property {Float32Array} float32 - Float32 view of WASM memory
 * @property {Int16Array} int16 - Int16 view of WASM memory
 * @property {number} byteOffset - Offset in WASM linear memory
 * @property {number} byteLength - Length in bytes
 */

/**
 * Bridge for efficient GPU buffer access from WebAssembly
 * Manages buffer lifecycle, mapping, and data transfer
 */
export class WASMGPUBridge {
  /**
   * @param {GPUDevice} device - WebGPU device
   * @param {WebAssembly.Memory} [wasmMemory] - Optional WASM memory instance
   */
  constructor(device, wasmMemory = null) {
    if (!device) {
      throw new Error('[WASMGPUBridge] GPUDevice is required');
    }

    /** @type {GPUDevice} */
    this.device = device;

    /** @type {WebAssembly.Memory|null} */
    this.wasmMemory = wasmMemory;

    /** @type {Map<string, GPUBuffer>} */
    this.buffers = new Map();

    /** @type {Map<string, ArrayBuffer>} */
    this.stagingBuffers = new Map();

    /** @type {boolean} */
    this.useSharedArrayBuffer = this._checkSharedArrayBufferSupport();

    /** @type {Map<string, {offset: number, length: number}>} */
    this.memoryRegions = new Map();

    console.log('[WASMGPUBridge] Initialized', {
      sharedArrayBuffer: this.useSharedArrayBuffer,
      hasWASMMemory: !!wasmMemory
    });
  }

  /**
   * Check if SharedArrayBuffer is available
   * Required for zero-copy transfers in audio worklets
   * @private
   * @returns {boolean}
   */
  _checkSharedArrayBufferSupport() {
    try {
      // Check if SharedArrayBuffer is available
      if (typeof SharedArrayBuffer === 'undefined') {
        console.warn('[WASMGPUBridge] SharedArrayBuffer not available');
        return false;
      }

      // Check if cross-origin isolated (required for SharedArrayBuffer)
      if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
        console.warn('[WASMGPUBridge] Not cross-origin isolated, SharedArrayBuffer disabled');
        return false;
      }

      return true;
    } catch (e) {
      console.warn('[WASMGPUBridge] SharedArrayBuffer check failed:', e);
      return false;
    }
  }

  /**
   * Set WASM memory instance (can be called after construction)
   * @param {WebAssembly.Memory} memory - WASM memory instance
   */
  setWASMMemory(memory) {
    if (!memory || !(memory instanceof WebAssembly.Memory)) {
      throw new Error('[WASMGPUBridge] Invalid WASM memory instance');
    }
    this.wasmMemory = memory;
    console.log('[WASMGPUBridge] WASM memory set');
  }

  /**
   * Create a GPU buffer with optional WASM memory mapping
   * @param {string} id - Unique buffer identifier
   * @param {number} size - Buffer size in bytes (must be multiple of 4)
   * @param {number} usage - GPUBufferUsage flags
   * @param {boolean} [mapToWASM=false] - Whether to map to WASM memory
   * @returns {GPUBuffer}
   */
  createBuffer(id, size, usage, mapToWASM = false) {
    if (this.buffers.has(id)) {
      throw new Error(`[WASMGPUBridge] Buffer '${id}' already exists`);
    }

    // Ensure size is multiple of 4 (GPU alignment requirement)
    const alignedSize = Math.ceil(size / 4) * 4;

    const buffer = this.device.createBuffer({
      size: alignedSize,
      usage: usage | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false
    });

    this.buffers.set(id, buffer);

    // Create staging buffer for CPU-GPU transfers
    const stagingBuffer = this.useSharedArrayBuffer
      ? new SharedArrayBuffer(alignedSize)
      : new ArrayBuffer(alignedSize);
    
    this.stagingBuffers.set(id, stagingBuffer);

    if (mapToWASM && this.wasmMemory) {
      // Register memory region for WASM access
      // In production, WASM module would allocate this region
      this.memoryRegions.set(id, {
        offset: 0, // Would be allocated by WASM allocator
        length: alignedSize
      });
    }

    console.log('[WASMGPUBridge] Created buffer', { id, size: alignedSize, mapToWASM });
    return buffer;
  }

  /**
   * Get a view of WASM memory for a registered buffer
   * @param {string} id - Buffer identifier
   * @returns {WASMMemoryView|null}
   */
  getWASMMemoryView(id) {
    if (!this.wasmMemory) {
      console.warn('[WASMGPUBridge] No WASM memory available');
      return null;
    }

    const region = this.memoryRegions.get(id);
    if (!region) {
      console.warn(`[WASMGPUBridge] No memory region for buffer '${id}'`);
      return null;
    }

    const buffer = this.wasmMemory.buffer;
    
    return {
      uint8: new Uint8Array(buffer, region.offset, region.length),
      float32: new Float32Array(buffer, region.offset, region.length / 4),
      int16: new Int16Array(buffer, region.offset, region.length / 2),
      byteOffset: region.offset,
      byteLength: region.length
    };
  }

  /**
   * Write data from staging buffer to GPU buffer
   * @param {string} id - Buffer identifier
   * @param {ArrayBuffer|TypedArray} data - Data to write
   * @param {number} [offset=0] - Offset in buffer (bytes)
   * @returns {Promise<void>}
   */
  async writeBuffer(id, data, offset = 0) {
    const startTime = performance.now();
    
    const buffer = this.buffers.get(id);
    if (!buffer) {
      throw new Error(`[WASMGPUBridge] Buffer '${id}' not found`);
    }

    // Convert to Uint8Array if needed
    const uint8Data = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    // Write to GPU buffer
    this.device.queue.writeBuffer(buffer, offset, uint8Data);

    // Also update staging buffer
    const stagingBuffer = this.stagingBuffers.get(id);
    if (stagingBuffer) {
      const stagingView = new Uint8Array(stagingBuffer, offset);
      stagingView.set(uint8Data);
    }

    const duration = performance.now() - startTime;
    if (duration > 5) {
      console.warn(`[WASMGPUBridge] writeBuffer took ${duration.toFixed(2)}ms (target: <5ms)`);
    }
  }

  /**
   * Read data from GPU buffer to staging buffer
   * @param {string} id - Buffer identifier
   * @param {number} [offset=0] - Offset in buffer (bytes)
   * @param {number} [size] - Number of bytes to read (default: entire buffer)
   * @returns {Promise<ArrayBuffer>}
   */
  async readBuffer(id, offset = 0, size) {
    const startTime = performance.now();
    
    const buffer = this.buffers.get(id);
    if (!buffer) {
      throw new Error(`[WASMGPUBridge] Buffer '${id}' not found`);
    }

    const readSize = size ?? buffer.size - offset;

    // Create temporary read buffer
    const readBuffer = this.device.createBuffer({
      size: readSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // Copy from GPU buffer to read buffer
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, offset, readBuffer, 0, readSize);
    this.device.queue.submit([commandEncoder.finish()]);

    // Map and read
    await readBuffer.mapAsync(GPUMapMode.READ);
    const data = readBuffer.getMappedRange();
    const result = data.slice(0); // Copy data
    readBuffer.unmap();
    readBuffer.destroy();

    const duration = performance.now() - startTime;
    if (duration > 5) {
      console.warn(`[WASMGPUBridge] readBuffer took ${duration.toFixed(2)}ms (target: <5ms)`);
    }

    return result;
  }

  /**
   * Get staging buffer for direct CPU access
   * Use this for low-latency audio processing
   * @param {string} id - Buffer identifier
   * @returns {ArrayBuffer|null}
   */
  getStagingBuffer(id) {
    return this.stagingBuffers.get(id) ?? null;
  }

  /**
   * Sync staging buffer to GPU buffer
   * Call this after modifying staging buffer directly
   * @param {string} id - Buffer identifier
   * @returns {Promise<void>}
   */
  async syncToGPU(id) {
    const stagingBuffer = this.stagingBuffers.get(id);
    if (!stagingBuffer) {
      throw new Error(`[WASMGPUBridge] No staging buffer for '${id}'`);
    }

    await this.writeBuffer(id, stagingBuffer);
  }

  /**
   * Sync GPU buffer to staging buffer
   * Call this to read GPU results into CPU-accessible memory
   * @param {string} id - Buffer identifier
   * @returns {Promise<void>}
   */
  async syncFromGPU(id) {
    const data = await this.readBuffer(id);
    const stagingBuffer = this.stagingBuffers.get(id);
    
    if (stagingBuffer) {
      const view = new Uint8Array(stagingBuffer);
      view.set(new Uint8Array(data));
    }
  }

  /**
   * Get GPU buffer by ID
   * @param {string} id - Buffer identifier
   * @returns {GPUBuffer|null}
   */
  getBuffer(id) {
    return this.buffers.get(id) ?? null;
  }

  /**
   * Destroy a buffer and free resources
   * @param {string} id - Buffer identifier
   */
  destroyBuffer(id) {
    const buffer = this.buffers.get(id);
    if (buffer) {
      buffer.destroy();
      this.buffers.delete(id);
    }

    this.stagingBuffers.delete(id);
    this.memoryRegions.delete(id);

    console.log('[WASMGPUBridge] Destroyed buffer', { id });
  }

  /**
   * Destroy all buffers and clean up
   */
  destroy() {
    for (const [id, buffer] of this.buffers) {
      buffer.destroy();
    }

    this.buffers.clear();
    this.stagingBuffers.clear();
    this.memoryRegions.clear();

    console.log('[WASMGPUBridge] Destroyed all buffers');
  }

  /**
   * Get performance statistics
   * @returns {Object}
   */
  getStats() {
    return {
      bufferCount: this.buffers.size,
      totalMemory: Array.from(this.stagingBuffers.values())
        .reduce((sum, buf) => sum + buf.byteLength, 0),
      useSharedArrayBuffer: this.useSharedArrayBuffer,
      hasWASMMemory: !!this.wasmMemory
    };
  }
}