/**
 * WASMBridge: JavaScript ↔ WASM Communication Layer
 * 
 * Provides zero-copy data transfer between JavaScript and WebAssembly
 * using SharedArrayBuffer for large data transfers.
 * 
 * @module WASMBridge
 * @see {@link file://./DESIGN_SYSTEM.md#wasm-bridge WASMBridge Documentation}
 */

/**
 * Message types for structured communication
 * @enum {number}
 */
export const MessageType = {
  GRAPH_UPDATE: 1,
  NODE_EXECUTE: 2,
  EDGE_TRAVERSE: 3,
  PROPS_UPDATE: 4,
  RESULT: 5,
  ERROR: 6,
};

/**
 * Message header structure (matches Rust MessageHeader)
 * @typedef {Object} MessageHeader
 * @property {number} msgType - Message type identifier
 * @property {number} payloadOffset - Offset of payload in shared buffer
 * @property {number} payloadLen - Length of payload in bytes
 * @property {number} sequence - Message sequence number
 */

/**
 * WASMBridge class for managing WASM communication
 */
export class WASMBridge {
  /**
   * @param {WebAssembly.Instance} wasmInstance - Initialized WASM instance
   * @param {number} bufferSize - Size of shared buffer in bytes (default: 1MB)
   */
  constructor(wasmInstance, bufferSize = 1024 * 1024) {
    this.wasm = wasmInstance.exports;
    this.memory = wasmInstance.exports.memory;
    this.bufferSize = bufferSize;
    this.sequence = 0;
    this.messageHandlers = new Map();
    
    // Initialize shared buffer
    this.sharedBufferPtr = this.wasm.init_shared_buffer(bufferSize);
    this.sharedBuffer = new Uint8Array(
      this.memory.buffer,
      this.sharedBufferPtr,
      bufferSize
    );
    
    // Message header size (4 u32 fields = 16 bytes)
    this.headerSize = 16;
    
    console.log(`[WASMBridge] Initialized with ${bufferSize} byte buffer`);
  }
  
  /**
   * Write data to shared buffer (zero-copy)
   * 
   * @param {Uint8Array} data - Data to write
   * @param {number} offset - Offset in shared buffer
   * @returns {boolean} Success status
   */
  writeToSharedBuffer(data, offset) {
    if (offset + data.length > this.bufferSize) {
      console.error('[WASMBridge] Buffer overflow prevented');
      return false;
    }
    
    // Zero-copy: directly set bytes in shared buffer view
    this.sharedBuffer.set(data, offset);
    return true;
  }
  
  /**
   * Read data from shared buffer (zero-copy view)
   * 
   * @param {number} offset - Offset in shared buffer
   * @param {number} length - Length to read
   * @returns {Uint8Array} View into shared buffer (no copy)
   */
  readFromSharedBuffer(offset, length) {
    if (offset + length > this.bufferSize) {
      console.error('[WASMBridge] Read out of bounds');
      return null;
    }
    
    // Return subarray (view, not copy)
    return this.sharedBuffer.subarray(offset, offset + length);
  }
  
  /**
   * Send message to WASM with zero-copy payload
   * 
   * @param {number} msgType - Message type from MessageType enum
   * @param {Uint8Array} payload - Message payload
   * @returns {number} Message sequence number
   */
  sendMessage(msgType, payload) {
    const seq = this.sequence++;
    
    // Allocate space for header + payload
    const totalSize = this.headerSize + payload.length;
    const offset = this.wasm.allocate_in_shared_buffer(totalSize);
    
    if (offset < 0) {
      console.error('[WASMBridge] Failed to allocate buffer space');
      return -1;
    }
    
    // Write header
    const payloadOffset = offset + this.headerSize;
    this.wasm.write_message_header(
      offset,
      msgType,
      payloadOffset,
      payload.length,
      seq
    );
    
    // Write payload (zero-copy)
    this.writeToSharedBuffer(payload, payloadOffset);
    
    return seq;
  }
  
  /**
   * Read message from shared buffer
   * 
   * @param {number} offset - Offset of message header
   * @returns {MessageHeader|null} Parsed message header
   */
  readMessageHeader(offset) {
    if (offset + this.headerSize > this.bufferSize) {
      return null;
    }
    
    const view = new DataView(
      this.memory.buffer,
      this.sharedBufferPtr + offset,
      this.headerSize
    );
    
    return {
      msgType: view.getUint32(0, true),
      payloadOffset: view.getUint32(4, true),
      payloadLen: view.getUint32(8, true),
      sequence: view.getUint32(12, true),
    };
  }
  
  /**
   * Register handler for message type
   * 
   * @param {number} msgType - Message type to handle
   * @param {Function} handler - Handler function(payload, header)
   */
  onMessage(msgType, handler) {
    this.messageHandlers.set(msgType, handler);
  }
  
  /**
   * Process message at offset (call registered handler)
   * 
   * @param {number} offset - Offset of message in shared buffer
   */
  processMessage(offset) {
    const header = this.readMessageHeader(offset);
    if (!header) {
      console.error('[WASMBridge] Invalid message header');
      return;
    }
    
    const handler = this.messageHandlers.get(header.msgType);
    if (!handler) {
      console.warn(`[WASMBridge] No handler for message type ${header.msgType}`);
      return;
    }
    
    // Get payload view (zero-copy)
    const payload = this.readFromSharedBuffer(
      header.payloadOffset,
      header.payloadLen
    );
    
    handler(payload, header);
  }
  
  /**
   * Get memory statistics
   * 
   * @returns {Object} Memory usage stats
   */
  getMemoryStats() {
    const stats = this.wasm.get_memory_stats();
    return {
      totalBytes: stats[0],
      usedBytes: stats[1],
      freeBytes: stats[2],
      usagePercent: ((stats[1] / stats[0]) * 100).toFixed(2),
    };
  }
  
  /**
   * Reset buffer allocator (for testing)
   */
  reset() {
    this.wasm.reset_shared_buffer_allocator();
    this.sequence = 0;
    console.log('[WASMBridge] Reset complete');
  }
  
  /**
   * Encode string to UTF-8 bytes
   * 
   * @param {string} str - String to encode
   * @returns {Uint8Array} UTF-8 encoded bytes
   */
  static encodeString(str) {
    return new TextEncoder().encode(str);
  }
  
  /**
   * Decode UTF-8 bytes to string
   * 
   * @param {Uint8Array} bytes - UTF-8 bytes
   * @returns {string} Decoded string
   */
  static decodeString(bytes) {
    return new TextDecoder().decode(bytes);
  }
  
  /**
   * Encode JSON to bytes
   * 
   * @param {Object} obj - Object to encode
   * @returns {Uint8Array} JSON bytes
   */
  static encodeJSON(obj) {
    return WASMBridge.encodeString(JSON.stringify(obj));
  }
  
  /**
   * Decode JSON from bytes
   * 
   * @param {Uint8Array} bytes - JSON bytes
   * @returns {Object} Parsed object
   */
  static decodeJSON(bytes) {
    return JSON.parse(WASMBridge.decodeString(bytes));
  }
}

/**
 * Create WASMBridge instance from WASM module URL
 * 
 * @param {string} wasmUrl - URL to WASM module
 * @param {number} bufferSize - Shared buffer size
 * @returns {Promise<WASMBridge>} Initialized bridge
 */
export async function createWASMBridge(wasmUrl, bufferSize = 1024 * 1024) {
  try {
    const response = await fetch(wasmUrl);
    const wasmBytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.compile(wasmBytes);
    const wasmInstance = await WebAssembly.instantiate(wasmModule);
    
    return new WASMBridge(wasmInstance, bufferSize);
  } catch (error) {
    console.error('[WASMBridge] Failed to initialize:', error);
    throw error;
  }
}