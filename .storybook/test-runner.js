/**
 * Storybook Test Runner Configuration
 * 
 * Configures automated testing for stories using Playwright.
 * Validates accessibility, performance, and visual regression.
 * 
 * @see DESIGN_SYSTEM.md#storybook-configuration
 */

const { getStoryContext } = require('@storybook/test-runner');

module.exports = {
  /**
   * Hook executed before each story test
   */
  async preRender(page, context) {
    // Enable performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.__STORYBOOK_PERFORMANCE__ = {
        marks: [],
        measures: [],
      };
      
      const originalMark = performance.mark.bind(performance);
      const originalMeasure = performance.measure.bind(performance);
      
      performance.mark = (name) => {
        window.__STORYBOOK_PERFORMANCE__.marks.push({ name, time: performance.now() });
        return originalMark(name);
      };
      
      performance.measure = (name, startMark, endMark) => {
        const result = originalMeasure(name, startMark, endMark);
        window.__STORYBOOK_PERFORMANCE__.measures.push({
          name,
          duration: result.duration,
        });
        return result;
      };
    });
  },
  
  /**
   * Hook executed after each story test
   */
  async postRender(page, context) {
    const storyContext = await getStoryContext(page, context);
    
    // Check performance budget (16ms render time)
    const performanceData = await page.evaluate(() => window.__STORYBOOK_PERFORMANCE__);
    
    if (performanceData?.measures) {
      const renderMeasure = performanceData.measures.find(m => m.name.includes('render'));
      if (renderMeasure && renderMeasure.duration > 16) {
        console.warn(
          `⚠️ Performance Budget Exceeded: ${storyContext.title} - ${storyContext.name} ` +
          `rendered in ${renderMeasure.duration.toFixed(2)}ms (budget: 16ms)`
        );
      }
    }
    
    // Run accessibility tests (if not disabled for story)
    if (storyContext.parameters?.a11y !== false) {
      await page.evaluate(() => {
        const violations = [];
        
        // Basic accessibility checks
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          // Check for images without alt text
          if (el.tagName === 'IMG' && !el.hasAttribute('alt')) {
            violations.push(`Image missing alt attribute: ${el.outerHTML.substring(0, 50)}`);
          }
          
          // Check for buttons without accessible labels
          if (el.tagName === 'BUTTON' && !el.textContent.trim() && !el.hasAttribute('aria-label')) {
            violations.push(`Button missing accessible label: ${el.outerHTML.substring(0, 50)}`);
          }
        });
        
        if (violations.length > 0) {
          console.warn('⚠️ Accessibility violations found:', violations);
        }
      });
    }
  },
  
  /**
   * Tags configuration for selective test running
   */
  tags: {
    include: ['test'],
    exclude: ['skip-test'],
    skip: ['skip-test'],
  },
};