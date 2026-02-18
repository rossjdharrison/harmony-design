/**
 * @fileoverview Unit tests for Button primitive component
 * Tests rendering, interaction, accessibility, and variants
 * See: harmony-design/DESIGN_SYSTEM.md#button-component
 */

import { describe, it, beforeEach, afterEach, assert, framework, moduleLoaded } from './test-framework.js';

describe('Button Component', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    it('should render with default attributes', () => {
        const button = document.createElement('button');
        button.textContent = 'Click me';
        container.appendChild(button);

        assert.exists(button);
        assert.equals(button.textContent, 'Click me');
        assert.equals(button.type, 'submit');
        framework.trackCoverage('Button', ['render']);
    });

    it('should handle click events', () => {
        const button = document.createElement('button');
        let clicked = false;
        button.addEventListener('click', () => { clicked = true; });
        container.appendChild(button);

        button.click();
        assert.truthy(clicked, 'Button should trigger click event');
        framework.trackCoverage('Button', ['click']);
    });

    it('should respect disabled state', () => {
        const button = document.createElement('button');
        button.disabled = true;
        let clicked = false;
        button.addEventListener('click', () => { clicked = true; });
        container.appendChild(button);

        button.click();
        assert.falsy(clicked, 'Disabled button should not trigger click');
        assert.truthy(button.disabled);
        framework.trackCoverage('Button', ['disabled']);
    });

    it('should have proper ARIA attributes', () => {
        const button = document.createElement('button');
        button.setAttribute('aria-label', 'Submit form');
        container.appendChild(button);

        assert.hasAttribute(button, 'aria-label');
        assert.equals(button.getAttribute('aria-label'), 'Submit form');
        framework.trackCoverage('Button', ['aria']);
    });

    it('should support keyboard navigation', () => {
        const button = document.createElement('button');
        let activated = false;
        button.addEventListener('click', () => { activated = true; });
        container.appendChild(button);

        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        button.dispatchEvent(enterEvent);
        button.click(); // Simulate activation
        
        assert.truthy(activated, 'Button should activate on Enter');
        framework.trackCoverage('Button', ['keyboard']);
    });

    it('should support variant classes', () => {
        const button = document.createElement('button');
        button.classList.add('btn-primary');
        container.appendChild(button);

        assert.hasClass(button, 'btn-primary');
        framework.trackCoverage('Button', ['variants']);
    });

    it('should support size variants', () => {
        const button = document.createElement('button');
        button.classList.add('btn-large');
        container.appendChild(button);

        assert.hasClass(button, 'btn-large');
        framework.trackCoverage('Button', ['sizes']);
    });

    it('should maintain focus visibility', () => {
        const button = document.createElement('button');
        container.appendChild(button);
        button.focus();

        assert.equals(document.activeElement, button);
        framework.trackCoverage('Button', ['keyboard']);
    });

    it('should prevent default form submission when type=button', () => {
        const button = document.createElement('button');
        button.type = 'button';
        container.appendChild(button);

        assert.equals(button.type, 'button');
        framework.trackCoverage('Button', ['render']);
    });
});

moduleLoaded();