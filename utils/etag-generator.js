/**
 * ETag Generation Utilities
 * 
 * Generates ETags for HTTP responses to enable conditional requests.
 * Supports both strong and weak ETags.
 * 
 * @see DESIGN_SYSTEM.md#http-cache-headers
 * @module utils/etag-generator
 */

/**
 * Generate a hash from string content
 * 
 * @param {string} content - Content to hash
 * @returns {Promise<string>} Hash as hex string
 */
async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate strong ETag from content
 * 
 * Strong ETags indicate byte-for-byte equality.
 * Format: "hash"
 * 
 * @param {string|ArrayBuffer|Uint8Array} content - Content to generate ETag for
 * @returns {Promise<string>} Strong ETag
 */
export async function generateStrongETag(content) {
  let contentString;

  if (typeof content === 'string') {
    contentString = content;
  } else if (content instanceof ArrayBuffer) {
    const decoder = new TextDecoder();
    contentString = decoder.decode(content);
  } else if (content instanceof Uint8Array) {
    const decoder = new TextDecoder();
    contentString = decoder.decode(content);
  } else {
    contentString = JSON.stringify(content);
  }

  const hash = await hashContent(contentString);
  return `"${hash.substring(0, 16)}"`;
}

/**
 * Generate weak ETag from content
 * 
 * Weak ETags indicate semantic equality (not byte-for-byte).
 * Format: W/"hash"
 * 
 * @param {string|Object} content - Content to generate ETag for
 * @returns {Promise<string>} Weak ETag
 */
export async function generateWeakETag(content) {
  const strongETag = await generateStrongETag(content);
  return `W/${strongETag}`;
}

/**
 * Generate ETag from file stats
 * 
 * Uses file modification time and size for quick ETag generation.
 * Suitable for static files.
 * 
 * @param {Object} stats - File stats object
 * @param {Date} stats.mtime - Modification time
 * @param {number} stats.size - File size in bytes
 * @returns {string} Strong ETag
 */
export function generateFileETag(stats) {
  const mtime = stats.mtime instanceof Date ? stats.mtime.getTime() : stats.mtime;
  const size = stats.size;
  const hash = `${mtime.toString(36)}-${size.toString(36)}`;
  return `"${hash}"`;
}

/**
 * Parse ETag from header value
 * 
 * @param {string} etagHeader - ETag header value
 * @returns {Object} Parsed ETag { weak: boolean, value: string }
 */
export function parseETag(etagHeader) {
  if (!etagHeader) {
    return null;
  }

  const weak = etagHeader.startsWith('W/');
  const value = weak ? etagHeader.slice(2) : etagHeader;

  return {
    weak,
    value: value.replace(/^"|"$/g, ''),
  };
}

/**
 * Compare ETags for equality
 * 
 * @param {string} etag1 - First ETag
 * @param {string} etag2 - Second ETag
 * @param {boolean} [weakComparison=false] - Allow weak comparison
 * @returns {boolean} True if ETags match
 */
export function compareETags(etag1, etag2, weakComparison = false) {
  if (!etag1 || !etag2) {
    return false;
  }

  const parsed1 = parseETag(etag1);
  const parsed2 = parseETag(etag2);

  // Strong comparison: both must be strong and equal
  if (!weakComparison) {
    if (parsed1.weak || parsed2.weak) {
      return false;
    }
    return parsed1.value === parsed2.value;
  }

  // Weak comparison: values must be equal
  return parsed1.value === parsed2.value;
}

/**
 * Check if request matches ETag (If-None-Match)
 * 
 * @param {string} ifNoneMatch - If-None-Match header value
 * @param {string} etag - Current ETag
 * @returns {boolean} True if ETags match (304 should be returned)
 */
export function matchesIfNoneMatch(ifNoneMatch, etag) {
  if (!ifNoneMatch || !etag) {
    return false;
  }

  // Handle wildcard
  if (ifNoneMatch === '*') {
    return true;
  }

  // Handle multiple ETags
  const requestETags = ifNoneMatch.split(',').map(e => e.trim());
  
  for (const requestETag of requestETags) {
    if (compareETags(requestETag, etag, true)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if request matches ETag (If-Match)
 * 
 * @param {string} ifMatch - If-Match header value
 * @param {string} etag - Current ETag
 * @returns {boolean} True if ETags match (request should proceed)
 */
export function matchesIfMatch(ifMatch, etag) {
  if (!ifMatch) {
    return true; // No precondition
  }

  if (!etag) {
    return false;
  }

  // Handle wildcard
  if (ifMatch === '*') {
    return true;
  }

  // Handle multiple ETags
  const requestETags = ifMatch.split(',').map(e => e.trim());
  
  for (const requestETag of requestETags) {
    if (compareETags(requestETag, etag, false)) {
      return true;
    }
  }

  return false;
}