//! Component Lifecycle Bounded Context
//! 
//! Manages component state transitions through the design system lifecycle.
//! See harmony-design/DESIGN_SYSTEM.md § Component Lifecycle

use harmony_schemas::{ComponentState, StateTransition, TransitionResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ComponentLifecycleBC {
    component_states: HashMap<String, ComponentState>,
}

#[wasm_bindgen]
impl ComponentLifecycleBC {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            component_states: HashMap::new(),
        }
    }

    /// Initialize a component in draft state
    #[wasm_bindgen(js_name = initializeComponent)]
    pub fn initialize_component(&mut self, component_id: &str) -> String {
        self.component_states
            .insert(component_id.to_string(), ComponentState::Draft);
        
        serde_json::to_string(&TransitionResult {
            success: true,
            component_id: component_id.to_string(),
            new_state: Some(ComponentState::Draft),
            error: None,
        })
        .unwrap_or_else(|_| "{}".to_string())
    }

    /// Attempt to transition a component to a new state
    #[wasm_bindgen(js_name = transitionComponent)]
    pub fn transition_component(&mut self, transition_json: &str) -> String {
        let transition: StateTransition = match serde_json::from_str(transition_json) {
            Ok(t) => t,
            Err(e) => {
                return serde_json::to_string(&TransitionResult {
                    success: false,
                    component_id: String::new(),
                    new_state: None,
                    error: Some(format!("Invalid transition JSON: {}", e)),
                })
                .unwrap_or_else(|_| "{}".to_string());
            }
        };

        let current_state = match self.component_states.get(&transition.component_id) {
            Some(state) => *state,
            None => {
                return serde_json::to_string(&TransitionResult {
                    success: false,
                    component_id: transition.component_id,
                    new_state: None,
                    error: Some("Component not found".to_string()),
                })
                .unwrap_or_else(|_| "{}".to_string());
            }
        };

        if current_state != transition.from_state {
            return serde_json::to_string(&TransitionResult {
                success: false,
                component_id: transition.component_id,
                new_state: Some(current_state),
                error: Some(format!(
                    "State mismatch: expected {}, found {}",
                    transition.from_state, current_state
                )),
            })
            .unwrap_or_else(|_| "{}".to_string());
        }

        if !current_state.can_transition_to(transition.to_state) {
            return serde_json::to_string(&TransitionResult {
                success: false,
                component_id: transition.component_id,
                new_state: Some(current_state),
                error: Some(format!(
                    "Invalid transition: {} -> {}",
                    transition.from_state, transition.to_state
                )),
            })
            .unwrap_or_else(|_| "{}".to_string());
        }

        self.component_states
            .insert(transition.component_id.clone(), transition.to_state);

        serde_json::to_string(&TransitionResult {
            success: true,
            component_id: transition.component_id,
            new_state: Some(transition.to_state),
            error: None,
        })
        .unwrap_or_else(|_| "{}".to_string())
    }

    /// Get current state of a component
    #[wasm_bindgen(js_name = getComponentState)]
    pub fn get_component_state(&self, component_id: &str) -> String {
        match self.component_states.get(component_id) {
            Some(state) => format!("\"{}\"", state),
            None => "null".to_string(),
        }
    }

    /// Get all valid next states for a component
    #[wasm_bindgen(js_name = getNextStates)]
    pub fn get_next_states(&self, component_id: &str) -> String {
        match self.component_states.get(component_id) {
            Some(state) => {
                let next = state.next_states();
                serde_json::to_string(&next).unwrap_or_else(|_| "[]".to_string())
            }
            None => "[]".to_string(),
        }
    }
}

impl Default for ComponentLifecycleBC {
    fn default() -> Self {
        Self::new()
    }
}