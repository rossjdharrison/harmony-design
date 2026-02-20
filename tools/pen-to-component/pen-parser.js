/**
 * @fileoverview Parser for .pen design files
 * @module tools/pen-to-component/pen-parser
 * 
 * Parses .pen files containing component specifications with animations
 * and converts them to structured data for component generation.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#pen-to-component
 */

/**
 * @typedef {Object} PenAnimation
 * @property {string} name - Animation name
 * @property {string} property - CSS property to animate
 * @property {string} from - Starting value
 * @property {string} to - Ending value
 * @property {number} duration - Duration in milliseconds
 * @property {string} easing - Easing function
 * @property {string} [trigger] - Animation trigger (hover, focus, active, load)
 */

/**
 * @typedef {Object} PenState
 * @property {string} name - State name (default, hover, focus, active, disabled)
 * @property {Object<string, string>} styles - CSS styles for this state
 */

/**
 * @typedef {Object} PenSlot
 * @property {string} name - Slot name
 * @property {string} [description] - Slot description
 */

/**
 * @typedef {Object} PenProperty
 * @property {string} name - Property name
 * @property {string} type - Property type (string, number, boolean)
 * @property {*} [default] - Default value
 * @property {string} [description] - Property description
 */

/**
 * @typedef {Object} PenComponent
 * @property {string} name - Component name
 * @property {string} tag - Custom element tag name
 * @property {string} [description] - Component description
 * @property {Object<string, string>} baseStyles - Base CSS styles
 * @property {PenState[]} states - Component states
 * @property {PenAnimation[]} animations - Component animations
 * @property {PenProperty[]} properties - Component properties
 * @property {PenSlot[]} slots - Component slots
 * @property {string} [template] - HTML template
 */

export class PenParser {
  /**
   * Parse a .pen file content into structured component data
   * @param {string} content - Raw .pen file content
   * @returns {PenComponent} Parsed component specification
   * @throws {Error} If parsing fails
   */
  static parse(content) {
    const lines = content.split('\n').map(line => line.trim());
    const component = {
      name: '',
      tag: '',
      description: '',
      baseStyles: {},
      states: [],
      animations: [],
      properties: [],
      slots: [],
      template: ''
    };

    let currentSection = null;
    let currentObject = null;
    let templateLines = [];
    let inTemplate = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Section headers
      if (line.startsWith('@')) {
        const section = line.substring(1).toLowerCase();
        
        if (section === 'template') {
          inTemplate = true;
          currentSection = 'template';
          continue;
        } else if (section === 'end-template') {
          inTemplate = false;
          component.template = templateLines.join('\n');
          templateLines = [];
          continue;
        }

        currentSection = section;
        currentObject = null;
        continue;
      }

      // Template content
      if (inTemplate) {
        templateLines.push(line);
        continue;
      }

      // Parse based on current section
      switch (currentSection) {
        case 'component':
          this._parseComponentMeta(line, component);
          break;

        case 'properties':
          this._parseProperty(line, component);
          break;

        case 'slots':
          this._parseSlot(line, component);
          break;

        case 'styles':
          this._parseStyle(line, component);
          break;

        case 'state':
          currentObject = this._parseState(line, component, currentObject);
          break;

        case 'animation':
          currentObject = this._parseAnimation(line, component, currentObject);
          break;
      }
    }

    this._validateComponent(component);
    return component;
  }

  /**
   * Parse component metadata
   * @private
   */
  static _parseComponentMeta(line, component) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    switch (key.toLowerCase()) {
      case 'name':
        component.name = value;
        break;
      case 'tag':
        component.tag = value;
        break;
      case 'description':
        component.description = value;
        break;
    }
  }

  /**
   * Parse property definition
   * @private
   */
  static _parseProperty(line, component) {
    const match = line.match(/^(\w+)\s*:\s*(\w+)(?:\s*=\s*(.+?))?(?:\s*\/\/\s*(.+))?$/);
    if (match) {
      const [, name, type, defaultValue, description] = match;
      component.properties.push({
        name,
        type,
        default: this._parseValue(defaultValue, type),
        description: description || ''
      });
    }
  }

  /**
   * Parse slot definition
   * @private
   */
  static _parseSlot(line, component) {
    const match = line.match(/^(\w+)(?:\s*\/\/\s*(.+))?$/);
    if (match) {
      const [, name, description] = match;
      component.slots.push({
        name,
        description: description || ''
      });
    }
  }

  /**
   * Parse base style
   * @private
   */
  static _parseStyle(line, component) {
    const [property, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    
    if (property && value) {
      component.baseStyles[property.trim()] = value.replace(/;$/, '');
    }
  }

  /**
   * Parse state definition
   * @private
   */
  static _parseState(line, component, currentState) {
    if (line.startsWith('state:')) {
      const stateName = line.substring(6).trim();
      const state = {
        name: stateName,
        styles: {}
      };
      component.states.push(state);
      return state;
    } else if (currentState && line.includes(':')) {
      const [property, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      currentState.styles[property.trim()] = value.replace(/;$/, '');
    }
    return currentState;
  }

  /**
   * Parse animation definition
   * @private
   */
  static _parseAnimation(line, component, currentAnimation) {
    if (line.startsWith('name:')) {
      const animation = {
        name: line.substring(5).trim(),
        property: '',
        from: '',
        to: '',
        duration: 300,
        easing: 'ease',
        trigger: 'load'
      };
      component.animations.push(animation);
      return animation;
    } else if (currentAnimation) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      switch (key.toLowerCase()) {
        case 'property':
          currentAnimation.property = value;
          break;
        case 'from':
          currentAnimation.from = value;
          break;
        case 'to':
          currentAnimation.to = value;
          break;
        case 'duration':
          currentAnimation.duration = parseInt(value, 10);
          break;
        case 'easing':
          currentAnimation.easing = value;
          break;
        case 'trigger':
          currentAnimation.trigger = value;
          break;
      }
    }
    return currentAnimation;
  }

  /**
   * Parse value based on type
   * @private
   */
  static _parseValue(value, type) {
    if (!value) return undefined;

    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      default:
        return value.replace(/^["']|["']$/g, '');
    }
  }

  /**
   * Validate parsed component
   * @private
   */
  static _validateComponent(component) {
    if (!component.name) {
      throw new Error('Component must have a name');
    }
    if (!component.tag) {
      throw new Error('Component must have a tag');
    }
    if (!/^[a-z]+-[a-z-]+$/.test(component.tag)) {
      throw new Error('Component tag must contain a hyphen and be lowercase');
    }
  }
}