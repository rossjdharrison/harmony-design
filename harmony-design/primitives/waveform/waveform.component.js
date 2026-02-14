/**
 * @fileoverview Waveform primitive component with audio visualization
 * @module harmony-design/primitives/waveform
 * 
 * Displays audio waveform visualization with configurable styles and modes.
 * Supports both time-domain (oscilloscope) and frequency-domain (spectrum) visualization.
 * 
 * Related documentation: See harmony-design/DESIGN_SYSTEM.md § Primitives > Waveform
 */

/**
 * Waveform visualization component
 * 
 * @fires waveform-ready - Emitted when component is initialized and ready
 * @fires waveform-overflow - Emitted when audio level exceeds display bounds
 * 
 * @example
 * <harmony-waveform 
 *   mode="oscilloscope"
 *   color="#00ff00"
 *   width="400"
 *   height="100">
 * </harmony-waveform>
 */
class HarmonyWaveform extends HTMLElement {
  static get observedAttributes() {
    return ['mode', 'color', 'background', 'width', 'height', 'line-width', 'fill'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Component state
    this._audioData = new Float32Array(128);
    this._mode = 'oscilloscope'; // 'oscilloscope' or 'spectrum'
    this._color = '#00ff00';
    this._background = '#000000';
    this._lineWidth = 2;
    this._fill = false;
    this._animationId = null;
    this._isRendering = false;
    
    // Performance tracking
    this._lastFrameTime = 0;
    this._frameCount = 0;
    this._performanceWarningThreshold = 16; // ms for 60fps
  }

  connectedCallback() {
    this._render();
    this._setupCanvas();
    this._publishReadyEvent();
  }

  disconnectedCallback() {
    this._stopRendering();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'mode':
        this._mode = newValue === 'spectrum' ? 'spectrum' : 'oscilloscope';
        break;
      case 'color':
        this._color = newValue || '#00ff00';
        break;
      case 'background':
        this._background = newValue || '#000000';
        break;
      case 'width':
        this._updateCanvasSize();
        break;
      case 'height':
        this._updateCanvasSize();
        break;
      case 'line-width':
        this._lineWidth = parseInt(newValue, 10) || 2;
        break;
      case 'fill':
        this._fill = newValue !== null && newValue !== 'false';
        break;
    }
    
    if (this._canvas) {
      this._drawWaveform();
    }
  }

  /**
   * Update waveform with new audio data
   * @param {Float32Array} audioData - Audio sample data (normalized -1 to 1)
   */
  updateData(audioData) {
    if (!(audioData instanceof Float32Array)) {
      console.error('[HarmonyWaveform] Invalid audio data type. Expected Float32Array.');
      return;
    }
    
    this._audioData = audioData;
    
    if (!this._isRendering) {
      this._startRendering();
    }
  }

  /**
   * Clear the waveform display
   */
  clear() {
    this._audioData = new Float32Array(this._audioData.length);
    this._drawWaveform();
  }

  /**
   * Start continuous rendering (for live audio)
   */
  startLiveMode() {
    if (!this._isRendering) {
      this._startRendering();
    }
  }

  /**
   * Stop continuous rendering
   */
  stopLiveMode() {
    this._stopRendering();
  }

  _render() {
    const width = this.getAttribute('width') || '400';
    const height = this.getAttribute('height') || '100';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
        }
        
        .waveform-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          image-rendering: crisp-edges;
        }
        
        .overflow-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff0000;
          opacity: 0;
          transition: opacity 0.1s;
        }
        
        .overflow-indicator.active {
          opacity: 1;
        }
      </style>
      
      <div class="waveform-container">
        <canvas width="${width}" height="${height}"></canvas>
        <div class="overflow-indicator"></div>
      </div>
    `;
  }

  _setupCanvas() {
    this._canvas = this.shadowRoot.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d', { alpha: false });
    this._overflowIndicator = this.shadowRoot.querySelector('.overflow-indicator');
    
    this._updateCanvasSize();
    this._drawWaveform();
  }

  _updateCanvasSize() {
    if (!this._canvas) return;
    
    const width = parseInt(this.getAttribute('width'), 10) || 400;
    const height = parseInt(this.getAttribute('height'), 10) || 100;
    
    this._canvas.width = width;
    this._canvas.height = height;
  }

  _startRendering() {
    this._isRendering = true;
    this._renderLoop();
  }

  _stopRendering() {
    this._isRendering = false;
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  _renderLoop() {
    if (!this._isRendering) return;
    
    const startTime = performance.now();
    
    this._drawWaveform();
    
    const renderTime = performance.now() - startTime;
    if (renderTime > this._performanceWarningThreshold) {
      console.warn(`[HarmonyWaveform] Frame render exceeded budget: ${renderTime.toFixed(2)}ms`);
    }
    
    this._animationId = requestAnimationFrame(() => this._renderLoop());
  }

  _drawWaveform() {
    if (!this._ctx) return;
    
    const width = this._canvas.width;
    const height = this._canvas.height;
    const ctx = this._ctx;
    
    // Clear canvas
    ctx.fillStyle = this._background;
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform based on mode
    if (this._mode === 'oscilloscope') {
      this._drawOscilloscope(ctx, width, height);
    } else {
      this._drawSpectrum(ctx, width, height);
    }
    
    // Check for overflow
    this._checkOverflow();
  }

  _drawOscilloscope(ctx, width, height) {
    const data = this._audioData;
    const bufferLength = data.length;
    const sliceWidth = width / bufferLength;
    
    ctx.lineWidth = this._lineWidth;
    ctx.strokeStyle = this._color;
    ctx.beginPath();
    
    let x = 0;
    const centerY = height / 2;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = data[i];
      const y = centerY + (v * centerY);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    // Fill under waveform if enabled
    if (this._fill) {
      ctx.lineTo(width, centerY);
      ctx.lineTo(0, centerY);
      ctx.closePath();
      ctx.fillStyle = this._color + '40'; // Add transparency
      ctx.fill();
    }
    
    ctx.stroke();
  }

  _drawSpectrum(ctx, width, height) {
    const data = this._audioData;
    const bufferLength = data.length;
    const barWidth = width / bufferLength;
    
    ctx.fillStyle = this._color;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = Math.abs(data[i]) * height;
      const x = i * barWidth;
      const y = height - barHeight;
      
      if (this._fill) {
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      } else {
        ctx.strokeStyle = this._color;
        ctx.lineWidth = this._lineWidth;
        ctx.strokeRect(x, y, barWidth - 1, barHeight);
      }
    }
  }

  _checkOverflow() {
    let hasOverflow = false;
    
    for (let i = 0; i < this._audioData.length; i++) {
      if (Math.abs(this._audioData[i]) > 1.0) {
        hasOverflow = true;
        break;
      }
    }
    
    if (hasOverflow) {
      this._overflowIndicator.classList.add('active');
      this._publishOverflowEvent();
      
      // Auto-hide after 200ms
      setTimeout(() => {
        this._overflowIndicator.classList.remove('active');
      }, 200);
    }
  }

  _publishReadyEvent() {
    const event = new CustomEvent('waveform-ready', {
      bubbles: true,
      composed: true,
      detail: {
        component: this,
        timestamp: Date.now()
      }
    });
    this.dispatchEvent(event);
  }

  _publishOverflowEvent() {
    const event = new CustomEvent('waveform-overflow', {
      bubbles: true,
      composed: true,
      detail: {
        timestamp: Date.now()
      }
    });
    this.dispatchEvent(event);
  }
}

customElements.define('harmony-waveform', HarmonyWaveform);

export { HarmonyWaveform };