#!/usr/bin/env python3
"""
CLI wrapper for Harmony Design System MCP tools

Usage:
    python -m harmony_design.mcp.cli update-state button-primary design_complete
    python -m harmony_design.mcp.cli update-state button-primary implemented --force
"""

import argparse
import json
import sys
from pathlib import Path
from tools.update_component_state import update_component_state


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Harmony Design System MCP Tools"
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # update-state command
    update_parser = subparsers.add_parser(
        "update-state",
        help="Update component state with validation"
    )
    update_parser.add_argument(
        "component_id",
        help="Component identifier"
    )
    update_parser.add_argument(
        "new_state",
        help="Target state (draft, design_complete, implemented, validated)"
    )
    update_parser.add_argument(
        "--force",
        action="store_true",
        help="Skip validation checks"
    )
    update_parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root directory (default: current directory)"
    )
    
    args = parser.parse_args()
    
    if args.command == "update-state":
        result = update_component_state(
            component_id=args.component_id,
            new_state=args.new_state,
            force=args.force,
            repo_root=args.repo_root
        )
        
        # Pretty print result
        print(json.dumps(result, indent=2))
        
        # Exit with error code if failed
        if not result["success"]:
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()