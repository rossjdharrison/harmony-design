/**
 * Slider Component Stories
 * 
 * Demonstrates slider control for audio parameters.
 * Tests: default, disabled, different ranges, step values.
 * Performance: Must maintain 60fps during drag operations.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#slider-component
 */

import './slider.js';

export default {
  title: 'Primitives/Slider',
  component: 'harmony-slider',
  tags: ['autodocs'],
  argTypes: {
    min: {
      control: 'number',
      description: 'Minimum value'
    },
    max: {
      control: 'number',
      description: 'Maximum value'
    },
    value: {
      control: 'number',
      description: 'Current value'
    },
    step: {
      control: 'number',
      description: 'Step increment'
    },
    label: {
      control: 'text',
      description: 'Slider label'
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state'
    }
  }
};

/**
 * Default slider (0-100 range)
 */
export const Default = {
  args: {
    min: 0,
    max: 100,
    value: 50,
    step: 1,
    label: 'Volume',
    disabled: false
  },
  render: (args) => {
    const slider = document.createElement('harmony-slider');
    slider.setAttribute('min', args.min);
    slider.setAttribute('max', args.max);
    slider.setAttribute('value', args.value);
    slider.setAttribute('step', args.step);
    slider.setAttribute('label', args.label);
    if (args.disabled) slider.setAttribute('disabled', '');
    return slider;
  }
};

/**
 * Audio parameter sliders
 */
export const AudioParameters = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '2rem';
    container.style.maxWidth = '400px';
    
    const configs = [
      { label: 'Volume', min: 0, max: 100, value: 75, step: 1 },
      { label: 'Pan', min: -100, max: 100, value: 0, step: 1 },
      { label: 'Frequency (Hz)', min: 20, max: 20000, value: 440, step: 1 },
      { label: 'Resonance', min: 0, max: 1, value: 0.5, step: 0.01 }
    ];
    
    configs.forEach(config => {
      const slider = document.createElement('harmony-slider');
      slider.setAttribute('label', config.label);
      slider.setAttribute('min', config.min);
      slider.setAttribute('max', config.max);
      slider.setAttribute('value', config.value);
      slider.setAttribute('step', config.step);
      
      // Add value display
      const wrapper = document.createElement('div');
      const valueDisplay = document.createElement('div');
      valueDisplay.textContent = `Current: ${config.value}`;
      valueDisplay.style.marginTop = '0.5rem';
      valueDisplay.style.fontSize = '0.875rem';
      valueDisplay.style.color = '#666';
      
      slider.addEventListener('change', (e) => {
        valueDisplay.textContent = `Current: ${e.detail.value}`;
      });
      
      wrapper.appendChild(slider);
      wrapper.appendChild(valueDisplay);
      container.appendChild(wrapper);
    });
    
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
    
    const slider = document.createElement('harmony-slider');
    slider.setAttribute('label', 'Disabled Slider');
    slider.setAttribute('min', '0');
    slider.setAttribute('max', '100');
    slider.setAttribute('value', '50');
    slider.setAttribute('disabled', '');
    
    container.appendChild(slider);
    return container;
  }
};

/**
 * Performance test - multiple sliders
 * Should maintain 60fps during simultaneous drag operations
 */
export const PerformanceTest = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    container.style.gap = '1rem';
    container.style.maxWidth = '800px';
    
    const perfInfo = document.createElement('div');
    perfInfo.style.gridColumn = '1 / -1';
    perfInfo.style.padding = '1rem';
    perfInfo.style.background = '#f5f5f5';
    perfInfo.style.borderRadius = '4px';
    perfInfo.textContent = 'Drag multiple sliders simultaneously to test performance. Target: 60fps';
    container.appendChild(perfInfo);
    
    // Create 12 sliders
    for (let i = 0; i < 12; i++) {
      const slider = document.createElement('harmony-slider');
      slider.setAttribute('label', `Param ${i + 1}`);
      slider.setAttribute('min', '0');
      slider.setAttribute('max', '100');
      slider.setAttribute('value', Math.floor(Math.random() * 100));
      container.appendChild(slider);
    }
    
    return container;
  }
};