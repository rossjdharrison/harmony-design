/**
 * @fileoverview Flag Manager - Handles feature flag CRUD operations
 * @module tools/feature-flag-cli/flag-manager
 * 
 * Manages reading and writing feature flags to the configuration file.
 * Provides methods for updating, creating, and deleting flags.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Feature Flags
 */

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { dirname } = require('path');

/**
 * Feature flag manager for file-based storage
 */
class FlagManager {
  /**
   * @param {string} filePath - Path to feature flags JSON file
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.ensureFileExists();
  }

  /**
   * Ensure the flags file exists, create if not
   */
  ensureFileExists() {
    if (!existsSync(this.filePath)) {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf8');
    }
  }

  /**
   * Read all flags from file
   * @returns {Object} All feature flags
   */
  getAllFlags() {
    try {
      const content = readFileSync(this.filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading flags file: ${error.message}`);
      return {};
    }
  }

  /**
   * Get a specific flag by name
   * @param {string} name - Flag name
   * @returns {Object|null} Flag configuration or null if not found
   */
  getFlag(name) {
    const flags = this.getAllFlags();
    return flags[name] || null;
  }

  /**
   * Update or create a flag
   * @param {string} name - Flag name
   * @param {Object} updates - Updates to apply
   */
  updateFlag(name, updates) {
    const flags = this.getAllFlags();
    
    if (!flags[name]) {
      // Create new flag with defaults
      flags[name] = {
        enabled: false,
        type: 'boolean',
        description: '',
        ...updates
      };
    } else {
      // Update existing flag
      flags[name] = {
        ...flags[name],
        ...updates
      };
    }

    this.saveFlags(flags);
  }

  /**
   * Delete a flag
   * @param {string} name - Flag name
   */
  deleteFlag(name) {
    const flags = this.getAllFlags();
    delete flags[name];
    this.saveFlags(flags);
  }

  /**
   * Import multiple flags (merge with existing)
   * @param {Object} newFlags - Flags to import
   */
  importFlags(newFlags) {
    const flags = this.getAllFlags();
    const merged = { ...flags, ...newFlags };
    this.saveFlags(merged);
  }

  /**
   * Save flags to file
   * @param {Object} flags - All flags to save
   */
  saveFlags(flags) {
    try {
      writeFileSync(this.filePath, JSON.stringify(flags, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save flags: ${error.message}`);
    }
  }

  /**
   * Create a backup of current flags
   * @param {string} backupPath - Path for backup file
   */
  backup(backupPath) {
    const flags = this.getAllFlags();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = backupPath || `${this.filePath}.backup-${timestamp}`;
    
    writeFileSync(backupFile, JSON.stringify(flags, null, 2), 'utf8');
    return backupFile;
  }
}

module.exports = { FlagManager };