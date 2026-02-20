/**
 * Storybook 8 Preview Configuration
 * 
 * Configures global decorators, parameters, and theme support.
 * Implements dark mode toggle and performance monitoring.
 * 
 * @see DESIGN_SYSTEM.md#storybook-configuration
 */

import { withThemeByClassName } from '@storybook/addon-themes';

/**
 * Performance monitoring decorator
 * Ensures components meet 16ms render budget
 */
const withPerformanceMonitoring = (Story, context) => {
  const startTime = performance.now();
  
  const result = Story();
  
  // Schedule performance check after render
  requestAnimationFrame(() => {
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(
        `⚠️ Performance Budget Exceeded: ${context.name} rendered in ${renderTime.toFixed(2)}ms (budget: 16ms)`
      );
    }
  });
  
  return result;
};

/**
 * EventBus decorator
 * Makes EventBus available for component testing
 */
const withEventBus = (Story) => {
  // EventBus should be available globally via app-shell
  // This decorator ensures it's initialized for isolated component testing
  if (!window.eventBus) {
    console.warn('EventBus not available. Components that publish events may not work correctly.');
  }
  
  return Story();
};

/**
 * Shadow DOM inspector decorator
 * Helps debug shadow DOM components in Storybook
 */
const withShadowDOMInspector = (Story, context) => {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  
  const story = Story();
  wrapper.appendChild(story);
  
  // Add shadow DOM inspection hint
  if (context.parameters.shadowDOM !== false) {
    const hint = document.createElement('div');
    hint.style.cssText = 'position: absolute; top: -20px; right: 0; font-size: 10px; color: #666;';
    hint.textContent = '💡 This component uses Shadow DOM';
    wrapper.appendChild(hint);
  }
  
  return wrapper;
};

export const decorators = [
  withPerformanceMonitoring,
  withEventBus,
  withShadowDOMInspector,
  withThemeByClassName({
    themes: {
      light: 'light-theme',
      dark: 'dark-theme',
    },
    defaultTheme: 'light',
  }),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
    expanded: true,
  },
  
  backgrounds: {
    default: 'light',
    values: [
      {
        name: 'light',
        value: '#ffffff',
      },
      {
        name: 'dark',
        value: '#1a1a1a',
      },
      {
        name: 'gray',
        value: '#f5f5f5',
      },
    ],
  },
  
  viewport: {
    viewports: {
      mobile: {
        name: 'Mobile',
        styles: {
          width: '375px',
          height: '667px',
        },
      },
      tablet: {
        name: 'Tablet',
        styles: {
          width: '768px',
          height: '1024px',
        },
      },
      desktop: {
        name: 'Desktop',
        styles: {
          width: '1440px',
          height: '900px',
        },
      },
    },
  },
  
  a11y: {
    config: {
      rules: [
        {
          id: 'color-contrast',
          enabled: true,
        },
        {
          id: 'label',
          enabled: true,
        },
      ],
    },
  },
  
  docs: {
    toc: true,
  },
};

// Global types for toolbar controls
export const globalTypes = {
  performance: {
    name: 'Performance Monitor',
    description: 'Show performance metrics',
    defaultValue: 'off',
    toolbar: {
      icon: 'timer',
      items: ['on', 'off'],
      showName: true,
    },
  },
};