/**
 * Cache Helper Utilities
 * 
 * Helper functions for working with HTTP caching in client-side code.
 * 
 * @see DESIGN_SYSTEM.md#http-cache-headers
 * @module utils/cache-helpers
 */

/**
 * Parse Cache-Control header into object
 * 
 * @param {string} cacheControl - Cache-Control header value
 * @returns {Object} Parsed directives
 */
export function parseCacheControl(cacheControl) {
  if (!cacheControl) {
    return {};
  }

  const directives = {};
  const parts = cacheControl.split(',').map(p => p.trim());

  for (const part of parts) {
    const [key, value] = part.split('=').map(s => s.trim());
    
    if (value !== undefined) {
      directives[key] = isNaN(value) ? value : parseInt(value, 10);
    } else {
      directives[key] = true;
    }
  }

  return directives;
}

/**
 * Check if response is cacheable based on headers
 * 
 * @param {Headers|Object} headers - Response headers
 * @returns {boolean} True if cacheable
 */
export function isCacheable(headers) {
  const cacheControl = headers.get 
    ? headers.get('cache-control') 
    : headers['cache-control'];

  if (!cacheControl) {
    return false;
  }

  const directives = parseCacheControl(cacheControl);

  // Not cacheable if no-store or private
  if (directives['no-store'] || directives['no-cache']) {
    return false;
  }

  // Cacheable if public or has max-age
  return directives['public'] || directives['max-age'] !== undefined;
}

/**
 * Get cache expiration time from headers
 * 
 * @param {Headers|Object} headers - Response headers
 * @returns {Date|null} Expiration date or null
 */
export function getCacheExpiration(headers) {
  const cacheControl = headers.get 
    ? headers.get('cache-control') 
    : headers['cache-control'];

  if (!cacheControl) {
    return null;
  }

  const directives = parseCacheControl(cacheControl);
  const maxAge = directives['max-age'];

  if (maxAge !== undefined && typeof maxAge === 'number') {
    const now = new Date();
    return new Date(now.getTime() + maxAge * 1000);
  }

  // Check Expires header as fallback
  const expires = headers.get 
    ? headers.get('expires') 
    : headers['expires'];

  if (expires) {
    return new Date(expires);
  }

  return null;
}

/**
 * Check if cached response is still fresh
 * 
 * @param {Headers|Object} headers - Cached response headers
 * @param {Date} [cachedAt] - When response was cached
 * @returns {boolean} True if still fresh
 */
export function isFresh(headers, cachedAt = new Date()) {
  const expiration = getCacheExpiration(headers);
  
  if (!expiration) {
    return false;
  }

  return new Date() < expiration;
}

/**
 * Create fetch options with cache-related headers
 * 
 * @param {Object} [options] - Base fetch options
 * @param {string} [etag] - ETag from cached response
 * @param {string} [lastModified] - Last-Modified from cached response
 * @returns {Object} Fetch options with conditional headers
 */
export function createConditionalFetchOptions(options = {}, etag = null, lastModified = null) {
  const headers = new Headers(options.headers || {});

  if (etag) {
    headers.set('If-None-Match', etag);
  }

  if (lastModified) {
    headers.set('If-Modified-Since', lastModified);
  }

  return {
    ...options,
    headers,
  };
}

/**
 * Fetch with automatic cache revalidation
 * 
 * Uses cached response if fresh, otherwise revalidates with server.
 * 
 * @param {string} url - URL to fetch
 * @param {Object} [options] - Fetch options
 * @param {Object} [cachedResponse] - Previously cached response
 * @returns {Promise<Response>} Response object
 */
export async function fetchWithRevalidation(url, options = {}, cachedResponse = null) {
  // If we have a cached response, check if it's fresh
  if (cachedResponse && isFresh(cachedResponse.headers, cachedResponse.cachedAt)) {
    return cachedResponse;
  }

  // If we have a cached response but it's stale, try conditional request
  if (cachedResponse) {
    const etag = cachedResponse.headers.get 
      ? cachedResponse.headers.get('etag')
      : cachedResponse.headers['etag'];
    
    const lastModified = cachedResponse.headers.get
      ? cachedResponse.headers.get('last-modified')
      : cachedResponse.headers['last-modified'];

    const conditionalOptions = createConditionalFetchOptions(
      options,
      etag,
      lastModified
    );

    const response = await fetch(url, conditionalOptions);

    // If 304, return cached response
    if (response.status === 304) {
      return cachedResponse;
    }

    return response;
  }

  // No cached response, fetch normally
  return fetch(url, options);
}