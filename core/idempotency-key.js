/**
 * @fileoverview IdempotencyKey: Generate stable key from event type + source + content hash
 * @module core/idempotency-key
 * 
 * Generates deterministic keys for event deduplication. Two events with the same
 * type, source, and payload content will produce identical idempotency keys.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#idempotency-key
 */

/**
 * Generates a stable hash from a string using a simple but effective algorithm
 * @param {string} str - String to hash
 * @returns {string} Hexadecimal hash string
 * @private
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generates a content hash from an object by creating a stable JSON representation
 * @param {any} content - Content to hash (will be JSON serialized)
 * @returns {string} Hexadecimal hash of the content
 * @private
 */
function hashContent(content) {
  if (content === null || content === undefined) {
    return '00000000';
  }
  
  try {
    // Create stable JSON by sorting keys
    const stableJson = JSON.stringify(content, Object.keys(content).sort());
    return simpleHash(stableJson);
  } catch (error) {
    console.warn('[IdempotencyKey] Failed to hash content:', error);
    return simpleHash(String(content));
  }
}

/**
 * Generates a stable idempotency key from event properties
 * 
 * The key format is: {eventType}:{source}:{contentHash}
 * This ensures that identical events produce identical keys for deduplication.
 * 
 * @param {string} eventType - Type of the event (e.g., 'Play', 'Stop')
 * @param {string} source - Source identifier (node ID, component name, etc.)
 * @param {any} [payload=null] - Event payload to hash
 * @returns {string} Stable idempotency key
 * 
 * @example
 * const key1 = generateIdempotencyKey('Play', 'node-123', { trackId: 'abc' });
 * const key2 = generateIdempotencyKey('Play', 'node-123', { trackId: 'abc' });
 * console.assert(key1 === key2); // Same event produces same key
 * 
 * @example
 * const key3 = generateIdempotencyKey('Play', 'node-123', { trackId: 'xyz' });
 * console.assert(key1 !== key3); // Different payload produces different key
 */
export function generateIdempotencyKey(eventType, source, payload = null) {
  if (!eventType || typeof eventType !== 'string') {
    throw new Error('[IdempotencyKey] eventType must be a non-empty string');
  }
  
  if (!source || typeof source !== 'string') {
    throw new Error('[IdempotencyKey] source must be a non-empty string');
  }
  
  const contentHash = hashContent(payload);
  return `${eventType}:${source}:${contentHash}`;
}

/**
 * Parses an idempotency key back into its components
 * 
 * @param {string} key - Idempotency key to parse
 * @returns {{eventType: string, source: string, contentHash: string} | null} Parsed components or null if invalid
 * 
 * @example
 * const key = generateIdempotencyKey('Play', 'node-123', { trackId: 'abc' });
 * const parsed = parseIdempotencyKey(key);
 * console.log(parsed.eventType); // 'Play'
 * console.log(parsed.source); // 'node-123'
 */
export function parseIdempotencyKey(key) {
  if (!key || typeof key !== 'string') {
    return null;
  }
  
  const parts = key.split(':');
  if (parts.length !== 3) {
    return null;
  }
  
  return {
    eventType: parts[0],
    source: parts[1],
    contentHash: parts[2]
  };
}

/**
 * Validates that a string is a properly formatted idempotency key
 * 
 * @param {string} key - Key to validate
 * @returns {boolean} True if key is valid format
 * 
 * @example
 * const key = generateIdempotencyKey('Play', 'node-123', null);
 * console.assert(isValidIdempotencyKey(key) === true);
 * console.assert(isValidIdempotencyKey('invalid') === false);
 */
export function isValidIdempotencyKey(key) {
  const parsed = parseIdempotencyKey(key);
  return parsed !== null && 
         parsed.eventType.length > 0 && 
         parsed.source.length > 0 &&
         /^[0-9a-f]{8}$/.test(parsed.contentHash);
}

/**
 * IdempotencyKeyCache: In-memory cache for tracking seen keys
 * Used for deduplication within a time window
 */
export class IdempotencyKeyCache {
  /**
   * @param {number} [ttlMs=5000] - Time-to-live for cached keys in milliseconds
   */
  constructor(ttlMs = 5000) {
    /** @type {Map<string, number>} */
    this.cache = new Map();
    this.ttlMs = ttlMs;
    this.cleanupInterval = null;
    
    // Start periodic cleanup
    this.startCleanup();
  }
  
  /**
   * Checks if a key has been seen recently
   * @param {string} key - Idempotency key to check
   * @returns {boolean} True if key was seen within TTL window
   */
  has(key) {
    const timestamp = this.cache.get(key);
    if (!timestamp) {
      return false;
    }
    
    const age = Date.now() - timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Marks a key as seen
   * @param {string} key - Idempotency key to mark
   */
  add(key) {
    this.cache.set(key, Date.now());
  }
  
  /**
   * Removes expired keys from cache
   * @private
   */
  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Starts periodic cleanup of expired keys
   * @private
   */
  startCleanup() {
    // Cleanup every TTL period
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.ttlMs);
  }
  
  /**
   * Stops periodic cleanup and clears cache
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
  
  /**
   * Gets current cache size
   * @returns {number} Number of cached keys
   */
  get size() {
    return this.cache.size;
  }
  
  /**
   * Clears all cached keys
   */
  clear() {
    this.cache.clear();
  }
}