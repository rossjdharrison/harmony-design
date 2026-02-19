/**
 * @fileoverview TypeScript types for i18n translation keys with autocomplete
 * @module types/i18n
 * 
 * Provides type-safe translation key access with IDE autocomplete support.
 * See DESIGN_SYSTEM.md § Internationalization for usage patterns.
 */

/**
 * Supported locale codes
 */
export type LocaleCode = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

/**
 * Translation key paths for common UI elements
 */
export interface CommonTranslations {
  'common.ok': string;
  'common.cancel': string;
  'common.save': string;
  'common.delete': string;
  'common.edit': string;
  'common.close': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.warning': string;
  'common.info': string;
}

/**
 * Translation keys for audio controls
 */
export interface AudioTranslations {
  'audio.play': string;
  'audio.pause': string;
  'audio.stop': string;
  'audio.record': string;
  'audio.mute': string;
  'audio.unmute': string;
  'audio.volume': string;
  'audio.tempo': string;
  'audio.pitch': string;
  'audio.solo': string;
  'audio.arm': string;
}

/**
 * Translation keys for transport controls
 */
export interface TransportTranslations {
  'transport.play': string;
  'transport.pause': string;
  'transport.stop': string;
  'transport.record': string;
  'transport.rewind': string;
  'transport.forward': string;
  'transport.loop': string;
  'transport.metronome': string;
  'transport.tempo': string;
  'transport.timecode': string;
}

/**
 * Translation keys for track operations
 */
export interface TrackTranslations {
  'track.add': string;
  'track.delete': string;
  'track.duplicate': string;
  'track.rename': string;
  'track.mute': string;
  'track.solo': string;
  'track.arm': string;
  'track.volume': string;
  'track.pan': string;
}

/**
 * Translation keys for clip operations
 */
export interface ClipTranslations {
  'clip.add': string;
  'clip.delete': string;
  'clip.duplicate': string;
  'clip.split': string;
  'clip.trim': string;
  'clip.fade-in': string;
  'clip.fade-out': string;
  'clip.gain': string;
}

/**
 * Translation keys for mixer elements
 */
export interface MixerTranslations {
  'mixer.channel': string;
  'mixer.master': string;
  'mixer.aux': string;
  'mixer.bus': string;
  'mixer.fader': string;
  'mixer.pan': string;
  'mixer.mute': string;
  'mixer.solo': string;
  'mixer.insert': string;
  'mixer.send': string;
}

/**
 * Translation keys for effects
 */
export interface EffectsTranslations {
  'effects.reverb': string;
  'effects.delay': string;
  'effects.eq': string;
  'effects.compressor': string;
  'effects.limiter': string;
  'effects.distortion': string;
  'effects.chorus': string;
  'effects.flanger': string;
  'effects.phaser': string;
}

/**
 * Translation keys for error messages
 */
export interface ErrorTranslations {
  'error.audio-context-failed': string;
  'error.file-load-failed': string;
  'error.playback-failed': string;
  'error.recording-failed': string;
  'error.invalid-format': string;
  'error.permission-denied': string;
  'error.network-error': string;
  'error.unknown': string;
}

/**
 * Translation keys for validation messages
 */
export interface ValidationTranslations {
  'validation.required': string;
  'validation.invalid-format': string;
  'validation.out-of-range': string;
  'validation.too-long': string;
  'validation.too-short': string;
  'validation.invalid-value': string;
}

/**
 * Translation keys for accessibility labels
 */
export interface A11yTranslations {
  'a11y.play-button': string;
  'a11y.pause-button': string;
  'a11y.stop-button': string;
  'a11y.record-button': string;
  'a11y.volume-slider': string;
  'a11y.pan-slider': string;
  'a11y.mute-toggle': string;
  'a11y.solo-toggle': string;
  'a11y.menu': string;
  'a11y.close-dialog': string;
}

/**
 * Combined translation keys interface
 */
export interface TranslationKeys
  extends CommonTranslations,
    AudioTranslations,
    TransportTranslations,
    TrackTranslations,
    ClipTranslations,
    MixerTranslations,
    EffectsTranslations,
    ErrorTranslations,
    ValidationTranslations,
    A11yTranslations {}

/**
 * Translation key path type - provides autocomplete for all valid keys
 */
export type TranslationKey = keyof TranslationKeys;

/**
 * Translation dictionary structure
 */
export type TranslationDictionary = Record<TranslationKey, string>;

/**
 * Locale data structure
 */
export interface LocaleData {
  code: LocaleCode;
  name: string;
  nativeName: string;
  translations: Partial<TranslationDictionary>;
}

/**
 * Translation function type with autocomplete support
 */
export type TranslateFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * I18n service interface
 */
export interface I18nService {
  /**
   * Get current locale code
   */
  getLocale(): LocaleCode;

  /**
   * Set current locale
   */
  setLocale(locale: LocaleCode): Promise<void>;

  /**
   * Translate a key with optional parameters
   */
  t: TranslateFunction;

  /**
   * Check if a key exists in current locale
   */
  hasKey(key: TranslationKey): boolean;

  /**
   * Get all available locales
   */
  getAvailableLocales(): LocaleCode[];

  /**
   * Load locale data dynamically
   */
  loadLocale(locale: LocaleCode): Promise<LocaleData>;
}

/**
 * Translation parameter substitution pattern
 * Example: "Hello {name}, you have {count} messages"
 */
export type TranslationParams = Record<string, string | number>;

/**
 * Pluralization rules for different locales
 */
export interface PluralRules {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Translation with pluralization support
 */
export interface PluralTranslation {
  key: TranslationKey;
  count: number;
  rules: PluralRules;
}

/**
 * Date/time formatting options
 */
export interface DateTimeFormatOptions {
  locale: LocaleCode;
  format: 'short' | 'medium' | 'long' | 'full';
}

/**
 * Number formatting options
 */
export interface NumberFormatOptions {
  locale: LocaleCode;
  style?: 'decimal' | 'currency' | 'percent';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Type guard to check if a string is a valid translation key
 */
export function isTranslationKey(key: string): key is TranslationKey;

/**
 * Extract translation keys from a dictionary
 */
export type ExtractKeys<T> = T extends Record<infer K, any> ? K : never;

/**
 * Nested translation key support (for future expansion)
 */
export type NestedTranslationKey<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends Record<string, any>
    ? `${K}.${NestedTranslationKey<T[K]>}`
    : K
  : never;

/**
 * Translation metadata for debugging
 */
export interface TranslationMetadata {
  key: TranslationKey;
  locale: LocaleCode;
  fallback: boolean;
  missing: boolean;
  timestamp: number;
}

/**
 * Translation event types for EventBus integration
 */
export interface TranslationEvents {
  'i18n:locale-changed': { locale: LocaleCode; previous: LocaleCode };
  'i18n:translations-loaded': { locale: LocaleCode; count: number };
  'i18n:translation-missing': { key: TranslationKey; locale: LocaleCode };
  'i18n:fallback-used': { key: TranslationKey; locale: LocaleCode; fallbackLocale: LocaleCode };
}

/**
 * Type for translation event payloads
 */
export type TranslationEventPayload<T extends keyof TranslationEvents> = TranslationEvents[T];