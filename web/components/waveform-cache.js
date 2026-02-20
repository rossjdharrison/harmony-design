/**
 * @fileoverview Multi-resolution waveform cache system
 * Stores waveform data at multiple zoom levels for efficient rendering
 * @module web/components/waveform-cache
 */

/**
 * Cache entry for a specific resolution level
 * @typedef {Object} CacheEntry
 * @property {Float32Array} peaks - Peak values [min, max, min, max, ...]
 * @property {number} samplesPerPeak - Samples represented by each peak
 * @property {number} sampleRate - Original sample rate
 * @property {number} timestamp - Cache creation timestamp
 */

/**
 * Multi-resolution waveform cache
 * Stores pre-computed peak data at multiple zoom levels
 * 
 * @class WaveformCache
 * @see DESIGN_SYSTEM.md#waveform-visualization
 */
export class WaveformCache {
  constructor() {
    /** @type {Map<string, Map<number, CacheEntry>>} */
    this.cache = new Map();
    
    /** @type {number[]} Resolution levels (samples per peak) */
    this.resolutions = [128, 256, 512, 1024, 2048, 4096, 8192];
    
    /** @type {number} Maximum cache entries per audio clip */
    this.maxEntriesPerClip = 10;
    
    /** @type {number} Cache entry TTL in milliseconds */
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cache key for audio clip
   * @param {string} clipId - Audio clip identifier
   * @param {number} version - Clip version number
   * @returns {string} Cache key
   * @private
   */
  getCacheKey(clipId, version) {
    return `${clipId}:${version}`;
  }

  /**
   * Store waveform data at a specific resolution
   * @param {string} clipId - Audio clip identifier
   * @param {number} version - Clip version number
   * @param {number} samplesPerPeak - Resolution level
   * @param {Float32Array} peaks - Peak data
   * @param {number} sampleRate - Sample rate
   */
  set(clipId, version, samplesPerPeak, peaks, sampleRate) {
    const key = this.getCacheKey(clipId, version);
    
    if (!this.cache.has(key)) {
      this.cache.set(key, new Map());
    }
    
    const clipCache = this.cache.get(key);
    
    // Enforce max entries limit
    if (clipCache.size >= this.maxEntriesPerClip) {
      // Remove oldest entry
      const oldestKey = Array.from(clipCache.keys())[0];
      clipCache.delete(oldestKey);
    }
    
    clipCache.set(samplesPerPeak, {
      peaks,
      samplesPerPeak,
      sampleRate,
      timestamp: Date.now()
    });
  }

  /**
   * Get waveform data at a specific resolution
   * @param {string} clipId - Audio clip identifier
   * @param {number} version - Clip version number
   * @param {number} samplesPerPeak - Resolution level
   * @returns {CacheEntry | null} Cached entry or null
   */
  get(clipId, version, samplesPerPeak) {
    const key = this.getCacheKey(clipId, version);
    const clipCache = this.cache.get(key);
    
    if (!clipCache) {
      return null;
    }
    
    const entry = clipCache.get(samplesPerPeak);
    
    if (!entry) {
      return null;
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      clipCache.delete(samplesPerPeak);
      return null;
    }
    
    return entry;
  }

  /**
   * Find best matching resolution for requested samples per pixel
   * @param {string} clipId - Audio clip identifier
   * @param {number} version - Clip version number
   * @param {number} targetSamplesPerPeak - Desired resolution
   * @returns {CacheEntry | null} Best matching cached entry
   */
  getBestMatch(clipId, version, targetSamplesPerPeak) {
    const key = this.getCacheKey(clipId, version);
    const clipCache = this.cache.get(key);
    
    if (!clipCache) {
      return null;
    }
    
    // Find closest resolution that's >= target
    let bestMatch = null;
    let minDiff = Infinity;
    
    for (const [resolution, entry] of clipCache.entries()) {
      if (resolution >= targetSamplesPerPeak) {
        const diff = resolution - targetSamplesPerPeak;
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = entry;
        }
      }
    }
    
    // If no match >= target, use highest resolution available
    if (!bestMatch && clipCache.size > 0) {
      const resolutions = Array.from(clipCache.keys()).sort((a, b) => a - b);
      bestMatch = clipCache.get(resolutions[0]);
    }
    
    return bestMatch;
  }

  /**
   * Get all cached resolutions for a clip
   * @param {string} clipId - Audio clip identifier
   * @param {number} version - Clip version number
   * @returns {number[]} Array of cached resolution levels
   */
  getAvailableResolutions(clipId, version) {
    const key = this.getCacheKey(clipId, version);
    const clipCache = this.cache.get(key);
    
    if (!clipCache) {
      return [];
    }
    
    return Array.from(clipCache.keys()).sort((a, b) => a - b);
  }

  /**
   * Clear cache for a specific clip
   * @param {string} clipId - Audio clip identifier
   * @param {number} version - Clip version number
   */
  clear(clipId, version) {
    const key = this.getCacheKey(clipId, version);
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Remove expired cache entries
   */
  prune() {
    const now = Date.now();
    
    for (const [clipKey, clipCache] of this.cache.entries()) {
      for (const [resolution, entry] of clipCache.entries()) {
        if (now - entry.timestamp > this.ttl) {
          clipCache.delete(resolution);
        }
      }
      
      // Remove empty clip caches
      if (clipCache.size === 0) {
        this.cache.delete(clipKey);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    let totalEntries = 0;
    let totalBytes = 0;
    
    for (const clipCache of this.cache.values()) {
      totalEntries += clipCache.size;
      
      for (const entry of clipCache.values()) {
        totalBytes += entry.peaks.byteLength;
      }
    }
    
    return {
      clips: this.cache.size,
      entries: totalEntries,
      bytes: totalBytes,
      megabytes: (totalBytes / (1024 * 1024)).toFixed(2)
    };
  }
}