/**
 * @fileoverview Render Performance Tests
 * Measures render time, FPS, and frame consistency for complex components
 * 
 * Performance Targets:
 * - Initial render: < 16ms (60fps budget)
 * - Re-render: < 8ms
 * - Animation FPS: >= 60fps
 * - Frame drop threshold: < 5% frames dropped
 * 
 * @see DESIGN_SYSTEM.md#performance-testing
 */

import { PerformanceMonitor } from '../../performance/performance-monitor.js';

/**
 * Frame Performance Analyzer
 * Tracks FPS, frame drops, and render consistency
 */
class FrameAnalyzer {
  constructor() {
    this.frames = [];
    this.startTime = null;
    this.rafId = null;
  }

  /**
   * Start measuring frame performance
   * @param {number} duration - Duration in milliseconds
   * @returns {Promise<FrameMetrics>}
   */
  measure(duration) {
    return new Promise((resolve) => {
      this.frames = [];
      this.startTime = performance.now();
      const endTime = this.startTime + duration;

      const recordFrame = (timestamp) => {
        if (timestamp < endTime) {
          this.frames.push(timestamp);
          this.rafId = requestAnimationFrame(recordFrame);
        } else {
          this.stop();
          resolve(this.analyze());
        }
      };

      this.rafId = requestAnimationFrame(recordFrame);
    });
  }

  /**
   * Stop measuring
   */
  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Analyze collected frame data
   * @returns {FrameMetrics}
   */
  analyze() {
    if (this.frames.length < 2) {
      return {
        fps: 0,
        avgFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: 0,
        frameDrops: 0,
        frameDropPercentage: 0,
        jank: 0
      };
    }

    const frameTimes = [];
    for (let i = 1; i < this.frames.length; i++) {
      frameTimes.push(this.frames[i] - this.frames[i - 1]);
    }

    const totalTime = this.frames[this.frames.length - 1] - this.frames[0];
    const fps = (this.frames.length / totalTime) * 1000;
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const maxFrameTime = Math.max(...frameTimes);
    const minFrameTime = Math.min(...frameTimes);

    // Count frame drops (frames that took > 16.67ms = 60fps budget)
    const frameDropThreshold = 16.67;
    const frameDrops = frameTimes.filter(t => t > frameDropThreshold).length;
    const frameDropPercentage = (frameDrops / frameTimes.length) * 100;

    // Jank detection: frames that took > 2x expected time
    const jankThreshold = frameDropThreshold * 2;
    const jank = frameTimes.filter(t => t > jankThreshold).length;

    return {
      fps,
      avgFrameTime,
      maxFrameTime,
      minFrameTime,
      frameDrops,
      frameDropPercentage,
      jank,
      totalFrames: this.frames.length,
      duration: totalTime
    };
  }
}

/**
 * Render Performance Tester
 * Measures component render performance
 */
class RenderPerformanceTester {
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.frameAnalyzer = new FrameAnalyzer();
  }

  /**
   * Measure initial render time
   * @param {Function} createComponent - Function that creates and appends component
   * @param {HTMLElement} container - Container element
   * @returns {Promise<RenderMetrics>}
   */
  async measureInitialRender(createComponent, container) {
    const startMark = 'render-start';
    const endMark = 'render-end';

    performance.mark(startMark);

    const component = await createComponent();
    container.appendChild(component);

    // Wait for next frame to ensure render is complete
    await new Promise(resolve => requestAnimationFrame(resolve));

    performance.mark(endMark);
    const measure = performance.measure('initial-render', startMark, endMark);

    // Get paint metrics
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(e => e.name === 'first-paint');
    const firstContentfulPaint = paintEntries.find(e => e.name === 'first-contentful-paint');

    return {
      renderTime: measure.duration,
      firstPaint: firstPaint?.startTime || 0,
      firstContentfulPaint: firstContentfulPaint?.startTime || 0,
      component
    };
  }

  /**
   * Measure re-render time
   * @param {HTMLElement} component - Component to re-render
   * @param {Function} updateFn - Function that triggers re-render
   * @param {number} iterations - Number of re-renders to measure
   * @returns {Promise<ReRenderMetrics>}
   */
  async measureReRender(component, updateFn, iterations = 10) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      await updateFn(component, i);
      
      // Wait for next frame
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const end = performance.now();
      times.push(end - start);
    }

    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      times
    };
  }

  /**
   * Measure animation performance
   * @param {HTMLElement} component - Component with animation
   * @param {Function} startAnimation - Function to start animation
   * @param {number} duration - Duration to measure in ms
   * @returns {Promise<AnimationMetrics>}
   */
  async measureAnimation(component, startAnimation, duration = 1000) {
    // Start animation
    startAnimation(component);

    // Measure frame performance
    const frameMetrics = await this.frameAnalyzer.measure(duration);

    return {
      ...frameMetrics,
      meetsTarget: frameMetrics.fps >= 60 && frameMetrics.frameDropPercentage < 5
    };
  }

  /**
   * Measure complex component with many children
   * @param {Function} createComponent - Component factory
   * @param {number} childCount - Number of children to create
   * @returns {Promise<ComplexRenderMetrics>}
   */
  async measureComplexRender(createComponent, childCount) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; top: -9999px; left: -9999px;';
    document.body.appendChild(container);

    try {
      const startTime = performance.now();
      const startMemory = performance.memory?.usedJSHeapSize || 0;

      const component = await createComponent(childCount);
      container.appendChild(component);

      // Wait for render
      await new Promise(resolve => requestAnimationFrame(resolve));

      const endTime = performance.now();
      const endMemory = performance.memory?.usedJSHeapSize || 0;

      // Measure layout metrics
      const layoutStart = performance.now();
      const rect = component.getBoundingClientRect();
      const layoutEnd = performance.now();

      return {
        renderTime: endTime - startTime,
        layoutTime: layoutEnd - layoutStart,
        memoryUsed: endMemory - startMemory,
        childCount,
        meetsRenderBudget: (endTime - startTime) < 16
      };
    } finally {
      document.body.removeChild(container);
    }
  }

  /**
   * Stress test with rapid updates
   * @param {HTMLElement} component - Component to test
   * @param {Function} updateFn - Update function
   * @param {number} updatesPerSecond - Target update rate
   * @param {number} duration - Test duration in ms
   * @returns {Promise<StressTestMetrics>}
   */
  async stressTest(component, updateFn, updatesPerSecond = 60, duration = 1000) {
    const interval = 1000 / updatesPerSecond;
    const updates = [];
    let updateCount = 0;

    const startTime = performance.now();
    const frameMetricsPromise = this.frameAnalyzer.measure(duration);

    const updateInterval = setInterval(() => {
      const updateStart = performance.now();
      updateFn(component, updateCount++);
      const updateEnd = performance.now();
      updates.push(updateEnd - updateStart);
    }, interval);

    const frameMetrics = await frameMetricsPromise;
    clearInterval(updateInterval);

    const endTime = performance.now();

    return {
      ...frameMetrics,
      actualUpdates: updateCount,
      expectedUpdates: Math.floor(duration / interval),
      avgUpdateTime: updates.reduce((a, b) => a + b, 0) / updates.length,
      maxUpdateTime: Math.max(...updates),
      totalDuration: endTime - startTime
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.frameAnalyzer.stop();
  }
}

/**
 * Test helper to create a complex component
 * @param {number} childCount - Number of children
 * @returns {HTMLElement}
 */
function createComplexComponent(childCount = 100) {
  const component = document.createElement('div');
  component.className = 'complex-component';
  component.style.cssText = 'display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px;';

  for (let i = 0; i < childCount; i++) {
    const child = document.createElement('div');
    child.className = 'child-item';
    child.style.cssText = `
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, hsl(${i * 3.6}, 70%, 50%), hsl(${i * 3.6 + 60}, 70%, 60%));
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    `;
    child.textContent = i;
    component.appendChild(child);
  }

  return component;
}

/**
 * Test helper to create an animated component
 * @returns {HTMLElement}
 */
function createAnimatedComponent() {
  const component = document.createElement('div');
  component.className = 'animated-component';
  component.style.cssText = `
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
  `;

  return component;
}

/**
 * Start rotation animation
 * @param {HTMLElement} element
 */
function startRotationAnimation(element) {
  let rotation = 0;
  
  function animate() {
    rotation = (rotation + 2) % 360;
    element.style.transform = `rotate(${rotation}deg) scale(${1 + Math.sin(rotation * Math.PI / 180) * 0.2})`;
    requestAnimationFrame(animate);
  }
  
  animate();
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Render Performance Tests', () => {
  let tester;
  let container;

  beforeEach(() => {
    tester = new RenderPerformanceTester();
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    tester.cleanup();
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('Initial Render Performance', () => {
    it('should render simple component within 16ms budget', async () => {
      const metrics = await tester.measureInitialRender(
        () => Promise.resolve(createComplexComponent(10)),
        container
      );

      console.log('Simple component render:', metrics);
      expect(metrics.renderTime).toBeLessThan(16);
    });

    it('should render complex component (100 children) within budget', async () => {
      const metrics = await tester.measureInitialRender(
        () => Promise.resolve(createComplexComponent(100)),
        container
      );

      console.log('Complex component render:', metrics);
      expect(metrics.renderTime).toBeLessThan(16);
    });

    it('should measure render time for very complex component (500 children)', async () => {
      const metrics = await tester.measureComplexRender(
        (count) => createComplexComponent(count),
        500
      );

      console.log('Very complex component:', metrics);
      expect(metrics.renderTime).toBeDefined();
      expect(metrics.memoryUsed).toBeGreaterThan(0);
    });
  });

  describe('Re-render Performance', () => {
    it('should re-render within 8ms budget', async () => {
      const component = createComplexComponent(50);
      container.appendChild(component);

      const metrics = await tester.measureReRender(
        component,
        (comp, iteration) => {
          const children = comp.querySelectorAll('.child-item');
          children[iteration % children.length].style.background = 'red';
        },
        20
      );

      console.log('Re-render metrics:', metrics);
      expect(metrics.avgTime).toBeLessThan(8);
    });

    it('should handle batch updates efficiently', async () => {
      const component = createComplexComponent(100);
      container.appendChild(component);

      const metrics = await tester.measureReRender(
        component,
        (comp, iteration) => {
          const children = comp.querySelectorAll('.child-item');
          // Batch update multiple children
          for (let i = 0; i < 10; i++) {
            const index = (iteration * 10 + i) % children.length;
            children[index].style.opacity = Math.random().toFixed(2);
          }
        },
        10
      );

      console.log('Batch update metrics:', metrics);
      expect(metrics.avgTime).toBeLessThan(16);
    });
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps during rotation animation', async () => {
      const component = createAnimatedComponent();
      container.appendChild(component);

      const metrics = await tester.measureAnimation(
        component,
        startRotationAnimation,
        1000
      );

      console.log('Animation metrics:', metrics);
      expect(metrics.fps).toBeGreaterThanOrEqual(55); // Allow 5fps tolerance
      expect(metrics.frameDropPercentage).toBeLessThan(10);
    });

    it('should detect jank in animations', async () => {
      const component = createAnimatedComponent();
      container.appendChild(component);

      // Simulate janky animation with occasional heavy work
      let frameCount = 0;
      const startJankyAnimation = (element) => {
        function animate() {
          frameCount++;
          element.style.transform = `translateX(${frameCount}px)`;
          
          // Simulate jank every 30 frames
          if (frameCount % 30 === 0) {
            const start = performance.now();
            while (performance.now() - start < 50) {
              // Block for 50ms
            }
          }
          
          requestAnimationFrame(animate);
        }
        animate();
      };

      const metrics = await tester.measureAnimation(
        component,
        startJankyAnimation,
        1000
      );

      console.log('Janky animation metrics:', metrics);
      expect(metrics.jank).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing', () => {
    it('should handle 60 updates per second', async () => {
      const component = createComplexComponent(50);
      container.appendChild(component);

      const metrics = await tester.stressTest(
        component,
        (comp, iteration) => {
          const children = comp.querySelectorAll('.child-item');
          const index = iteration % children.length;
          children[index].style.transform = `scale(${1 + Math.sin(iteration) * 0.2})`;
        },
        60,
        1000
      );

      console.log('Stress test metrics:', metrics);
      expect(metrics.fps).toBeGreaterThanOrEqual(50);
      expect(metrics.actualUpdates).toBeGreaterThanOrEqual(metrics.expectedUpdates * 0.9);
    });

    it('should handle rapid DOM updates without memory leaks', async () => {
      const component = createComplexComponent(100);
      container.appendChild(component);

      const startMemory = performance.memory?.usedJSHeapSize || 0;

      await tester.stressTest(
        component,
        (comp, iteration) => {
          const children = comp.querySelectorAll('.child-item');
          children.forEach((child, idx) => {
            if (idx % 10 === iteration % 10) {
              child.textContent = iteration;
            }
          });
        },
        30,
        2000
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const endMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryGrowth = endMemory - startMemory;

      console.log('Memory growth:', memoryGrowth / 1024 / 1024, 'MB');
      
      // Memory should not grow significantly (< 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Layout Performance', () => {
    it('should measure layout thrashing', async () => {
      const component = createComplexComponent(100);
      container.appendChild(component);

      const children = component.querySelectorAll('.child-item');

      // Bad pattern: interleaved read/write (causes layout thrashing)
      const thrashStart = performance.now();
      children.forEach(child => {
        const height = child.offsetHeight; // Read (forces layout)
        child.style.height = (height + 1) + 'px'; // Write
      });
      const thrashEnd = performance.now();

      // Good pattern: batch reads then batch writes
      const optimizedStart = performance.now();
      const heights = Array.from(children).map(child => child.offsetHeight);
      children.forEach((child, idx) => {
        child.style.height = (heights[idx] + 1) + 'px';
      });
      const optimizedEnd = performance.now();

      const thrashTime = thrashEnd - thrashStart;
      const optimizedTime = optimizedEnd - optimizedStart;

      console.log('Layout thrashing:', thrashTime, 'ms');
      console.log('Optimized layout:', optimizedTime, 'ms');
      console.log('Improvement:', ((thrashTime - optimizedTime) / thrashTime * 100).toFixed(1), '%');

      expect(optimizedTime).toBeLessThan(thrashTime);
    });
  });
});

// Export for use in other tests
export { RenderPerformanceTester, FrameAnalyzer, createComplexComponent };