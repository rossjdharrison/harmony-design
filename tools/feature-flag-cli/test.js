/**
 * @fileoverview Feature Flag CLI Tests
 * @module tools/feature-flag-cli/test
 * 
 * Tests for the feature flag CLI tool.
 * Run with: node test.js
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Feature Flags
 */

const { existsSync, unlinkSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { FlagManager } = require('./flag-manager.js');
const { FlagValidator } = require('./flag-validator.js');

/**
 * Test runner
 */
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.testFile = resolve(__dirname, 'test-flags.json');
  }

  /**
   * Run all tests
   */
  runAll() {
    console.log('🧪 Running Feature Flag CLI Tests\n');

    this.setup();

    // Flag Manager tests
    this.testFlagManagerCreation();
    this.testFlagManagerUpdate();
    this.testFlagManagerDelete();
    this.testFlagManagerImport();

    // Flag Validator tests
    this.testValidatorBasic();
    this.testValidatorRollout();
    this.testValidatorTargeting();
    this.testValidatorAll();

    this.cleanup();
    this.printResults();
  }

  /**
   * Setup test environment
   */
  setup() {
    if (existsSync(this.testFile)) {
      unlinkSync(this.testFile);
    }
  }

  /**
   * Cleanup test environment
   */
  cleanup() {
    if (existsSync(this.testFile)) {
      unlinkSync(this.testFile);
    }
  }

  /**
   * Assert condition is true
   */
  assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      this.passed++;
    } else {
      console.error(`  ❌ ${message}`);
      this.failed++;
    }
  }

  /**
   * Test: FlagManager can create flags
   */
  testFlagManagerCreation() {
    console.log('\n📦 FlagManager Creation:');
    const manager = new FlagManager(this.testFile);
    
    manager.updateFlag('test-flag', {
      enabled: true,
      type: 'boolean',
      description: 'Test flag'
    });

    const flag = manager.getFlag('test-flag');
    this.assert(flag !== null, 'Flag was created');
    this.assert(flag.enabled === true, 'Flag is enabled');
    this.assert(flag.type === 'boolean', 'Flag has correct type');
  }

  /**
   * Test: FlagManager can update flags
   */
  testFlagManagerUpdate() {
    console.log('\n📝 FlagManager Update:');
    const manager = new FlagManager(this.testFile);
    
    manager.updateFlag('test-flag', { enabled: false });
    const flag = manager.getFlag('test-flag');
    
    this.assert(flag.enabled === false, 'Flag was updated');
    this.assert(flag.type === 'boolean', 'Other properties preserved');
  }

  /**
   * Test: FlagManager can delete flags
   */
  testFlagManagerDelete() {
    console.log('\n🗑️  FlagManager Delete:');
    const manager = new FlagManager(this.testFile);
    
    manager.deleteFlag('test-flag');
    const flag = manager.getFlag('test-flag');
    
    this.assert(flag === null, 'Flag was deleted');
  }

  /**
   * Test: FlagManager can import flags
   */
  testFlagManagerImport() {
    console.log('\n📥 FlagManager Import:');
    const manager = new FlagManager(this.testFile);
    
    const flags = {
      'flag-1': { enabled: true, type: 'boolean' },
      'flag-2': { enabled: false, type: 'string' }
    };
    
    manager.importFlags(flags);
    const allFlags = manager.getAllFlags();
    
    this.assert(Object.keys(allFlags).length === 2, 'All flags imported');
    this.assert(allFlags['flag-1'].enabled === true, 'Flag 1 correct');
    this.assert(allFlags['flag-2'].type === 'string', 'Flag 2 correct');
  }

  /**
   * Test: Validator validates basic flag structure
   */
  testValidatorBasic() {
    console.log('\n✔️  Validator Basic:');
    const validator = new FlagValidator();
    
    const validFlag = {
      enabled: true,
      type: 'boolean'
    };
    
    const result = validator.validateFlag('test', validFlag);
    this.assert(result.valid === true, 'Valid flag passes');
    
    const invalidFlag = {
      enabled: 'yes', // Should be boolean
      type: 'invalid'
    };
    
    const result2 = validator.validateFlag('test', invalidFlag);
    this.assert(result2.valid === false, 'Invalid flag fails');
    this.assert(result2.errors.length > 0, 'Errors are reported');
  }

  /**
   * Test: Validator validates rollout configuration
   */
  testValidatorRollout() {
    console.log('\n🎲 Validator Rollout:');
    const validator = new FlagValidator();
    
    const validRollout = {
      enabled: true,
      rollout: {
        percentage: 50,
        strategy: 'percentage'
      }
    };
    
    const result = validator.validateFlag('test', validRollout);
    this.assert(result.valid === true, 'Valid rollout passes');
    
    const invalidRollout = {
      enabled: true,
      rollout: {
        percentage: 150 // Out of range
      }
    };
    
    const result2 = validator.validateFlag('test', invalidRollout);
    this.assert(result2.valid === false, 'Invalid rollout fails');
  }

  /**
   * Test: Validator validates targeting rules
   */
  testValidatorTargeting() {
    console.log('\n🎯 Validator Targeting:');
    const validator = new FlagValidator();
    
    const validTargeting = {
      enabled: true,
      targeting: [
        {
          attribute: 'role',
          operator: 'equals',
          value: 'admin'
        }
      ]
    };
    
    const result = validator.validateFlag('test', validTargeting);
    this.assert(result.valid === true, 'Valid targeting passes');
    
    const invalidTargeting = {
      enabled: true,
      targeting: [
        {
          attribute: 'role',
          operator: 'invalid-op',
          value: 'admin'
        }
      ]
    };
    
    const result2 = validator.validateFlag('test', invalidTargeting);
    this.assert(result2.valid === false, 'Invalid targeting fails');
  }

  /**
   * Test: Validator can validate all flags
   */
  testValidatorAll() {
    console.log('\n📋 Validator All:');
    const validator = new FlagValidator();
    
    const flags = {
      'flag-1': { enabled: true, type: 'boolean' },
      'flag-2': { enabled: false, type: 'string' },
      'flag-3': { enabled: 'invalid' } // Invalid
    };
    
    const result = validator.validateAll(flags);
    this.assert(result.valid === false, 'Detects invalid flags');
    this.assert(result.errors.length > 0, 'Reports all errors');
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log('='.repeat(50));

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAll();
}

module.exports = { TestRunner };