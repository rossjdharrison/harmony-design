/**
 * @fileoverview Quality Gate Runner
 * Orchestrates running all quality gates and reporting results.
 * 
 * Usage:
 *   const runner = new GateRunner();
 *   const report = await runner.runAll(component);
 *   if (!report.passed) {
 *     console.error('Quality gates failed:', report.failures);
 *   }
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#quality-gates
 */

import { PerformanceGate } from './performance-gate.js';
import { AccessibilityGate } from './accessibility-gate.js';
import { ArchitectureGate } from './architecture-gate.js';

/**
 * Quality gate runner
 * @class GateRunner
 */
export class GateRunner {
  constructor() {
    this.performanceGate = new PerformanceGate();
    this.accessibilityGate = new AccessibilityGate();
    this.architectureGate = new ArchitectureGate();
  }

  /**
   * Runs all quality gates
   * @param {Object} context - Validation context
   * @param {HTMLElement} context.element - Component element
   * @param {string} context.sourceCode - Component source code
   * @param {Object} context.metrics - Performance metrics
   * @returns {Promise<Object>} Gate report
   */
  async runAll(context) {
    this._resetAll();
    
    const results = [];

    // Performance gates
    if (context.metrics) {
      if (context.metrics.renderTime !== undefined) {
        results.push(this.performanceGate.validateRender(context.metrics.renderTime));
      }
      if (context.metrics.memoryMB !== undefined) {
        results.push(this.performanceGate.validateMemory(context.metrics.memoryMB));
      }
      if (context.metrics.loadTime !== undefined) {
        results.push(this.performanceGate.validateLoad(context.metrics.loadTime));
      }
    }

    // Accessibility gates
    if (context.element) {
      results.push(this.accessibilityGate.validateAria(context.element));
      results.push(this.accessibilityGate.validateKeyboard(context.element));
      
      if (context.colors) {
        results.push(this.accessibilityGate.validateContrast(
          context.colors.foreground,
          context.colors.background
        ));
      }
    }

    // Architecture gates
    if (context.sourceCode) {
      results.push(this.architectureGate.validateImports(context.sourceCode));
      results.push(this.architectureGate.validateEventBus(context.sourceCode));
    }
    if (context.element) {
      results.push(this.architectureGate.validateShadowDOM(context.element));
    }

    const failures = results.filter(r => !r.passed);
    const passed = failures.length === 0;

    return {
      passed,
      totalGates: results.length,
      passedGates: results.length - failures.length,
      failedGates: failures.length,
      results,
      failures,
      summary: this._generateSummary(results)
    };
  }

  /**
   * Runs only performance gates
   * @param {Object} metrics - Performance metrics
   * @returns {Object} Gate report
   */
  runPerformance(metrics) {
    this.performanceGate.reset();
    const results = [];
    
    if (metrics.renderTime !== undefined) {
      results.push(this.performanceGate.validateRender(metrics.renderTime));
    }
    if (metrics.memoryMB !== undefined) {
      results.push(this.performanceGate.validateMemory(metrics.memoryMB));
    }
    if (metrics.loadTime !== undefined) {
      results.push(this.performanceGate.validateLoad(metrics.loadTime));
    }

    return this._createReport(results);
  }

  /**
   * Runs only accessibility gates
   * @param {HTMLElement} element - Component element
   * @param {Object} colors - Color configuration
   * @returns {Object} Gate report
   */
  runAccessibility(element, colors) {
    this.accessibilityGate.reset();
    const results = [];
    
    results.push(this.accessibilityGate.validateAria(element));
    results.push(this.accessibilityGate.validateKeyboard(element));
    
    if (colors) {
      results.push(this.accessibilityGate.validateContrast(
        colors.foreground,
        colors.background
      ));
    }

    return this._createReport(results);
  }

  /**
   * Runs only architecture gates
   * @param {string} sourceCode - Component source code
   * @param {HTMLElement} element - Component element
   * @returns {Object} Gate report
   */
  runArchitecture(sourceCode, element) {
    this.architectureGate.reset();
    const results = [];
    
    results.push(this.architectureGate.validateImports(sourceCode));
    results.push(this.architectureGate.validateEventBus(sourceCode));
    
    if (element) {
      results.push(this.architectureGate.validateShadowDOM(element));
    }

    return this._createReport(results);
  }

  /**
   * Creates a gate report
   * @private
   * @param {Array} results - Gate results
   * @returns {Object} Gate report
   */
  _createReport(results) {
    const failures = results.filter(r => !r.passed);
    const passed = failures.length === 0;

    return {
      passed,
      totalGates: results.length,
      passedGates: results.length - failures.length,
      failedGates: failures.length,
      results,
      failures,
      summary: this._generateSummary(results)
    };
  }

  /**
   * Generates summary text
   * @private
   * @param {Array} results - Gate results
   * @returns {string} Summary text
   */
  _generateSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    
    if (failed === 0) {
      return `All ${total} quality gates passed ✓`;
    } else {
      return `${failed} of ${total} quality gates failed ✗`;
    }
  }

  /**
   * Resets all gates
   * @private
   */
  _resetAll() {
    this.performanceGate.reset();
    this.accessibilityGate.reset();
    this.architectureGate.reset();
  }
}