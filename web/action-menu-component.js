/**
 * @fileoverview Dynamic Action Menu Component
 * Renders a menu of actions discovered from the Intent Graph.
 * 
 * @see DESIGN_SYSTEM.md#action-menu-component
 */

/**
 * Action Menu Web Component
 * Dynamically discovers and displays available actions for a given context.
 * 
 * @element action-menu
 * 
 * @attr {string} context - Context identifier for action discovery
 * @attr {string} entity-id - Optional entity ID for context-aware actions
 * @attr {string} tags - Comma-separated list of tags to filter actions
 * @attr {string} trigger - Trigger mode: 'click' | 'hover' | 'manual'
 * 
 * @fires action-executed - When an action is executed
 * @fires action-menu-opened - When menu is opened
 * @fires action-menu-closed - When menu is closed
 * 
 * @example
 * <action-menu context="audio-track" entity-id="track-123">
 *   <button slot="trigger">Actions</button>
 * </action-menu>
 */
class ActionMenuComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._actions = [];
    this._isOpen = false;
    this._actionDiscovery = null;
    this._state = {};
  }

  static get observedAttributes() {
    return ['context', 'entity-id', 'tags', 'trigger'];
  }

  connectedCallback() {
    this._initializeServices();
    this.render();
    this._setupEventListeners();
    this._loadActions();
  }

  disconnectedCallback() {
    this._cleanupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'context' || name === 'tags') {
        this._loadActions();
      } else {
        this.render();
      }
    }
  }

  /**
   * Initialize ActionDiscovery service
   * @private
   */
  _initializeServices() {
    // Get global services
    const typeNavigator = window.harmonyTypeNavigator;
    const eventBus = window.harmonyEventBus;

    if (!typeNavigator || !eventBus) {
      console.error('[ActionMenu] Required services not available');
      return;
    }

    // Import and initialize ActionDiscovery
    import('../core/ActionDiscovery.js').then(module => {
      this._actionDiscovery = new module.ActionDiscovery(typeNavigator, eventBus);
      this._loadActions();
    }).catch(error => {
      console.error('[ActionMenu] Failed to load ActionDiscovery:', error);
    });
  }

  /**
   * Load actions from discovery service
   * @private
   */
  async _loadActions() {
    if (!this._actionDiscovery) {
      return;
    }

    const context = this.getAttribute('context');
    if (!context) {
      console.warn('[ActionMenu] No context specified');
      return;
    }

    const entityId = this.getAttribute('entity-id');
    const tagsAttr = this.getAttribute('tags');
    const tags = tagsAttr ? tagsAttr.split(',').map(t => t.trim()) : [];

    try {
      this._actions = await this._actionDiscovery.discoverActions({
        context,
        entityId,
        state: this._state,
        tags
      });

      this.render();
    } catch (error) {
      console.error('[ActionMenu] Failed to load actions:', error);
      this._actions = [];
      this.render();
    }
  }

  /**
   * Update state for conditional actions
   * 
   * @param {Object} state - New state object
   */
  updateState(state) {
    this._state = { ...this._state, ...state };
    this._loadActions();
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    const trigger = this.getAttribute('trigger') || 'click';
    const triggerElement = this.querySelector('[slot="trigger"]') || this;

    if (trigger === 'click') {
      this._handleTriggerClick = this._onTriggerClick.bind(this);
      triggerElement.addEventListener('click', this._handleTriggerClick);
    } else if (trigger === 'hover') {
      this._handleTriggerMouseEnter = this._onTriggerMouseEnter.bind(this);
      this._handleTriggerMouseLeave = this._onTriggerMouseLeave.bind(this);
      triggerElement.addEventListener('mouseenter', this._handleTriggerMouseEnter);
      triggerElement.addEventListener('mouseleave', this._handleTriggerMouseLeave);
    }

    // Close on outside click
    this._handleDocumentClick = this._onDocumentClick.bind(this);
    document.addEventListener('click', this._handleDocumentClick);

    // Close on Escape
    this._handleKeyDown = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Cleanup event listeners
   * @private
   */
  _cleanupEventListeners() {
    const triggerElement = this.querySelector('[slot="trigger"]') || this;
    
    if (this._handleTriggerClick) {
      triggerElement.removeEventListener('click', this._handleTriggerClick);
    }
    if (this._handleTriggerMouseEnter) {
      triggerElement.removeEventListener('mouseenter', this._handleTriggerMouseEnter);
    }
    if (this._handleTriggerMouseLeave) {
      triggerElement.removeEventListener('mouseleave', this._handleTriggerMouseLeave);
    }
    if (this._handleDocumentClick) {
      document.removeEventListener('click', this._handleDocumentClick);
    }
    if (this._handleKeyDown) {
      document.removeEventListener('keydown', this._handleKeyDown);
    }
  }

  /**
   * Handle trigger click
   * @private
   */
  _onTriggerClick(event) {
    event.stopPropagation();
    this.toggle();
  }

  /**
   * Handle trigger mouse enter
   * @private
   */
  _onTriggerMouseEnter() {
    this.open();
  }

  /**
   * Handle trigger mouse leave
   * @private
   */
  _onTriggerMouseLeave() {
    setTimeout(() => {
      const menu = this.shadowRoot.querySelector('.action-menu');
      if (menu && !menu.matches(':hover')) {
        this.close();
      }
    }, 100);
  }

  /**
   * Handle document click (close on outside click)
   * @private
   */
  _onDocumentClick(event) {
    if (!this.contains(event.target) && !this.shadowRoot.contains(event.target)) {
      this.close();
    }
  }

  /**
   * Handle keyboard events
   * @private
   */
  _onKeyDown(event) {
    if (event.key === 'Escape' && this._isOpen) {
      this.close();
    }
  }

  /**
   * Open menu
   */
  open() {
    this._isOpen = true;
    this.render();
    this.dispatchEvent(new CustomEvent('action-menu-opened', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Close menu
   */
  close() {
    this._isOpen = false;
    this.render();
    this.dispatchEvent(new CustomEvent('action-menu-closed', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Toggle menu
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Execute an action
   * @private
   */
  async _executeAction(action, event) {
    event.preventDefault();
    event.stopPropagation();

    if (action.disabled) {
      return;
    }

    try {
      await this._actionDiscovery.executeAction(action, {
        entityId: this.getAttribute('entity-id')
      });

      this.dispatchEvent(new CustomEvent('action-executed', {
        bubbles: true,
        composed: true,
        detail: { action }
      }));

      this.close();
    } catch (error) {
      console.error('[ActionMenu] Action execution failed:', error);
    }
  }

  /**
   * Render component
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
          display: inline-block;
        }

        .action-menu {
          position: absolute;
          top: 100%;
          left: 0;
          min-width: 200px;
          background: var(--harmony-surface, #ffffff);
          border: 1px solid var(--harmony-border, #e0e0e0);
          border-radius: var(--harmony-radius-md, 8px);
          box-shadow: var(--harmony-shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.15));
          padding: 4px;
          margin-top: 4px;
          z-index: 1000;
          opacity: 0;
          transform: translateY(-8px);
          pointer-events: none;
          transition: opacity 0.2s, transform 0.2s;
        }

        .action-menu.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: var(--harmony-radius-sm, 4px);
          cursor: pointer;
          transition: background-color 0.15s;
          color: var(--harmony-text, #333333);
          font-size: 14px;
          line-height: 1.5;
        }

        .action-item:hover:not(.disabled) {
          background: var(--harmony-surface-hover, #f5f5f5);
        }

        .action-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .action-label {
          flex: 1;
        }

        .action-shortcut {
          font-size: 12px;
          color: var(--harmony-text-secondary, #666666);
        }

        .action-divider {
          height: 1px;
          background: var(--harmony-border, #e0e0e0);
          margin: 4px 0;
        }

        .empty-state {
          padding: 16px;
          text-align: center;
          color: var(--harmony-text-secondary, #666666);
          font-size: 14px;
        }
      </style>

      <slot name="trigger"></slot>

      <div class="action-menu ${this._isOpen ? 'open' : ''}">
        ${this._renderActions()}
      </div>
    `;

    // Attach action handlers
    this.shadowRoot.querySelectorAll('.action-item').forEach((item, index) => {
      const action = this._actions[index];
      if (action && !action.disabled) {
        item.addEventListener('click', (e) => this._executeAction(action, e));
      }
    });
  }

  /**
   * Render action items
   * @private
   */
  _renderActions() {
    if (this._actions.length === 0) {
      return '<div class="empty-state">No actions available</div>';
    }

    return this._actions.map(action => {
      const disabledClass = action.disabled ? 'disabled' : '';
      const title = action.disabled ? action.disabledReason : '';
      
      return `
        <div class="action-item ${disabledClass}" title="${title}">
          ${action.icon ? `<span class="action-icon">${this._renderIcon(action.icon)}</span>` : ''}
          <span class="action-label">${action.label}</span>
          ${action.shortcut ? `<span class="action-shortcut">${action.shortcut}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Render icon (placeholder - integrate with icon system)
   * @private
   */
  _renderIcon(iconName) {
    // TODO: Integrate with harmony icon system
    return `<svg viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="6"/>
    </svg>`;
  }
}

customElements.define('action-menu', ActionMenuComponent);