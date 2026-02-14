//! Component → UI Link: tracks where a component is used in the application UI
//! 
//! See: harmony-design/DESIGN_SYSTEM.md#component-ui-links

use serde::{Deserialize, Serialize};

/// Represents a link from a Component to a UI location where it's used
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ComponentUILink {
    /// ID of the source component
    pub component_id: String,
    
    /// UI location where component is used (e.g., "app-shell", "playback-view")
    pub ui_location: String,
    
    /// File path where the usage occurs
    pub file_path: String,
    
    /// Line number in the file (optional)
    pub line_number: Option<u32>,
    
    /// Context of usage (e.g., "template", "dynamic-import", "web-component-tag")
    pub usage_context: UIUsageContext,
}

/// Types of UI usage contexts
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum UIUsageContext {
    /// Used in HTML template
    Template,
    
    /// Dynamically imported in JavaScript
    DynamicImport,
    
    /// Used as web component tag
    WebComponentTag,
    
    /// Referenced in CSS
    StyleReference,
    
    /// Other usage type
    Other(String),
}

impl ComponentUILink {
    /// Create a new Component → UI link
    pub fn new(
        component_id: String,
        ui_location: String,
        file_path: String,
        usage_context: UIUsageContext,
    ) -> Self {
        Self {
            component_id,
            ui_location,
            file_path,
            line_number: None,
            usage_context,
        }
    }
    
    /// Set the line number for this usage
    pub fn with_line_number(mut self, line_number: u32) -> Self {
        self.line_number = Some(line_number);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_component_ui_link_creation() {
        let link = ComponentUILink::new(
            "button-primary".to_string(),
            "app-shell".to_string(),
            "src/ui/app-shell.html".to_string(),
            UIUsageContext::Template,
        );
        
        assert_eq!(link.component_id, "button-primary");
        assert_eq!(link.ui_location, "app-shell");
        assert_eq!(link.usage_context, UIUsageContext::Template);
    }

    #[test]
    fn test_with_line_number() {
        let link = ComponentUILink::new(
            "button-primary".to_string(),
            "app-shell".to_string(),
            "src/ui/app-shell.html".to_string(),
            UIUsageContext::Template,
        ).with_line_number(42);
        
        assert_eq!(link.line_number, Some(42));
    }
}