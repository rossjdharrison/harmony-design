#!/usr/bin/env python3
"""
Test suite for Rust struct generator.

Run with: pytest test_rust_struct_generator.py
"""

import json
import pytest
from rust_struct_generator import RustStructGenerator


class TestRustStructGenerator:
    """Test cases for RustStructGenerator."""

    def test_simple_struct(self):
        """Test generation of a simple struct with basic types."""
        schema = {
            "title": "User",
            "type": "object",
            "description": "A user account",
            "properties": {
                "id": {"type": "string", "description": "User ID"},
                "name": {"type": "string", "description": "User name"},
                "age": {"type": "integer", "description": "User age"},
                "active": {"type": "boolean", "description": "Account status"},
            },
            "required": ["id", "name"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        # Check essential elements
        assert "pub struct User {" in output
        assert "pub id: String," in output
        assert "pub name: String," in output
        assert "pub age: Option<i64>," in output
        assert "pub active: Option<bool>," in output
        assert "#[derive(Debug, Clone, Serialize, Deserialize)]" in output
        assert "/// A user account" in output

    def test_camel_case_conversion(self):
        """Test that camelCase properties are converted to snake_case."""
        schema = {
            "title": "Config",
            "type": "object",
            "properties": {
                "maxRetries": {"type": "integer"},
                "timeoutMs": {"type": "integer"},
            },
            "required": ["maxRetries"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        assert "pub max_retries: i64," in output
        assert "pub timeout_ms: Option<i64>," in output
        assert '#[serde(rename = "maxRetries")]' in output
        assert '#[serde(rename = "timeoutMs")]' in output

    def test_array_types(self):
        """Test generation of array/Vec types."""
        schema = {
            "title": "Playlist",
            "type": "object",
            "properties": {
                "tracks": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Track IDs",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["tracks"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        assert "pub tracks: Vec<String>," in output
        assert "pub tags: Option<Vec<String>>," in output

    def test_nested_references(self):
        """Test handling of $ref to definitions."""
        schema = {
            "title": "Project",
            "type": "object",
            "properties": {
                "owner": {"$ref": "#/definitions/User"},
                "members": {
                    "type": "array",
                    "items": {"$ref": "#/definitions/User"},
                },
            },
            "required": ["owner"],
            "definitions": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                    },
                    "required": ["id", "name"],
                }
            },
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        # Should generate both Project and User structs
        assert "pub struct Project {" in output
        assert "pub struct User {" in output
        assert "pub owner: User," in output
        assert "pub members: Option<Vec<User>>," in output

    def test_optional_fields(self):
        """Test that optional fields use Option<T> and skip_serializing_if."""
        schema = {
            "title": "Article",
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "title": {"type": "string"},
                "subtitle": {"type": "string"},
            },
            "required": ["id", "title"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        assert "pub id: String," in output
        assert "pub title: String," in output
        assert "pub subtitle: Option<String>," in output
        assert '#[serde(skip_serializing_if = "Option::is_none")]' in output

    def test_numeric_types(self):
        """Test integer and number type mapping."""
        schema = {
            "title": "Metrics",
            "type": "object",
            "properties": {
                "count": {"type": "integer"},
                "ratio": {"type": "number"},
            },
            "required": ["count", "ratio"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        assert "pub count: i64," in output
        assert "pub ratio: f64," in output

    def test_documentation_generation(self):
        """Test that descriptions become doc comments."""
        schema = {
            "title": "AudioNode",
            "description": "Represents a node in the audio graph",
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "Unique identifier for the node",
                },
            },
            "required": ["id"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        assert "/// Represents a node in the audio graph" in output
        assert "/// Unique identifier for the node" in output

    def test_case_conversion_helpers(self):
        """Test the case conversion utility methods."""
        assert RustStructGenerator._to_pascal_case("user_profile") == "UserProfile"
        assert RustStructGenerator._to_pascal_case("audio-node") == "AudioNode"
        assert RustStructGenerator._to_pascal_case("User") == "User"

        assert RustStructGenerator._to_snake_case("userName") == "user_name"
        assert RustStructGenerator._to_snake_case("maxRetries") == "max_retries"
        assert RustStructGenerator._to_snake_case("id") == "id"

    def test_enum_handling(self):
        """Test that enums are handled as String with validation."""
        schema = {
            "title": "Status",
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["active", "inactive", "pending"],
                },
            },
            "required": ["state"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        # Should use String for now (validation at runtime)
        assert "pub state: String," in output

    def test_one_of_handling(self):
        """Test that oneOf uses serde_json::Value."""
        schema = {
            "title": "Event",
            "type": "object",
            "properties": {
                "payload": {
                    "oneOf": [
                        {"type": "string"},
                        {"type": "object"},
                    ]
                },
            },
            "required": ["payload"],
        }

        generator = RustStructGenerator(schema)
        output = generator.generate()

        assert "use serde_json;" in output
        assert "pub payload: serde_json::Value," in output


if __name__ == "__main__":
    pytest.main([__file__, "-v"])