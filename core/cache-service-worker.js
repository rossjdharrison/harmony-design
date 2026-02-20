/**
 * @fileoverview Cache Service Worker Integration
 * 
 * Service worker integration for automatic caching using CacheStrategyManager.
 * Intercepts fetch requests and applies appropriate caching strategies.
 * 
 * @see DESIGN_SYSTEM.md#cache-service-worker
 */

import { getCacheStrategyManager } from './cache-strategy-manager.js';

/**
 * Initialize cache service worker
 * @param {Object} options - Configuration options
 * @param {string} [options.version] - Cache version
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {Promise<ServiceWorkerRegistration|null>} Service worker registration
 */
export async function initCacheServiceWorker(options = {}) {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/cache-sw.js',
      { scope: '/' }
    );

    console.log('Cache Service Worker registered', registration);

    // Send configuration to service worker
    if (registration.active) {
      registration.active.postMessage({
        type: 'INIT',
        options
      });
    }

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister cache service worker
 * @returns {Promise<boolean>} True if unregistered
 */
export async function unregisterCacheServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  
  for (const registration of registrations) {
    if (registration.active && registration.active.scriptURL.includes('cache-sw.js')) {
      const unregistered = await registration.unregister();
      console.log('Cache Service Worker unregistered', unregistered);
      return unregistered;
    }
  }

  return false;
}

/**
 * Check if cache service worker is active
 * @returns {Promise<boolean>} True if active
 */
export async function isCacheServiceWorkerActive() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration('/');
  return !!(registration && registration.active);
}

/**
 * Get cache statistics from service worker
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats() {
  const manager = getCacheStrategyManager();
  return manager.getStats();
}

/**
 * Clear all caches
 * @returns {Promise<void>}
 */
export async function clearAllCaches() {
  const manager = getCacheStrategyManager();
  await manager.clearAll();
}