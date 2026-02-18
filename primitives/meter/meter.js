/**
 * @fileoverview Meter primitive component with audio level visualization
 * @module harmony-design/primitives/meter
 * 
 * Provides visual feedback for audio levels with peak detection and decay.
 * Supports vertical and horizontal orientations, configurable ranges,
 * and multiple color zones (green/yellow/red).
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#meter-primitive
 */

/**
 * Meter primitive web component for audio level visualization
 * 
 * @fires meter-overflow - Dispatched when level exceeds maximum threshold
 * 
 * @example
 * <harmony-meter 
 *   orientation="vertical"
 *   min-db="-60"
 *   max-db="0"
 *   value="-12"
 *   peak-hold="1500">
 * </harmony-meter>
 */
class HarmonyMeter extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   */
  static get observedAttributes() {
    return ['orientation', 'min-db', 'max-db', 'value', 'peak-hold', 'disabled'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._value = -60; // Current level in dB
    this._peak = -60; // Peak level in dB
    this._minDb = -60;
    this._maxDb = 0;
    this._orientation = 'vertical';
    this._peakHold = 1500; // Peak hold time in ms
    this._disabled = false;
    
    // Peak decay management
    this._peakTimeout = null;
    this._lastUpdateTime = performance.now();
    this._animationFrame = null;
    
    // Performance tracking
    this._renderStartTime = 0;
  }

  connectedCallback() {
    this._render();
    this._startDecayAnimation();
  }

  disconnectedCallback() {
    this._stopDecayAnimation();
    if (this._peakTimeout) {
      clearTimeout(this._peakTimeout);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'orientation':
        this._orientation = newValue === 'horizontal' ? 'horizontal' : 'vertical';
        break;
      case 'min-db':
        this._minDb = parseFloat(newValue) || -60;
        break;
      case 'max-db':
        this._maxDb = parseFloat(newValue) || 0;
        break;
      case 'value':
        this._updateValue(parseFloat(newValue) || this._minDb);
        break;
      case 'peak-hold':
        this._peakHold = parseInt(newValue, 10) || 1500;
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
    }
    
    this._render();
  }

  /**
   * Update meter value and peak tracking
   * @param {number} valueDb - Level in dB
   * @private
   */
  _updateValue(valueDb) {
    const clampedValue = Math.max(this._minDb, Math.min(this._maxDb, valueDb));
    this._value = clampedValue;
    
    // Update peak if new value is higher
    if (clampedValue > this._peak) {
      this._peak = clampedValue;
      this._resetPeakHold();
    }
    
    // Emit overflow event if exceeding threshold
    if (clampedValue >= this._maxDb - 3) { // 3dB below max
      this.dispatchEvent(new CustomEvent('meter-overflow', {
        detail: { value: clampedValue, peak: this._peak },
        bubbles: true,
        composed: true
      }));
    }
  }

  /**
   * Reset peak hold timer
   * @private
   */
  _resetPeakHold() {
    if (this._peakTimeout) {
      clearTimeout(this._peakTimeout);
    }
    
    this._peakTimeout = setTimeout(() => {
      this._peak = this._value;
      this._render();
    }, this._peakHold);
  }

  /**
   * Start decay animation loop for smooth visual updates
   * @private
   */
  _startDecayAnimation() {
    const animate = () => {
      const now = performance.now();
      const delta = now - this._lastUpdateTime;
      this._lastUpdateTime = now;
      
      // Smooth decay (optional visual enhancement)
      // Currently just triggers re-render for future decay features
      
      this._animationFrame = requestAnimationFrame(animate);
    };
    
    this._lastUpdateTime = performance.now();
    this._animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Stop decay animation loop
   * @private
   */
  _stopDecayAnimation() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Convert dB value to percentage (0-100)
   * @param {number} db - Value in dB
   * @returns {number} Percentage (0-100)
   * @private
   */
  _dbToPercent(db) {
    const range = this._maxDb - this._minDb;
    return ((db - this._minDb) / range) * 100;
  }

  /**
   * Get color for given dB level
   * @param {number} db - Value in dB
   * @returns {string} CSS color value
   * @private
   */
  _getColorForLevel(db) {
    const percent = this._dbToPercent(db);
    
    if (percent >= 90) return '#ff3b30'; // Red zone (> -6dB typical)
    if (percent >= 75) return '#ffcc00'; // Yellow zone (> -15dB typical)
    return '#34c759'; // Green zone
  }

  /**
   * Render component (must complete within 16ms budget)
   * @private
   */
  _render() {
    this._renderStartTime = performance.now();
    
    const valuePercent = this._dbToPercent(this._value);
    const peakPercent = this._dbToPercent(this._peak);
    const isVertical = this._orientation === 'vertical';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --meter-bg: #2c2c2e;
          --meter-track: #1c1c1e;
          --meter-green: #34c759;
          --meter-yellow: #ffcc00;
          --meter-red: #ff3b30;
          --meter-peak: #ffffff;
          --meter-border: #48484a;
        }
        
        :host([orientation="vertical"]) {
          width: 20px;
          height: 200px;
        }
        
        :host([orientation="horizontal"]) {
          width: 200px;
          height: 20px;
        }
        
        :host([disabled]) {
          opacity: 0.5;
          pointer-events: none;
        }
        
        .meter-container {
          width: 100%;
          height: 100%;
          background: var(--meter-bg);
          border: 1px solid var(--meter-border);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }
        
        .meter-track {
          position: absolute;
          background: var(--meter-track);
        }
        
        .meter-track.vertical {
          bottom: 0;
          left: 0;
          right: 0;
          height: 100%;
        }
        
        .meter-track.horizontal {
          left: 0;
          top: 0;
          bottom: 0;
          width: 100%;
        }
        
        .meter-fill {
          position: absolute;
          transition: none; /* No transition for real-time audio */
          will-change: height, width;
        }
        
        .meter-fill.vertical {
          bottom: 0;
          left: 0;
          right: 0;
          height: ${valuePercent}%;
          background: ${this._getColorForLevel(this._value)};
        }
        
        .meter-fill.horizontal {
          left: 0;
          top: 0;
          bottom: 0;
          width: ${valuePercent}%;
          background: ${this._getColorForLevel(this._value)};
        }
        
        .meter-peak {
          position: absolute;
          background: var(--meter-peak);
          transition: none;
          will-change: top, left;
        }
        
        .meter-peak.vertical {
          left: 0;
          right: 0;
          height: 2px;
          bottom: ${peakPercent}%;
        }
        
        .meter-peak.horizontal {
          top: 0;
          bottom: 0;
          width: 2px;
          left: ${peakPercent}%;
        }
        
        /* Color zones visualization (optional grid) */
        .meter-zones {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        
        .zone-marker {
          position: absolute;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .zone-marker.vertical {
          left: 0;
          right: 0;
          height: 1px;
        }
        
        .zone-marker.horizontal {
          top: 0;
          bottom: 0;
          width: 1px;
        }
      </style>
      
      <div class="meter-container">
        <div class="meter-track ${isVertical ? 'vertical' : 'horizontal'}"></div>
        <div class="meter-fill ${isVertical ? 'vertical' : 'horizontal'}"></div>
        <div class="meter-peak ${isVertical ? 'vertical' : 'horizontal'}"></div>
        
        <div class="meter-zones">
          ${this._renderZoneMarkers()}
        </div>
      </div>
    `;
    
    // Performance check (16ms budget)
    const renderTime = performance.now() - this._renderStartTime;
    if (renderTime > 16) {
      console.warn(`[HarmonyMeter] Render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Render zone markers for visual reference
   * @returns {string} HTML for zone markers
   * @private
   */
  _renderZoneMarkers() {
    const markers = [-3, -6, -12, -18, -24]; // Common dB reference points
    const isVertical = this._orientation === 'vertical';
    
    return markers
      .filter(db => db >= this._minDb && db <= this._maxDb)
      .map(db => {
        const percent = this._dbToPercent(db);
        const position = isVertical ? `bottom: ${percent}%` : `left: ${percent}%`;
        return `<div class="zone-marker ${isVertical ? 'vertical' : 'horizontal'}" style="${position}"></div>`;
      })
      .join('');
  }

  /**
   * Public API: Set meter value programmatically
   * @param {number} valueDb - Level in dB
   */
  setValue(valueDb) {
    this._updateValue(valueDb);
    this._render();
  }

  /**
   * Public API: Reset peak indicator
   */
  resetPeak() {
    this._peak = this._value;
    this._render();
  }

  /**
   * Public API: Get current value
   * @returns {number} Current level in dB
   */
  getValue() {
    return this._value;
  }

  /**
   * Public API: Get peak value
   * @returns {number} Peak level in dB
   */
  getPeak() {
    return this._peak;
  }
}

// Register custom element
customElements.define('harmony-meter', HarmonyMeter);

export { HarmonyMeter };