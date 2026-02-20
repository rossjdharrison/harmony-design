/**
 * Storybook 8 Main Configuration
 * 
 * Configures Storybook with Vite builder for optimal performance.
 * Uses vanilla Web Components - no framework integration needed.
 * 
 * @see DESIGN_SYSTEM.md#storybook-configuration
 */

export default {
  stories: [
    '../components/**/*.stories.js',
    '../primitives/**/*.stories.js',
    '../organisms/**/*.stories.js',
    '../templates/**/*.stories.js',
    '../examples/**/*.stories.js',
  ],
  
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  
  core: {
    builder: '@storybook/builder-vite',
  },
  
  viteFinal: async (config) => {
    // Ensure WASM files are properly handled
    config.assetsInclude = config.assetsInclude || [];
    config.assetsInclude.push('**/*.wasm');
    
    // Enable SharedArrayBuffer for audio processing
    config.server = config.server || {};
    config.server.headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    };
    
    // Optimize build for performance budget (200ms initial load)
    config.build = config.build || {};
    config.build.target = 'esnext';
    config.build.minify = 'esbuild';
    config.build.rollupOptions = {
      output: {
        manualChunks: {
          'wasm-modules': ['./bounded-contexts/*/pkg/*.js'],
        },
      },
    };
    
    return config;
  },
  
  docs: {
    autodocs: 'tag',
  },
  
  staticDirs: ['../public', '../assets'],
};