/**
 * @fileoverview useTranslation Hook - Typed wrapper for component translations
 * Provides type-safe translation access with namespace support and dynamic locale switching
 * 
 * @module utils/use-translation
 * @see {@link file://./DESIGN_SYSTEM.md#i18n-system}
 */

import { EventBus } from '../core/event-bus.js';

/**
 * Global translation registry
 * @type {Map<string, Object>}
 */
const translationRegistry = new Map();

/**
 * Current active locale
 * @type {string}
 */
let currentLocale = 'en';

/**
 * Subscribers for locale changes
 * @type {Set<Function>}
 */
const localeSubscribers = new Set();

/**
 * Load translations for a specific locale
 * @param {string} locale - Locale code (e.g., 'en', 'es', 'fr')
 * @returns {Promise<void>}
 */
export async function loadTranslations(locale) {
  if (translationRegistry.has(locale)) {
    return; // Already loaded
  }

  try {
    const response = await fetch(`/locales/${locale}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for locale: ${locale}`);
    }
    const translations = await response.json();
    translationRegistry.set(locale, translations);
  } catch (error) {
    console.error(`[i18n] Failed to load locale ${locale}:`, error);
    // Fallback to English if available
    if (locale !== 'en' && translationRegistry.has('en')) {
      console.warn(`[i18n] Falling back to English for locale ${locale}`);
    }
  }
}

/**
 * Set the current locale and notify subscribers
 * @param {string} locale - Locale code to switch to
 * @returns {Promise<void>}
 */
export async function setLocale(locale) {
  await loadTranslations(locale);
  currentLocale = locale;
  
  // Notify all subscribers
  localeSubscribers.forEach(callback => callback(locale));
  
  // Publish locale change event
  EventBus.publish({
    type: 'LocaleChanged',
    payload: { locale, timestamp: Date.now() }
  });
}

/**
 * Get the current active locale
 * @returns {string}
 */
export function getCurrentLocale() {
  return currentLocale;
}

/**
 * Translation hook result
 * @typedef {Object} TranslationHook
 * @property {Function} t - Translation function
 * @property {string} locale - Current locale
 * @property {Function} setLocale - Function to change locale
 * @property {Function} subscribe - Subscribe to locale changes
 * @property {Function} unsubscribe - Unsubscribe from locale changes
 */

/**
 * Create a typed translation hook for a component
 * Provides scoped translation access with namespace support
 * 
 * @param {string} [namespace=''] - Translation namespace (e.g., 'components.button')
 * @returns {TranslationHook}
 * 
 * @example
 * // In a web component
 * const { t, locale, subscribe, unsubscribe } = useTranslation('components.button');
 * const label = t('submit'); // Returns translation for 'components.button.submit'
 * const fallback = t('missing', 'Default Text'); // Returns 'Default Text' if key missing
 * 
 * // Subscribe to locale changes
 * const handleLocaleChange = (newLocale) => {
 *   this.requestUpdate();
 * };
 * subscribe(handleLocaleChange);
 * 
 * // Clean up
 * unsubscribe(handleLocaleChange);
 */
export function useTranslation(namespace = '') {
  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot-notation path (e.g., 'a.b.c')
   * @returns {*}
   */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Translate a key with optional interpolation
   * @param {string} key - Translation key (relative to namespace)
   * @param {string|Object} [defaultOrParams=''] - Default text or interpolation params
   * @param {Object} [params={}] - Interpolation params if second arg is default text
   * @returns {string}
   */
  function translate(key, defaultOrParams = '', params = {}) {
    const translations = translationRegistry.get(currentLocale);
    const fallbackTranslations = translationRegistry.get('en');

    // Determine default text and params
    let defaultText = '';
    let interpolationParams = {};
    
    if (typeof defaultOrParams === 'string') {
      defaultText = defaultOrParams;
      interpolationParams = params;
    } else {
      interpolationParams = defaultOrParams || {};
    }

    // Build full key path
    const fullKey = namespace ? `${namespace}.${key}` : key;

    // Try to get translation
    let translation = translations ? getNestedValue(translations, fullKey) : undefined;

    // Fallback to English
    if (translation === undefined && fallbackTranslations && currentLocale !== 'en') {
      translation = getNestedValue(fallbackTranslations, fullKey);
      if (translation !== undefined) {
        console.debug(`[i18n] Using fallback translation for key: ${fullKey}`);
      }
    }

    // Fallback to default text
    if (translation === undefined) {
      if (defaultText) {
        return defaultText;
      }
      console.warn(`[i18n] Missing translation for key: ${fullKey} (locale: ${currentLocale})`);
      return fullKey; // Return key as last resort
    }

    // Interpolate parameters
    if (Object.keys(interpolationParams).length > 0) {
      return Object.entries(interpolationParams).reduce((text, [param, value]) => {
        return text.replace(new RegExp(`{{\\s*${param}\\s*}}`, 'g'), String(value));
      }, translation);
    }

    return translation;
  }

  /**
   * Subscribe to locale changes
   * @param {Function} callback - Callback function to invoke on locale change
   */
  function subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('[i18n] Subscriber callback must be a function');
    }
    localeSubscribers.add(callback);
  }

  /**
   * Unsubscribe from locale changes
   * @param {Function} callback - Callback function to remove
   */
  function unsubscribe(callback) {
    localeSubscribers.delete(callback);
  }

  return {
    t: translate,
    locale: currentLocale,
    setLocale,
    subscribe,
    unsubscribe
  };
}

/**
 * Initialize the i18n system with default locale
 * Should be called once during application bootstrap
 * 
 * @param {string} [defaultLocale='en'] - Default locale to load
 * @returns {Promise<void>}
 * 
 * @example
 * // In app initialization
 * import { initI18n } from './utils/use-translation.js';
 * await initI18n('en');
 */
export async function initI18n(defaultLocale = 'en') {
  await loadTranslations(defaultLocale);
  currentLocale = defaultLocale;
  
  console.info(`[i18n] Initialized with locale: ${defaultLocale}`);
  
  // Publish initialization event
  EventBus.publish({
    type: 'I18nInitialized',
    payload: { locale: defaultLocale, timestamp: Date.now() }
  });
}

/**
 * Check if a translation key exists
 * @param {string} key - Full translation key path
 * @param {string} [locale] - Locale to check (defaults to current)
 * @returns {boolean}
 */
export function hasTranslation(key, locale = currentLocale) {
  const translations = translationRegistry.get(locale);
  if (!translations) return false;
  
  return key.split('.').reduce((current, part) => {
    return current?.[part];
  }, translations) !== undefined;
}

/**
 * Get all available locales
 * @returns {string[]}
 */
export function getAvailableLocales() {
  return Array.from(translationRegistry.keys());
}

/**
 * Preload multiple locales for offline support
 * @param {string[]} locales - Array of locale codes to preload
 * @returns {Promise<void>}
 */
export async function preloadLocales(locales) {
  await Promise.all(locales.map(locale => loadTranslations(locale)));
  console.info(`[i18n] Preloaded locales:`, locales);
}