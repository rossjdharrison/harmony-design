//! Query functions for Component → Domain links
//! 
//! See: harmony-design/DESIGN_SYSTEM.md#component-domain-links

use crate::graph::HarmonyGraph;
use std::collections::HashMap;

/// Get all domain types rendered by a component
pub fn get_component_domains(
    graph: &HarmonyGraph,
    component_id: &str,
) -> Vec<ComponentDomainLink> {
    // Implementation will be generated from schema
    // Returns list of domain types this component can render
    vec![]
}

/// Get all components that render a specific domain type
pub fn get_domain_components(
    graph: &HarmonyGraph,
    domain_type: &str,
) -> Vec<String> {
    // Implementation will be generated from schema
    // Returns list of component IDs that render this domain type
    vec![]
}

/// Get the primary domain type for a component (if any)
pub fn get_component_primary_domain(
    graph: &HarmonyGraph,
    component_id: &str,
) -> Option<String> {
    // Implementation will be generated from schema
    // Returns the primary domain type this component renders
    None
}

#[derive(Debug, Clone)]
pub struct ComponentDomainLink {
    pub component_id: String,
    pub domain_type: String,
    pub binding_mode: BindingMode,
    pub props_mapping: HashMap<String, String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum BindingMode {
    Primary,
    Reference,
    Collection,
}