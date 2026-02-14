# Composition Extraction

This document describes how composition relationships are extracted from design specifications and stored as graph edges.

## Overview

Composition relationships represent the structural hierarchy of components in the design system. When a component is composed of other components (e.g., a Button contains an Icon and Text), these relationships are captured as `composes_of` edges in the graph.

## Extraction Sources

The CompositionExtractor analyzes multiple sources within design specifications:

### 1. Explicit Compositions

Components can declare direct composition relationships:

```json
{
  "id": "button-component",
  "compositions": [
    {
      "childId": "icon-component",
      "componentType": "Icon",
      "role": "child",
      "required": false
    }
  ]
}
```

### 2. Component Children

Child components in the hierarchy are automatically extracted:

```json
{
  "id": "card-component",
  "children": [
    {
      "id": "header",
      "componentType": "CardHeader",
      "role": "header",
      "required": true
    }
  ]
}
```

### 3. Web Component Slots

Slot definitions indicate composition points:

```json
{
  "id": "dialog-component",
  "slots": [
    {
      "name": "header",
      "allowedComponents": ["DialogHeader"],
      "required": true
    }
  ]
}
```

### 4. CSS Shadow Parts

Parts that reference components are tracked:

```json
{
  "id": "input-component",
  "parts": [
    {
      "name": "label",
      "componentType": "Label"
    }
  ]
}
```

## Edge Metadata

Each `composes_of` edge includes metadata:

- `componentType`: Type of the child component
- `role`: Role within parent (child, slot, part, header, etc.)
- `required`: Whether the child is required
- `slotName`: Name of slot (if applicable)
- `partName`: Name of part (if applicable)
- `extractedAt`: Timestamp of extraction

## Events

### Published Events

- `CompositionsExtracted`: Successful extraction completed
- `CompositionExtraction.Failed`: Extraction failed with errors

### Subscribed Events

- `DesignSpecNode.Created`: Triggers extraction for new specs
- `DesignSpecNode.Updated`: Re-extracts compositions on updates
- `ExtractCompositions.Command`: Manual extraction trigger

## Validation

The CompositionValidator ensures:

1. **No Circular Dependencies**: Components cannot compose themselves directly or indirectly
2. **Depth Limits**: Composition depth stays within bounds (max 10 levels)
3. **Required Children**: Warnings for missing required components

## Usage Example

```javascript
import { CompositionExtractor } from './processors/composition_extractor.js';

const extractor = new CompositionExtractor();

// Query compositions
const compositions = await extractor.getCompositions('button-component');
console.log(compositions); // Array of composes_of edges

// Reverse lookup
const composedBy = await extractor.getComposedBy('icon-component');
console.log(composedBy); // What components use this icon
```

## Performance Considerations

- Extraction runs asynchronously to avoid blocking
- Existing edges are removed before re-extraction to prevent duplicates
- Validation checks are performed after extraction
- Deep composition hierarchies are limited to prevent performance issues

## Integration

See `harmony-design/DESIGN_SYSTEM.md#composition-relationships` for how this integrates with the overall design system architecture.