#!/usr/bin/env node

/**
 * Component Scaffold CLI
 * Generates component boilerplate from templates
 * 
 * Usage:
 *   node tools/scaffold-component.js <component-name> [options]
 * 
 * Options:
 *   --type <type>       Component type: primitive, molecule, organism (default: primitive)
 *   --category <cat>    Category folder (default: none)
 *   --with-styles       Include separate CSS file
 *   --with-story        Include Storybook story file
 *   --with-test         Include test file
 * 
 * @module tools/scaffold-component
 */

const fs = require('fs');
const path = require('path');

/**
 * Configuration for component scaffolding
 * @typedef {Object} ScaffoldConfig
 * @property {string} name - Component name (kebab-case)
 * @property {string} type - Component type (primitive/molecule/organism)
 * @property {string|null} category - Category subfolder
 * @property {boolean} withStyles - Generate separate CSS file
 * @property {boolean} withStory - Generate Storybook story
 * @property {boolean} withTest - Generate test file
 */

/**
 * Parse command line arguments
 * @returns {ScaffoldConfig}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('Error: Component name is required');
    console.log('\nUsage: node tools/scaffold-component.js <component-name> [options]');
    console.log('\nOptions:');
    console.log('  --type <type>       Component type: primitive, molecule, organism (default: primitive)');
    console.log('  --category <cat>    Category folder (default: none)');
    console.log('  --with-styles       Include separate CSS file');
    console.log('  --with-story        Include Storybook story file');
    console.log('  --with-test         Include test file');
    process.exit(1);
  }

  const config = {
    name: args[0],
    type: 'primitive',
    category: null,
    withStyles: false,
    withStory: false,
    withTest: false
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--type' && args[i + 1]) {
      config.type = args[++i];
    } else if (arg === '--category' && args[i + 1]) {
      config.category = args[++i];
    } else if (arg === '--with-styles') {
      config.withStyles = true;
    } else if (arg === '--with-story') {
      config.withStory = true;
    } else if (arg === '--with-test') {
      config.withTest = true;
    }
  }

  // Validate component name (must be kebab-case)
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(config.name)) {
    console.error(`Error: Component name must be in kebab-case (e.g., "my-component")`);
    process.exit(1);
  }

  // Validate type
  if (!['primitive', 'molecule', 'organism'].includes(config.type)) {
    console.error(`Error: Invalid type "${config.type}". Must be: primitive, molecule, or organism`);
    process.exit(1);
  }

  return config;
}

/**
 * Convert kebab-case to PascalCase
 * @param {string} str - Kebab-case string
 * @returns {string} PascalCase string
 */
function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Get target directory for component
 * @param {ScaffoldConfig} config - Scaffold configuration
 * @returns {string} Target directory path
 */
function getTargetDirectory(config) {
  const baseDir = config.type === 'primitive' ? 'primitives' : 
                  config.type === 'molecule' ? 'components' : 
                  'organisms';
  
  if (config.category) {
    return path.join(baseDir, config.category, config.name);
  }
  
  return path.join(baseDir, config.name);
}

/**
 * Generate component JavaScript file content
 * @param {ScaffoldConfig} config - Scaffold configuration
 * @returns {string} Component file content
 */
function generateComponentFile(config) {
  const className = toPascalCase(config.name);
  const tagName = `harmony-${config.name}`;
  
  return `/**
 * ${className} Component
 * 
 * @component ${tagName}
 * @slot default - Main content slot
 * @fires ${config.name}:change - Emitted when component state changes
 * 
 * @example
 * <${tagName}>
 *   Content here
 * </${tagName}>
 */
export class ${className} extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @returns {string[]} Attribute names to observe
   */
  static get observedAttributes() {
    return ['disabled', 'value'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
  }

  /**
   * Called when element is connected to DOM
   */
  connectedCallback() {
    if (!this._initialized) {
      this.render();
      this.attachEventListeners();
      this._initialized = true;
    }
  }

  /**
   * Called when element is disconnected from DOM
   */
  disconnectedCallback() {
    this.removeEventListeners();
  }

  /**
   * Called when observed attribute changes
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'disabled':
        this.handleDisabledChange(newValue !== null);
        break;
      case 'value':
        this.handleValueChange(newValue);
        break;
    }
  }

  /**
   * Render component template
   */
  render() {
    const disabled = this.hasAttribute('disabled');
    const value = this.getAttribute('value') || '';

    this.shadowRoot.innerHTML = \`
      <style>
        :host {
          display: block;
          box-sizing: border-box;
        }

        :host([hidden]) {
          display: none;
        }

        :host([disabled]) {
          opacity: 0.5;
          pointer-events: none;
        }

        .container {
          padding: var(--spacing-md, 1rem);
          background: var(--surface-primary, #ffffff);
          border: 1px solid var(--border-primary, #e0e0e0);
          border-radius: var(--radius-md, 0.5rem);
        }

        .content {
          color: var(--text-primary, #000000);
          font-family: var(--font-family-base, system-ui);
          font-size: var(--font-size-base, 1rem);
        }
      </style>

      <div class="container" part="container">
        <div class="content" part="content">
          <slot></slot>
        </div>
      </div>
    \`;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Add event listeners here
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    // Remove event listeners here
  }

  /**
   * Handle disabled state change
   * @param {boolean} isDisabled - New disabled state
   */
  handleDisabledChange(isDisabled) {
    // Handle disabled state
  }

  /**
   * Handle value change
   * @param {string|null} newValue - New value
   */
  handleValueChange(newValue) {
    // Handle value change
  }

  /**
   * Emit custom event
   * @param {string} eventName - Event name (without component prefix)
   * @param {*} detail - Event detail data
   */
  emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(\`${config.name}:\${eventName}\`, {
      detail,
      bubbles: true,
      composed: true
    }));
  }

  // Public API

  /**
   * Get component value
   * @returns {string} Current value
   */
  get value() {
    return this.getAttribute('value') || '';
  }

  /**
   * Set component value
   * @param {string} val - New value
   */
  set value(val) {
    this.setAttribute('value', val);
  }

  /**
   * Get disabled state
   * @returns {boolean} Whether component is disabled
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  /**
   * Set disabled state
   * @param {boolean} val - New disabled state
   */
  set disabled(val) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }
}

// Register custom element
if (!customElements.get('${tagName}')) {
  customElements.define('${tagName}', ${className});
}
`;
}

/**
 * Generate separate CSS file content
 * @param {ScaffoldConfig} config - Scaffold configuration
 * @returns {string} CSS file content
 */
function generateStylesFile(config) {
  return `:host {
  display: block;
  box-sizing: border-box;
}

:host([hidden]) {
  display: none;
}

:host([disabled]) {
  opacity: 0.5;
  pointer-events: none;
}

.container {
  padding: var(--spacing-md, 1rem);
  background: var(--surface-primary, #ffffff);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: var(--radius-md, 0.5rem);
}

.content {
  color: var(--text-primary, #000000);
  font-family: var(--font-family-base, system-ui);
  font-size: var(--font-size-base, 1rem);
}
`;
}

/**
 * Generate Storybook story file content
 * @param {ScaffoldConfig} config - Scaffold configuration
 * @returns {string} Story file content
 */
function generateStoryFile(config) {
  const className = toPascalCase(config.name);
  const tagName = `harmony-${config.name}`;
  
  return `import { ${className} } from './${config.name}.js';

export default {
  title: '${config.type.charAt(0).toUpperCase() + config.type.slice(1)}s/${className}',
  component: '${tagName}',
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disable the component'
    },
    value: {
      control: 'text',
      description: 'Component value'
    }
  }
};

export const Default = {
  args: {
    disabled: false,
    value: ''
  },
  render: (args) => {
    const el = document.createElement('${tagName}');
    if (args.disabled) el.setAttribute('disabled', '');
    if (args.value) el.setAttribute('value', args.value);
    el.textContent = 'Default content';
    return el;
  }
};

export const Disabled = {
  args: {
    disabled: true,
    value: 'test'
  },
  render: (args) => {
    const el = document.createElement('${tagName}');
    if (args.disabled) el.setAttribute('disabled', '');
    if (args.value) el.setAttribute('value', args.value);
    el.textContent = 'Disabled state';
    return el;
  }
};

export const WithContent = {
  args: {
    disabled: false,
    value: 'example'
  },
  render: (args) => {
    const el = document.createElement('${tagName}');
    if (args.disabled) el.setAttribute('disabled', '');
    if (args.value) el.setAttribute('value', args.value);
    el.innerHTML = '<p>Custom content with <strong>formatting</strong></p>';
    return el;
  }
};
`;
}

/**
 * Generate test file content
 * @param {ScaffoldConfig} config - Scaffold configuration
 * @returns {string} Test file content
 */
function generateTestFile(config) {
  const className = toPascalCase(config.name);
  const tagName = `harmony-${config.name}`;
  
  return `/**
 * Tests for ${className} Component
 */

import { ${className} } from './${config.name}.js';

describe('${className}', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('${tagName}');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(customElements.get('${tagName}')).toBe(${className});
    });

    it('should create shadow root', () => {
      expect(element.shadowRoot).toBeTruthy();
    });

    it('should render default template', () => {
      const container = element.shadowRoot.querySelector('.container');
      expect(container).toBeTruthy();
    });
  });

  describe('attributes', () => {
    it('should handle disabled attribute', () => {
      element.setAttribute('disabled', '');
      expect(element.disabled).toBe(true);
      
      element.removeAttribute('disabled');
      expect(element.disabled).toBe(false);
    });

    it('should handle value attribute', () => {
      element.setAttribute('value', 'test');
      expect(element.value).toBe('test');
    });

    it('should update via property setters', () => {
      element.disabled = true;
      expect(element.hasAttribute('disabled')).toBe(true);
      
      element.value = 'new-value';
      expect(element.getAttribute('value')).toBe('new-value');
    });
  });

  describe('events', () => {
    it('should emit custom events', (done) => {
      element.addEventListener('${config.name}:change', (e) => {
        expect(e.detail).toBeTruthy();
        done();
      });
      
      element.emit('change', { test: true });
    });
  });

  describe('accessibility', () => {
    it('should support hidden attribute', () => {
      element.setAttribute('hidden', '');
      const styles = window.getComputedStyle(element);
      expect(styles.display).toBe('none');
    });
  });
});
`;
}

/**
 * Generate README file content
 * @param {ScaffoldConfig} config - Scaffold configuration
 * @returns {string} README file content
 */
function generateReadmeFile(config) {
  const className = toPascalCase(config.name);
  const tagName = `harmony-${config.name}`;
  
  return `# ${className}

${className} component for the Harmony Design System.

## Usage

\`\`\`html
<${tagName} value="example">
  Content here
</${tagName}>
\`\`\`

## API

### Attributes

- \`disabled\` - Disables the component
- \`value\` - Component value

### Properties

- \`disabled: boolean\` - Get/set disabled state
- \`value: string\` - Get/set component value

### Events

- \`${config.name}:change\` - Emitted when component state changes

### CSS Custom Properties

- \`--spacing-md\` - Internal padding (default: 1rem)
- \`--surface-primary\` - Background color (default: #ffffff)
- \`--border-primary\` - Border color (default: #e0e0e0)
- \`--radius-md\` - Border radius (default: 0.5rem)
- \`--text-primary\` - Text color (default: #000000)
- \`--font-family-base\` - Font family (default: system-ui)
- \`--font-size-base\` - Font size (default: 1rem)

### CSS Parts

- \`container\` - Main container element
- \`content\` - Content wrapper element

## Examples

### Disabled State

\`\`\`html
<${tagName} disabled>
  Disabled content
</${tagName}>
\`\`\`

### With Value

\`\`\`html
<${tagName} value="custom-value">
  Content
</${tagName}>
\`\`\`

### Programmatic Usage

\`\`\`javascript
const component = document.createElement('${tagName}');
component.value = 'example';
component.disabled = false;

component.addEventListener('${config.name}:change', (e) => {
  console.log('Changed:', e.detail);
});

document.body.appendChild(component);
\`\`\`

## Design Tokens

This component uses Harmony design tokens for consistent styling. See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) for token documentation.

## Accessibility

- Supports \`disabled\` attribute for keyboard navigation
- Uses semantic HTML structure
- Provides CSS parts for custom styling
- Emits standard custom events

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Performance

- Render budget: <16ms per frame
- Memory footprint: <1MB per instance
- Uses shadow DOM for style encapsulation
`;
}

/**
 * Create component files
 * @param {ScaffoldConfig} config - Scaffold configuration
 */
function createComponent(config) {
  const targetDir = getTargetDirectory(config);
  const fullPath = path.resolve(targetDir);

  // Check if directory already exists
  if (fs.existsSync(fullPath)) {
    console.error(`Error: Component directory already exists: ${targetDir}`);
    process.exit(1);
  }

  // Create directory
  console.log(`Creating component directory: ${targetDir}`);
  fs.mkdirSync(fullPath, { recursive: true });

  // Generate component file
  const componentFile = path.join(fullPath, `${config.name}.js`);
  console.log(`  Creating ${config.name}.js`);
  fs.writeFileSync(componentFile, generateComponentFile(config));

  // Generate README
  const readmeFile = path.join(fullPath, 'README.md');
  console.log(`  Creating README.md`);
  fs.writeFileSync(readmeFile, generateReadmeFile(config));

  // Generate optional files
  if (config.withStyles) {
    const stylesFile = path.join(fullPath, `${config.name}.css`);
    console.log(`  Creating ${config.name}.css`);
    fs.writeFileSync(stylesFile, generateStylesFile(config));
  }

  if (config.withStory) {
    const storyFile = path.join(fullPath, `${config.name}.stories.js`);
    console.log(`  Creating ${config.name}.stories.js`);
    fs.writeFileSync(storyFile, generateStoryFile(config));
  }

  if (config.withTest) {
    const testFile = path.join(fullPath, `${config.name}.test.js`);
    console.log(`  Creating ${config.name}.test.js`);
    fs.writeFileSync(testFile, generateTestFile(config));
  }

  console.log(`\n✅ Component scaffolded successfully!`);
  console.log(`\nLocation: ${targetDir}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Implement component logic in ${config.name}.js`);
  console.log(`  2. Test in Chrome to verify all states work correctly`);
  console.log(`  3. Update DESIGN_SYSTEM.md with component documentation`);
  console.log(`  4. Commit changes with message: feat(${config.name}): Add ${toPascalCase(config.name)} component`);
  
  if (config.withStory) {
    console.log(`  5. View in Storybook: npm run storybook`);
  }
}

// Main execution
try {
  const config = parseArgs();
  createComponent(config);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}