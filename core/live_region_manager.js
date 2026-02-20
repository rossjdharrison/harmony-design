/**
 * @fileoverview Live Region Manager for ARIA live announcements
 * @module core/live_region_manager
 * 
 * Manages ARIA live regions for announcing dynamic content changes to screen readers.
 * Provides polite, assertive, and status announcement capabilities.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#live-regions
 */

/**
 * @typedef {'polite'|'assertive'|'off'} LiveRegionPoliteness
 * @typedef {'status'|'alert'|'log'} LiveRegionRole
 */

/**
 * @typedef {Object} AnnouncementOptions
 * @property {LiveRegionPoliteness} [politeness='polite'] - How urgently to announce
 * @property {LiveRegionRole} [role='status'] - ARIA role for the region
 * @property {number} [delay=0] - Delay before announcement (ms)
 * @property {boolean} [clear=true] - Clear previous announcement
 * @property {number} [clearDelay=1000] - Delay before clearing (ms)
 */

/**
 * Manager for ARIA live regions
 * Singleton pattern - use LiveRegionManager.getInstance()
 */
export class LiveRegionManager {
  /** @type {LiveRegionManager|null} */
  static #instance = null;

  /** @type {Map<string, HTMLElement>} */
  #regions = new Map();

  /** @type {Map<string, number>} */
  #clearTimeouts = new Map();

  /** @type {Map<string, number>} */
  #announceTimeouts = new Map();

  /** @type {boolean} */
  #initialized = false;

  constructor() {
    if (LiveRegionManager.#instance) {
      return LiveRegionManager.#instance;
    }
    LiveRegionManager.#instance = this;
  }

  /**
   * Get singleton instance
   * @returns {LiveRegionManager}
   */
  static getInstance() {
    if (!LiveRegionManager.#instance) {
      LiveRegionManager.#instance = new LiveRegionManager();
    }
    return LiveRegionManager.#instance;
  }

  /**
   * Initialize live regions in the DOM
   * Creates hidden regions for polite, assertive, and status announcements
   */
  initialize() {
    if (this.#initialized) {
      return;
    }

    // Create container for all live regions
    const container = document.createElement('div');
    container.id = 'harmony-live-regions';
    container.setAttribute('aria-hidden', 'false');
    container.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;

    // Create polite region
    const politeRegion = this.#createRegion('polite', 'status', 'polite');
    container.appendChild(politeRegion);
    this.#regions.set('polite', politeRegion);

    // Create assertive region
    const assertiveRegion = this.#createRegion('assertive', 'alert', 'assertive');
    container.appendChild(assertiveRegion);
    this.#regions.set('assertive', assertiveRegion);

    // Create status region (for non-critical updates)
    const statusRegion = this.#createRegion('status', 'status', 'polite');
    container.appendChild(statusRegion);
    this.#regions.set('status', statusRegion);

    // Create log region (for sequential updates)
    const logRegion = this.#createRegion('log', 'log', 'polite');
    logRegion.setAttribute('aria-atomic', 'false');
    container.appendChild(logRegion);
    this.#regions.set('log', logRegion);

    // Add to DOM
    if (document.body) {
      document.body.appendChild(container);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(container);
      });
    }

    this.#initialized = true;
  }

  /**
   * Create a live region element
   * @param {string} id - Region identifier
   * @param {LiveRegionRole} role - ARIA role
   * @param {LiveRegionPoliteness} politeness - ARIA live politeness
   * @returns {HTMLElement}
   * @private
   */
  #createRegion(id, role, politeness) {
    const region = document.createElement('div');
    region.id = `harmony-live-region-${id}`;
    region.setAttribute('role', role);
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('aria-relevant', 'additions text');
    return region;
  }

  /**
   * Announce a message to screen readers
   * @param {string} message - Message to announce
   * @param {AnnouncementOptions} [options={}] - Announcement options
   */
  announce(message, options = {}) {
    if (!this.#initialized) {
      this.initialize();
    }

    if (!message || typeof message !== 'string') {
      console.warn('[LiveRegionManager] Invalid message:', message);
      return;
    }

    const {
      politeness = 'polite',
      role = 'status',
      delay = 0,
      clear = true,
      clearDelay = 1000
    } = options;

    // Determine which region to use
    let regionKey = politeness;
    if (politeness === 'polite' && role === 'log') {
      regionKey = 'log';
    } else if (politeness === 'polite' && role === 'status') {
      regionKey = 'status';
    }

    const region = this.#regions.get(regionKey);
    if (!region) {
      console.error(`[LiveRegionManager] Region not found: ${regionKey}`);
      return;
    }

    // Clear any pending announcements for this region
    const existingTimeout = this.#announceTimeouts.get(regionKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const existingClearTimeout = this.#clearTimeouts.get(regionKey);
    if (existingClearTimeout) {
      clearTimeout(existingClearTimeout);
    }

    // Schedule announcement
    const announceTimeout = setTimeout(() => {
      if (role === 'log') {
        // For logs, append rather than replace
        const entry = document.createElement('div');
        entry.textContent = message;
        region.appendChild(entry);

        // Keep only last 5 entries
        while (region.children.length > 5) {
          region.removeChild(region.firstChild);
        }
      } else {
        // For other roles, replace content
        region.textContent = message;
      }

      // Schedule clearing if requested
      if (clear && role !== 'log') {
        const clearTimeout = setTimeout(() => {
          region.textContent = '';
          this.#clearTimeouts.delete(regionKey);
        }, clearDelay);
        this.#clearTimeouts.set(regionKey, clearTimeout);
      }

      this.#announceTimeouts.delete(regionKey);
    }, delay);

    this.#announceTimeouts.set(regionKey, announceTimeout);
  }

  /**
   * Announce with polite politeness (default)
   * @param {string} message - Message to announce
   * @param {Partial<AnnouncementOptions>} [options={}] - Additional options
   */
  announcePolite(message, options = {}) {
    this.announce(message, { ...options, politeness: 'polite' });
  }

  /**
   * Announce with assertive politeness (interrupts)
   * @param {string} message - Message to announce
   * @param {Partial<AnnouncementOptions>} [options={}] - Additional options
   */
  announceAssertive(message, options = {}) {
    this.announce(message, { ...options, politeness: 'assertive', role: 'alert' });
  }

  /**
   * Announce a status update
   * @param {string} message - Status message
   * @param {Partial<AnnouncementOptions>} [options={}] - Additional options
   */
  announceStatus(message, options = {}) {
    this.announce(message, { ...options, politeness: 'polite', role: 'status' });
  }

  /**
   * Announce a log entry (appends, doesn't replace)
   * @param {string} message - Log message
   * @param {Partial<AnnouncementOptions>} [options={}] - Additional options
   */
  announceLog(message, options = {}) {
    this.announce(message, { 
      ...options, 
      politeness: 'polite', 
      role: 'log',
      clear: false 
    });
  }

  /**
   * Clear a specific region
   * @param {LiveRegionPoliteness|'status'|'log'} regionKey - Region to clear
   */
  clearRegion(regionKey) {
    const region = this.#regions.get(regionKey);
    if (region) {
      region.textContent = '';
      
      // Clear any pending timeouts
      const clearTimeout = this.#clearTimeouts.get(regionKey);
      if (clearTimeout) {
        clearTimeout(clearTimeout);
        this.#clearTimeouts.delete(regionKey);
      }
    }
  }

  /**
   * Clear all regions
   */
  clearAll() {
    this.#regions.forEach((_, key) => this.clearRegion(key));
  }

  /**
   * Destroy the manager and clean up
   */
  destroy() {
    // Clear all timeouts
    this.#announceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.#clearTimeouts.forEach(timeout => clearTimeout(timeout));
    
    this.#announceTimeouts.clear();
    this.#clearTimeouts.clear();

    // Remove DOM elements
    const container = document.getElementById('harmony-live-regions');
    if (container) {
      container.remove();
    }

    this.#regions.clear();
    this.#initialized = false;
  }
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    LiveRegionManager.getInstance().initialize();
  });
}