/**
 * GPU Synchronization Type Definitions
 * 
 * Defines TypeScript interfaces for GPU synchronization patterns.
 * 
 * @see docs/gpu-synchronization-spec.md
 * @module types/gpu-sync
 */

/**
 * Buffer modes for GPU-Audio synchronization
 */
export type BufferMode = 'double' | 'ring' | 'triple';

/**
 * Command priority levels
 */
export type CommandPriority = 'high' | 'medium' | 'low';

/**
 * GPU operation types
 */
export type GPUOperation = 'process' | 'analyze' | 'visualize';

/**
 * Configuration for GPU synchronization
 */
export interface GPUSyncConfig {
  /** Buffer mode to use */
  bufferMode: BufferMode;
  
  /** Size of each buffer in bytes (must be power of 2) */
  bufferSizeBytes: number;
  
  /** Maximum time to wait for fence in milliseconds */
  fenceTimeoutMs?: number;
  
  /** Number of priority levels for command queue */
  priorityLevels?: number;
  
  /** Whether to enable performance monitoring */
  enableMetrics?: boolean;
}

/**
 * GPU command for execution queue
 */
export interface GPUCommand {
  /** Unique command identifier */
  id: string;
  
  /** Priority level */
  priority: CommandPriority;
  
  /** Operation type */
  operation: GPUOperation;
  
  /** Input buffer identifier */
  inputBuffer: string;
  
  /** Output buffer identifier */
  outputBuffer: string;
  
  /** Operation-specific parameters */
  parameters?: Record<string, unknown>;
  
  /** Timestamp when command was created */
  timestamp?: number;
}

/**
 * GPU fence for synchronization
 */
export interface GPUFence {
  /** Check if fence has been signaled (non-blocking) */
  isSignaled(): boolean;
  
  /** Wait for fence to be signaled (blocking, use with caution) */
  wait(timeoutMs?: number): Promise<void>;
  
  /** Reset fence to unsignaled state */
  reset(): void;
  
  /** Dispose of fence resources */
  dispose(): void;
}

/**
 * Double buffer for GPU-Audio sync
 */
export interface DoubleBuffer {
  /** Get the currently active buffer for reading */
  getActiveBuffer(): Float32Array;
  
  /** Get the inactive buffer for writing */
  getInactiveBuffer(): Float32Array;
  
  /** Swap active and inactive buffers */
  swap(): void;
  
  /** Get the fence for current write operation */
  getFence(): GPUFence;
  
  /** Dispose of buffer resources */
  dispose(): void;
}

/**
 * Ring buffer for streaming data
 */
export interface RingBuffer {
  /** Write samples to the ring buffer */
  write(samples: Float32Array): boolean;
  
  /** Read samples from the ring buffer */
  read(count: number): Float32Array | null;
  
  /** Get number of available samples to read */
  available(): number;
  
  /** Get remaining space for writing */
  space(): number;
  
  /** Clear all data from buffer */
  clear(): void;
  
  /** Dispose of buffer resources */
  dispose(): void;
}

/**
 * Command queue with priority
 */
export interface CommandQueue {
  /** Submit a command to the queue */
  submit(command: GPUCommand): void;
  
  /** Get next command to execute (respects priority) */
  next(): GPUCommand | null;
  
  /** Get number of pending commands */
  size(): number;
  
  /** Get number of pending commands by priority */
  sizeByPriority(priority: CommandPriority): number;
  
  /** Clear all pending commands */
  clear(): void;
  
  /** Dispose of queue resources */
  dispose(): void;
}

/**
 * Performance metrics for GPU synchronization
 */
export interface GPUSyncMetrics {
  /** Average fence wait time in milliseconds */
  fenceWaitTimeMs: number;
  
  /** Total number of buffer swaps */
  bufferSwapCount: number;
  
  /** Number of ring buffer overflows */
  overflowCount: number;
  
  /** Number of fence timeouts */
  timeoutCount: number;
  
  /** GPU utilization percentage (0-100) */
  gpuUtilization: number;
  
  /** End-to-end audio latency in milliseconds */
  audioLatencyMs: number;
  
  /** Number of commands executed */
  commandsExecuted: number;
  
  /** Average command execution time in milliseconds */
  avgCommandTimeMs: number;
}

/**
 * GPU synchronization manager
 */
export interface GPUSyncManager {
  /** Initialize synchronization with configuration */
  initialize(config: GPUSyncConfig): Promise<void>;
  
  /** Create a double buffer */
  createDoubleBuffer(sizeBytes: number): Promise<DoubleBuffer>;
  
  /** Create a ring buffer */
  createRingBuffer(sizeBytes: number): Promise<RingBuffer>;
  
  /** Create a command queue */
  createCommandQueue(): CommandQueue;
  
  /** Create a GPU fence */
  createFence(): GPUFence;
  
  /** Get current performance metrics */
  getMetrics(): GPUSyncMetrics;
  
  /** Reset performance metrics */
  resetMetrics(): void;
  
  /** Shutdown and cleanup all resources */
  shutdown(): Promise<void>;
}

/**
 * Atomic control block for SharedArrayBuffer
 */
export interface AtomicControlBlock {
  /** Read index (atomic) */
  readonly readIndex: number;
  
  /** Write index (atomic) */
  readonly writeIndex: number;
  
  /** Fence status (atomic) */
  readonly fenceStatus: number;
  
  /** Buffer size in samples */
  readonly bufferSize: number;
  
  /** Sample rate */
  readonly sampleRate: number;
  
  /** Atomically load a value */
  load(offset: number): number;
  
  /** Atomically store a value */
  store(offset: number, value: number): void;
  
  /** Atomically compare and exchange */
  compareExchange(offset: number, expected: number, replacement: number): number;
  
  /** Notify waiters */
  notify(offset: number, count?: number): number;
  
  /** Wait for notification */
  wait(offset: number, value: number, timeout?: number): 'ok' | 'not-equal' | 'timed-out';
}

/**
 * Offsets for atomic control block
 */
export enum ControlBlockOffset {
  READ_INDEX = 0,
  WRITE_INDEX = 1,
  FENCE_STATUS = 2,
  BUFFER_SIZE = 3,
  SAMPLE_RATE = 4,
}

/**
 * Fence status values
 */
export enum FenceStatus {
  UNSIGNALED = 0,
  SIGNALED = 1,
}