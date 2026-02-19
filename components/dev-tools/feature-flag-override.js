/**
 * Feature Flag Override Dev Toolbar
 * 
 * Developer tool for toggling feature flags locally during development.
 * Provides UI for viewing and overriding feature flags at runtime.
 * 
 * Features:
 * - View all registered feature flags
 * - Toggle flags on/off locally
 * - Persist overrides to localStorage
 * - Reset to default values
 * - Show flag metadata (description, environment)
 * 
 * Usage:
 * ```html
 * <feature-flag-override></feature-flag-override>
 * ```
 * 
 * Keyboard shortcut: Ctrl+Shift+F to toggle visibility
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#feature-flag-override
 * @module components/dev-tools/feature-flag-override
 */

const STORAGE_KEY = 'harmony_feature_flag_overrides';

class FeatureFlagOverride extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isVisible = false;
    this._flags = new Map();
    this._overrides = this._loadOverrides();
    this._filterText = '';
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
    this._setupKeyboardShortcut();
    this._discoverFlags();
    
    // Listen for flag registration events
    window.addEventListener('featureflag:registered', this._handleFlagRegistered.bind(this));
  }

  disconnectedCallback() {
    this._removeKeyboardShortcut();
    window.removeEventListener('featureflag:registered', this._handleFlagRegistered.bind(this));
  }

  /**
   * Load flag overrides from localStorage
   * @private
   * @returns {Map<string, boolean>}
   */
  _loadOverrides() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('[FeatureFlagOverride] Failed to load overrides:', error);
    }
    return new Map();
  }

  /**
   * Save flag overrides to localStorage
   * @private
   */
  _saveOverrides() {
    try {
      const obj = Object.fromEntries(this._overrides);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      
      // Dispatch event so other components can react
      window.dispatchEvent(new CustomEvent('featureflag:overrides-changed', {
        detail: { overrides: obj }
      }));
    } catch (error) {
      console.error('[FeatureFlagOverride] Failed to save overrides:', error);
    }
  }

  /**
   * Discover flags from FeatureFlagContext
   * @private
   */
  _discoverFlags() {
    // Check if FeatureFlagContext is available
    if (window.FeatureFlagContext && window.FeatureFlagContext.getAllFlags) {
      const flags = window.FeatureFlagContext.getAllFlags();
      flags.forEach(flag => {
        this._flags.set(flag.name, flag);
      });
      this._render();
    }
  }

  /**
   * Handle flag registration event
   * @private
   * @param {CustomEvent} event
   */
  _handleFlagRegistered(event) {
    const { name, enabled, description, environment } = event.detail;
    this._flags.set(name, { name, enabled, description, environment });
    this._render();
  }

  /**
   * Setup keyboard shortcut (Ctrl+Shift+F)
   * @private
   */
  _setupKeyboardShortcut() {
    this._keyHandler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Remove keyboard shortcut listener
   * @private
   */
  _removeKeyboardShortcut() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  /**
   * Toggle toolbar visibility
   * @public
   */
  toggle() {
    this._isVisible = !this._isVisible;
    this._render();
  }

  /**
   * Show toolbar
   * @public
   */
  show() {
    this._isVisible = true;
    this._render();
  }

  /**
   * Hide toolbar
   * @public
   */
  hide() {
    this._isVisible = false;
    this._render();
  }

  /**
   * Toggle a specific flag
   * @private
   * @param {string} flagName
   */
  _toggleFlag(flagName) {
    const flag = this._flags.get(flagName);
    if (!flag) return;

    const currentValue = this._overrides.has(flagName) 
      ? this._overrides.get(flagName) 
      : flag.enabled;
    
    this._overrides.set(flagName, !currentValue);
    this._saveOverrides();
    this._render();
  }

  /**
   * Reset a specific flag to default
   * @private
   * @param {string} flagName
   */
  _resetFlag(flagName) {
    this._overrides.delete(flagName);
    this._saveOverrides();
    this._render();
  }

  /**
   * Reset all flags to defaults
   * @private
   */
  _resetAll() {
    if (confirm('Reset all feature flag overrides to defaults?')) {
      this._overrides.clear();
      this._saveOverrides();
      this._render();
    }
  }

  /**
   * Get current value of a flag (with override)
   * @private
   * @param {string} flagName
   * @returns {boolean}
   */
  _getFlagValue(flagName) {
    if (this._overrides.has(flagName)) {
      return this._overrides.get(flagName);
    }
    const flag = this._flags.get(flagName);
    return flag ? flag.enabled : false;
  }

  /**
   * Check if flag is overridden
   * @private
   * @param {string} flagName
   * @returns {boolean}
   */
  _isOverridden(flagName) {
    return this._overrides.has(flagName);
  }

  /**
   * Filter flags by search text
   * @private
   * @returns {Array}
   */
  _getFilteredFlags() {
    const flags = Array.from(this._flags.values());
    if (!this._filterText) return flags;
    
    const search = this._filterText.toLowerCase();
    return flags.filter(flag => 
      flag.name.toLowerCase().includes(search) ||
      (flag.description && flag.description.toLowerCase().includes(search))
    );
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.classList.contains('close-btn')) {
        this.hide();
      } else if (target.classList.contains('reset-all-btn')) {
        this._resetAll();
      } else if (target.classList.contains('toggle-btn')) {
        const flagName = target.dataset.flag;
        this._toggleFlag(flagName);
      } else if (target.classList.contains('reset-btn')) {
        const flagName = target.dataset.flag;
        this._resetFlag(flagName);
      }
    });

    this.shadowRoot.addEventListener('input', (e) => {
      if (e.target.classList.contains('search-input')) {
        this._filterText = e.target.value;
        this._render();
      }
    });
  }

  /**
   * Render component
   * @private
   */
  _render() {
    const filteredFlags = this._getFilteredFlags();
    const overrideCount = this._overrides.size;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          right: 0;
          width: 400px;
          height: 100vh;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          transform: translateX(${this._isVisible ? '0' : '100%'});
          transition: transform 0.3s ease;
          pointer-events: ${this._isVisible ? 'auto' : 'none'};
        }

        .container {
          width: 100%;
          height: 100%;
          background: #1e1e1e;
          color: #d4d4d4;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }

        .header {
          padding: 16px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title {
          font-weight: 600;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge {
          background: #007acc;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .close-btn {
          background: none;
          border: none;
          color: #d4d4d4;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 18px;
          line-height: 1;
        }

        .close-btn:hover {
          background: #3e3e42;
          border-radius: 4px;
        }

        .search-bar {
          padding: 12px 16px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px;
          background: #3c3c3c;
          border: 1px solid #3e3e42;
          border-radius: 4px;
          color: #d4d4d4;
          font-size: 13px;
          outline: none;
        }

        .search-input:focus {
          border-color: #007acc;
        }

        .actions {
          padding: 12px 16px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .reset-all-btn {
          background: #5a5a5a;
          border: none;
          color: #d4d4d4;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          width: 100%;
        }

        .reset-all-btn:hover {
          background: #6e6e6e;
        }

        .reset-all-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .flags-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .flag-item {
          background: #252526;
          border: 1px solid #3e3e42;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .flag-item.overridden {
          border-color: #007acc;
          background: #1a2332;
        }

        .flag-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .flag-name {
          font-weight: 500;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
        }

        .flag-controls {
          display: flex;
          gap: 8px;
        }

        .toggle-btn {
          padding: 4px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .toggle-btn.enabled {
          background: #28a745;
          color: white;
        }

        .toggle-btn.disabled {
          background: #6c757d;
          color: white;
        }

        .reset-btn {
          padding: 4px 8px;
          background: #5a5a5a;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          color: #d4d4d4;
        }

        .reset-btn:hover {
          background: #6e6e6e;
        }

        .reset-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .flag-description {
          font-size: 12px;
          color: #858585;
          margin-bottom: 4px;
        }

        .flag-meta {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #858585;
        }

        .meta-tag {
          background: #3e3e42;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .empty-state {
          padding: 32px 16px;
          text-align: center;
          color: #858585;
        }

        .shortcut-hint {
          padding: 8px 16px;
          background: #252526;
          border-top: 1px solid #3e3e42;
          font-size: 11px;
          color: #858585;
          text-align: center;
        }

        .shortcut-hint code {
          background: #3e3e42;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', monospace;
        }
      </style>

      <div class="container">
        <div class="header">
          <div class="title">
            🚩 Feature Flags
            ${overrideCount > 0 ? `<span class="badge">${overrideCount}</span>` : ''}
          </div>
          <button class="close-btn" title="Close (Ctrl+Shift+F)">×</button>
        </div>

        <div class="search-bar">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Search flags..."
            value="${this._filterText}"
          />
        </div>

        <div class="actions">
          <button 
            class="reset-all-btn" 
            ${overrideCount === 0 ? 'disabled' : ''}
          >
            Reset All Overrides
          </button>
        </div>

        <div class="flags-list">
          ${filteredFlags.length === 0 ? `
            <div class="empty-state">
              ${this._filterText ? 'No flags match your search' : 'No feature flags registered'}
            </div>
          ` : filteredFlags.map(flag => {
            const isEnabled = this._getFlagValue(flag.name);
            const isOverridden = this._isOverridden(flag.name);
            
            return `
              <div class="flag-item ${isOverridden ? 'overridden' : ''}">
                <div class="flag-header">
                  <div class="flag-name">${flag.name}</div>
                  <div class="flag-controls">
                    <button 
                      class="toggle-btn ${isEnabled ? 'enabled' : 'disabled'}"
                      data-flag="${flag.name}"
                    >
                      ${isEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button 
                      class="reset-btn"
                      data-flag="${flag.name}"
                      ${!isOverridden ? 'disabled' : ''}
                      title="Reset to default"
                    >
                      ↺
                    </button>
                  </div>
                </div>
                ${flag.description ? `
                  <div class="flag-description">${flag.description}</div>
                ` : ''}
                <div class="flag-meta">
                  ${flag.environment ? `<span class="meta-tag">env: ${flag.environment}</span>` : ''}
                  ${isOverridden ? `<span class="meta-tag">overridden</span>` : ''}
                  <span class="meta-tag">default: ${flag.enabled ? 'on' : 'off'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="shortcut-hint">
          Press <code>Ctrl+Shift+F</code> to toggle this panel
        </div>
      </div>
    `;
  }
}

customElements.define('feature-flag-override', FeatureFlagOverride);