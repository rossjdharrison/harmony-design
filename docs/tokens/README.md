# Design Tokens

Design tokens are the visual design atoms of the Harmony Design System. They store visual design decisions such as colors, typography, spacing, and more.

## Token Categories

### Colors

#### Primary Scale
The primary color scale (50-950) provides 11 shades for the main brand color. Use these for:
- Primary actions and CTAs (500-600)
- Hover states (400-500)
- Active/pressed states (600-700)
- Backgrounds and surfaces (50-100)
- Text on light backgrounds (700-900)

See: [tokens/colors.json](../../tokens/colors.json)

#### Neutral/Gray Scale
The neutral scale (50-950) provides 11 shades for achromatic colors. Use these for:
- Surface backgrounds (50-100)
- Borders and dividers (200-300)
- Disabled states (300-400)
- Secondary and body text (500-700)
- Primary text and headings (800-950)
- Maximum contrast elements (950)

The neutral scale is critical for establishing visual hierarchy and ensuring proper contrast ratios for accessibility.

See: [tokens/colors.json](../../tokens/colors.json)

## Token Structure

Tokens follow the Design Tokens Community Group (DTCG) format:

```json
{
  "tokenName": {
    "value": "actual-value",
    "type": "token-type",
    "description": "human-readable description"
  }
}
```

## Usage

### In JavaScript/Web Components

```javascript
import { getToken } from '../../core/token-hook.js';

// Access color tokens
const primaryColor = getToken('color.primary.500');
const neutralText = getToken('color.neutral.700');
```

### In CSS Custom Properties

Tokens are automatically transformed to CSS custom properties:

```css
.my-component {
  background-color: var(--color-primary-500);
  color: var(--color-neutral-900);
  border-color: var(--color-neutral-200);
}
```

## Token Transformation Pipeline

1. Source tokens defined in JSON (DTCG format)
2. Style Dictionary transforms tokens to multiple formats
3. CSS custom properties generated for runtime
4. TypeScript declarations generated for type safety
5. Documentation automatically generated

See: [scripts/build-tokens.js](../../scripts/build-tokens.js)

## Visual Catalog

Interactive token catalog with live previews:
- [Token Catalog](./token-catalog.html)

## Token-Component Matrix

Documentation showing which components use which tokens:
- [Token-Component Matrix](./token-component-matrix.js)