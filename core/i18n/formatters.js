/**
 * @fileoverview Number and Date Formatting Wrappers
 * @module core/i18n/formatters
 * 
 * Provides type-safe wrappers around Intl.NumberFormat and Intl.DateTimeFormat
 * with locale detection and caching for performance.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Internationalization
 */

import { LanguageDetector } from './language-detector.js';

/**
 * @typedef {Object} NumberFormatOptions
 * @property {'decimal'|'currency'|'percent'|'unit'} [style='decimal'] - Formatting style
 * @property {string} [currency] - Currency code (e.g., 'USD', 'EUR')
 * @property {string} [unit] - Unit identifier (e.g., 'kilometer', 'celsius')
 * @property {number} [minimumFractionDigits] - Minimum decimal places
 * @property {number} [maximumFractionDigits] - Maximum decimal places
 * @property {boolean} [useGrouping=true] - Whether to use grouping separators
 * @property {'standard'|'scientific'|'engineering'|'compact'} [notation='standard'] - Notation style
 */

/**
 * @typedef {Object} DateFormatOptions
 * @property {'full'|'long'|'medium'|'short'} [dateStyle] - Date formatting style
 * @property {'full'|'long'|'medium'|'short'} [timeStyle] - Time formatting style
 * @property {'numeric'|'2-digit'} [year] - Year format
 * @property {'numeric'|'2-digit'|'long'|'short'|'narrow'} [month] - Month format
 * @property {'numeric'|'2-digit'} [day] - Day format
 * @property {'numeric'|'2-digit'} [hour] - Hour format
 * @property {'numeric'|'2-digit'} [minute] - Minute format
 * @property {'numeric'|'2-digit'} [second] - Second format
 * @property {string} [timeZone] - IANA time zone identifier
 * @property {boolean} [hour12] - Whether to use 12-hour time
 */

/**
 * Cache for Intl.NumberFormat instances to avoid recreating formatters
 * @type {Map<string, Intl.NumberFormat>}
 */
const numberFormatCache = new Map();

/**
 * Cache for Intl.DateTimeFormat instances to avoid recreating formatters
 * @type {Map<string, Intl.DateTimeFormat>}
 */
const dateFormatCache = new Map();

/**
 * Maximum cache size to prevent memory bloat
 * @const {number}
 */
const MAX_CACHE_SIZE = 50;

/**
 * Generates a cache key from locale and options
 * @param {string} locale - Locale identifier
 * @param {Object} options - Formatter options
 * @returns {string} Cache key
 */
function generateCacheKey(locale, options) {
  return `${locale}:${JSON.stringify(options || {})}`;
}

/**
 * Clears oldest entries from cache when size limit is reached
 * @param {Map} cache - Cache to prune
 */
function pruneCache(cache) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

/**
 * Number formatter wrapper with locale detection and caching
 * @class
 */
export class NumberFormatter {
  /**
   * Creates a new NumberFormatter instance
   * @param {string} [locale] - Optional locale override (uses detected locale if not provided)
   */
  constructor(locale = null) {
    this.locale = locale || LanguageDetector.getCurrentLanguage();
  }

  /**
   * Formats a number according to the specified options
   * @param {number} value - Number to format
   * @param {NumberFormatOptions} [options={}] - Formatting options
   * @returns {string} Formatted number string
   * 
   * @example
   * const formatter = new NumberFormatter('en-US');
   * formatter.format(1234.56); // "1,234.56"
   * formatter.format(1234.56, { style: 'currency', currency: 'USD' }); // "$1,234.56"
   */
  format(value, options = {}) {
    const cacheKey = generateCacheKey(this.locale, options);
    
    if (!numberFormatCache.has(cacheKey)) {
      pruneCache(numberFormatCache);
      numberFormatCache.set(
        cacheKey,
        new Intl.NumberFormat(this.locale, options)
      );
    }

    return numberFormatCache.get(cacheKey).format(value);
  }

  /**
   * Formats a number as currency
   * @param {number} value - Amount to format
   * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
   * @param {Object} [additionalOptions={}] - Additional formatting options
   * @returns {string} Formatted currency string
   * 
   * @example
   * const formatter = new NumberFormatter('en-US');
   * formatter.formatCurrency(1234.56, 'USD'); // "$1,234.56"
   */
  formatCurrency(value, currency, additionalOptions = {}) {
    return this.format(value, {
      style: 'currency',
      currency,
      ...additionalOptions
    });
  }

  /**
   * Formats a number as a percentage
   * @param {number} value - Value to format (0.5 = 50%)
   * @param {Object} [additionalOptions={}] - Additional formatting options
   * @returns {string} Formatted percentage string
   * 
   * @example
   * const formatter = new NumberFormatter('en-US');
   * formatter.formatPercent(0.1234); // "12%"
   * formatter.formatPercent(0.1234, { minimumFractionDigits: 2 }); // "12.34%"
   */
  formatPercent(value, additionalOptions = {}) {
    return this.format(value, {
      style: 'percent',
      ...additionalOptions
    });
  }

  /**
   * Formats a number with a unit
   * @param {number} value - Value to format
   * @param {string} unit - Unit identifier (e.g., 'kilometer', 'celsius')
   * @param {Object} [additionalOptions={}] - Additional formatting options
   * @returns {string} Formatted unit string
   * 
   * @example
   * const formatter = new NumberFormatter('en-US');
   * formatter.formatUnit(100, 'kilometer'); // "100 km"
   * formatter.formatUnit(23.5, 'celsius'); // "23.5°C"
   */
  formatUnit(value, unit, additionalOptions = {}) {
    return this.format(value, {
      style: 'unit',
      unit,
      ...additionalOptions
    });
  }

  /**
   * Formats a number in compact notation
   * @param {number} value - Value to format
   * @param {Object} [additionalOptions={}] - Additional formatting options
   * @returns {string} Formatted compact string
   * 
   * @example
   * const formatter = new NumberFormatter('en-US');
   * formatter.formatCompact(1234567); // "1.2M"
   * formatter.formatCompact(1234); // "1.2K"
   */
  formatCompact(value, additionalOptions = {}) {
    return this.format(value, {
      notation: 'compact',
      ...additionalOptions
    });
  }

  /**
   * Changes the locale for this formatter instance
   * @param {string} locale - New locale identifier
   */
  setLocale(locale) {
    this.locale = locale;
  }
}

/**
 * Date/Time formatter wrapper with locale detection and caching
 * @class
 */
export class DateFormatter {
  /**
   * Creates a new DateFormatter instance
   * @param {string} [locale] - Optional locale override (uses detected locale if not provided)
   */
  constructor(locale = null) {
    this.locale = locale || LanguageDetector.getCurrentLanguage();
  }

  /**
   * Formats a date according to the specified options
   * @param {Date|number|string} value - Date to format
   * @param {DateFormatOptions} [options={}] - Formatting options
   * @returns {string} Formatted date string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.format(new Date('2024-01-15')); // "1/15/2024"
   * formatter.format(new Date(), { dateStyle: 'full' }); // "Monday, January 15, 2024"
   */
  format(value, options = {}) {
    const date = value instanceof Date ? value : new Date(value);
    const cacheKey = generateCacheKey(this.locale, options);
    
    if (!dateFormatCache.has(cacheKey)) {
      pruneCache(dateFormatCache);
      dateFormatCache.set(
        cacheKey,
        new Intl.DateTimeFormat(this.locale, options)
      );
    }

    return dateFormatCache.get(cacheKey).format(date);
  }

  /**
   * Formats a date with short style
   * @param {Date|number|string} value - Date to format
   * @returns {string} Formatted date string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.formatShort(new Date('2024-01-15')); // "1/15/24"
   */
  formatShort(value) {
    return this.format(value, { dateStyle: 'short' });
  }

  /**
   * Formats a date with medium style
   * @param {Date|number|string} value - Date to format
   * @returns {string} Formatted date string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.formatMedium(new Date('2024-01-15')); // "Jan 15, 2024"
   */
  formatMedium(value) {
    return this.format(value, { dateStyle: 'medium' });
  }

  /**
   * Formats a date with long style
   * @param {Date|number|string} value - Date to format
   * @returns {string} Formatted date string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.formatLong(new Date('2024-01-15')); // "January 15, 2024"
   */
  formatLong(value) {
    return this.format(value, { dateStyle: 'long' });
  }

  /**
   * Formats a date with full style
   * @param {Date|number|string} value - Date to format
   * @returns {string} Formatted date string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.formatFull(new Date('2024-01-15')); // "Monday, January 15, 2024"
   */
  formatFull(value) {
    return this.format(value, { dateStyle: 'full' });
  }

  /**
   * Formats a time with specified style
   * @param {Date|number|string} value - Date/time to format
   * @param {'short'|'medium'|'long'|'full'} [style='short'] - Time style
   * @returns {string} Formatted time string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.formatTime(new Date('2024-01-15T14:30:00')); // "2:30 PM"
   * formatter.formatTime(new Date('2024-01-15T14:30:00'), 'medium'); // "2:30:00 PM"
   */
  formatTime(value, style = 'short') {
    return this.format(value, { timeStyle: style });
  }

  /**
   * Formats both date and time
   * @param {Date|number|string} value - Date/time to format
   * @param {string} [dateStyle='medium'] - Date style
   * @param {string} [timeStyle='short'] - Time style
   * @returns {string} Formatted date and time string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.formatDateTime(new Date('2024-01-15T14:30:00')); // "Jan 15, 2024, 2:30 PM"
   */
  formatDateTime(value, dateStyle = 'medium', timeStyle = 'short') {
    return this.format(value, { dateStyle, timeStyle });
  }

  /**
   * Formats a date relative to now (e.g., "2 days ago")
   * Note: Uses Intl.RelativeTimeFormat internally
   * @param {Date|number|string} value - Date to format
   * @param {Object} [options={}] - Additional options
   * @returns {string} Relative time string
   * 
   * @example
   * const formatter = new DateFormatter('en-US');
   * formatter.formatRelative(new Date(Date.now() - 86400000)); // "1 day ago"
   */
  formatRelative(value, options = {}) {
    const date = value instanceof Date ? value : new Date(value);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const rtf = new Intl.RelativeTimeFormat(this.locale, {
      numeric: 'auto',
      ...options
    });

    if (Math.abs(diffYears) >= 1) {
      return rtf.format(diffYears, 'year');
    } else if (Math.abs(diffMonths) >= 1) {
      return rtf.format(diffMonths, 'month');
    } else if (Math.abs(diffWeeks) >= 1) {
      return rtf.format(diffWeeks, 'week');
    } else if (Math.abs(diffDays) >= 1) {
      return rtf.format(diffDays, 'day');
    } else if (Math.abs(diffHours) >= 1) {
      return rtf.format(diffHours, 'hour');
    } else if (Math.abs(diffMinutes) >= 1) {
      return rtf.format(diffMinutes, 'minute');
    } else {
      return rtf.format(diffSeconds, 'second');
    }
  }

  /**
   * Changes the locale for this formatter instance
   * @param {string} locale - New locale identifier
   */
  setLocale(locale) {
    this.locale = locale;
  }
}

/**
 * Clears all formatter caches
 * Useful for testing or when memory needs to be freed
 */
export function clearFormatterCaches() {
  numberFormatCache.clear();
  dateFormatCache.clear();
}

/**
 * Gets cache statistics for monitoring
 * @returns {Object} Cache statistics
 */
export function getFormatterCacheStats() {
  return {
    numberFormatCacheSize: numberFormatCache.size,
    dateFormatCacheSize: dateFormatCache.size,
    totalCacheSize: numberFormatCache.size + dateFormatCache.size,
    maxCacheSize: MAX_CACHE_SIZE * 2
  };
}