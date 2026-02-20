
#### Transform3D

**Purpose**: Represents a 3D transformation in space with position, rotation, and scale components.

**When to Use**: Use `Transform3D` semantic type for parameters that control object placement, orientation, and size in 3D space. Common for 3D audio sources, spatial audio listeners, and visual 3D objects.

**Structure**:
- **position**: 3D coordinates (x, y, z) in specified units
- **rotation**: Orientation as Euler angles or quaternion
  - Euler: x, y, z angles in radians with rotation order (XYZ, YXZ, etc.)
  - Quaternion: x, y, z, w components for gimbal-lock-free rotation
- **scale**: Non-uniform scaling factors (x, y, z), default 1.0
- **unit**: Measurement unit (meters, centimeters, millimeters, inches, feet)

**Control Mapping**: Maps to a 3D transform editor with position sliders, rotation gizmo, and scale controls. UI provides both numeric input and visual manipulation.

**Example**:
``````json
{
  'id': 'listener_transform',
  'name': 'Listener Position',
  'semantic_type': 'Transform3D',
  'position': { 'x': 0.0, 'y': 1.7, 'z': 0.0 },
  'rotation': {
    'type': 'euler',
    'x': 0.0,
    'y': 0.0,
    'z': 0.0,
    'order': 'XYZ'
  },
  'scale': { 'x': 1.0, 'y': 1.0, 'z': 1.0 },
  'unit': 'meters'
}
``````

**Schema**: [harmony-schemas/schemas/transform3d.json](./harmony-schemas/schemas/transform3d.json)

**Related**: See Scene3D for complete 3D scene configuration.

