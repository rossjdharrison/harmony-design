/**
 * @fileoverview Bidirectional sync between code tokens and Figma
 * Syncs design tokens from Figma to code and publishes local changes back to Figma
 * @module scripts/figma-token-sync
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} FigmaTokens
 * @property {Object} colors - Color tokens
 * @property {Object} spacing - Spacing tokens
 * @property {Object} typography - Typography tokens
 * @property {Object} shadows - Shadow tokens
 * @property {Object} borderRadius - Border radius tokens
 */

/**
 * @typedef {Object} SyncOptions
 * @property {'pull'|'push'|'bidirectional'} direction - Sync direction
 * @property {boolean} dryRun - If true, don't write changes
 * @property {boolean} verbose - Enable verbose logging
 */

/**
 * Figma API client for token synchronization
 */
class FigmaTokenSync {
  /**
   * @param {string} figmaToken - Figma API token
   * @param {string} fileKey - Figma file key
   */
  constructor(figmaToken, fileKey) {
    this.figmaToken = figmaToken;
    this.fileKey = fileKey;
    this.apiBase = 'https://api.figma.com/v1';
    this.localTokenPath = path.join(__dirname, '../tokens/design-tokens.json');
    this.syncLogPath = path.join(__dirname, '../tokens/sync-log.json');
  }

  /**
   * Fetch styles from Figma
   * @returns {Promise<Object>} Figma styles
   */
  async fetchFigmaStyles() {
    const response = await fetch(`${this.apiBase}/files/${this.fileKey}/styles`, {
      headers: {
        'X-Figma-Token': this.figmaToken
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch file data from Figma
   * @returns {Promise<Object>} Figma file data
   */
  async fetchFigmaFile() {
    const response = await fetch(`${this.apiBase}/files/${this.fileKey}`, {
      headers: {
        'X-Figma-Token': this.figmaToken
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch variables (design tokens) from Figma
   * @returns {Promise<Object>} Figma variables
   */
  async fetchFigmaVariables() {
    const response = await fetch(`${this.apiBase}/files/${this.fileKey}/variables/local`, {
      headers: {
        'X-Figma-Token': this.figmaToken
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Transform Figma color to CSS color
   * @param {Object} color - Figma color object
   * @returns {string} CSS color value
   */
  transformFigmaColor(color) {
    if (!color) return null;
    
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a !== undefined ? color.a : 1;

    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /**
   * Transform Figma variables to design tokens
   * @param {Object} variables - Figma variables
   * @returns {FigmaTokens} Transformed tokens
   */
  transformFigmaToTokens(variables) {
    const tokens = {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {},
      borderRadius: {}
    };

    if (!variables.meta || !variables.meta.variableCollections) {
      return tokens;
    }

    // Process variable collections
    for (const [collectionId, collection] of Object.entries(variables.meta.variableCollections)) {
      const collectionName = collection.name.toLowerCase();

      // Process variables in this collection
      for (const [varId, variable] of Object.entries(variables.meta.variables || {})) {
        if (variable.variableCollectionId !== collectionId) continue;

        const varName = variable.name.replace(/\//g, '-').toLowerCase();
        const value = variable.valuesByMode?.[collection.defaultModeId];

        if (!value) continue;

        // Categorize based on collection name or variable type
        if (collectionName.includes('color') || variable.resolvedType === 'COLOR') {
          tokens.colors[varName] = this.transformFigmaColor(value);
        } else if (collectionName.includes('spacing') || variable.resolvedType === 'FLOAT') {
          tokens.spacing[varName] = `${value}px`;
        } else if (collectionName.includes('radius')) {
          tokens.borderRadius[varName] = `${value}px`;
        }
      }
    }

    return tokens;
  }

  /**
   * Load local tokens
   * @returns {Promise<FigmaTokens>} Local tokens
   */
  async loadLocalTokens() {
    try {
      const content = await fs.readFile(this.localTokenPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { colors: {}, spacing: {}, typography: {}, shadows: {}, borderRadius: {} };
      }
      throw error;
    }
  }

  /**
   * Save local tokens
   * @param {FigmaTokens} tokens - Tokens to save
   * @returns {Promise<void>}
   */
  async saveLocalTokens(tokens) {
    await fs.writeFile(
      this.localTokenPath,
      JSON.stringify(tokens, null, 2),
      'utf-8'
    );
  }

  /**
   * Load sync log
   * @returns {Promise<Object>} Sync log
   */
  async loadSyncLog() {
    try {
      const content = await fs.readFile(this.syncLogPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { lastSync: null, history: [] };
      }
      throw error;
    }
  }

  /**
   * Save sync log
   * @param {Object} log - Sync log entry
   * @returns {Promise<void>}
   */
  async saveSyncLog(log) {
    const existingLog = await this.loadSyncLog();
    existingLog.lastSync = new Date().toISOString();
    existingLog.history.unshift({
      timestamp: existingLog.lastSync,
      ...log
    });

    // Keep only last 50 entries
    existingLog.history = existingLog.history.slice(0, 50);

    await fs.writeFile(
      this.syncLogPath,
      JSON.stringify(existingLog, null, 2),
      'utf-8'
    );
  }

  /**
   * Compare tokens and detect changes
   * @param {FigmaTokens} local - Local tokens
   * @param {FigmaTokens} remote - Remote tokens
   * @returns {Object} Diff object
   */
  compareTokens(local, remote) {
    const diff = {
      added: {},
      modified: {},
      removed: {},
      unchanged: {}
    };

    // Check all categories
    for (const category of ['colors', 'spacing', 'typography', 'shadows', 'borderRadius']) {
      diff.added[category] = {};
      diff.modified[category] = {};
      diff.removed[category] = {};
      diff.unchanged[category] = {};

      const localCat = local[category] || {};
      const remoteCat = remote[category] || {};

      // Find added and modified
      for (const [key, value] of Object.entries(remoteCat)) {
        if (!(key in localCat)) {
          diff.added[category][key] = value;
        } else if (localCat[key] !== value) {
          diff.modified[category][key] = { from: localCat[key], to: value };
        } else {
          diff.unchanged[category][key] = value;
        }
      }

      // Find removed
      for (const key of Object.keys(localCat)) {
        if (!(key in remoteCat)) {
          diff.removed[category][key] = localCat[key];
        }
      }
    }

    return diff;
  }

  /**
   * Pull tokens from Figma to local
   * @param {SyncOptions} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async pullFromFigma(options = {}) {
    console.log('🔄 Pulling tokens from Figma...');

    const variables = await this.fetchFigmaVariables();
    const remoteTokens = this.transformFigmaToTokens(variables);
    const localTokens = await this.loadLocalTokens();

    const diff = this.compareTokens(localTokens, remoteTokens);

    if (options.verbose) {
      console.log('📊 Changes detected:');
      console.log(`  Added: ${this.countChanges(diff.added)}`);
      console.log(`  Modified: ${this.countChanges(diff.modified)}`);
      console.log(`  Removed: ${this.countChanges(diff.removed)}`);
    }

    if (!options.dryRun) {
      await this.saveLocalTokens(remoteTokens);
      await this.saveSyncLog({
        direction: 'pull',
        changes: diff,
        tokenCount: this.countAllTokens(remoteTokens)
      });
      console.log('✅ Tokens pulled successfully');
    } else {
      console.log('🔍 Dry run - no changes written');
    }

    return { diff, tokens: remoteTokens };
  }

  /**
   * Push tokens from local to Figma
   * @param {SyncOptions} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async pushToFigma(options = {}) {
    console.log('🔄 Pushing tokens to Figma...');
    console.log('⚠️  Note: Figma Variables API currently supports read-only access');
    console.log('💡 To push changes to Figma:');
    console.log('   1. Use the Figma Tokens plugin (https://www.figma.com/community/plugin/843461159747178978)');
    console.log('   2. Import the tokens/design-tokens.json file');
    console.log('   3. Apply changes to your Figma variables');

    const localTokens = await this.loadLocalTokens();

    if (options.verbose) {
      console.log('📊 Local token count:', this.countAllTokens(localTokens));
    }

    // Generate a token format compatible with Figma Tokens plugin
    const pluginFormat = this.transformToPluginFormat(localTokens);
    const pluginPath = path.join(__dirname, '../tokens/figma-tokens-plugin.json');

    if (!options.dryRun) {
      await fs.writeFile(
        pluginPath,
        JSON.stringify(pluginFormat, null, 2),
        'utf-8'
      );
      console.log(`✅ Plugin-compatible format saved to: ${pluginPath}`);
    }

    return { tokens: localTokens, pluginFormat };
  }

  /**
   * Transform tokens to Figma Tokens plugin format
   * @param {FigmaTokens} tokens - Design tokens
   * @returns {Object} Plugin-compatible format
   */
  transformToPluginFormat(tokens) {
    const pluginFormat = {};

    for (const [category, values] of Object.entries(tokens)) {
      pluginFormat[category] = {};
      for (const [key, value] of Object.entries(values)) {
        pluginFormat[category][key] = {
          value: value,
          type: this.getCategoryType(category)
        };
      }
    }

    return pluginFormat;
  }

  /**
   * Get Figma token type for category
   * @param {string} category - Token category
   * @returns {string} Figma token type
   */
  getCategoryType(category) {
    const typeMap = {
      colors: 'color',
      spacing: 'spacing',
      typography: 'typography',
      shadows: 'boxShadow',
      borderRadius: 'borderRadius'
    };
    return typeMap[category] || 'other';
  }

  /**
   * Count changes in diff
   * @param {Object} changes - Changes object
   * @returns {number} Total count
   */
  countChanges(changes) {
    let count = 0;
    for (const category of Object.values(changes)) {
      count += Object.keys(category).length;
    }
    return count;
  }

  /**
   * Count all tokens
   * @param {FigmaTokens} tokens - Tokens object
   * @returns {number} Total count
   */
  countAllTokens(tokens) {
    let count = 0;
    for (const category of Object.values(tokens)) {
      count += Object.keys(category).length;
    }
    return count;
  }

  /**
   * Perform bidirectional sync
   * @param {SyncOptions} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async bidirectionalSync(options = {}) {
    console.log('🔄 Starting bidirectional sync...');

    // First pull from Figma
    const pullResult = await this.pullFromFigma({ ...options, dryRun: true });

    // Check for conflicts
    const hasConflicts = this.countChanges(pullResult.diff.modified) > 0;

    if (hasConflicts && !options.force) {
      console.warn('⚠️  Conflicts detected! Remote has modifications.');
      console.warn('   Use --force to overwrite remote or resolve conflicts manually.');
      return { status: 'conflict', diff: pullResult.diff };
    }

    // If no conflicts or force flag, proceed with pull
    if (!options.dryRun) {
      await this.pullFromFigma(options);
    }

    // Then prepare push format
    await this.pushToFigma(options);

    console.log('✅ Bidirectional sync complete');
    return { status: 'success', diff: pullResult.diff };
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'bidirectional';

  const options = {
    direction: command,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    force: args.includes('--force')
  };

  // Load config from environment or config file
  const figmaToken = process.env.FIGMA_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;

  if (!figmaToken || !fileKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   FIGMA_TOKEN - Your Figma API token');
    console.error('   FIGMA_FILE_KEY - Your Figma file key');
    console.error('\nGet your token at: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  const sync = new FigmaTokenSync(figmaToken, fileKey);

  try {
    switch (command) {
      case 'pull':
        await sync.pullFromFigma(options);
        break;
      case 'push':
        await sync.pushToFigma(options);
        break;
      case 'bidirectional':
        await sync.bidirectionalSync(options);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error('   Available commands: pull, push, bidirectional');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FigmaTokenSync };