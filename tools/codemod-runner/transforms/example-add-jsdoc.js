/**
 * Example Transform: Add JSDoc Comments
 * Adds basic JSDoc comments to functions without them
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#codemod-runner
 */

/**
 * Transform to add JSDoc comments
 * @param {Object} ast - Parsed AST
 * @param {string} filePath - File being transformed
 * @returns {Object} Modified AST
 */
export function transform(ast, filePath) {
  let modified = false;
  let code = ast.sourceCode;
  
  // Process in reverse order to maintain positions
  const sortedNodes = [...ast.body].sort((a, b) => b.start - a.start);
  
  for (const node of sortedNodes) {
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') 
        && !node.hasJSDoc) {
      
      const jsdoc = generateJSDoc(node);
      code = code.substring(0, node.start) + jsdoc + '\n' + code.substring(node.start);
      modified = true;
    }
  }
  
  if (!modified) {
    return null; // Signal no changes
  }
  
  return {
    ...ast,
    sourceCode: code
  };
}

/**
 * Generate JSDoc comment for node
 * @param {Object} node - AST node
 * @returns {string} JSDoc comment
 */
function generateJSDoc(node) {
  if (node.type === 'FunctionDeclaration') {
    return `/**
 * ${node.name}
 * TODO: Add description
 */`;
  }
  
  if (node.type === 'ClassDeclaration') {
    return `/**
 * ${node.name}
 * TODO: Add description
 */`;
  }
  
  return '/** TODO: Add documentation */';
}