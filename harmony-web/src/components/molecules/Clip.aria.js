/**
 * ARIA Enhancement for Clip Component
 * 
 * Adds proper ARIA attributes and roles to Clip molecule.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/molecules/Clip.aria
 */

import { 
  setRole, 
  setLabel, 
  setPressed,
  setDisabled,
  generateId 
} from '../../utils/aria.js';

/**
 * Enhances Clip with ARIA attributes
 * @param {HTMLElement} clip - Clip element
 * @param {Object} options - ARIA options
 * @param {string} options.name - Clip name
 * @param {number} options.startTime - Start time in seconds
 * @param {number} options.duration - Duration in seconds
 * @param {boolean} options.selected - Selection state
 * @param {boolean} options.muted - Muted state
 */
export function enhanceClipAria(clip, options = {}) {
  // Set button role (clips are interactive)
  setRole(clip, 'button');
  
  // Build descriptive label
  const name = options.name || 'Untitled';
  const start = formatTime(options.startTime || 0);
  const duration = formatTime(options.duration || 0);
  const label = `${name}, starts at ${start}, duration ${duration}`;
  
  setLabel(clip, label);
  
  // Set pressed state for selection
  if (typeof options.selected === 'boolean') {
    setPressed(clip, options.selected);
  }
  
  // Set disabled state for muted clips
  if (typeof options.muted === 'boolean') {
    setDisabled(clip, options.muted);
  }
  
  // Ensure keyboard accessibility
  if (!clip.hasAttribute('tabindex')) {
    clip.setAttribute('tabindex', '0');
  }
}

/**
 * Updates ARIA attributes when clip state changes
 * @param {HTMLElement} clip - Clip element
 * @param {Object} state - New state
 */
export function updateClipAria(clip, state) {
  if (typeof state.selected === 'boolean') {
    setPressed(clip, state.selected);
  }
  
  if (typeof state.muted === 'boolean') {
    setDisabled(clip, state.muted);
  }
}

/**
 * Formats time in seconds to human-readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}