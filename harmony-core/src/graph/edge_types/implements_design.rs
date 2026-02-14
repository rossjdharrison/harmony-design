//! ImplementsDesign edge type
//! 
//! Links .tsx/.ts/.js implementation files to their corresponding DesignSpecNodes.
//! See: harmony-design/DESIGN_SYSTEM.md#implementation-tracking

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImplementsDesignEdge {
    pub source: String,  // ImplementationNode ID
    pub target: String,  // DesignSpecNode ID
    pub completeness: f32,
    pub implemented_states: Vec<String>,
    pub implemented_variants: Vec<String>,
    pub last_verified: Option<i64>,  // Unix timestamp
    pub deviations: Vec<String>,
    pub notes: Option<String>,
}

impl ImplementsDesignEdge {
    pub fn new(source: String, target: String) -> Self {
        Self {
            source,
            target,
            completeness: 1.0,
            implemented_states: Vec::new(),
            implemented_variants: Vec::new(),
            last_verified: None,
            deviations: Vec::new(),
            notes: None,
        }
    }

    pub fn with_completeness(mut self, completeness: f32) -> Self {
        self.completeness = completeness.clamp(0.0, 1.0);
        self
    }

    pub fn with_states(mut self, states: Vec<String>) -> Self {
        self.implemented_states = states;
        self
    }

    pub fn with_variants(mut self, variants: Vec<String>) -> Self {
        self.implemented_variants = variants;
        self
    }

    pub fn with_deviation(mut self, deviation: String) -> Self {
        self.deviations.push(deviation);
        self
    }

    pub fn mark_verified(mut self) -> Self {
        self.last_verified = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64
        );
        self
    }

    pub fn is_complete(&self) -> bool {
        self.completeness >= 0.99 && self.deviations.is_empty()
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.completeness < 0.0 || self.completeness > 1.0 {
            return Err(format!("Completeness must be between 0.0 and 1.0, got {}", self.completeness));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImplementationNode {
    pub id: String,
    pub file_path: String,
    pub language: String,  // "tsx", "ts", "js"
    pub component_name: String,
    pub exports: Vec<String>,
}

impl ImplementationNode {
    pub fn new(file_path: String, component_name: String) -> Self {
        let language = if file_path.ends_with(".tsx") {
            "tsx"
        } else if file_path.ends_with(".ts") {
            "ts"
        } else if file_path.ends_with(".js") {
            "js"
        } else {
            "unknown"
        };

        Self {
            id: format!("impl:{}", file_path),
            file_path,
            language: language.to_string(),
            component_name,
            exports: Vec::new(),
        }
    }

    pub fn with_exports(mut self, exports: Vec<String>) -> Self {
        self.exports = exports;
        self
    }

    pub fn validate(&self) -> Result<(), String> {
        if !["tsx", "ts", "js"].contains(&self.language.as_str()) {
            return Err(format!("Invalid language: {}", self.language));
        }
        
        if !self.file_path.ends_with(".tsx") 
            && !self.file_path.ends_with(".ts") 
            && !self.file_path.ends_with(".js") {
            return Err(format!("Invalid file extension: {}", self.file_path));
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_implementation_node_creation() {
        let node = ImplementationNode::new(
            "components/Button.tsx".to_string(),
            "Button".to_string(),
        );
        
        assert_eq!(node.language, "tsx");
        assert_eq!(node.component_name, "Button");
        assert!(node.validate().is_ok());
    }

    #[test]
    fn test_edge_completeness_bounds() {
        let edge = ImplementsDesignEdge::new(
            "impl:Button.tsx".to_string(),
            "spec:button".to_string(),
        ).with_completeness(1.5);
        
        assert_eq!(edge.completeness, 1.0);
    }

    #[test]
    fn test_edge_is_complete() {
        let complete = ImplementsDesignEdge::new(
            "impl:Button.tsx".to_string(),
            "spec:button".to_string(),
        ).with_completeness(1.0);
        
        assert!(complete.is_complete());
        
        let incomplete = complete.clone().with_deviation("Missing hover state".to_string());
        assert!(!incomplete.is_complete());
    }
}