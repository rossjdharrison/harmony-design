/**
 * @fileoverview Accessibility rules for Web Components
 * @module config/eslint-a11y-rules
 * 
 * Custom ESLint rules to enforce WCAG 2.1 Level AA compliance in vanilla
 * Web Components. These complement automated testing with axe-core.
 * 
 * @see {@link ../DESIGN_SYSTEM.md#accessibility Accessibility Guidelines}
 * @see {@link ../tests/a11y/ A11y Integration Tests}
 */

/**
 * Custom rule: Ensure interactive elements have keyboard handlers
 * 
 * @type {import('eslint').Rule.RuleModule}
 */
export const interactiveElementsHaveKeyboardHandlers = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Interactive elements must have keyboard event handlers',
      category: 'Accessibility',
      recommended: true,
    },
    messages: {
      missingKeyboardHandler: 'Interactive element with "{{event}}" should also have keyboard handler (keydown/keyup)',
    },
    schema: [],
  },
  create(context) {
    const interactiveEvents = new Set(['click', 'mousedown', 'mouseup']);
    const keyboardEvents = new Set(['keydown', 'keyup', 'keypress']);
    const elementHandlers = new Map();

    return {
      'CallExpression[callee.property.name="addEventListener"]'(node) {
        const eventType = node.arguments[0]?.value;
        if (!eventType) {
          return;
        }

        const element = node.callee.object;
        const elementKey = context.getSourceCode().getText(element);

        if (!elementHandlers.has(elementKey)) {
          elementHandlers.set(elementKey, new Set());
        }
        elementHandlers.get(elementKey).add(eventType);
      },
      'Program:exit'() {
        for (const [element, events] of elementHandlers) {
          const hasInteractive = Array.from(events).some(e => interactiveEvents.has(e));
          const hasKeyboard = Array.from(events).some(e => keyboardEvents.has(e));

          if (hasInteractive && !hasKeyboard) {
            const interactiveEvent = Array.from(events).find(e => interactiveEvents.has(e));
            context.report({
              node: context.getSourceCode().ast,
              messageId: 'missingKeyboardHandler',
              data: { event: interactiveEvent },
            });
          }
        }
      },
    };
  },
};

/**
 * Custom rule: Ensure ARIA attributes are valid
 * 
 * @type {import('eslint').Rule.RuleModule}
 */
export const validAriaAttributes = {
  meta: {
    type: 'problem',
    docs: {
      description: 'ARIA attributes must be valid and properly used',
      category: 'Accessibility',
      recommended: true,
    },
    messages: {
      invalidAriaAttribute: 'Invalid ARIA attribute: "{{attribute}}"',
      ariaRequiresRole: 'ARIA attribute "{{attribute}}" requires a role attribute',
    },
    schema: [],
  },
  create(context) {
    const validAriaAttributes = new Set([
      'aria-label',
      'aria-labelledby',
      'aria-describedby',
      'aria-hidden',
      'aria-live',
      'aria-atomic',
      'aria-busy',
      'aria-controls',
      'aria-current',
      'aria-disabled',
      'aria-expanded',
      'aria-haspopup',
      'aria-invalid',
      'aria-pressed',
      'aria-readonly',
      'aria-required',
      'aria-selected',
      'aria-checked',
      'aria-valuemin',
      'aria-valuemax',
      'aria-valuenow',
      'aria-valuetext',
    ]);

    return {
      'CallExpression[callee.property.name="setAttribute"]'(node) {
        const attrName = node.arguments[0]?.value;
        if (!attrName || !attrName.startsWith('aria-')) {
          return;
        }

        if (!validAriaAttributes.has(attrName)) {
          context.report({
            node,
            messageId: 'invalidAriaAttribute',
            data: { attribute: attrName },
          });
        }
      },
    };
  },
};

export default {
  rules: {
    'interactive-elements-have-keyboard-handlers': interactiveElementsHaveKeyboardHandlers,
    'valid-aria-attributes': validAriaAttributes,
  },
};