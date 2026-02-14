/**
 * Color Contrast Validator Component
 * 
 * Interactive web component for testing and validating color contrast ratios.
 * Useful for design system development and accessibility auditing.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#color-contrast-validator
 * 
 * @module components/color-contrast-validator
 */

import { getContrastRatio, validateColorPair } from '../utils/color-contrast.js';

/**
 * Custom element for color contrast validation
 * @extends HTMLElement
 */
class ColorContrastValidator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._foreground = '#000000';
    this._background = '#FFFFFF';
    this._isLargeText = false;
  }
  
  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.updateValidation();
  }
  
  /**
   * Renders component template
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
        }
        
        .validator {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 24px;
          background: #fafafa;
        }
        
        .title {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
          color: #212121;
        }
        
        .controls {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .control-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        label {
          min-width: 120px;
          font-size: 14px;
          color: #424242;
          font-weight: 500;
        }
        
        input[type="color"] {
          width: 60px;
          height: 40px;
          border: 1px solid #bdbdbd;
          border-radius: 4px;
          cursor: pointer;
        }
        
        input[type="text"] {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #bdbdbd;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }
        
        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .preview {
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .preview-content {
          padding: 32px;
          text-align: center;
          transition: background-color 0.2s, color 0.2s;
        }
        
        .preview-text {
          font-size: 16px;
          margin: 0 0 8px 0;
        }
        
        .preview-large {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        
        .results {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 20px;
        }
        
        .result-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f5f5f5;
        }
        
        .result-row:last-child {
          border-bottom: none;
        }
        
        .result-label {
          font-size: 14px;
          color: #616161;
        }
        
        .result-value {
          font-weight: 600;
          font-size: 16px;
        }
        
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .badge-pass {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .badge-fail {
          background: #ffebee;
          color: #c62828;
        }
        
        .level-aaa {
          color: #2e7d32;
        }
        
        .level-aa {
          color: #f57c00;
        }
        
        .level-fail {
          color: #c62828;
        }
      </style>
      
      <div class="validator">
        <h2 class="title">Color Contrast Validator</h2>
        
        <div class="controls">
          <div class="control-group">
            <label for="foreground">Foreground:</label>
            <input type="color" id="foreground-picker" value="${this._foreground}">
            <input type="text" id="foreground" value="${this._foreground}">
          </div>
          
          <div class="control-group">
            <label for="background">Background:</label>
            <input type="color" id="background-picker" value="${this._background}">
            <input type="text" id="background" value="${this._background}">
          </div>
          
          <div class="control-group checkbox-group">
            <input type="checkbox" id="large-text" ${this._isLargeText ? 'checked' : ''}>
            <label for="large-text">Large text (18pt+ or 14pt+ bold)</label>
          </div>
        </div>
        
        <div class="preview">
          <div class="preview-content" id="preview">
            <p class="preview-text">Normal text sample</p>
            <p class="preview-large">Large text sample</p>
          </div>
        </div>
        
        <div class="results" id="results">
          <!-- Results populated by JavaScript -->
        </div>
      </div>
    `;
  }
  
  /**
   * Attaches event listeners to interactive elements
   */
  attachEventListeners() {
    const foregroundPicker = this.shadowRoot.getElementById('foreground-picker');
    const foregroundText = this.shadowRoot.getElementById('foreground');
    const backgroundPicker = this.shadowRoot.getElementById('background-picker');
    const backgroundText = this.shadowRoot.getElementById('background');
    const largeTextCheckbox = this.shadowRoot.getElementById('large-text');
    
    foregroundPicker.addEventListener('input', (e) => {
      this._foreground = e.target.value;
      foregroundText.value = e.target.value;
      this.updateValidation();
    });
    
    foregroundText.addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        this._foreground = e.target.value;
        foregroundPicker.value = e.target.value;
        this.updateValidation();
      }
    });
    
    backgroundPicker.addEventListener('input', (e) => {
      this._background = e.target.value;
      backgroundText.value = e.target.value;
      this.updateValidation();
    });
    
    backgroundText.addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        this._background = e.target.value;
        backgroundPicker.value = e.target.value;
        this.updateValidation();
      }
    });
    
    largeTextCheckbox.addEventListener('change', (e) => {
      this._isLargeText = e.target.checked;
      this.updateValidation();
    });
  }
  
  /**
   * Updates validation results and preview
   */
  updateValidation() {
    const preview = this.shadowRoot.getElementById('preview');
    const results = this.shadowRoot.getElementById('results');
    
    // Update preview colors
    preview.style.backgroundColor = this._background;
    preview.style.color = this._foreground;
    
    // Calculate validation
    const validation = validateColorPair(this._foreground, this._background, this._isLargeText);
    
    // Render results
    results.innerHTML = `
      <div class="result-row">
        <span class="result-label">Contrast Ratio:</span>
        <span class="result-value">${validation.ratio}:1</span>
      </div>
      <div class="result-row">
        <span class="result-label">WCAG AA:</span>
        <span class="badge ${validation.passAA ? 'badge-pass' : 'badge-fail'}">
          ${validation.passAA ? 'Pass' : 'Fail'}
        </span>
      </div>
      <div class="result-row">
        <span class="result-label">WCAG AAA:</span>
        <span class="badge ${validation.passAAA ? 'badge-pass' : 'badge-fail'}">
          ${validation.passAAA ? 'Pass' : 'Fail'}
        </span>
      </div>
      <div class="result-row">
        <span class="result-label">Compliance Level:</span>
        <span class="result-value level-${validation.level.toLowerCase()}">${validation.level}</span>
      </div>
    `;
  }
}

customElements.define('color-contrast-validator', ColorContrastValidator);

export { ColorContrastValidator };