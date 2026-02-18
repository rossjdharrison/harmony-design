#!/usr/bin/env python3
"""
Validate composition rules for Harmony Design System components.

This tool checks that composition relationships follow design system rules:
- Primitives cannot contain other components
- Molecules can only contain primitives
- Organisms can contain molecules and primitives
- Templates can contain organisms, molecules, and primitives
- Pages can contain any component type

See: harmony-design/DESIGN_SYSTEM.md#composition-validation
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple


class CompositionValidator:
    """Validates component composition rules based on atomic design hierarchy."""
    
    # Define valid composition rules: component_level -> allowed_child_levels
    COMPOSITION_RULES = {
        'primitive': set(),  # Primitives cannot contain other components
        'molecule': {'primitive'},
        'organism': {'molecule', 'primitive'},
        'template': {'organism', 'molecule', 'primitive'},
        'page': {'template', 'organism', 'molecule', 'primitive'}
    }
    
    def __init__(self, graph_path: Path):
        """
        Initialize validator with graph data.
        
        Args:
            graph_path: Path to the graph JSON file containing nodes and edges
        """
        self.graph_path = graph_path
        self.nodes: Dict[str, dict] = {}
        self.edges: List[dict] = []
        self.violations: List[dict] = []
        
    def load_graph(self) -> bool:
        """Load graph data from JSON file."""
        try:
            with open(self.graph_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Index nodes by id for quick lookup
            for node in data.get('nodes', []):
                self.nodes[node['id']] = node
                
            self.edges = data.get('edges', [])
            return True
            
        except FileNotFoundError:
            print(f"Error: Graph file not found: {self.graph_path}", file=sys.stderr)
            return False
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in graph file: {e}", file=sys.stderr)
            return False
            
    def get_component_level(self, node_id: str) -> str | None:
        """Get the component level (primitive, molecule, etc.) for a node."""
        node = self.nodes.get(node_id)
        if not node:
            return None
            
        # Check if it's a DesignSpecNode with a level property
        if node.get('type') == 'DesignSpecNode':
            return node.get('properties', {}).get('level')
            
        return None
        
    def validate_composition_edge(self, edge: dict) -> Tuple[bool, str | None]:
        """
        Validate a single composition edge.
        
        Args:
            edge: Edge dict with 'from', 'to', and 'type' fields
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if edge.get('type') != 'composedOf':
            return (True, None)  # Only validate composition edges
            
        parent_id = edge.get('from')
        child_id = edge.get('to')
        
        parent_level = self.get_component_level(parent_id)
        child_level = self.get_component_level(child_id)
        
        # Skip validation if either node is not a component or level is unknown
        if not parent_level or not child_level:
            return (True, None)
            
        # Check if this composition is allowed
        allowed_children = self.COMPOSITION_RULES.get(parent_level, set())
        
        if child_level not in allowed_children:
            parent_name = self.nodes[parent_id].get('properties', {}).get('name', parent_id)
            child_name = self.nodes[child_id].get('properties', {}).get('name', child_id)
            
            error = (
                f"Invalid composition: {parent_level} '{parent_name}' "
                f"cannot contain {child_level} '{child_name}'. "
                f"Allowed children: {', '.join(sorted(allowed_children)) if allowed_children else 'none'}"
            )
            return (False, error)
            
        return (True, None)
        
    def validate_all(self) -> bool:
        """
        Validate all composition edges in the graph.
        
        Returns:
            True if all validations pass, False otherwise
        """
        self.violations = []
        
        for edge in self.edges:
            is_valid, error = self.validate_composition_edge(edge)
            if not is_valid:
                self.violations.append({
                    'edge': edge,
                    'error': error
                })
                
        return len(self.violations) == 0
        
    def print_report(self) -> None:
        """Print validation report to stdout."""
        if not self.violations:
            print("✓ All composition rules validated successfully")
            print(f"  Checked {len([e for e in self.edges if e.get('type') == 'composedOf'])} composition relationships")
            return
            
        print(f"✗ Found {len(self.violations)} composition rule violation(s):\n")
        
        for i, violation in enumerate(self.violations, 1):
            print(f"{i}. {violation['error']}")
            edge = violation['edge']
            print(f"   Edge: {edge.get('from')} -> {edge.get('to')}")
            print()
            
    def get_exit_code(self) -> int:
        """Get exit code based on validation results."""
        return 0 if len(self.violations) == 0 else 1


def main():
    """Main entry point for the validation tool."""
    if len(sys.argv) < 2:
        print("Usage: validate_composition.py <path_to_graph.json>", file=sys.stderr)
        print("\nValidates component composition rules in the design system graph.")
        print("See harmony-design/DESIGN_SYSTEM.md#composition-validation for rules.")
        sys.exit(1)
        
    graph_path = Path(sys.argv[1])
    
    validator = CompositionValidator(graph_path)
    
    if not validator.load_graph():
        sys.exit(1)
        
    validator.validate_all()
    validator.print_report()
    
    sys.exit(validator.get_exit_code())


if __name__ == '__main__':
    main()