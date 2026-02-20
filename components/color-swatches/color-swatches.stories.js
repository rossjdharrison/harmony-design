/**
 * @fileoverview Storybook stories for Color Swatches component
 * @module components/color-swatches/stories
 */

export default {
  title: 'Components/Color Swatches',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Color swatches component with preset color palette and recent colors tracking. Supports keyboard navigation and localStorage persistence.',
      },
    },
  },
  argTypes: {
    onColorSelected: { action: 'color-selected' },
  },
};

/**
 * Default color swatches
 */
export const Default = {
  render: (args) => {
    const container = document.createElement('div');
    container.innerHTML = `
      <harmony-color-swatches></harmony-color-swatches>
      <div id="selected-color" style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
        <strong>Selected Color:</strong> <span id="color-value">None</span>
        <div id="color-preview" style="margin-top: 8px; width: 100%; height: 40px; border-radius: 4px; border: 1px solid #ddd;"></div>
      </div>
    `;

    const swatches = container.querySelector('harmony-color-swatches');
    const colorValue = container.querySelector('#color-value');
    const colorPreview = container.querySelector('#color-preview');

    swatches.addEventListener('color-selected', (event) => {
      const { color } = event.detail;
      colorValue.textContent = color;
      colorPreview.style.backgroundColor = color;
      args.onColorSelected?.(event);
    });

    return container;
  },
};

/**
 * With initial selection
 */
export const WithInitialSelection = {
  render: (args) => {
    const container = document.createElement('div');
    container.innerHTML = `
      <harmony-color-swatches></harmony-color-swatches>
      <div id="selected-color" style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
        <strong>Selected Color:</strong> <span id="color-value">#2196F3</span>
        <div id="color-preview" style="margin-top: 8px; width: 100%; height: 40px; border-radius: 4px; border: 1px solid #ddd; background-color: #2196F3;"></div>
      </div>
    `;

    const swatches = container.querySelector('harmony-color-swatches');
    const colorValue = container.querySelector('#color-value');
    const colorPreview = container.querySelector('#color-preview');

    // Set initial color
    setTimeout(() => {
      swatches.setSelectedColor('#2196F3');
    }, 0);

    swatches.addEventListener('color-selected', (event) => {
      const { color } = event.detail;
      colorValue.textContent = color;
      colorPreview.style.backgroundColor = color;
      args.onColorSelected?.(event);
    });

    return container;
  },
};

/**
 * With recent colors
 */
export const WithRecentColors = {
  render: (args) => {
    const container = document.createElement('div');
    container.innerHTML = `
      <p style="margin-bottom: 16px; color: #666;">
        Click some colors to populate the recent colors section. Recent colors are persisted in localStorage.
      </p>
      <harmony-color-swatches></harmony-color-swatches>
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button id="clear-recent" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">
          Clear Recent Colors
        </button>
      </div>
      <div id="selected-color" style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
        <strong>Selected Color:</strong> <span id="color-value">None</span>
        <div id="color-preview" style="margin-top: 8px; width: 100%; height: 40px; border-radius: 4px; border: 1px solid #ddd;"></div>
      </div>
    `;

    const swatches = container.querySelector('harmony-color-swatches');
    const colorValue = container.querySelector('#color-value');
    const colorPreview = container.querySelector('#color-preview');
    const clearButton = container.querySelector('#clear-recent');

    swatches.addEventListener('color-selected', (event) => {
      const { color } = event.detail;
      colorValue.textContent = color;
      colorPreview.style.backgroundColor = color;
      args.onColorSelected?.(event);
    });

    clearButton.addEventListener('click', () => {
      swatches.clearRecentColors();
    });

    return container;
  },
};

/**
 * Keyboard navigation demo
 */
export const KeyboardNavigation = {
  render: (args) => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <strong>Keyboard Navigation:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>Arrow keys: Navigate between swatches</li>
          <li>Enter/Space: Select focused swatch</li>
          <li>Home: Jump to first swatch</li>
          <li>End: Jump to last swatch</li>
        </ul>
      </div>
      <harmony-color-swatches></harmony-color-swatches>
      <div id="selected-color" style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
        <strong>Selected Color:</strong> <span id="color-value">None</span>
        <div id="color-preview" style="margin-top: 8px; width: 100%; height: 40px; border-radius: 4px; border: 1px solid #ddd;"></div>
      </div>
    `;

    const swatches = container.querySelector('harmony-color-swatches');
    const colorValue = container.querySelector('#color-value');
    const colorPreview = container.querySelector('#color-preview');

    swatches.addEventListener('color-selected', (event) => {
      const { color } = event.detail;
      colorValue.textContent = color;
      colorPreview.style.backgroundColor = color;
      args.onColorSelected?.(event);
    });

    return container;
  },
};

/**
 * Compact size
 */
export const CompactSize = {
  render: (args) => {
    const container = document.createElement('div');
    container.innerHTML = `
      <style>
        .compact harmony-color-swatches {
          font-size: 11px;
        }
        .compact harmony-color-swatches::part(swatch) {
          width: 20px;
          height: 20px;
        }
      </style>
      <div class="compact">
        <harmony-color-swatches></harmony-color-swatches>
      </div>
      <div id="selected-color" style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
        <strong>Selected Color:</strong> <span id="color-value">None</span>
        <div id="color-preview" style="margin-top: 8px; width: 100%; height: 40px; border-radius: 4px; border: 1px solid #ddd;"></div>
      </div>
    `;

    const swatches = container.querySelector('harmony-color-swatches');
    const colorValue = container.querySelector('#color-value');
    const colorPreview = container.querySelector('#color-preview');

    swatches.addEventListener('color-selected', (event) => {
      const { color } = event.detail;
      colorValue.textContent = color;
      colorPreview.style.backgroundColor = color;
      args.onColorSelected?.(event);
    });

    return container;
  },
};

/**
 * Integration with color input
 */
export const WithColorInput = {
  render: (args) => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">
            Select or enter a color:
          </label>
          <harmony-color-input></harmony-color-input>
        </div>
        <harmony-color-swatches></harmony-color-swatches>
      </div>
    `;

    const swatches = container.querySelector('harmony-color-swatches');
    const colorInput = container.querySelector('harmony-color-input');

    // Sync swatch selection to input
    swatches.addEventListener('color-selected', (event) => {
      const { color } = event.detail;
      if (colorInput && typeof colorInput.setValue === 'function') {
        colorInput.setValue(color);
      }
      args.onColorSelected?.(event);
    });

    // Sync input changes to swatch selection
    if (colorInput) {
      colorInput.addEventListener('color-changed', (event) => {
        const { hex } = event.detail;
        if (hex) {
          swatches.setSelectedColor(hex);
        }
      });
    }

    return container;
  },
};