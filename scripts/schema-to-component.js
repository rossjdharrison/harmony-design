/**
 * @fileoverview Schema to Component Generator
 * Generates Web Components from JSON schema definitions
 * @module scripts/schema-to-component
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Component schema structure
 * @typedef {Object} ComponentSchema
 * @property {string} name - Component name (kebab-case)
 * @property {string} description - Component description
 * @property {Array<PropertySchema>} properties - Component properties
 * @property {Array<EventSchema>} events - Component events
 * @property {Array<SlotSchema>} slots - Component slots
 * @property {Object} styles - Component styling configuration
 * @property {string} template - Component template type
 */

/**
 * Property schema structure
 * @typedef {Object} PropertySchema
 * @property {string} name - Property name
 * @property {string} type - Property type (string, number, boolean, object, array)
 * @property {*} default - Default value
 * @property {boolean} required - Is required
 * @property {string} description - Property description
 * @property {boolean} attribute - Should reflect to attribute
 */

/**
 * Event schema structure
 * @typedef {Object} EventSchema
 * @property {string} name - Event name
 * @property {string} description - Event description
 * @property {Object} detail - Event detail payload structure
 */

/**
 * Slot schema structure
 * @typedef {Object} SlotSchema
 * @property {string} name - Slot name (empty for default)
 * @property {string} description - Slot description
 */

/**
 * Validates a component schema
 * @param {ComponentSchema} schema - Schema to validate
 * @returns {Array<string>} Validation errors (empty if valid)
 */
function validateSchema(schema) {
  const errors = [];

  if (!schema.name || typeof schema.name !== 'string') {
    errors.push('Schema must have a valid name');
  } else if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(schema.name)) {
    errors.push('Component name must be kebab-case with at least one hyphen');
  }

  if (!schema.description || typeof schema.description !== 'string') {
    errors.push('Schema must have a description');
  }

  if (schema.properties && !Array.isArray(schema.properties)) {
    errors.push('Properties must be an array');
  }

  if (schema.events && !Array.isArray(schema.events)) {
    errors.push('Events must be an array');
  }

  if (schema.slots && !Array.isArray(schema.slots)) {
    errors.push('Slots must be an array');
  }

  return errors;
}

/**
 * Converts kebab-case to PascalCase
 * @param {string} str - Kebab-case string
 * @returns {string} PascalCase string
 */
function kebabToPascal(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Converts kebab-case to camelCase
 * @param {string} str - Kebab-case string
 * @returns {string} camelCase string
 */
function kebabToCamel(str) {
  const pascal = kebabToPascal(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Generates property getters and setters
 * @param {Array<PropertySchema>} properties - Component properties
 * @returns {string} Generated code
 */
function generateProperties(properties = []) {
  return properties.map(prop => {
    const camelName = kebabToCamel(prop.name);
    const attrName = prop.name;
    const defaultValue = JSON.stringify(prop.default);

    return `
  /**
   * ${prop.description || `${prop.name} property`}
   * @type {${prop.type}}
   */
  get ${camelName}() {
    return this._${camelName} ?? ${defaultValue};
  }

  set ${camelName}(value) {
    const oldValue = this._${camelName};
    this._${camelName} = value;
    ${prop.attribute ? `
    if (value !== null && value !== undefined) {
      this.setAttribute('${attrName}', String(value));
    } else {
      this.removeAttribute('${attrName}');
    }` : ''}
    this._propertyChanged('${camelName}', oldValue, value);
  }`;
  }).join('\n');
}

/**
 * Generates observed attributes list
 * @param {Array<PropertySchema>} properties - Component properties
 * @returns {string} Generated code
 */
function generateObservedAttributes(properties = []) {
  const attrs = properties
    .filter(prop => prop.attribute)
    .map(prop => `'${prop.name}'`);
  
  return `  static get observedAttributes() {
    return [${attrs.join(', ')}];
  }`;
}

/**
 * Generates attribute changed callback
 * @param {Array<PropertySchema>} properties - Component properties
 * @returns {string} Generated code
 */
function generateAttributeChangedCallback(properties = []) {
  const attributeProps = properties.filter(prop => prop.attribute);
  
  if (attributeProps.length === 0) {
    return '';
  }

  const cases = attributeProps.map(prop => {
    const camelName = kebabToCamel(prop.name);
    let conversion = 'newValue';
    
    if (prop.type === 'number') {
      conversion = 'Number(newValue)';
    } else if (prop.type === 'boolean') {
      conversion = 'newValue !== null';
    } else if (prop.type === 'object' || prop.type === 'array') {
      conversion = 'JSON.parse(newValue)';
    }

    return `      case '${prop.name}':
        this._${camelName} = ${conversion};
        break;`;
  }).join('\n');

  return `
  /**
   * Called when observed attributes change
   * @param {string} name - Attribute name
   * @param {string} oldValue - Old value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
${cases}
    }
    this._render();
  }`;
}

/**
 * Generates event emitter methods
 * @param {Array<EventSchema>} events - Component events
 * @returns {string} Generated code
 */
function generateEventEmitters(events = []) {
  return events.map(event => {
    const methodName = `_emit${kebabToPascal(event.name)}`;
    
    return `
  /**
   * Emits ${event.name} event
   * ${event.description || ''}
   * @param {Object} detail - Event detail
   */
  ${methodName}(detail = {}) {
    this.dispatchEvent(new CustomEvent('${event.name}', {
      bubbles: true,
      composed: true,
      detail
    }));
  }`;
  }).join('\n');
}

/**
 * Generates component template
 * @param {ComponentSchema} schema - Component schema
 * @returns {string} Generated template code
 */
function generateTemplate(schema) {
  const slots = schema.slots || [];
  const slotElements = slots.map(slot => {
    if (!slot.name) {
      return `<slot></slot>`;
    }
    return `<slot name="${slot.name}"></slot>`;
  }).join('\n      ');

  return `
  /**
   * Generates component template
   * @returns {string} HTML template
   */
  _getTemplate() {
    return \`
      <div class="${schema.name}">
        ${slotElements || '<slot></slot>'}
      </div>
    \`;
  }`;
}

/**
 * Generates component styles
 * @param {ComponentSchema} schema - Component schema
 * @returns {string} Generated styles code
 */
function generateStyles(schema) {
  const baseStyles = schema.styles?.base || '';
  
  return `
  /**
   * Generates component styles
   * @returns {string} CSS styles
   */
  _getStyles() {
    return \`
      :host {
        display: block;
        box-sizing: border-box;
      }

      * {
        box-sizing: border-box;
      }

      .${schema.name} {
        ${baseStyles}
      }
    \`;
  }`;
}

/**
 * Generates complete component code
 * @param {ComponentSchema} schema - Component schema
 * @returns {string} Generated component code
 */
function generateComponent(schema) {
  const className = kebabToPascal(schema.name);
  const properties = schema.properties || [];
  const events = schema.events || [];

  return `/**
 * @fileoverview ${schema.description}
 * Generated from schema: ${schema.name}
 * @module components/${schema.name}
 */

/**
 * ${className} Web Component
 * ${schema.description}
 * 
 * @element ${schema.name}
 * @fires {CustomEvent} ${events.map(e => e.name).join(', ') || 'none'}
 * 
 * @example
 * <${schema.name}></${schema.name}>
 */
export class ${className} extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    ${properties.map(prop => `this._${kebabToCamel(prop.name)} = ${JSON.stringify(prop.default)};`).join('\n    ')}
    this._initialized = false;
  }

  /**
   * Called when element is connected to DOM
   */
  connectedCallback() {
    if (!this._initialized) {
      this._render();
      this._initialized = true;
    }
  }

  /**
   * Called when element is disconnected from DOM
   */
  disconnectedCallback() {
    // Cleanup if needed
  }
${generateObservedAttributes(properties)}
${generateAttributeChangedCallback(properties)}
${generateProperties(properties)}
${generateEventEmitters(events)}
${generateTemplate(schema)}
${generateStyles(schema)}

  /**
   * Renders the component
   */
  _render() {
    this.shadowRoot.innerHTML = \`
      <style>\${this._getStyles()}</style>
      \${this._getTemplate()}
    \`;
  }

  /**
   * Called when a property changes
   * @param {string} name - Property name
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   */
  _propertyChanged(name, oldValue, newValue) {
    if (this._initialized && oldValue !== newValue) {
      this._render();
    }
  }
}

// Register the custom element
if (!customElements.get('${schema.name}')) {
  customElements.define('${schema.name}', ${className});
}
`;
}

/**
 * Generates component documentation
 * @param {ComponentSchema} schema - Component schema
 * @returns {string} Generated documentation
 */
function generateDocumentation(schema) {
  const properties = schema.properties || [];
  const events = schema.events || [];
  const slots = schema.slots || [];

  let doc = `# ${kebabToPascal(schema.name)}

${schema.description}

## Usage

\`\`\`html
<${schema.name}></${schema.name}>
\`\`\`

`;

  if (properties.length > 0) {
    doc += `## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
`;
    properties.forEach(prop => {
      doc += `| \`${kebabToCamel(prop.name)}\` | \`${prop.type}\` | \`${JSON.stringify(prop.default)}\` | ${prop.description || ''} |\n`;
    });
    doc += '\n';
  }

  if (events.length > 0) {
    doc += `## Events

| Event | Description | Detail |
|-------|-------------|--------|
`;
    events.forEach(event => {
      doc += `| \`${event.name}\` | ${event.description || ''} | \`${JSON.stringify(event.detail || {})}\` |\n`;
    });
    doc += '\n';
  }

  if (slots.length > 0) {
    doc += `## Slots

| Slot | Description |
|------|-------------|
`;
    slots.forEach(slot => {
      doc += `| \`${slot.name || 'default'}\` | ${slot.description || ''} |\n`;
    });
    doc += '\n';
  }

  doc += `## Example

\`\`\`html
<${schema.name}${properties.map(p => ` ${p.name}="${p.default}"`).join('')}>
  ${slots.length > 0 ? slots.map(s => s.name ? `<div slot="${s.name}">Content</div>` : 'Content').join('\n  ') : 'Content'}
</${schema.name}>
\`\`\`

## Implementation

See [${schema.name}.js](../components/${schema.name}.js)
`;

  return doc;
}

/**
 * Generates component from schema file
 * @param {string} schemaPath - Path to schema JSON file
 * @param {string} outputDir - Output directory for generated component
 * @returns {Promise<void>}
 */
export async function generateFromSchema(schemaPath, outputDir = 'components') {
  try {
    // Read and parse schema
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    // Validate schema
    const errors = validateSchema(schema);
    if (errors.length > 0) {
      throw new Error(`Schema validation failed:\n${errors.join('\n')}`);
    }

    // Ensure output directory exists
    const componentDir = path.join(process.cwd(), outputDir);
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    // Generate component code
    const componentCode = generateComponent(schema);
    const componentPath = path.join(componentDir, `${schema.name}.js`);
    fs.writeFileSync(componentPath, componentCode, 'utf-8');

    // Generate documentation
    const docsDir = path.join(process.cwd(), 'docs', 'components');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    const docCode = generateDocumentation(schema);
    const docPath = path.join(docsDir, `${schema.name}.md`);
    fs.writeFileSync(docPath, docCode, 'utf-8');

    console.log(`✓ Generated component: ${schema.name}`);
    console.log(`  Component: ${componentPath}`);
    console.log(`  Documentation: ${docPath}`);

    return {
      component: componentPath,
      documentation: docPath,
      schema: schema
    };
  } catch (error) {
    console.error(`✗ Failed to generate component: ${error.message}`);
    throw error;
  }
}

/**
 * Generates components from all schemas in a directory
 * @param {string} schemasDir - Directory containing schema files
 * @param {string} outputDir - Output directory for generated components
 * @returns {Promise<Array>}
 */
export async function generateFromDirectory(schemasDir = 'harmony-schemas/components', outputDir = 'components') {
  const schemasPath = path.join(process.cwd(), schemasDir);
  
  if (!fs.existsSync(schemasPath)) {
    throw new Error(`Schemas directory not found: ${schemasPath}`);
  }

  const schemaFiles = fs.readdirSync(schemasPath)
    .filter(file => file.endsWith('.json'));

  if (schemaFiles.length === 0) {
    console.log('No schema files found');
    return [];
  }

  const results = [];
  for (const file of schemaFiles) {
    const schemaPath = path.join(schemasPath, file);
    try {
      const result = await generateFromSchema(schemaPath, outputDir);
      results.push(result);
    } catch (error) {
      console.error(`Failed to process ${file}:`, error.message);
    }
  }

  return results;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Schema to Component Generator

Usage:
  node schema-to-component.js <schema-file>           Generate from single schema
  node schema-to-component.js --dir <schemas-dir>     Generate from all schemas in directory

Options:
  --output, -o <dir>    Output directory (default: components)
  --help, -h            Show this help

Examples:
  node schema-to-component.js harmony-schemas/components/button.json
  node schema-to-component.js --dir harmony-schemas/components -o components
    `);
    process.exit(0);
  }

  let schemaPath = null;
  let schemasDir = null;
  let outputDir = 'components';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir') {
      schemasDir = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      outputDir = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      process.exit(0);
    } else if (!args[i].startsWith('--')) {
      schemaPath = args[i];
    }
  }

  try {
    if (schemasDir) {
      const results = await generateFromDirectory(schemasDir, outputDir);
      console.log(`\n✓ Generated ${results.length} components`);
    } else if (schemaPath) {
      await generateFromSchema(schemaPath, outputDir);
    } else {
      console.error('Error: Specify either a schema file or --dir option');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}