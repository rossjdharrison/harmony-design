/**
 * Storybook Preview Configuration
 * 
 * Global configuration for all stories including:
 * - Theme setup
 * - EventBus integration for debugging
 * - Performance monitoring
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#storybook-preview
 */

// Import EventBus for debugging capabilities
import '../src/infrastructure/event-bus.js';

/**
 * Global decorator to add EventBus debugging to all stories
 */
const withEventBus = (story, context) => {
  const container = document.createElement('div');
  container.style.position = 'relative';
  
  // Add story content
  const storyContent = story();
  container.appendChild(storyContent);
  
  // Add EventBus component for debugging (Ctrl+Shift+E)
  const eventBus = document.createElement('event-bus-component');
  eventBus.style.position = 'fixed';
  eventBus.style.bottom = '20px';
  eventBus.style.right = '20px';
  eventBus.style.zIndex = '10000';
  container.appendChild(eventBus);
  
  return container;
};

/**
 * Performance monitoring decorator
 * Tracks render time and warns if exceeding 16ms budget
 */
const withPerformanceMonitoring = (story, context) => {
  const startTime = performance.now();
  const result = story();
  
  // Monitor on next frame
  requestAnimationFrame(() => {
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`⚠️ Story "${context.name}" exceeded 16ms render budget: ${renderTime.toFixed(2)}ms`);
    }
  });
  
  return result;
};

export const decorators = [withEventBus, withPerformanceMonitoring];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  },
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#ffffff' },
      { name: 'dark', value: '#1a1a1a' },
      { name: 'gray', value: '#f5f5f5' }
    ]
  },
  viewport: {
    viewports: {
      mobile: {
        name: 'Mobile',
        styles: { width: '375px', height: '667px' }
      },
      tablet: {
        name: 'Tablet',
        styles: { width: '768px', height: '1024px' }
      },
      desktop: {
        name: 'Desktop',
        styles: { width: '1440px', height: '900px' }
      }
    }
  }
};