/**
 * @fileoverview PeakHold Atom - Peak hold marker with configurable decay
 * @module primitives/atoms/peak-hold
 * 
 * Displays a peak level indicator that holds the maximum value and gradually
 * decays over time. Commonly used in audio meters and level displays.
 * 
 * Performance targets:
 * - Render: <1ms per frame (part of 16ms budget)
 * - Memory: <100KB per instance
 * - Animation: 60fps smooth decay
 * 
 * @see {@link ../../../DESIGN_SYSTEM.md#peak-hold-atom}
 */

/**
 * PeakHold Web Component
 * 
 * A visual indicator that tracks and displays peak values with configurable
 * decay behavior. Uses CSS transforms for GPU-accelerated animations.
 * 
 * @element harmony-peak-hold
 * 
 * @attr {string} orientation - 'horizontal' | 'vertical' (default: 'horizontal')
 * @attr {number} value - Current value (0-100, default: 0)
 * @attr {number} decay-rate - Decay speed in units per second (default: 20)
 * @attr {number} hold-time - Time to hold peak before decay in ms (default: 1000)
 * @attr {string} color - Peak marker color (default: '#ff4444')
 * @attr {number} thickness - Marker thickness in pixels (default: 2)
 * @attr {boolean} disabled - Whether decay is disabled (default: false)
 * 
 * @fires peak-updated - Dispatched when peak value changes {detail: {peak: number}}
 * @fires peak-reset - Dispatched when peak is reset {detail: {}}
 * 
 * @example
 * <harmony-peak-hold 
 *   orientation="vertical" 
 *   value="75" 
 *   decay-rate="30"
 *   hold-time="2000"
 *   color="#00ff00">
 * </harmony-peak-hold>
 */
class HarmonyPeakHold extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._peakValue = 0;
    this._currentValue = 0;
    this._lastUpdateTime = 0;
    this._holdUntilTime = 0;
    this._animationFrame = null;
    
    // Bound methods
    this._animate = this._animate.bind(this);
  }

  static get observedAttributes() {
    return ['orientation', 'value', 'decay-rate', 'hold-time', 'color', 'thickness', 'disabled'];
  }

  connectedCallback() {
    this._render();
    this._startAnimation();
  }

  disconnectedCallback() {
    this._stopAnimation();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'value':
        this._updateValue(parseFloat(newValue) || 0);
        break;
      case 'orientation':
      case 'color':
      case 'thickness':
        this._render();
        break;
      case 'decay-rate':
      case 'hold-time':
      case 'disabled':
        // These affect animation behavior, no re-render needed
        break;
    }
  }

  /**
   * Gets the current orientation
   * @returns {string} 'horizontal' or 'vertical'
   */
  get orientation() {
    return this.getAttribute('orientation') || 'horizontal';
  }

  set orientation(value) {
    this.setAttribute('orientation', value);
  }

  /**
   * Gets the current value
   * @returns {number} Value between 0-100
   */
  get value() {
    return this._currentValue;
  }

  set value(val) {
    const numVal = Math.max(0, Math.min(100, parseFloat(val) || 0));
    this.setAttribute('value', numVal.toString());
  }

  /**
   * Gets the decay rate in units per second
   * @returns {number}
   */
  get decayRate() {
    return parseFloat(this.getAttribute('decay-rate')) || 20;
  }

  set decayRate(value) {
    this.setAttribute('decay-rate', value.toString());
  }

  /**
   * Gets the hold time in milliseconds
   * @returns {number}
   */
  get holdTime() {
    return parseFloat(this.getAttribute('hold-time')) || 1000;
  }

  set holdTime(value) {
    this.setAttribute('hold-time', value.toString());
  }

  /**
   * Gets the marker color
   * @returns {string}
   */
  get color() {
    return this.getAttribute('color') || '#ff4444';
  }

  set color(value) {
    this.setAttribute('color', value);
  }

  /**
   * Gets the marker thickness in pixels
   * @returns {number}
   */
  get thickness() {
    return parseFloat(this.getAttribute('thickness')) || 2;
  }

  set thickness(value) {
    this.setAttribute('thickness', value.toString());
  }

  /**
   * Gets whether decay is disabled
   * @returns {boolean}
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Gets the current peak value
   * @returns {number}
   */
  get peak() {
    return this._peakValue;
  }

  /**
   * Resets the peak to current value or 0
   * @public
   */
  reset() {
    this._peakValue = this._currentValue;
    this._holdUntilTime = 0;
    this._updateMarkerPosition();
    
    this.dispatchEvent(new CustomEvent('peak-reset', {
      bubbles: true,
      composed: true,
      detail: {}
    }));
  }

  /**
   * Updates the current value and peak if necessary
   * @private
   * @param {number} value - New value (0-100)
   */
  _updateValue(value) {
    const clampedValue = Math.max(0, Math.min(100, value));
    this._currentValue = clampedValue;
    
    // Update peak if new value is higher
    if (clampedValue > this._peakValue) {
      const oldPeak = this._peakValue;
      this._peakValue = clampedValue;
      this._holdUntilTime = performance.now() + this.holdTime;
      this._updateMarkerPosition();
      
      if (oldPeak !== this._peakValue) {
        this.dispatchEvent(new CustomEvent('peak-updated', {
          bubbles: true,
          composed: true,
          detail: { peak: this._peakValue }
        }));
      }
    }
  }

  /**
   * Starts the animation loop
   * @private
   */
  _startAnimation() {
    if (this._animationFrame) return;
    this._lastUpdateTime = performance.now();
    this._animate();
  }

  /**
   * Stops the animation loop
   * @private
   */
  _stopAnimation() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Animation loop for peak decay
   * @private
   */
  _animate() {
    const now = performance.now();
    const deltaTime = (now - this._lastUpdateTime) / 1000; // Convert to seconds
    this._lastUpdateTime = now;
    
    // Check if we should decay
    if (!this.disabled && now > this._holdUntilTime && this._peakValue > this._currentValue) {
      const decay = this.decayRate * deltaTime;
      const oldPeak = this._peakValue;
      this._peakValue = Math.max(this._currentValue, this._peakValue - decay);
      
      this._updateMarkerPosition();
      
      if (oldPeak !== this._peakValue) {
        this.dispatchEvent(new CustomEvent('peak-updated', {
          bubbles: true,
          composed: true,
          detail: { peak: this._peakValue }
        }));
      }
    }
    
    this._animationFrame = requestAnimationFrame(this._animate);
  }

  /**
   * Updates the marker position based on current peak value
   * @private
   */
  _updateMarkerPosition() {
    const marker = this.shadowRoot.querySelector('.peak-marker');
    if (!marker) return;
    
    const percentage = this._peakValue;
    const isVertical = this.orientation === 'vertical';
    
    if (isVertical) {
      // Vertical: bottom to top (0% at bottom, 100% at top)
      marker.style.transform = `translateY(${100 - percentage}%)`;
    } else {
      // Horizontal: left to right (0% at left, 100% at right)
      marker.style.transform = `translateX(${percentage}%)`;
    }
  }

  /**
   * Renders the component
   * @private
   */
  _render() {
    const isVertical = this.orientation === 'vertical';
    const thickness = this.thickness;
    const color = this.color;
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
          width: ${isVertical ? '100%' : '200px'};
          height: ${isVertical ? '200px' : '100%'};
          min-width: ${isVertical ? '20px' : '50px'};
          min-height: ${isVertical ? '50px' : '20px'};
          contain: layout style paint;
        }

        .container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .peak-marker {
          position: absolute;
          background-color: ${color};
          pointer-events: none;
          will-change: transform;
          transition: none;
          ${isVertical ? `
            width: 100%;
            height: ${thickness}px;
            left: 0;
            bottom: 0;
            transform: translateY(100%);
          ` : `
            width: ${thickness}px;
            height: 100%;
            top: 0;
            left: 0;
            transform: translateX(0%);
          `}
        }

        :host([disabled]) .peak-marker {
          opacity: 0.5;
        }
      </style>
      <div class="container">
        <div class="peak-marker"></div>
      </div>
    `;
    
    this._updateMarkerPosition();
  }
}

customElements.define('harmony-peak-hold', HarmonyPeakHold);

export { HarmonyPeakHold };