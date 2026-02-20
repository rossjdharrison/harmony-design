/**
 * @fileoverview Parser for .pen design specification files
 * @module tools/pen-to-component/parser
 * 
 * .pen Format Specification:
 * - Component metadata (name, description, states)
 * - Layout specifications (dimensions, positioning)
 * - Animation keyframes and timings
 * - Style properties (colors, typography, shadows)
 * - Interaction states (hover, focus, active, disabled)
 */

/**
 * Parses a .pen file into a structured component specification
 * @param {string} penContent - Raw .pen file content
 * @returns {Object} Parsed component specification
 * @throws {Error} If parsing fails
 */
export function parsePenFile(penContent) {
  const spec = {
    component: {},
    layout: {},
    animations: [],
    styles: {},
    states: {},
    interactions: {}
  };

  const lines = penContent.split('\n');
  let currentSection = null;
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    // Section headers
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).toLowerCase();
      continue;
    }

    // Parse based on current section
    switch (currentSection) {
      case 'component':
        parseComponentLine(line, spec.component);
        break;
      case 'layout':
        parseLayoutLine(line, spec.layout);
        break;
      case 'animation':
        parseAnimationLine(line, spec.animations);
        break;
      case 'styles':
        parseStyleLine(line, spec.styles);
        break;
      case 'states':
        parseStateLine(line, spec.states);
        break;
      case 'interactions':
        parseInteractionLine(line, spec.interactions);
        break;
    }
  }

  validateSpec(spec);
  return spec;
}

/**
 * Parses component metadata line
 * @param {string} line - Line to parse
 * @param {Object} component - Component object to populate
 */
function parseComponentLine(line, component) {
  const [key, ...valueParts] = line.split(':');
  if (!key || valueParts.length === 0) return;
  
  const value = valueParts.join(':').trim();
  const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
  component[cleanKey] = value;
}

/**
 * Parses layout specification line
 * @param {string} line - Line to parse
 * @param {Object} layout - Layout object to populate
 */
function parseLayoutLine(line, layout) {
  const [key, value] = line.split(':').map(s => s.trim());
  if (!key || !value) return;
  
  const cleanKey = key.toLowerCase().replace(/\s+/g, '_');
  layout[cleanKey] = value;
}

/**
 * Parses animation specification line
 * @param {string} line - Line to parse
 * @param {Array} animations - Animations array to populate
 */
function parseAnimationLine(line, animations) {
  // Animation format: name: duration easing [keyframes]
  if (line.includes('{')) {
    const [header, keyframesStr] = line.split('{');
    const [name, ...props] = header.split(':');
    
    const animation = {
      name: name.trim(),
      duration: '300ms',
      easing: 'ease-out',
      keyframes: []
    };

    // Parse duration and easing if provided
    if (props.length > 0) {
      const parts = props[0].trim().split(/\s+/);
      if (parts[0]) animation.duration = parts[0];
      if (parts[1]) animation.easing = parts[1];
    }

    // Parse keyframes
    const keyframeLines = keyframesStr.split('}')[0].split(';');
    for (const kf of keyframeLines) {
      const trimmed = kf.trim();
      if (!trimmed) continue;
      
      const [offset, ...properties] = trimmed.split(/\s+/);
      animation.keyframes.push({
        offset: offset,
        properties: properties.join(' ')
      });
    }

    animations.push(animation);
  }
}

/**
 * Parses style specification line
 * @param {string} line - Line to parse
 * @param {Object} styles - Styles object to populate
 */
function parseStyleLine(line, styles) {
  const [property, value] = line.split(':').map(s => s.trim());
  if (!property || !value) return;
  
  const cleanProperty = property.toLowerCase().replace(/\s+/g, '-');
  styles[cleanProperty] = value;
}

/**
 * Parses state specification line
 * @param {string} line - Line to parse
 * @param {Object} states - States object to populate
 */
function parseStateLine(line, states) {
  // State format: stateName { property: value; property: value }
  if (line.includes('{')) {
    const [stateName, propertiesStr] = line.split('{');
    const state = {};
    
    const properties = propertiesStr.split('}')[0].split(';');
    for (const prop of properties) {
      const [key, value] = prop.split(':').map(s => s.trim());
      if (key && value) {
        state[key.replace(/\s+/g, '-')] = value;
      }
    }
    
    states[stateName.trim().toLowerCase()] = state;
  }
}

/**
 * Parses interaction specification line
 * @param {string} line - Line to parse
 * @param {Object} interactions - Interactions object to populate
 */
function parseInteractionLine(line, interactions) {
  // Interaction format: trigger -> action
  if (line.includes('->')) {
    const [trigger, action] = line.split('->').map(s => s.trim());
    if (trigger && action) {
      interactions[trigger.toLowerCase()] = action;
    }
  }
}

/**
 * Validates the parsed specification
 * @param {Object} spec - Parsed specification
 * @throws {Error} If validation fails
 */
function validateSpec(spec) {
  if (!spec.component.name) {
    throw new Error('Component name is required in [component] section');
  }

  // Validate component name format (must be kebab-case with at least one hyphen)
  const name = spec.component.name;
  if (!name.includes('-') || !/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) {
    throw new Error('Component name must be kebab-case with at least one hyphen (e.g., my-component)');
  }

  // Validate animation durations
  for (const animation of spec.animations) {
    if (!/^\d+(ms|s)$/.test(animation.duration)) {
      throw new Error(`Invalid animation duration: ${animation.duration}`);
    }
  }
}

/**
 * Generates example .pen file content
 * @param {string} componentName - Name of the component
 * @returns {string} Example .pen file content
 */
export function generateExamplePen(componentName) {
  return `# ${componentName} Component Specification
# Auto-generated example .pen file

[component]
name: ${componentName}
description: A custom web component with animations
version: 1.0.0

[layout]
display: inline-block
width: auto
height: auto
padding: 12px 24px

[styles]
background-color: var(--harmony-primary, #007bff)
color: var(--harmony-on-primary, #ffffff)
border-radius: 4px
font-family: var(--harmony-font-family, system-ui)
font-size: 14px
font-weight: 500
border: none
cursor: pointer
transition: all 200ms ease-out

[states]
hover { background-color: var(--harmony-primary-dark, #0056b3); transform: translateY(-1px) }
active { background-color: var(--harmony-primary-darker, #004085); transform: translateY(0) }
focus { outline: 2px solid var(--harmony-focus, #80bdff); outline-offset: 2px }
disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none }

[animation]
fadeIn: 300ms ease-out { 0% opacity:0 transform:translateY(10px); 100% opacity:1 transform:translateY(0) }
pulse: 600ms ease-in-out { 0% transform:scale(1); 50% transform:scale(1.05); 100% transform:scale(1) }

[interactions]
click -> emit:click
focus -> apply:focus
blur -> remove:focus
`;
}