/**
 * @fileoverview ComponentNode type definition with props, slots, events, lifecycle
 * @see DESIGN_SYSTEM.md#component-node-architecture
 */

/**
 * @typedef {Object} ComponentProp
 * @property {string} name - Property name
 * @property {string} type - Property type (string, number, boolean, object, array, function)
 * @property {*} [defaultValue] - Default value if not provided
 * @property {boolean} [required=false] - Whether the prop is required
 * @property {Function} [validator] - Optional validation function
 * @property {boolean} [reactive=true] - Whether changes trigger re-render
 */

/**
 * @typedef {Object} ComponentSlot
 * @property {string} name - Slot name (use 'default' for unnamed slot)
 * @property {string} [description] - Human-readable description
 * @property {boolean} [required=false] - Whether slot content is required
 * @property {string} [fallback] - Fallback content if slot is empty
 */

/**
 * @typedef {Object} ComponentEvent
 * @property {string} name - Event name
 * @property {string} [description] - Human-readable description
 * @property {Object} [detail] - Structure of event.detail payload
 * @property {boolean} [bubbles=true] - Whether event bubbles
 * @property {boolean} [cancelable=false] - Whether event is cancelable
 * @property {boolean} [composed=true] - Whether event crosses shadow DOM boundary
 */

/**
 * @typedef {Object} ComponentLifecycle
 * @property {Function} [onInit] - Called when component is constructed
 * @property {Function} [onConnect] - Called when component is connected to DOM
 * @property {Function} [onDisconnect] - Called when component is disconnected from DOM
 * @property {Function} [onAdopt] - Called when component is adopted to new document
 * @property {Function} [onAttributeChange] - Called when observed attribute changes
 * @property {Function} [onPropChange] - Called when reactive prop changes
 * @property {Function} [onSlotChange] - Called when slot content changes
 * @property {Function} [onRender] - Called before each render
 * @property {Function} [onRendered] - Called after each render
 * @property {Function} [onError] - Called when component encounters error
 */

/**
 * @typedef {Object} ComponentMetadata
 * @property {string} name - Component name (must include hyphen)
 * @property {string} [version='1.0.0'] - Component version
 * @property {string} [description] - Human-readable description
 * @property {string} [category] - Component category (atom, molecule, organism, template)
 * @property {string[]} [tags] - Searchable tags
 * @property {string} [author] - Component author
 * @property {Date} [created] - Creation date
 * @property {Date} [modified] - Last modification date
 */

/**
 * @typedef {Object} ComponentState
 * @property {Object} data - Internal reactive state
 * @property {boolean} isConnected - Whether component is in DOM
 * @property {boolean} isRendering - Whether component is currently rendering
 * @property {Error|null} lastError - Last error encountered
 * @property {number} renderCount - Number of times component has rendered
 * @property {number} lastRenderTime - Time of last render in ms
 */

/**
 * @typedef {Object} ComponentNode
 * @property {ComponentMetadata} metadata - Component metadata
 * @property {ComponentProp[]} props - Component properties
 * @property {ComponentSlot[]} slots - Component slots
 * @property {ComponentEvent[]} events - Component events
 * @property {ComponentLifecycle} lifecycle - Lifecycle hooks
 * @property {ComponentState} state - Internal component state
 * @property {string[]} observedAttributes - Attributes to observe for changes
 * @property {boolean} useShadowDOM - Whether to use shadow DOM (default: true)
 * @property {string} shadowMode - Shadow DOM mode ('open' or 'closed')
 * @property {Function} render - Render function returning HTML string or template
 * @property {Object} [styles] - Component styles
 * @property {Object} [methods] - Public methods exposed by component
 */

/**
 * Creates a new ComponentNode definition
 * @param {Partial<ComponentNode>} config - Component configuration
 * @returns {ComponentNode} Complete component node definition
 */
export function createComponentNode(config) {
  const now = new Date();
  
  return {
    metadata: {
      name: config.metadata?.name || 'unnamed-component',
      version: config.metadata?.version || '1.0.0',
      description: config.metadata?.description || '',
      category: config.metadata?.category || 'atom',
      tags: config.metadata?.tags || [],
      author: config.metadata?.author || '',
      created: config.metadata?.created || now,
      modified: config.metadata?.modified || now,
    },
    props: config.props || [],
    slots: config.slots || [],
    events: config.events || [],
    lifecycle: {
      onInit: config.lifecycle?.onInit,
      onConnect: config.lifecycle?.onConnect,
      onDisconnect: config.lifecycle?.onDisconnect,
      onAdopt: config.lifecycle?.onAdopt,
      onAttributeChange: config.lifecycle?.onAttributeChange,
      onPropChange: config.lifecycle?.onPropChange,
      onSlotChange: config.lifecycle?.onSlotChange,
      onRender: config.lifecycle?.onRender,
      onRendered: config.lifecycle?.onRendered,
      onError: config.lifecycle?.onError,
    },
    state: {
      data: {},
      isConnected: false,
      isRendering: false,
      lastError: null,
      renderCount: 0,
      lastRenderTime: 0,
    },
    observedAttributes: config.observedAttributes || [],
    useShadowDOM: config.useShadowDOM !== false,
    shadowMode: config.shadowMode || 'open',
    render: config.render || (() => ''),
    styles: config.styles || {},
    methods: config.methods || {},
  };
}

/**
 * Validates a ComponentNode definition
 * @param {ComponentNode} node - Component node to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateComponentNode(node) {
  const errors = [];

  // Validate metadata
  if (!node.metadata?.name) {
    errors.push('Component name is required');
  } else if (!node.metadata.name.includes('-')) {
    errors.push('Component name must include a hyphen (custom element requirement)');
  }

  // Validate props
  if (node.props) {
    node.props.forEach((prop, index) => {
      if (!prop.name) {
        errors.push(`Prop at index ${index} missing name`);
      }
      if (!prop.type) {
        errors.push(`Prop "${prop.name}" missing type`);
      }
      const validTypes = ['string', 'number', 'boolean', 'object', 'array', 'function'];
      if (prop.type && !validTypes.includes(prop.type)) {
        errors.push(`Prop "${prop.name}" has invalid type: ${prop.type}`);
      }
    });
  }

  // Validate slots
  if (node.slots) {
    const slotNames = new Set();
    node.slots.forEach((slot, index) => {
      if (!slot.name) {
        errors.push(`Slot at index ${index} missing name`);
      } else if (slotNames.has(slot.name)) {
        errors.push(`Duplicate slot name: ${slot.name}`);
      } else {
        slotNames.add(slot.name);
      }
    });
  }

  // Validate events
  if (node.events) {
    node.events.forEach((event, index) => {
      if (!event.name) {
        errors.push(`Event at index ${index} missing name`);
      }
    });
  }

  // Validate render function
  if (typeof node.render !== 'function') {
    errors.push('Render must be a function');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Serializes a ComponentNode to JSON
 * @param {ComponentNode} node - Component node to serialize
 * @returns {Object} Serializable object
 */
export function serializeComponentNode(node) {
  return {
    metadata: node.metadata,
    props: node.props.map(prop => ({
      name: prop.name,
      type: prop.type,
      defaultValue: prop.defaultValue,
      required: prop.required,
      reactive: prop.reactive,
    })),
    slots: node.slots,
    events: node.events,
    observedAttributes: node.observedAttributes,
    useShadowDOM: node.useShadowDOM,
    shadowMode: node.shadowMode,
    // Note: Functions (lifecycle, render, validators) cannot be serialized
  };
}

/**
 * Creates a prop definition
 * @param {string} name - Property name
 * @param {string} type - Property type
 * @param {Object} [options] - Additional options
 * @returns {ComponentProp} Prop definition
 */
export function createProp(name, type, options = {}) {
  return {
    name,
    type,
    defaultValue: options.defaultValue,
    required: options.required || false,
    validator: options.validator,
    reactive: options.reactive !== false,
  };
}

/**
 * Creates a slot definition
 * @param {string} name - Slot name
 * @param {Object} [options] - Additional options
 * @returns {ComponentSlot} Slot definition
 */
export function createSlot(name, options = {}) {
  return {
    name,
    description: options.description,
    required: options.required || false,
    fallback: options.fallback,
  };
}

/**
 * Creates an event definition
 * @param {string} name - Event name
 * @param {Object} [options] - Additional options
 * @returns {ComponentEvent} Event definition
 */
export function createEvent(name, options = {}) {
  return {
    name,
    description: options.description,
    detail: options.detail,
    bubbles: options.bubbles !== false,
    cancelable: options.cancelable || false,
    composed: options.composed !== false,
  };
}