/**
 * @fileoverview Web Component generator from parsed .pen data
 * @module tools/pen-to-component/component-generator
 * 
 * Generates Web Component code with shadow DOM, animations,
 * and proper event handling from parsed .pen specifications.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#pen-to-component
 */

/**
 * Generates Web Component code from parsed pen data
 */
export class ComponentGenerator {
  /**
   * Generate complete Web Component code
   * @param {import('./pen-parser.js').PenComponent} spec - Component specification
   * @returns {string} Generated JavaScript code
   */
  static generate(spec) {
    const className = this._toClassName(spec.name);
    const properties = this._generateProperties(spec.properties);
    const template = this._generateTemplate(spec);
    const styles = this._generateStyles(spec);
    const animations = this._generateAnimations(spec.animations);
    const lifecycle = this._generateLifecycle(spec);
    const methods = this._generateMethods(spec);

    return `/**
 * @fileoverview ${spec.name} Web Component
 * Generated from .pen file
 * 
 * ${spec.description || 'No description provided'}
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#${spec.tag}
 */

/**
 * ${spec.name} custom element
 * @extends HTMLElement
 */
export class ${className} extends HTMLElement {
  ${properties}

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initializeProperties();
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]}
   */
  static get observedAttributes() {
    return [${spec.properties.map(p => `'${this._toKebabCase(p.name)}'`).join(', ')}];
  }

  /**
   * Initialize component properties with defaults
   * @private
   */
  _initializeProperties() {
${spec.properties.map(p => {
  const defaultValue = p.default !== undefined 
    ? (p.type === 'string' ? `'${p.default}'` : p.default)
    : (p.type === 'string' ? "''" : p.type === 'number' ? '0' : 'false');
  return `    this._${p.name} = ${defaultValue};`;
}).join('\n')}
  }

  ${lifecycle}

  ${methods}

  /**
   * Render component template and styles
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = \`
      <style>
        ${styles}
        ${animations}
      </style>
      ${template}
    \`;
  }

  /**
   * Apply animations based on triggers
   * @private
   */
  _applyAnimations() {
    const host = this.shadowRoot.host;
${spec.animations.filter(a => a.trigger === 'load').map(a => `
    // ${a.name} animation
    requestAnimationFrame(() => {
      host.style.animation = '${a.name} ${a.duration}ms ${a.easing}';
    });`).join('')}
  }

  /**
   * Publish component event via EventBus
   * @private
   * @param {string} eventType - Event type
   * @param {Object} detail - Event detail
   */
  _publishEvent(eventType, detail) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);

    // Log for debugging
    if (window.EventBus && window.EventBus.publish) {
      window.EventBus.publish(eventType, detail);
    }
  }
}

// Register custom element
if (!customElements.get('${spec.tag}')) {
  customElements.define('${spec.tag}', ${className});
}
`;
  }

  /**
   * Generate property getters and setters
   * @private
   */
  static _generateProperties(properties) {
    return properties.map(prop => {
      const propName = prop.name;
      const attrName = this._toKebabCase(propName);
      
      return `
  /**
   * ${prop.description || propName}
   * @type {${prop.type}}
   */
  get ${propName}() {
    return this._${propName};
  }

  set ${propName}(value) {
    const oldValue = this._${propName};
    this._${propName} = ${this._generateTypeConversion(prop.type, 'value')};
    
    if (oldValue !== this._${propName}) {
      this.setAttribute('${attrName}', this._${propName});
      this._render();
    }
  }`;
    }).join('\n');
  }

  /**
   * Generate type conversion code
   * @private
   */
  static _generateTypeConversion(type, varName) {
    switch (type) {
      case 'number':
        return `parseFloat(${varName}) || 0`;
      case 'boolean':
        return `${varName} === true || ${varName} === 'true'`;
      default:
        return `String(${varName} || '')`;
    }
  }

  /**
   * Generate HTML template
   * @private
   */
  static _generateTemplate(spec) {
    if (spec.template) {
      return spec.template;
    }

    // Generate default template with slots
    const slots = spec.slots.map(slot => {
      return `<slot name="${slot.name}"></slot>`;
    }).join('\n        ');

    return `<div class="container">
        ${slots || '<slot></slot>'}
      </div>`;
  }

  /**
   * Generate CSS styles
   * @private
   */
  static _generateStyles(spec) {
    let css = ':host {\n  display: block;\n}\n\n';

    // Base styles
    if (Object.keys(spec.baseStyles).length > 0) {
      css += '.container {\n';
      for (const [prop, value] of Object.entries(spec.baseStyles)) {
        css += `  ${prop}: ${value};\n`;
      }
      css += '}\n\n';
    }

    // State styles
    for (const state of spec.states) {
      const selector = this._getStateSelector(state.name);
      css += `${selector} {\n`;
      for (const [prop, value] of Object.entries(state.styles)) {
        css += `  ${prop}: ${value};\n`;
      }
      css += '}\n\n';
    }

    return css;
  }

  /**
   * Get CSS selector for state
   * @private
   */
  static _getStateSelector(stateName) {
    switch (stateName.toLowerCase()) {
      case 'hover':
        return ':host(:hover) .container';
      case 'focus':
        return ':host(:focus) .container';
      case 'active':
        return ':host(:active) .container';
      case 'disabled':
        return ':host([disabled]) .container';
      default:
        return `.container.${stateName}`;
    }
  }

  /**
   * Generate CSS animations
   * @private
   */
  static _generateAnimations(animations) {
    return animations.map(anim => {
      return `@keyframes ${anim.name} {
  from {
    ${anim.property}: ${anim.from};
  }
  to {
    ${anim.property}: ${anim.to};
  }
}`;
    }).join('\n\n');
  }

  /**
   * Generate lifecycle methods
   * @private
   */
  static _generateLifecycle(spec) {
    return `/**
   * Called when element is connected to DOM
   */
  connectedCallback() {
    this._render();
    this._applyAnimations();
  }

  /**
   * Called when observed attribute changes
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    const propName = this._toCamelCase(name);
    if (this.hasOwnProperty('_' + propName)) {
      this['_' + propName] = newValue;
      this._render();
    }
  }

  /**
   * Called when element is disconnected from DOM
   */
  disconnectedCallback() {
    // Cleanup if needed
  }`;
  }

  /**
   * Generate utility methods
   * @private
   */
  static _generateMethods(spec) {
    return `/**
   * Convert kebab-case to camelCase
   * @private
   * @param {string} str - Kebab-case string
   * @returns {string} camelCase string
   */
  _toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }`;
  }

  /**
   * Convert name to PascalCase class name
   * @private
   */
  static _toClassName(name) {
    return name
      .split(/[\s-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert camelCase to kebab-case
   * @private
   */
  static _toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}