//! WASMBridge: Zero-copy JavaScript ↔ WASM communication layer
//! 
//! Provides efficient data transfer between JavaScript and WebAssembly with
//! zero-copy optimization for large buffers using SharedArrayBuffer.
//! 
//! See: harmony-design/DESIGN_SYSTEM.md#wasm-bridge

use wasm_bindgen::prelude::*;
use std::slice;

/// Shared memory pool for zero-copy transfers
static mut SHARED_BUFFER: Vec<u8> = Vec::new();

/// Initialize shared buffer with specified capacity
/// 
/// # Arguments
/// * `capacity` - Initial buffer capacity in bytes
/// 
/// # Returns
/// Pointer to the shared buffer for JavaScript access
#[wasm_bindgen]
pub fn init_shared_buffer(capacity: usize) -> *mut u8 {
    unsafe {
        SHARED_BUFFER = Vec::with_capacity(capacity);
        SHARED_BUFFER.set_len(capacity);
        SHARED_BUFFER.as_mut_ptr()
    }
}

/// Get pointer to shared buffer (for zero-copy reads)
#[wasm_bindgen]
pub fn get_shared_buffer_ptr() -> *const u8 {
    unsafe { SHARED_BUFFER.as_ptr() }
}

/// Get current shared buffer length
#[wasm_bindgen]
pub fn get_shared_buffer_len() -> usize {
    unsafe { SHARED_BUFFER.len() }
}

/// Write data to shared buffer at offset (zero-copy from JS TypedArray)
/// 
/// # Arguments
/// * `offset` - Byte offset in shared buffer
/// * `data` - Pointer to source data
/// * `len` - Length of data in bytes
/// 
/// # Safety
/// Caller must ensure data pointer is valid and len is accurate
#[wasm_bindgen]
pub unsafe fn write_to_shared_buffer(offset: usize, data: *const u8, len: usize) -> bool {
    if offset + len > SHARED_BUFFER.len() {
        return false;
    }
    
    let src = slice::from_raw_parts(data, len);
    let dst = &mut SHARED_BUFFER[offset..offset + len];
    dst.copy_from_slice(src);
    true
}

/// Read data from shared buffer at offset (zero-copy to JS TypedArray)
/// 
/// # Arguments
/// * `offset` - Byte offset in shared buffer
/// * `len` - Length of data to read
/// 
/// # Returns
/// Pointer to data in shared buffer (no copy)
#[wasm_bindgen]
pub fn read_from_shared_buffer(offset: usize, len: usize) -> *const u8 {
    unsafe {
        if offset + len > SHARED_BUFFER.len() {
            return std::ptr::null();
        }
        SHARED_BUFFER[offset..].as_ptr()
    }
}

/// Message header for structured communication
#[repr(C)]
#[derive(Clone, Copy)]
pub struct MessageHeader {
    pub msg_type: u32,
    pub payload_offset: u32,
    pub payload_len: u32,
    pub sequence: u32,
}

/// Write message header to shared buffer
#[wasm_bindgen]
pub fn write_message_header(
    offset: usize,
    msg_type: u32,
    payload_offset: u32,
    payload_len: u32,
    sequence: u32,
) -> bool {
    unsafe {
        if offset + std::mem::size_of::<MessageHeader>() > SHARED_BUFFER.len() {
            return false;
        }
        
        let header = MessageHeader {
            msg_type,
            payload_offset,
            payload_len,
            sequence,
        };
        
        let header_bytes = slice::from_raw_parts(
            &header as *const MessageHeader as *const u8,
            std::mem::size_of::<MessageHeader>(),
        );
        
        let dst = &mut SHARED_BUFFER[offset..offset + header_bytes.len()];
        dst.copy_from_slice(header_bytes);
        true
    }
}

/// Read message header from shared buffer
#[wasm_bindgen]
pub fn read_message_header(offset: usize) -> *const MessageHeader {
    unsafe {
        if offset + std::mem::size_of::<MessageHeader>() > SHARED_BUFFER.len() {
            return std::ptr::null();
        }
        
        &SHARED_BUFFER[offset] as *const u8 as *const MessageHeader
    }
}

/// Allocate space in shared buffer and return offset
/// Simple bump allocator for demo purposes
static mut ALLOC_OFFSET: usize = 0;

#[wasm_bindgen]
pub fn allocate_in_shared_buffer(size: usize) -> i32 {
    unsafe {
        if ALLOC_OFFSET + size > SHARED_BUFFER.len() {
            return -1; // Out of memory
        }
        
        let offset = ALLOC_OFFSET;
        ALLOC_OFFSET += size;
        offset as i32
    }
}

/// Reset allocator (for testing or cleanup)
#[wasm_bindgen]
pub fn reset_shared_buffer_allocator() {
    unsafe {
        ALLOC_OFFSET = 0;
    }
}

/// Get memory statistics
#[wasm_bindgen]
pub fn get_memory_stats() -> Vec<u32> {
    unsafe {
        vec![
            SHARED_BUFFER.len() as u32,
            ALLOC_OFFSET as u32,
            (SHARED_BUFFER.len() - ALLOC_OFFSET) as u32,
        ]
    }
}