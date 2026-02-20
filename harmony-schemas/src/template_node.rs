//! Template Node Schema
//!
//! Defines the structure for storing HTML templates, Shadow DOM configurations,
//! and slot definitions in graph nodes.
//!
//! Related: docs/architecture/template-storage-strategy.md

use serde::{Deserialize, Serialize};

/// Template node stored in the graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateNode {
    /// Unique identifier for this template
    pub template_id: String,
    
    /// HTML element type (div, span, button, etc.)
    pub element_type: String,
    
    /// HTML attributes for the element
    pub attributes: Vec<Attribute>,
    
    /// Slot definitions for composition
    pub slots: Vec<SlotDefinition>,
    
    /// Child node IDs (references to other graph nodes)
    pub children: Vec<String>,
    
    /// Shadow DOM configuration (if applicable)
    pub shadow_config: Option<ShadowConfig>,
    
    /// GPU acceleration metadata
    pub gpu_metadata: Option<GpuMetadata>,
}

/// HTML attribute key-value pair
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attribute {
    pub name: String,
    pub value: String,
}

/// Slot definition for component composition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlotDefinition {
    /// Slot name (empty string for default slot)
    pub slot_name: String,
    
    /// Fallback content (node ID or inline text)
    pub fallback_content: Option<String>,
    
    /// Allowed element types (for validation)
    pub allowed_types: Vec<String>,
    
    /// Whether this slot must be filled
    pub required: bool,
}

/// Shadow DOM configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShadowConfig {
    /// Shadow DOM mode (open or closed)
    pub mode: ShadowMode,
    
    /// Whether focus is delegated to first focusable element
    pub delegates_focus: bool,
}

/// Shadow DOM mode enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShadowMode {
    Open,
    Closed,
}

/// GPU acceleration metadata for template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuMetadata {
    /// Whether this template uses GPU acceleration
    pub gpu_accelerated: bool,
    
    /// CSS properties that are GPU-accelerated
    pub gpu_properties: Vec<String>,
    
    /// Shader uniform bindings
    pub shader_bindings: Vec<String>,
}

impl TemplateNode {
    /// Create a new template node
    pub fn new(template_id: String, element_type: String) -> Self {
        Self {
            template_id,
            element_type,
            attributes: Vec::new(),
            slots: Vec::new(),
            children: Vec::new(),
            shadow_config: None,
            gpu_metadata: None,
        }
    }
    
    /// Add an attribute to the template
    pub fn with_attribute(mut self, name: String, value: String) -> Self {
        self.attributes.push(Attribute { name, value });
        self
    }
    
    /// Add a slot definition
    pub fn with_slot(mut self, slot: SlotDefinition) -> Self {
        self.slots.push(slot);
        self
    }
    
    /// Set shadow DOM configuration
    pub fn with_shadow(mut self, config: ShadowConfig) -> Self {
        self.shadow_config = Some(config);
        self
    }
    
    /// Enable GPU acceleration
    pub fn with_gpu(mut self, metadata: GpuMetadata) -> Self {
        self.gpu_metadata = Some(metadata);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_node_creation() {
        let template = TemplateNode::new(
            "test-button".to_string(),
            "button".to_string(),
        )
        .with_attribute("class".to_string(), "hds-button".to_string())
        .with_shadow(ShadowConfig {
            mode: ShadowMode::Open,
            delegates_focus: true,
        });

        assert_eq!(template.template_id, "test-button");
        assert_eq!(template.element_type, "button");
        assert_eq!(template.attributes.len(), 1);
        assert!(template.shadow_config.is_some());
    }

    #[test]
    fn test_slot_definition() {
        let slot = SlotDefinition {
            slot_name: "icon".to_string(),
            fallback_content: None,
            allowed_types: vec!["svg".to_string()],
            required: false,
        };

        assert_eq!(slot.slot_name, "icon");
        assert!(!slot.required);
    }
}