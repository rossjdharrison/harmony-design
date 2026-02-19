/**
 * @fileoverview Lucide Audio Extensions - Custom audio-specific icons
 * @module tokens/icons/lucide-audio-extensions
 * 
 * Extends Lucide icon library with audio production-specific icons not in the standard set.
 * All icons follow Lucide's design principles: 24x24 viewBox, 2px stroke, rounded caps.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#Icon-System} for usage guidelines
 * @see {@link ../../components/controls/harmony-icon.js} for icon component
 */

/**
 * Custom audio-specific Lucide icon definitions
 * Each icon is an SVG path string following Lucide conventions:
 * - 24x24 viewBox
 * - 2px stroke width
 * - round line caps and joins
 * - no fill (stroke only)
 * 
 * @type {Object.<string, string>}
 */
export const LUCIDE_AUDIO_EXTENSIONS = {
  // Audio Routing & Signal Flow
  'audio-bus': `<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/>`,
  
  'audio-send': `<path d="M12 3v18M12 3l4 4M12 3L8 7"/><path d="M16 12h5M16 16h3"/>`,
  
  'audio-return': `<path d="M12 21V3M12 21l-4-4M12 21l4-4"/><path d="M8 12H3M8 8H5"/>`,
  
  'sidechain': `<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h2v10h-2z"/><circle cx="12" cy="12" r="1.5"/>`,
  
  // Mixing & Processing
  'gain-staging': `<path d="M12 3v18"/><path d="M8 7l4-4 4 4"/><rect x="10" y="10" width="4" height="8"/><path d="M6 18h12"/>`,
  
  'phase-invert': `<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>`,
  
  'mono-sum': `<path d="M8 3v18M16 3v18"/><path d="M8 12h8"/><circle cx="12" cy="12" r="2"/>`,
  
  'stereo-width': `<path d="M3 12h18"/><path d="M6 8l-3 4 3 4M18 8l3 4-3 4"/>`,
  
  'mid-side': `<path d="M12 3v18M3 12h18"/><circle cx="12" cy="8" r="2"/><path d="M8 16h8v2H8z"/>`,
  
  // Effects & Modulation
  'compressor': `<path d="M3 18c0-3 2-5 4-6s4-3 4-6"/><path d="M21 18c0-3-2-5-4-6s-4-3-4-6"/><path d="M3 18h18"/>`,
  
  'limiter': `<path d="M3 18L9 6l6 12 6-12"/><path d="M3 10h18"/>`,
  
  'expander': `<path d="M3 6v12l6-4v8l6-4v8l6-12"/><path d="M21 6v12"/>`,
  
  'gate-audio': `<rect x="3" y="8" width="18" height="8"/><path d="M3 12h6M15 12h6"/><rect x="9" y="10" width="6" height="4"/>`,
  
  'saturator': `<path d="M3 12c0 0 3-6 9-6s9 6 9 6-3 6-9 6-9-6-9-6z"/><path d="M12 9v6"/>`,
  
  'chorus': `<path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M3 16c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>`,
  
  'flanger': `<path d="M3 8c3-2 6-2 9 0s6 2 9 0"/><path d="M3 12c3-2 6-2 9 0s6 2 9 0"/><path d="M3 16c3-2 6-2 9 0s6 2 9 0"/>`,
  
  'phaser': `<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="3"/>`,
  
  // Time-based Effects
  'delay-feedback': `<circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><path d="M11 12h2"/><path d="M16 9c2 0 3 1 3 3s-1 3-3 3"/>`,
  
  'reverb-room': `<rect x="4" y="4" width="16" height="16" rx="1"/><circle cx="8" cy="8" r="1"/><path d="M9 9l2 2m1 1l2 2m-6 0l2-2m1-1l2-2"/>`,
  
  'tape-delay': `<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><path d="M12 12h4M8 8v8M16 8v8"/>`,
  
  // Metering & Analysis
  'spectrum-analyzer': `<path d="M3 20V10M8 20V14M13 20V8M18 20V12"/><path d="M3 4h18"/>`,
  
  'waveform-display': `<path d="M3 12h2l1-4 2 8 2-8 2 4 2-2 2 2 2-4 2 8 1-4h2"/>`,
  
  'phase-meter': `<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="2" fill="currentColor"/>`,
  
  'correlation-meter': `<circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/>`,
  
  'loudness-meter': `<rect x="6" y="3" width="3" height="18"/><rect x="11" y="6" width="3" height="15"/><rect x="16" y="9" width="3" height="12"/>`,
  
  // MIDI & Automation
  'midi-note': `<rect x="4" y="8" width="16" height="8" rx="1"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><path d="M12 10v4M16 10v4"/>`,
  
  'automation-lane': `<path d="M3 16l3-4 3 2 3-6 3 4 3-2 3 6"/><path d="M3 20h18"/>`,
  
  'midi-cc': `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8v8M12 10v6M16 9v6"/>`,
  
  'pitch-bend': `<path d="M12 3v18"/><path d="M12 3c-4 0-8 4-8 9s4 9 8 9M12 3c4 0 8 4 8 9s-4 9-8 9"/>`,
  
  // Sampling & Audio Files
  'sample-editor': `<rect x="3" y="8" width="18" height="8"/><path d="M6 12h3l2-3 2 6 2-6 2 3h3"/><path d="M10 6v12M14 6v12"/>`,
  
  'loop-region': `<rect x="6" y="8" width="12" height="8" rx="1"/><path d="M6 12h12"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>`,
  
  'audio-slice': `<rect x="3" y="8" width="18" height="8"/><path d="M9 8v8M15 8v8"/><path d="M9 6l-1 2M15 6l1 2M9 18l-1-2M15 18l1-2"/>`,
  
  'time-stretch': `<path d="M4 8h16v8H4z"/><path d="M8 12h8M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l-2 2"/>`,
  
  // Modular/Routing
  'patch-cable': `<path d="M4 12c0-2 1-4 3-4h10c2 0 3 2 3 4s-1 4-3 4H7c-2 0-3-2-3-4z"/><circle cx="4" cy="12" r="2"/><circle cx="20" cy="12" r="2"/>`,
  
  'audio-input': `<rect x="8" y="4" width="8" height="16" rx="1"/><path d="M4 8l4 4-4 4"/>`,
  
  'audio-output': `<rect x="8" y="4" width="8" height="16" rx="1"/><path d="M16 8l4 4-4 4"/>`,
  
  'insert-slot': `<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>`,
  
  // Transport & Recording
  'punch-in': `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 3v4M12 17v4"/>`,
  
  'punch-out': `<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/><path d="M12 3v4M12 17v4"/>`,
  
  'pre-roll': `<path d="M8 6v12l8-6z"/><path d="M4 6v12"/>`,
  
  'post-roll': `<path d="M16 6v12l-8-6z"/><path d="M20 6v12"/>`,
  
  'count-in': `<circle cx="12" cy="12" r="9"/><path d="M11 8h2v8h-2"/>`,
  
  // Utility
  'audio-freeze': `<path d="M12 2l3 5h-6l3-5zM12 22l3-5h-6l3 5zM2 12l5-3v6l-5-3zM22 12l-5-3v6l5-3z"/>`,
  
  'bounce-export': `<path d="M3 12h18"/><path d="M12 3v18"/><path d="M7 7l5 5 5-5M7 17l5-5 5 5"/>`,
  
  'audio-normalize': `<path d="M3 18l3-6 3 3 3-9 3 6 3-3 3 6"/><path d="M3 6h18"/>`,
  
  'dc-offset': `<path d="M3 12h18M3 8h18"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/>`,
};

/**
 * Get a custom audio icon SVG path
 * @param {string} iconName - Name of the icon
 * @returns {string|null} SVG path string or null if not found
 */
export function getAudioIcon(iconName) {
  return LUCIDE_AUDIO_EXTENSIONS[iconName] || null;
}

/**
 * Check if an icon name is a custom audio extension
 * @param {string} iconName - Name to check
 * @returns {boolean} True if it's a custom audio icon
 */
export function isAudioExtension(iconName) {
  return iconName in LUCIDE_AUDIO_EXTENSIONS;
}

/**
 * Get all available audio extension icon names
 * @returns {string[]} Array of icon names
 */
export function getAudioExtensionNames() {
  return Object.keys(LUCIDE_AUDIO_EXTENSIONS);
}

/**
 * Create a complete SVG element for an audio icon
 * @param {string} iconName - Name of the icon
 * @param {Object} options - SVG options
 * @param {string} [options.class] - CSS class name
 * @param {string} [options.stroke='currentColor'] - Stroke color
 * @param {string} [options.strokeWidth='2'] - Stroke width
 * @param {string} [options.size='24'] - Icon size
 * @returns {string} Complete SVG string
 */
export function createAudioIconSVG(iconName, options = {}) {
  const path = getAudioIcon(iconName);
  if (!path) {
    console.warn(`Audio icon "${iconName}" not found`);
    return '';
  }

  const {
    class: className = '',
    stroke = 'currentColor',
    strokeWidth = '2',
    size = '24'
  } = options;

  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${size}"
    height="${size}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="${stroke}"
    stroke-width="${strokeWidth}"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="${className}"
  >${path}</svg>`;
}

/**
 * Icon categories for organization
 * @type {Object.<string, string[]>}
 */
export const AUDIO_ICON_CATEGORIES = {
  routing: ['audio-bus', 'audio-send', 'audio-return', 'sidechain', 'patch-cable', 'audio-input', 'audio-output', 'insert-slot'],
  mixing: ['gain-staging', 'phase-invert', 'mono-sum', 'stereo-width', 'mid-side'],
  dynamics: ['compressor', 'limiter', 'expander', 'gate-audio', 'saturator'],
  modulation: ['chorus', 'flanger', 'phaser'],
  time: ['delay-feedback', 'reverb-room', 'tape-delay'],
  metering: ['spectrum-analyzer', 'waveform-display', 'phase-meter', 'correlation-meter', 'loudness-meter'],
  midi: ['midi-note', 'automation-lane', 'midi-cc', 'pitch-bend'],
  editing: ['sample-editor', 'loop-region', 'audio-slice', 'time-stretch'],
  transport: ['punch-in', 'punch-out', 'pre-roll', 'post-roll', 'count-in'],
  utility: ['audio-freeze', 'bounce-export', 'audio-normalize', 'dc-offset']
};

/**
 * Get icons by category
 * @param {string} category - Category name
 * @returns {string[]} Array of icon names in that category
 */
export function getIconsByCategory(category) {
  return AUDIO_ICON_CATEGORIES[category] || [];
}

/**
 * Get all categories
 * @returns {string[]} Array of category names
 */
export function getCategories() {
  return Object.keys(AUDIO_ICON_CATEGORIES);
}