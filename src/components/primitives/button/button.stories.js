/**
 * Button Component Stories
 * 
 * Demonstrates all states and variants of the button primitive.
 * Tests: default, hover, focus, active, disabled states.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#button-component
 */

import './button.js';

export default {
  title: 'Primitives/Button',
  component: 'harmony-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'danger'],
      description: 'Visual style variant'
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Button size'
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state'
    },
    label: {
      control: 'text',
      description: 'Button text content'
    }
  }
};

/**
 * Default button state
 */
export const Default = {
  args: {
    label: 'Click Me',
    variant: 'primary',
    size: 'medium',
    disabled: false
  },
  render: (args) => {
    const button = document.createElement('harmony-button');
    button.setAttribute('variant', args.variant);
    button.setAttribute('size', args.size);
    if (args.disabled) button.setAttribute('disabled', '');
    button.textContent = args.label;
    return button;
  }
};

/**
 * All variants side by side
 */
export const Variants = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.alignItems = 'center';
    
    ['primary', 'secondary', 'tertiary', 'danger'].forEach(variant => {
      const button = document.createElement('harmony-button');
      button.setAttribute('variant', variant);
      button.textContent = variant.charAt(0).toUpperCase() + variant.slice(1);
      container.appendChild(button);
    });
    
    return container;
  }
};

/**
 * All sizes comparison
 */
export const Sizes = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.alignItems = 'center';
    
    ['small', 'medium', 'large'].forEach(size => {
      const button = document.createElement('harmony-button');
      button.setAttribute('size', size);
      button.textContent = size.charAt(0).toUpperCase() + size.slice(1);
      container.appendChild(button);
    });
    
    return container;
  }
};

/**
 * Disabled state demonstration
 */
export const Disabled = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '1rem';
    
    ['primary', 'secondary', 'tertiary', 'danger'].forEach(variant => {
      const button = document.createElement('harmony-button');
      button.setAttribute('variant', variant);
      button.setAttribute('disabled', '');
      button.textContent = `${variant} (disabled)`;
      container.appendChild(button);
    });
    
    return container;
  }
};

/**
 * Interactive state testing
 * Demonstrates hover, focus, and active states
 */
export const InteractiveStates = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1rem';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Interact with buttons to test hover, focus, and active states:';
    instructions.style.marginBottom = '1rem';
    container.appendChild(instructions);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '1rem';
    
    const button1 = document.createElement('harmony-button');
    button1.textContent = 'Hover Me';
    
    const button2 = document.createElement('harmony-button');
    button2.textContent = 'Focus Me (Tab)';
    
    const button3 = document.createElement('harmony-button');
    button3.textContent = 'Click Me';
    button3.addEventListener('click', () => {
      alert('Button clicked! Event published to EventBus.');
    });
    
    buttonContainer.appendChild(button1);
    buttonContainer.appendChild(button2);
    buttonContainer.appendChild(button3);
    container.appendChild(buttonContainer);
    
    return container;
  }
};