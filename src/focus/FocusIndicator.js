/**
 * @fileoverview Visual focus indicator web component
 * @see DESIGN_SYSTEM.md#focus-management
 */

/**
 * FocusIndicator - Visual component showing current focus state
 * Useful for debugging and accessibility testing
 * 
 * @element focus-indicator
 * 
 * @attr {boolean} visible - Show/hide the indicator
 * @attr {string} position - Position: top-left, top-right, bottom-left, bottom-right
 * 
 * @example
 * <focus-indicator visible position="bottom-right"></focus-indicator>
 */
export class FocusIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._focusManager = null;
  }

  static get observedAttributes() {
    return ['visible', 'position'];
  }

  connectedCallback() {
    this._render();
    this._setupListeners();
  }

  disconnectedCallback() {
    this._cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._render();
    }
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    const visible = this.hasAttribute('visible');
    const position = this.getAttribute('position') || 'bottom-right';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
          ${this._getPositionStyles(position)}
        }

        :host([hidden]),
        :host(:not([visible])) {
          display: none;
        }

        .indicator {
          background: rgba(0, 0, 0, 0.9);
          color: #fff;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.5;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          min-width: 200px;
          max-width: 400px;
        }

        .indicator-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #4CAF50;
        }

        .indicator-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }

        .indicator-label {
          color: #999;
        }

        .indicator-value {
          color: #fff;
          font-weight: bold;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .keyboard-mode {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
        }

        .keyboard-mode.active {
          background: #4CAF50;
          color: #fff;
        }

        .keyboard-mode.inactive {
          background: #666;
          color: #ccc;
        }

        .stack-depth {
          color: #2196F3;
        }

        .trap-active {
          color: #FF9800;
          font-weight: bold;
        }
      </style>

      <div class="indicator">
        <div class="indicator-title">Focus State</div>
        <div class="indicator-row">
          <span class="indicator-label">Current:</span>
          <span class="indicator-value" id="current">—</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-label">Previous:</span>
          <span class="indicator-value" id="previous">—</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-label">Stack:</span>
          <span class="indicator-value stack-depth" id="stack">0</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-label">Trap:</span>
          <span class="indicator-value trap-active" id="trap">None</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-label">Mode:</span>
          <span class="keyboard-mode inactive" id="mode">Mouse</span>
        </div>
      </div>
    `;
  }

  /**
   * Get position styles based on attribute
   * @private
   * @param {string} position - Position value
   * @returns {string} CSS styles
   */
  _getPositionStyles(position) {
    const positions = {
      'top-left': 'top: 16px; left: 16px;',
      'top-right': 'top: 16px; right: 16px;',
      'bottom-left': 'bottom: 16px; left: 16px;',
      'bottom-right': 'bottom: 16px; right: 16px;'
    };
    return positions[position] || positions['bottom-right'];
  }

  /**
   * Setup event listeners for focus changes
   * @private
   */
  _setupListeners() {
    // Listen to global focus events via EventBus
    const eventBus = window.eventBus;
    if (!eventBus) {
      console.warn('[FocusIndicator] EventBus not available');
      return;
    }

    this._listeners = {
      changed: (e) => this._updateDisplay(e.detail),
      trapped: (e) => this._updateTrap(e.detail),
      released: () => this._updateTrap(null),
      pushed: (e) => this._updateStack(e.detail),
      popped: (e) => this._updateStack(e.detail)
    };

    eventBus.addEventListener('focus:changed', this._listeners.changed);
    eventBus.addEventListener('focus:trapped', this._listeners.trapped);
    eventBus.addEventListener('focus:released', this._listeners.released);
    eventBus.addEventListener('focus:pushed', this._listeners.pushed);
    eventBus.addEventListener('focus:popped', this._listeners.popped);
  }

  /**
   * Update display with current focus info
   * @private
   * @param {Object} detail - Focus change detail
   */
  _updateDisplay(detail) {
    const { current, previous, isKeyboard } = detail;

    const currentEl = this.shadowRoot.getElementById('current');
    const previousEl = this.shadowRoot.getElementById('previous');
    const modeEl = this.shadowRoot.getElementById('mode');

    currentEl.textContent = this._getElementLabel(current);
    previousEl.textContent = this._getElementLabel(previous);

    if (isKeyboard) {
      modeEl.textContent = 'Keyboard';
      modeEl.className = 'keyboard-mode active';
    } else {
      modeEl.textContent = 'Mouse';
      modeEl.className = 'keyboard-mode inactive';
    }
  }

  /**
   * Update trap display
   * @private
   * @param {Object|null} detail - Trap detail
   */
  _updateTrap(detail) {
    const trapEl = this.shadowRoot.getElementById('trap');
    
    if (detail && detail.container) {
      trapEl.textContent = `Active (${detail.focusableCount || 0} elements)`;
    } else {
      trapEl.textContent = 'None';
    }
  }

  /**
   * Update stack display
   * @private
   * @param {Object} detail - Stack detail
   */
  _updateStack(detail) {
    const stackEl = this.shadowRoot.getElementById('stack');
    stackEl.textContent = detail.stackDepth || 0;
  }

  /**
   * Get readable label for element
   * @private
   * @param {HTMLElement|null} element - Element to label
   * @returns {string} Label
   */
  _getElementLabel(element) {
    if (!element) return '—';
    
    if (element.id) return `#${element.id}`;
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
    if (element.tagName) return element.tagName.toLowerCase();
    
    return 'unknown';
  }

  /**
   * Cleanup listeners
   * @private
   */
  _cleanup() {
    const eventBus = window.eventBus;
    if (!eventBus || !this._listeners) return;

    eventBus.removeEventListener('focus:changed', this._listeners.changed);
    eventBus.removeEventListener('focus:trapped', this._listeners.trapped);
    eventBus.removeEventListener('focus:released', this._listeners.released);
    eventBus.removeEventListener('focus:pushed', this._listeners.pushed);
    eventBus.removeEventListener('focus:popped', this._listeners.popped);
  }
}

customElements.define('focus-indicator', FocusIndicator);