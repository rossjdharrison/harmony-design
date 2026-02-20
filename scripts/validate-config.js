/**
 * @fileoverview Configuration file validation using JSON Schema
 * @module scripts/validate-config
 * 
 * Validates configuration files against their JSON schemas.
 * Can be run standalone or integrated into build pipeline.
 * 
 * Usage:
 *   node scripts/validate-config.js [config-file-path]
 *   node scripts/validate-config.js --all
 * 
 * Related:
 * - harmony-schemas/config/*.schema.json - Schema definitions
 * - DESIGN_SYSTEM.md#validation-architecture - Validation strategy
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

/**
 * Simple JSON Schema validator (no external dependencies)
 * Validates basic schema features needed for config validation
 */
class SchemaValidator {
  /**
   * @param {Object} schema - JSON Schema object
   */
  constructor(schema) {
    this.schema = schema;
    this.errors = [];
  }

  /**
   * Validate data against schema
   * @param {*} data - Data to validate
   * @returns {boolean} True if valid
   */
  validate(data) {
    this.errors = [];
    this._validateNode(data, this.schema, 'root');
    return this.errors.length === 0;
  }

  /**
   * Get validation errors
   * @returns {Array<string>} Array of error messages
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Validate a node against schema
   * @private
   */
  _validateNode(data, schema, path) {
    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type) {
        this.errors.push(`${path}: Expected type ${schema.type}, got ${actualType}`);
        return;
      }
    }

    // Object validation
    if (schema.type === 'object' && typeof data === 'object' && !Array.isArray(data)) {
      this._validateObject(data, schema, path);
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(data)) {
      this._validateArray(data, schema, path);
    }

    // String validation
    if (schema.type === 'string' && typeof data === 'string') {
      this._validateString(data, schema, path);
    }

    // Number validation
    if ((schema.type === 'number' || schema.type === 'integer') && typeof data === 'number') {
      this._validateNumber(data, schema, path);
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      this.errors.push(`${path}: Value must be one of [${schema.enum.join(', ')}], got ${data}`);
    }
  }

  /**
   * Validate object properties
   * @private
   */
  _validateObject(data, schema, path) {
    // Required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in data)) {
          this.errors.push(`${path}: Missing required property "${prop}"`);
        }
      }
    }

    // Property validation
    if (schema.properties) {
      for (const [key, value] of Object.entries(data)) {
        if (schema.properties[key]) {
          this._validateNode(value, schema.properties[key], `${path}.${key}`);
        } else if (schema.additionalProperties === false) {
          this.errors.push(`${path}: Unknown property "${key}"`);
        }
      }
    }
  }

  /**
   * Validate array items
   * @private
   */
  _validateArray(data, schema, path) {
    if (schema.items) {
      data.forEach((item, index) => {
        this._validateNode(item, schema.items, `${path}[${index}]`);
      });
    }

    if (schema.minItems !== undefined && data.length < schema.minItems) {
      this.errors.push(`${path}: Array must have at least ${schema.minItems} items`);
    }

    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      this.errors.push(`${path}: Array must have at most ${schema.maxItems} items`);
    }
  }

  /**
   * Validate string constraints
   * @private
   */
  _validateString(data, schema, path) {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      this.errors.push(`${path}: String must be at least ${schema.minLength} characters`);
    }

    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      this.errors.push(`${path}: String must be at most ${schema.maxLength} characters`);
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        this.errors.push(`${path}: String must match pattern ${schema.pattern}`);
      }
    }
  }

  /**
   * Validate number constraints
   * @private
   */
  _validateNumber(data, schema, path) {
    if (schema.type === 'integer' && !Number.isInteger(data)) {
      this.errors.push(`${path}: Value must be an integer`);
    }

    if (schema.minimum !== undefined && data < schema.minimum) {
      this.errors.push(`${path}: Value must be >= ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && data > schema.maximum) {
      this.errors.push(`${path}: Value must be <= ${schema.maximum}`);
    }
  }
}

/**
 * Load and parse JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Object} Parsed JSON data
 */
function loadJSON(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load ${filePath}: ${error.message}`);
  }
}

/**
 * Find schema for config file
 * @param {string} configPath - Path to config file
 * @returns {string|null} Path to schema file or null
 */
function findSchemaForConfig(configPath) {
  const baseName = basename(configPath, extname(configPath));
  const schemaPath = join(ROOT_DIR, 'harmony-schemas', 'config', `${baseName}.schema.json`);
  
  try {
    statSync(schemaPath);
    return schemaPath;
  } catch {
    return null;
  }
}

/**
 * Validate a single config file
 * @param {string} configPath - Path to config file
 * @returns {Object} Validation result
 */
function validateConfigFile(configPath) {
  const result = {
    file: configPath,
    valid: false,
    errors: [],
    warnings: []
  };

  try {
    // Find schema
    const schemaPath = findSchemaForConfig(configPath);
    if (!schemaPath) {
      result.warnings.push(`No schema found for ${basename(configPath)}`);
      result.valid = true; // No schema means no validation required
      return result;
    }

    // Load config and schema
    const config = loadJSON(configPath);
    const schema = loadJSON(schemaPath);

    // Validate
    const validator = new SchemaValidator(schema);
    result.valid = validator.validate(config);
    result.errors = validator.getErrors();

  } catch (error) {
    result.valid = false;
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Find all config files in directory
 * @param {string} dir - Directory to search
 * @returns {Array<string>} Array of config file paths
 */
function findConfigFiles(dir) {
  const configs = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        configs.push(...findConfigFiles(fullPath));
      } else if (entry.endsWith('.config.json') || entry.endsWith('-config.json')) {
        configs.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return configs;
}

/**
 * Validate all config files
 * @returns {Array<Object>} Array of validation results
 */
function validateAllConfigs() {
  const configDir = join(ROOT_DIR, 'config');
  const configFiles = findConfigFiles(configDir);
  
  return configFiles.map(validateConfigFile);
}

/**
 * Print validation results
 * @param {Array<Object>} results - Validation results
 */
function printResults(results) {
  let hasErrors = false;
  
  for (const result of results) {
    const fileName = basename(result.file);
    
    if (result.valid) {
      console.log(`✓ ${fileName}`);
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.log(`  ⚠ ${warning}`);
        });
      }
    } else {
      hasErrors = true;
      console.log(`✗ ${fileName}`);
      
      result.errors.forEach(error => {
        console.log(`  ✗ ${error}`);
      });
    }
  }
  
  console.log('');
  const validCount = results.filter(r => r.valid).length;
  console.log(`${validCount}/${results.length} config files valid`);
  
  return hasErrors ? 1 : 0;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--all') {
    console.log('Validating all configuration files...\n');
    const results = validateAllConfigs();
    
    if (results.length === 0) {
      console.log('No configuration files found.');
      process.exit(0);
    }
    
    process.exit(printResults(results));
  } else {
    const configPath = args[0];
    console.log(`Validating ${configPath}...\n`);
    
    const result = validateConfigFile(configPath);
    process.exit(printResults([result]));
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateConfigFile, validateAllConfigs, SchemaValidator };