/**
 * HTTP Cache Middleware
 * 
 * Middleware for applying cache headers to HTTP responses.
 * Handles Cache-Control, ETag, Last-Modified, and conditional requests.
 * 
 * @see DESIGN_SYSTEM.md#http-cache-headers
 * @module utils/cache-middleware
 */

import {
  getCachePolicyForPath,
  buildCacheControlHeader,
  VARY_HEADERS,
  SECURITY_HEADERS,
} from '../config/cache-headers.config.js';

import {
  generateStrongETag,
  generateFileETag,
  matchesIfNoneMatch,
  matchesIfMatch,
} from './etag-generator.js';

/**
 * Format date for HTTP headers (RFC 7231)
 * 
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatHttpDate(date) {
  return date.toUTCString();
}

/**
 * Parse HTTP date string
 * 
 * @param {string} dateString - HTTP date string
 * @returns {Date|null} Parsed date or null
 */
function parseHttpDate(dateString) {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Apply cache headers to response
 * 
 * @param {Object} options - Options
 * @param {string} options.urlPath - URL path
 * @param {Object} options.headers - Headers object to modify
 * @param {string|ArrayBuffer|Uint8Array} [options.content] - Response content
 * @param {Object} [options.stats] - File stats (mtime, size)
 * @param {string} [options.policyName] - Override policy name
 * @returns {Promise<Object>} Modified headers object
 */
export async function applyCacheHeaders({
  urlPath,
  headers = {},
  content = null,
  stats = null,
  policyName = null,
}) {
  // Get cache policy
  const policy = policyName 
    ? CACHE_POLICIES[policyName] 
    : getCachePolicyForPath(urlPath);

  // Apply Cache-Control
  headers['Cache-Control'] = buildCacheControlHeader(policy);

  // Apply Vary header
  const varyKey = urlPath.startsWith('/api/') ? 'api' : 'default';
  headers['Vary'] = VARY_HEADERS[varyKey];

  // Apply security headers
  Object.assign(headers, SECURITY_HEADERS);

  // Generate ETag if enabled
  if (policy.useETag) {
    let etag;
    
    if (stats && stats.mtime && stats.size) {
      // Use file stats for quick ETag
      etag = generateFileETag(stats);
    } else if (content) {
      // Generate from content
      etag = await generateStrongETag(content);
    }

    if (etag) {
      headers['ETag'] = etag;
    }
  }

  // Apply Last-Modified if enabled
  if (policy.useLastModified && stats && stats.mtime) {
    const mtime = stats.mtime instanceof Date ? stats.mtime : new Date(stats.mtime);
    headers['Last-Modified'] = formatHttpDate(mtime);
  }

  return headers;
}

/**
 * Check conditional request headers
 * 
 * Returns response code if condition fails:
 * - 304 Not Modified (If-None-Match or If-Modified-Since)
 * - 412 Precondition Failed (If-Match or If-Unmodified-Since)
 * - null if conditions pass
 * 
 * @param {Object} requestHeaders - Request headers
 * @param {Object} resourceHeaders - Resource headers (ETag, Last-Modified)
 * @returns {number|null} Response code or null
 */
export function checkConditionalRequest(requestHeaders, resourceHeaders) {
  const ifNoneMatch = requestHeaders['if-none-match'];
  const ifMatch = requestHeaders['if-match'];
  const ifModifiedSince = requestHeaders['if-modified-since'];
  const ifUnmodifiedSince = requestHeaders['if-unmodified-since'];

  const etag = resourceHeaders['ETag'] || resourceHeaders['etag'];
  const lastModified = resourceHeaders['Last-Modified'] || resourceHeaders['last-modified'];

  // Check If-Match (must match for request to proceed)
  if (ifMatch && etag) {
    if (!matchesIfMatch(ifMatch, etag)) {
      return 412; // Precondition Failed
    }
  }

  // Check If-Unmodified-Since (resource must not be modified)
  if (ifUnmodifiedSince && lastModified) {
    const requestDate = parseHttpDate(ifUnmodifiedSince);
    const resourceDate = parseHttpDate(lastModified);
    
    if (requestDate && resourceDate && resourceDate > requestDate) {
      return 412; // Precondition Failed
    }
  }

  // Check If-None-Match (must not match for request to proceed)
  if (ifNoneMatch && etag) {
    if (matchesIfNoneMatch(ifNoneMatch, etag)) {
      return 304; // Not Modified
    }
  }

  // Check If-Modified-Since (resource must be modified)
  if (ifModifiedSince && lastModified && !ifNoneMatch) {
    const requestDate = parseHttpDate(ifModifiedSince);
    const resourceDate = parseHttpDate(lastModified);
    
    if (requestDate && resourceDate && resourceDate <= requestDate) {
      return 304; // Not Modified
    }
  }

  return null; // All conditions pass
}

/**
 * Middleware factory for Node.js/Express-style servers
 * 
 * @param {Object} [options] - Middleware options
 * @param {boolean} [options.enableConditionalRequests=true] - Enable 304 responses
 * @returns {Function} Middleware function
 */
export function createCacheMiddleware(options = {}) {
  const { enableConditionalRequests = true } = options;

  return async function cacheMiddleware(req, res, next) {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalSendFile = res.sendFile;

    // Override send to apply cache headers
    res.send = async function(body) {
      const headers = await applyCacheHeaders({
        urlPath: req.path || req.url,
        headers: {},
        content: body,
      });

      // Apply headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Check conditional requests
      if (enableConditionalRequests) {
        const statusCode = checkConditionalRequest(
          req.headers,
          headers
        );

        if (statusCode === 304) {
          return res.status(304).end();
        } else if (statusCode === 412) {
          return res.status(412).end();
        }
      }

      return originalSend.call(this, body);
    };

    // Override json to apply cache headers
    res.json = async function(obj) {
      const headers = await applyCacheHeaders({
        urlPath: req.path || req.url,
        headers: {},
        content: JSON.stringify(obj),
      });

      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (enableConditionalRequests) {
        const statusCode = checkConditionalRequest(
          req.headers,
          headers
        );

        if (statusCode === 304) {
          return res.status(304).end();
        } else if (statusCode === 412) {
          return res.status(412).end();
        }
      }

      return originalJson.call(this, obj);
    };

    next();
  };
}

/**
 * Create cache headers for static file serving
 * 
 * @param {string} filePath - File path
 * @param {Object} stats - File stats
 * @returns {Promise<Object>} Headers object
 */
export async function createStaticFileHeaders(filePath, stats) {
  return applyCacheHeaders({
    urlPath: filePath,
    headers: {},
    stats,
  });
}