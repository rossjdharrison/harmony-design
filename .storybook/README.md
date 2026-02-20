# Storybook 8 Configuration

This directory contains the Storybook 8 setup for the Harmony Design System.

## Overview

Storybook serves as the development environment and documentation for all UI components. It uses:

- **Storybook 8**: Latest version with improved performance and features
- **Vite Builder**: Fast builds and HMR for optimal developer experience
- **Web Components**: Native custom elements with Shadow DOM
- **Dark Mode**: Theme switching via addon-themes
- **Accessibility Testing**: Built-in a11y checks via addon-a11y
- **Performance Monitoring**: Automatic render time tracking against 16ms budget

## Configuration Files

### main.js
Main Storybook configuration. Defines:
- Story file locations
- Addons (essentials, a11y, themes, interactions)
- Vite integration with WASM support
- SharedArrayBuffer headers for audio processing
- Performance optimization settings

### preview.js
Preview configuration with global decorators:
- **Performance Monitoring**: Warns if components exceed 16ms render budget
- **EventBus Integration**: Ensures EventBus is available for component testing
- **Shadow DOM Inspector**: Visual indicator for Shadow DOM components
- **Theme Decorator**: Light/dark mode switching

### manager.js
Customizes Storybook UI:
- Brand colors aligned with design system
- Custom typography
- Panel and sidebar configuration

### preview-head.html
Injected into preview iframe:
- Design tokens and global styles
- Performance monitoring scripts
- Dark mode CSS variables
- SharedArrayBuffer meta tags

### test-runner.js
Automated testing configuration:
- Performance budget validation
- Basic accessibility checks
- Pre/post render hooks

## Usage

### Development
```bash
npm run storybook
```

### Build Static Site
```bash
npm run build-storybook
```

### Run Tests
```bash
npm run test-storybook
```

## Writing Stories

Stories should follow this pattern:

```javascript
// my-component.stories.js
export default {
  title: 'Components/MyComponent',
  component: 'my-component',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Description of MyComponent',
      },
    },
  },
};

export const Default = {
  args: {
    label: 'Click me',
  },
};

export const Disabled = {
  args: {
    label: 'Disabled',
    disabled: true,
  },
};
```

## Performance Requirements

All components must meet these budgets:
- **Render Time**: Maximum 16ms (60fps)
- **Memory**: Maximum 50MB WASM heap
- **Load Time**: Maximum 200ms initial load

Storybook automatically monitors and warns about violations.

## Dark Mode

Use the theme toolbar button to toggle between light and dark modes. Components should respond to CSS custom properties:

```css
:host {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

## Accessibility

All stories are automatically tested for basic accessibility issues:
- Missing alt text on images
- Buttons without accessible labels
- Color contrast (via addon-a11y)

Disable for specific stories if needed:
```javascript
export const MyStory = {
  parameters: {
    a11y: false,
  },
};
```

## Related Documentation

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#storybook-configuration) - Main documentation
- [Component Guidelines](../docs/component-guidelines.md)
- [Testing Strategy](../docs/testing-strategy.md)