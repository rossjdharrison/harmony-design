//! NodeBinaryFormat: Compact binary representation of node (id, type, props offset)
//!
//! This module provides efficient binary serialization for graph nodes to minimize
//! memory footprint and enable fast serialization/deserialization for WASM.
//!
//! Binary Layout (12 bytes per node):
//! - Bytes 0-3:  Node ID (u32)
//! - Bytes 4-7:  Node Type ID (u32)
//! - Bytes 8-11: Properties Offset (u32) - offset into separate properties buffer
//!
//! Performance Targets:
//! - Serialization: < 100ns per node
//! - Deserialization: < 100ns per node
//! - Memory overhead: 12 bytes per node (fixed)

use std::mem;

/// Size of a single node in binary format (12 bytes)
pub const NODE_BINARY_SIZE: usize = 12;

/// Compact binary representation of a graph node
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NodeBinaryFormat {
    /// Unique identifier for the node
    pub id: u32,
    /// Type identifier (index into node type registry)
    pub node_type: u32,
    /// Offset into properties buffer where this node's properties begin
    pub props_offset: u32,
}

impl NodeBinaryFormat {
    /// Creates a new node binary format
    ///
    /// # Arguments
    /// * `id` - Unique node identifier
    /// * `node_type` - Node type identifier
    /// * `props_offset` - Offset into properties buffer
    ///
    /// # Example
    /// ```
    /// let node = NodeBinaryFormat::new(1, 5, 0);
    /// assert_eq!(node.id, 1);
    /// ```
    #[inline]
    pub fn new(id: u32, node_type: u32, props_offset: u32) -> Self {
        Self {
            id,
            node_type,
            props_offset,
        }
    }

    /// Serializes the node to a byte array (12 bytes)
    ///
    /// # Performance
    /// Target: < 100ns per node
    ///
    /// # Returns
    /// Fixed-size array of 12 bytes
    #[inline]
    pub fn to_bytes(&self) -> [u8; NODE_BINARY_SIZE] {
        let mut bytes = [0u8; NODE_BINARY_SIZE];
        bytes[0..4].copy_from_slice(&self.id.to_le_bytes());
        bytes[4..8].copy_from_slice(&self.node_type.to_le_bytes());
        bytes[8..12].copy_from_slice(&self.props_offset.to_le_bytes());
        bytes
    }

    /// Deserializes a node from a byte slice
    ///
    /// # Arguments
    /// * `bytes` - Byte slice containing at least 12 bytes
    ///
    /// # Performance
    /// Target: < 100ns per node
    ///
    /// # Returns
    /// Result containing the deserialized node or an error
    ///
    /// # Errors
    /// Returns error if byte slice is too short
    #[inline]
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, &'static str> {
        if bytes.len() < NODE_BINARY_SIZE {
            return Err("Insufficient bytes for NodeBinaryFormat");
        }

        let id = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
        let node_type = u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
        let props_offset = u32::from_le_bytes([bytes[8], bytes[9], bytes[10], bytes[11]]);

        Ok(Self {
            id,
            node_type,
            props_offset,
        })
    }

    /// Writes the node directly to a mutable byte slice
    ///
    /// # Arguments
    /// * `buffer` - Target buffer (must have at least 12 bytes)
    ///
    /// # Returns
    /// Result indicating success or error
    ///
    /// # Errors
    /// Returns error if buffer is too small
    #[inline]
    pub fn write_to(&self, buffer: &mut [u8]) -> Result<(), &'static str> {
        if buffer.len() < NODE_BINARY_SIZE {
            return Err("Buffer too small for NodeBinaryFormat");
        }

        buffer[0..4].copy_from_slice(&self.id.to_le_bytes());
        buffer[4..8].copy_from_slice(&self.node_type.to_le_bytes());
        buffer[8..12].copy_from_slice(&self.props_offset.to_le_bytes());

        Ok(())
    }

    /// Reads a node directly from a byte slice without allocation
    ///
    /// # Arguments
    /// * `buffer` - Source buffer (must have at least 12 bytes)
    ///
    /// # Returns
    /// Result containing reference to the node or error
    ///
    /// # Safety
    /// This function assumes the buffer is properly aligned and contains valid data
    #[inline]
    pub fn read_from(buffer: &[u8]) -> Result<&Self, &'static str> {
        if buffer.len() < NODE_BINARY_SIZE {
            return Err("Buffer too small for NodeBinaryFormat");
        }

        // Safety: We've verified the size, and NodeBinaryFormat is repr(C)
        // with no padding or alignment requirements beyond u32
        unsafe {
            let ptr = buffer.as_ptr() as *const Self;
            Ok(&*ptr)
        }
    }
}

/// Buffer for storing multiple nodes in compact binary format
pub struct NodeBuffer {
    /// Raw byte buffer containing serialized nodes
    buffer: Vec<u8>,
    /// Number of nodes currently stored
    count: usize,
}

impl NodeBuffer {
    /// Creates a new node buffer with specified capacity
    ///
    /// # Arguments
    /// * `capacity` - Initial capacity in number of nodes
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            buffer: Vec::with_capacity(capacity * NODE_BINARY_SIZE),
            count: 0,
        }
    }

    /// Appends a node to the buffer
    ///
    /// # Arguments
    /// * `node` - Node to append
    #[inline]
    pub fn push(&mut self, node: NodeBinaryFormat) {
        let start = self.buffer.len();
        self.buffer.resize(start + NODE_BINARY_SIZE, 0);
        node.write_to(&mut self.buffer[start..]).unwrap();
        self.count += 1;
    }

    /// Gets a node at the specified index
    ///
    /// # Arguments
    /// * `index` - Index of the node to retrieve
    ///
    /// # Returns
    /// Option containing the node if index is valid
    #[inline]
    pub fn get(&self, index: usize) -> Option<NodeBinaryFormat> {
        if index >= self.count {
            return None;
        }

        let start = index * NODE_BINARY_SIZE;
        NodeBinaryFormat::from_bytes(&self.buffer[start..]).ok()
    }

    /// Returns the number of nodes in the buffer
    #[inline]
    pub fn len(&self) -> usize {
        self.count
    }

    /// Returns true if the buffer is empty
    #[inline]
    pub fn is_empty(&self) -> bool {
        self.count == 0
    }

    /// Returns a slice of the raw byte buffer
    #[inline]
    pub fn as_bytes(&self) -> &[u8] {
        &self.buffer
    }

    /// Clears all nodes from the buffer
    #[inline]
    pub fn clear(&mut self) {
        self.buffer.clear();
        self.count = 0;
    }

    /// Creates an iterator over the nodes
    pub fn iter(&self) -> NodeBufferIter {
        NodeBufferIter {
            buffer: &self.buffer,
            index: 0,
            count: self.count,
        }
    }
}

/// Iterator over nodes in a NodeBuffer
pub struct NodeBufferIter<'a> {
    buffer: &'a [u8],
    index: usize,
    count: usize,
}

impl<'a> Iterator for NodeBufferIter<'a> {
    type Item = NodeBinaryFormat;

    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        if self.index >= self.count {
            return None;
        }

        let start = self.index * NODE_BINARY_SIZE;
        let node = NodeBinaryFormat::from_bytes(&self.buffer[start..]).ok()?;
        self.index += 1;
        Some(node)
    }

    #[inline]
    fn size_hint(&self) -> (usize, Option<usize>) {
        let remaining = self.count - self.index;
        (remaining, Some(remaining))
    }
}

impl<'a> ExactSizeIterator for NodeBufferIter<'a> {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_binary_size() {
        assert_eq!(mem::size_of::<NodeBinaryFormat>(), NODE_BINARY_SIZE);
    }

    #[test]
    fn test_serialization_roundtrip() {
        let node = NodeBinaryFormat::new(42, 7, 1024);
        let bytes = node.to_bytes();
        let deserialized = NodeBinaryFormat::from_bytes(&bytes).unwrap();

        assert_eq!(node, deserialized);
    }

    #[test]
    fn test_write_read_roundtrip() {
        let node = NodeBinaryFormat::new(100, 200, 300);
        let mut buffer = [0u8; NODE_BINARY_SIZE];

        node.write_to(&mut buffer).unwrap();
        let deserialized = NodeBinaryFormat::from_bytes(&buffer).unwrap();

        assert_eq!(node, deserialized);
    }

    #[test]
    fn test_insufficient_bytes() {
        let bytes = [0u8; 8]; // Too short
        assert!(NodeBinaryFormat::from_bytes(&bytes).is_err());
    }

    #[test]
    fn test_node_buffer_operations() {
        let mut buffer = NodeBuffer::with_capacity(10);

        buffer.push(NodeBinaryFormat::new(1, 10, 0));
        buffer.push(NodeBinaryFormat::new(2, 20, 100));
        buffer.push(NodeBinaryFormat::new(3, 30, 200));

        assert_eq!(buffer.len(), 3);
        assert!(!buffer.is_empty());

        let node1 = buffer.get(0).unwrap();
        assert_eq!(node1.id, 1);
        assert_eq!(node1.node_type, 10);

        let node2 = buffer.get(1).unwrap();
        assert_eq!(node2.id, 2);
        assert_eq!(node2.node_type, 20);

        assert!(buffer.get(10).is_none());
    }

    #[test]
    fn test_node_buffer_iterator() {
        let mut buffer = NodeBuffer::with_capacity(3);

        buffer.push(NodeBinaryFormat::new(1, 10, 0));
        buffer.push(NodeBinaryFormat::new(2, 20, 100));
        buffer.push(NodeBinaryFormat::new(3, 30, 200));

        let nodes: Vec<_> = buffer.iter().collect();
        assert_eq!(nodes.len(), 3);
        assert_eq!(nodes[0].id, 1);
        assert_eq!(nodes[1].id, 2);
        assert_eq!(nodes[2].id, 3);
    }

    #[test]
    fn test_node_buffer_clear() {
        let mut buffer = NodeBuffer::with_capacity(2);

        buffer.push(NodeBinaryFormat::new(1, 10, 0));
        buffer.push(NodeBinaryFormat::new(2, 20, 100));

        assert_eq!(buffer.len(), 2);

        buffer.clear();

        assert_eq!(buffer.len(), 0);
        assert!(buffer.is_empty());
    }
}