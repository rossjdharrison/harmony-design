//! EdgeBinaryFormat: Compact binary representation of edge (source, target, type)
//! 
//! Binary Layout (12 bytes total):
//! - Bytes 0-3: Source node ID (u32, little-endian)
//! - Bytes 4-7: Target node ID (u32, little-endian)
//! - Bytes 8-11: Edge type ID (u32, little-endian)
//! 
//! This format is optimized for:
//! - Cache-friendly sequential access
//! - Minimal memory footprint (12 bytes per edge)
//! - Fast serialization/deserialization
//! - SIMD-friendly alignment (4-byte boundaries)
//!
//! See: harmony-design/DESIGN_SYSTEM.md#graph-binary-formats

use wasm_bindgen::prelude::*;

/// Size of a single edge in bytes
pub const EDGE_SIZE: usize = 12;

/// Offset for source node ID field
const SOURCE_OFFSET: usize = 0;

/// Offset for target node ID field
const TARGET_OFFSET: usize = 4;

/// Offset for edge type ID field
const TYPE_OFFSET: usize = 8;

/// Compact binary representation of a graph edge
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EdgeBinaryFormat {
    source: u32,
    target: u32,
    edge_type: u32,
}

#[wasm_bindgen]
impl EdgeBinaryFormat {
    /// Creates a new edge with the given source, target, and type
    ///
    /// # Arguments
    /// * `source` - Source node ID
    /// * `target` - Target node ID
    /// * `edge_type` - Edge type ID
    #[wasm_bindgen(constructor)]
    pub fn new(source: u32, target: u32, edge_type: u32) -> Self {
        Self {
            source,
            target,
            edge_type,
        }
    }

    /// Gets the source node ID
    #[wasm_bindgen(getter)]
    pub fn source(&self) -> u32 {
        self.source
    }

    /// Gets the target node ID
    #[wasm_bindgen(getter)]
    pub fn target(&self) -> u32 {
        self.target
    }

    /// Gets the edge type ID
    #[wasm_bindgen(getter, js_name = edgeType)]
    pub fn edge_type(&self) -> u32 {
        self.edge_type
    }

    /// Serializes the edge to a byte buffer
    ///
    /// # Arguments
    /// * `buffer` - Target buffer (must be at least EDGE_SIZE bytes)
    /// * `offset` - Offset in buffer to write to
    ///
    /// # Returns
    /// Number of bytes written (always EDGE_SIZE)
    #[wasm_bindgen(js_name = toBytes)]
    pub fn to_bytes(&self, buffer: &mut [u8], offset: usize) -> Result<usize, JsValue> {
        if buffer.len() < offset + EDGE_SIZE {
            return Err(JsValue::from_str("Buffer too small for edge serialization"));
        }

        let slice = &mut buffer[offset..offset + EDGE_SIZE];
        
        // Write source (bytes 0-3)
        slice[SOURCE_OFFSET..SOURCE_OFFSET + 4].copy_from_slice(&self.source.to_le_bytes());
        
        // Write target (bytes 4-7)
        slice[TARGET_OFFSET..TARGET_OFFSET + 4].copy_from_slice(&self.target.to_le_bytes());
        
        // Write type (bytes 8-11)
        slice[TYPE_OFFSET..TYPE_OFFSET + 4].copy_from_slice(&self.edge_type.to_le_bytes());

        Ok(EDGE_SIZE)
    }

    /// Deserializes an edge from a byte buffer
    ///
    /// # Arguments
    /// * `buffer` - Source buffer
    /// * `offset` - Offset in buffer to read from
    ///
    /// # Returns
    /// Deserialized edge
    #[wasm_bindgen(js_name = fromBytes)]
    pub fn from_bytes(buffer: &[u8], offset: usize) -> Result<EdgeBinaryFormat, JsValue> {
        if buffer.len() < offset + EDGE_SIZE {
            return Err(JsValue::from_str("Buffer too small for edge deserialization"));
        }

        let slice = &buffer[offset..offset + EDGE_SIZE];

        // Read source (bytes 0-3)
        let source = u32::from_le_bytes([
            slice[SOURCE_OFFSET],
            slice[SOURCE_OFFSET + 1],
            slice[SOURCE_OFFSET + 2],
            slice[SOURCE_OFFSET + 3],
        ]);

        // Read target (bytes 4-7)
        let target = u32::from_le_bytes([
            slice[TARGET_OFFSET],
            slice[TARGET_OFFSET + 1],
            slice[TARGET_OFFSET + 2],
            slice[TARGET_OFFSET + 3],
        ]);

        // Read type (bytes 8-11)
        let edge_type = u32::from_le_bytes([
            slice[TYPE_OFFSET],
            slice[TYPE_OFFSET + 1],
            slice[TYPE_OFFSET + 2],
            slice[TYPE_OFFSET + 3],
        ]);

        Ok(EdgeBinaryFormat {
            source,
            target,
            edge_type,
        })
    }

    /// Checks if this edge connects the given nodes (in either direction)
    ///
    /// # Arguments
    /// * `node_a` - First node ID
    /// * `node_b` - Second node ID
    #[wasm_bindgen(js_name = connectsNodes)]
    pub fn connects_nodes(&self, node_a: u32, node_b: u32) -> bool {
        (self.source == node_a && self.target == node_b)
            || (self.source == node_b && self.target == node_a)
    }

    /// Checks if this edge is a self-loop
    #[wasm_bindgen(js_name = isSelfLoop)]
    pub fn is_self_loop(&self) -> bool {
        self.source == self.target
    }

    /// Reverses the direction of the edge (swaps source and target)
    #[wasm_bindgen]
    pub fn reverse(&self) -> EdgeBinaryFormat {
        EdgeBinaryFormat {
            source: self.target,
            target: self.source,
            edge_type: self.edge_type,
        }
    }
}

/// Batch serialization of multiple edges to a contiguous buffer
///
/// # Arguments
/// * `edges` - Vector of edges to serialize
///
/// # Returns
/// Byte buffer containing all serialized edges
#[wasm_bindgen(js_name = serializeEdges)]
pub fn serialize_edges(edges: &[EdgeBinaryFormat]) -> Vec<u8> {
    let mut buffer = vec![0u8; edges.len() * EDGE_SIZE];
    
    for (i, edge) in edges.iter().enumerate() {
        let offset = i * EDGE_SIZE;
        edge.to_bytes(&mut buffer, offset).unwrap();
    }
    
    buffer
}

/// Batch deserialization of multiple edges from a contiguous buffer
///
/// # Arguments
/// * `buffer` - Byte buffer containing serialized edges
///
/// # Returns
/// Vector of deserialized edges
#[wasm_bindgen(js_name = deserializeEdges)]
pub fn deserialize_edges(buffer: &[u8]) -> Result<Vec<EdgeBinaryFormat>, JsValue> {
    if buffer.len() % EDGE_SIZE != 0 {
        return Err(JsValue::from_str("Buffer size must be multiple of EDGE_SIZE"));
    }

    let edge_count = buffer.len() / EDGE_SIZE;
    let mut edges = Vec::with_capacity(edge_count);

    for i in 0..edge_count {
        let offset = i * EDGE_SIZE;
        edges.push(EdgeBinaryFormat::from_bytes(buffer, offset)?);
    }

    Ok(edges)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_edge_creation() {
        let edge = EdgeBinaryFormat::new(1, 2, 3);
        assert_eq!(edge.source(), 1);
        assert_eq!(edge.target(), 2);
        assert_eq!(edge.edge_type(), 3);
    }

    #[test]
    fn test_serialization_roundtrip() {
        let edge = EdgeBinaryFormat::new(42, 100, 5);
        let mut buffer = vec![0u8; EDGE_SIZE];
        
        edge.to_bytes(&mut buffer, 0).unwrap();
        let deserialized = EdgeBinaryFormat::from_bytes(&buffer, 0).unwrap();
        
        assert_eq!(edge, deserialized);
    }

    #[test]
    fn test_connects_nodes() {
        let edge = EdgeBinaryFormat::new(1, 2, 0);
        assert!(edge.connects_nodes(1, 2));
        assert!(edge.connects_nodes(2, 1));
        assert!(!edge.connects_nodes(1, 3));
    }

    #[test]
    fn test_self_loop() {
        let self_loop = EdgeBinaryFormat::new(5, 5, 0);
        let regular = EdgeBinaryFormat::new(5, 6, 0);
        
        assert!(self_loop.is_self_loop());
        assert!(!regular.is_self_loop());
    }

    #[test]
    fn test_reverse() {
        let edge = EdgeBinaryFormat::new(1, 2, 3);
        let reversed = edge.reverse();
        
        assert_eq!(reversed.source(), 2);
        assert_eq!(reversed.target(), 1);
        assert_eq!(reversed.edge_type(), 3);
    }

    #[test]
    fn test_batch_serialization() {
        let edges = vec![
            EdgeBinaryFormat::new(1, 2, 0),
            EdgeBinaryFormat::new(2, 3, 1),
            EdgeBinaryFormat::new(3, 4, 2),
        ];

        let buffer = serialize_edges(&edges);
        assert_eq!(buffer.len(), edges.len() * EDGE_SIZE);

        let deserialized = deserialize_edges(&buffer).unwrap();
        assert_eq!(edges, deserialized);
    }

    #[test]
    fn test_buffer_bounds_checking() {
        let edge = EdgeBinaryFormat::new(1, 2, 3);
        let mut small_buffer = vec![0u8; 8]; // Too small
        
        assert!(edge.to_bytes(&mut small_buffer, 0).is_err());
        assert!(EdgeBinaryFormat::from_bytes(&small_buffer, 0).is_err());
    }
}