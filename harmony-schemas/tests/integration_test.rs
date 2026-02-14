use harmony_schemas::{Edge, EdgeType, EdgeMetadata};

#[test]
fn test_edge_type_workflow() {
    // Create a composition relationship
    let composes_edge = Edge::new(
        "form-button".to_string(),
        "form".to_string(),
        "button".to_string(),
        EdgeType::ComposesOf,
    );
    
    assert_eq!(composes_edge.edge_type, EdgeType::ComposesOf);
    assert!(composes_edge.edge_type.is_composition());
    
    // Create the reverse relationship
    let used_by_edge = composes_edge.reverse().unwrap();
    assert_eq!(used_by_edge.edge_type, EdgeType::UsedBy);
    assert_eq!(used_by_edge.from, "button");
    assert_eq!(used_by_edge.to, "form");
}

#[test]
fn test_token_usage_relationship() {
    let metadata = EdgeMetadata {
        weight: Some(1.0),
        label: Some("Primary background color".to_string()),
        properties: None,
    };
    
    let edge = Edge::with_metadata(
        "button-color".to_string(),
        "button".to_string(),
        "color-primary".to_string(),
        EdgeType::UsesToken,
        metadata,
    );
    
    assert!(edge.edge_type.is_dependency());
    assert!(edge.metadata.is_some());
    
    // UsesToken doesn't have a reverse
    assert!(edge.reverse().is_none());
}

#[test]
fn test_pattern_inheritance() {
    let edge = Edge::new(
        "primary-base".to_string(),
        "primary-button".to_string(),
        "base-button".to_string(),
        EdgeType::InheritsPattern,
    );
    
    assert_eq!(edge.edge_type, EdgeType::InheritsPattern);
    assert!(edge.edge_type.is_dependency());
    assert!(!edge.edge_type.is_composition());
}

#[test]
fn test_design_implementation() {
    let edge = Edge::new(
        "impl-spec".to_string(),
        "button-component".to_string(),
        "button-design-spec".to_string(),
        EdgeType::ImplementsDesign,
    );
    
    assert_eq!(edge.edge_type, EdgeType::ImplementsDesign);
    assert_eq!(
        edge.edge_type.description(),
        "Component implements a design specification"
    );
}