/**
 * @fileoverview Style Dictionary Build Script
 * Executes the token transformation pipeline
 * 
 * @see DESIGN_SYSTEM.md#design-tokens
 */

import { config, transforms, formats } from './config.js';

/**
 * Simple token dictionary builder
 * Mimics Style Dictionary's core functionality without npm dependencies
 */
class TokenDictionary {
  constructor(config) {
    this.config = config;
    this.tokens = {};
    this.allTokens = [];
  }
  
  /**
   * Load tokens from JSON source
   * @returns {Promise<void>}
   */
  async loadTokens() {
    const fs = await import('fs');
    const path = await import('path');
    
    for (const sourcePath of this.config.source) {
      const fullPath = path.resolve(sourcePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const tokens = JSON.parse(content);
      this.processTokens(tokens, []);
    }
  }
  
  /**
   * Process tokens recursively
   * @param {Object} obj - Token object
   * @param {string[]} path - Current path
   */
  processTokens(obj, path) {
    if (obj.value !== undefined) {
      // This is a token
      const token = {
        value: obj.value,
        type: obj.type,
        path: path,
        attributes: obj.attributes || {}
      };
      this.allTokens.push(token);
    } else {
      // This is a group
      for (const key in obj) {
        this.processTokens(obj[key], [...path, key]);
      }
    }
  }
  
  /**
   * Apply transforms to tokens
   * @param {Object} transforms - Transform definitions
   */
  applyTransforms(transforms) {
    for (const transformName in transforms) {
      const transform = transforms[transformName];
      
      this.allTokens = this.allTokens.map(token => {
        if (transform.type === 'value') {
          if (!transform.matcher || transform.matcher(token)) {
            return {
              ...token,
              value: transform.transformer(token)
            };
          }
        } else if (transform.type === 'name') {
          return {
            ...token,
            name: transform.transformer(token)
          };
        }
        return token;
      });
    }
  }
  
  /**
   * Build output files for all platforms
   * @param {Object} formats - Format definitions
   * @returns {Promise<void>}
   */
  async buildPlatforms(formats) {
    const fs = await import('fs');
    const path = await import('path');
    
    for (const platformName in this.config.platforms) {
      const platform = this.config.platforms[platformName];
      const buildPath = path.resolve(platform.buildPath);
      
      // Ensure build directory exists
      if (!fs.existsSync(buildPath)) {
        fs.mkdirSync(buildPath, { recursive: true });
      }
      
      for (const file of platform.files) {
        const format = formats[file.format];
        if (!format) {
          console.warn(`Format ${file.format} not found`);
          continue;
        }
        
        const output = format(this, file.options || {});
        const filePath = path.join(buildPath, file.destination);
        
        fs.writeFileSync(filePath, output, 'utf8');
        console.log(`✓ Generated ${filePath}`);
      }
    }
  }
}

/**
 * Main build function
 * @returns {Promise<void>}
 */
async function build() {
  console.log('🎨 Building design tokens...\n');
  
  try {
    const dictionary = new TokenDictionary(config);
    
    // Load tokens
    await dictionary.loadTokens();
    console.log(`Loaded ${dictionary.allTokens.length} tokens\n`);
    
    // Apply transforms
    dictionary.applyTransforms(transforms);
    console.log('Applied transforms\n');
    
    // Build platforms
    await dictionary.buildPlatforms(formats);
    
    console.log('\n✨ Token build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export { build };