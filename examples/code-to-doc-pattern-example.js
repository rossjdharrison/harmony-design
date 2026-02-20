/**
 * @fileoverview Example demonstrating Code-to-Doc Reference Pattern
 * @see {@link file://./DESIGN_SYSTEM.md#code-to-doc-reference-pattern Code-to-Doc Reference Pattern}
 * @see {@link file://./DESIGN_SYSTEM.md#event-bus Event Bus Architecture}
 * @module examples/code-to-doc-pattern-example
 * 
 * This file demonstrates how to properly link code to documentation
 * using the standard comment pattern. Every production code file
 * should follow this pattern.
 * 
 * @example
 * // See the header comment above for the pattern
 * // Key elements:
 * // 1. @fileoverview - describes the file's purpose
 * // 2. @see - links to DESIGN_SYSTEM.md sections
 * // 3. @module - identifies the module path
 */

/**
 * Example class showing inline documentation references
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#singleton-pattern Singleton Pattern}
 */
class ExampleService {
  /**
   * Example method with documentation reference
   * 
   * @see {@link file://./DESIGN_SYSTEM.md#event-bus Event Bus Architecture}
   * @param {string} message - Message to process
   * @returns {void}
   */
  processMessage(message) {
    console.log('Processing:', message);
  }
}

/**
 * Example function showing performance constraint documentation
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#performance Performance Budgets}
 * @param {Array<number>} data - Data to process
 * @returns {Array<number>} Processed data
 * 
 * @performance Must complete within 16ms render budget
 */
function processData(data) {
  // Implementation that respects performance constraints
  return data.map(x => x * 2);
}

export { ExampleService, processData };