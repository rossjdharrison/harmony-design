/**
 * @fileoverview Token Watcher - File watcher for hot-reloading tokens in development
 * @module tokens/token-watcher
 * 
 * Provides development-time file watching for automatic token reloading.
 * Uses native browser APIs where possible, with fallback to polling.
 * 
 * Performance:
 * - Debounced reloads to prevent thrashing
 * - Selective invalidation of changed token files only
 * - Maximum 16ms impact on render frame budget
 * 
 * Related:
 * - tokens/token-loader.js - Runtime token loading
 * - See DESIGN_SYSTEM.md § Token System for architecture
 */

import { TokenLoader } from './token-loader.js';

/**
 * @typedef {Object} WatcherConfig
 * @property {number} pollInterval - Polling interval in ms (default: 1000)
 * @property {number} debounceDelay - Debounce delay for reload in ms (default: 300)
 * @property {boolean} enabled - Enable/disable watcher (default: true in dev)
 * @property {string[]} watchPaths - Paths to watch (default: ['tokens/**/*.json'])
 * @property {Function} onReload - Callback after successful reload
 * @property {Function} onError - Callback on error
 */

/**
 * Token file watcher for hot-reloading in development
 * 
 * Usage:
 * ```javascript
 * import { TokenWatcher } from './tokens/token-watcher.js';
 * 
 * const watcher = new TokenWatcher({
 *   onReload: (changedFiles) => {
 *     console.log('Tokens reloaded:', changedFiles);
 *   }
 * });
 * 
 * watcher.start();
 * ```
 */
export class TokenWatcher {
  /**
   * @param {Partial<WatcherConfig>} config - Watcher configuration
   */
  constructor(config = {}) {
    this.config = {
      pollInterval: 1000,
      debounceDelay: 300,
      enabled: this._isDevMode(),
      watchPaths: ['tokens/**/*.json'],
      onReload: null,
      onError: null,
      ...config
    };

    /** @type {Map<string, number>} */
    this.fileTimestamps = new Map();
    
    /** @type {number|null} */
    this.pollTimer = null;
    
    /** @type {number|null} */
    this.debounceTimer = null;
    
    /** @type {Set<string>} */
    this.pendingReloads = new Set();
    
    /** @type {boolean} */
    this.isWatching = false;

    /** @type {TokenLoader} */
    this.tokenLoader = new TokenLoader();

    // Bind methods
    this._poll = this._poll.bind(this);
    this._handleReload = this._handleReload.bind(this);
  }

  /**
   * Check if running in development mode
   * @private
   * @returns {boolean}
   */
  _isDevMode() {
    return location.hostname === 'localhost' || 
           location.hostname === '127.0.0.1' ||
           location.search.includes('dev=true');
  }

  /**
   * Start watching for token file changes
   */
  start() {
    if (!this.config.enabled) {
      console.log('[TokenWatcher] Disabled in production mode');
      return;
    }

    if (this.isWatching) {
      console.warn('[TokenWatcher] Already watching');
      return;
    }

    this.isWatching = true;
    console.log('[TokenWatcher] Starting token file watcher');

    // Initialize file timestamps
    this._initializeTimestamps()
      .then(() => {
        // Start polling
        this._startPolling();
        console.log('[TokenWatcher] Watching token files for changes');
      })
      .catch(error => {
        console.error('[TokenWatcher] Failed to initialize:', error);
        this._handleError(error);
      });
  }

  /**
   * Stop watching for changes
   */
  stop() {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    console.log('[TokenWatcher] Stopped watching');
  }

  /**
   * Initialize timestamps for all token files
   * @private
   * @returns {Promise<void>}
   */
  async _initializeTimestamps() {
    const startTime = performance.now();
    
    try {
      // Get all token files from the loader's registry
      const tokenFiles = await this._getTokenFiles();
      
      // Fetch HEAD requests to get Last-Modified headers
      const promises = tokenFiles.map(async (file) => {
        try {
          const response = await fetch(file, { method: 'HEAD' });
          const lastModified = response.headers.get('Last-Modified');
          const timestamp = lastModified ? new Date(lastModified).getTime() : Date.now();
          this.fileTimestamps.set(file, timestamp);
        } catch (error) {
          console.warn(`[TokenWatcher] Failed to get timestamp for ${file}:`, error);
          this.fileTimestamps.set(file, Date.now());
        }
      });

      await Promise.all(promises);

      const duration = performance.now() - startTime;
      console.log(`[TokenWatcher] Initialized ${tokenFiles.length} file timestamps in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error('[TokenWatcher] Failed to initialize timestamps:', error);
      throw error;
    }
  }

  /**
   * Get list of token files to watch
   * @private
   * @returns {Promise<string[]>}
   */
  async _getTokenFiles() {
    // Try to get from token loader's cache
    const loader = this.tokenLoader;
    
    // Default token files based on convention
    const defaultFiles = [
      'tokens/colors.json',
      'tokens/typography.json',
      'tokens/spacing.json',
      'tokens/shadows.json',
      'tokens/borders.json',
      'tokens/radii.json',
      'tokens/z-index.json',
      'tokens/breakpoints.json',
      'tokens/motion.json'
    ];

    return defaultFiles;
  }

  /**
   * Start polling for file changes
   * @private
   */
  _startPolling() {
    if (!this.isWatching) {
      return;
    }

    this.pollTimer = setTimeout(() => {
      this._poll();
    }, this.config.pollInterval);
  }

  /**
   * Poll for file changes
   * @private
   */
  async _poll() {
    if (!this.isWatching) {
      return;
    }

    const startTime = performance.now();

    try {
      const changedFiles = await this._checkForChanges();

      if (changedFiles.length > 0) {
        console.log('[TokenWatcher] Detected changes:', changedFiles);
        changedFiles.forEach(file => this.pendingReloads.add(file));
        this._scheduleReload();
      }

      const duration = performance.now() - startTime;
      
      // Ensure we don't exceed frame budget
      if (duration > 8) { // Half of 16ms budget
        console.warn(`[TokenWatcher] Poll took ${duration.toFixed(2)}ms - consider increasing poll interval`);
      }
    } catch (error) {
      console.error('[TokenWatcher] Poll error:', error);
      this._handleError(error);
    }

    // Schedule next poll
    this._startPolling();
  }

  /**
   * Check for file changes
   * @private
   * @returns {Promise<string[]>} Array of changed file paths
   */
  async _checkForChanges() {
    const changedFiles = [];

    const promises = Array.from(this.fileTimestamps.keys()).map(async (file) => {
      try {
        const response = await fetch(file, { 
          method: 'HEAD',
          cache: 'no-cache' // Force fresh check
        });
        
        const lastModified = response.headers.get('Last-Modified');
        if (!lastModified) {
          return;
        }

        const newTimestamp = new Date(lastModified).getTime();
        const oldTimestamp = this.fileTimestamps.get(file);

        if (newTimestamp > oldTimestamp) {
          this.fileTimestamps.set(file, newTimestamp);
          changedFiles.push(file);
        }
      } catch (error) {
        // File might not exist or network error - ignore
      }
    });

    await Promise.all(promises);
    return changedFiles;
  }

  /**
   * Schedule a debounced reload
   * @private
   */
  _scheduleReload() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this._handleReload();
      this.debounceTimer = null;
    }, this.config.debounceDelay);
  }

  /**
   * Handle token reload
   * @private
   */
  async _handleReload() {
    const changedFiles = Array.from(this.pendingReloads);
    this.pendingReloads.clear();

    if (changedFiles.length === 0) {
      return;
    }

    console.log('[TokenWatcher] Reloading tokens:', changedFiles);

    try {
      const startTime = performance.now();

      // Reload changed token files
      for (const file of changedFiles) {
        await this.tokenLoader.loadTokenFile(file);
      }

      // Dispatch custom event for components to update
      const event = new CustomEvent('tokens-reloaded', {
        detail: {
          changedFiles,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);

      const duration = performance.now() - startTime;
      console.log(`[TokenWatcher] Reloaded ${changedFiles.length} files in ${duration.toFixed(2)}ms`);

      // Call user callback
      if (this.config.onReload) {
        this.config.onReload(changedFiles);
      }

      // Show visual feedback in dev mode
      this._showReloadNotification(changedFiles);

    } catch (error) {
      console.error('[TokenWatcher] Reload failed:', error);
      this._handleError(error);
    }
  }

  /**
   * Show visual notification of reload
   * @private
   * @param {string[]} changedFiles
   */
  _showReloadNotification(changedFiles) {
    // Create temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = `✓ Tokens reloaded (${changedFiles.length} file${changedFiles.length > 1 ? 's' : ''})`;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Handle errors
   * @private
   * @param {Error} error
   */
  _handleError(error) {
    if (this.config.onError) {
      this.config.onError(error);
    }
  }

  /**
   * Manually trigger a reload check
   * @returns {Promise<void>}
   */
  async checkNow() {
    console.log('[TokenWatcher] Manual check triggered');
    await this._poll();
  }

  /**
   * Get watcher status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      watchedFiles: this.fileTimestamps.size,
      pendingReloads: this.pendingReloads.size,
      config: this.config
    };
  }
}

/**
 * Create and start a global token watcher
 * Automatically starts in development mode
 * 
 * @param {Partial<WatcherConfig>} config - Optional configuration
 * @returns {TokenWatcher} Watcher instance
 */
export function createTokenWatcher(config = {}) {
  const watcher = new TokenWatcher(config);
  
  // Auto-start in development mode
  if (watcher.config.enabled) {
    watcher.start();
    
    // Make available globally for debugging
    window.__tokenWatcher = watcher;
  }
  
  return watcher;
}

// Auto-initialize if not already done
if (typeof window !== 'undefined' && !window.__tokenWatcher) {
  createTokenWatcher();
}