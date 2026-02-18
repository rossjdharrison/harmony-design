#!/usr/bin/env python3
"""
Tests for validate_composition tool.

Run with: pytest test_validate_composition.py
"""

import json
import pytest
from pathlib import Path
from tempfile import NamedTemporaryFile
from validate_composition import CompositionValidator


def create_test_graph(nodes, edges):
    """Helper to create a temporary graph file for testing."""
    with NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({'nodes': nodes, 'edges': edges}, f)
        return Path(f.name)


def test_primitive_cannot_contain_components():
    """Test that primitives cannot contain any other components."""
    nodes = [
        {
            'id': 'button',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Button', 'level': 'primitive'}
        },
        {
            'id': 'icon',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Icon', 'level': 'primitive'}
        }
    ]
    edges = [
        {'from': 'button', 'to': 'icon', 'type': 'composedOf'}
    ]
    
    graph_path = create_test_graph(nodes, edges)
    validator = CompositionValidator(graph_path)
    validator.load_graph()
    
    assert not validator.validate_all()
    assert len(validator.violations) == 1
    assert 'primitive' in validator.violations[0]['error']
    
    graph_path.unlink()


def test_molecule_can_contain_primitives():
    """Test that molecules can contain primitives."""
    nodes = [
        {
            'id': 'search-field',
            'type': 'DesignSpecNode',
            'properties': {'name': 'SearchField', 'level': 'molecule'}
        },
        {
            'id': 'input',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Input', 'level': 'primitive'}
        }
    ]
    edges = [
        {'from': 'search-field', 'to': 'input', 'type': 'composedOf'}
    ]
    
    graph_path = create_test_graph(nodes, edges)
    validator = CompositionValidator(graph_path)
    validator.load_graph()
    
    assert validator.validate_all()
    assert len(validator.violations) == 0
    
    graph_path.unlink()


def test_molecule_cannot_contain_organism():
    """Test that molecules cannot contain organisms."""
    nodes = [
        {
            'id': 'card',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Card', 'level': 'molecule'}
        },
        {
            'id': 'header',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Header', 'level': 'organism'}
        }
    ]
    edges = [
        {'from': 'card', 'to': 'header', 'type': 'composedOf'}
    ]
    
    graph_path = create_test_graph(nodes, edges)
    validator = CompositionValidator(graph_path)
    validator.load_graph()
    
    assert not validator.validate_all()
    assert len(validator.violations) == 1
    
    graph_path.unlink()


def test_organism_can_contain_molecules_and_primitives():
    """Test that organisms can contain molecules and primitives."""
    nodes = [
        {
            'id': 'header',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Header', 'level': 'organism'}
        },
        {
            'id': 'nav',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Navigation', 'level': 'molecule'}
        },
        {
            'id': 'logo',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Logo', 'level': 'primitive'}
        }
    ]
    edges = [
        {'from': 'header', 'to': 'nav', 'type': 'composedOf'},
        {'from': 'header', 'to': 'logo', 'type': 'composedOf'}
    ]
    
    graph_path = create_test_graph(nodes, edges)
    validator = CompositionValidator(graph_path)
    validator.load_graph()
    
    assert validator.validate_all()
    assert len(validator.violations) == 0
    
    graph_path.unlink()


def test_template_can_contain_multiple_levels():
    """Test that templates can contain organisms, molecules, and primitives."""
    nodes = [
        {
            'id': 'dashboard',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Dashboard', 'level': 'template'}
        },
        {
            'id': 'header',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Header', 'level': 'organism'}
        },
        {
            'id': 'card',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Card', 'level': 'molecule'}
        }
    ]
    edges = [
        {'from': 'dashboard', 'to': 'header', 'type': 'composedOf'},
        {'from': 'dashboard', 'to': 'card', 'type': 'composedOf'}
    ]
    
    graph_path = create_test_graph(nodes, edges)
    validator = CompositionValidator(graph_path)
    validator.load_graph()
    
    assert validator.validate_all()
    assert len(validator.violations) == 0
    
    graph_path.unlink()


def test_non_composition_edges_ignored():
    """Test that non-composition edges are not validated."""
    nodes = [
        {
            'id': 'button',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Button', 'level': 'primitive'}
        },
        {
            'id': 'button-impl',
            'type': 'ImplementationNode',
            'properties': {'path': 'button.tsx'}
        }
    ]
    edges = [
        {'from': 'button', 'to': 'button-impl', 'type': 'implementedBy'}
    ]
    
    graph_path = create_test_graph(nodes, edges)
    validator = CompositionValidator(graph_path)
    validator.load_graph()
    
    assert validator.validate_all()
    assert len(validator.violations) == 0
    
    graph_path.unlink()


def test_multiple_violations_reported():
    """Test that multiple violations are all reported."""
    nodes = [
        {
            'id': 'button',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Button', 'level': 'primitive'}
        },
        {
            'id': 'icon',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Icon', 'level': 'primitive'}
        },
        {
            'id': 'card',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Card', 'level': 'molecule'}
        },
        {
            'id': 'header',
            'type': 'DesignSpecNode',
            'properties': {'name': 'Header', 'level': 'organism'}
        }
    ]
    edges = [
        {'from': 'button', 'to': 'icon', 'type': 'composedOf'},
        {'from': 'card', 'to': 'header', 'type': 'composedOf'}
    ]
    
    graph_path = create_test_graph(nodes, edges)
    validator = CompositionValidator(graph_path)
    validator.load_graph()
    
    assert not validator.validate_all()
    assert len(validator.violations) == 2
    
    graph_path.unlink()