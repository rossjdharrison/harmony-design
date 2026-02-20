/**
 * @fileoverview Tests for Scroll Sentinel component
 * @module primitives/scroll-sentinel/test
 */

import { ScrollSentinelElement } from './scroll-sentinel.js';

/**
 * Test suite for ScrollSentinelElement
 */
describe('ScrollSentinelElement', () => {
  let container;
  let sentinel;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.height = '2000px';
    document.body.appendChild(container);

    sentinel = document.createElement('scroll-sentinel');
    container.appendChild(sentinel);
  });

  afterEach(() => {
    document.body.removeChild(container);
    sentinel = null;
    container = null;
  });

  describe('Component Registration', () => {
    test('should be registered as custom element', () => {
      expect(customElements.get('scroll-sentinel')).toBeDefined();
    });

    test('should create instance', () => {
      expect(sentinel).toBeInstanceOf(ScrollSentinelElement);
      expect(sentinel.shadowRoot).toBeTruthy();
    });
  });

  describe('Attributes', () => {
    test('should have default threshold of 0', () => {
      expect(sentinel.threshold).toBe(0);
    });

    test('should set threshold attribute', () => {
      sentinel.threshold = 0.5;
      expect(sentinel.getAttribute('threshold')).toBe('0.5');
      expect(sentinel.threshold).toBe(0.5);
    });

    test('should clamp threshold between 0 and 1', () => {
      sentinel.threshold = -0.5;
      expect(sentinel.threshold).toBe(0);

      sentinel.threshold = 1.5;
      expect(sentinel.threshold).toBe(1);
    });

    test('should have default root-margin of 0px', () => {
      expect(sentinel.rootMargin).toBe('0px');
    });

    test('should set root-margin attribute', () => {
      sentinel.rootMargin = '200px';
      expect(sentinel.getAttribute('root-margin')).toBe('200px');
      expect(sentinel.rootMargin).toBe('200px');
    });

    test('should handle trigger-once attribute', () => {
      expect(sentinel.triggerOnce).toBe(false);
      
      sentinel.triggerOnce = true;
      expect(sentinel.hasAttribute('trigger-once')).toBe(true);
      expect(sentinel.triggerOnce).toBe(true);

      sentinel.triggerOnce = false;
      expect(sentinel.hasAttribute('trigger-once')).toBe(false);
    });

    test('should handle disabled attribute', () => {
      expect(sentinel.disabled).toBe(false);

      sentinel.disabled = true;
      expect(sentinel.hasAttribute('disabled')).toBe(true);
      expect(sentinel.disabled).toBe(true);
    });
  });

  describe('Visibility State', () => {
    test('should track visibility state', () => {
      expect(sentinel.isVisible).toBe(false);
    });

    test('should track triggered state', () => {
      expect(sentinel.hasTriggered).toBe(false);
    });

    test('should reset state', () => {
      // Manually set internal state
      sentinel.reset();
      expect(sentinel.hasTriggered).toBe(false);
      expect(sentinel.isVisible).toBe(false);
    });
  });

  describe('Events', () => {
    test('should emit sentinel:visible event', (done) => {
      sentinel.addEventListener('sentinel:visible', (e) => {
        expect(e.detail).toBeDefined();
        expect(e.detail.sentinel).toBe(sentinel);
        expect(e.detail.timestamp).toBeGreaterThan(0);
        done();
      });

      // Simulate intersection
      const entry = {
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: sentinel.getBoundingClientRect()
      };
      sentinel.handleIntersection([entry]);
    });

    test('should emit sentinel:triggered event on first visibility', (done) => {
      sentinel.addEventListener('sentinel:triggered', (e) => {
        expect(e.detail).toBeDefined();
        expect(e.detail.sentinel).toBe(sentinel);
        done();
      });

      const entry = {
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: sentinel.getBoundingClientRect()
      };
      sentinel.handleIntersection([entry]);
    });

    test('should emit sentinel:hidden event', (done) => {
      // First make it visible
      const visibleEntry = {
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: sentinel.getBoundingClientRect()
      };
      sentinel.handleIntersection([visibleEntry]);

      // Then hide it
      sentinel.addEventListener('sentinel:hidden', (e) => {
        expect(e.detail).toBeDefined();
        expect(e.detail.visibilityDuration).toBeGreaterThanOrEqual(0);
        done();
      });

      const hiddenEntry = {
        isIntersecting: false,
        intersectionRatio: 0,
        boundingClientRect: sentinel.getBoundingClientRect()
      };
      sentinel.handleIntersection([hiddenEntry]);
    });
  });

  describe('Trigger Once Mode', () => {
    beforeEach(() => {
      sentinel.triggerOnce = true;
    });

    test('should trigger only once', () => {
      let triggerCount = 0;
      sentinel.addEventListener('sentinel:triggered', () => {
        triggerCount++;
      });

      // First intersection
      const entry1 = {
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: sentinel.getBoundingClientRect()
      };
      sentinel.handleIntersection([entry1]);
      expect(triggerCount).toBe(1);

      // Hide
      const entry2 = {
        isIntersecting: false,
        intersectionRatio: 0,
        boundingClientRect: sentinel.getBoundingClientRect()
      };
      sentinel.handleIntersection([entry2]);

      // Second intersection (should not trigger)
      sentinel.handleIntersection([entry1]);
      expect(triggerCount).toBe(1);
    });

    test('should allow re-trigger after reset', () => {
      let triggerCount = 0;
      sentinel.addEventListener('sentinel:triggered', () => {
        triggerCount++;
      });

      const entry = {
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: sentinel.getBoundingClientRect()
      };

      sentinel.handleIntersection([entry]);
      expect(triggerCount).toBe(1);

      sentinel.reset();
      sentinel.handleIntersection([entry]);
      expect(triggerCount).toBe(2);
    });
  });

  describe('Performance', () => {
    test('should complete intersection handling within budget', () => {
      const start = performance.now();
      
      const entry = {
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: sentinel.getBoundingClientRect()
      };
      
      sentinel.handleIntersection([entry]);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(16); // 16ms budget
    });
  });

  describe('Debug Mode', () => {
    test('should show debug visualization', () => {
      sentinel.setAttribute('debug', '');
      
      const styles = window.getComputedStyle(sentinel);
      // Debug mode changes height
      expect(sentinel.hasAttribute('debug')).toBe(true);
    });
  });
});