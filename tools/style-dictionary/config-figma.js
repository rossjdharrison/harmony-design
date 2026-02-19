/**
 * @fileoverview Style Dictionary Configuration for Figma Export
 * @module tools/style-dictionary/config-figma
 * 
 * Configuration file for exporting design tokens to Figma format.
 * This can be used with Style Dictionary CLI or programmatically.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#style-dictionary-figma-transform}
 */

import { registerFigmaFormat } from './figma-transform.js';

/**
 * Creates Style Dictionary configuration for Figma export
 * @param {Object} StyleDictionary - Style Dictionary instance
 * @returns {Object} Configuration object
 */
export function createFigmaConfig(StyleDictionary) {
  // Register the custom Figma format
  registerFigmaFormat(StyleDictionary);
  
  return {
    source: ['tokens/**/*.json'],
    platforms: {
      figma: {
        transformGroup: 'js',
        buildPath: 'dist/tokens/',
        files: [
          {
            destination: 'figma-tokens.json',
            format: 'figma/json',
            options: {
              showFileHeader: true
            }
          }
        ]
      }
    }
  };
}

/**
 * Example usage configuration
 * This demonstrates how to use the Figma transform
 */
export const exampleConfig = {
  source: ['tokens/design-tokens.json'],
  platforms: {
    figma: {
      transformGroup: 'js',
      buildPath: 'dist/tokens/',
      files: [
        {
          destination: 'figma-tokens.json',
          format: 'figma/json'
        }
      ]
    },
    // Can be combined with other platforms
    css: {
      transformGroup: 'css',
      buildPath: 'dist/tokens/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables'
        }
      ]
    }
  }
};