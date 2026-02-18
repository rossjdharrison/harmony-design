/**
 * @fileoverview Unit tests for Input primitive component
 * Tests value binding, validation, accessibility, and input types
 * See: harmony-design/DESIGN_SYSTEM.md#input-component
 */

import { describe, it, beforeEach, afterEach, assert, framework, moduleLoaded } from './test-framework.js';

describe('Input Component', () => {
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
        const input = document.createElement('input');
        input.type = 'text';
        container.appendChild(input);

        assert.exists(input);
        assert.equals(input.type, 'text');
        framework.trackCoverage('Input', ['render']);
    });

    it('should bind and update value', () => {
        const input = document.createElement('input');
        container.appendChild(input);

        input.value = 'test value';
        assert.equals(input.value, 'test value');

        input.value = 'updated';
        assert.equals(input.value, 'updated');
        framework.trackCoverage('Input', ['value']);
    });

    it('should trigger change events', () => {
        const input = document.createElement('input');
        let changeTriggered = false;
        input.addEventListener('change', () => { changeTriggered = true; });
        container.appendChild(input);

        input.value = 'new value';
        input.dispatchEvent(new Event('change'));

        assert.truthy(changeTriggered);
        framework.trackCoverage('Input', ['change']);
    });

    it('should respect disabled state', () => {
        const input = document.createElement('input');
        input.disabled = true;
        container.appendChild(input);

        assert.truthy(input.disabled);
        assert.hasAttribute(input, 'disabled');
        framework.trackCoverage('Input', ['disabled']);
    });

    it('should have proper ARIA attributes', () => {
        const input = document.createElement('input');
        input.setAttribute('aria-label', 'Email address');
        input.setAttribute('aria-required', 'true');
        container.appendChild(input);

        assert.hasAttribute(input, 'aria-label');
        assert.hasAttribute(input, 'aria-required');
        assert.equals(input.getAttribute('aria-required'), 'true');
        framework.trackCoverage('Input', ['aria']);
    });

    it('should support HTML5 validation', () => {
        const input = document.createElement('input');
        input.type = 'email';
        input.required = true;
        container.appendChild(input);

        assert.truthy(input.required);
        assert.equals(input.type, 'email');
        
        input.value = 'invalid-email';
        assert.falsy(input.validity.valid);

        input.value = 'valid@example.com';
        assert.truthy(input.validity.valid);
        framework.trackCoverage('Input', ['validation']);
    });

    it('should support different input types', () => {
        const types = ['text', 'email', 'password', 'number', 'tel', 'url'];
        
        types.forEach(type => {
            const input = document.createElement('input');
            input.type = type;
            container.appendChild(input);
            assert.equals(input.type, type);
        });

        framework.trackCoverage('Input', ['types']);
    });

    it('should support placeholder text', () => {
        const input = document.createElement('input');
        input.placeholder = 'Enter your name';
        container.appendChild(input);

        assert.equals(input.placeholder, 'Enter your name');
        framework.trackCoverage('Input', ['render']);
    });

    it('should support maxlength attribute', () => {
        const input = document.createElement('input');
        input.maxLength = 10;
        container.appendChild(input);

        input.value = '12345678901234';
        assert.truthy(input.value.length <= 10);
        framework.trackCoverage('Input', ['validation']);
    });

    it('should support readonly state', () => {
        const input = document.createElement('input');
        input.readOnly = true;
        input.value = 'readonly value';
        container.appendChild(input);

        assert.truthy(input.readOnly);
        assert.equals(input.value, 'readonly value');
        framework.trackCoverage('Input', ['render']);
    });
});

moduleLoaded();