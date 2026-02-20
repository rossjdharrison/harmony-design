/**
 * @fileoverview EventBus integration for Live Regions
 * @module core/live_region_events
 * 
 * Provides EventBus command handlers for live region announcements.
 * Allows components to trigger announcements via events.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#live-regions
 */

import { LiveRegionManager } from './live_region_manager.js';

/**
 * @typedef {Object} AnnounceCommand
 * @property {string} message - Message to announce
 * @property {'polite'|'assertive'|'off'} [politeness='polite'] - Announcement politeness
 * @property {'status'|'alert'|'log'} [role='status'] - ARIA role
 * @property {number} [delay=0] - Delay before announcement
 * @property {boolean} [clear=true] - Clear previous announcement
 * @property {number} [clearDelay=1000] - Delay before clearing
 */

/**
 * Initialize live region event handlers
 * @param {import('./event_bus.js').EventBus} eventBus - EventBus instance
 */
export function initializeLiveRegionEvents(eventBus) {
  const manager = LiveRegionManager.getInstance();

  // Ensure manager is initialized
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      manager.initialize();
    });
  } else {
    manager.initialize();
  }

  /**
   * Handle Announce command
   */
  eventBus.subscribe('Announce', (event) => {
    const { message, politeness, role, delay, clear, clearDelay } = event.payload;

    if (!message) {
      console.error('[LiveRegionEvents] Announce command missing message:', event);
      eventBus.publish({
        type: 'AnnounceFailed',
        payload: { 
          error: 'Missing message',
          originalEvent: event 
        }
      });
      return;
    }

    try {
      manager.announce(message, {
        politeness,
        role,
        delay,
        clear,
        clearDelay
      });

      eventBus.publish({
        type: 'AnnounceSucceeded',
        payload: { 
          message,
          politeness: politeness || 'polite'
        }
      });
    } catch (error) {
      console.error('[LiveRegionEvents] Announce failed:', error);
      eventBus.publish({
        type: 'AnnounceFailed',
        payload: { 
          error: error.message,
          originalEvent: event 
        }
      });
    }
  });

  /**
   * Handle AnnouncePolite command
   */
  eventBus.subscribe('AnnouncePolite', (event) => {
    const { message, ...options } = event.payload;

    if (!message) {
      console.error('[LiveRegionEvents] AnnouncePolite command missing message:', event);
      return;
    }

    manager.announcePolite(message, options);

    eventBus.publish({
      type: 'AnnounceSucceeded',
      payload: { message, politeness: 'polite' }
    });
  });

  /**
   * Handle AnnounceAssertive command
   */
  eventBus.subscribe('AnnounceAssertive', (event) => {
    const { message, ...options } = event.payload;

    if (!message) {
      console.error('[LiveRegionEvents] AnnounceAssertive command missing message:', event);
      return;
    }

    manager.announceAssertive(message, options);

    eventBus.publish({
      type: 'AnnounceSucceeded',
      payload: { message, politeness: 'assertive' }
    });
  });

  /**
   * Handle AnnounceStatus command
   */
  eventBus.subscribe('AnnounceStatus', (event) => {
    const { message, ...options } = event.payload;

    if (!message) {
      console.error('[LiveRegionEvents] AnnounceStatus command missing message:', event);
      return;
    }

    manager.announceStatus(message, options);

    eventBus.publish({
      type: 'AnnounceSucceeded',
      payload: { message, politeness: 'polite', role: 'status' }
    });
  });

  /**
   * Handle AnnounceLog command
   */
  eventBus.subscribe('AnnounceLog', (event) => {
    const { message, ...options } = event.payload;

    if (!message) {
      console.error('[LiveRegionEvents] AnnounceLog command missing message:', event);
      return;
    }

    manager.announceLog(message, options);

    eventBus.publish({
      type: 'AnnounceSucceeded',
      payload: { message, politeness: 'polite', role: 'log' }
    });
  });

  /**
   * Handle ClearLiveRegion command
   */
  eventBus.subscribe('ClearLiveRegion', (event) => {
    const { region } = event.payload;

    if (region) {
      manager.clearRegion(region);
    } else {
      manager.clearAll();
    }

    eventBus.publish({
      type: 'LiveRegionCleared',
      payload: { region: region || 'all' }
    });
  });

  console.log('[LiveRegionEvents] Initialized event handlers');
}