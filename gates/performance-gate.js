/**
 * @fileoverview Performance Quality Gate
 * Validates that components meet performance budgets before deployment.
 * 
 * Budgets:
 * - Render: 16ms per frame (60fps)
 * - Memory: 50MB WASM heap
 * - Load: 200ms initial load time
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#quality-gates
 */

/**
 * Performance gate validator
 * @class PerformanceGate
 */
export class PerformanceGate {
  constructor() {
    this.RENDER_BUDGET_MS = 16;
    this.MEMORY_BUDGET_MB = 50;
    this.LOAD_BUDGET_MS = 200;
    this.results = [];
  }

  /**
   * Validates render performance
   * @param {number} renderTime - Time in milliseconds
   * @returns {Object} Validation result
   */
  validateRender(renderTime) {
    const passed = renderTime <= this.RENDER_BUDGET_MS;
    const result = {
      gate: 'performance-render',
      passed,
      value: renderTime,
      budget: this.RENDER_BUDGET_MS,
      message: passed 
        ? `Render time ${renderTime}ms within budget` 
        : `Render time ${renderTime}ms exceeds ${this.RENDER_BUDGET_MS}ms budget`
    };
    this.results.push(result);
    return result;
  }

  /**
   * Validates memory usage
   * @param {number} memoryMB - Memory in megabytes
   * @returns {Object} Validation result
   */
  validateMemory(memoryMB) {
    const passed = memoryMB <= this.MEMORY_BUDGET_MB;
    const result = {
      gate: 'performance-memory',
      passed,
      value: memoryMB,
      budget: this.MEMORY_BUDGET_MB,
      message: passed 
        ? `Memory ${memoryMB}MB within budget` 
        : `Memory ${memoryMB}MB exceeds ${this.MEMORY_BUDGET_MB}MB budget`
    };
    this.results.push(result);
    return result;
  }

  /**
   * Validates load time
   * @param {number} loadTime - Time in milliseconds
   * @returns {Object} Validation result
   */
  validateLoad(loadTime) {
    const passed = loadTime <= this.LOAD_BUDGET_MS;
    const result = {
      gate: 'performance-load',
      passed,
      value: loadTime,
      budget: this.LOAD_BUDGET_MS,
      message: passed 
        ? `Load time ${loadTime}ms within budget` 
        : `Load time ${loadTime}ms exceeds ${this.LOAD_BUDGET_MS}ms budget`
    };
    this.results.push(result);
    return result;
  }

  /**
   * Gets all validation results
   * @returns {Array} All results
   */
  getResults() {
    return this.results;
  }

  /**
   * Checks if all gates passed
   * @returns {boolean} True if all passed
   */
  allPassed() {
    return this.results.every(r => r.passed);
  }

  /**
   * Resets validation results
   */
  reset() {
    this.results = [];
  }
}