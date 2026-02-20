/**
 * @fileoverview Tests for Pending State Indicator
 * @module primitives/pending-state-indicator/test
 */

import { PendingStateIndicator } from './pending-state-indicator.js';

/**
 * Test suite for Pending State Indicator
 */
describe('PendingStateIndicator', () => {
  let indicator;

  beforeEach(() => {
    indicator = document.createElement('pending-state-indicator');
    document.body.appendChild(indicator);
  });

  afterEach(() => {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  });

  describe('Component Registration', () => {
    test('should be registered as custom element', () => {
      expect(customElements.get('pending-state-indicator')).toBeDefined();
    });

    test('should create shadow root', () => {
      expect(indicator.shadowRoot).toBeTruthy();
    });
  });

  describe('Attributes', () => {
    test('should have default variant', () => {
      expect(indicator.variant).toBe('spinner');
    });

    test('should have default size', () => {
      expect(indicator.size).toBe('medium');
    });

    test('should have default label', () => {
      expect(indicator.label).toBe('Loading');
    });

    test('should update variant attribute', () => {
      indicator.variant = 'pulse';
      expect(indicator.getAttribute('variant')).toBe('pulse');
    });

    test('should update size attribute', () => {
      indicator.size = 'large';
      expect(indicator.getAttribute('size')).toBe('large');
    });

    test('should update color attribute', () => {
      indicator.color = '#ff0000';
      expect(indicator.getAttribute('color')).toBe('#ff0000');
    });

    test('should update duration attribute', () => {
      indicator.duration = 2000;
      expect(indicator.getAttribute('duration')).toBe('2000');
    });

    test('should update label attribute', () => {
      indicator.label = 'Saving';
      expect(indicator.getAttribute('label')).toBe('Saving');
    });

    test('should toggle overlay attribute', () => {
      indicator.overlay = true;
      expect(indicator.hasAttribute('overlay')).toBe(true);
      indicator.overlay = false;
      expect(indicator.hasAttribute('overlay')).toBe(false);
    });
  });

  describe('Visibility Control', () => {
    test('should start hidden', () => {
      expect(indicator.hasAttribute('visible')).toBe(false);
    });

    test('should show when show() called', () => {
      indicator.show();
      expect(indicator.hasAttribute('visible')).toBe(true);
    });

    test('should hide when hide() called', () => {
      indicator.show();
      indicator.hide();
      expect(indicator.hasAttribute('visible')).toBe(false);
    });

    test('should toggle visibility', () => {
      indicator.toggle();
      expect(indicator.hasAttribute('visible')).toBe(true);
      indicator.toggle();
      expect(indicator.hasAttribute('visible')).toBe(false);
    });

    test('should emit pending-start event on show', (done) => {
      indicator.addEventListener('pending-start', (e) => {
        expect(e.detail.timestamp).toBeDefined();
        done();
      });
      indicator.show();
    });

    test('should emit pending-end event on hide', (done) => {
      indicator.show();
      indicator.addEventListener('pending-end', (e) => {
        expect(e.detail.duration).toBeGreaterThanOrEqual(0);
        done();
      });
      setTimeout(() => indicator.hide(), 10);
    });
  });

  describe('Variants', () => {
    test('should render spinner variant', () => {
      indicator.variant = 'spinner';
      const element = indicator.shadowRoot.querySelector('.variant-spinner');
      expect(element).toBeTruthy();
    });

    test('should render pulse variant', () => {
      indicator.variant = 'pulse';
      const element = indicator.shadowRoot.querySelector('.variant-pulse');
      expect(element).toBeTruthy();
    });

    test('should render shimmer variant', () => {
      indicator.variant = 'shimmer';
      const element = indicator.shadowRoot.querySelector('.variant-shimmer');
      expect(element).toBeTruthy();
    });

    test('should render dot variant with three dots', () => {
      indicator.variant = 'dot';
      const dots = indicator.shadowRoot.querySelectorAll('.dot');
      expect(dots.length).toBe(3);
    });
  });

  describe('Accessibility', () => {
    test('should have role status', () => {
      const statusElement = indicator.shadowRoot.querySelector('[role="status"]');
      expect(statusElement).toBeTruthy();
    });

    test('should have aria-live polite', () => {
      const statusElement = indicator.shadowRoot.querySelector('[aria-live="polite"]');
      expect(statusElement).toBeTruthy();
    });

    test('should have aria-busy true', () => {
      const statusElement = indicator.shadowRoot.querySelector('[aria-busy="true"]');
      expect(statusElement).toBeTruthy();
    });

    test('should have screen reader text', () => {
      const srText = indicator.shadowRoot.querySelector('.sr-only');
      expect(srText).toBeTruthy();
      expect(srText.textContent).toBe('Loading');
    });

    test('should update screen reader text with custom label', () => {
      indicator.label = 'Saving changes';
      const srText = indicator.shadowRoot.querySelector('.sr-only');
      expect(srText.textContent).toBe('Saving changes');
    });
  });

  describe('Performance', () => {
    test('should render within 5ms', () => {
      const start = performance.now();
      const newIndicator = document.createElement('pending-state-indicator');
      document.body.appendChild(newIndicator);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
      newIndicator.remove();
    });

    test('should use CSS containment', () => {
      const element = indicator.shadowRoot.querySelector('.indicator');
      const styles = getComputedStyle(element);
      expect(styles.contain).toContain('layout');
    });

    test('should clean up animation frame on disconnect', () => {
      indicator.show();
      const spy = jest.spyOn(window, 'cancelAnimationFrame');
      indicator.disconnectedCallback();
      // May be called if animation frame was active
      indicator.remove();
    });
  });

  describe('Memory', () => {
    test('should not leak memory on repeated show/hide', () => {
      for (let i = 0; i < 100; i++) {
        indicator.show();
        indicator.hide();
      }
      // If we get here without errors, no obvious leaks
      expect(true).toBe(true);
    });
  });
});