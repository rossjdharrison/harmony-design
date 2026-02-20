/**
 * @fileoverview Configuration loader with validation
 * @module scripts/config-loader
 * 
 * Loads and validates configuration files at runtime.
 * Provides type-safe access to configuration values.
 * 
 * Usage:
 *   import { loadConfig } from './scripts/config-loader.js';
 *   const audioConfig = await loadConfig('audio');
 * 
 * Related:
 * - scripts/validate-config.js - Validation logic
 * - harmony-schemas/config/*.schema.json - Schema definitions
 * - DESIGN_SYSTEM.md#configuration-management - Config strategy
 */

import { validateConfigFile, SchemaValidator } from './validate-config.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

/**
 * Configuration cache
 * @type {Map<string, Object>}
 */
const configCache = new Map();

/**
 * Load configuration file with validation
 * @param {string} configName - Name of config (e.g., 'audio', 'performance')
 * @param {boolean} useCache - Use cached config if available
 * @returns {Object} Configuration object
 * @throws {Error} If config is invalid or not found
 */
export function loadConfig(configName, useCache = true) {
  // Check cache
  if (useCache && configCache.has(configName)) {
    return configCache.get(configName);
  }

  // Build config path
  const configPath = join(ROOT_DIR, 'config', `${configName}.config.json`);
  
  // Validate config
  const result = validateConfigFile(configPath);
  
  if (!result.valid) {
    const errors = result.errors.join('\n  ');
    throw new Error(`Invalid configuration for ${configName}:\n  ${errors}`);
  }

  // Load config
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  // Apply defaults from schema
  const schemaPath = join(ROOT_DIR, 'harmony-schemas', 'config', `${configName}.config.schema.json`);
  try {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    applyDefaults(config, schema);
  } catch {
    // Schema not found, use config as-is
  }

  // Cache and return
  configCache.set(configName, config);
  return config;
}

/**
 * Apply default values from schema to config
 * @param {Object} config - Configuration object
 * @param {Object} schema - JSON Schema object
 */
function applyDefaults(config, schema) {
  if (!schema.properties) return;

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (!(key in config) && 'default' in propSchema) {
      config[key] = propSchema.default;
    }
  }
}

/**
 * Reload configuration from disk
 * @param {string} configName - Name of config to reload
 * @returns {Object} Reloaded configuration
 */
export function reloadConfig(configName) {
  configCache.delete(configName);
  return loadConfig(configName, false);
}

/**
 * Clear configuration cache
 */
export function clearConfigCache() {
  configCache.clear();
}

/**
 * Get all loaded configurations
 * @returns {Object} Map of config names to config objects
 */
export function getAllConfigs() {
  return Object.fromEntries(configCache);
}