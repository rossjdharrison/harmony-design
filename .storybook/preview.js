/**
 * @fileoverview Storybook Preview Configuration
 * @module .storybook/preview
 * 
 * Configures the preview iframe where stories are rendered.
 * Sets up global decorators, parameters, and theme integration.
 * 
 * @see {@link https://storybook.js.org/docs/react/configure/overview#configure-story-rendering|Preview Configuration}
 */

import './theme-variables.css';

/**
 * Global parameters for all stories
 * Controls the behavior and appearance of the preview
 */
export const parameters = {
  // Actions configuration
  actions: { 
    argTypesRegex: '^on[A-Z].*' 
  },
  
  // Controls configuration
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
    expanded: true,
    sort: 'requiredFirst',
  },
  
  // Docs configuration
  docs: {
    theme: undefined, // Will be set based on user preference
    toc: {
      contentsSelector: '.sbdocs-content',
      headingSelector: 'h1, h2, h3',
      title: 'Table of Contents',
      disable: false,
    },
  },
  
  // Layout configuration
  layout: 'centered',
  
  // Backgrounds configuration - matches Harmony Design System
  backgrounds: {
    default: 'light',
    values: [
      {
        name: 'light',
        value: '#ffffff',
      },
      {
        name: 'surface',
        value: '#f8fafc',
      },
      {
        name: 'dark',
        value: '#0f172a',
      },
      {
        name: 'surface-dark',
        value: '#1e293b',
      },
    ],
  },
  
  // Viewport configuration
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
          width: '1280px',
          height: '800px',
        },
      },
      wide: {
        name: 'Wide',
        styles: {
          width: '1920px',
          height: '1080px',
        },
      },
    },
  },
  
  // Options configuration
  options: {
    storySort: {
      order: [
        'Introduction',
        'Design Tokens',
        ['Colors', 'Typography', 'Spacing', 'Shadows'],
        'Primitives',
        'Components',
        'Organisms',
        'Templates',
        'Examples',
      ],
    },
  },
};

/**
 * Global decorators for all stories
 * Wraps each story with common functionality
 */
export const decorators = [
  /**
   * Theme decorator - applies theme class to story wrapper
   */
  (Story, context) => {
    const theme = context.globals.theme || 'light';
    
    return `
      <div class="harmony-theme-wrapper" data-theme="${theme}">
        ${Story()}
      </div>
    `;
  },
  
  /**
   * Performance monitoring decorator
   * Logs render time to console in development
   */
  (Story, context) => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      const result = Story();
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Warn if render exceeds 16ms budget
      if (renderTime > 16) {
        console.warn(
          `Story "${context.name}" exceeded render budget: ${renderTime.toFixed(2)}ms`
        );
      }
    }
    
    return Story();
  },
];

/**
 * Global types for toolbar controls
 * Adds theme switcher to toolbar
 */
export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', icon: 'circlehollow', title: 'Light' },
        { value: 'dark', icon: 'circle', title: 'Dark' },
      ],
      showName: true,
      dynamicTitle: true,
    },
  },
};