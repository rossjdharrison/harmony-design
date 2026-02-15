/**
 * @fileoverview Zod schemas for component properties
 * @module core/validation/component-schemas
 * 
 * Defines validation schemas for Web Component properties and attributes.
 * Used by components to validate props at runtime.
 * 
 * Related: See DESIGN_SYSTEM.md § Component System
 */

import { z } from './zod-lite.js';

/**
 * Button component props schema
 */
export const ButtonPropsSchema = z.object({
  variant: z.enum(['primary', 'secondary', 'tertiary']).default('primary'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  disabled: z.boolean().default(false),
  type: z.enum(['button', 'submit', 'reset']).default('button'),
  ariaLabel: z.string().optional(),
});

/**
 * Toggle component props schema
 */
export const TogglePropsSchema = z.object({
  checked: z.boolean().default(false),
  disabled: z.boolean().default(false),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  ariaLabel: z.string().optional(),
});

/**
 * Slider component props schema
 */
export const SliderPropsSchema = z.object({
  value: z.number().default(0),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().min(0).default(1),
  disabled: z.boolean().default(false),
  orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
  ariaLabel: z.string().optional(),
});

/**
 * Icon component props schema
 */
export const IconPropsSchema = z.object({
  name: z.string(),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  color: z.string().optional(),
  ariaLabel: z.string().optional(),
});

/**
 * Card component props schema
 */
export const CardPropsSchema = z.object({
  variant: z.enum(['elevated', 'outlined', 'filled']).default('elevated'),
  padding: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
  interactive: z.boolean().default(false),
});

/**
 * Modal component props schema
 */
export const ModalPropsSchema = z.object({
  open: z.boolean().default(false),
  size: z.enum(['small', 'medium', 'large', 'fullscreen']).default('medium'),
  closeOnOverlayClick: z.boolean().default(true),
  closeOnEscape: z.boolean().default(true),
  ariaLabel: z.string().optional(),
});

/**
 * Tooltip component props schema
 */
export const TooltipPropsSchema = z.object({
  content: z.string(),
  placement: z.enum(['top', 'right', 'bottom', 'left']).default('top'),
  delay: z.number().min(0).default(200),
  interactive: z.boolean().default(false),
});

/**
 * Map of component names to their prop schemas
 */
export const ComponentPropsRegistry = {
  'harmony-button': ButtonPropsSchema,
  'harmony-toggle': TogglePropsSchema,
  'harmony-slider': SliderPropsSchema,
  'harmony-icon': IconPropsSchema,
  'harmony-card': CardPropsSchema,
  'harmony-modal': ModalPropsSchema,
  'harmony-tooltip': TooltipPropsSchema,
};

/**
 * Validate component props
 * @param {string} componentName - Name of the component
 * @param {Object} props - Props to validate
 * @returns {{success: boolean, data?: Object, error?: Object}}
 */
export function validateComponentProps(componentName, props) {
  const schema = ComponentPropsRegistry[componentName];
  if (!schema) {
    console.warn(`No schema registered for component: ${componentName}`);
    return { success: true, data: props };
  }

  return schema.safeParse(props);
}