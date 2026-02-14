//! Component → UI Links Graph Operations
//! 
//! Manages relationships between components and UI locations where they're used.
//! See: harmony-design/DESIGN_SYSTEM.md#component-ui-links

use harmony_schemas::{ComponentUILink, UIUsageContext};
use std::collections::HashMap;

/// Manages Component → UI link relationships in the graph
pub struct ComponentUILinkManager {
    /// Maps component_id → list of UI locations where it's used
    links: HashMap<String, Vec<ComponentUILink>>,
}

impl ComponentUILinkManager {
    /// Create a new ComponentUILinkManager
    pub fn new() -> Self {
        Self {
            links: HashMap::new(),
        }
    }
    
    /// Add a Component → UI link
    pub fn add_link(&mut self, link: ComponentUILink) {
        self.links
            .entry(link.component_id.clone())
            .or_insert_with(Vec::new)
            .push(link);
    }
    
    /// Get all UI locations where a component is used
    pub fn get_ui_locations(&self, component_id: &str) -> Vec<&ComponentUILink> {
        self.links
            .get(component_id)
            .map(|links| links.iter().collect())
            .unwrap_or_default()
    }
    
    /// Get all components used in a specific UI location
    pub fn get_components_in_ui(&self, ui_location: &str) -> Vec<&ComponentUILink> {
        self.links
            .values()
            .flatten()
            .filter(|link| link.ui_location == ui_location)
            .collect()
    }
    
    /// Remove all links for a component
    pub fn remove_component_links(&mut self, component_id: &str) {
        self.links.remove(component_id);
    }
    
    /// Get usage count for a component
    pub fn get_usage_count(&self, component_id: &str) -> usize {
        self.links
            .get(component_id)
            .map(|links| links.len())
            .unwrap_or(0)
    }
}

impl Default for ComponentUILinkManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_and_get_links() {
        let mut manager = ComponentUILinkManager::new();
        
        let link = ComponentUILink::new(
            "button-primary".to_string(),
            "app-shell".to_string(),
            "src/ui/app-shell.html".to_string(),
            UIUsageContext::Template,
        );
        
        manager.add_link(link);
        
        let locations = manager.get_ui_locations("button-primary");
        assert_eq!(locations.len(), 1);
        assert_eq!(locations[0].ui_location, "app-shell");
    }

    #[test]
    fn test_get_components_in_ui() {
        let mut manager = ComponentUILinkManager::new();
        
        manager.add_link(ComponentUILink::new(
            "button-primary".to_string(),
            "app-shell".to_string(),
            "src/ui/app-shell.html".to_string(),
            UIUsageContext::Template,
        ));
        
        manager.add_link(ComponentUILink::new(
            "icon-play".to_string(),
            "app-shell".to_string(),
            "src/ui/app-shell.html".to_string(),
            UIUsageContext::Template,
        ));
        
        let components = manager.get_components_in_ui("app-shell");
        assert_eq!(components.len(), 2);
    }

    #[test]
    fn test_usage_count() {
        let mut manager = ComponentUILinkManager::new();
        
        manager.add_link(ComponentUILink::new(
            "button-primary".to_string(),
            "app-shell".to_string(),
            "src/ui/app-shell.html".to_string(),
            UIUsageContext::Template,
        ));
        
        manager.add_link(ComponentUILink::new(
            "button-primary".to_string(),
            "playback-view".to_string(),
            "src/ui/playback-view.html".to_string(),
            UIUsageContext::Template,
        ));
        
        assert_eq!(manager.get_usage_count("button-primary"), 2);
        assert_eq!(manager.get_usage_count("nonexistent"), 0);
    }
}