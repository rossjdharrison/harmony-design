/**
 * Intent Availability Query GPU Executor
 * 
 * Provides high-performance intent availability queries using WebGPU compute shaders.
 * Enables parallel checking of multiple intent states across the graph.
 * 
 * @module harmony-graph/gpu/intent-query
 * @see DESIGN_SYSTEM.md#gpu-first-audio-processing
 * @see harmony-graph/shaders/intent-availability.wgsl
 */

/**
 * Intent state constants (must match WGSL)
 */
export const IntentState = {
  PENDING: 0,
  AVAILABLE: 1,
  UNAVAILABLE: 2,
  SATISFIED: 3,
};

/**
 * Node state constants (must match WGSL)
 */
export const NodeState = {
  INACTIVE: 0,
  ACTIVE: 1,
  PROCESSING: 2,
  ERROR: 3,
};

/**
 * Edge state constants (must match WGSL)
 */
export const EdgeState = {
  DISCONNECTED: 0,
  CONNECTED: 1,
  BLOCKED: 2,
};

/**
 * GPU-accelerated intent availability query executor
 */
export class IntentQueryExecutor {
  /**
   * @param {GPUDevice} device - WebGPU device
   */
  constructor(device) {
    this.device = device;
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.pipelineLayout = null;
    this.initialized = false;
  }

  /**
   * Initialize the GPU pipeline
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    // Load shader module
    const shaderCode = await this._loadShader();
    const shaderModule = this.device.createShaderModule({
      label: 'Intent Availability Query Shader',
      code: shaderCode,
    });

    // Create bind group layout
    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Intent Query Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ],
    });

    // Create pipeline layout
    this.pipelineLayout = this.device.createPipelineLayout({
      label: 'Intent Query Pipeline Layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });

    // Create compute pipeline
    this.pipeline = this.device.createComputePipeline({
      label: 'Intent Query Pipeline',
      layout: this.pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });

    this.initialized = true;
  }

  /**
   * Execute intent availability queries
   * 
   * @param {Array<{intentId: number, targetNodeId: number, requiredState: number, flags: number}>} queries
   * @param {Array<{nodeId: number, state: number, timestamp: number}>} nodes
   * @param {Array<{edgeId: number, sourceNode: number, targetNode: number, state: number}>} edges
   * @returns {Promise<Array<{intentId: number, availability: number, blockingCount: number, firstBlockerId: number}>>}
   */
  async executeQueries(queries, nodes, edges) {
    if (!this.initialized) {
      await this.initialize();
    }

    const timestamp = Date.now();

    // Create configuration buffer
    const configData = new Uint32Array([
      queries.length,
      nodes.length,
      edges.length,
      timestamp,
    ]);
    const configBuffer = this.device.createBuffer({
      label: 'Query Config Buffer',
      size: configData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(configBuffer, 0, configData);

    // Create query buffer
    const queryData = new Uint32Array(queries.length * 4);
    queries.forEach((q, i) => {
      queryData[i * 4 + 0] = q.intentId;
      queryData[i * 4 + 1] = q.targetNodeId;
      queryData[i * 4 + 2] = q.requiredState;
      queryData[i * 4 + 3] = q.flags || 0;
    });
    const queryBuffer = this.device.createBuffer({
      label: 'Query Buffer',
      size: queryData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(queryBuffer, 0, queryData);

    // Create node buffer
    const nodeData = new Uint32Array(nodes.length * 4);
    nodes.forEach((n, i) => {
      nodeData[i * 4 + 0] = n.nodeId;
      nodeData[i * 4 + 1] = n.state;
      nodeData[i * 4 + 2] = n.timestamp || timestamp;
      nodeData[i * 4 + 3] = 0; // reserved
    });
    const nodeBuffer = this.device.createBuffer({
      label: 'Node Buffer',
      size: nodeData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(nodeBuffer, 0, nodeData);

    // Create edge buffer
    const edgeData = new Uint32Array(edges.length * 4);
    edges.forEach((e, i) => {
      edgeData[i * 4 + 0] = e.edgeId;
      edgeData[i * 4 + 1] = e.sourceNode;
      edgeData[i * 4 + 2] = e.targetNode;
      edgeData[i * 4 + 3] = e.state;
    });
    const edgeBuffer = this.device.createBuffer({
      label: 'Edge Buffer',
      size: edgeData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(edgeBuffer, 0, edgeData);

    // Create result buffer
    const resultBuffer = this.device.createBuffer({
      label: 'Result Buffer',
      size: queries.length * 16, // 4 u32s per result
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Create staging buffer for readback
    const stagingBuffer = this.device.createBuffer({
      label: 'Staging Buffer',
      size: queries.length * 16,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      label: 'Intent Query Bind Group',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: configBuffer } },
        { binding: 1, resource: { buffer: queryBuffer } },
        { binding: 2, resource: { buffer: nodeBuffer } },
        { binding: 3, resource: { buffer: edgeBuffer } },
        { binding: 4, resource: { buffer: resultBuffer } },
      ],
    });

    // Execute compute pass
    const commandEncoder = this.device.createCommandEncoder({
      label: 'Intent Query Command Encoder',
    });

    const passEncoder = commandEncoder.beginComputePass({
      label: 'Intent Query Pass',
    });
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    
    const workgroupCount = Math.ceil(queries.length / 64);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();

    // Copy results to staging buffer
    commandEncoder.copyBufferToBuffer(
      resultBuffer,
      0,
      stagingBuffer,
      0,
      queries.length * 16
    );

    this.device.queue.submit([commandEncoder.finish()]);

    // Read back results
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const resultData = new Uint32Array(stagingBuffer.getMappedRange());
    
    const results = [];
    for (let i = 0; i < queries.length; i++) {
      results.push({
        intentId: resultData[i * 4 + 0],
        availability: resultData[i * 4 + 1],
        blockingCount: resultData[i * 4 + 2],
        firstBlockerId: resultData[i * 4 + 3],
      });
    }

    stagingBuffer.unmap();

    // Cleanup
    configBuffer.destroy();
    queryBuffer.destroy();
    nodeBuffer.destroy();
    edgeBuffer.destroy();
    resultBuffer.destroy();
    stagingBuffer.destroy();

    return results;
  }

  /**
   * Load shader code
   * @private
   * @returns {Promise<string>}
   */
  async _loadShader() {
    const response = await fetch('/harmony-graph/shaders/intent-availability.wgsl');
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${response.statusText}`);
    }
    return response.text();
  }

  /**
   * Destroy the executor and free resources
   */
  destroy() {
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.pipelineLayout = null;
    this.initialized = false;
  }
}