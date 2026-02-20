/**
 * @fileoverview Tests for Computed Value Cache
 * @module core/computed-value-cache.test
 */

import { ComputedValueCache, createComputedCache } from './computed-value-cache.js';

/**
 * Test suite for ComputedValueCache
 */
export function runComputedValueCacheTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  console.log('Running ComputedValueCache tests...\n');

  // Basic functionality
  test('should create cache instance', () => {
    const cache = new ComputedValueCache();
    if (!cache) throw new Error('Cache not created');
  });

  test('should define and compute value', () => {
    const cache = new ComputedValueCache();
    let computeCount = 0;
    
    cache.define('test', {
      compute: () => {
        computeCount++;
        return 42;
      }
    });

    const value = cache.get('test');
    if (value !== 42) throw new Error('Wrong value');
    if (computeCount !== 1) throw new Error('Compute called wrong number of times');
  });

  test('should memoize computed values', () => {
    const cache = new ComputedValueCache();
    let computeCount = 0;
    
    cache.define('memoized', {
      compute: () => {
        computeCount++;
        return Math.random();
      }
    });

    const value1 = cache.get('memoized');
    const value2 = cache.get('memoized');
    
    if (value1 !== value2) throw new Error('Values not memoized');
    if (computeCount !== 1) throw new Error('Computed more than once');
  });

  // Dependency tracking
  test('should track dependencies', () => {
    const cache = new ComputedValueCache();
    const state = { a: 1, b: 2 };
    
    cache.define('sum', {
      compute: () => state.a + state.b,
      dependencies: ['a', 'b']
    });

    const value1 = cache.get('sum');
    if (value1 !== 3) throw new Error('Wrong initial value');

    state.a = 5;
    cache.invalidate('a');
    
    const value2 = cache.get('sum');
    if (value2 !== 7) throw new Error('Not recomputed after invalidation');
  });

  test('should cascade invalidation to dependents', () => {
    const cache = new ComputedValueCache();
    const state = { x: 10 };
    
    cache.define('doubled', {
      compute: () => state.x * 2,
      dependencies: ['x']
    });
    
    cache.define('quadrupled', {
      compute: () => cache.get('doubled') * 2,
      dependencies: ['doubled']
    });

    const value1 = cache.get('quadrupled');
    if (value1 !== 40) throw new Error('Wrong initial value');

    state.x = 20;
    cache.invalidate('x');
    
    const value2 = cache.get('quadrupled');
    if (value2 !== 80) throw new Error('Cascade invalidation failed');
  });

  // Lazy vs eager computation
  test('should support lazy computation', () => {
    const cache = new ComputedValueCache();
    let computed = false;
    
    cache.define('lazy', {
      compute: () => {
        computed = true;
        return 'lazy-value';
      },
      lazy: true
    });

    if (computed) throw new Error('Lazy value computed eagerly');
    
    cache.get('lazy');
    if (!computed) throw new Error('Lazy value not computed on access');
  });

  test('should support eager computation', () => {
    const cache = new ComputedValueCache();
    let computed = false;
    
    cache.define('eager', {
      compute: () => {
        computed = true;
        return 'eager-value';
      },
      lazy: false
    });

    if (!computed) throw new Error('Eager value not computed immediately');
  });

  // TTL support
  test('should respect TTL', (done) => {
    const cache = new ComputedValueCache();
    let computeCount = 0;
    
    cache.define('ttl-test', {
      compute: () => {
        computeCount++;
        return Date.now();
      },
      ttl: 50
    });

    cache.get('ttl-test');
    
    setTimeout(() => {
      cache.get('ttl-test');
      if (computeCount !== 2) throw new Error('TTL not respected');
      done();
    }, 60);
  });

  // Circular dependency detection
  test('should detect circular dependencies', () => {
    const cache = new ComputedValueCache();
    
    cache.define('circular-a', {
      compute: () => cache.get('circular-b'),
      dependencies: ['circular-b']
    });
    
    cache.define('circular-b', {
      compute: () => cache.get('circular-a'),
      dependencies: ['circular-a']
    });

    let errorThrown = false;
    try {
      cache.get('circular-a');
    } catch (error) {
      if (error.message.includes('Circular dependency')) {
        errorThrown = true;
      }
    }
    
    if (!errorThrown) throw new Error('Circular dependency not detected');
  });

  // Cache management
  test('should clear specific entry', () => {
    const cache = new ComputedValueCache();
    
    cache.define('clear-test', {
      compute: () => 123
    });

    cache.get('clear-test');
    if (!cache.has('clear-test')) throw new Error('Entry not cached');
    
    cache.clear('clear-test');
    if (cache.has('clear-test')) throw new Error('Entry not cleared');
  });

  test('should clear all entries', () => {
    const cache = new ComputedValueCache();
    
    cache.define('entry1', { compute: () => 1 });
    cache.define('entry2', { compute: () => 2 });

    cache.get('entry1');
    cache.get('entry2');
    
    cache.clear();
    
    if (cache.has('entry1') || cache.has('entry2')) {
      throw new Error('Entries not cleared');
    }
  });

  test('should enforce max size', () => {
    const cache = new ComputedValueCache({ maxSize: 2 });
    
    cache.define('entry1', { compute: () => 1 });
    cache.define('entry2', { compute: () => 2 });
    cache.define('entry3', { compute: () => 3 });

    cache.get('entry1');
    cache.get('entry2');
    cache.get('entry3');
    
    // entry1 should be evicted (LRU)
    if (cache._cache.size > 2) {
      throw new Error('Max size not enforced');
    }
  });

  // Statistics
  test('should track statistics', () => {
    const cache = new ComputedValueCache();
    
    cache.define('stats-test', {
      compute: () => 42
    });

    cache.get('stats-test'); // miss
    cache.get('stats-test'); // hit
    cache.get('stats-test'); // hit

    const stats = cache.getStats();
    if (stats.totalHits !== 2) throw new Error('Wrong hit count');
    if (stats.totalMisses !== 1) throw new Error('Wrong miss count');
    if (stats.hitRate < 66 || stats.hitRate > 67) throw new Error('Wrong hit rate');
  });

  test('should reset statistics', () => {
    const cache = new ComputedValueCache();
    
    cache.define('reset-test', {
      compute: () => 42
    });

    cache.get('reset-test');
    cache.resetStats();

    const stats = cache.getStats();
    if (stats.totalHits !== 0 || stats.totalMisses !== 0) {
      throw new Error('Stats not reset');
    }
  });

  // Custom equality
  test('should use custom equality function', () => {
    const cache = new ComputedValueCache();
    let computeCount = 0;
    
    cache.define('custom-eq', {
      compute: () => {
        computeCount++;
        return { value: 42 };
      },
      equals: (a, b) => a?.value === b?.value
    });

    cache.get('custom-eq');
    cache.invalidate('custom-eq');
    cache.get('custom-eq');
    
    // Should compute twice but value is "equal"
    if (computeCount !== 2) throw new Error('Custom equality not used');
  });

  // Error handling
  test('should handle computation errors', () => {
    const cache = new ComputedValueCache();
    
    cache.define('error-test', {
      compute: () => {
        throw new Error('Computation failed');
      }
    });

    let errorThrown = false;
    try {
      cache.get('error-test');
    } catch (error) {
      if (error.message.includes('Computation failed')) {
        errorThrown = true;
      }
    }
    
    if (!errorThrown) throw new Error('Computation error not thrown');
  });

  test('should validate definition options', () => {
    const cache = new ComputedValueCache();
    
    let errorThrown = false;
    try {
      cache.define('invalid', {});
    } catch (error) {
      if (error.message.includes('compute must be a function')) {
        errorThrown = true;
      }
    }
    
    if (!errorThrown) throw new Error('Invalid options not caught');
  });

  // Factory function
  test('should create cache via factory', () => {
    const cache = createComputedCache({ maxSize: 100 });
    if (!cache) throw new Error('Factory did not create cache');
  });

  console.log(`\n${results.passed} passed, ${results.failed} failed`);
  return results;
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test=computed-cache')) {
  runComputedValueCacheTests();
}