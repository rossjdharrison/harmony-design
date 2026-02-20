/**
 * Edge Propagation GPU Pipeline
 * 
 * TypeScript wrapper for edge-cascade-propagation.wgsl compute shader.
 * Manages GPU buffers, pipeline creation, and dispatch.
 * 
 * VISION: GPU-First Audio - Enables <10ms graph update latency
 * POLICY: Rule 25 - Audio processing MUST have WebGPU implementation
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#gpu-compute-pipelines
 * @see harmony-graph/src/shaders/edge-cascade-propagation.wgsl
 */

/**
 * Edge data structure matching WGSL layout
 */
export interface Edge {
  sourceId: number;
  targetId: number;
  weight: number;
  flags: number; // bit 0: active, bit 1: bidirectional
}

/**
 * Node state structure matching WGSL layout
 */
export interface NodeState {
  value: number;
  dirty: number;
  generation: number;
  reserved: number;
}

/**
 * Propagation metadata
 */
export interface PropagationMeta {
  totalEdges: number;
  activeNodes: number;
  currentGeneration: number;
  maxDepth: number;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  maxEdges: number;
  maxNodes: number;
  workgroupSize: number;
}

/**
 * Propagation result
 */
export interface PropagationResult {
  propagationCount: number;
  generation: number;
  states: NodeState[];
}

/**
 * Edge Propagation GPU Pipeline
 * 
 * Manages WebGPU resources for edge cascade propagation.
 * Supports both unlimited and depth-limited propagation modes.
 * 
 * @example
 * ```typescript
 * const pipeline = new EdgePropagationPipeline(device, {
 *   maxEdges: 10000,
 *   maxNodes: 1000,
 *   workgroupSize: 256
 * });
 * 
 * await pipeline.initialize();
 * 
 * const result = await pipeline.propagate(edges, states, {
 *   totalEdges: edges.length,
 *   activeNodes: states.length,
 *   currentGeneration: 0,
 *   maxDepth: 10
 * });
 * ```
 */
export class EdgePropagationPipeline {
  private device: GPUDevice;
  private config: PipelineConfig;
  
  // Shader module and pipelines
  private shaderModule: GPUShaderModule | null = null;
  private propagatePipeline: GPUComputePipeline | null = null;
  private propagateLimitedPipeline: GPUComputePipeline | null = null;
  private clearFlagsPipeline: GPUComputePipeline | null = null;
  private initializePipeline: GPUComputePipeline | null = null;
  
  // GPU buffers
  private edgeBuffer: GPUBuffer | null = null;
  private inputStateBuffer: GPUBuffer | null = null;
  private outputStateBuffer: GPUBuffer | null = null;
  private metaBuffer: GPUBuffer | null = null;
  private counterBuffer: GPUBuffer | null = null;
  private readbackBuffer: GPUBuffer | null = null;
  
  // Bind group
  private bindGroup: GPUBindGroup | null = null;
  
  /**
   * Create edge propagation pipeline
   * 
   * @param device - WebGPU device
   * @param config - Pipeline configuration
   */
  constructor(device: GPUDevice, config: PipelineConfig) {
    this.device = device;
    this.config = config;
  }
  
  /**
   * Initialize GPU resources
   * 
   * Loads shader, creates pipelines, and allocates buffers.
   * Must be called before propagate().
   * 
   * Performance: <50ms initialization time
   */
  async initialize(): Promise<void> {
    // Load shader code
    const shaderCode = await this.loadShaderCode();
    
    // Create shader module
    this.shaderModule = this.device.createShaderModule({
      label: 'Edge Cascade Propagation Shader',
      code: shaderCode
    });
    
    // Create compute pipelines
    await this.createPipelines();
    
    // Allocate GPU buffers
    this.allocateBuffers();
    
    // Create bind group
    this.createBindGroup();
  }
  
  /**
   * Load WGSL shader code
   * 
   * In production, this would load from bundled asset.
   * For now, returns inline code for testing.
   */
  private async loadShaderCode(): Promise<string> {
    // In production: fetch('/shaders/edge-cascade-propagation.wgsl')
    // For now, shader is in separate .wgsl file
    const response = await fetch(new URL(
      '../shaders/edge-cascade-propagation.wgsl',
      import.meta.url
    ));
    return response.text();
  }
  
  /**
   * Create compute pipelines
   */
  private async createPipelines(): Promise<void> {
    if (!this.shaderModule) {
      throw new Error('Shader module not loaded');
    }
    
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Edge Propagation Bind Group Layout',
      entries: [
        // Edges buffer (read-only storage)
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        // Input states buffer (read-only storage)
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        // Metadata uniform
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        },
        // Output states buffer (storage)
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        // Propagation counter (storage)
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        }
      ]
    });
    
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Edge Propagation Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout]
    });
    
    // Main propagation pipeline
    this.propagatePipeline = this.device.createComputePipeline({
      label: 'Propagate Edge Pipeline',
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: 'propagate_edge'
      }
    });
    
    // Depth-limited propagation pipeline
    this.propagateLimitedPipeline = this.device.createComputePipeline({
      label: 'Propagate Edge Limited Pipeline',
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: 'propagate_edge_limited'
      }
    });
    
    // Clear flags pipeline
    this.clearFlagsPipeline = this.device.createComputePipeline({
      label: 'Clear Dirty Flags Pipeline',
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: 'clear_dirty_flags'
      }
    });
    
    // Initialize cascade pipeline
    this.initializePipeline = this.device.createComputePipeline({
      label: 'Initialize Cascade Pipeline',
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: 'initialize_cascade'
      }
    });
  }
  
  /**
   * Allocate GPU buffers
   */
  private allocateBuffers(): void {
    const edgeSize = 16; // 4 u32 = 16 bytes per edge
    const stateSize = 16; // 4 u32 = 16 bytes per state
    const metaSize = 16; // 4 u32 = 16 bytes
    
    // Edge buffer
    this.edgeBuffer = this.device.createBuffer({
      label: 'Edge Buffer',
      size: this.config.maxEdges * edgeSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    
    // Input state buffer
    this.inputStateBuffer = this.device.createBuffer({
      label: 'Input State Buffer',
      size: this.config.maxNodes * stateSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    
    // Output state buffer
    this.outputStateBuffer = this.device.createBuffer({
      label: 'Output State Buffer',
      size: this.config.maxNodes * stateSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    
    // Metadata uniform buffer
    this.metaBuffer = this.device.createBuffer({
      label: 'Metadata Buffer',
      size: metaSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    // Propagation counter
    this.counterBuffer = this.device.createBuffer({
      label: 'Counter Buffer',
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    
    // Readback buffer (for getting results back to CPU)
    this.readbackBuffer = this.device.createBuffer({
      label: 'Readback Buffer',
      size: this.config.maxNodes * stateSize + 4, // states + counter
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
  }
  
  /**
   * Create bind group
   */
  private createBindGroup(): void {
    if (!this.propagatePipeline) {
      throw new Error('Pipelines not created');
    }
    
    this.bindGroup = this.device.createBindGroup({
      label: 'Edge Propagation Bind Group',
      layout: this.propagatePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.edgeBuffer! } },
        { binding: 1, resource: { buffer: this.inputStateBuffer! } },
        { binding: 2, resource: { buffer: this.metaBuffer! } },
        { binding: 3, resource: { buffer: this.outputStateBuffer! } },
        { binding: 4, resource: { buffer: this.counterBuffer! } }
      ]
    });
  }
  
  /**
   * Propagate edges on GPU
   * 
   * Executes cascade propagation with optional depth limit.
   * Returns updated node states and propagation count.
   * 
   * @param edges - Edge array
   * @param states - Initial node states
   * @param meta - Propagation metadata
   * @param depthLimited - Use depth-limited kernel
   * @returns Propagation result
   * 
   * Performance target: <1ms for 10k edges
   */
  async propagate(
    edges: Edge[],
    states: NodeState[],
    meta: PropagationMeta,
    depthLimited: boolean = false
  ): Promise<PropagationResult> {
    if (!this.bindGroup) {
      throw new Error('Pipeline not initialized');
    }
    
    // Upload data to GPU
    this.uploadEdges(edges);
    this.uploadStates(states);
    this.uploadMeta(meta);
    this.resetCounter();
    
    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder({
      label: 'Edge Propagation Commands'
    });
    
    // Initialize cascade
    const initPass = commandEncoder.beginComputePass({
      label: 'Initialize Cascade Pass'
    });
    initPass.setPipeline(this.initializePipeline!);
    initPass.setBindGroup(0, this.bindGroup);
    const initWorkgroups = Math.ceil(meta.activeNodes / this.config.workgroupSize);
    initPass.dispatchWorkgroups(initWorkgroups);
    initPass.end();
    
    // Propagate edges
    const propagatePass = commandEncoder.beginComputePass({
      label: 'Propagate Edges Pass'
    });
    const pipeline = depthLimited ? this.propagateLimitedPipeline! : this.propagatePipeline!;
    propagatePass.setPipeline(pipeline);
    propagatePass.setBindGroup(0, this.bindGroup);
    const workgroups = Math.ceil(meta.totalEdges / this.config.workgroupSize);
    propagatePass.dispatchWorkgroups(workgroups);
    propagatePass.end();
    
    // Copy results to readback buffer
    const stateSize = 16;
    commandEncoder.copyBufferToBuffer(
      this.outputStateBuffer!,
      0,
      this.readbackBuffer!,
      0,
      states.length * stateSize
    );
    commandEncoder.copyBufferToBuffer(
      this.counterBuffer!,
      0,
      this.readbackBuffer!,
      states.length * stateSize,
      4
    );
    
    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);
    
    // Read back results
    await this.readbackBuffer!.mapAsync(GPUMapMode.READ);
    const resultData = new Uint32Array(
      this.readbackBuffer!.getMappedRange()
    );
    
    // Parse results
    const resultStates: NodeState[] = [];
    for (let i = 0; i < states.length; i++) {
      const offset = i * 4;
      resultStates.push({
        value: Float32Array.from(resultData.slice(offset, offset + 1))[0],
        dirty: resultData[offset + 1],
        generation: resultData[offset + 2],
        reserved: resultData[offset + 3]
      });
    }
    
    const propagationCount = resultData[states.length * 4];
    
    this.readbackBuffer!.unmap();
    
    return {
      propagationCount,
      generation: meta.currentGeneration + 1,
      states: resultStates
    };
  }
  
  /**
   * Upload edges to GPU
   */
  private uploadEdges(edges: Edge[]): void {
    const data = new Uint32Array(edges.length * 4);
    for (let i = 0; i < edges.length; i++) {
      data[i * 4] = edges[i].sourceId;
      data[i * 4 + 1] = edges[i].targetId;
      data[i * 4 + 2] = new Float32Array([edges[i].weight])[0];
      data[i * 4 + 3] = edges[i].flags;
    }
    this.device.queue.writeBuffer(this.edgeBuffer!, 0, data);
  }
  
  /**
   * Upload node states to GPU
   */
  private uploadStates(states: NodeState[]): void {
    const data = new Uint32Array(states.length * 4);
    for (let i = 0; i < states.length; i++) {
      data[i * 4] = new Float32Array([states[i].value])[0];
      data[i * 4 + 1] = states[i].dirty;
      data[i * 4 + 2] = states[i].generation;
      data[i * 4 + 3] = states[i].reserved;
    }
    this.device.queue.writeBuffer(this.inputStateBuffer!, 0, data);
  }
  
  /**
   * Upload metadata to GPU
   */
  private uploadMeta(meta: PropagationMeta): void {
    const data = new Uint32Array([
      meta.totalEdges,
      meta.activeNodes,
      meta.currentGeneration,
      meta.maxDepth
    ]);
    this.device.queue.writeBuffer(this.metaBuffer!, 0, data);
  }
  
  /**
   * Reset propagation counter
   */
  private resetCounter(): void {
    const data = new Uint32Array([0]);
    this.device.queue.writeBuffer(this.counterBuffer!, 0, data);
  }
  
  /**
   * Clean up GPU resources
   */
  destroy(): void {
    this.edgeBuffer?.destroy();
    this.inputStateBuffer?.destroy();
    this.outputStateBuffer?.destroy();
    this.metaBuffer?.destroy();
    this.counterBuffer?.destroy();
    this.readbackBuffer?.destroy();
  }
}