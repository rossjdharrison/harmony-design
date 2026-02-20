/**
 * @fileoverview Tests for schema-to-component generator
 * @module tests/schema-to-component
 */

import { generateFromSchema, generateFromDirectory } from '../scripts/schema-to-component.js';
import fs from 'fs';
import path from 'path';

/**
 * Test schema validation
 */
function testValidation() {
  console.log('Testing schema validation...');
  
  const invalidSchema = {
    name: 'InvalidName', // Should be kebab-case
    description: 'Test'
  };
  
  try {
    // This should fail validation
    const tempPath = path.join(process.cwd(), 'temp-invalid-schema.json');
    fs.writeFileSync(tempPath, JSON.stringify(invalidSchema));
    generateFromSchema(tempPath, 'temp-output');
    console.error('✗ Validation test failed: should have thrown error');
  } catch (error) {
    console.log('✓ Validation correctly rejected invalid schema');
  } finally {
    // Cleanup
    const tempPath = path.join(process.cwd(), 'temp-invalid-schema.json');
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Test component generation
 */
async function testGeneration() {
  console.log('\nTesting component generation...');
  
  const testSchema = {
    name: 'test-component',
    description: 'A test component',
    properties: [
      {
        name: 'test-prop',
        type: 'string',
        default: 'default',
        attribute: true,
        description: 'Test property'
      }
    ],
    events: [
      {
        name: 'test-event',
        description: 'Test event',
        detail: { value: 'string' }
      }
    ],
    slots: [
      { name: '', description: 'Default slot' }
    ],
    styles: {
      base: 'padding: 1rem;'
    }
  };
  
  const tempSchemaPath = path.join(process.cwd(), 'temp-test-schema.json');
  fs.writeFileSync(tempSchemaPath, JSON.stringify(testSchema, null, 2));
  
  try {
    const result = await generateFromSchema(tempSchemaPath, 'temp-output');
    
    if (fs.existsSync(result.component)) {
      console.log('✓ Component file generated successfully');
      
      const content = fs.readFileSync(result.component, 'utf-8');
      if (content.includes('class TestComponent extends HTMLElement')) {
        console.log('✓ Component class generated correctly');
      }
      if (content.includes('get testProp()')) {
        console.log('✓ Property getters generated correctly');
      }
      if (content.includes('_emitTestEvent')) {
        console.log('✓ Event emitters generated correctly');
      }
    } else {
      console.error('✗ Component file not created');
    }
    
    if (fs.existsSync(result.documentation)) {
      console.log('✓ Documentation file generated successfully');
    } else {
      console.error('✗ Documentation file not created');
    }
  } catch (error) {
    console.error('✗ Generation failed:', error.message);
  } finally {
    // Cleanup
    if (fs.existsSync(tempSchemaPath)) {
      fs.unlinkSync(tempSchemaPath);
    }
    const tempOutputDir = path.join(process.cwd(), 'temp-output');
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
    const tempDocsDir = path.join(process.cwd(), 'docs', 'components');
    const tempDocFile = path.join(tempDocsDir, 'test-component.md');
    if (fs.existsSync(tempDocFile)) {
      fs.unlinkSync(tempDocFile);
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Schema to Component Generator Tests ===\n');
  
  testValidation();
  await testGeneration();
  
  console.log('\n=== Tests Complete ===');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}