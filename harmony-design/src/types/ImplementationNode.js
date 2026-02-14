/**
 * @fileoverview ImplementationNode type for linking design system entities to implementation files
 * @module types/ImplementationNode
 * 
 * Represents a node in the design system graph that links to actual implementation files (.tsx/.ts).
 * Used to connect ComponentNode and DesignTokenNode entities to their code implementations.
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Graph Architecture § Node Types
 */

/**
 * @typedef {Object} FileReference
 * @property {string} path - Relative path to the implementation file from project root
 * @property {string} type - File type: 'component' | 'hook' | 'utility' | 'token' | 'style'
 * @property {number} lineStart - Starting line number (optional, for specific references)
 * @property {number} lineEnd - Ending line number (optional, for specific references)
 */

/**
 * @typedef {Object} Dependency
 * @property {string} nodeId - ID of the node this implementation depends on
 * @property {string} importPath - Import path used in the code
 * @property {string} importType - Type of import: 'default' | 'named' | 'namespace' | 'type'
 */

/**
 * @typedef {Object} ExportInfo
 * @property {string} name - Name of the exported entity
 * @property {string} type - Export type: 'default' | 'named' | 'type' | 'interface'
 * @property {boolean} isPublic - Whether this is part of the public API
 */

/**
 * @typedef {Object} ImplementationNode
 * @property {string} id - Unique identifier for this implementation node
 * @property {string} type - Always 'implementation' for this node type
 * @property {string} designNodeId - ID of the ComponentNode or DesignTokenNode this implements
 * @property {FileReference} primaryFile - Main implementation file
 * @property {FileReference[]} relatedFiles - Additional files (tests, styles, stories, etc.)
 * @property {Dependency[]} dependencies - Other nodes this implementation depends on
 * @property {ExportInfo[]} exports - What this implementation exports
 * @property {Object} metadata - Additional implementation metadata
 * @property {string} metadata.language - Implementation language: 'typescript' | 'javascript'
 * @property {string} metadata.framework - Framework context: 'react' | 'vanilla' | 'web-component'
 * @property {number} metadata.lastModified - Timestamp of last file modification
 * @property {string} metadata.version - Semantic version of this implementation
 * @property {string[]} metadata.tags - Searchable tags for categorization
 * @property {number} createdAt - Timestamp when node was created
 * @property {number} updatedAt - Timestamp when node was last updated
 */

/**
 * Creates a new ImplementationNode
 * 
 * @param {string} designNodeId - ID of the design node being implemented
 * @param {string} filePath - Path to the primary implementation file
 * @param {Object} options - Additional configuration
 * @param {string} options.fileType - Type of the primary file
 * @param {string} options.language - Implementation language (default: 'typescript')
 * @param {string} options.framework - Framework context (default: 'vanilla')
 * @param {FileReference[]} options.relatedFiles - Related files (default: [])
 * @param {string[]} options.tags - Tags for categorization (default: [])
 * @returns {ImplementationNode} New implementation node
 * 
 * @example
 * const node = createImplementationNode(
 *   'component-button-primary',
 *   'src/components/Button/Button.tsx',
 *   {
 *     fileType: 'component',
 *     language: 'typescript',
 *     framework: 'react',
 *     relatedFiles: [
 *       { path: 'src/components/Button/Button.test.tsx', type: 'test' },
 *       { path: 'src/components/Button/Button.css', type: 'style' }
 *     ],
 *     tags: ['primitive', 'interactive']
 *   }
 * );
 */
export function createImplementationNode(designNodeId, filePath, options = {}) {
  const now = Date.now();
  const id = `impl-${designNodeId}-${now}`;
  
  return {
    id,
    type: 'implementation',
    designNodeId,
    primaryFile: {
      path: filePath,
      type: options.fileType || 'component',
      lineStart: options.lineStart,
      lineEnd: options.lineEnd
    },
    relatedFiles: options.relatedFiles || [],
    dependencies: [],
    exports: [],
    metadata: {
      language: options.language || 'typescript',
      framework: options.framework || 'vanilla',
      lastModified: now,
      version: options.version || '0.1.0',
      tags: options.tags || []
    },
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Adds a dependency to an ImplementationNode
 * 
 * @param {ImplementationNode} node - The implementation node to modify
 * @param {string} dependencyNodeId - ID of the node being depended upon
 * @param {string} importPath - Import path used in code
 * @param {string} importType - Type of import
 * @returns {ImplementationNode} Updated node (for chaining)
 * 
 * @example
 * addDependency(node, 'token-color-primary', '@tokens/colors', 'named');
 */
export function addDependency(node, dependencyNodeId, importPath, importType = 'named') {
  if (!node || node.type !== 'implementation') {
    throw new Error('Invalid implementation node');
  }
  
  // Avoid duplicate dependencies
  const exists = node.dependencies.some(dep => 
    dep.nodeId === dependencyNodeId && dep.importPath === importPath
  );
  
  if (!exists) {
    node.dependencies.push({
      nodeId: dependencyNodeId,
      importPath,
      importType
    });
    node.updatedAt = Date.now();
  }
  
  return node;
}

/**
 * Adds an export definition to an ImplementationNode
 * 
 * @param {ImplementationNode} node - The implementation node to modify
 * @param {string} exportName - Name of the exported entity
 * @param {string} exportType - Type of export
 * @param {boolean} isPublic - Whether this is part of public API
 * @returns {ImplementationNode} Updated node (for chaining)
 * 
 * @example
 * addExport(node, 'Button', 'default', true);
 * addExport(node, 'ButtonProps', 'type', true);
 */
export function addExport(node, exportName, exportType = 'named', isPublic = true) {
  if (!node || node.type !== 'implementation') {
    throw new Error('Invalid implementation node');
  }
  
  // Avoid duplicate exports
  const exists = node.exports.some(exp => 
    exp.name === exportName && exp.type === exportType
  );
  
  if (!exists) {
    node.exports.push({
      name: exportName,
      type: exportType,
      isPublic
    });
    node.updatedAt = Date.now();
  }
  
  return node;
}

/**
 * Adds a related file to an ImplementationNode
 * 
 * @param {ImplementationNode} node - The implementation node to modify
 * @param {string} filePath - Path to the related file
 * @param {string} fileType - Type of the related file
 * @returns {ImplementationNode} Updated node (for chaining)
 * 
 * @example
 * addRelatedFile(node, 'src/components/Button/Button.test.tsx', 'test');
 * addRelatedFile(node, 'src/components/Button/Button.stories.tsx', 'story');
 */
export function addRelatedFile(node, filePath, fileType) {
  if (!node || node.type !== 'implementation') {
    throw new Error('Invalid implementation node');
  }
  
  // Avoid duplicate files
  const exists = node.relatedFiles.some(file => file.path === filePath);
  
  if (!exists) {
    node.relatedFiles.push({
      path: filePath,
      type: fileType
    });
    node.updatedAt = Date.now();
  }
  
  return node;
}

/**
 * Updates the last modified timestamp from filesystem
 * 
 * @param {ImplementationNode} node - The implementation node to update
 * @param {number} timestamp - New last modified timestamp
 * @returns {ImplementationNode} Updated node (for chaining)
 */
export function updateLastModified(node, timestamp) {
  if (!node || node.type !== 'implementation') {
    throw new Error('Invalid implementation node');
  }
  
  node.metadata.lastModified = timestamp;
  node.updatedAt = Date.now();
  
  return node;
}

/**
 * Validates an ImplementationNode structure
 * 
 * @param {ImplementationNode} node - Node to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 * 
 * @example
 * const result = validateImplementationNode(node);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateImplementationNode(node) {
  const errors = [];
  
  if (!node) {
    errors.push('Node is null or undefined');
    return { valid: false, errors };
  }
  
  if (node.type !== 'implementation') {
    errors.push(`Invalid type: expected 'implementation', got '${node.type}'`);
  }
  
  if (!node.id || typeof node.id !== 'string') {
    errors.push('Missing or invalid id');
  }
  
  if (!node.designNodeId || typeof node.designNodeId !== 'string') {
    errors.push('Missing or invalid designNodeId');
  }
  
  if (!node.primaryFile || !node.primaryFile.path) {
    errors.push('Missing primaryFile or primaryFile.path');
  }
  
  if (!node.metadata || !node.metadata.language) {
    errors.push('Missing metadata.language');
  }
  
  if (!Array.isArray(node.dependencies)) {
    errors.push('dependencies must be an array');
  }
  
  if (!Array.isArray(node.exports)) {
    errors.push('exports must be an array');
  }
  
  if (!Array.isArray(node.relatedFiles)) {
    errors.push('relatedFiles must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Finds all dependencies of a specific type
 * 
 * @param {ImplementationNode} node - The implementation node to query
 * @param {string} importType - Type of import to filter by
 * @returns {Dependency[]} Filtered dependencies
 * 
 * @example
 * const namedImports = findDependenciesByType(node, 'named');
 */
export function findDependenciesByType(node, importType) {
  if (!node || node.type !== 'implementation') {
    return [];
  }
  
  return node.dependencies.filter(dep => dep.importType === importType);
}

/**
 * Finds all public exports
 * 
 * @param {ImplementationNode} node - The implementation node to query
 * @returns {ExportInfo[]} Public exports
 * 
 * @example
 * const publicAPI = getPublicExports(node);
 */
export function getPublicExports(node) {
  if (!node || node.type !== 'implementation') {
    return [];
  }
  
  return node.exports.filter(exp => exp.isPublic);
}

/**
 * Gets all file paths associated with this implementation
 * 
 * @param {ImplementationNode} node - The implementation node to query
 * @returns {string[]} Array of file paths
 * 
 * @example
 * const allFiles = getAllFilePaths(node);
 * // ['src/Button.tsx', 'src/Button.test.tsx', 'src/Button.css']
 */
export function getAllFilePaths(node) {
  if (!node || node.type !== 'implementation') {
    return [];
  }
  
  return [
    node.primaryFile.path,
    ...node.relatedFiles.map(file => file.path)
  ];
}