/**
 * HTTP Cache Headers Configuration
 * 
 * Defines cache policies for static assets and API responses.
 * Implements Cache-Control, ETag, and Last-Modified strategies.
 * 
 * @see DESIGN_SYSTEM.md#http-cache-headers
 * @module config/cache-headers
 */

/**
 * Cache policy definitions for different resource types
 * 
 * @typedef {Object} CachePolicy
 * @property {string} cacheControl - Cache-Control header value
 * @property {boolean} useETag - Whether to generate ETags
 * @property {boolean} useLastModified - Whether to use Last-Modified
 * @property {number} maxAge - Max age in seconds
 * @property {boolean} immutable - Whether resource is immutable
 */

/**
 * Cache policies by resource type
 * @type {Object.<string, CachePolicy>}
 */
export const CACHE_POLICIES = {
  // Static assets with content hash (immutable)
  immutableAssets: {
    cacheControl: 'public, max-age=31536000, immutable',
    useETag: true,
    useLastModified: false,
    maxAge: 31536000, // 1 year
    immutable: true,
    patterns: [
      /\.[a-f0-9]{8,}\.(js|css|wasm)$/i, // Hash in filename
      /\.wasm$/i, // WASM modules
      /\.(woff2|woff|ttf|eot)$/i, // Fonts
    ],
  },

  // Images and media
  images: {
    cacheControl: 'public, max-age=86400, stale-while-revalidate=604800',
    useETag: true,
    useLastModified: true,
    maxAge: 86400, // 1 day
    immutable: false,
    patterns: [
      /\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/i,
    ],
  },

  // JavaScript and CSS (without hash)
  scripts: {
    cacheControl: 'public, max-age=3600, must-revalidate',
    useETag: true,
    useLastModified: true,
    maxAge: 3600, // 1 hour
    immutable: false,
    patterns: [
      /\.js$/i,
      /\.css$/i,
      /\.map$/i,
    ],
  },

  // HTML pages
  html: {
    cacheControl: 'public, max-age=0, must-revalidate',
    useETag: true,
    useLastModified: true,
    maxAge: 0,
    immutable: false,
    patterns: [
      /\.html$/i,
      /\/$/,
    ],
  },

  // API responses (default)
  api: {
    cacheControl: 'private, no-cache, no-store, must-revalidate',
    useETag: true,
    useLastModified: false,
    maxAge: 0,
    immutable: false,
    patterns: [
      /^\/api\//,
    ],
  },

  // Cacheable API responses
  apiCacheable: {
    cacheControl: 'private, max-age=300, must-revalidate',
    useETag: true,
    useLastModified: true,
    maxAge: 300, // 5 minutes
    immutable: false,
    patterns: [],
  },

  // Service worker
  serviceWorker: {
    cacheControl: 'public, max-age=0, must-revalidate',
    useETag: true,
    useLastModified: true,
    maxAge: 0,
    immutable: false,
    patterns: [
      /service-worker\.js$/i,
      /sw\.js$/i,
    ],
  },
};

/**
 * Get cache policy for a given URL path
 * 
 * @param {string} urlPath - URL path to match
 * @returns {CachePolicy} Matched cache policy
 */
export function getCachePolicyForPath(urlPath) {
  // Check each policy's patterns
  for (const [name, policy] of Object.entries(CACHE_POLICIES)) {
    if (policy.patterns) {
      for (const pattern of policy.patterns) {
        if (pattern.test(urlPath)) {
          return { ...policy, name };
        }
      }
    }
  }

  // Default to API policy for unknown paths
  return { ...CACHE_POLICIES.api, name: 'api' };
}

/**
 * Build Cache-Control header value from policy
 * 
 * @param {CachePolicy} policy - Cache policy
 * @returns {string} Cache-Control header value
 */
export function buildCacheControlHeader(policy) {
  return policy.cacheControl;
}

/**
 * Vary header values for different scenarios
 */
export const VARY_HEADERS = {
  default: 'Accept-Encoding',
  api: 'Accept-Encoding, Authorization',
  content: 'Accept-Encoding, Accept',
};

/**
 * Security headers to include with cache headers
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};