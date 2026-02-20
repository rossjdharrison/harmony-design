//! WASM Edge Executor
//! 
//! High-performance edge traversal and binary format operations for graph processing.
//! Compiled to WebAssembly for browser and Node.js environments.
//!
//! See: harmony-design/DESIGN_SYSTEM.md#wasm-edge-executor

mod edge_binary_format;

pub use edge_binary_format::{
    EdgeBinaryFormat,
    EDGE_SIZE,
    serialize_edges,
    deserialize_edges,
};

use wasm_bindgen::prelude::*;

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get the version of the edge executor
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}