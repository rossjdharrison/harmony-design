"""
MCP tool: update_component_state with automatic validation

This tool updates a component's state while automatically validating:
- State transition prerequisites
- Valid state machine transitions
- Component existence and readiness

See: harmony-design/DESIGN_SYSTEM.md#state-machine-validation
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional


class ComponentStateUpdater:
    """
    Handles component state updates with validation.
    
    Validates against state machine definition and transition rules
    before applying state changes.
    """
    
    def __init__(self, repo_root: Path):
        """
        Initialize the state updater.
        
        Args:
            repo_root: Root directory of the harmony-design repository
        """
        self.repo_root = repo_root
        self.state_machine_path = repo_root / "harmony-design" / "state-machine"
        self.components_path = repo_root / "harmony-design" / "components"
        
    def load_state_machine(self) -> Dict[str, Any]:
        """
        Load the state machine definition.
        
        Returns:
            Dict containing state machine rules and transitions
        """
        definition_file = self.state_machine_path / "definition.json"
        if not definition_file.exists():
            return {
                "states": ["draft", "design_complete", "implemented", "validated"],
                "transitions": {}
            }
        
        with open(definition_file, 'r') as f:
            return json.load(f)
    
    def load_transition_rules(self) -> Dict[str, Any]:
        """
        Load transition validation rules.
        
        Returns:
            Dict containing prerequisites for each transition
        """
        rules_file = self.state_machine_path / "transition-rules.json"
        if not rules_file.exists():
            return {"transitions": {}}
        
        with open(rules_file, 'r') as f:
            return json.load(f)
    
    def get_component_state(self, component_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current state of a component.
        
        Args:
            component_id: Unique identifier for the component
            
        Returns:
            Dict containing component state or None if not found
        """
        state_file = self.components_path / f"{component_id}.state.json"
        if not state_file.exists():
            return None
        
        with open(state_file, 'r') as f:
            return json.load(f)
    
    def validate_transition(
        self,
        component_id: str,
        from_state: str,
        to_state: str,
        transition_rules: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """
        Validate if a state transition is allowed.
        
        Args:
            component_id: Component being transitioned
            from_state: Current state
            to_state: Target state
            transition_rules: Rules defining valid transitions
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check if transition exists in rules
        transition_key = f"{from_state}_to_{to_state}"
        if transition_key not in transition_rules.get("transitions", {}):
            errors.append(f"No transition defined from '{from_state}' to '{to_state}'")
            return False, errors
        
        # Check prerequisites
        prerequisites = transition_rules["transitions"][transition_key].get("prerequisites", [])
        component_state = self.get_component_state(component_id)
        
        if not component_state:
            errors.append(f"Component '{component_id}' not found")
            return False, errors
        
        for prereq in prerequisites:
            if not self._check_prerequisite(component_id, prereq, component_state):
                errors.append(f"Prerequisite not met: {prereq['description']}")
        
        return len(errors) == 0, errors
    
    def _check_prerequisite(
        self,
        component_id: str,
        prerequisite: Dict[str, Any],
        component_state: Dict[str, Any]
    ) -> bool:
        """
        Check if a specific prerequisite is satisfied.
        
        Args:
            component_id: Component being checked
            prerequisite: Prerequisite definition
            component_state: Current component state
            
        Returns:
            True if prerequisite is satisfied
        """
        prereq_type = prerequisite.get("type")
        
        if prereq_type == "file_exists":
            file_path = self.repo_root / prerequisite["path"].format(
                component_id=component_id
            )
            return file_path.exists()
        
        elif prereq_type == "property_set":
            prop_path = prerequisite["property"].split(".")
            value = component_state
            for key in prop_path:
                if key not in value:
                    return False
                value = value[key]
            return value is not None
        
        elif prereq_type == "linked_resources":
            links = component_state.get("links", {})
            required_link_type = prerequisite["link_type"]
            return required_link_type in links and len(links[required_link_type]) > 0
        
        return False
    
    def update_state(
        self,
        component_id: str,
        new_state: str,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Update component state with validation.
        
        Args:
            component_id: Component to update
            new_state: Target state
            force: Skip validation if True (use with caution)
            
        Returns:
            Dict containing result with success status and messages
        """
        # Load current state
        component_state = self.get_component_state(component_id)
        if not component_state:
            return {
                "success": False,
                "error": f"Component '{component_id}' not found",
                "component_id": component_id
            }
        
        current_state = component_state.get("state", "draft")
        
        # Skip validation if forced
        if force:
            return self._apply_state_update(component_id, component_state, new_state)
        
        # Validate transition
        transition_rules = self.load_transition_rules()
        is_valid, errors = self.validate_transition(
            component_id,
            current_state,
            new_state,
            transition_rules
        )
        
        if not is_valid:
            return {
                "success": False,
                "error": "Transition validation failed",
                "validation_errors": errors,
                "component_id": component_id,
                "from_state": current_state,
                "to_state": new_state
            }
        
        # Apply update
        return self._apply_state_update(component_id, component_state, new_state)
    
    def _apply_state_update(
        self,
        component_id: str,
        component_state: Dict[str, Any],
        new_state: str
    ) -> Dict[str, Any]:
        """
        Apply the state update to the component file.
        
        Args:
            component_id: Component being updated
            component_state: Current state object
            new_state: New state to apply
            
        Returns:
            Dict containing success result
        """
        old_state = component_state.get("state", "draft")
        component_state["state"] = new_state
        component_state["state_history"] = component_state.get("state_history", [])
        component_state["state_history"].append({
            "from": old_state,
            "to": new_state,
            "timestamp": self._get_timestamp()
        })
        
        # Write updated state
        state_file = self.components_path / f"{component_id}.state.json"
        state_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(state_file, 'w') as f:
            json.dump(component_state, f, indent=2)
        
        return {
            "success": True,
            "component_id": component_id,
            "from_state": old_state,
            "to_state": new_state,
            "message": f"Successfully updated {component_id} from {old_state} to {new_state}"
        }
    
    def _get_timestamp(self) -> str:
        """Get ISO format timestamp."""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"


def update_component_state(
    component_id: str,
    new_state: str,
    force: bool = False,
    repo_root: Optional[str] = None
) -> Dict[str, Any]:
    """
    MCP tool entry point: Update component state with validation.
    
    Args:
        component_id: Unique identifier for the component
        new_state: Target state (e.g., 'design_complete', 'implemented')
        force: Skip validation checks if True
        repo_root: Root directory of repository (defaults to current directory)
        
    Returns:
        Dict containing operation result
        
    Example:
        >>> result = update_component_state('button-primary', 'design_complete')
        >>> print(result['success'])
        True
    """
    if repo_root is None:
        repo_root = os.getcwd()
    
    updater = ComponentStateUpdater(Path(repo_root))
    return updater.update_state(component_id, new_state, force)


# MCP tool metadata
TOOL_METADATA = {
    "name": "update_component_state",
    "description": "Update component state with automatic validation against state machine rules",
    "parameters": {
        "component_id": {
            "type": "string",
            "description": "Unique identifier for the component",
            "required": True
        },
        "new_state": {
            "type": "string",
            "description": "Target state (draft, design_complete, implemented, validated)",
            "required": True
        },
        "force": {
            "type": "boolean",
            "description": "Skip validation checks (use with caution)",
            "required": False,
            "default": False
        }
    }
}