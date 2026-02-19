/**
 * @fileoverview Storybook stories for Harmony Icon component
 * Visual catalog of all available icons with search and filtering
 * @see DESIGN_SYSTEM.md#icon-system
 */

import { IconType } from './icon-types.js';
import './harmony-icon.js';

export default {
  title: 'Primitives/Icons',
  component: 'harmony-icon',
  parameters: {
    docs: {
      description: {
        component: 'Icon component with comprehensive visual catalog. Supports all icon types with consistent sizing and theming.',
      },
    },
  },
  argTypes: {
    icon: {
      control: 'select',
      options: Object.values(IconType),
      description: 'Icon type to display',
    },
    size: {
      control: { type: 'range', min: 12, max: 64, step: 4 },
      description: 'Icon size in pixels',
    },
    color: {
      control: 'color',
      description: 'Icon color (CSS color value)',
    },
  },
};

/**
 * Default icon story
 */
export const Default = {
  args: {
    icon: IconType.PLAY,
    size: 24,
  },
  render: (args) => {
    const icon = document.createElement('harmony-icon');
    icon.setAttribute('icon', args.icon);
    if (args.size) icon.setAttribute('size', args.size);
    if (args.color) icon.setAttribute('color', args.color);
    return icon;
  },
};

/**
 * Icon sizes demonstration
 */
export const Sizes = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 16px; align-items: center; flex-wrap: wrap;';
    
    const sizes = [16, 20, 24, 32, 48, 64];
    sizes.forEach(size => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';
      
      const icon = document.createElement('harmony-icon');
      icon.setAttribute('icon', IconType.PLAY);
      icon.setAttribute('size', size);
      
      const label = document.createElement('span');
      label.textContent = `${size}px`;
      label.style.cssText = 'font-size: 12px; color: var(--color-text-secondary, #666);';
      
      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
    
    return container;
  },
};

/**
 * Playback control icons
 */
export const PlaybackControls = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap;';
    
    const playbackIcons = [
      IconType.PLAY,
      IconType.PAUSE,
      IconType.STOP,
      IconType.RECORD,
      IconType.FAST_FORWARD,
      IconType.REWIND,
      IconType.SKIP_NEXT,
      IconType.SKIP_PREVIOUS,
      IconType.LOOP,
      IconType.SHUFFLE,
    ];
    
    playbackIcons.forEach(iconType => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';
      
      const icon = document.createElement('harmony-icon');
      icon.setAttribute('icon', iconType);
      icon.setAttribute('size', 32);
      
      const label = document.createElement('span');
      label.textContent = iconType;
      label.style.cssText = 'font-size: 12px; color: var(--color-text-secondary, #666);';
      
      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
    
    return container;
  },
};

/**
 * Editing tool icons
 */
export const EditingTools = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap;';
    
    const editingIcons = [
      IconType.CUT,
      IconType.COPY,
      IconType.PASTE,
      IconType.UNDO,
      IconType.REDO,
      IconType.DELETE,
      IconType.DUPLICATE,
      IconType.SPLIT,
      IconType.MERGE,
      IconType.TRIM,
    ];
    
    editingIcons.forEach(iconType => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';
      
      const icon = document.createElement('harmony-icon');
      icon.setAttribute('icon', iconType);
      icon.setAttribute('size', 32);
      
      const label = document.createElement('span');
      label.textContent = iconType;
      label.style.cssText = 'font-size: 12px; color: var(--color-text-secondary, #666);';
      
      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
    
    return container;
  },
};

/**
 * Complete icon catalog with search functionality
 */
export const IconCatalog = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 24px;';
    
    // Search input
    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = 'position: sticky; top: 0; background: var(--color-background, #fff); padding: 16px; border-bottom: 1px solid var(--color-border, #e0e0e0); z-index: 10;';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search icons...';
    searchInput.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--color-border, #e0e0e0);
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    `;
    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = 'var(--color-primary, #007bff)';
    });
    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = 'var(--color-border, #e0e0e0)';
    });
    
    const resultCount = document.createElement('div');
    resultCount.style.cssText = 'margin-top: 8px; font-size: 12px; color: var(--color-text-secondary, #666);';
    
    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(resultCount);
    
    // Icon grid
    const iconGrid = document.createElement('div');
    iconGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 16px;
      padding: 16px;
    `;
    
    // Get all icon types
    const allIcons = Object.values(IconType);
    
    // Function to create icon card
    const createIconCard = (iconType) => {
      const card = document.createElement('div');
      card.className = 'icon-card';
      card.dataset.iconName = iconType.toLowerCase();
      card.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: 1px solid var(--color-border, #e0e0e0);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: var(--color-background, #fff);
      `;
      
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--color-primary, #007bff)';
        card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        card.style.transform = 'translateY(-2px)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--color-border, #e0e0e0)';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
      });
      
      card.addEventListener('click', () => {
        navigator.clipboard.writeText(iconType).then(() => {
          const originalBg = card.style.background;
          card.style.background = 'var(--color-success-light, #d4edda)';
          setTimeout(() => {
            card.style.background = originalBg;
          }, 300);
        });
      });
      
      const icon = document.createElement('harmony-icon');
      icon.setAttribute('icon', iconType);
      icon.setAttribute('size', 32);
      
      const label = document.createElement('span');
      label.textContent = iconType;
      label.style.cssText = `
        font-size: 11px;
        color: var(--color-text-secondary, #666);
        text-align: center;
        word-break: break-word;
        line-height: 1.3;
      `;
      
      card.appendChild(icon);
      card.appendChild(label);
      
      return card;
    };
    
    // Render all icons initially
    const renderIcons = (iconsToShow) => {
      iconGrid.innerHTML = '';
      iconsToShow.forEach(iconType => {
        iconGrid.appendChild(createIconCard(iconType));
      });
      
      resultCount.textContent = `Showing ${iconsToShow.length} of ${allIcons.length} icons`;
    };
    
    renderIcons(allIcons);
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      
      if (!searchTerm) {
        renderIcons(allIcons);
        return;
      }
      
      const filteredIcons = allIcons.filter(iconType => 
        iconType.toLowerCase().includes(searchTerm)
      );
      
      renderIcons(filteredIcons);
    });
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      padding: 16px;
      background: var(--color-info-light, #d1ecf1);
      border-radius: 8px;
      font-size: 14px;
      color: var(--color-text-primary, #333);
    `;
    instructions.innerHTML = `
      <strong>💡 Tip:</strong> Click any icon to copy its name to clipboard. Use the search box to filter icons.
    `;
    
    container.appendChild(instructions);
    container.appendChild(searchWrapper);
    container.appendChild(iconGrid);
    
    return container;
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Complete searchable catalog of all available icons. Click any icon to copy its name.',
      },
    },
  },
};

/**
 * Icon with custom colors
 */
export const CustomColors = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap;';
    
    const colors = [
      { name: 'Primary', value: '#007bff' },
      { name: 'Success', value: '#28a745' },
      { name: 'Warning', value: '#ffc107' },
      { name: 'Danger', value: '#dc3545' },
      { name: 'Info', value: '#17a2b8' },
      { name: 'Dark', value: '#343a40' },
    ];
    
    colors.forEach(({ name, value }) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';
      
      const icon = document.createElement('harmony-icon');
      icon.setAttribute('icon', IconType.HEART);
      icon.setAttribute('size', 32);
      icon.setAttribute('color', value);
      
      const label = document.createElement('span');
      label.textContent = name;
      label.style.cssText = 'font-size: 12px; color: var(--color-text-secondary, #666);';
      
      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
    
    return container;
  },
};

/**
 * Icon states demonstration
 */
export const States = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 32px; flex-wrap: wrap;';
    
    const states = [
      { name: 'Default', styles: {} },
      { name: 'Hover', styles: { filter: 'brightness(1.2)' } },
      { name: 'Active', styles: { transform: 'scale(0.95)' } },
      { name: 'Disabled', styles: { opacity: '0.4', cursor: 'not-allowed' } },
    ];
    
    states.forEach(({ name, styles }) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';
      
      const icon = document.createElement('harmony-icon');
      icon.setAttribute('icon', IconType.SETTINGS);
      icon.setAttribute('size', 32);
      Object.assign(icon.style, styles);
      
      const label = document.createElement('span');
      label.textContent = name;
      label.style.cssText = 'font-size: 12px; color: var(--color-text-secondary, #666);';
      
      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
    
    return container;
  },
};