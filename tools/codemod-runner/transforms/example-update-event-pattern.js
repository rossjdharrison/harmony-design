/**
 * Example Transform: Update Event Pattern
 * Converts old event dispatch patterns to EventBus pattern
 * 
 * Example:
 *   this.dispatchEvent(new CustomEvent('play'))
 *   → EventBus.publish('audio.play', { source: this })
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#codemod-runner
 */

/**
 * Transform event patterns
 * @param {Object} ast - Parsed AST
 * @param {string} filePath - File being transformed
 * @returns {Object} Modified AST
 */
export function transform(ast, filePath) {
  let code = ast.sourceCode;
  
  // Pattern: this.dispatchEvent(new CustomEvent('eventName'))
  const pattern = /this\.dispatchEvent\(new CustomEvent\(['"]([^'"]+)['"]\s*(?:,\s*\{[^}]*\})?\)\)/g;
  
  let modified = false;
  code = code.replace(pattern, (match, eventName) => {
    modified = true;
    // Convert to EventBus pattern
    return `EventBus.publish('component.${eventName}', { source: this })`;
  });
  
  if (!modified) {
    return null; // Signal no changes
  }
  
  // Add EventBus import if not present
  if (!code.includes('EventBus')) {
    const importStatement = "import { EventBus } from '../core/event-bus.js';\n";
    code = importStatement + code;
  }
  
  return {
    ...ast,
    sourceCode: code
  };
}