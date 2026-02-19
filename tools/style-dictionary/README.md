/**
 * @fileoverview Style Dictionary Tools Documentation
 * @module tools/style-dictionary
 * 
 * This directory contains Style Dictionary transforms and configurations
 * for converting design tokens into various formats.
 * 
 * ## Available Transforms
 * 
 * ### Figma Transform
 * Converts design tokens to Figma-compatible JSON format.
 * See: figma-transform.js
 * 
 * ## Usage
 * 
 * ### Programmatic Usage
 * ```javascript
 * import StyleDictionary from 'style-dictionary';
 * import { createFigmaConfig } from './config-figma.js';
 * 
 * const config = createFigmaConfig(StyleDictionary);
 * const sd = StyleDictionary.extend(config);
 * sd.buildAllPlatforms();
 * ```
 * 
 * ### CLI Usage
 * ```bash
 * # Using the config file
 * style-dictionary build --config tools/style-dictionary/config-figma.js
 * ```
 * 
 * ## Token Format Requirements
 * 
 * ### Colors
 * - Supports hex (#RRGGBB, #RRGGBBAA)
 * - Supports rgba(r, g, b, a)
 * - Converts to Figma RGB format (0-1 range)
 * 
 * ### Typography
 * - fontFamily: string
 * - fontSize: string with 'px' or number
 * - fontWeight: string or number
 * - lineHeight: string or number
 * - letterSpacing: string with 'px' or number
 * 
 * ### Spacing
 * - Supports pixel values ('16px' or 16)
 * - Converts to numeric values
 * 
 * ### Shadows
 * - Supports CSS shadow strings
 * - Supports object format with x, y, blur, spread, color
 * 
 * ### Border Radius
 * - Supports pixel values
 * - Converts to numeric values
 * 
 * ## Testing
 * 
 * Run tests in browser:
 * ```bash
 * # Open figma-transform.test.html in Chrome
 * ```
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#style-dictionary-figma-transform}
 */