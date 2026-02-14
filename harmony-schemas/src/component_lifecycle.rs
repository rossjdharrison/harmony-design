//! Component Lifecycle State Machine
//! 
//! Defines the lifecycle states for design system components and valid transitions.
//! See harmony-design/DESIGN_SYSTEM.md § Component Lifecycle for usage patterns.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Component lifecycle states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentState {
    /// Initial state - component is being drafted
    Draft,
    /// Design is complete and approved
    DesignComplete,
    /// Component is being implemented
    InDevelopment,
    /// Implementation is complete and tested
    Implemented,
    /// Component is published and available for use
    Published,
}

impl fmt::Display for ComponentState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ComponentState::Draft => write!(f, "draft"),
            ComponentState::DesignComplete => write!(f, "design_complete"),
            ComponentState::InDevelopment => write!(f, "in_development"),
            ComponentState::Implemented => write!(f, "implemented"),
            ComponentState::Published => write!(f, "published"),
        }
    }
}

/// Represents a state transition request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransition {
    pub component_id: String,
    pub from_state: ComponentState,
    pub to_state: ComponentState,
    pub reason: Option<String>,
}

/// Result of a state transition attempt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionResult {
    pub success: bool,
    pub component_id: String,
    pub new_state: Option<ComponentState>,
    pub error: Option<String>,
}

impl ComponentState {
    /// Check if transition to target state is valid
    pub fn can_transition_to(&self, target: ComponentState) -> bool {
        match (self, target) {
            // Forward transitions
            (ComponentState::Draft, ComponentState::DesignComplete) => true,
            (ComponentState::DesignComplete, ComponentState::InDevelopment) => true,
            (ComponentState::InDevelopment, ComponentState::Implemented) => true,
            (ComponentState::Implemented, ComponentState::Published) => true,
            
            // Backward transitions (for corrections)
            (ComponentState::DesignComplete, ComponentState::Draft) => true,
            (ComponentState::InDevelopment, ComponentState::DesignComplete) => true,
            (ComponentState::Implemented, ComponentState::InDevelopment) => true,
            (ComponentState::Published, ComponentState::Implemented) => true,
            
            // Same state (no-op)
            (a, b) if a == b => true,
            
            // All other transitions are invalid
            _ => false,
        }
    }

    /// Get the next valid states from current state
    pub fn next_states(&self) -> Vec<ComponentState> {
        match self {
            ComponentState::Draft => vec![ComponentState::DesignComplete],
            ComponentState::DesignComplete => vec![
                ComponentState::InDevelopment,
                ComponentState::Draft,
            ],
            ComponentState::InDevelopment => vec![
                ComponentState::Implemented,
                ComponentState::DesignComplete,
            ],
            ComponentState::Implemented => vec![
                ComponentState::Published,
                ComponentState::InDevelopment,
            ],
            ComponentState::Published => vec![ComponentState::Implemented],
        }
    }

    /// Get all possible states
    pub fn all_states() -> Vec<ComponentState> {
        vec![
            ComponentState::Draft,
            ComponentState::DesignComplete,
            ComponentState::InDevelopment,
            ComponentState::Implemented,
            ComponentState::Published,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_forward_transitions() {
        assert!(ComponentState::Draft.can_transition_to(ComponentState::DesignComplete));
        assert!(ComponentState::DesignComplete.can_transition_to(ComponentState::InDevelopment));
        assert!(ComponentState::InDevelopment.can_transition_to(ComponentState::Implemented));
        assert!(ComponentState::Implemented.can_transition_to(ComponentState::Published));
    }

    #[test]
    fn test_backward_transitions() {
        assert!(ComponentState::DesignComplete.can_transition_to(ComponentState::Draft));
        assert!(ComponentState::InDevelopment.can_transition_to(ComponentState::DesignComplete));
        assert!(ComponentState::Implemented.can_transition_to(ComponentState::InDevelopment));
        assert!(ComponentState::Published.can_transition_to(ComponentState::Implemented));
    }

    #[test]
    fn test_invalid_transitions() {
        assert!(!ComponentState::Draft.can_transition_to(ComponentState::InDevelopment));
        assert!(!ComponentState::Draft.can_transition_to(ComponentState::Implemented));
        assert!(!ComponentState::Draft.can_transition_to(ComponentState::Published));
        assert!(!ComponentState::DesignComplete.can_transition_to(ComponentState::Implemented));
    }

    #[test]
    fn test_same_state_transition() {
        assert!(ComponentState::Draft.can_transition_to(ComponentState::Draft));
        assert!(ComponentState::Published.can_transition_to(ComponentState::Published));
    }

    #[test]
    fn test_next_states() {
        let draft_next = ComponentState::Draft.next_states();
        assert_eq!(draft_next.len(), 1);
        assert!(draft_next.contains(&ComponentState::DesignComplete));

        let design_next = ComponentState::DesignComplete.next_states();
        assert_eq!(design_next.len(), 2);
        assert!(design_next.contains(&ComponentState::InDevelopment));
        assert!(design_next.contains(&ComponentState::Draft));
    }
}