/**
 * Example Button Stories
 * 
 * Demonstrates how to write stories for Harmony Design System components.
 * This example shows a simple button component with various states.
 * 
 * @see DESIGN_SYSTEM.md#storybook-configuration
 * @see .storybook/README.md
 */

export default {
  title: 'Examples/Button',
  component: 'example-button',
  tags: ['autodocs'],
  
  parameters: {
    docs: {
      description: {
        component: 'A simple button component demonstrating Storybook integration with Web Components.',
      },
    },
    // Enable performance monitoring for this component
    performance: true,
  },
  
  argTypes: {
    label: {
      control: 'text',
      description: 'Button label text',
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
      description: 'Visual style variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    onClick: {
      action: 'clicked',
      description: 'Click event handler',
    },
  },
};

/**
 * Default button state
 */
export const Default = {
  args: {
    label: 'Click me',
    variant: 'primary',
    disabled: false,
  },
  render: (args) => {
    const button = document.createElement('button');
    button.textContent = args.label;
    button.className = `button button--${args.variant}`;
    button.disabled = args.disabled;
    
    if (args.onClick) {
      button.addEventListener('click', args.onClick);
    }
    
    return button;
  },
};

/**
 * Secondary variant
 */
export const Secondary = {
  args: {
    ...Default.args,
    variant: 'secondary',
  },
  render: Default.render,
};

/**
 * Ghost variant (minimal styling)
 */
export const Ghost = {
  args: {
    ...Default.args,
    variant: 'ghost',
  },
  render: Default.render,
};

/**
 * Disabled state
 */
export const Disabled = {
  args: {
    ...Default.args,
    disabled: true,
  },
  render: Default.render,
  parameters: {
    docs: {
      description: {
        story: 'Button in disabled state. Should not respond to clicks.',
      },
    },
  },
};

/**
 * Long label text
 */
export const LongLabel = {
  args: {
    ...Default.args,
    label: 'This is a very long button label that might wrap',
  },
  render: Default.render,
};

/**
 * All variants side by side
 */
export const AllVariants = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.flexWrap = 'wrap';
    
    const variants = ['primary', 'secondary', 'ghost'];
    
    variants.forEach(variant => {
      const button = document.createElement('button');
      button.textContent = variant.charAt(0).toUpperCase() + variant.slice(1);
      button.className = `button button--${variant}`;
      container.appendChild(button);
    });
    
    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all button variants.',
      },
    },
  },
};