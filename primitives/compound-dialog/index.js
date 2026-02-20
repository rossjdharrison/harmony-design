/**
 * @fileoverview Compound Dialog - Export all dialog components
 * @module primitives/compound-dialog
 * 
 * Compound dialog pattern with focus trap and ARIA support.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#compound-patterns}
 */

import DialogRoot from './dialog-root.js';
import DialogTrigger from './dialog-trigger.js';
import DialogContent from './dialog-content.js';
import DialogClose from './dialog-close.js';

export {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogClose
};

export default {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Close: DialogClose
};