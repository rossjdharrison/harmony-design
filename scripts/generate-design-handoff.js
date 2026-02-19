/**
 * @fileoverview Design Handoff Documentation Generator
 * Automatically generates documentation for designers from design tokens,
 * components, and implementation status.
 * 
 * @module scripts/generate-design-handoff
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Extracts design tokens from token files
 * @returns {Object} Parsed design tokens
 */
function extractDesignTokens() {
  const tokensDir = join(rootDir, 'tokens');
  const tokens = {
    colors: {},
    spacing: {},
    typography: {},
    motion: {},
    other: {}
  };

  if (!existsSync(tokensDir)) {
    return tokens;
  }

  const tokenFiles = readdirSync(tokensDir).filter(f => f.endsWith('.js') || f.endsWith('.json'));
  
  for (const file of tokenFiles) {
    try {
      const content = readFileSync(join(tokensDir, file), 'utf-8');
      const category = file.replace(/\.(js|json)$/, '');
      
      // Parse token values from content
      if (file.endsWith('.js')) {
        // Extract exported values
        const exportMatch = content.match(/export\s+(?:const|default)\s+(\w+)\s*=\s*({[\s\S]*?});/);
        if (exportMatch) {
          try {
            // Simple eval for token extraction (safe in build context)
            const tokenData = eval(`(${exportMatch[2]})`);
            tokens[category] = tokenData;
          } catch (e) {
            console.warn(`Could not parse tokens from ${file}:`, e.message);
          }
        }
      } else if (file.endsWith('.json')) {
        tokens[category] = JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Error reading token file ${file}:`, error.message);
    }
  }

  return tokens;
}

/**
 * Scans component directory for implemented components
 * @param {string} dir - Directory to scan
 * @returns {Array<Object>} Component metadata
 */
function scanComponents(dir) {
  const components = [];
  
  if (!existsSync(dir)) {
    return components;
  }

  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      components.push(...scanComponents(fullPath));
    } else if (entry.endsWith('.js') && !entry.includes('.test.')) {
      // Extract component metadata
      const content = readFileSync(fullPath, 'utf-8');
      const componentInfo = extractComponentInfo(content, fullPath);
      if (componentInfo) {
        components.push(componentInfo);
      }
    }
  }
  
  return components;
}

/**
 * Extracts metadata from component file
 * @param {string} content - File content
 * @param {string} filePath - Path to file
 * @returns {Object|null} Component metadata
 */
function extractComponentInfo(content, filePath) {
  // Check if it's a Web Component
  const customElementMatch = content.match(/customElements\.define\(['"]([^'"]+)['"]/);
  if (!customElementMatch) {
    return null;
  }

  const componentName = customElementMatch[1];
  
  // Extract JSDoc description
  const fileDocMatch = content.match(/\/\*\*\s*\n\s*\*\s*@fileoverview\s+([^\n]+)/);
  const description = fileDocMatch ? fileDocMatch[1].trim() : '';
  
  // Extract properties from observedAttributes
  const attributesMatch = content.match(/static\s+get\s+observedAttributes\(\)\s*{\s*return\s*\[([\s\S]*?)\]/);
  const attributes = [];
  if (attributesMatch) {
    const attrList = attributesMatch[1].match(/['"]([^'"]+)['"]/g);
    if (attrList) {
      attributes.push(...attrList.map(a => a.replace(/['"]/g, '')));
    }
  }
  
  // Extract events from content (look for dispatchEvent calls)
  const events = [];
  const eventMatches = content.matchAll(/dispatchEvent\(new\s+CustomEvent\(['"]([^'"]+)['"]/g);
  for (const match of eventMatches) {
    if (!events.includes(match[1])) {
      events.push(match[1]);
    }
  }
  
  // Extract CSS custom properties
  const cssVars = [];
  const cssVarMatches = content.matchAll(/var\((--[a-z-]+)\)/g);
  for (const match of cssVarMatches) {
    if (!cssVars.includes(match[1])) {
      cssVars.push(match[1]);
    }
  }
  
  return {
    name: componentName,
    description,
    filePath: relative(rootDir, filePath),
    attributes,
    events,
    cssVariables: cssVars,
    category: categorizeComponent(filePath)
  };
}

/**
 * Categorizes component based on file path
 * @param {string} filePath - Path to component file
 * @returns {string} Category name
 */
function categorizeComponent(filePath) {
  if (filePath.includes('primitives')) return 'Primitives';
  if (filePath.includes('controls')) return 'Controls';
  if (filePath.includes('organisms')) return 'Organisms';
  if (filePath.includes('composites')) return 'Composites';
  if (filePath.includes('templates')) return 'Templates';
  return 'Components';
}

/**
 * Generates color palette documentation
 * @param {Object} colors - Color tokens
 * @returns {string} Markdown content
 */
function generateColorDocs(colors) {
  let md = '## Color Palette\n\n';
  
  for (const [category, values] of Object.entries(colors)) {
    if (typeof values === 'object' && values !== null) {
      md += `### ${category}\n\n`;
      md += '| Token | Value | Preview |\n';
      md += '|-------|-------|----------|\n';
      
      for (const [name, value] of Object.entries(values)) {
        const preview = typeof value === 'string' && value.startsWith('#') 
          ? `<span style="display:inline-block;width:20px;height:20px;background:${value};border:1px solid #ccc;"></span>`
          : '';
        md += `| \`${name}\` | \`${value}\` | ${preview} |\n`;
      }
      md += '\n';
    }
  }
  
  return md;
}

/**
 * Generates component documentation
 * @param {Array<Object>} components - Component metadata
 * @returns {string} Markdown content
 */
function generateComponentDocs(components) {
  let md = '## Components\n\n';
  
  // Group by category
  const byCategory = {};
  for (const comp of components) {
    if (!byCategory[comp.category]) {
      byCategory[comp.category] = [];
    }
    byCategory[comp.category].push(comp);
  }
  
  for (const [category, comps] of Object.entries(byCategory)) {
    md += `### ${category}\n\n`;
    
    for (const comp of comps) {
      md += `#### \`<${comp.name}>\`\n\n`;
      
      if (comp.description) {
        md += `${comp.description}\n\n`;
      }
      
      md += `**File:** \`${comp.filePath}\`\n\n`;
      
      if (comp.attributes.length > 0) {
        md += '**Attributes:**\n\n';
        for (const attr of comp.attributes) {
          md += `- \`${attr}\`\n`;
        }
        md += '\n';
      }
      
      if (comp.events.length > 0) {
        md += '**Events:**\n\n';
        for (const event of comp.events) {
          md += `- \`${event}\`\n`;
        }
        md += '\n';
      }
      
      if (comp.cssVariables.length > 0) {
        md += '**CSS Variables:**\n\n';
        for (const cssVar of comp.cssVariables) {
          md += `- \`${cssVar}\`\n`;
        }
        md += '\n';
      }
    }
  }
  
  return md;
}

/**
 * Generates spacing documentation
 * @param {Object} spacing - Spacing tokens
 * @returns {string} Markdown content
 */
function generateSpacingDocs(spacing) {
  let md = '## Spacing System\n\n';
  
  if (Object.keys(spacing).length === 0) {
    md += 'No spacing tokens defined yet.\n\n';
    return md;
  }
  
  md += '| Token | Value |\n';
  md += '|-------|-------|\n';
  
  for (const [name, value] of Object.entries(spacing)) {
    md += `| \`${name}\` | \`${value}\` |\n`;
  }
  md += '\n';
  
  return md;
}

/**
 * Generates typography documentation
 * @param {Object} typography - Typography tokens
 * @returns {string} Markdown content
 */
function generateTypographyDocs(typography) {
  let md = '## Typography\n\n';
  
  if (Object.keys(typography).length === 0) {
    md += 'No typography tokens defined yet.\n\n';
    return md;
  }
  
  for (const [category, values] of Object.entries(typography)) {
    if (typeof values === 'object' && values !== null) {
      md += `### ${category}\n\n`;
      md += '| Token | Value |\n';
      md += '|-------|-------|\n';
      
      for (const [name, value] of Object.entries(values)) {
        md += `| \`${name}\` | \`${value}\` |\n`;
      }
      md += '\n';
    }
  }
  
  return md;
}

/**
 * Generates motion documentation
 * @param {Object} motion - Motion tokens
 * @returns {string} Markdown content
 */
function generateMotionDocs(motion) {
  let md = '## Motion & Animation\n\n';
  
  if (Object.keys(motion).length === 0) {
    md += 'See [Motion Documentation](../animations/README.md) for animation guidelines.\n\n';
    return md;
  }
  
  md += '| Token | Value |\n';
  md += '|-------|-------|\n';
  
  for (const [name, value] of Object.entries(motion)) {
    md += `| \`${name}\` | \`${value}\` |\n`;
  }
  md += '\n';
  
  return md;
}

/**
 * Main generator function
 */
function generateDesignHandoff() {
  console.log('🎨 Generating Design Handoff Documentation...\n');
  
  // Extract design tokens
  console.log('📊 Extracting design tokens...');
  const tokens = extractDesignTokens();
  
  // Scan components
  console.log('🔍 Scanning components...');
  const componentDirs = ['components', 'primitives', 'controls', 'organisms', 'composites', 'templates'];
  let allComponents = [];
  
  for (const dir of componentDirs) {
    const dirPath = join(rootDir, dir);
    if (existsSync(dirPath)) {
      allComponents.push(...scanComponents(dirPath));
    }
  }
  
  console.log(`   Found ${allComponents.length} components\n`);
  
  // Generate documentation
  console.log('📝 Generating documentation...');
  
  let markdown = `# Design Handoff Documentation

> Auto-generated documentation for designers
> Last updated: ${new Date().toISOString()}

This document provides an overview of the Harmony Design System implementation for design handoff and collaboration.

## Overview

This documentation is automatically generated from:
- Design tokens (colors, spacing, typography, motion)
- Implemented components (Web Components)
- CSS custom properties
- Component APIs (attributes, events)

`;

  // Add color documentation
  if (Object.keys(tokens.colors || {}).length > 0) {
    markdown += generateColorDocs(tokens.colors);
  }
  
  // Add spacing documentation
  if (Object.keys(tokens.spacing || {}).length > 0) {
    markdown += generateSpacingDocs(tokens.spacing);
  }
  
  // Add typography documentation
  if (Object.keys(tokens.typography || {}).length > 0) {
    markdown += generateTypographyDocs(tokens.typography);
  }
  
  // Add motion documentation
  markdown += generateMotionDocs(tokens.motion || {});
  
  // Add component documentation
  if (allComponents.length > 0) {
    markdown += generateComponentDocs(allComponents);
  }
  
  // Add usage guidelines
  markdown += `## Usage Guidelines

### For Designers

1. **Design Tokens**: Use the tokens defined above in your design files
2. **Component Library**: Reference implemented components when creating designs
3. **CSS Variables**: All tokens are available as CSS custom properties
4. **Naming Convention**: Follow the established naming patterns for consistency

### For Developers

1. **Token Usage**: Import tokens from \`tokens/\` directory
2. **Component Usage**: Use Web Components with documented attributes
3. **Event Handling**: Subscribe to component events via EventBus pattern
4. **Styling**: Use CSS custom properties for theming

### Design-to-Code Workflow

1. Designer creates/updates design in Figma
2. Design tokens are exported and synced to \`tokens/\`
3. Developer implements component using tokens
4. This documentation is regenerated automatically
5. Designer reviews implementation against design

## Related Documentation

- [Main Design System Documentation](../DESIGN_SYSTEM.md)
- [Component Development Guide](../DESIGN_SYSTEM.md#component-development)
- [Motion Guidelines](../animations/README.md)
- [EventBus Pattern](../DESIGN_SYSTEM.md#event-bus)

## Regenerating This Documentation

Run the following command to regenerate this documentation:

\`\`\`bash
node scripts/generate-design-handoff.js
\`\`\`

This should be run:
- After adding new components
- After updating design tokens
- Before design review meetings
- As part of the CI/CD pipeline

`;

  // Write output
  const outputDir = join(rootDir, 'docs');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = join(outputDir, 'DESIGN_HANDOFF.md');
  writeFileSync(outputPath, markdown, 'utf-8');
  
  console.log(`✅ Documentation generated: ${relative(rootDir, outputPath)}`);
  console.log(`   ${allComponents.length} components documented`);
  console.log(`   ${Object.keys(tokens).reduce((sum, key) => sum + Object.keys(tokens[key] || {}).length, 0)} tokens documented\n`);
  
  // Also generate JSON for programmatic access
  const jsonOutput = {
    generated: new Date().toISOString(),
    tokens,
    components: allComponents,
    stats: {
      totalComponents: allComponents.length,
      totalTokens: Object.keys(tokens).reduce((sum, key) => sum + Object.keys(tokens[key] || {}).length, 0),
      componentsByCategory: allComponents.reduce((acc, comp) => {
        acc[comp.category] = (acc[comp.category] || 0) + 1;
        return acc;
      }, {})
    }
  };
  
  const jsonPath = join(outputDir, 'design-handoff.json');
  writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf-8');
  
  console.log(`✅ JSON data generated: ${relative(rootDir, jsonPath)}\n`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDesignHandoff();
}

export { generateDesignHandoff, extractDesignTokens, scanComponents };