/**
 * @fileoverview Internationalization (i18n) utility for Harmony Design System
 * Loads and manages translations from JSON locale files
 * 
 * @module core/i18n
 * @see DESIGN_SYSTEM.md#internationalization
 */

/**
 * @typedef {Object} LocaleMeta
 * @property {string} locale - Locale code (e.g., 'en', 'de', 'ja', 'zh')
 * @property {string} language - Language name
 * @property {string} version - Translation version
 */

/**
 * @typedef {Object} TranslationData
 * @property {LocaleMeta} meta - Locale metadata
 * @property {Object} common - Common UI strings
 * @property {Object} audio - Audio-specific strings
 * @property {Object} controls - Control-specific strings
 * @property {Object} validation - Validation messages
 * @property {Object} accessibility - Accessibility labels
 * @property {Object} theme - Theme-related strings
 * @property {Object} errors - Error messages
 */

class I18n {
  constructor() {
    /** @type {string} */
    this.currentLocale = 'en';
    
    /** @type {Map<string, TranslationData>} */
    this.translations = new Map();
    
    /** @type {string[]} */
    this.supportedLocales = ['en', 'de', 'ja', 'zh'];
    
    /** @type {TranslationData|null} */
    this.fallbackTranslations = null;
  }

  /**
   * Initialize i18n system with default locale
   * @param {string} [locale='en'] - Initial locale to load
   * @returns {Promise<void>}
   */
  async initialize(locale = 'en') {
    // Load fallback (English) first
    await this.loadLocale('en');
    this.fallbackTranslations = this.translations.get('en');
    
    // Load requested locale if different
    if (locale !== 'en') {
      await this.loadLocale(locale);
    }
    
    this.currentLocale = locale;
  }

  /**
   * Load translations for a specific locale
   * @param {string} locale - Locale code to load
   * @returns {Promise<boolean>} Success status
   */
  async loadLocale(locale) {
    if (!this.supportedLocales.includes(locale)) {
      console.warn(`[I18n] Unsupported locale: ${locale}`);
      return false;
    }

    if (this.translations.has(locale)) {
      return true; // Already loaded
    }

    try {
      const response = await fetch(`/locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      this.translations.set(locale, data);
      
      console.log(`[I18n] Loaded locale: ${locale} (${data.meta.language})`);
      return true;
    } catch (error) {
      console.error(`[I18n] Failed to load locale ${locale}:`, error);
      return false;
    }
  }

  /**
   * Switch to a different locale
   * @param {string} locale - Target locale code
   * @returns {Promise<boolean>} Success status
   */
  async setLocale(locale) {
    if (!this.supportedLocales.includes(locale)) {
      console.warn(`[I18n] Cannot set unsupported locale: ${locale}`);
      return false;
    }

    // Load if not already loaded
    if (!this.translations.has(locale)) {
      const loaded = await this.loadLocale(locale);
      if (!loaded) {
        return false;
      }
    }

    this.currentLocale = locale;
    
    // Dispatch event for components to react to locale change
    window.dispatchEvent(new CustomEvent('locale-changed', {
      detail: { locale, language: this.getLanguageName(locale) }
    }));
    
    return true;
  }

  /**
   * Get translated string by key path
   * Supports nested keys using dot notation (e.g., 'audio.play')
   * Supports interpolation with {placeholder} syntax
   * 
   * @param {string} key - Translation key (dot-separated path)
   * @param {Object} [params={}] - Interpolation parameters
   * @param {string} [locale] - Override locale (uses current if not specified)
   * @returns {string} Translated string or key if not found
   */
  t(key, params = {}, locale = this.currentLocale) {
    const translations = this.translations.get(locale) || this.fallbackTranslations;
    
    if (!translations) {
      console.warn(`[I18n] No translations loaded for locale: ${locale}`);
      return key;
    }

    // Navigate nested object using dot notation
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Try fallback if current locale doesn't have the key
        if (locale !== 'en' && this.fallbackTranslations) {
          value = this.fallbackTranslations;
          for (const fk of keys) {
            if (value && typeof value === 'object' && fk in value) {
              value = value[fk];
            } else {
              return key; // Not found in fallback either
            }
          }
          break;
        }
        return key; // Not found
      }
    }

    if (typeof value !== 'string') {
      console.warn(`[I18n] Translation key "${key}" does not resolve to string`);
      return key;
    }

    // Interpolate parameters
    return this.interpolate(value, params);
  }

  /**
   * Interpolate parameters into translation string
   * Replaces {key} with params[key]
   * 
   * @param {string} str - String with placeholders
   * @param {Object} params - Parameter values
   * @returns {string} Interpolated string
   * @private
   */
  interpolate(str, params) {
    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return params.hasOwnProperty(key) ? String(params[key]) : match;
    });
  }

  /**
   * Get language name for a locale
   * @param {string} [locale] - Locale code (uses current if not specified)
   * @returns {string} Language name
   */
  getLanguageName(locale = this.currentLocale) {
    const translations = this.translations.get(locale);
    return translations?.meta?.language || locale;
  }

  /**
   * Get current locale code
   * @returns {string} Current locale
   */
  getCurrentLocale() {
    return this.currentLocale;
  }

  /**
   * Get list of supported locales
   * @returns {string[]} Supported locale codes
   */
  getSupportedLocales() {
    return [...this.supportedLocales];
  }

  /**
   * Get list of loaded locales with metadata
   * @returns {Array<{locale: string, language: string, version: string}>}
   */
  getLoadedLocales() {
    return Array.from(this.translations.entries()).map(([locale, data]) => ({
      locale,
      language: data.meta.language,
      version: data.meta.version
    }));
  }

  /**
   * Detect browser locale and return best match
   * @returns {string} Best matching supported locale or 'en'
   */
  detectBrowserLocale() {
    const browserLocale = navigator.language || navigator.userLanguage || 'en';
    const primaryLocale = browserLocale.split('-')[0].toLowerCase();
    
    return this.supportedLocales.includes(primaryLocale) ? primaryLocale : 'en';
  }
}

// Create singleton instance
const i18n = new I18n();

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const locale = i18n.detectBrowserLocale();
    i18n.initialize(locale).catch(err => {
      console.error('[I18n] Failed to initialize:', err);
    });
  });
}

export default i18n;
export { I18n };