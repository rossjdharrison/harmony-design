/**
 * @fileoverview Presence Awareness Bounded Context
 * Tracks who is viewing/editing which nodes in the graph
 * Publishes presence updates via EventBus
 * 
 * @module bounded-contexts/PresenceContext
 * @see DESIGN_SYSTEM.md#presence-awareness
 */

import { EventBus } from '../core/EventBus.js';

/**
 * @typedef {Object} UserPresence
 * @property {string} userId - Unique user identifier
 * @property {string} userName - Display name
 * @property {string} userColor - Hex color for user indicator
 * @property {string} nodeId - Node being viewed/edited
 * @property {'viewing'|'editing'} state - Current interaction state
 * @property {number} timestamp - Last update timestamp
 * @property {Object} [cursorPosition] - Optional cursor position
 * @property {number} [cursorPosition.x] - X coordinate
 * @property {number} [cursorPosition.y] - Y coordinate
 */

/**
 * @typedef {Object} PresenceUpdate
 * @property {string} userId
 * @property {string} nodeId
 * @property {'viewing'|'editing'|'idle'} state
 * @property {number} timestamp
 */

/**
 * Presence Awareness Bounded Context
 * Manages user presence information for collaborative editing
 */
export class PresenceContext {
  /**
   * @param {Object} config
   * @param {EventBus} config.eventBus - Event bus instance
   * @param {number} [config.idleTimeout=30000] - Idle timeout in ms
   * @param {number} [config.cleanupInterval=5000] - Cleanup interval in ms
   */
  constructor({ eventBus, idleTimeout = 30000, cleanupInterval = 5000 }) {
    if (!eventBus) {
      throw new Error('PresenceContext requires an EventBus instance');
    }

    /** @private */
    this.eventBus = eventBus;

    /** @private */
    this.idleTimeout = idleTimeout;

    /** @private */
    this.cleanupInterval = cleanupInterval;

    /** @private @type {Map<string, UserPresence>} */
    this.presenceMap = new Map();

    /** @private @type {Map<string, Set<string>>} */
    this.nodeToUsers = new Map();

    /** @private @type {number|null} */
    this.cleanupTimer = null;

    this._setupEventListeners();
    this._startCleanupTimer();
  }

  /**
   * Set up event bus listeners
   * @private
   */
  _setupEventListeners() {
    // Subscribe to presence update commands
    this.eventBus.subscribe('Presence.UpdatePresence', (event) => {
      this._handleUpdatePresence(event.payload);
    });

    this.eventBus.subscribe('Presence.RemovePresence', (event) => {
      this._handleRemovePresence(event.payload);
    });

    this.eventBus.subscribe('Presence.QueryNodePresence', (event) => {
      this._handleQueryNodePresence(event.payload);
    });

    this.eventBus.subscribe('Presence.QueryAllPresence', (event) => {
      this._handleQueryAllPresence(event.payload);
    });

    this.eventBus.subscribe('Presence.UpdateCursor', (event) => {
      this._handleUpdateCursor(event.payload);
    });
  }

  /**
   * Handle presence update command
   * @private
   * @param {PresenceUpdate} payload
   */
  _handleUpdatePresence(payload) {
    const { userId, userName, userColor, nodeId, state } = payload;

    if (!userId || !nodeId) {
      console.error('[PresenceContext] Invalid presence update:', payload);
      return;
    }

    const timestamp = Date.now();
    const presenceKey = `${userId}:${nodeId}`;

    // Remove old presence if user switched nodes
    const oldPresence = this.presenceMap.get(userId);
    if (oldPresence && oldPresence.nodeId !== nodeId) {
      this._removeUserFromNode(userId, oldPresence.nodeId);
    }

    // Update presence
    const presence = {
      userId,
      userName: userName || userId,
      userColor: userColor || this._generateUserColor(userId),
      nodeId,
      state: state || 'viewing',
      timestamp,
    };

    this.presenceMap.set(userId, presence);

    // Update node index
    if (!this.nodeToUsers.has(nodeId)) {
      this.nodeToUsers.set(nodeId, new Set());
    }
    this.nodeToUsers.get(nodeId).add(userId);

    // Publish presence changed event
    this.eventBus.publish({
      type: 'Presence.PresenceChanged',
      payload: {
        nodeId,
        users: this._getNodePresence(nodeId),
        timestamp,
      },
      source: 'PresenceContext',
    });
  }

  /**
   * Handle remove presence command
   * @private
   * @param {Object} payload
   * @param {string} payload.userId
   */
  _handleRemovePresence(payload) {
    const { userId } = payload;

    if (!userId) {
      console.error('[PresenceContext] Invalid remove presence:', payload);
      return;
    }

    const presence = this.presenceMap.get(userId);
    if (presence) {
      this._removeUserFromNode(userId, presence.nodeId);
      this.presenceMap.delete(userId);

      // Publish presence changed event
      this.eventBus.publish({
        type: 'Presence.PresenceChanged',
        payload: {
          nodeId: presence.nodeId,
          users: this._getNodePresence(presence.nodeId),
          timestamp: Date.now(),
        },
        source: 'PresenceContext',
      });
    }
  }

  /**
   * Handle query node presence command
   * @private
   * @param {Object} payload
   * @param {string} payload.nodeId
   * @param {string} [payload.requestId]
   */
  _handleQueryNodePresence(payload) {
    const { nodeId, requestId } = payload;

    if (!nodeId) {
      console.error('[PresenceContext] Invalid query node presence:', payload);
      return;
    }

    const users = this._getNodePresence(nodeId);

    this.eventBus.publish({
      type: 'Presence.NodePresenceResult',
      payload: {
        nodeId,
        users,
        requestId,
        timestamp: Date.now(),
      },
      source: 'PresenceContext',
    });
  }

  /**
   * Handle query all presence command
   * @private
   * @param {Object} payload
   * @param {string} [payload.requestId]
   */
  _handleQueryAllPresence(payload) {
    const { requestId } = payload || {};

    const allPresence = Array.from(this.presenceMap.values());

    this.eventBus.publish({
      type: 'Presence.AllPresenceResult',
      payload: {
        users: allPresence,
        requestId,
        timestamp: Date.now(),
      },
      source: 'PresenceContext',
    });
  }

  /**
   * Handle cursor position update
   * @private
   * @param {Object} payload
   * @param {string} payload.userId
   * @param {number} payload.x
   * @param {number} payload.y
   */
  _handleUpdateCursor(payload) {
    const { userId, x, y } = payload;

    if (!userId || x === undefined || y === undefined) {
      console.error('[PresenceContext] Invalid cursor update:', payload);
      return;
    }

    const presence = this.presenceMap.get(userId);
    if (presence) {
      presence.cursorPosition = { x, y };
      presence.timestamp = Date.now();

      // Publish cursor update
      this.eventBus.publish({
        type: 'Presence.CursorMoved',
        payload: {
          userId,
          userName: presence.userName,
          userColor: presence.userColor,
          nodeId: presence.nodeId,
          x,
          y,
          timestamp: presence.timestamp,
        },
        source: 'PresenceContext',
      });
    }
  }

  /**
   * Get all users present on a node
   * @private
   * @param {string} nodeId
   * @returns {UserPresence[]}
   */
  _getNodePresence(nodeId) {
    const userIds = this.nodeToUsers.get(nodeId);
    if (!userIds) {
      return [];
    }

    return Array.from(userIds)
      .map((userId) => this.presenceMap.get(userId))
      .filter(Boolean);
  }

  /**
   * Remove user from node index
   * @private
   * @param {string} userId
   * @param {string} nodeId
   */
  _removeUserFromNode(userId, nodeId) {
    const users = this.nodeToUsers.get(nodeId);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        this.nodeToUsers.delete(nodeId);
      }
    }
  }

  /**
   * Generate a consistent color for a user
   * @private
   * @param {string} userId
   * @returns {string} Hex color
   */
  _generateUserColor(userId) {
    // Simple hash to generate consistent colors
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  }

  /**
   * Start cleanup timer to remove stale presence
   * @private
   */
  _startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this._cleanupStalePresence();
    }, this.cleanupInterval);
  }

  /**
   * Clean up stale presence data
   * @private
   */
  _cleanupStalePresence() {
    const now = Date.now();
    const staleUsers = [];

    for (const [userId, presence] of this.presenceMap.entries()) {
      if (now - presence.timestamp > this.idleTimeout) {
        staleUsers.push({ userId, nodeId: presence.nodeId });
      }
    }

    for (const { userId, nodeId } of staleUsers) {
      this._removeUserFromNode(userId, nodeId);
      this.presenceMap.delete(userId);

      // Publish presence changed event
      this.eventBus.publish({
        type: 'Presence.PresenceChanged',
        payload: {
          nodeId,
          users: this._getNodePresence(nodeId),
          timestamp: now,
        },
        source: 'PresenceContext',
      });
    }
  }

  /**
   * Destroy the presence context
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.presenceMap.clear();
    this.nodeToUsers.clear();
  }
}