/**
 * @fileoverview Generator for Web Components from .pen specifications
 * @module tools/pen-to-component/generator
 * 
 * Generates vanilla Web Components with:
 * - Shadow DOM encapsulation
 * - CSS animations from spec
 * - Event publishing (no direct BC calls)
 * - Performance-optimized rendering
 */

/**
 * Generates a Web Component from a parsed .pen specification
 * @param {Object} spec - Parsed component specification
 * @returns {Object} Generated component files
 */
export function generateComponent(spec) {
  const componentName = spec.component.name;
  const className = toPascalCase(componentName);

  return {
    component: generateComponentJS(spec, className),
    styles: generateComponentCSS(spec),
    template: generateComponentHTML(spec),
    test: generateComponentTest(spec, className),
    story: generateComponentStory(spec, className)
  };
}

/**
 * Generates the JavaScript component class
 * @param {Object} spec - Component specification
 * @param {string} className - PascalCase class name
 * @returns {string} JavaScript component code
 */
function generateComponentJS(spec, className) {
  const componentName = spec.component.name;
  const animations = spec.animations || [];
  
  return `/**
 * @fileoverview ${spec.component.description || className + ' component'}
 * @module components/${componentName}
 * 
 * Generated from .pen specification
 * See: DESIGN_SYSTEM.md#components-${componentName}
 */

/**
 * ${className} Web Component
 * @extends HTMLElement
 * 
 * @fires ${componentName}:ready - Fired when component is initialized
 * @fires ${componentName}:interaction - Fired on user interactions
 * 
 * @example
 * <${componentName}></${componentName}>
 */
export class ${className} extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = {
      initialized: false,
      disabled: false
    };
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]} Array of attribute names
   */
  static get observedAttributes() {
    return ['disabled', 'variant'];
  }

  /**
   * Lifecycle: Connected to DOM
   */
  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this._state.initialized = true;
    this.publishEvent('ready', { componentName: '${componentName}' });
  }

  /**
   * Lifecycle: Disconnected from DOM
   */
  disconnectedCallback() {
    this.detachEventListeners();
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'disabled':
        this._state.disabled = newValue !== null;
        this.updateDisabledState();
        break;
      case 'variant':
        this.updateVariant(newValue);
        break;
    }
  }

  /**
   * Renders the component
   */
  render() {
    const template = this.getTemplate();
    const styles = this.getStyles();
    
    this.shadowRoot.innerHTML = \`
      <style>\${styles}</style>
      \${template}
    \`;
  }

  /**
   * Gets the component template
   * @returns {string} HTML template
   */
  getTemplate() {
    return \`
      <div class="container" part="container">
        <slot></slot>
      </div>
    \`;
  }

  /**
   * Gets the component styles
   * @returns {string} CSS styles
   */
  getStyles() {
    return \`
      :host {
        ${generateHostStyles(spec)}
      }

      :host([disabled]) {
        ${generateDisabledStyles(spec)}
      }

      .container {
        ${generateContainerStyles(spec)}
      }

      ${generateStateStyles(spec)}
      ${generateAnimationStyles(spec)}
      ${generateCustomProperties(spec)}
    \`;
  }

  /**
   * Attaches event listeners
   */
  attachEventListeners() {
    const container = this.shadowRoot.querySelector('.container');
    if (!container) return;

    ${generateEventListeners(spec)}
  }

  /**
   * Detaches event listeners
   */
  detachEventListeners() {
    // Cleanup handled by disconnectedCallback
  }

  /**
   * Updates disabled state
   */
  updateDisabledState() {
    const container = this.shadowRoot.querySelector('.container');
    if (!container) return;

    if (this._state.disabled) {
      container.setAttribute('aria-disabled', 'true');
    } else {
      container.removeAttribute('aria-disabled');
    }
  }

  /**
   * Updates variant styling
   * @param {string} variant - Variant name
   */
  updateVariant(variant) {
    const container = this.shadowRoot.querySelector('.container');
    if (!container) return;
    
    container.setAttribute('data-variant', variant || 'default');
  }

  /**
   * Publishes an event to the EventBus
   * @param {string} eventType - Event type
   * @param {Object} detail - Event detail
   */
  publishEvent(eventType, detail = {}) {
    const event = new CustomEvent(\`${componentName}:\${eventType}\`, {
      bubbles: true,
      composed: true,
      detail: {
        ...detail,
        timestamp: Date.now(),
        source: '${componentName}'
      }
    });
    this.dispatchEvent(event);
  }

  ${generateAnimationMethods(animations)}
}

// Register the custom element
if (!customElements.get('${componentName}')) {
  customElements.define('${componentName}', ${className});
}
`;
}

/**
 * Generates host styles from spec
 * @param {Object} spec - Component specification
 * @returns {string} CSS styles
 */
function generateHostStyles(spec) {
  const layout = spec.layout || {};
  const styles = spec.styles || {};
  
  const styleLines = [];
  
  // Layout properties
  if (layout.display) styleLines.push(`display: ${layout.display};`);
  if (layout.width) styleLines.push(`width: ${layout.width};`);
  if (layout.height) styleLines.push(`height: ${layout.height};`);
  
  // Style properties
  for (const [prop, value] of Object.entries(styles)) {
    styleLines.push(`${prop}: ${value};`);
  }
  
  return styleLines.join('\n        ');
}

/**
 * Generates disabled state styles
 * @param {Object} spec - Component specification
 * @returns {string} CSS styles
 */
function generateDisabledStyles(spec) {
  const disabledState = spec.states?.disabled || {};
  const styleLines = [];
  
  for (const [prop, value] of Object.entries(disabledState)) {
    styleLines.push(`${prop}: ${value};`);
  }
  
  if (styleLines.length === 0) {
    styleLines.push('opacity: 0.5;');
    styleLines.push('cursor: not-allowed;');
    styleLines.push('pointer-events: none;');
  }
  
  return styleLines.join('\n        ');
}

/**
 * Generates container styles
 * @param {Object} spec - Component specification
 * @returns {string} CSS styles
 */
function generateContainerStyles(spec) {
  const layout = spec.layout || {};
  const styleLines = [];
  
  if (layout.padding) styleLines.push(`padding: ${layout.padding};`);
  
  return styleLines.join('\n        ');
}

/**
 * Generates state-specific styles
 * @param {Object} spec - Component specification
 * @returns {string} CSS styles
 */
function generateStateStyles(spec) {
  const states = spec.states || {};
  const stateStyles = [];
  
  for (const [stateName, stateProps] of Object.entries(states)) {
    if (stateName === 'disabled') continue; // Handled separately
    
    const selector = stateName === 'hover' ? '.container:hover' :
                    stateName === 'focus' ? '.container:focus-within' :
                    stateName === 'active' ? '.container:active' :
                    `.container[data-state="${stateName}"]`;
    
    const props = Object.entries(stateProps)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n        ');
    
    stateStyles.push(`
      ${selector} {
        ${props}
      }`);
  }
  
  return stateStyles.join('\n');
}

/**
 * Generates animation keyframes and styles
 * @param {Object} spec - Component specification
 * @returns {string} CSS animations
 */
function generateAnimationStyles(spec) {
  const animations = spec.animations || [];
  const animationStyles = [];
  
  for (const animation of animations) {
    const keyframes = animation.keyframes
      .map(kf => `${kf.offset} { ${kf.properties} }`)
      .join('\n        ');
    
    animationStyles.push(`
      @keyframes ${animation.name} {
        ${keyframes}
      }

      .animate-${animation.name} {
        animation: ${animation.name} ${animation.duration} ${animation.easing};
      }`);
  }
  
  return animationStyles.join('\n');
}

/**
 * Generates custom CSS properties
 * @param {Object} spec - Component specification
 * @returns {string} CSS custom properties
 */
function generateCustomProperties(spec) {
  return `
      /* Custom properties for theming */
      :host {
        --component-transition-duration: 200ms;
        --component-transition-easing: ease-out;
      }`;
}

/**
 * Generates event listener setup code
 * @param {Object} spec - Component specification
 * @returns {string} JavaScript code
 */
function generateEventListeners(spec) {
  const interactions = spec.interactions || {};
  const listeners = [];
  
  for (const [trigger, action] of Object.entries(interactions)) {
    const eventName = trigger.toLowerCase();
    const handler = action.startsWith('emit:') 
      ? `this.publishEvent('${action.slice(5)}', { trigger: '${trigger}' });`
      : `this.handle${capitalize(action)}();`;
    
    listeners.push(`
    container.addEventListener('${eventName}', (e) => {
      if (this._state.disabled) return;
      ${handler}
    });`);
  }
  
  return listeners.join('\n');
}

/**
 * Generates animation control methods
 * @param {Array} animations - Animation specifications
 * @returns {string} JavaScript methods
 */
function generateAnimationMethods(animations) {
  if (animations.length === 0) return '';
  
  const methods = animations.map(animation => `
  /**
   * Plays the ${animation.name} animation
   */
  animate${capitalize(animation.name)}() {
    const container = this.shadowRoot.querySelector('.container');
    if (!container) return;
    
    container.classList.add('animate-${animation.name}');
    
    // Remove class after animation completes
    const duration = parseFloat('${animation.duration}');
    const unit = '${animation.duration}'.replace(/[\d.]/g, '');
    const ms = unit === 's' ? duration * 1000 : duration;
    
    setTimeout(() => {
      container.classList.remove('animate-${animation.name}');
    }, ms);
  }`);
  
  return methods.join('\n');
}

/**
 * Generates component CSS file
 * @param {Object} spec - Component specification
 * @returns {string} CSS content
 */
function generateComponentCSS(spec) {
  return `/**
 * ${spec.component.name} component styles
 * Generated from .pen specification
 */

/* Additional global styles if needed */
`;
}

/**
 * Generates component HTML template file
 * @param {Object} spec - Component specification
 * @returns {string} HTML content
 */
function generateComponentHTML(spec) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.component.name} Demo</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
      background: #f5f5f5;
    }
    .demo-section {
      background: white;
      padding: 2rem;
      margin-bottom: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <h1>${spec.component.name} Component Demo</h1>
  
  <div class="demo-section">
    <h2>Default</h2>
    <${spec.component.name}>Click me</${spec.component.name}>
  </div>

  <div class="demo-section">
    <h2>Disabled</h2>
    <${spec.component.name} disabled>Disabled</${spec.component.name}>
  </div>

  <script type="module" src="./${spec.component.name}.js"></script>
</body>
</html>
`;
}

/**
 * Generates component test file
 * @param {Object} spec - Component specification
 * @param {string} className - Component class name
 * @returns {string} Test code
 */
function generateComponentTest(spec, className) {
  const componentName = spec.component.name;
  
  return `/**
 * @fileoverview Tests for ${className} component
 */

import { ${className} } from './${componentName}.js';

/**
 * Test suite for ${className}
 */
describe('${className}', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('${componentName}');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  test('should be defined', () => {
    expect(customElements.get('${componentName}')).toBeDefined();
  });

  test('should render with shadow DOM', () => {
    expect(element.shadowRoot).toBeTruthy();
  });

  test('should handle disabled attribute', () => {
    element.setAttribute('disabled', '');
    expect(element._state.disabled).toBe(true);
  });

  test('should publish ready event on connect', (done) => {
    const newElement = document.createElement('${componentName}');
    
    newElement.addEventListener('${componentName}:ready', (e) => {
      expect(e.detail.componentName).toBe('${componentName}');
      done();
    });
    
    document.body.appendChild(newElement);
    newElement.remove();
  });

  test('should respect performance budget (16ms render)', () => {
    const start = performance.now();
    element.render();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(16);
  });
});
`;
}

/**
 * Generates Storybook story file
 * @param {Object} spec - Component specification
 * @param {string} className - Component class name
 * @returns {string} Story code
 */
function generateComponentStory(spec, className) {
  const componentName = spec.component.name;
  
  return `/**
 * @fileoverview Storybook stories for ${className}
 */

import './${componentName}.js';

export default {
  title: 'Components/${className}',
  component: '${componentName}',
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    variant: { control: 'select', options: ['default', 'primary', 'secondary'] }
  }
};

const Template = (args) => {
  const element = document.createElement('${componentName}');
  
  if (args.disabled) element.setAttribute('disabled', '');
  if (args.variant) element.setAttribute('variant', args.variant);
  
  element.textContent = args.content || 'Component Content';
  
  return element;
};

export const Default = Template.bind({});
Default.args = {
  content: 'Default ${className}',
  disabled: false,
  variant: 'default'
};

export const Disabled = Template.bind({});
Disabled.args = {
  content: 'Disabled ${className}',
  disabled: true
};

export const WithAnimation = Template.bind({});
WithAnimation.args = {
  content: 'Animated ${className}',
  disabled: false
};
WithAnimation.play = async ({ canvasElement }) => {
  const component = canvasElement.querySelector('${componentName}');
  ${spec.animations.length > 0 ? `component.animate${capitalize(spec.animations[0].name)}();` : '// No animations defined'}
};
`;
}

/**
 * Converts kebab-case to PascalCase
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
 * Capitalizes first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}