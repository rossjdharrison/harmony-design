//! Lifecycle states schema for Harmony Design System components
//! 
//! This module defines the valid lifecycle states a component can be in
//! and the allowed transitions between states.
//! 
//! See: harmony-design/DESIGN_SYSTEM.md#lifecycle-states

use serde::{Deserialize, Serialize};
use std::fmt;

/// Lifecycle state of a component in the design system
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleState {
    /// Initial state - component is being conceptualized
    Draft,
    /// Design specification is complete and approved
    DesignComplete,
    /// Component is actively being implemented
    InDevelopment,
    /// Implementation is complete and tested
    Implemented,
    /// Component is published and available for use
    Published,
    /// Component is deprecated and should not be used in new work
    Deprecated,
}

impl LifecycleState {
    /// Returns all valid lifecycle states
    pub fn all() -> &'static [LifecycleState] {
        &[
            LifecycleState::Draft,
            LifecycleState::DesignComplete,
            LifecycleState::InDevelopment,
            LifecycleState::Implemented,
            LifecycleState::Published,
            LifecycleState::Deprecated,
        ]
    }

    /// Returns valid next states from the current state
    pub fn valid_transitions(&self) -> &'static [LifecycleState] {
        match self {
            LifecycleState::Draft => &[
                LifecycleState::DesignComplete,
                LifecycleState::Deprecated,
            ],
            LifecycleState::DesignComplete => &[
                LifecycleState::InDevelopment,
                LifecycleState::Draft,
                LifecycleState::Deprecated,
            ],
            LifecycleState::InDevelopment => &[
                LifecycleState::Implemented,
                LifecycleState::DesignComplete,
                LifecycleState::Deprecated,
            ],
            LifecycleState::Implemented => &[
                LifecycleState::Published,
                LifecycleState::InDevelopment,
                LifecycleState::Deprecated,
            ],
            LifecycleState::Published => &[
                LifecycleState::Deprecated,
                LifecycleState::InDevelopment,
            ],
            LifecycleState::Deprecated => &[],
        }
    }

    /// Checks if a transition to another state is valid
    pub fn can_transition_to(&self, target: &LifecycleState) -> bool {
        self.valid_transitions().contains(target)
    }

    /// Returns a human-readable description of the state
    pub fn description(&self) -> &'static str {
        match self {
            LifecycleState::Draft => "Component is being conceptualized and designed",
            LifecycleState::DesignComplete => "Design specification is complete and approved",
            LifecycleState::InDevelopment => "Component is actively being implemented",
            LifecycleState::Implemented => "Implementation is complete and tested",
            LifecycleState::Published => "Component is published and available for use",
            LifecycleState::Deprecated => "Component is deprecated and should not be used in new work",
        }
    }
}

impl fmt::Display for LifecycleState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LifecycleState::Draft => write!(f, "draft"),
            LifecycleState::DesignComplete => write!(f, "design_complete"),
            LifecycleState::InDevelopment => write!(f, "in_development"),
            LifecycleState::Implemented => write!(f, "implemented"),
            LifecycleState::Published => write!(f, "published"),
            LifecycleState::Deprecated => write!(f, "deprecated"),
        }
    }
}

/// Metadata associated with a lifecycle state change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateMetadata {
    /// Optional reason for the state change
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    /// Identifier of person or system that changed the state
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changed_by: Option<String>,
    /// Additional notes about this state
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// A lifecycle state entry with timestamp and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecycleEntry {
    /// The lifecycle state
    pub state: LifecycleState,
    /// ISO 8601 timestamp when this state was entered
    pub timestamp: String,
    /// Optional metadata about the state change
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<StateMetadata>,
}

impl LifecycleEntry {
    /// Creates a new lifecycle entry with the current timestamp
    pub fn new(state: LifecycleState) -> Self {
        Self {
            state,
            timestamp: chrono::Utc::now().to_rfc3339(),
            metadata: None,
        }
    }

    /// Creates a new lifecycle entry with metadata
    pub fn with_metadata(state: LifecycleState, metadata: StateMetadata) -> Self {
        Self {
            state,
            timestamp: chrono::Utc::now().to_rfc3339(),
            metadata: Some(metadata),
        }
    }
}

/// Complete history of lifecycle state changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecycleHistory {
    /// Ordered list of state changes (oldest first)
    pub entries: Vec<LifecycleEntry>,
}

impl LifecycleHistory {
    /// Creates a new empty history
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    /// Returns the current (most recent) state, if any
    pub fn current_state(&self) -> Option<&LifecycleEntry> {
        self.entries.last()
    }

    /// Adds a new state to the history
    /// Returns an error if the transition is not valid
    pub fn transition_to(&mut self, new_state: LifecycleState) -> Result<(), String> {
        if let Some(current) = self.current_state() {
            if !current.state.can_transition_to(&new_state) {
                return Err(format!(
                    "Invalid transition from {} to {}",
                    current.state, new_state
                ));
            }
        }
        
        self.entries.push(LifecycleEntry::new(new_state));
        Ok(())
    }

    /// Adds a new state with metadata to the history
    pub fn transition_to_with_metadata(
        &mut self,
        new_state: LifecycleState,
        metadata: StateMetadata,
    ) -> Result<(), String> {
        if let Some(current) = self.current_state() {
            if !current.state.can_transition_to(&new_state) {
                return Err(format!(
                    "Invalid transition from {} to {}",
                    current.state, new_state
                ));
            }
        }
        
        self.entries.push(LifecycleEntry::with_metadata(new_state, metadata));
        Ok(())
    }
}

impl Default for LifecycleHistory {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_transitions() {
        assert!(LifecycleState::Draft.can_transition_to(&LifecycleState::DesignComplete));
        assert!(LifecycleState::DesignComplete.can_transition_to(&LifecycleState::InDevelopment));
        assert!(LifecycleState::InDevelopment.can_transition_to(&LifecycleState::Implemented));
        assert!(LifecycleState::Implemented.can_transition_to(&LifecycleState::Published));
        assert!(LifecycleState::Published.can_transition_to(&LifecycleState::Deprecated));
    }

    #[test]
    fn test_invalid_transitions() {
        assert!(!LifecycleState::Draft.can_transition_to(&LifecycleState::Published));
        assert!(!LifecycleState::Deprecated.can_transition_to(&LifecycleState::Published));
    }

    #[test]
    fn test_backward_transitions() {
        assert!(LifecycleState::DesignComplete.can_transition_to(&LifecycleState::Draft));
        assert!(LifecycleState::InDevelopment.can_transition_to(&LifecycleState::DesignComplete));
        assert!(LifecycleState::Implemented.can_transition_to(&LifecycleState::InDevelopment));
    }

    #[test]
    fn test_lifecycle_history() {
        let mut history = LifecycleHistory::new();
        
        assert!(history.transition_to(LifecycleState::Draft).is_ok());
        assert!(history.transition_to(LifecycleState::DesignComplete).is_ok());
        assert!(history.transition_to(LifecycleState::InDevelopment).is_ok());
        
        // Invalid transition
        assert!(history.transition_to(LifecycleState::Draft).is_err());
        
        assert_eq!(history.current_state().unwrap().state, LifecycleState::InDevelopment);
    }
}