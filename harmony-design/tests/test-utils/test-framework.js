/**
 * Lightweight Test Framework
 * 
 * Minimal test framework for running integration tests without npm dependencies.
 * Provides describe/it/expect API similar to popular testing frameworks.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#testing-infrastructure
 */

class TestSuite {
  constructor(description) {
    this.description = description;
    this.tests = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
  }

  addTest(description, fn) {
    this.tests.push({ description, fn });
  }

  addBeforeEach(fn) {
    this.beforeEachHooks.push(fn);
  }

  addAfterEach(fn) {
    this.afterEachHooks.push(fn);
  }

  async run() {
    console.group(`Suite: ${this.description}`);
    let passed = 0;
    let failed = 0;

    for (const test of this.tests) {
      try {
        // Run beforeEach hooks
        for (const hook of this.beforeEachHooks) {
          await hook();
        }

        // Run test
        await test.fn();

        // Run afterEach hooks
        for (const hook of this.afterEachHooks) {
          await hook();
        }

        console.log(`✓ ${test.description}`);
        passed++;
      } catch (error) {
        console.error(`✗ ${test.description}`);
        console.error(error);
        failed++;
      }
    }

    console.groupEnd();
    return { passed, failed };
  }
}

const testSuites = [];
let currentSuite = null;

/**
 * Define a test suite
 * @param {string} description - Suite description
 * @param {Function} fn - Suite definition function
 */
export function describe(description, fn) {
  const suite = new TestSuite(description);
  const parentSuite = currentSuite;
  currentSuite = suite;
  
  fn();
  
  if (parentSuite) {
    parentSuite.addTest(description, () => suite.run());
  } else {
    testSuites.push(suite);
  }
  
  currentSuite = parentSuite;
}

/**
 * Define a test case
 * @param {string} description - Test description
 * @param {Function} fn - Test function
 */
export function it(description, fn) {
  if (!currentSuite) {
    throw new Error('it() must be called within describe()');
  }
  currentSuite.addTest(description, fn);
}

/**
 * Register a beforeEach hook
 * @param {Function} fn - Hook function
 */
export function beforeEach(fn) {
  if (!currentSuite) {
    throw new Error('beforeEach() must be called within describe()');
  }
  currentSuite.addBeforeEach(fn);
}

/**
 * Register an afterEach hook
 * @param {Function} fn - Hook function
 */
export function afterEach(fn) {
  if (!currentSuite) {
    throw new Error('afterEach() must be called within describe()');
  }
  currentSuite.addAfterEach(fn);
}

/**
 * Assertion utilities
 */
export const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  
  toBeTruthy() {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  
  toBeFalsy() {
    if (actual) {
      throw new Error(`Expected ${actual} to be falsy`);
    }
  },
  
  toEqual(expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  
  toContain(item) {
    if (!actual.includes(item)) {
      throw new Error(`Expected ${actual} to contain ${item}`);
    }
  },
  
  toMatch(pattern) {
    if (!pattern.test(actual)) {
      throw new Error(`Expected ${actual} to match ${pattern}`);
    }
  },
  
  toBeLessThan(expected) {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  
  toBeGreaterThan(expected) {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  }
});

/**
 * Run all registered test suites
 */
export async function runTests() {
  console.log('Running Integration Tests...\n');
  
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of testSuites) {
    const result = await suite.run();
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);
  
  return { passed: totalPassed, failed: totalFailed };
}