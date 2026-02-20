/**
 * @fileoverview Room Manager Component
 * UI for creating and joining collaborative sessions.
 * 
 * Performance: Render < 16ms, Memory < 1MB
 * 
 * @see DESIGN_SYSTEM.md#room-manager-component
 */

import { EventBus } from '../../core/EventBus.js';
import { sessionContext } from '../../contexts/SessionContext.js';

/**
 * Room Manager Web Component
 * Provides UI for session management.
 * 
 * @example
 * <room-manager user-id="user-123"></room-manager>
 */
export class RoomManagerComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {string} */
    this.userId = '';
    
    /** @type {Object|null} */
    this.currentSession = null;
    
    /** @type {Function|null} */
    this.unsubscribe = null;
  }

  static get observedAttributes() {
    return ['user-id'];
  }

  connectedCallback() {
    this.userId = this.getAttribute('user-id') || `user-${Date.now()}`;
    this._render();
    this._attachEventListeners();
    
    // Subscribe to session context
    this.unsubscribe = sessionContext.subscribe((state) => {
      this.currentSession = state.session;
      this._render();
    });
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'user-id' && oldValue !== newValue) {
      this.userId = newValue;
    }
  }

  /**
   * Render component
   * @private
   */
  _render() {
    const startTime = performance.now();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --primary-color: #0066cc;
          --success-color: #28a745;
          --danger-color: #dc3545;
          --border-color: #dee2e6;
          --bg-color: #ffffff;
          --text-color: #212529;
          --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .card {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 24px;
          box-shadow: var(--shadow);
        }

        .title {
          margin: 0 0 20px 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-color);
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: var(--text-color);
        }

        input[type="text"],
        textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        input[type="text"]:focus,
        textarea:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        textarea {
          resize: vertical;
          min-height: 80px;
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

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-primary {
          background: var(--primary-color);
          color: white;
        }

        .btn-primary:hover {
          background: #0052a3;
        }

        .btn-success {
          background: var(--success-color);
          color: white;
        }

        .btn-success:hover {
          background: #218838;
        }

        .btn-danger {
          background: var(--danger-color);
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .session-info {
          background: #f8f9fa;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .session-info h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
          color: var(--text-color);
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .info-label {
          font-weight: 500;
          color: #6c757d;
        }

        .info-value {
          color: var(--text-color);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-connected {
          background: #d4edda;
          color: #155724;
        }

        .status-disconnected {
          background: #f8d7da;
          color: #721c24;
        }

        .divider {
          margin: 24px 0;
          border: none;
          border-top: 1px solid var(--border-color);
        }

        .join-section {
          margin-top: 24px;
        }

        .join-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: var(--text-color);
        }
      </style>

      <div class="container">
        <div class="card">
          ${this._renderContent()}
        </div>
      </div>
    `;

    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`[RoomManagerComponent] Render exceeded budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Render content based on session state
   * @returns {string}
   * @private
   */
  _renderContent() {
    if (this.currentSession) {
      return this._renderActiveSession();
    } else {
      return this._renderSessionForms();
    }
  }

  /**
   * Render active session view
   * @returns {string}
   * @private
   */
  _renderActiveSession() {
    const session = this.currentSession;
    const createdDate = new Date(session.createdAt).toLocaleString();

    return `
      <h2 class="title">Active Session</h2>
      
      <div class="session-info">
        <h3>${this._escapeHtml(session.name)}</h3>
        <div class="info-row">
          <span class="info-label">Session ID:</span>
          <span class="info-value">${this._escapeHtml(session.id)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Created:</span>
          <span class="info-value">${createdDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Participants:</span>
          <span class="info-value">${session.participantCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="status-badge status-connected">Connected</span>
        </div>
        ${session.description ? `
          <div class="info-row">
            <span class="info-label">Description:</span>
            <span class="info-value">${this._escapeHtml(session.description)}</span>
          </div>
        ` : ''}
      </div>

      <div class="button-group">
        <button class="btn-danger" data-action="leave">Leave Session</button>
      </div>
    `;
  }

  /**
   * Render session creation and join forms
   * @returns {string}
   * @private
   */
  _renderSessionForms() {
    return `
      <h2 class="title">Room Manager</h2>
      
      <div class="form-group">
        <label for="session-name">Session Name</label>
        <input type="text" id="session-name" placeholder="My Collaboration Session" />
      </div>

      <div class="form-group">
        <label for="session-description">Description (optional)</label>
        <textarea id="session-description" placeholder="What are you working on?"></textarea>
      </div>

      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" id="session-public" checked />
          <label for="session-public">Make session public</label>
        </div>
      </div>

      <div class="button-group">
        <button class="btn-primary" data-action="create">Create Session</button>
      </div>

      <hr class="divider" />

      <div class="join-section">
        <h3>Join Existing Session</h3>
        
        <div class="form-group">
          <label for="join-session-id">Session ID</label>
          <input type="text" id="join-session-id" placeholder="session-xxxxx" />
        </div>

        <div class="button-group">
          <button class="btn-success" data-action="join">Join Session</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this.shadowRoot.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      
      switch (action) {
        case 'create':
          this._handleCreateSession();
          break;
        case 'join':
          this._handleJoinSession();
          break;
        case 'leave':
          this._handleLeaveSession();
          break;
      }
    });
  }

  /**
   * Handle create session button click
   * @private
   */
  _handleCreateSession() {
    const nameInput = this.shadowRoot.getElementById('session-name');
    const descriptionInput = this.shadowRoot.getElementById('session-description');
    const publicCheckbox = this.shadowRoot.getElementById('session-public');

    const name = nameInput?.value.trim() || 'Untitled Session';
    const description = descriptionInput?.value.trim() || '';
    const isPublic = publicCheckbox?.checked !== false;

    // Publish command event
    EventBus.publish('session:create', {
      name,
      description,
      isPublic,
      userId: this.userId
    });
  }

  /**
   * Handle join session button click
   * @private
   */
  _handleJoinSession() {
    const sessionIdInput = this.shadowRoot.getElementById('join-session-id');
    const sessionId = sessionIdInput?.value.trim();

    if (!sessionId) {
      alert('Please enter a session ID');
      return;
    }

    // Publish command event
    EventBus.publish('session:join', {
      sessionId,
      userId: this.userId
    });
  }

  /**
   * Handle leave session button click
   * @private
   */
  _handleLeaveSession() {
    if (!confirm('Are you sure you want to leave this session?')) {
      return;
    }

    // Publish command event
    EventBus.publish('session:leave', {
      userId: this.userId
    });
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str
   * @returns {string}
   * @private
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Register custom element
customElements.define('room-manager', RoomManagerComponent);