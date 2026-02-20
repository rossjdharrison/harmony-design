/**
 * @fileoverview Session Manager Bounded Context
 * Manages collaborative session lifecycle and state.
 * 
 * Performance: All operations < 16ms
 * Memory: Session state < 1MB per session
 * 
 * @see DESIGN_SYSTEM.md#session-manager
 */

import { EventBus } from '../../core/EventBus.js';

/**
 * Session state representation
 * @typedef {Object} Session
 * @property {string} id - Unique session identifier
 * @property {string} name - Human-readable session name
 * @property {string} description - Session description
 * @property {number} createdAt - Creation timestamp (ms since epoch)
 * @property {string} createdBy - User ID of creator
 * @property {number} participantCount - Number of active participants
 * @property {boolean} isPublic - Whether session is publicly joinable
 */

/**
 * Session Manager Bounded Context
 * Handles all session lifecycle operations.
 */
export class SessionManager {
  constructor() {
    /** @type {Session|null} */
    this.currentSession = null;
    
    /** @type {Map<string, Session>} */
    this.sessionCache = new Map();
    
    /** @type {string} */
    this.connectionStatus = 'disconnected';
    
    this._setupEventHandlers();
  }

  /**
   * Subscribe to command events
   * @private
   */
  _setupEventHandlers() {
    EventBus.subscribe('session:create', (event) => {
      this._handleCreateSession(event.detail);
    });

    EventBus.subscribe('session:join', (event) => {
      this._handleJoinSession(event.detail);
    });

    EventBus.subscribe('session:leave', (event) => {
      this._handleLeaveSession(event.detail);
    });

    EventBus.subscribe('session:update-metadata', (event) => {
      this._handleUpdateMetadata(event.detail);
    });
  }

  /**
   * Handle create session command
   * @param {Object} payload
   * @param {string} payload.name - Session name
   * @param {string} payload.description - Session description
   * @param {boolean} payload.isPublic - Public visibility
   * @param {string} payload.userId - Creator user ID
   * @private
   */
  _handleCreateSession(payload) {
    const startTime = performance.now();

    try {
      // Validate: Cannot create if already in a session
      if (this.currentSession) {
        EventBus.publish('session:error', {
          error: 'AlreadyInSession',
          message: 'Leave current session before creating a new one',
          currentSessionId: this.currentSession.id
        });
        return;
      }

      // Generate unique session ID
      const sessionId = this._generateSessionId();

      // Create session object
      const session = {
        id: sessionId,
        name: payload.name || 'Untitled Session',
        description: payload.description || '',
        createdAt: Date.now(),
        createdBy: payload.userId,
        participantCount: 1,
        isPublic: payload.isPublic !== false
      };

      // Update state
      this.currentSession = session;
      this.sessionCache.set(sessionId, session);
      this.connectionStatus = 'connected';

      // Publish success event
      EventBus.publish('session:created', {
        session: { ...session },
        duration: performance.now() - startTime
      });

      console.log(`[SessionManager] Created session: ${sessionId} in ${(performance.now() - startTime).toFixed(2)}ms`);

    } catch (error) {
      EventBus.publish('session:error', {
        error: 'CreateFailed',
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Handle join session command
   * @param {Object} payload
   * @param {string} payload.sessionId - Session to join
   * @param {string} payload.userId - User ID
   * @private
   */
  _handleJoinSession(payload) {
    const startTime = performance.now();

    try {
      // Validate: Cannot join if already in a session
      if (this.currentSession) {
        EventBus.publish('session:error', {
          error: 'AlreadyInSession',
          message: 'Leave current session before joining another',
          currentSessionId: this.currentSession.id
        });
        return;
      }

      // In a real implementation, this would query a backend
      // For now, check cache or create placeholder
      let session = this.sessionCache.get(payload.sessionId);
      
      if (!session) {
        // Simulate fetching session from server
        session = {
          id: payload.sessionId,
          name: 'Existing Session',
          description: 'Joined from invite',
          createdAt: Date.now() - 3600000, // 1 hour ago
          createdBy: 'unknown',
          participantCount: 1,
          isPublic: true
        };
        this.sessionCache.set(payload.sessionId, session);
      }

      // Increment participant count
      session.participantCount++;

      // Update state
      this.currentSession = session;
      this.connectionStatus = 'connected';

      // Publish success event
      EventBus.publish('session:joined', {
        session: { ...session },
        userId: payload.userId,
        duration: performance.now() - startTime
      });

      console.log(`[SessionManager] Joined session: ${payload.sessionId} in ${(performance.now() - startTime).toFixed(2)}ms`);

    } catch (error) {
      EventBus.publish('session:error', {
        error: 'JoinFailed',
        message: error.message,
        sessionId: payload.sessionId
      });
    }
  }

  /**
   * Handle leave session command
   * @param {Object} payload
   * @param {string} payload.userId - User ID
   * @private
   */
  _handleLeaveSession(payload) {
    const startTime = performance.now();

    try {
      if (!this.currentSession) {
        EventBus.publish('session:error', {
          error: 'NotInSession',
          message: 'No active session to leave'
        });
        return;
      }

      const sessionId = this.currentSession.id;
      
      // Decrement participant count
      if (this.currentSession.participantCount > 0) {
        this.currentSession.participantCount--;
      }

      // Clear current session
      const leftSession = { ...this.currentSession };
      this.currentSession = null;
      this.connectionStatus = 'disconnected';

      // Publish success event
      EventBus.publish('session:left', {
        session: leftSession,
        userId: payload.userId,
        duration: performance.now() - startTime
      });

      console.log(`[SessionManager] Left session: ${sessionId} in ${(performance.now() - startTime).toFixed(2)}ms`);

    } catch (error) {
      EventBus.publish('session:error', {
        error: 'LeaveFailed',
        message: error.message
      });
    }
  }

  /**
   * Handle update metadata command
   * @param {Object} payload
   * @param {string} [payload.name] - New session name
   * @param {string} [payload.description] - New description
   * @private
   */
  _handleUpdateMetadata(payload) {
    const startTime = performance.now();

    try {
      if (!this.currentSession) {
        EventBus.publish('session:error', {
          error: 'NotInSession',
          message: 'No active session to update'
        });
        return;
      }

      // Update metadata
      if (payload.name !== undefined) {
        this.currentSession.name = payload.name;
      }
      if (payload.description !== undefined) {
        this.currentSession.description = payload.description;
      }

      // Publish success event
      EventBus.publish('session:metadata-updated', {
        session: { ...this.currentSession },
        duration: performance.now() - startTime
      });

      console.log(`[SessionManager] Updated metadata in ${(performance.now() - startTime).toFixed(2)}ms`);

    } catch (error) {
      EventBus.publish('session:error', {
        error: 'UpdateFailed',
        message: error.message
      });
    }
  }

  /**
   * Generate unique session ID
   * @returns {string}
   * @private
   */
  _generateSessionId() {
    // Use timestamp + random for uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `session-${timestamp}-${random}`;
  }

  /**
   * Get current session state
   * @returns {Session|null}
   */
  getCurrentSession() {
    return this.currentSession ? { ...this.currentSession } : null;
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
export const sessionManager = new SessionManager();