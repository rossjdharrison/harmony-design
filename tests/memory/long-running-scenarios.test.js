/**
 * @fileoverview Long-Running Scenario Memory Leak Tests
 * Tests various long-running scenarios for memory leaks.
 * 
 * Related: DESIGN_SYSTEM.md § Testing Infrastructure § Memory Leak Detection
 * @module tests/memory/long-running-scenarios.test
 */

import { MemoryLeakDetector } from './leak-detector.js';

/**
 * Test configuration for long-running scenarios
 * @typedef {Object} ScenarioConfig
 * @property {string} name - Scenario name
 * @property {Function} setup - Setup function
 * @property {Function} action - Action to repeat
 * @property {Function} teardown - Teardown function
 * @property {number} duration - Test duration in milliseconds
 * @property {number} iterations - Number of iterations
 */

export class LongRunningScenarioTests {
  constructor() {
    this.detector = new MemoryLeakDetector();
    this.testResults = [];
  }

  /**
   * Runs a long-running scenario test
   * @param {ScenarioConfig} config - Test configuration
   * @returns {Promise<Object>} Test result
   */
  async runScenario(config) {
    console.log(`\n=== Running Scenario: ${config.name} ===`);
    
    // Setup
    await config.setup();
    
    // Start monitoring
    this.detector.startMonitoring(500); // Snapshot every 500ms
    
    const startTime = Date.now();
    let iteration = 0;

    // Run actions repeatedly
    while (Date.now() - startTime < config.duration && iteration < config.iterations) {
      await config.action(iteration);
      iteration++;
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Force GC before final measurement
    await this.detector.forceGarbageCollection();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Stop monitoring and analyze
    const result = this.detector.stopMonitoring();
    
    // Teardown
    await config.teardown();

    // Generate report
    const report = this.detector.generateReport(result);
    console.log(report);

    const testResult = {
      scenario: config.name,
      result,
      report,
      iterations: iteration,
      passed: !result.hasLeak || result.severity === 'minor',
    };

    this.testResults.push(testResult);
    return testResult;
  }

  /**
   * Test: Component creation and destruction
   * @returns {Promise<Object>}
   */
  async testComponentLifecycle() {
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    return this.runScenario({
      name: 'Component Lifecycle',
      setup: async () => {
        // Setup test container
      },
      action: async (iteration) => {
        // Create component
        const component = document.createElement('div');
        component.className = 'test-component';
        component.innerHTML = `<span>Component ${iteration}</span>`;
        component.addEventListener('click', () => {
          console.log('clicked');
        });
        
        container.appendChild(component);
        
        // Track for leak detection
        this.detector.trackObject('component', component);
        
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // Destroy component
        component.remove();
      },
      teardown: async () => {
        container.remove();
      },
      duration: 10000, // 10 seconds
      iterations: 1000,
    });
  }

  /**
   * Test: Event listener attachment/detachment
   * @returns {Promise<Object>}
   */
  async testEventListeners() {
    const button = document.createElement('button');
    button.id = 'test-button';
    button.textContent = 'Test Button';
    document.body.appendChild(button);

    const handlers = [];

    return this.runScenario({
      name: 'Event Listener Management',
      setup: async () => {
        // Initial setup
      },
      action: async (iteration) => {
        // Create handler
        const handler = () => {
          console.log(`Handler ${iteration}`);
        };
        
        handlers.push(handler);
        
        // Add listener
        button.addEventListener('click', handler);
        
        // Simulate click
        button.click();
        
        // Remove listener (should prevent leak)
        button.removeEventListener('click', handler);
        
        // Keep some handlers to test leak detection
        if (iteration % 10 === 0) {
          // Intentionally keep every 10th handler
          const leakyHandler = () => console.log('leak');
          button.addEventListener('click', leakyHandler);
        }
      },
      teardown: async () => {
        button.remove();
        handlers.length = 0;
      },
      duration: 8000,
      iterations: 500,
    });
  }

  /**
   * Test: DOM manipulation
   * @returns {Promise<Object>}
   */
  async testDOMManipulation() {
    const container = document.createElement('div');
    container.id = 'dom-test-container';
    document.body.appendChild(container);

    return this.runScenario({
      name: 'DOM Manipulation',
      setup: async () => {
        // Setup container
      },
      action: async (iteration) => {
        // Create nested structure
        const wrapper = document.createElement('div');
        wrapper.className = 'wrapper';
        
        for (let i = 0; i < 10; i++) {
          const child = document.createElement('div');
          child.className = 'child';
          child.textContent = `Child ${i}`;
          wrapper.appendChild(child);
        }
        
        container.appendChild(wrapper);
        
        // Modify DOM
        const children = wrapper.querySelectorAll('.child');
        children.forEach((child, i) => {
          child.style.color = i % 2 === 0 ? 'red' : 'blue';
        });
        
        // Clean up (every other iteration to test cleanup)
        if (iteration % 2 === 0) {
          wrapper.remove();
        }
      },
      teardown: async () => {
        container.remove();
      },
      duration: 10000,
      iterations: 1000,
    });
  }

  /**
   * Test: Timer management
   * @returns {Promise<Object>}
   */
  async testTimerManagement() {
    const timers = [];

    return this.runScenario({
      name: 'Timer Management',
      setup: async () => {
        // Setup
      },
      action: async (iteration) => {
        // Create timer
        const timer = setTimeout(() => {
          console.log(`Timer ${iteration}`);
        }, 1000);
        
        timers.push(timer);
        
        // Clear timer (should prevent leak)
        clearTimeout(timer);
        
        // Create interval
        const interval = setInterval(() => {
          console.log(`Interval ${iteration}`);
        }, 100);
        
        timers.push(interval);
        
        // Clear interval
        clearInterval(interval);
        
        // Intentionally leak some timers
        if (iteration % 20 === 0) {
          setInterval(() => {
            // Leaky interval
          }, 10000);
        }
      },
      teardown: async () => {
        timers.forEach(timer => {
          clearTimeout(timer);
          clearInterval(timer);
        });
        timers.length = 0;
      },
      duration: 8000,
      iterations: 500,
    });
  }

  /**
   * Test: Shadow DOM creation
   * @returns {Promise<Object>}
   */
  async testShadowDOM() {
    const container = document.createElement('div');
    container.id = 'shadow-test-container';
    document.body.appendChild(container);

    return this.runScenario({
      name: 'Shadow DOM Creation',
      setup: async () => {
        // Setup
      },
      action: async (iteration) => {
        // Create custom element with shadow DOM
        const element = document.createElement('div');
        const shadow = element.attachShadow({ mode: 'open' });
        
        shadow.innerHTML = `
          <style>
            .shadow-content { color: blue; }
          </style>
          <div class="shadow-content">Shadow Content ${iteration}</div>
        `;
        
        container.appendChild(element);
        
        this.detector.trackObject('shadow-element', element);
        
        // Simulate interaction
        const content = shadow.querySelector('.shadow-content');
        content.textContent = `Updated ${iteration}`;
        
        // Clean up
        element.remove();
      },
      teardown: async () => {
        container.remove();
      },
      duration: 10000,
      iterations: 800,
    });
  }

  /**
   * Test: Array/Object allocation
   * @returns {Promise<Object>}
   */
  async testMemoryAllocation() {
    const references = [];

    return this.runScenario({
      name: 'Memory Allocation',
      setup: async () => {
        // Setup
      },
      action: async (iteration) => {
        // Allocate large array
        const largeArray = new Array(1000).fill(iteration);
        
        // Allocate objects
        const objects = [];
        for (let i = 0; i < 100; i++) {
          objects.push({
            id: i,
            data: new Array(100).fill(Math.random()),
            nested: {
              value: iteration,
              array: new Array(50).fill(i),
            },
          });
        }
        
        // Keep some references (simulating cache)
        if (iteration % 10 === 0) {
          references.push({ largeArray, objects });
        }
        
        // Clear old references
        if (references.length > 10) {
          references.shift();
        }
      },
      teardown: async () => {
        references.length = 0;
      },
      duration: 8000,
      iterations: 500,
    });
  }

  /**
   * Runs all scenarios
   * @returns {Promise<Array<Object>>}
   */
  async runAllScenarios() {
    console.log('=== Starting Long-Running Memory Leak Tests ===\n');
    
    const scenarios = [
      () => this.testComponentLifecycle(),
      () => this.testEventListeners(),
      () => this.testDOMManipulation(),
      () => this.testTimerManagement(),
      () => this.testShadowDOM(),
      () => this.testMemoryAllocation(),
    ];

    for (const scenario of scenarios) {
      try {
        await scenario();
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force GC between tests
        await this.detector.forceGarbageCollection();
      } catch (error) {
        console.error('Scenario failed:', error);
        this.testResults.push({
          scenario: 'Unknown',
          error: error.message,
          passed: false,
        });
      }
    }

    return this.testResults;
  }

  /**
   * Generates summary report
   * @returns {string}
   */
  generateSummary() {
    const lines = [];
    
    lines.push('\n=== Memory Leak Test Summary ===\n');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    
    lines.push(`Total Tests: ${this.testResults.length}`);
    lines.push(`Passed: ${passed}`);
    lines.push(`Failed: ${failed}`);
    lines.push('');

    this.testResults.forEach((result, i) => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const severity = result.result?.severity || 'unknown';
      lines.push(`${i + 1}. ${status} - ${result.scenario} (${severity})`);
      
      if (!result.passed && result.result) {
        result.result.indicators.forEach(indicator => {
          lines.push(`   - ${indicator.description}`);
        });
      }
    });

    return lines.join('\n');
  }
}