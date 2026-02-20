/**
 * Type definitions for WASM-GPU Bridge
 * @module harmony-core/wasm-gpu-bridge
 */

export interface GPUBufferDescriptor {
  size: number;
  usage: number;
  mappedAtCreation: boolean;
}

export interface WASMMemoryView {
  uint8: Uint8Array;
  float32: Float32Array;
  int16: Int16Array;
  byteOffset: number;
  byteLength: number;
}

export interface BridgeStats {
  bufferCount: number;
  totalMemory: number;
  useSharedArrayBuffer: boolean;
  hasWASMMemory: boolean;
}

export class WASMGPUBridge {
  constructor(device: GPUDevice, wasmMemory?: WebAssembly.Memory | null);
  
  readonly device: GPUDevice;
  readonly wasmMemory: WebAssembly.Memory | null;
  readonly useSharedArrayBuffer: boolean;
  
  setWASMMemory(memory: WebAssembly.Memory): void;
  
  createBuffer(
    id: string,
    size: number,
    usage: number,
    mapToWASM?: boolean
  ): GPUBuffer;
  
  getWASMMemoryView(id: string): WASMMemoryView | null;
  
  writeBuffer(
    id: string,
    data: ArrayBuffer | ArrayBufferView,
    offset?: number
  ): Promise<void>;
  
  readBuffer(
    id: string,
    offset?: number,
    size?: number
  ): Promise<ArrayBuffer>;
  
  getStagingBuffer(id: string): ArrayBuffer | null;
  
  syncToGPU(id: string): Promise<void>;
  syncFromGPU(id: string): Promise<void>;
  
  getBuffer(id: string): GPUBuffer | null;
  destroyBuffer(id: string): void;
  destroy(): void;
  
  getStats(): BridgeStats;
}