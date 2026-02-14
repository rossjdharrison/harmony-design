/**
 * ARIA Enhancement for ChannelStrip Component
 * 
 * Adds proper ARIA attributes and roles to ChannelStrip molecule.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/molecules/ChannelStrip.aria
 */

import { setRole, setLabel, setLabelledBy, generateId } from '../../utils/aria.js';

/**
 * Enhances ChannelStrip with ARIA attributes
 * @param {HTMLElement} strip - ChannelStrip element
 * @param {Object} options - ARIA options
 * @param {string} options.label - Accessible label for the channel
 * @param {number} options.channelNumber - Channel number
 */
export function enhanceChannelStripAria(strip, options = {}) {
  // Set group role to indicate related controls
  setRole(strip, 'group');
  
  // Set label
  const label = options.label || `Channel ${options.channelNumber || 1}`;
  setLabel(strip, label);
  
  // Generate unique IDs for labeling relationships
  const labelId = generateId('channel-label');
  
  // Find and label child elements
  const nameElement = strip.querySelector('.channel-name');
  if (nameElement) {
    nameElement.id = labelId;
    setLabelledBy(strip, labelId);
  }
}