//! WASM Node Registry
//!
//! Registry of node types compiled to WASM for efficient graph operations.
//! See DESIGN_SYSTEM.md § Graph Engine § Node Registry for architecture details.

mod node_binary_format;

pub use node_binary_format::{NodeBinaryFormat, NodeBuffer, NODE_BINARY_SIZE};

use wasm_bindgen::prelude::*;
use std::collections::HashMap;

/// Node type definition stored in the registry
#[wasm_bindgen]
#[derive(Clone)]
pub struct NodeType {
    id: u32,
    name: String,
    version: u32,
}

#[wasm_bindgen]
impl NodeType {
    #[wasm_bindgen(constructor)]
    pub fn new(id: u32, name: String, version: u32) -> NodeType {
        NodeType { id, name, version }
    }

    #[wasm_bindgen(getter)]
    pub fn id(&self) -> u32 {
        self.id
    }

    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn version(&self) -> u32 {
        self.version
    }
}

/// Registry for managing node types in WASM
#[wasm_bindgen]
pub struct NodeRegistry {
    types: HashMap<u32, NodeType>,
    name_to_id: HashMap<String, u32>,
}

#[wasm_bindgen]
impl NodeRegistry {
    #[wasm_bindgen(constructor)]
    pub fn new() -> NodeRegistry {
        NodeRegistry {
            types: HashMap::new(),
            name_to_id: HashMap::new(),
        }
    }

    /// Registers a new node type
    pub fn register(&mut self, node_type: NodeType) -> Result<(), JsValue> {
        let id = node_type.id();
        let name = node_type.name();

        if self.types.contains_key(&id) {
            return Err(JsValue::from_str(&format!(
                "Node type with id {} already registered",
                id
            )));
        }

        self.name_to_id.insert(name.clone(), id);
        self.types.insert(id, node_type);

        Ok(())
    }

    /// Retrieves a node type by ID
    pub fn get_by_id(&self, id: u32) -> Option<NodeType> {
        self.types.get(&id).cloned()
    }

    /// Retrieves a node type by name
    pub fn get_by_name(&self, name: &str) -> Option<NodeType> {
        self.name_to_id
            .get(name)
            .and_then(|id| self.types.get(id))
            .cloned()
    }

    /// Returns the number of registered node types
    pub fn count(&self) -> usize {
        self.types.len()
    }

    /// Serializes a node to binary format
    ///
    /// Returns a Uint8Array containing the 12-byte binary representation
    pub fn serialize_node(&self, id: u32, node_type: u32, props_offset: u32) -> Vec<u8> {
        let node = NodeBinaryFormat::new(id, node_type, props_offset);
        node.to_bytes().to_vec()
    }

    /// Deserializes a node from binary format
    ///
    /// Returns an array [id, node_type, props_offset]
    pub fn deserialize_node(&self, bytes: &[u8]) -> Result<Vec<u32>, JsValue> {
        NodeBinaryFormat::from_bytes(bytes)
            .map(|node| vec![node.id, node.node_type, node.props_offset])
            .map_err(|e| JsValue::from_str(e))
    }
}

impl Default for NodeRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_and_retrieve() {
        let mut registry = NodeRegistry::new();
        let node_type = NodeType::new(1, "TestNode".to_string(), 1);

        registry.register(node_type.clone()).unwrap();

        let retrieved = registry.get_by_id(1).unwrap();
        assert_eq!(retrieved.id(), 1);
        assert_eq!(retrieved.name(), "TestNode");

        let retrieved_by_name = registry.get_by_name("TestNode").unwrap();
        assert_eq!(retrieved_by_name.id(), 1);
    }

    #[test]
    fn test_duplicate_registration() {
        let mut registry = NodeRegistry::new();
        let node_type1 = NodeType::new(1, "TestNode".to_string(), 1);
        let node_type2 = NodeType::new(1, "TestNode".to_string(), 2);

        registry.register(node_type1).unwrap();
        assert!(registry.register(node_type2).is_err());
    }

    #[test]
    fn test_serialize_deserialize() {
        let registry = NodeRegistry::new();
        let bytes = registry.serialize_node(42, 7, 1024);

        assert_eq!(bytes.len(), 12);

        let result = registry.deserialize_node(&bytes).unwrap();
        assert_eq!(result[0], 42);
        assert_eq!(result[1], 7);
        assert_eq!(result[2], 1024);
    }
}