/**
 * @fileoverview Collaborative Cursors Component
 * @module components/collaborative-cursors
 * 
 * Displays real-time cursor positions and text selections from other users
 * in a collaborative editing session.
 * 
 * Performance Targets:
 * - Render Budget: <16ms per frame (60fps)
 * - Memory Budget: <2MB for 50 concurrent cursors
 * - Update Latency: <50ms from event to render
 * 
 * Related Documentation:
 * - See DESIGN_SYSTEM.md § Collaborative Features
 * - See contexts/PresenceContext.js for presence data
 * 
 * @example
 * <collaborative-cursors></collaborative-cursors>
 */

import { EventBus } from '../core/EventBus.js';

/**
 * @typedef {Object} CursorPosition
 * @property {string} userId - Unique identifier for the user
 * @property {string} userName - Display name of the user
 * @property {string} userColor - Hex color code for the user's cursor
 * @property {number} x - X coordinate in pixels
 * @property {number} y - Y coordinate in pixels
 * @property {number} timestamp - Last update timestamp
 */

/**
 * @typedef {Object} TextSelection
 * @property {string} userId - Unique identifier for the user
 * @property {string} userName - Display name of the user
 * @property {string} userColor - Hex color code for the user's selection
 * @property {DOMRect} bounds - Bounding rectangle of the selection
 * @property {number} timestamp - Last update timestamp
 */

/**
 * Collaborative Cursors Web Component
 * 
 * Renders cursor indicators and selection highlights for remote users
 * in real-time collaborative editing scenarios.
 * 
 * @class CollaborativeCursorsComponent
 * @extends HTMLElement
 */
class CollaborativeCursorsComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Map<string, CursorPosition>} */
    this.cursors = new Map();
    
    /** @type {Map<string, TextSelection>} */
    this.selections = new Map();
    
    /** @type {number|null} */
    this.animationFrameId = null;
    
    /** @type {number} */
    this.lastRenderTime = 0;
    
    /** @type {number} */
    this.cursorTimeoutMs = 5000; // Hide cursors after 5s of inactivity
    
    /** @type {boolean} */
    this.isEnabled = true;
    
    this._handleCursorMove = this._handleCursorMove.bind(this);
    this._handleSelectionChange = this._handleSelectionChange.bind(this);
    this._handleUserLeft = this._handleUserLeft.bind(this);
    this._handlePresenceUpdate = this._handlePresenceUpdate.bind(this);
    this._render = this._render.bind(this);
  }

  connectedCallback() {
    this._setupStyles();
    this._setupEventListeners();
    this._startRenderLoop();
    
    // Publish component ready event
    EventBus.publish('collaborative-cursors:ready', {
      componentId: this.id || 'default',
      timestamp: Date.now()
    });
  }

  disconnectedCallback() {
    this._teardownEventListeners();
    this._stopRenderLoop();
  }

  /**
   * Setup component styles
   * @private
   */
  _setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        contain: layout style paint;
      }

      :host([hidden]) {
        display: none;
      }

      .cursor {
        position: absolute;
        pointer-events: none;
        will-change: transform;
        transition: opacity 0.2s ease-out;
      }

      .cursor.inactive {
        opacity: 0;
      }

      .cursor-icon {
        width: 20px;
        height: 20px;
        position: relative;
      }

      .cursor-label {
        position: absolute;
        top: 22px;
        left: 0;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        color: white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transform-origin: top left;
        animation: fadeIn 0.2s ease-out;
      }

      .selection {
        position: absolute;
        pointer-events: none;
        opacity: 0.2;
        transition: opacity 0.2s ease-out;
        will-change: transform;
      }

      .selection.inactive {
        opacity: 0;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Performance optimization: Use GPU acceleration */
      .cursor,
      .selection {
        transform: translateZ(0);
      }
    `;
    this.shadowRoot.appendChild(style);

    // Create container for cursors and selections
    const container = document.createElement('div');
    container.className = 'cursors-container';
    this.shadowRoot.appendChild(container);
  }

  /**
   * Setup EventBus listeners
   * @private
   */
  _setupEventListeners() {
    EventBus.subscribe('presence:cursor-move', this._handleCursorMove);
    EventBus.subscribe('presence:selection-change', this._handleSelectionChange);
    EventBus.subscribe('presence:user-left', this._handleUserLeft);
    EventBus.subscribe('presence:update', this._handlePresenceUpdate);
  }

  /**
   * Teardown EventBus listeners
   * @private
   */
  _teardownEventListeners() {
    EventBus.unsubscribe('presence:cursor-move', this._handleCursorMove);
    EventBus.unsubscribe('presence:selection-change', this._handleSelectionChange);
    EventBus.unsubscribe('presence:user-left', this._handleUserLeft);
    EventBus.unsubscribe('presence:update', this._handlePresenceUpdate);
  }

  /**
   * Handle cursor move event
   * @private
   * @param {Object} event - Cursor move event
   */
  _handleCursorMove(event) {
    if (!this.isEnabled) return;
    
    const { userId, userName, userColor, x, y } = event;
    
    // Ignore own cursor
    if (this._isCurrentUser(userId)) return;
    
    this.cursors.set(userId, {
      userId,
      userName,
      userColor: userColor || this._generateColor(userId),
      x,
      y,
      timestamp: Date.now()
    });
  }

  /**
   * Handle selection change event
   * @private
   * @param {Object} event - Selection change event
   */
  _handleSelectionChange(event) {
    if (!this.isEnabled) return;
    
    const { userId, userName, userColor, bounds } = event;
    
    // Ignore own selection
    if (this._isCurrentUser(userId)) return;
    
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      this.selections.set(userId, {
        userId,
        userName,
        userColor: userColor || this._generateColor(userId),
        bounds,
        timestamp: Date.now()
      });
    } else {
      // Clear selection if bounds are empty
      this.selections.delete(userId);
    }
  }

  /**
   * Handle user left event
   * @private
   * @param {Object} event - User left event
   */
  _handleUserLeft(event) {
    const { userId } = event;
    this.cursors.delete(userId);
    this.selections.delete(userId);
  }

  /**
   * Handle presence update event
   * @private
   * @param {Object} event - Presence update event
   */
  _handlePresenceUpdate(event) {
    const { users } = event;
    
    // Remove cursors for users no longer present
    const activeUserIds = new Set(users.map(u => u.userId));
    
    for (const userId of this.cursors.keys()) {
      if (!activeUserIds.has(userId)) {
        this.cursors.delete(userId);
      }
    }
    
    for (const userId of this.selections.keys()) {
      if (!activeUserIds.has(userId)) {
        this.selections.delete(userId);
      }
    }
  }

  /**
   * Check if user ID is current user
   * @private
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  _isCurrentUser(userId) {
    // Get current user ID from presence context or session
    const currentUserId = this.getAttribute('current-user-id') || 
                         sessionStorage.getItem('currentUserId');
    return userId === currentUserId;
  }

  /**
   * Generate consistent color for user ID
   * @private
   * @param {string} userId - User ID
   * @returns {string} Hex color code
   */
  _generateColor(userId) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#E76F51', '#2A9D8F'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Start render loop
   * @private
   */
  _startRenderLoop() {
    this._render();
  }

  /**
   * Stop render loop
   * @private
   */
  _stopRenderLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render cursors and selections
   * @private
   */
  _render() {
    const now = Date.now();
    const deltaTime = now - this.lastRenderTime;
    
    // Performance budget check: 16ms per frame
    if (deltaTime < 16) {
      this.animationFrameId = requestAnimationFrame(this._render);
      return;
    }
    
    this.lastRenderTime = now;
    
    const container = this.shadowRoot.querySelector('.cursors-container');
    if (!container) return;
    
    // Clear old elements (simple approach for now)
    container.innerHTML = '';
    
    // Render selections first (behind cursors)
    for (const [userId, selection] of this.selections.entries()) {
      const isInactive = now - selection.timestamp > this.cursorTimeoutMs;
      if (isInactive) continue;
      
      const selectionEl = this._createSelectionElement(selection);
      container.appendChild(selectionEl);
    }
    
    // Render cursors
    for (const [userId, cursor] of this.cursors.entries()) {
      const isInactive = now - cursor.timestamp > this.cursorTimeoutMs;
      
      const cursorEl = this._createCursorElement(cursor, isInactive);
      container.appendChild(cursorEl);
      
      // Remove inactive cursors after fade out
      if (isInactive) {
        setTimeout(() => {
          this.cursors.delete(userId);
        }, 200);
      }
    }
    
    // Continue render loop
    this.animationFrameId = requestAnimationFrame(this._render);
  }

  /**
   * Create cursor DOM element
   * @private
   * @param {CursorPosition} cursor - Cursor data
   * @param {boolean} isInactive - Whether cursor is inactive
   * @returns {HTMLElement}
   */
  _createCursorElement(cursor, isInactive) {
    const cursorEl = document.createElement('div');
    cursorEl.className = `cursor ${isInactive ? 'inactive' : ''}`;
    cursorEl.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
    
    // SVG cursor icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'cursor-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', cursor.userColor);
    icon.innerHTML = `
      <path d="M7.5 2L2 22l7-5 4 8 2-1-4-8 8-2z"/>
    `;
    
    cursorEl.appendChild(icon);
    
    // User label
    const label = document.createElement('div');
    label.className = 'cursor-label';
    label.textContent = cursor.userName;
    label.style.backgroundColor = cursor.userColor;
    cursorEl.appendChild(label);
    
    return cursorEl;
  }

  /**
   * Create selection DOM element
   * @private
   * @param {TextSelection} selection - Selection data
   * @returns {HTMLElement}
   */
  _createSelectionElement(selection) {
    const selectionEl = document.createElement('div');
    selectionEl.className = 'selection';
    selectionEl.style.backgroundColor = selection.userColor;
    selectionEl.style.left = `${selection.bounds.left}px`;
    selectionEl.style.top = `${selection.bounds.top}px`;
    selectionEl.style.width = `${selection.bounds.width}px`;
    selectionEl.style.height = `${selection.bounds.height}px`;
    
    return selectionEl;
  }

  /**
   * Enable or disable cursor rendering
   * @param {boolean} enabled - Whether to enable cursors
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cursors.clear();
      this.selections.clear();
    }
  }

  /**
   * Set cursor timeout duration
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  setCursorTimeout(timeoutMs) {
    this.cursorTimeoutMs = timeoutMs;
  }

  /**
   * Get current cursor count
   * @returns {number}
   */
  getCursorCount() {
    return this.cursors.size;
  }

  /**
   * Clear all cursors and selections
   */
  clear() {
    this.cursors.clear();
    this.selections.clear();
  }
}

// Register custom element
customElements.define('collaborative-cursors', CollaborativeCursorsComponent);

export { CollaborativeCursorsComponent };