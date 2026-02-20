/**
 * @fileoverview Presence Cursor Web Component
 * Displays remote user cursors on the canvas
 * 
 * @module components/presence-cursor
 * @see DESIGN_SYSTEM.md#presence-awareness
 */

/**
 * Presence Cursor Component
 * Shows cursor positions of other users in real-time
 * 
 * @example
 * <presence-cursor></presence-cursor>
 */
export class PresenceCursor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /** @private @type {Map<string, HTMLElement>} */
    this._cursors = new Map();

    /** @private @type {Function|null} */
    this._cursorMovedHandler = null;

    /** @private @type {Function|null} */
    this._presenceChangedHandler = null;
  }

  /**
   * Connected callback
   */
  connectedCallback() {
    this._render();
    this._setupEventListeners();
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
    this._cursorMovedHandler = (event) => {
      this._updateCursor(event.detail);
    };

    this._presenceChangedHandler = (event) => {
      this._handlePresenceChanged(event.detail);
    };

    window.addEventListener('Presence.CursorMoved', this._cursorMovedHandler);
    window.addEventListener('Presence.PresenceChanged', this._presenceChangedHandler);
  }

  /**
   * Tear down event listeners
   * @private
   */
  _teardownEventListeners() {
    if (this._cursorMovedHandler) {
      window.removeEventListener('Presence.CursorMoved', this._cursorMovedHandler);
      this._cursorMovedHandler = null;
    }

    if (this._presenceChangedHandler) {
      window.removeEventListener('Presence.PresenceChanged', this._presenceChangedHandler);
      this._presenceChangedHandler = null;
    }
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
        }

        .cursor {
          position: absolute;
          pointer-events: none;
          transition: transform 0.1s ease-out;
          will-change: transform;
        }

        .cursor-icon {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }

        .cursor-label {
          position: absolute;
          top: 20px;
          left: 10px;
          background: currentColor;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      </style>
      <div class="cursors-container"></div>
    `;
  }

  /**
   * Update cursor position
   * @private
   * @param {Object} data
   * @param {string} data.userId
   * @param {string} data.userName
   * @param {string} data.userColor
   * @param {number} data.x
   * @param {number} data.y
   */
  _updateCursor(data) {
    const { userId, userName, userColor, x, y } = data;

    let cursor = this._cursors.get(userId);
    
    if (!cursor) {
      cursor = this._createCursor(userId, userName, userColor);
      this._cursors.set(userId, cursor);
      const container = this.shadowRoot.querySelector('.cursors-container');
      container.appendChild(cursor);
    }

    cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  /**
   * Create cursor element
   * @private
   * @param {string} userId
   * @param {string} userName
   * @param {string} userColor
   * @returns {HTMLElement}
   */
  _createCursor(userId, userName, userColor) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.style.color = userColor;
    cursor.dataset.userId = userId;

    cursor.innerHTML = `
      <svg class="cursor-icon" viewBox="0 0 24 24">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
      </svg>
      <div class="cursor-label">${this._escapeHtml(userName)}</div>
    `;

    return cursor;
  }

  /**
   * Handle presence changed
   * @private
   * @param {Object} data
   * @param {Array} data.users
   */
  _handlePresenceChanged(data) {
    const { users } = data;
    const activeUserIds = new Set(users.map((u) => u.userId));

    // Remove cursors for users no longer present
    for (const [userId, cursor] of this._cursors.entries()) {
      if (!activeUserIds.has(userId)) {
        cursor.remove();
        this._cursors.delete(userId);
      }
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text
   * @returns {string}
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('presence-cursor', PresenceCursor);