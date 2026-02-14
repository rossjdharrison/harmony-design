//! Query functions for finding implementations linked to design specs
//! 
//! See: harmony-design/DESIGN_SYSTEM.md#querying-implementations

use crate::graph::edge_types::implements_design::{ImplementsDesignEdge, ImplementationNode};
use std::collections::HashMap;

pub struct ImplementationQuery {
    edges: HashMap<String, Vec<ImplementsDesignEdge>>,
    nodes: HashMap<String, ImplementationNode>,
}

impl ImplementationQuery {
    pub fn new() -> Self {
        Self {
            edges: HashMap::new(),
            nodes: HashMap::new(),
        }
    }

    /// Find all implementations for a given design spec
    pub fn find_for_spec(&self, spec_id: &str) -> Vec<&ImplementationNode> {
        self.edges
            .get(spec_id)
            .map(|edges| {
                edges
                    .iter()
                    .filter_map(|edge| self.nodes.get(&edge.source))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Find the design spec for a given implementation
    pub fn find_spec_for_impl(&self, impl_id: &str) -> Option<String> {
        for (spec_id, edges) in &self.edges {
            if edges.iter().any(|e| e.source == impl_id) {
                return Some(spec_id.clone());
            }
        }
        None
    }

    /// Find incomplete implementations (completeness < 1.0)
    pub fn find_incomplete(&self) -> Vec<(&ImplementationNode, &ImplementsDesignEdge)> {
        let mut result = Vec::new();
        
        for edges in self.edges.values() {
            for edge in edges {
                if edge.completeness < 1.0 {
                    if let Some(node) = self.nodes.get(&edge.source) {
                        result.push((node, edge));
                    }
                }
            }
        }
        
        result
    }

    /// Find implementations with deviations from spec
    pub fn find_with_deviations(&self) -> Vec<(&ImplementationNode, &ImplementsDesignEdge)> {
        let mut result = Vec::new();
        
        for edges in self.edges.values() {
            for edge in edges {
                if !edge.deviations.is_empty() {
                    if let Some(node) = self.nodes.get(&edge.source) {
                        result.push((node, edge));
                    }
                }
            }
        }
        
        result
    }

    /// Find specs without implementations
    pub fn find_unimplemented_specs(&self, all_spec_ids: &[String]) -> Vec<String> {
        all_spec_ids
            .iter()
            .filter(|spec_id| !self.edges.contains_key(*spec_id))
            .cloned()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_incomplete() {
        let mut query = ImplementationQuery::new();
        
        let node = ImplementationNode::new(
            "Button.tsx".to_string(),
            "Button".to_string(),
        );
        query.nodes.insert(node.id.clone(), node);
        
        let edge = ImplementsDesignEdge::new(
            "impl:Button.tsx".to_string(),
            "spec:button".to_string(),
        ).with_completeness(0.7);
        
        query.edges.insert("spec:button".to_string(), vec![edge]);
        
        let incomplete = query.find_incomplete();
        assert_eq!(incomplete.len(), 1);
    }
}