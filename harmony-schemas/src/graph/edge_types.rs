//! Edge type definitions for the Harmony Design System graph
//! 
//! Defines the semantic relationships between nodes in the design system:
//! - composes_of: Component composition relationships
//! - inherits_pattern: Pattern inheritance relationships
//! - implements_design: Design implementation relationships
//! - uses_token: Token usage relationships
//! - used_by: Reverse dependency tracking

use serde::{Deserialize, Serialize};

/// Edge types representing relationships in the design system graph
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EdgeType {
    /// Component A is composed of Component B
    /// Direction: A -> B (A contains B)
    /// Example: Form -> Button, Card -> Image
    ComposesOf,
    
    /// Component A inherits pattern from Pattern B
    /// Direction: A -> B (A derives from B)
    /// Example: PrimaryButton -> BaseButton pattern
    InheritsPattern,
    
    /// Component A implements Design B
    /// Direction: A -> B (A realizes B)
    /// Example: ButtonComponent -> ButtonDesignSpec
    ImplementsDesign,
    
    /// Component A uses Token B
    /// Direction: A -> B (A depends on B)
    /// Example: Button -> ColorToken, Text -> FontToken
    UsesToken,
    
    /// Component A is used by Component B (reverse of composes_of)
    /// Direction: A -> B (A is contained in B)
    /// Example: Button -> Form (Button is used by Form)
    UsedBy,
}

impl EdgeType {
    /// Returns the reverse edge type if applicable
    /// 
    /// Some edge types have natural inverses:
    /// - composes_of <-> used_by
    /// 
    /// Returns None for edge types without defined inverses
    pub fn reverse(&self) -> Option<EdgeType> {
        match self {
            EdgeType::ComposesOf => Some(EdgeType::UsedBy),
            EdgeType::UsedBy => Some(EdgeType::ComposesOf),
            _ => None,
        }
    }
    
    /// Returns true if this edge type represents a dependency
    pub fn is_dependency(&self) -> bool {
        matches!(self, EdgeType::UsesToken | EdgeType::InheritsPattern)
    }
    
    /// Returns true if this edge type represents composition
    pub fn is_composition(&self) -> bool {
        matches!(self, EdgeType::ComposesOf | EdgeType::UsedBy)
    }
    
    /// Returns a human-readable description of the edge type
    pub fn description(&self) -> &'static str {
        match self {
            EdgeType::ComposesOf => "Component is composed of another component",
            EdgeType::InheritsPattern => "Component inherits from a pattern",
            EdgeType::ImplementsDesign => "Component implements a design specification",
            EdgeType::UsesToken => "Component uses a design token",
            EdgeType::UsedBy => "Component is used by another component",
        }
    }
}

/// Edge data structure representing a relationship between two nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    /// Unique identifier for this edge
    pub id: String,
    
    /// Source node ID
    pub from: String,
    
    /// Target node ID
    pub to: String,
    
    /// Type of relationship
    pub edge_type: EdgeType,
    
    /// Optional metadata about the relationship
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<EdgeMetadata>,
}

/// Metadata that can be attached to edges
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeMetadata {
    /// Weight or strength of the relationship (0.0 to 1.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<f32>,
    
    /// Optional label for display purposes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    
    /// Additional custom properties
    #[serde(skip_serializing_if = "Option::is_none")]
    pub properties: Option<serde_json::Value>,
}

impl Edge {
    /// Creates a new edge with the given parameters
    pub fn new(id: String, from: String, to: String, edge_type: EdgeType) -> Self {
        Self {
            id,
            from,
            to,
            edge_type,
            metadata: None,
        }
    }
    
    /// Creates a new edge with metadata
    pub fn with_metadata(
        id: String,
        from: String,
        to: String,
        edge_type: EdgeType,
        metadata: EdgeMetadata,
    ) -> Self {
        Self {
            id,
            from,
            to,
            edge_type,
            metadata: Some(metadata),
        }
    }
    
    /// Returns the reverse edge if the edge type supports reversal
    pub fn reverse(&self) -> Option<Edge> {
        self.edge_type.reverse().map(|reversed_type| {
            Edge {
                id: format!("{}_reverse", self.id),
                from: self.to.clone(),
                to: self.from.clone(),
                edge_type: reversed_type,
                metadata: self.metadata.clone(),
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_edge_type_reverse() {
        assert_eq!(
            EdgeType::ComposesOf.reverse(),
            Some(EdgeType::UsedBy)
        );
        assert_eq!(
            EdgeType::UsedBy.reverse(),
            Some(EdgeType::ComposesOf)
        );
        assert_eq!(EdgeType::UsesToken.reverse(), None);
    }

    #[test]
    fn test_edge_type_classification() {
        assert!(EdgeType::UsesToken.is_dependency());
        assert!(EdgeType::InheritsPattern.is_dependency());
        assert!(!EdgeType::ComposesOf.is_dependency());
        
        assert!(EdgeType::ComposesOf.is_composition());
        assert!(EdgeType::UsedBy.is_composition());
        assert!(!EdgeType::UsesToken.is_composition());
    }

    #[test]
    fn test_edge_creation() {
        let edge = Edge::new(
            "edge1".to_string(),
            "button".to_string(),
            "color-token".to_string(),
            EdgeType::UsesToken,
        );
        
        assert_eq!(edge.id, "edge1");
        assert_eq!(edge.from, "button");
        assert_eq!(edge.to, "color-token");
        assert_eq!(edge.edge_type, EdgeType::UsesToken);
        assert!(edge.metadata.is_none());
    }

    #[test]
    fn test_edge_reverse() {
        let edge = Edge::new(
            "edge1".to_string(),
            "form".to_string(),
            "button".to_string(),
            EdgeType::ComposesOf,
        );
        
        let reversed = edge.reverse().unwrap();
        assert_eq!(reversed.from, "button");
        assert_eq!(reversed.to, "form");
        assert_eq!(reversed.edge_type, EdgeType::UsedBy);
    }

    #[test]
    fn test_edge_serialization() {
        let edge = Edge::new(
            "edge1".to_string(),
            "button".to_string(),
            "token".to_string(),
            EdgeType::UsesToken,
        );
        
        let json = serde_json::to_string(&edge).unwrap();
        let deserialized: Edge = serde_json::from_str(&json).unwrap();
        
        assert_eq!(edge.id, deserialized.id);
        assert_eq!(edge.edge_type, deserialized.edge_type);
    }
}