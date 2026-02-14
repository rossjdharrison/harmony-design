/**
 * Input Component Stories
 * 
 * Demonstrates text input primitive in all states.
 * Tests: default, focus, error, disabled, with label and helper text.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#input-component
 */

import './input.js';

export default {
  title: 'Primitives/Input',
  component: 'harmony-input',
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      description: 'Input type'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    label: {
      control: 'text',
      description: 'Label text'
    },
    helperText: {
      control: 'text',
      description: 'Helper text below input'
    },
    error: {
      control: 'boolean',
      description: 'Error state'
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state'
    },
    required: {
      control: 'boolean',
      description: 'Required field'
    }
  }
};

/**
 * Default input state
 */
export const Default = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    label: 'Label',
    helperText: 'Helper text goes here',
    error: false,
    disabled: false,
    required: false
  },
  render: (args) => {
    const input = document.createElement('harmony-input');
    input.setAttribute('type', args.type);
    input.setAttribute('placeholder', args.placeholder);
    input.setAttribute('label', args.label);
    input.setAttribute('helper-text', args.helperText);
    if (args.error) input.setAttribute('error', '');
    if (args.disabled) input.setAttribute('disabled', '');
    if (args.required) input.setAttribute('required', '');
    return input;
  }
};

/**
 * All input types
 */
export const Types = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1.5rem';
    container.style.maxWidth = '400px';
    
    const types = [
      { type: 'text', label: 'Text Input', placeholder: 'Enter text' },
      { type: 'email', label: 'Email Input', placeholder: 'user@example.com' },
      { type: 'password', label: 'Password Input', placeholder: '••••••••' },
      { type: 'number', label: 'Number Input', placeholder: '123' },
      { type: 'tel', label: 'Phone Input', placeholder: '+1 (555) 000-0000' },
      { type: 'url', label: 'URL Input', placeholder: 'https://example.com' }
    ];
    
    types.forEach(({ type, label, placeholder }) => {
      const input = document.createElement('harmony-input');
      input.setAttribute('type', type);
      input.setAttribute('label', label);
      input.setAttribute('placeholder', placeholder);
      container.appendChild(input);
    });
    
    return container;
  }
};

/**
 * Error state demonstration
 */
export const ErrorState = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1.5rem';
    container.style.maxWidth = '400px';
    
    const input1 = document.createElement('harmony-input');
    input1.setAttribute('label', 'Email');
    input1.setAttribute('type', 'email');
    input1.setAttribute('error', '');
    input1.setAttribute('helper-text', 'Please enter a valid email address');
    input1.value = 'invalid-email';
    
    const input2 = document.createElement('harmony-input');
    input2.setAttribute('label', 'Password');
    input2.setAttribute('type', 'password');
    input2.setAttribute('error', '');
    input2.setAttribute('helper-text', 'Password must be at least 8 characters');
    input2.value = 'short';
    
    container.appendChild(input1);
    container.appendChild(input2);
    
    return container;
  }
};

/**
 * Disabled state
 */
export const Disabled = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    
    const input = document.createElement('harmony-input');
    input.setAttribute('label', 'Disabled Input');
    input.setAttribute('placeholder', 'Cannot edit this');
    input.setAttribute('disabled', '');
    input.value = 'Disabled value';
    
    container.appendChild(input);
    return container;
  }
};

/**
 * Required field with validation
 */
export const Required = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '400px';
    
    const input = document.createElement('harmony-input');
    input.setAttribute('label', 'Required Field');
    input.setAttribute('placeholder', 'This field is required');
    input.setAttribute('required', '');
    input.setAttribute('helper-text', 'This field must be filled out');
    
    container.appendChild(input);
    return container;
  }
};