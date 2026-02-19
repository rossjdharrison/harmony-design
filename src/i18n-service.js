/**
 * @fileoverview I18n service with type-safe translation key access
 * @module src/i18n-service
 * 
 * Provides internationalization support with TypeScript autocomplete.
 * See DESIGN_SYSTEM.md § Internationalization for usage patterns.
 * 
 * @typedef {import('../types/i18n.d.ts').LocaleCode} LocaleCode
 * @typedef {import('../types/i18n.d.ts').TranslationKey} TranslationKey
 * @typedef {import('../types/i18n.d.ts').TranslationDictionary} TranslationDictionary
 * @typedef {import('../types/i18n.d.ts').TranslationParams} TranslationParams
 * @typedef {import('../types/i18n.d.ts').I18nService} I18nService
 */

/**
 * I18n service singleton
 * @implements {I18nService}
 */
class I18nServiceImpl {
  constructor() {
    /** @type {LocaleCode} */
    this.currentLocale = 'en';
    
    /** @type {Map<LocaleCode, Partial<TranslationDictionary>>} */
    this.translations = new Map();
    
    /** @type {LocaleCode} */
    this.fallbackLocale = 'en';
    
    /** @type {Map<TranslationKey, number>} */
    this.missingKeys = new Map();
  }

  /**
   * Get current locale code
   * @returns {LocaleCode}
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Set current locale and load translations
   * @param {LocaleCode} locale 
   * @returns {Promise<void>}
   */
  async setLocale(locale) {
    if (locale === this.currentLocale) return;

    const previousLocale = this.currentLocale;
    
    // Load translations if not already loaded
    if (!this.translations.has(locale)) {
      await this.loadLocale(locale);
    }

    this.currentLocale = locale;

    // Publish locale change event
    if (window.eventBus) {
      window.eventBus.publish('i18n:locale-changed', {
        locale,
        previous: previousLocale
      });
    }
  }

  /**
   * Translate a key with optional parameter substitution
   * @param {TranslationKey} key 
   * @param {TranslationParams} [params]
   * @returns {string}
   */
  t(key, params) {
    const currentDict = this.translations.get(this.currentLocale);
    let value = currentDict?.[key];

    // Fallback to default locale
    if (!value) {
      const fallbackDict = this.translations.get(this.fallbackLocale);
      value = fallbackDict?.[key];

      if (value && window.eventBus) {
        window.eventBus.publish('i18n:fallback-used', {
          key,
          locale: this.currentLocale,
          fallbackLocale: this.fallbackLocale
        });
      }
    }

    // Track missing keys
    if (!value) {
      this.missingKeys.set(key, (this.missingKeys.get(key) || 0) + 1);
      
      if (window.eventBus) {
        window.eventBus.publish('i18n:translation-missing', {
          key,
          locale: this.currentLocale
        });
      }

      console.warn(`[I18n] Missing translation: ${key} (${this.currentLocale})`);
      return key; // Return key as fallback
    }

    // Substitute parameters
    if (params) {
      return this.substituteParams(value, params);
    }

    return value;
  }

  /**
   * Substitute parameters in translation string
   * @param {string} template 
   * @param {TranslationParams} params 
   * @returns {string}
   * @private
   */
  substituteParams(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key]?.toString() ?? match;
    });
  }

  /**
   * Check if a key exists in current locale
   * @param {TranslationKey} key 
   * @returns {boolean}
   */
  hasKey(key) {
    const dict = this.translations.get(this.currentLocale);
    return dict?.[key] !== undefined;
  }

  /**
   * Get all available locales
   * @returns {LocaleCode[]}
   */
  getAvailableLocales() {
    return Array.from(this.translations.keys());
  }

  /**
   * Load locale data dynamically
   * @param {LocaleCode} locale 
   * @returns {Promise<import('../types/i18n.d.ts').LocaleData>}
   */
  async loadLocale(locale) {
    try {
      const response = await fetch(`/locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load locale: ${locale}`);
      }

      const data = await response.json();
      this.translations.set(locale, data.translations);

      if (window.eventBus) {
        window.eventBus.publish('i18n:translations-loaded', {
          locale,
          count: Object.keys(data.translations).length
        });
      }

      return data;
    } catch (error) {
      console.error(`[I18n] Failed to load locale ${locale}:`, error);
      throw error;
    }
  }

  /**
   * Register translations programmatically
   * @param {LocaleCode} locale 
   * @param {Partial<TranslationDictionary>} translations 
   */
  registerTranslations(locale, translations) {
    const existing = this.translations.get(locale) || {};
    this.translations.set(locale, { ...existing, ...translations });
  }

  /**
   * Get missing keys report
   * @returns {Array<{key: TranslationKey, count: number}>}
   */
  getMissingKeysReport() {
    return Array.from(this.missingKeys.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear missing keys tracking
   */
  clearMissingKeys() {
    this.missingKeys.clear();
  }
}

// Singleton instance
const i18nService = new I18nServiceImpl();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.i18nService = i18nService;
}

export { i18nService };