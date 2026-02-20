/**
 * @fileoverview Session Context
 * Provides session state to UI components.
 * 
 * @see DESIGN_SYSTEM.md#session-context
 */

import { EventBus } from '../core/EventBus.js';
import { sessionManager } from '../bounded-contexts/session/SessionManager.js';

/**
 * Session Context
 * Manages session state for UI consumption.
 */
export class SessionContext {
  constructor() {
    /** @type {Object|null} */
    this.session = null;
    
    /** @type {string} */
    this.connectionStatus = 'disconnected';
    
    /** @type {Set<Function>} */
    this.listeners = new Set();
    
    this._setupEventHandlers();
  }

  /**
   * Subscribe to session events
   * @private
   */
  _setupEventHandlers() {
    EventBus.subscribe('session:created', (event) => {
      this.session = event.detail.session;
      this.connectionStatus = 'connected';
      this._notifyListeners();
    });

    EventBus.subscribe('session:joined', (event) => {
      this.session = event.detail.session;
      this.connectionStatus = 'connected';
      this._notifyListeners();
    });

    EventBus.subscribe('session:left', (event) => {
      this.session = null;
      this.connectionStatus = 'disconnected';
      this._notifyListeners();
    });

    EventBus.subscribe('session:metadata-updated', (event) => {
      this.session = event.detail.session;
      this._notifyListeners();
    });

    EventBus.subscribe('session:error', (event) => {
      console.error('[SessionContext] Error:', event.detail);
      this._notifyListeners();
    });
  }

  /**
   * Subscribe to session state changes
   * @param {Function} callback - Called when session state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Immediately call with current state
    callback({
      session: this.session,
      connectionStatus: this.connectionStatus
    });

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  _notifyListeners() {
    const state = {
      session: this.session,
      connectionStatus: this.connectionStatus
    };
    
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[SessionContext] Listener error:', error);
      }
    });
  }

  /**
   * Get current session
   * @returns {Object|null}
   */
  getCurrentSession() {
    return this.session;
  }

  /**
   * Get connection status
   * @returns {string}
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }
}

// Create singleton instance
export const sessionContext = new SessionContext();