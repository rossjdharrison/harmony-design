/**
 * Example Transform: Add Performance Marks
 * Adds performance.mark() calls to component lifecycle methods
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#codemod-runner
 */

/**
 * Transform to add performance marks
 * @param {Object} ast - Parsed AST
 * @param {string} filePath - File being transformed
 * @returns {Object} Modified AST
 */
export function transform(ast, filePath) {
  let code = ast.sourceCode;
  let modified = false;
  
  // Find connectedCallback and add performance mark
  const connectedCallbackPattern = /connectedCallback\(\)\s*{/g;
  
  code = code.replace(connectedCallbackPattern, (match) => {
    modified = true;
    return `connectedCallback() {
    performance.mark('component-connected-start');`;
  });
  
  // Find disconnectedCallback and add performance mark
  const disconnectedCallbackPattern = /disconnectedCallback\(\)\s*{/g;
  
  code = code.replace(disconnectedCallbackPattern, (match) => {
    modified = true;
    return `disconnectedCallback() {
    performance.mark('component-disconnected-start');`;
  });
  
  if (!modified) {
    return null;
  }
  
  return {
    ...ast,
    sourceCode: code
  };
}