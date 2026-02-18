# Token Documentation

This directory contains interactive documentation for the Harmony Design System token catalog.

## Files

- **token-catalog.html** - Interactive visual catalog of all design tokens
- **token-catalog.js** - Token catalog rendering and interaction logic
- **token-usage-guide.md** - Comprehensive usage guide for design tokens

## Token Catalog Features

### Visual Preview
Each token is displayed with a visual representation:
- **Colors**: Color swatches showing the actual color value
- **Typography**: Sample text rendered with the font properties
- **Spacing**: Visual boxes showing the spacing scale
- **Borders**: Boxes demonstrating border styles and radius
- **Shadows**: Elements with applied shadow effects
- **Animations**: Interactive elements showing timing and duration

### Usage Examples
Each token card includes:
- Token name (CSS custom property)
- Current value
- CSS usage examples
- JavaScript usage with `useToken()` hook

### Interactive Features
- **Search**: Filter tokens by name
- **Category Navigation**: Browse by token category
- **Hover Interactions**: See animation tokens in action

## Viewing the Catalog

Open `token-catalog.html` in a browser:

```bash
# Using a local server
python -m http.server 8000
# Navigate to http://localhost:8000/docs/tokens/token-catalog.html
```

## Token Categories

1. **Colors** - Semantic color tokens for UI elements
2. **Typography** - Font families, sizes, weights, line heights
3. **Spacing** - Consistent spacing scale
4. **Borders** - Border widths and radius values
5. **Shadows** - Box shadow presets
6. **Animations** - Timing and duration tokens

## Integration

The token catalog automatically reads from:
- `styles/design-tokens.css` - CSS custom properties
- Runtime computed styles - Current token values

## Usage in Components

```javascript
// Using tokens in JavaScript
import { useToken } from '../../core/token-hook.js';

const primaryColor = useToken('color-primary');
const baseSpacing = useToken('spacing-base');
```

```css
/* Using tokens in CSS */
.my-component {
  background: var(--color-background-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
}
```

## Related Documentation

- Main documentation: `DESIGN_SYSTEM.md#token-system`
- Token provider: `core/token-provider.js`
- Token hook: `core/token-hook.js`
- Token schemas: `core/validation/token-schemas.js`