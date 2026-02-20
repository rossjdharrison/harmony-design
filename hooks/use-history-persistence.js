/**
 * @fileoverview React-like Hook for History Persistence
 * @module hooks/use-history-persistence
 * 
 * Provides a convenient hook interface for using history persistence
 * in web components and vanilla JavaScript applications.
 * 
 * @see DESIGN_SYSTEM.md#history-persistence
 */

import { getHistoryPersistence } from '../utils/history-persistence.js';

/**
 * Hook for using history persistence
 * @param {Object} [config] - Configuration options
 * @returns {Object} History persistence interface
 */
export function useHistoryPersistence(config = {}) {
  const persistence = getHistoryPersistence(config);

  return {
    /**
     * Add a history entry
     * @param {string} type - Entry type
     * @param {Object} data - Entry data
     * @returns {Promise<string>} Entry ID
     */
    addEntry: (type, data) => persistence.addEntry(type, data),

    /**
     * Get entries by type
     * @param {string} type - Entry type
     * @param {number} [limit] - Maximum number of entries
     * @returns {Promise<Array>} History entries
     */
    getEntriesByType: (type, limit) => persistence.getEntriesByType(type, limit),

    /**
     * Get entries for current session
     * @param {number} [limit] - Maximum number of entries
     * @returns {Promise<Array>} History entries
     */
    getSessionEntries: (limit) => persistence.getSessionEntries(limit),

    /**
     * Get entries in time range
     * @param {number} startTime - Start timestamp
     * @param {number} endTime - End timestamp
     * @returns {Promise<Array>} History entries
     */
    getEntriesInRange: (startTime, endTime) => 
      persistence.getEntriesInRange(startTime, endTime),

    /**
     * Get recent entries
     * @param {number} [limit] - Maximum number of entries
     * @returns {Promise<Array>} History entries
     */
    getRecentEntries: (limit) => persistence.getRecentEntries(limit),

    /**
     * Clear all history
     * @returns {Promise<void>}
     */
    clearAll: () => persistence.clearAll(),

    /**
     * Export history to JSON
     * @returns {Promise<string>} JSON string
     */
    exportToJSON: () => persistence.exportToJSON(),

    /**
     * Import history from JSON
     * @param {string} json - JSON string
     * @returns {Promise<number>} Number of entries imported
     */
    importFromJSON: (json) => persistence.importFromJSON(json),

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Statistics
     */
    getStats: () => persistence.getStats(),

    /**
     * Get current session ID
     */
    sessionId: persistence.sessionId,
  };
}