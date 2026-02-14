"""
Example: Using update_component_state MCP tool

This example demonstrates how to update component state
with automatic validation.

See: harmony-design/DESIGN_SYSTEM.md#mcp-tools
"""

from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.update_component_state import update_component_state


def example_successful_update():
    """Example: Successful state update with prerequisites met."""
    print("=== Example: Successful Update ===\n")
    
    # Assuming button-primary.pen exists
    result = update_component_state(
        component_id="button-primary",
        new_state="design_complete"
    )
    
    if result["success"]:
        print(f"✓ Success: {result['message']}")
        print(f"  From: {result['from_state']}")
        print(f"  To: {result['to_state']}")
    else:
        print(f"✗ Failed: {result['error']}")


def example_validation_failure():
    """Example: State update fails validation."""
    print("\n=== Example: Validation Failure ===\n")
    
    # Attempting update without prerequisites
    result = update_component_state(
        component_id="card-component",
        new_state="design_complete"
    )
    
    if not result["success"]:
        print(f"✗ Failed: {result['error']}")
        print("\nValidation errors:")
        for error in result.get("validation_errors", []):
            print(f"  - {error}")


def example_force_update():
    """Example: Forced update bypassing validation."""
    print("\n=== Example: Force Update ===\n")
    
    result = update_component_state(
        component_id="button-primary",
        new_state="implemented",
        force=True
    )
    
    if result["success"]:
        print(f"✓ Forced update successful")
        print(f"  Warning: Validation was bypassed")
        print(f"  To: {result['to_state']}")


def example_check_prerequisites():
    """Example: Checking what prerequisites are needed."""
    print("\n=== Example: Check Prerequisites ===\n")
    
    result = update_component_state(
        component_id="dropdown-menu",
        new_state="design_complete"
    )
    
    if not result["success"]:
        print("Prerequisites needed for this transition:")
        for error in result.get("validation_errors", []):
            print(f"  • {error}")
        print("\nCreate the required files, then retry the update.")


if __name__ == "__main__":
    print("Harmony Design System - MCP Tool Examples")
    print("=" * 50)
    
    example_successful_update()
    example_validation_failure()
    example_force_update()
    example_check_prerequisites()
    
    print("\n" + "=" * 50)
    print("Examples complete. See harmony-design/mcp/README.md for more info.")