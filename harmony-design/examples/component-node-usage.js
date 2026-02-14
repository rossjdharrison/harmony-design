/**
 * @fileoverview Example usage of ComponentNode type definitions
 * @see DESIGN_SYSTEM.md#component-node-examples
 */

import {
  createComponentNode,
  validateComponentNode,
  createProp,
  createSlot,
  createEvent,
} from '../types/component-node.js';

/**
 * Example: Simple button component definition
 */
export const buttonComponentNode = createComponentNode({
  metadata: {
    name: 'harmony-button',
    version: '1.0.0',
    description: 'A customizable button component',
    category: 'atom',
    tags: ['interactive', 'form', 'button'],
    author: 'Harmony Design System',
  },
  
  props: [
    createProp('label', 'string', {
      required: true,
      description: 'Button text label',
    }),
    createProp('variant', 'string', {
      defaultValue: 'primary',
      validator: (value) => ['primary', 'secondary', 'tertiary'].includes(value),
      description: 'Button visual variant',
    }),
    createProp('disabled', 'boolean', {
      defaultValue: false,
      description: 'Whether button is disabled',
    }),
    createProp('size', 'string', {
      defaultValue: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value),
      description: 'Button size',
    }),
  ],
  
  slots: [
    createSlot('icon', {
      description: 'Optional icon to display before label',
      required: false,
    }),
  ],
  
  events: [
    createEvent('harmony-click', {
      description: 'Fired when button is clicked',
      detail: { timestamp: 'number', variant: 'string' },
      bubbles: true,
      composed: true,
    }),
  ],
  
  lifecycle: {
    onConnect() {
      console.log('Button connected to DOM');
    },
    
    onDisconnect() {
      console.log('Button disconnected from DOM');
    },
    
    onPropChange(propName, oldValue, newValue) {
      console.log(`Prop "${propName}" changed from ${oldValue} to ${newValue}`);
    },
  },
  
  observedAttributes: ['label', 'variant', 'disabled', 'size'],
  
  render() {
    return `
      <button 
        class="harmony-button harmony-button--${this.variant} harmony-button--${this.size}"
        ?disabled="${this.disabled}"
      >
        <slot name="icon"></slot>
        <span class="harmony-button__label">${this.label}</span>
      </button>
    `;
  },
  
  styles: {
    ':host': {
      display: 'inline-block',
    },
    '.harmony-button': {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '14px',
      transition: 'all 0.2s ease',
    },
  },
});

/**
 * Example: Complex card component definition
 */
export const cardComponentNode = createComponentNode({
  metadata: {
    name: 'harmony-card',
    version: '1.0.0',
    description: 'A flexible card container component',
    category: 'molecule',
    tags: ['container', 'layout', 'card'],
  },
  
  props: [
    createProp('title', 'string', {
      description: 'Card title',
    }),
    createProp('elevation', 'number', {
      defaultValue: 1,
      validator: (value) => value >= 0 && value <= 5,
      description: 'Shadow elevation level (0-5)',
    }),
    createProp('padding', 'string', {
      defaultValue: 'medium',
      validator: (value) => ['none', 'small', 'medium', 'large'].includes(value),
      description: 'Internal padding size',
    }),
  ],
  
  slots: [
    createSlot('default', {
      description: 'Main card content',
      required: true,
    }),
    createSlot('header', {
      description: 'Optional header content',
      fallback: '<div class="harmony-card__header-fallback"></div>',
    }),
    createSlot('footer', {
      description: 'Optional footer content',
    }),
    createSlot('actions', {
      description: 'Optional action buttons',
    }),
  ],
  
  events: [
    createEvent('harmony-card-expand', {
      description: 'Fired when card is expanded',
      detail: { expanded: 'boolean' },
    }),
    createEvent('harmony-card-action', {
      description: 'Fired when an action is triggered',
      detail: { action: 'string', data: 'object' },
    }),
  ],
  
  lifecycle: {
    onInit() {
      this.state.data.expanded = false;
    },
    
    onConnect() {
      this.setupSlotListeners();
    },
    
    onSlotChange(slotName) {
      console.log(`Slot "${slotName}" content changed`);
      this.requestUpdate();
    },
    
    onError(error) {
      console.error('Card component error:', error);
      this.state.lastError = error;
    },
  },
  
  observedAttributes: ['title', 'elevation', 'padding'],
  
  render() {
    return `
      <div class="harmony-card harmony-card--elevation-${this.elevation} harmony-card--padding-${this.padding}">
        <slot name="header">
          ${this.title ? `<div class="harmony-card__title">${this.title}</div>` : ''}
        </slot>
        <div class="harmony-card__content">
          <slot></slot>
        </div>
        <slot name="footer"></slot>
        <slot name="actions"></slot>
      </div>
    `;
  },
  
  methods: {
    expand() {
      this.state.data.expanded = true;
      this.dispatchEvent(new CustomEvent('harmony-card-expand', {
        detail: { expanded: true },
      }));
    },
    
    collapse() {
      this.state.data.expanded = false;
      this.dispatchEvent(new CustomEvent('harmony-card-expand', {
        detail: { expanded: false },
      }));
    },
  },
});

// Validate the component definitions
console.log('Button validation:', validateComponentNode(buttonComponentNode));
console.log('Card validation:', validateComponentNode(cardComponentNode));