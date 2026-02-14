/**
 * Storybook Main Configuration
 * 
 * Configures Storybook to work with vanilla Web Components.
 * Uses minimal dependencies - Storybook is a dev tool only.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#storybook-integration
 */
export default {
  stories: ['../src/components/**/*.stories.js'],
  staticDirs: ['../public'],
  
  framework: {
    name: '@storybook/web-components-vite',
    options: {}
  },
  
  core: {
    disableTelemetry: true
  },
  
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y'
  ],
  
  // Performance optimization for dev server
  viteFinal: async (config) => {
    config.server = {
      ...config.server,
      hmr: {
        overlay: false
      }
    };
    return config;
  }
};