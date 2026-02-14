/**
 * @fileoverview Lightweight testing framework for primitive components
 * Provides test suite organization, assertions, and coverage tracking
 * See: harmony-design/DESIGN_SYSTEM.md#testing-primitives
 */

class TestFramework {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
        this.coverage = new Map();
    }

    /**
     * Define a test suite
     * @param {string} name - Suite name
     * @param {Function} fn - Suite definition function
     */
    describe(name, fn) {
        const suite = {
            name,
            tests: [],
            beforeEach: null,
            afterEach: null
        };
        this.suites.push(suite);
        this.currentSuite = suite;
        fn();
        this.currentSuite = null;
    }

    /**
     * Define a test case
     * @param {string} name - Test name
     * @param {Function} fn - Test function
     */
    it(name, fn) {
        if (!this.currentSuite) {
            throw new Error('it() must be called inside describe()');
        }
        this.currentSuite.tests.push({ name, fn, status: 'pending', error: null });
    }

    /**
     * Setup function to run before each test
     * @param {Function} fn - Setup function
     */
    beforeEach(fn) {
        if (!this.currentSuite) {
            throw new Error('beforeEach() must be called inside describe()');
        }
        this.currentSuite.beforeEach = fn;
    }

    /**
     * Teardown function to run after each test
     * @param {Function} fn - Teardown function
     */
    afterEach(fn) {
        if (!this.currentSuite) {
            throw new Error('afterEach() must be called inside describe()');
        }
        this.currentSuite.afterEach = fn;
    }

    /**
     * Run all test suites
     */
    async run() {
        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            suites: []
        };

        for (const suite of this.suites) {
            const suiteResult = {
                name: suite.name,
                tests: [],
                passed: 0,
                failed: 0
            };

            for (const test of suite.tests) {
                results.total++;

                try {
                    if (suite.beforeEach) {
                        await suite.beforeEach();
                    }

                    await test.fn();
                    test.status = 'pass';
                    test.error = null;
                    results.passed++;
                    suiteResult.passed++;
                } catch (error) {
                    test.status = 'fail';
                    test.error = error.message;
                    results.failed++;
                    suiteResult.failed++;
                    console.error(`Test failed: ${suite.name} > ${test.name}`, error);
                } finally {
                    if (suite.afterEach) {
                        await suite.afterEach();
                    }
                }

                suiteResult.tests.push(test);
            }

            results.suites.push(suiteResult);
        }

        this.renderResults(results);
        return results;
    }

    /**
     * Render test results to DOM
     * @param {Object} results - Test results
     */
    renderResults(results) {
        const container = document.getElementById('test-results');
        if (!container) return;

        const passRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : 0;
        const summaryClass = results.failed === 0 ? 'pass' : 'fail';

        let html = `
            <div class="test-summary ${summaryClass}">
                <div>Tests: ${results.passed} passed, ${results.failed} failed, ${results.total} total</div>
                <div>Pass Rate: ${passRate}%</div>
            </div>
        `;

        for (const suite of results.suites) {
            html += `
                <div class="test-suite">
                    <div class="test-suite-header">
                        ${suite.name} (${suite.passed}/${suite.passed + suite.failed} passed)
                    </div>
            `;

            for (const test of suite.tests) {
                html += `
                    <div class="test-case ${test.status}">
                        <div class="test-status ${test.status}"></div>
                        <div class="test-name">${test.name}</div>
                    </div>
                `;
                if (test.error) {
                    html += `<div class="test-error">${test.error}</div>`;
                }
            }

            html += '</div>';
        }

        container.innerHTML = html;
    }

    /**
     * Track coverage for a component
     * @param {string} component - Component name
     * @param {string[]} features - Features tested
     */
    trackCoverage(component, features) {
        if (!this.coverage.has(component)) {
            this.coverage.set(component, new Set());
        }
        features.forEach(f => this.coverage.get(component).add(f));
    }

    /**
     * Calculate and display coverage
     */
    displayCoverage() {
        const coverageContainer = document.getElementById('coverage-results');
        if (!coverageContainer) return;

        const componentFeatures = {
            'Button': ['render', 'click', 'disabled', 'aria', 'keyboard', 'variants', 'sizes'],
            'Input': ['render', 'value', 'change', 'disabled', 'aria', 'validation', 'types'],
            'Checkbox': ['render', 'checked', 'change', 'disabled', 'aria', 'keyboard', 'indeterminate'],
            'Radio': ['render', 'checked', 'change', 'disabled', 'aria', 'keyboard', 'groups'],
            'Select': ['render', 'value', 'change', 'disabled', 'aria', 'keyboard', 'options'],
            'Toggle': ['render', 'checked', 'change', 'disabled', 'aria', 'keyboard', 'animation']
        };

        let html = '<div class="coverage-info"><h2>Coverage Report</h2>';

        let totalFeatures = 0;
        let coveredFeatures = 0;

        for (const [component, allFeatures] of Object.entries(componentFeatures)) {
            const tested = this.coverage.get(component) || new Set();
            const coverage = (tested.size / allFeatures.length * 100).toFixed(1);
            
            totalFeatures += allFeatures.length;
            coveredFeatures += tested.size;

            html += `
                <div style="margin: 15px 0;">
                    <strong>${component}</strong>: ${tested.size}/${allFeatures.length} features (${coverage}%)
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${coverage}%">${coverage}%</div>
                    </div>
                </div>
            `;
        }

        const overallCoverage = (coveredFeatures / totalFeatures * 100).toFixed(1);
        html += `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #dee2e6;">
                <strong>Overall Coverage</strong>: ${coveredFeatures}/${totalFeatures} features (${overallCoverage}%)
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${overallCoverage}%">${overallCoverage}%</div>
                </div>
            </div>
        `;

        html += '</div>';
        coverageContainer.innerHTML = html;
    }
}

// Assertion helpers
export const assert = {
    equals(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected} but got ${actual}`);
        }
    },

    notEquals(actual, expected, message = '') {
        if (actual === expected) {
            throw new Error(message || `Expected not ${expected} but got ${actual}`);
        }
    },

    truthy(value, message = '') {
        if (!value) {
            throw new Error(message || `Expected truthy value but got ${value}`);
        }
    },

    falsy(value, message = '') {
        if (value) {
            throw new Error(message || `Expected falsy value but got ${value}`);
        }
    },

    exists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(message || 'Expected value to exist');
        }
    },

    contains(container, value, message = '') {
        if (!container.includes(value)) {
            throw new Error(message || `Expected container to include ${value}`);
        }
    },

    hasAttribute(element, attr, message = '') {
        if (!element.hasAttribute(attr)) {
            throw new Error(message || `Expected element to have attribute ${attr}`);
        }
    },

    hasClass(element, className, message = '') {
        if (!element.classList.contains(className)) {
            throw new Error(message || `Expected element to have class ${className}`);
        }
    },

    throws(fn, message = '') {
        try {
            fn();
            throw new Error(message || 'Expected function to throw');
        } catch (e) {
            if (e.message === message || e.message === 'Expected function to throw') {
                throw e;
            }
        }
    }
};

// Global test framework instance
export const framework = new TestFramework();

// Export global test functions
export const describe = framework.describe.bind(framework);
export const it = framework.it.bind(framework);
export const beforeEach = framework.beforeEach.bind(framework);
export const afterEach = framework.afterEach.bind(framework);

// Auto-run tests when all modules loaded
let modulesLoaded = 0;
const expectedModules = 6; // button, input, checkbox, radio, select, toggle

export function moduleLoaded() {
    modulesLoaded++;
    if (modulesLoaded === expectedModules) {
        setTimeout(async () => {
            await framework.run();
            framework.displayCoverage();
        }, 100);
    }
}