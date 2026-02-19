#!/usr/bin/env node

/**
 * @fileoverview Feature Flag CLI - Command-line tool for managing feature flags
 * @module tools/feature-flag-cli/cli
 * 
 * Command-line interface for managing feature flags in development.
 * Supports listing, enabling, disabling, and configuring feature flags.
 * 
 * Usage:
 *   node cli.js list                                    - List all flags
 *   node cli.js enable <flag-name>                      - Enable a flag
 *   node cli.js disable <flag-name>                     - Disable a flag
 *   node cli.js set <flag-name> <value>                 - Set flag value
 *   node cli.js rollout <flag-name> <percentage>        - Set rollout percentage
 *   node cli.js target <flag-name> <attr> <value>       - Add user targeting rule
 *   node cli.js export                                  - Export flags to JSON
 *   node cli.js import <file>                           - Import flags from JSON
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Feature Flags
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');
const { FlagManager } = require('./flag-manager.js');
const { FlagValidator } = require('./flag-validator.js');

/**
 * CLI configuration
 */
const CONFIG = {
  defaultFlagsFile: resolve(__dirname, '../../config/feature-flags.json'),
  backupDir: resolve(__dirname, '../../config/backups')
};

/**
 * CLI command handler
 */
class FeatureFlagCLI {
  constructor() {
    this.manager = new FlagManager(CONFIG.defaultFlagsFile);
    this.validator = new FlagValidator();
  }

  /**
   * Run the CLI with provided arguments
   * @param {string[]} args - Command line arguments
   */
  run(args) {
    const command = args[0];
    const commandArgs = args.slice(1);

    try {
      switch (command) {
        case 'list':
          this.listFlags(commandArgs);
          break;
        case 'enable':
          this.enableFlag(commandArgs);
          break;
        case 'disable':
          this.disableFlag(commandArgs);
          break;
        case 'set':
          this.setFlag(commandArgs);
          break;
        case 'rollout':
          this.setRollout(commandArgs);
          break;
        case 'target':
          this.setTargeting(commandArgs);
          break;
        case 'export':
          this.exportFlags(commandArgs);
          break;
        case 'import':
          this.importFlags(commandArgs);
          break;
        case 'validate':
          this.validateFlags(commandArgs);
          break;
        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;
        default:
          console.error(`Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * List all feature flags
   * @param {string[]} args - Command arguments
   */
  listFlags(args) {
    const flags = this.manager.getAllFlags();
    const filter = args[0]; // 'enabled', 'disabled', or undefined for all

    console.log('\n📋 Feature Flags:\n');

    Object.entries(flags).forEach(([name, config]) => {
      const enabled = config.enabled;
      
      if (filter === 'enabled' && !enabled) return;
      if (filter === 'disabled' && enabled) return;

      const status = enabled ? '✅' : '❌';
      const rollout = config.rollout ? ` (${config.rollout.percentage}% rollout)` : '';
      const targeting = config.targeting?.length > 0 ? ` [${config.targeting.length} rules]` : '';
      
      console.log(`${status} ${name}${rollout}${targeting}`);
      
      if (config.description) {
        console.log(`   ${config.description}`);
      }
      
      if (args.includes('--verbose') || args.includes('-v')) {
        console.log(`   Type: ${config.type || 'boolean'}`);
        if (config.value !== undefined) {
          console.log(`   Value: ${JSON.stringify(config.value)}`);
        }
      }
      
      console.log('');
    });
  }

  /**
   * Enable a feature flag
   * @param {string[]} args - Command arguments [flagName]
   */
  enableFlag(args) {
    if (args.length === 0) {
      throw new Error('Flag name required. Usage: enable <flag-name>');
    }

    const flagName = args[0];
    this.manager.updateFlag(flagName, { enabled: true });
    console.log(`✅ Enabled flag: ${flagName}`);
  }

  /**
   * Disable a feature flag
   * @param {string[]} args - Command arguments [flagName]
   */
  disableFlag(args) {
    if (args.length === 0) {
      throw new Error('Flag name required. Usage: disable <flag-name>');
    }

    const flagName = args[0];
    this.manager.updateFlag(flagName, { enabled: false });
    console.log(`❌ Disabled flag: ${flagName}`);
  }

  /**
   * Set a feature flag value
   * @param {string[]} args - Command arguments [flagName, value]
   */
  setFlag(args) {
    if (args.length < 2) {
      throw new Error('Flag name and value required. Usage: set <flag-name> <value>');
    }

    const flagName = args[0];
    let value = args[1];

    // Parse value based on type
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(value)) value = Number(value);
    else if (value.startsWith('{') || value.startsWith('[')) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    this.manager.updateFlag(flagName, { value, enabled: true });
    console.log(`✅ Set flag ${flagName} to: ${JSON.stringify(value)}`);
  }

  /**
   * Set rollout percentage for a flag
   * @param {string[]} args - Command arguments [flagName, percentage]
   */
  setRollout(args) {
    if (args.length < 2) {
      throw new Error('Flag name and percentage required. Usage: rollout <flag-name> <percentage>');
    }

    const flagName = args[0];
    const percentage = Number(args[1]);

    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be a number between 0 and 100');
    }

    this.manager.updateFlag(flagName, {
      enabled: true,
      rollout: {
        percentage,
        strategy: 'percentage'
      }
    });

    console.log(`✅ Set ${flagName} rollout to ${percentage}%`);
  }

  /**
   * Add user targeting rule to a flag
   * @param {string[]} args - Command arguments [flagName, attribute, value]
   */
  setTargeting(args) {
    if (args.length < 3) {
      throw new Error('Flag name, attribute, and value required. Usage: target <flag-name> <attribute> <value>');
    }

    const flagName = args[0];
    const attribute = args[1];
    const value = args[2];

    const flag = this.manager.getFlag(flagName);
    const targeting = flag.targeting || [];

    targeting.push({
      attribute,
      operator: 'equals',
      value
    });

    this.manager.updateFlag(flagName, {
      enabled: true,
      targeting
    });

    console.log(`✅ Added targeting rule to ${flagName}: ${attribute} equals ${value}`);
  }

  /**
   * Export flags to JSON file
   * @param {string[]} args - Command arguments [outputFile]
   */
  exportFlags(args) {
    const outputFile = args[0] || 'feature-flags-export.json';
    const flags = this.manager.getAllFlags();
    
    writeFileSync(outputFile, JSON.stringify(flags, null, 2), 'utf8');
    console.log(`✅ Exported flags to: ${outputFile}`);
  }

  /**
   * Import flags from JSON file
   * @param {string[]} args - Command arguments [inputFile]
   */
  importFlags(args) {
    if (args.length === 0) {
      throw new Error('Input file required. Usage: import <file>');
    }

    const inputFile = args[0];
    
    if (!existsSync(inputFile)) {
      throw new Error(`File not found: ${inputFile}`);
    }

    const content = readFileSync(inputFile, 'utf8');
    const flags = JSON.parse(content);

    // Validate before importing
    const validation = this.validator.validateAll(flags);
    if (!validation.valid) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    this.manager.importFlags(flags);
    console.log(`✅ Imported flags from: ${inputFile}`);
  }

  /**
   * Validate all feature flags
   * @param {string[]} args - Command arguments
   */
  validateFlags(args) {
    const flags = this.manager.getAllFlags();
    const validation = this.validator.validateAll(flags);

    if (validation.valid) {
      console.log('✅ All flags are valid');
    } else {
      console.error('❌ Validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🚩 Feature Flag CLI

Usage:
  node cli.js <command> [options]

Commands:
  list [enabled|disabled] [-v]    List all flags (optionally filtered)
  enable <flag-name>               Enable a feature flag
  disable <flag-name>              Disable a feature flag
  set <flag-name> <value>          Set flag value (auto-detects type)
  rollout <flag-name> <0-100>      Set rollout percentage
  target <flag-name> <attr> <val>  Add user targeting rule
  export [file]                    Export flags to JSON
  import <file>                    Import flags from JSON
  validate                         Validate all flags
  help                             Show this help

Examples:
  node cli.js list
  node cli.js enable new-ui
  node cli.js set theme-color "#ff0000"
  node cli.js rollout new-feature 25
  node cli.js target beta-access role admin
  node cli.js export backup.json
  node cli.js import production-flags.json

Documentation: See DESIGN_SYSTEM.md § Feature Flags
    `);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  const cli = new FeatureFlagCLI();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    cli.showHelp();
    process.exit(0);
  }

  cli.run(args);
}

module.exports = { FeatureFlagCLI };