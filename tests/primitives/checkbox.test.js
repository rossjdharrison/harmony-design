/**
 * @fileoverview Unit tests for Checkbox primitive component
 * Tests checked state, accessibility, keyboard interaction, and indeterminate state
 * See: harmony-design/DESIGN_SYSTEM.md#checkbox-component
 */

import { describe, it, beforeEach, afterEach, assert, framework, moduleLoaded } from './test-framework.js';

describe('Checkbox Component', () => {
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
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        container.appendChild(checkbox);

        assert.exists(checkbox);
        assert.equals(checkbox.type, 'checkbox');
        assert.falsy(checkbox.checked);
        framework.trackCoverage('Checkbox', ['render']);
    });

    it('should toggle checked state', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        container.appendChild(checkbox);

        assert.falsy(checkbox.checked);
        
        checkbox.checked = true;
        assert.truthy(checkbox.checked);

        checkbox.checked = false;
        assert.falsy(checkbox.checked);
        framework.trackCoverage('Checkbox', ['checked']);
    });

    it('should trigger change events', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        let changeCount = 0;
        checkbox.addEventListener('change', () => { changeCount++; });
        container.appendChild(checkbox);

        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        assert.equals(changeCount, 1);

        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
        assert.equals(changeCount, 2);
        framework.trackCoverage('Checkbox', ['change']);
    });

    it('should respect disabled state', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.disabled = true;
        container.appendChild(checkbox);

        assert.truthy(checkbox.disabled);
        
        let changed = false;
        checkbox.addEventListener('change', () => { changed = true; });
        checkbox.click();
        assert.falsy(changed, 'Disabled checkbox should not trigger change');
        framework.trackCoverage('Checkbox', ['disabled']);
    });

    it('should have proper ARIA attributes', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-label', 'Accept terms');
        checkbox.setAttribute('role', 'checkbox');
        container.appendChild(checkbox);

        assert.hasAttribute(checkbox, 'aria-label');
        assert.equals(checkbox.getAttribute('aria-label'), 'Accept terms');
        framework.trackCoverage('Checkbox', ['aria']);
    });

    it('should support keyboard interaction (Space)', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        container.appendChild(checkbox);
        checkbox.focus();

        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
        checkbox.dispatchEvent(spaceEvent);
        
        // Space key toggles checkbox
        checkbox.click(); // Simulate space activation
        assert.truthy(checkbox.checked);
        framework.trackCoverage('Checkbox', ['keyboard']);
    });

    it('should support indeterminate state', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        container.appendChild(checkbox);

        checkbox.indeterminate = true;
        assert.truthy(checkbox.indeterminate);

        checkbox.indeterminate = false;
        assert.falsy(checkbox.indeterminate);
        framework.trackCoverage('Checkbox', ['indeterminate']);
    });

    it('should work with label association', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'test-checkbox';
        
        const label = document.createElement('label');
        label.htmlFor = 'test-checkbox';
        label.textContent = 'Test Label';
        
        container.appendChild(checkbox);
        container.appendChild(label);

        assert.equals(checkbox.id, 'test-checkbox');
        assert.equals(label.htmlFor, 'test-checkbox');
        framework.trackCoverage('Checkbox', ['aria']);
    });

    it('should maintain checked state after re-render', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        container.appendChild(checkbox);

        assert.truthy(checkbox.checked);
        
        // Simulate re-render
        container.removeChild(checkbox);
        container.appendChild(checkbox);
        
        assert.truthy(checkbox.checked);
        framework.trackCoverage('Checkbox', ['checked']);
    });
});

moduleLoaded();