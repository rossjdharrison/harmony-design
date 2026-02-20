/**
 * @fileoverview Menu compound component exports
 * @module primitives/menu
 * 
 * Compound Menu pattern with shared state management.
 * Components work together through parent-child communication.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#compound-menu-pattern}
 */

export { MenuRoot } from './menu-root.js';
export { MenuTrigger } from './menu-trigger.js';
export { MenuContent } from './menu-content.js';
export { MenuItem } from './menu-item.js';

/**
 * Menu namespace for compound pattern
 * 
 * @example
 * import { Menu } from './primitives/menu/index.js';
 * 
 * // Components are available as:
 * // - <harmony-menu-root>
 * // - <harmony-menu-trigger>
 * // - <harmony-menu-content>
 * // - <harmony-menu-item>
 */
export const Menu = {
  Root: 'harmony-menu-root',
  Trigger: 'harmony-menu-trigger',
  Content: 'harmony-menu-content',
  Item: 'harmony-menu-item'
};