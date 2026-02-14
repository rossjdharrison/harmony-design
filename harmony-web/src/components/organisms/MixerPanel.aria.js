/**
 * ARIA Enhancement for MixerPanel Component
 * 
 * Adds proper ARIA attributes and roles to MixerPanel organism.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/organisms/MixerPanel.aria
 */

import { setRole, setLabel } from '../../utils/aria.js';

/**
 * Enhances MixerPanel with ARIA attributes
 * @param {HTMLElement} panel - MixerPanel element
 */
export function enhanceMixerPanelAria(panel) {
  // Set region role for mixer panel
  setRole(panel, 'region');
  setLabel(panel, 'Audio mixer');
  
  // Set orientation for channel strip layout
  panel.setAttribute('aria-orientation', 'horizontal');
}