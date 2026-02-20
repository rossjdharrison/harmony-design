/**
 * @fileoverview Popover Compound Component Exports
 * @module components/primitives/popover
 * 
 * Compound popover component with Root, Trigger, and Content parts.
 * Provides positioned overlay content with smart collision detection.
 * 
 * Related: DESIGN_SYSTEM.md § Compound Components > Popover Pattern
 */

import PopoverRoot from './PopoverRoot.js';
import PopoverTrigger from './PopoverTrigger.js';
import PopoverContent from './PopoverContent.js';

export { PopoverRoot, PopoverTrigger, PopoverContent };

export default {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent
};