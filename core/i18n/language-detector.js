/**
 * @fileoverview Language Detector - Browser language detection and persistence
 * @module core/i18n/language-detector
 * 
 * Detects user's preferred language from:
 * 1. localStorage (previously saved preference)
 * 2. Browser's navigator.language
 * 3. Fallback to default language
 * 
 * Persists language selection to localStorage for consistency across sessions.
 * Publishes language change events via EventBus for reactive updates.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Internationalization
 */

import { EventBus } from '../event-bus.js';

/**
 * Storage key for persisted language preference
 * @const {string}
 */
const STORAGE_KEY = 'harmony-language';

/**
 * Default fallback language
 * @const {string}
 */
const DEFAULT_LANGUAGE = 'en';

/**
 * Supported languages in the system
 * @const {Set<string>}
 */
const SUPPORTED_LANGUAGES = new Set(['en', 'es', 'fr', 'de', 'ja', 'zh']);

/**
 * Language Detector
 * Handles browser language detection, persistence, and change notifications
 * 
 * @class LanguageDetector
 * 
 * @example
 * // Initialize detector
 * const detector = new LanguageDetector();
 * 
 * // Get current language
 * const currentLang = detector.getCurrentLanguage();
 * 
 * // Change language
 * detector.setLanguage('es');
 * 
 * // Listen for language changes
 * EventBus.subscribe('LanguageChanged', (event) => {
 *   console.log(`Language changed to: ${event.detail.language}`);
 * });
 */
export class LanguageDetector {
  /**
   * Current active language
   * @private
   * @type {string}
   */
  #currentLanguage;

  /**
   * EventBus instance for publishing events
   * @private
   * @type {EventBus}
   */
  #eventBus;

  /**
   * Creates a new LanguageDetector instance
   * Automatically detects and sets initial language
   */
  constructor() {
    this.#eventBus = EventBus;
    this.#currentLanguage = this.#detectLanguage();
    this.#persistLanguage(this.#currentLanguage);
  }

  /**
   * Detects the user's preferred language
   * Priority: localStorage > browser language > default
   * 
   * @private
   * @returns {string} Detected language code
   */
  #detectLanguage() {
    // 1. Check localStorage for saved preference
    const savedLanguage = this.#getStoredLanguage();
    if (savedLanguage && this.#isSupported(savedLanguage)) {
      return savedLanguage;
    }

    // 2. Check browser language
    const browserLanguage = this.#getBrowserLanguage();
    if (browserLanguage && this.#isSupported(browserLanguage)) {
      return browserLanguage;
    }

    // 3. Fallback to default
    return DEFAULT_LANGUAGE;
  }

  /**
   * Gets stored language preference from localStorage
   * 
   * @private
   * @returns {string|null} Stored language code or null
   */
  #getStoredLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to read language from localStorage:', error);
      return null;
    }
  }

  /**
   * Gets browser's preferred language
   * Extracts primary language code from full locale (e.g., 'en' from 'en-US')
   * 
   * @private
   * @returns {string|null} Browser language code or null
   */
  #getBrowserLanguage() {
    try {
      // Check navigator.language first
      if (navigator.language) {
        return this.#extractLanguageCode(navigator.language);
      }

      // Fallback to navigator.languages array
      if (navigator.languages && navigator.languages.length > 0) {
        return this.#extractLanguageCode(navigator.languages[0]);
      }

      return null;
    } catch (error) {
      console.warn('Failed to detect browser language:', error);
      return null;
    }
  }

  /**
   * Extracts primary language code from full locale string
   * 
   * @private
   * @param {string} locale - Full locale string (e.g., 'en-US', 'es-MX')
   * @returns {string} Primary language code (e.g., 'en', 'es')
   */
  #extractLanguageCode(locale) {
    if (!locale) return DEFAULT_LANGUAGE;
    
    // Extract language code before hyphen or underscore
    const languageCode = locale.split(/[-_]/)[0].toLowerCase();
    return languageCode || DEFAULT_LANGUAGE;
  }

  /**
   * Checks if a language is supported
   * 
   * @private
   * @param {string} language - Language code to check
   * @returns {boolean} True if language is supported
   */
  #isSupported(language) {
    return SUPPORTED_LANGUAGES.has(language);
  }

  /**
   * Persists language preference to localStorage
   * 
   * @private
   * @param {string} language - Language code to persist
   */
  #persistLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      console.warn('Failed to persist language to localStorage:', error);
    }
  }

  /**
   * Publishes language change event via EventBus
   * 
   * @private
   * @param {string} previousLanguage - Previous language code
   * @param {string} newLanguage - New language code
   */
  #publishLanguageChange(previousLanguage, newLanguage) {
    this.#eventBus.publish('LanguageChanged', {
      previous: previousLanguage,
      current: newLanguage,
      timestamp: Date.now()
    });
  }

  /**
   * Gets the current active language
   * 
   * @public
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.#currentLanguage;
  }

  /**
   * Sets a new language
   * Validates language support, persists to storage, and publishes change event
   * 
   * @public
   * @param {string} language - Language code to set
   * @throws {Error} If language is not supported
   * @returns {boolean} True if language was changed
   */
  setLanguage(language) {
    if (!language || typeof language !== 'string') {
      throw new Error('Language must be a non-empty string');
    }

    const normalizedLanguage = language.toLowerCase();

    if (!this.#isSupported(normalizedLanguage)) {
      throw new Error(
        `Language '${language}' is not supported. Supported languages: ${Array.from(SUPPORTED_LANGUAGES).join(', ')}`
      );
    }

    if (this.#currentLanguage === normalizedLanguage) {
      return false; // No change needed
    }

    const previousLanguage = this.#currentLanguage;
    this.#currentLanguage = normalizedLanguage;
    this.#persistLanguage(normalizedLanguage);
    this.#publishLanguageChange(previousLanguage, normalizedLanguage);

    return true;
  }

  /**
   * Gets list of supported languages
   * 
   * @public
   * @returns {string[]} Array of supported language codes
   */
  getSupportedLanguages() {
    return Array.from(SUPPORTED_LANGUAGES);
  }

  /**
   * Checks if a language is supported
   * 
   * @public
   * @param {string} language - Language code to check
   * @returns {boolean} True if language is supported
   */
  isLanguageSupported(language) {
    return this.#isSupported(language?.toLowerCase());
  }

  /**
   * Resets language to browser default or system default
   * Clears localStorage and re-detects language
   * 
   * @public
   * @returns {string} New detected language
   */
  resetToDefault() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear language from localStorage:', error);
    }

    const previousLanguage = this.#currentLanguage;
    this.#currentLanguage = this.#detectLanguage();
    this.#persistLanguage(this.#currentLanguage);
    
    if (previousLanguage !== this.#currentLanguage) {
      this.#publishLanguageChange(previousLanguage, this.#currentLanguage);
    }

    return this.#currentLanguage;
  }
}

/**
 * Singleton instance of LanguageDetector
 * @type {LanguageDetector}
 */
export const languageDetector = new LanguageDetector();