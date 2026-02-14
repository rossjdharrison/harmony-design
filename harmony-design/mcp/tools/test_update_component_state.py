"""
Tests for update_component_state MCP tool

Run with: pytest harmony-design/mcp/tools/test_update_component_state.py
"""

import json
import pytest
from pathlib import Path
from tempfile import TemporaryDirectory
from update_component_state import ComponentStateUpdater, update_component_state


@pytest.fixture
def temp_repo():
    """Create a temporary repository structure for testing."""
    with TemporaryDirectory() as tmpdir:
        repo_root = Path(tmpdir)
        
        # Create directory structure
        state_machine_dir = repo_root / "harmony-design" / "state-machine"
        components_dir = repo_root / "harmony-design" / "components"
        state_machine_dir.mkdir(parents=True)
        components_dir.mkdir(parents=True)
        
        # Create state machine definition
        definition = {
            "states": ["draft", "design_complete", "implemented", "validated"],
            "transitions": {
                "draft_to_design_complete": True,
                "design_complete_to_implemented": True,
                "implemented_to_validated": True
            }
        }
        with open(state_machine_dir / "definition.json", 'w') as f:
            json.dump(definition, f)
        
        # Create transition rules
        rules = {
            "transitions": {
                "draft_to_design_complete": {
                    "prerequisites": [
                        {
                            "type": "file_exists",
                            "path": "harmony-design/components/{component_id}.pen",
                            "description": "Design specification file must exist"
                        }
                    ]
                },
                "design_complete_to_implemented": {
                    "prerequisites": [
                        {
                            "type": "file_exists",
                            "path": "harmony-design/components/{component_id}.js",
                            "description": "Implementation file must exist"
                        }
                    ]
                }
            }
        }
        with open(state_machine_dir / "transition-rules.json", 'w') as f:
            json.dump(rules, f)
        
        # Create sample component state
        component_state = {
            "component_id": "button-primary",
            "state": "draft",
            "links": {},
            "state_history": []
        }
        with open(components_dir / "button-primary.state.json", 'w') as f:
            json.dump(component_state, f)
        
        yield repo_root


def test_load_state_machine(temp_repo):
    """Test loading state machine definition."""
    updater = ComponentStateUpdater(temp_repo)
    state_machine = updater.load_state_machine()
    
    assert "states" in state_machine
    assert "draft" in state_machine["states"]
    assert "design_complete" in state_machine["states"]


def test_load_transition_rules(temp_repo):
    """Test loading transition rules."""
    updater = ComponentStateUpdater(temp_repo)
    rules = updater.load_transition_rules()
    
    assert "transitions" in rules
    assert "draft_to_design_complete" in rules["transitions"]


def test_get_component_state(temp_repo):
    """Test retrieving component state."""
    updater = ComponentStateUpdater(temp_repo)
    state = updater.get_component_state("button-primary")
    
    assert state is not None
    assert state["component_id"] == "button-primary"
    assert state["state"] == "draft"


def test_validate_transition_missing_prerequisite(temp_repo):
    """Test validation fails when prerequisite is missing."""
    updater = ComponentStateUpdater(temp_repo)
    rules = updater.load_transition_rules()
    
    is_valid, errors = updater.validate_transition(
        "button-primary",
        "draft",
        "design_complete",
        rules
    )
    
    assert not is_valid
    assert len(errors) > 0
    assert "Design specification file must exist" in errors[0]


def test_validate_transition_with_prerequisite(temp_repo):
    """Test validation succeeds when prerequisite is met."""
    updater = ComponentStateUpdater(temp_repo)
    
    # Create the required file
    pen_file = temp_repo / "harmony-design" / "components" / "button-primary.pen"
    pen_file.write_text("// Design spec")
    
    rules = updater.load_transition_rules()
    is_valid, errors = updater.validate_transition(
        "button-primary",
        "draft",
        "design_complete",
        rules
    )
    
    assert is_valid
    assert len(errors) == 0


def test_update_state_success(temp_repo):
    """Test successful state update."""
    # Create prerequisite file
    pen_file = temp_repo / "harmony-design" / "components" / "button-primary.pen"
    pen_file.write_text("// Design spec")
    
    updater = ComponentStateUpdater(temp_repo)
    result = updater.update_state("button-primary", "design_complete")
    
    assert result["success"]
    assert result["from_state"] == "draft"
    assert result["to_state"] == "design_complete"
    
    # Verify state was updated
    updated_state = updater.get_component_state("button-primary")
    assert updated_state["state"] == "design_complete"
    assert len(updated_state["state_history"]) == 1


def test_update_state_validation_failure(temp_repo):
    """Test state update fails validation."""
    updater = ComponentStateUpdater(temp_repo)
    result = updater.update_state("button-primary", "design_complete")
    
    assert not result["success"]
    assert "validation_errors" in result
    assert len(result["validation_errors"]) > 0


def test_update_state_force(temp_repo):
    """Test forced state update bypasses validation."""
    updater = ComponentStateUpdater(temp_repo)
    result = updater.update_state("button-primary", "design_complete", force=True)
    
    assert result["success"]
    assert result["to_state"] == "design_complete"


def test_mcp_tool_entry_point(temp_repo):
    """Test the MCP tool entry point function."""
    # Create prerequisite file
    pen_file = temp_repo / "harmony-design" / "components" / "button-primary.pen"
    pen_file.write_text("// Design spec")
    
    result = update_component_state(
        "button-primary",
        "design_complete",
        repo_root=str(temp_repo)
    )
    
    assert result["success"]
    assert result["component_id"] == "button-primary"