/**
 * @fileoverview Tests for ImplementationNode type
 * @module types/ImplementationNode.test
 */

import {
  createImplementationNode,
  addDependency,
  addExport,
  addRelatedFile,
  updateLastModified,
  validateImplementationNode,
  findDependenciesByType,
  getPublicExports,
  getAllFilePaths
} from './ImplementationNode.js';

/**
 * Test suite for ImplementationNode
 */
export function runImplementationNodeTests() {
  console.group('ImplementationNode Tests');
  
  testCreateImplementationNode();
  testAddDependency();
  testAddExport();
  testAddRelatedFile();
  testUpdateLastModified();
  testValidateImplementationNode();
  testFindDependenciesByType();
  testGetPublicExports();
  testGetAllFilePaths();
  
  console.groupEnd();
}

function testCreateImplementationNode() {
  console.log('Testing createImplementationNode...');
  
  const node = createImplementationNode(
    'component-button',
    'src/components/Button.tsx',
    {
      fileType: 'component',
      language: 'typescript',
      framework: 'react',
      tags: ['primitive', 'interactive']
    }
  );
  
  console.assert(node.type === 'implementation', 'Node type should be implementation');
  console.assert(node.designNodeId === 'component-button', 'Design node ID should match');
  console.assert(node.primaryFile.path === 'src/components/Button.tsx', 'Primary file path should match');
  console.assert(node.metadata.language === 'typescript', 'Language should be typescript');
  console.assert(node.metadata.framework === 'react', 'Framework should be react');
  console.assert(Array.isArray(node.dependencies), 'Dependencies should be array');
  console.assert(Array.isArray(node.exports), 'Exports should be array');
  console.assert(Array.isArray(node.relatedFiles), 'Related files should be array');
  
  console.log('✓ createImplementationNode tests passed');
}

function testAddDependency() {
  console.log('Testing addDependency...');
  
  const node = createImplementationNode('component-button', 'src/Button.tsx');
  
  addDependency(node, 'token-color-primary', '@tokens/colors', 'named');
  console.assert(node.dependencies.length === 1, 'Should have one dependency');
  console.assert(node.dependencies[0].nodeId === 'token-color-primary', 'Dependency node ID should match');
  
  // Test duplicate prevention
  addDependency(node, 'token-color-primary', '@tokens/colors', 'named');
  console.assert(node.dependencies.length === 1, 'Should not add duplicate dependency');
  
  // Test different import type
  addDependency(node, 'util-helpers', './helpers', 'default');
  console.assert(node.dependencies.length === 2, 'Should have two dependencies');
  
  console.log('✓ addDependency tests passed');
}

function testAddExport() {
  console.log('Testing addExport...');
  
  const node = createImplementationNode('component-button', 'src/Button.tsx');
  
  addExport(node, 'Button', 'default', true);
  console.assert(node.exports.length === 1, 'Should have one export');
  console.assert(node.exports[0].name === 'Button', 'Export name should match');
  console.assert(node.exports[0].isPublic === true, 'Export should be public');
  
  // Test duplicate prevention
  addExport(node, 'Button', 'default', true);
  console.assert(node.exports.length === 1, 'Should not add duplicate export');
  
  // Test type export
  addExport(node, 'ButtonProps', 'type', true);
  console.assert(node.exports.length === 2, 'Should have two exports');
  
  console.log('✓ addExport tests passed');
}

function testAddRelatedFile() {
  console.log('Testing addRelatedFile...');
  
  const node = createImplementationNode('component-button', 'src/Button.tsx');
  
  addRelatedFile(node, 'src/Button.test.tsx', 'test');
  console.assert(node.relatedFiles.length === 1, 'Should have one related file');
  console.assert(node.relatedFiles[0].path === 'src/Button.test.tsx', 'Related file path should match');
  
  // Test duplicate prevention
  addRelatedFile(node, 'src/Button.test.tsx', 'test');
  console.assert(node.relatedFiles.length === 1, 'Should not add duplicate file');
  
  addRelatedFile(node, 'src/Button.css', 'style');
  console.assert(node.relatedFiles.length === 2, 'Should have two related files');
  
  console.log('✓ addRelatedFile tests passed');
}

function testUpdateLastModified() {
  console.log('Testing updateLastModified...');
  
  const node = createImplementationNode('component-button', 'src/Button.tsx');
  const originalTimestamp = node.metadata.lastModified;
  
  const newTimestamp = Date.now() + 10000;
  updateLastModified(node, newTimestamp);
  
  console.assert(node.metadata.lastModified === newTimestamp, 'Last modified should be updated');
  console.assert(node.updatedAt > originalTimestamp, 'Updated at should be refreshed');
  
  console.log('✓ updateLastModified tests passed');
}

function testValidateImplementationNode() {
  console.log('Testing validateImplementationNode...');
  
  // Valid node
  const validNode = createImplementationNode('component-button', 'src/Button.tsx');
  const validResult = validateImplementationNode(validNode);
  console.assert(validResult.valid === true, 'Valid node should pass validation');
  console.assert(validResult.errors.length === 0, 'Valid node should have no errors');
  
  // Invalid node - wrong type
  const invalidNode1 = { ...validNode, type: 'wrong' };
  const result1 = validateImplementationNode(invalidNode1);
  console.assert(result1.valid === false, 'Wrong type should fail validation');
  console.assert(result1.errors.length > 0, 'Should have validation errors');
  
  // Invalid node - missing primaryFile
  const invalidNode2 = { ...validNode, primaryFile: null };
  const result2 = validateImplementationNode(invalidNode2);
  console.assert(result2.valid === false, 'Missing primaryFile should fail validation');
  
  // Null node
  const result3 = validateImplementationNode(null);
  console.assert(result3.valid === false, 'Null node should fail validation');
  
  console.log('✓ validateImplementationNode tests passed');
}

function testFindDependenciesByType() {
  console.log('Testing findDependenciesByType...');
  
  const node = createImplementationNode('component-button', 'src/Button.tsx');
  addDependency(node, 'token-color', '@tokens/colors', 'named');
  addDependency(node, 'util-helpers', './helpers', 'default');
  addDependency(node, 'token-spacing', '@tokens/spacing', 'named');
  
  const namedDeps = findDependenciesByType(node, 'named');
  console.assert(namedDeps.length === 2, 'Should find two named dependencies');
  
  const defaultDeps = findDependenciesByType(node, 'default');
  console.assert(defaultDeps.length === 1, 'Should find one default dependency');
  
  console.log('✓ findDependenciesByType tests passed');
}

function testGetPublicExports() {
  console.log('Testing getPublicExports...');
  
  const node = createImplementationNode('component-button', 'src/Button.tsx');
  addExport(node, 'Button', 'default', true);
  addExport(node, 'ButtonProps', 'type', true);
  addExport(node, 'InternalHelper', 'named', false);
  
  const publicExports = getPublicExports(node);
  console.assert(publicExports.length === 2, 'Should find two public exports');
  console.assert(publicExports.every(exp => exp.isPublic), 'All returned exports should be public');
  
  console.log('✓ getPublicExports tests passed');
}

function testGetAllFilePaths() {
  console.log('Testing getAllFilePaths...');
  
  const node = createImplementationNode('component-button', 'src/Button.tsx');
  addRelatedFile(node, 'src/Button.test.tsx', 'test');
  addRelatedFile(node, 'src/Button.css', 'style');
  
  const allPaths = getAllFilePaths(node);
  console.assert(allPaths.length === 3, 'Should return all file paths');
  console.assert(allPaths[0] === 'src/Button.tsx', 'Primary file should be first');
  console.assert(allPaths.includes('src/Button.test.tsx'), 'Should include test file');
  console.assert(allPaths.includes('src/Button.css'), 'Should include style file');
  
  console.log('✓ getAllFilePaths tests passed');
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  runImplementationNodeTests();
}