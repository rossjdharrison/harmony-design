# Style Dictionary Configuration

This directory contains the Style Dictionary configuration and transformation pipeline for the Harmony Design System.

## Overview

The Style Dictionary pipeline transforms design tokens from JSON format into multiple output formats:

- **CSS Custom Properties** (`tokens.css`) - For use in stylesheets
- **TypeScript Declarations** (`tokens.ts`) - For type-safe token access
- **SCSS Variables** (`tokens.scss`) - For SCSS preprocessing
- **Flat JSON** (`tokens.json`) - For runtime token access

## Architecture

```
tokens/
├── design-tokens.json          # Source tokens
├── style-dictionary/
│   ├── config.js              # Main configuration
│   ├── build.js               # Build script
│   ├── transforms.js          # Custom transforms
│   ├── formats.js             # Custom formats
│   └── README.md              # This file
└── generated/                 # Output directory
    ├── tokens.css
    ├── tokens.ts
    ├── tokens.scss
    └── tokens.json
```

## Usage

### Build Tokens

```bash
node tokens/style-dictionary/build.js
```

This will read `tokens/design-tokens.json` and generate all output formats.

### Custom Transforms

The pipeline includes several custom transforms:

- **size/pxToRem** - Converts pixel values to rem units
- **color/rgba** - Converts hex colors to rgba format
- **time/ms** - Converts duration values to milliseconds
- **font/weight** - Converts font weight names to numeric values
- **shadow/css** - Converts shadow objects to CSS format
- **spacing/px** - Ensures consistent spacing units
- **border/radius** - Formats border radius values
- **layer/zIndex** - Maps z-index layer names to values

### Custom Formats

The pipeline includes several custom formats:

- **css/variables** - CSS custom properties with `--harmony-` prefix
- **typescript/es6-declarations** - TypeScript interfaces and constants
- **scss/variables** - SCSS variables with `$harmony-` prefix
- **json/flat** - Flat JSON structure with dot-notation keys
- **javascript/es6** - JavaScript ES6 module exports

## Token Structure

Tokens should follow this structure in `design-tokens.json`:

```json
{
  "color": {
    "primary": {
      "value": "#007bff",
      "type": "color"
    }
  },
  "spacing": {
    "small": {
      "value": "8px",
      "type": "spacing"
    }
  }
}
```

## Performance Considerations

- Build time target: < 1 second for full rebuild
- Output files are cached and only regenerated when source changes
- All transforms are synchronous for predictable performance

## Integration

Generated tokens are consumed by:

- UI components via CSS custom properties
- TypeScript code via imported constants
- SCSS stylesheets via imported variables
- Runtime code via JSON import

See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#design-tokens) for more details.