/**
 * ARIA Enhancement for TrackLane Component
 * 
 * Adds proper ARIA attributes and roles to TrackLane organism.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/organisms/TrackLane.aria
 */

import { setRole, setLabel, setLabelledBy, generateId } from '../../utils/aria.js';

/**
 * Enhances TrackLane with ARIA attributes
 * @param {HTMLElement} lane - TrackLane element
 * @param {Object} options - ARIA options
 * @param {string} options.trackName - Track name
 * @param {number} options.trackNumber - Track number
 */
export function enhanceTrackLaneAria(lane, options = {}) {
  // Set region role for track lane
  setRole(lane, 'region');
  
  // Set label
  const label = options.trackName || `Track ${options.trackNumber || 1}`;
  setLabel(lane, label);
  
  // Generate unique ID for labeling
  const labelId = generateId('track-label');
  
  // Find and label track name element
  const nameElement = lane.querySelector('.track-name');
  if (nameElement) {
    nameElement.id = labelId;
    setLabelledBy(lane, labelId);
  }
}