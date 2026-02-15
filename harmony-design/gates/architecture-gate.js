/**
 * @fileoverview Architecture Quality Gate
 * Validates that components follow architectural constraints.
 * 
 * Constraints:
 * - No npm dependencies in runtime
 * - No frameworks (React, Vue, etc.)
 * - Shadow DOM required for components
 * - EventBus pattern for communication
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#quality-gates
 */

/**
 * Architecture gate validator
 * @class ArchitectureGate
 */
export class ArchitectureGate {
  constructor() {
    this.results = [];
    this.FORBIDDEN_IMPORTS = [
      'react', 'vue', 'angular', 'svelte', 'leptos',
      'lodash', 'jquery', 'moment', 'axios'
    ];
  }

  /**
   * Validates no forbidden imports
   * @param {string} sourceCode - Source code to validate
   * @returns {Object} Validation result
   */
  validateImports(sourceCode) {
    const imports = this._extractImports(sourceCode);
    const forbidden = imports.filter(imp => 
      this.FORBIDDEN_IMPORTS.some(f => imp.includes(f))
    );
    
    const passed = forbidden.length === 0;
    const result = {
      gate: 'architecture-imports',
      passed,
      forbidden,
      message: passed 
        ? 'No forbidden imports detected' 
        : `Forbidden imports found: ${forbidden.join(', ')}`
    };
    this.results.push(result);
    return result;
  }

  /**
   * Validates component uses shadow DOM
   * @param {HTMLElement} element - Component element
   * @returns {Object} Validation result
   */
  validateShadowDOM(element) {
    const hasShadowRoot = element.shadowRoot !== null;
    const passed = hasShadowRoot;
    
    const result = {
      gate: 'architecture-shadow-dom',
      passed,
      element: element.tagName,
      message: passed 
        ? 'Component uses shadow DOM' 
        : 'Component must use shadow DOM'
    };
    this.results.push(result);
    return result;
  }

  /**
   * Validates EventBus pattern usage
   * @param {string} sourceCode - Source code to validate
   * @returns {Object} Validation result
   */
  validateEventBus(sourceCode) {
    const hasEventBusImport = sourceCode.includes('event-bus');
    const hasDirectBCCall = /\b(playback|timeline|clip)\.(play|stop|update)\b/.test(sourceCode);
    
    const passed = !hasDirectBCCall || hasEventBusImport;
    const result = {
      gate: 'architecture-eventbus',
      passed,
      message: passed 
        ? 'EventBus pattern followed' 
        : 'Components must use EventBus, not direct BC calls'
    };
    this.results.push(result);
    return result;
  }

  /**
   * Extracts import statements from source code
   * @private
   * @param {string} source - Source code
   * @returns {Array<string>} Import statements
   */
  _extractImports(source) {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;
    while ((match = importRegex.exec(source)) !== null) {
      imports.push(match[1]);
    }
    return imports;
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