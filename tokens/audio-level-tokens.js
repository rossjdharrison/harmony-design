/**
 * @fileoverview Audio Level Tokens
 * @module tokens/audio-level-tokens
 * 
 * Defines color tokens for audio level metering and visualization.
 * These tokens are used for VU meters, peak meters, and level indicators
 * to provide consistent visual feedback for audio signal levels.
 * 
 * Level zones follow professional audio standards:
 * - Safe: -∞ to -18dBFS (green zone, optimal operating range)
 * - Warning: -18dBFS to -6dBFS (yellow zone, approaching limits)
 * - Peak: -6dBFS to -3dBFS (amber zone, high level)
 * - Clip: -3dBFS to 0dBFS (red zone, risk of distortion)
 * - RMS: Average level indicator (typically green with lower saturation)
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#audio-level-tokens}
 */

/**
 * Audio level color tokens for metering and visualization
 * @constant {Object} AUDIO_LEVEL_TOKENS
 */
export const AUDIO_LEVEL_TOKENS = {
  /**
   * Peak level indicator color
   * Used for peak hold indicators and instantaneous peak values
   * High saturation amber/orange for high visibility
   */
  'level-peak': {
    value: 'hsl(30, 100%, 50%)',
    description: 'Peak level indicator color (amber)',
    category: 'audio-level',
    type: 'color'
  },

  /**
   * RMS (Root Mean Square) level indicator color
   * Used for average level metering, less saturated than peak
   * Green with moderate saturation for continuous monitoring
   */
  'level-rms': {
    value: 'hsl(142, 65%, 45%)',
    description: 'RMS/average level indicator color (moderate green)',
    category: 'audio-level',
    type: 'color'
  },

  /**
   * Clipping/overload indicator color
   * Used when signal exceeds 0dBFS or enters clipping range
   * Bright red for immediate attention
   */
  'level-clip': {
    value: 'hsl(0, 100%, 50%)',
    description: 'Clipping/overload indicator color (bright red)',
    category: 'audio-level',
    type: 'color'
  },

  /**
   * Safe operating level indicator color
   * Used for -∞ to -18dBFS range (optimal operating zone)
   * Green for "all clear" visual feedback
   */
  'level-safe': {
    value: 'hsl(142, 75%, 50%)',
    description: 'Safe operating level color (green)',
    category: 'audio-level',
    type: 'color'
  },

  /**
   * Warning level indicator color
   * Used for -18dBFS to -6dBFS range (approaching limits)
   * Yellow for caution
   */
  'level-warning': {
    value: 'hsl(45, 100%, 50%)',
    description: 'Warning level color (yellow)',
    category: 'audio-level',
    type: 'color'
  }
};

/**
 * CSS custom property names for audio level tokens
 * @constant {Object} AUDIO_LEVEL_CSS_VARS
 */
export const AUDIO_LEVEL_CSS_VARS = {
  'level-peak': '--harmony-level-peak',
  'level-rms': '--harmony-level-rms',
  'level-clip': '--harmony-level-clip',
  'level-safe': '--harmony-level-safe',
  'level-warning': '--harmony-level-warning'
};

/**
 * Applies audio level tokens to document root as CSS custom properties
 * @returns {void}
 */
export function applyAudioLevelTokens() {
  const root = document.documentElement;
  
  Object.entries(AUDIO_LEVEL_TOKENS).forEach(([tokenName, tokenData]) => {
    const cssVarName = AUDIO_LEVEL_CSS_VARS[tokenName];
    root.style.setProperty(cssVarName, tokenData.value);
  });
}

/**
 * Gets the color value for a specific audio level based on dBFS value
 * @param {number} dbfs - The level in dBFS (-∞ to 0)
 * @returns {string} The appropriate color token value
 */
export function getAudioLevelColor(dbfs) {
  if (dbfs >= -3) {
    return AUDIO_LEVEL_TOKENS['level-clip'].value;
  } else if (dbfs >= -6) {
    return AUDIO_LEVEL_TOKENS['level-peak'].value;
  } else if (dbfs >= -18) {
    return AUDIO_LEVEL_TOKENS['level-warning'].value;
  } else {
    return AUDIO_LEVEL_TOKENS['level-safe'].value;
  }
}

/**
 * Gets the CSS variable name for a specific audio level based on dBFS value
 * @param {number} dbfs - The level in dBFS (-∞ to 0)
 * @returns {string} The appropriate CSS variable name
 */
export function getAudioLevelCSSVar(dbfs) {
  if (dbfs >= -3) {
    return AUDIO_LEVEL_CSS_VARS['level-clip'];
  } else if (dbfs >= -6) {
    return AUDIO_LEVEL_CSS_VARS['level-peak'];
  } else if (dbfs >= -18) {
    return AUDIO_LEVEL_CSS_VARS['level-warning'];
  } else {
    return AUDIO_LEVEL_CSS_VARS['level-safe'];
  }
}

// Auto-apply on module load if in browser context
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAudioLevelTokens);
  } else {
    applyAudioLevelTokens();
  }
}