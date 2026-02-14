/**
 * ARIA Enhancement for TransportBar Component
 * 
 * Adds proper ARIA attributes and roles to TransportBar organism.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/organisms/TransportBar.aria
 */

import { setRole, setLabel } from '../../utils/aria.js';

/**
 * Enhances TransportBar with ARIA attributes
 * @param {HTMLElement} transportBar - TransportBar element
 */
export function enhanceTransportBarAria(transportBar) {
  // Set toolbar role for transport controls
  setRole(transportBar, 'toolbar');
  setLabel(transportBar, 'Playback controls');
  
  // Ensure proper keyboard navigation
  transportBar.setAttribute('aria-orientation', 'horizontal');
}