/**
 * @fileoverview Presence Indicator Web Component
 * Displays user presence indicators on nodes
 * 
 * @module components/presence-indicator
 * @see DESIGN_SYSTEM.md#presence-awareness
 */

/**
 * Presence Indicator Component
 * Shows avatars/indicators for users viewing or editing a node
 * 
 * @example
 * <presence-indicator node-id="node-123"></presence-indicator>
 */
export class PresenceIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /** @private @type {string|null} */
    this._nodeId = null;

    /** @private @type {Array} */
    this._users = [];

    /** @private @type {Function|null} */
    this._presenceChangedHandler = null;
  }

  /**
   * Observed attributes
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['node-id'];
  }

  /**
   * Attribute changed callback
   * @param {string} name
   * @param {string} oldValue
   * @param {string} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'node-id' && oldValue !== newValue) {
      this._nodeId = newValue;
      this._queryPresence();
    }
  }

  /**
   * Connected callback
   */
  connectedCallback() {
    this._nodeId = this.getAttribute('node-id');
    this._render();
    this._setupEventListeners();
    this._queryPresence();
  }

  /**
   * Disconnected callback
   */
  disconnectedCallback() {
    this._teardownEventListeners();
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    this._presenceChangedHandler = (event) => {
      if (event.detail.nodeId === this._nodeId) {
        this._users = event.detail.users || [];
        this._updateUsers();
      }
    };

    window.addEventListener('Presence.PresenceChanged', this._presenceChangedHandler);
  }

  /**
   * Tear down event listeners
   * @private
   */
  _teardownEventListeners() {
    if (this._presenceChangedHandler) {
      window.removeEventListener('Presence.PresenceChanged', this._presenceChangedHandler);
      this._presenceChangedHandler = null;
    }
  }

  /**
   * Query current presence for node
   * @private
   */
  _queryPresence() {
    if (!this._nodeId) return;

    const event = new CustomEvent('Presence.QueryNodePresence', {
      detail: {
        nodeId: this._nodeId,
        requestId: `presence-indicator-${Date.now()}`,
      },
      bubbles: true,
      composed: true,
    });

    window.dispatchEvent(event);

    // Listen for result
    const resultHandler = (e) => {
      if (e.detail.nodeId === this._nodeId) {
        this._users = e.detail.users || [];
        this._updateUsers();
        window.removeEventListener('Presence.NodePresenceResult', resultHandler);
      }
    };

    window.addEventListener('Presence.NodePresenceResult', resultHandler);
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
        }

        .presence-list {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid var(--color-background, #fff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: transform 0.2s ease;
          position: relative;
        }

        .user-avatar:hover {
          transform: scale(1.2);
          z-index: 10;
        }

        .user-avatar.editing {
          border-color: var(--color-primary, #0066ff);
          border-width: 3px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 currentColor;
          }
          50% {
            box-shadow: 0 0 0 4px transparent;
          }
        }

        .tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 100;
        }

        .user-avatar:hover .tooltip {
          opacity: 1;
        }

        .more-users {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--color-neutral-200, #e0e0e0);
          color: var(--color-neutral-700, #333);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }
      </style>
      <div class="presence-list" role="list" aria-label="Users present on this node"></div>
    `;
  }

  /**
   * Update user avatars
   * @private
   */
  _updateUsers() {
    const list = this.shadowRoot.querySelector('.presence-list');
    if (!list) return;

    list.innerHTML = '';

    const maxVisible = 5;
    const visibleUsers = this._users.slice(0, maxVisible);
    const remainingCount = this._users.length - maxVisible;

    visibleUsers.forEach((user) => {
      const avatar = document.createElement('div');
      avatar.className = `user-avatar ${user.state === 'editing' ? 'editing' : ''}`;
      avatar.style.backgroundColor = user.userColor;
      avatar.setAttribute('role', 'listitem');
      avatar.setAttribute('aria-label', `${user.userName} is ${user.state}`);

      const initials = this._getInitials(user.userName);
      avatar.textContent = initials;

      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = `${user.userName} (${user.state})`;
      avatar.appendChild(tooltip);

      list.appendChild(avatar);
    });

    if (remainingCount > 0) {
      const more = document.createElement('div');
      more.className = 'more-users';
      more.textContent = `+${remainingCount}`;
      more.setAttribute('role', 'listitem');
      more.setAttribute('aria-label', `${remainingCount} more users`);
      list.appendChild(more);
    }
  }

  /**
   * Get initials from name
   * @private
   * @param {string} name
   * @returns {string}
   */
  _getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}

customElements.define('presence-indicator', PresenceIndicator);