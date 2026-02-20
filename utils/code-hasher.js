/**
 * @fileoverview CodeHasher: Content-addressable hashing for code deduplication
 * 
 * Provides deterministic hashing of code artifacts to enable:
 * - Deduplication of identical code bundles
 * - Content-addressable storage and retrieval
 * - Cache invalidation based on content changes
 * - Dependency graph optimization
 * 
 * See DESIGN_SYSTEM.md § Code Hashing and Deduplication
 * 
 * @module utils/code-hasher
 */

/**
 * Hash algorithm configuration
 * Using SHA-256 for cryptographic strength and collision resistance
 */
const HASH_ALGORITHM = 'SHA-256';

/**
 * Hash output format - hex string for readability and storage
 */
const HASH_FORMAT = 'hex';

/**
 * Cache for computed hashes to avoid redundant computation
 * @type {Map<string, string>}
 */
const hashCache = new Map();

/**
 * CodeHasher class for content-addressable hashing
 * 
 * Provides deterministic hashing of code artifacts with:
 * - Consistent normalization of input
 * - Efficient caching of results
 * - Support for various input types (string, ArrayBuffer, object)
 * 
 * @class
 */
export class CodeHasher {
  /**
   * Hash a code string with deterministic normalization
   * 
   * @param {string} code - Code content to hash
   * @param {Object} options - Hashing options
   * @param {boolean} options.normalize - Whether to normalize whitespace (default: true)
   * @param {boolean} options.cache - Whether to use cache (default: true)
   * @returns {Promise<string>} Hex-encoded hash
   */
  static async hashCode(code, options = {}) {
    const { normalize = true, cache = true } = options;
    
    if (typeof code !== 'string') {
      throw new TypeError('Code must be a string');
    }

    // Normalize code for consistent hashing
    const normalizedCode = normalize ? this.normalizeCode(code) : code;
    
    // Check cache
    if (cache && hashCache.has(normalizedCode)) {
      return hashCache.get(normalizedCode);
    }

    // Compute hash
    const hash = await this.computeHash(normalizedCode);
    
    // Store in cache
    if (cache) {
      hashCache.set(normalizedCode, hash);
    }

    return hash;
  }

  /**
   * Hash a code bundle with metadata
   * 
   * Includes bundle metadata in hash computation for uniqueness:
   * - Entry point
   * - Dependencies
   * - Configuration
   * 
   * @param {Object} bundle - Code bundle object
   * @param {string} bundle.code - Bundle code content
   * @param {Object} bundle.metadata - Bundle metadata
   * @returns {Promise<string>} Hex-encoded hash
   */
  static async hashBundle(bundle) {
    if (!bundle || typeof bundle !== 'object') {
      throw new TypeError('Bundle must be an object');
    }

    if (!bundle.code) {
      throw new Error('Bundle must have code property');
    }

    // Create deterministic representation
    const bundleString = this.serializeBundle(bundle);
    
    return this.computeHash(bundleString);
  }

  /**
   * Hash multiple code artifacts and return content-addressable map
   * 
   * @param {Array<{id: string, code: string}>} artifacts - Code artifacts to hash
   * @returns {Promise<Map<string, string>>} Map of artifact ID to hash
   */
  static async hashArtifacts(artifacts) {
    if (!Array.isArray(artifacts)) {
      throw new TypeError('Artifacts must be an array');
    }

    const hashMap = new Map();
    
    // Hash all artifacts in parallel
    const hashPromises = artifacts.map(async (artifact) => {
      if (!artifact.id || !artifact.code) {
        throw new Error('Artifact must have id and code properties');
      }
      
      const hash = await this.hashCode(artifact.code);
      return { id: artifact.id, hash };
    });

    const results = await Promise.all(hashPromises);
    
    // Build map
    results.forEach(({ id, hash }) => {
      hashMap.set(id, hash);
    });

    return hashMap;
  }

  /**
   * Find duplicate code artifacts by hash
   * 
   * @param {Array<{id: string, code: string}>} artifacts - Code artifacts to analyze
   * @returns {Promise<Map<string, Array<string>>>} Map of hash to artifact IDs
   */
  static async findDuplicates(artifacts) {
    const hashToIds = new Map();
    
    const hashMap = await this.hashArtifacts(artifacts);
    
    // Group by hash
    hashMap.forEach((hash, id) => {
      if (!hashToIds.has(hash)) {
        hashToIds.set(hash, []);
      }
      hashToIds.get(hash).push(id);
    });

    // Filter to only duplicates
    const duplicates = new Map();
    hashToIds.forEach((ids, hash) => {
      if (ids.length > 1) {
        duplicates.set(hash, ids);
      }
    });

    return duplicates;
  }

  /**
   * Normalize code for consistent hashing
   * 
   * Normalization steps:
   * - Trim leading/trailing whitespace
   * - Normalize line endings to \n
   * - Collapse multiple blank lines
   * - Remove trailing whitespace from lines
   * 
   * @param {string} code - Code to normalize
   * @returns {string} Normalized code
   * @private
   */
  static normalizeCode(code) {
    return code
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Serialize bundle to deterministic string representation
   * 
   * @param {Object} bundle - Bundle to serialize
   * @returns {string} Serialized bundle
   * @private
   */
  static serializeBundle(bundle) {
    // Create deterministic object with sorted keys
    const normalized = {
      code: this.normalizeCode(bundle.code),
      metadata: bundle.metadata ? this.sortObject(bundle.metadata) : {}
    };

    return JSON.stringify(normalized);
  }

  /**
   * Sort object keys recursively for deterministic serialization
   * 
   * @param {Object} obj - Object to sort
   * @returns {Object} Object with sorted keys
   * @private
   */
  static sortObject(obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }

    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObject(obj[key]);
    });

    return sorted;
  }

  /**
   * Compute SHA-256 hash of string
   * 
   * @param {string} content - Content to hash
   * @returns {Promise<string>} Hex-encoded hash
   * @private
   */
  static async computeHash(content) {
    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // Compute hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, data);

    // Convert to hex string
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Convert ArrayBuffer to hex string
   * 
   * @param {ArrayBuffer} buffer - Buffer to convert
   * @returns {string} Hex string
   * @private
   */
  static bufferToHex(buffer) {
    const byteArray = new Uint8Array(buffer);
    const hexParts = [];
    
    for (let i = 0; i < byteArray.length; i++) {
      const hex = byteArray[i].toString(16).padStart(2, '0');
      hexParts.push(hex);
    }

    return hexParts.join('');
  }

  /**
   * Clear the hash cache
   * Useful for testing or memory management
   */
  static clearCache() {
    hashCache.clear();
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache stats
   */
  static getCacheStats() {
    return {
      size: hashCache.size,
      entries: Array.from(hashCache.keys()).length
    };
  }
}

/**
 * Content-addressable storage for code artifacts
 * 
 * Stores code by hash for deduplication and efficient retrieval
 * 
 * @class
 */
export class ContentAddressableStorage {
  constructor() {
    /**
     * Storage map: hash -> code content
     * @type {Map<string, string>}
     */
    this.storage = new Map();

    /**
     * Reference count: hash -> count
     * @type {Map<string, number>}
     */
    this.refCounts = new Map();

    /**
     * Metadata map: hash -> metadata
     * @type {Map<string, Object>}
     */
    this.metadata = new Map();
  }

  /**
   * Store code and return its hash
   * 
   * @param {string} code - Code to store
   * @param {Object} meta - Optional metadata
   * @returns {Promise<string>} Content hash
   */
  async store(code, meta = {}) {
    const hash = await CodeHasher.hashCode(code);

    // Store code if not already present
    if (!this.storage.has(hash)) {
      this.storage.set(hash, code);
      this.refCounts.set(hash, 0);
      this.metadata.set(hash, {
        ...meta,
        storedAt: Date.now(),
        size: code.length
      });
    }

    // Increment reference count
    this.refCounts.set(hash, this.refCounts.get(hash) + 1);

    return hash;
  }

  /**
   * Retrieve code by hash
   * 
   * @param {string} hash - Content hash
   * @returns {string|null} Code content or null if not found
   */
  retrieve(hash) {
    return this.storage.get(hash) || null;
  }

  /**
   * Check if hash exists in storage
   * 
   * @param {string} hash - Content hash
   * @returns {boolean} True if exists
   */
  has(hash) {
    return this.storage.has(hash);
  }

  /**
   * Release reference to code
   * Removes from storage if reference count reaches zero
   * 
   * @param {string} hash - Content hash
   * @returns {boolean} True if removed from storage
   */
  release(hash) {
    if (!this.refCounts.has(hash)) {
      return false;
    }

    const newCount = this.refCounts.get(hash) - 1;

    if (newCount <= 0) {
      // Remove from storage
      this.storage.delete(hash);
      this.refCounts.delete(hash);
      this.metadata.delete(hash);
      return true;
    }

    this.refCounts.set(hash, newCount);
    return false;
  }

  /**
   * Get storage statistics
   * 
   * @returns {Object} Storage stats
   */
  getStats() {
    let totalSize = 0;
    this.storage.forEach(code => {
      totalSize += code.length;
    });

    return {
      entries: this.storage.size,
      totalSize,
      totalReferences: Array.from(this.refCounts.values()).reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Get metadata for hash
   * 
   * @param {string} hash - Content hash
   * @returns {Object|null} Metadata or null
   */
  getMetadata(hash) {
    return this.metadata.get(hash) || null;
  }

  /**
   * Clear all storage
   */
  clear() {
    this.storage.clear();
    this.refCounts.clear();
    this.metadata.clear();
  }
}