//! WASMNodeRegistry: Registry of node types compiled to WASM functions
//! 
//! This bounded context manages a registry of graph node types that have been
//! compiled to WebAssembly. It provides fast lookup, validation, and metadata
//! for WASM-based node processors.
//!
//! Performance targets:
//! - Registration: < 1ms per node type
//! - Lookup: < 0.1ms (O(1) hash lookup)
//! - Memory: < 5MB for 1000 node types

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Node type metadata describing a WASM-compiled node processor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeTypeMetadata {
    /// Unique identifier for the node type (e.g., "audio.gain", "midi.transpose")
    pub type_id: String,
    
    /// Human-readable display name
    pub display_name: String,
    
    /// Category for organization (e.g., "audio", "midi", "control")
    pub category: String,
    
    /// Input port definitions
    pub inputs: Vec<PortDefinition>,
    
    /// Output port definitions
    pub outputs: Vec<PortDefinition>,
    
    /// Parameter definitions
    pub parameters: Vec<ParameterDefinition>,
    
    /// WASM function name for the processor
    pub wasm_function: String,
    
    /// Memory requirements in bytes
    pub memory_requirement: u32,
    
    /// Whether this node can be executed in parallel
    pub is_parallel_safe: bool,
    
    /// Version string for compatibility checking
    pub version: String,
}

/// Port definition for inputs/outputs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortDefinition {
    pub name: String,
    pub data_type: String, // "audio", "midi", "control", "event"
    pub is_required: bool,
}

/// Parameter definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterDefinition {
    pub name: String,
    pub data_type: String, // "float", "int", "bool", "string", "enum"
    pub default_value: String,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
    pub enum_values: Option<Vec<String>>,
}

/// The main registry managing all node types
#[wasm_bindgen]
pub struct WASMNodeRegistry {
    /// HashMap for O(1) lookup by type_id
    registry: HashMap<String, NodeTypeMetadata>,
    
    /// Category index for fast filtering
    category_index: HashMap<String, Vec<String>>,
    
    /// Total memory allocated by registered nodes
    total_memory: u32,
}

#[wasm_bindgen]
impl WASMNodeRegistry {
    /// Create a new empty registry
    #[wasm_bindgen(constructor)]
    pub fn new() -> WASMNodeRegistry {
        WASMNodeRegistry {
            registry: HashMap::new(),
            category_index: HashMap::new(),
            total_memory: 0,
        }
    }
    
    /// Register a new node type
    /// Returns true if successful, false if type_id already exists
    #[wasm_bindgen]
    pub fn register(&mut self, metadata_json: &str) -> Result<bool, JsValue> {
        let metadata: NodeTypeMetadata = serde_json::from_str(metadata_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse metadata: {}", e)))?;
        
        let type_id = metadata.type_id.clone();
        let category = metadata.category.clone();
        
        // Check if already registered
        if self.registry.contains_key(&type_id) {
            return Ok(false);
        }
        
        // Update memory tracking
        self.total_memory += metadata.memory_requirement;
        
        // Update category index
        self.category_index
            .entry(category)
            .or_insert_with(Vec::new)
            .push(type_id.clone());
        
        // Register the node type
        self.registry.insert(type_id, metadata);
        
        Ok(true)
    }
    
    /// Unregister a node type by type_id
    #[wasm_bindgen]
    pub fn unregister(&mut self, type_id: &str) -> bool {
        if let Some(metadata) = self.registry.remove(type_id) {
            // Update memory tracking
            self.total_memory = self.total_memory.saturating_sub(metadata.memory_requirement);
            
            // Update category index
            if let Some(type_ids) = self.category_index.get_mut(&metadata.category) {
                type_ids.retain(|id| id != type_id);
            }
            
            true
        } else {
            false
        }
    }
    
    /// Get metadata for a specific node type
    #[wasm_bindgen]
    pub fn get(&self, type_id: &str) -> Result<JsValue, JsValue> {
        match self.registry.get(type_id) {
            Some(metadata) => {
                let json = serde_json::to_string(metadata)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;
                Ok(JsValue::from_str(&json))
            }
            None => Err(JsValue::from_str(&format!("Node type '{}' not found", type_id)))
        }
    }
    
    /// Check if a node type is registered
    #[wasm_bindgen]
    pub fn has(&self, type_id: &str) -> bool {
        self.registry.contains_key(type_id)
    }
    
    /// Get all registered node type IDs
    #[wasm_bindgen]
    pub fn list_all(&self) -> Result<JsValue, JsValue> {
        let type_ids: Vec<&String> = self.registry.keys().collect();
        let json = serde_json::to_string(&type_ids)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;
        Ok(JsValue::from_str(&json))
    }
    
    /// Get all node types in a specific category
    #[wasm_bindgen]
    pub fn list_by_category(&self, category: &str) -> Result<JsValue, JsValue> {
        match self.category_index.get(category) {
            Some(type_ids) => {
                let json = serde_json::to_string(type_ids)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;
                Ok(JsValue::from_str(&json))
            }
            None => Ok(JsValue::from_str("[]"))
        }
    }
    
    /// Get all categories
    #[wasm_bindgen]
    pub fn list_categories(&self) -> Result<JsValue, JsValue> {
        let categories: Vec<&String> = self.category_index.keys().collect();
        let json = serde_json::to_string(&categories)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;
        Ok(JsValue::from_str(&json))
    }
    
    /// Get total memory requirement for all registered nodes
    #[wasm_bindgen]
    pub fn get_total_memory(&self) -> u32 {
        self.total_memory
    }
    
    /// Get registry statistics
    #[wasm_bindgen]
    pub fn get_stats(&self) -> Result<JsValue, JsValue> {
        let stats = serde_json::json!({
            "total_nodes": self.registry.len(),
            "total_categories": self.category_index.len(),
            "total_memory": self.total_memory,
            "parallel_safe_count": self.registry.values()
                .filter(|m| m.is_parallel_safe)
                .count(),
        });
        
        let json = serde_json::to_string(&stats)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;
        Ok(JsValue::from_str(&json))
    }
    
    /// Clear all registered node types
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.registry.clear();
        self.category_index.clear();
        self.total_memory = 0;
    }
}

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}