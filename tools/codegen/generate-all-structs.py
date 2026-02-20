#!/usr/bin/env python3
"""
Batch generate Rust structs from all JSON schemas.

Scans the schemas/ directory and generates corresponding Rust files.
Part of the automated codegen pipeline.

Usage:
    python generate-all-structs.py
"""

import json
import sys
from pathlib import Path
from rust_struct_generator import RustStructGenerator


def generate_all_structs():
    """Generate Rust structs for all schemas in schemas/ directory."""
    project_root = Path(__file__).parent.parent.parent
    schemas_dir = project_root / "schemas"
    output_dir = project_root / "harmony-graph" / "src" / "generated"

    if not schemas_dir.exists():
        print(f"Error: Schemas directory not found: {schemas_dir}")
        return 1

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Find all schema files
    schema_files = list(schemas_dir.glob("*.schema.json"))

    if not schema_files:
        print(f"Warning: No schema files found in {schemas_dir}")
        return 0

    print(f"Found {len(schema_files)} schema file(s)")

    generated_count = 0
    failed_count = 0

    for schema_path in schema_files:
        print(f"\nProcessing: {schema_path.name}")

        try:
            # Read schema
            with open(schema_path, "r", encoding="utf-8") as f:
                schema = json.load(f)

            # Generate Rust code
            generator = RustStructGenerator(schema)
            rust_code = generator.generate()

            # Determine output filename
            # domain.schema.json -> domain_generated.rs
            output_name = schema_path.stem.replace(".schema", "_generated") + ".rs"
            output_path = output_dir / output_name

            # Write output
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(rust_code)

            print(f"  ✓ Generated: {output_path.relative_to(project_root)}")
            generated_count += 1

        except Exception as e:
            print(f"  ✗ Failed: {e}")
            failed_count += 1

    # Generate mod.rs to expose all generated modules
    mod_rs_path = output_dir / "mod.rs"
    with open(mod_rs_path, "w", encoding="utf-8") as f:
        f.write("// Generated module exports\n")
        f.write("// DO NOT EDIT MANUALLY\n\n")
        for schema_path in schema_files:
            module_name = schema_path.stem.replace(".schema", "_generated")
            f.write(f"pub mod {module_name};\n")

    print(f"\n✓ Generated mod.rs: {mod_rs_path.relative_to(project_root)}")

    # Summary
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Generated: {generated_count}")
    print(f"  Failed: {failed_count}")
    print(f"  Output directory: {output_dir.relative_to(project_root)}")
    print(f"{'='*60}")

    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(generate_all_structs())