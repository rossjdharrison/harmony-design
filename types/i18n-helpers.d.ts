/**
 * @fileoverview Advanced TypeScript helpers for i18n type safety
 * @module types/i18n-helpers
 * 
 * Provides utility types for building type-safe translation systems.
 * See DESIGN_SYSTEM.md § Internationalization for usage examples.
 */

import type { TranslationKey, LocaleCode, TranslationDictionary } from './i18n.d.ts';

/**
 * Ensures a translation dictionary has all required keys
 */
export type CompleteTranslationDictionary = Required<TranslationDictionary>;

/**
 * Partial translation dictionary for locale fallbacks
 */
export type PartialTranslationDictionary = Partial<TranslationDictionary>;

/**
 * Type-safe translation key builder
 * Usage: const key: KeyBuilder<'audio'> = 'audio.play';
 */
export type KeyBuilder<Prefix extends string> = `${Prefix}.${string}`;

/**
 * Extract prefix from translation key
 * Example: ExtractPrefix<'audio.play'> = 'audio'
 */
export type ExtractPrefix<T extends string> = T extends `${infer P}.${string}` ? P : never;

/**
 * Extract suffix from translation key
 * Example: ExtractSuffix<'audio.play'> = 'play'
 */
export type ExtractSuffix<T extends string> = T extends `${string}.${infer S}` ? S : never;

/**
 * Filter translation keys by prefix
 */
export type KeysByPrefix<Prefix extends string> = Extract<TranslationKey, `${Prefix}.${string}`>;

/**
 * Type-safe translation key groups
 */
export type TranslationKeyGroup = {
  common: KeysByPrefix<'common'>;
  audio: KeysByPrefix<'audio'>;
  transport: KeysByPrefix<'transport'>;
  track: KeysByPrefix<'track'>;
  clip: KeysByPrefix<'clip'>;
  mixer: KeysByPrefix<'mixer'>;
  effects: KeysByPrefix<'effects'>;
  error: KeysByPrefix<'error'>;
  validation: KeysByPrefix<'validation'>;
  a11y: KeysByPrefix<'a11y'>;
};

/**
 * Branded type for validated translation keys
 */
export type ValidatedKey = TranslationKey & { __validated: true };

/**
 * Translation key with compile-time validation
 */
export type StrictTranslationKey<K extends TranslationKey> = K;

/**
 * Locale-specific translation override
 */
export interface LocaleOverride {
  locale: LocaleCode;
  key: TranslationKey;
  value: string;
}

/**
 * Translation cache entry
 */
export interface TranslationCacheEntry {
  key: TranslationKey;
  locale: LocaleCode;
  value: string;
  timestamp: number;
  hits: number;
}

/**
 * Type-safe translation loader function
 */
export type TranslationLoader = (locale: LocaleCode) => Promise<PartialTranslationDictionary>;

/**
 * Translation middleware function
 */
export type TranslationMiddleware = (
  key: TranslationKey,
  value: string,
  locale: LocaleCode
) => string;

/**
 * Compile-time check for exhaustive translation coverage
 */
export type AssertComplete<T extends TranslationDictionary> = {
  [K in TranslationKey]: K extends keyof T ? T[K] : never;
};

/**
 * Type helper for parameter extraction from translation strings
 * Example: ExtractParams<"Hello {name}"> = { name: string }
 */
export type ExtractParams<T extends string> = T extends `${string}{${infer P}}${infer Rest}`
  ? { [K in P]: string | number } & ExtractParams<Rest>
  : {};

/**
 * Type-safe translation with parameter validation
 */
export type TypedTranslation<K extends TranslationKey, T extends string> = {
  key: K;
  template: T;
  params: ExtractParams<T>;
};

/**
 * Translation key validator
 */
export interface KeyValidator {
  validate(key: string): key is TranslationKey;
  getPrefix(key: TranslationKey): string;
  getSuffix(key: TranslationKey): string;
}

/**
 * Type for translation file structure
 */
export interface TranslationFile {
  locale: LocaleCode;
  version: string;
  translations: PartialTranslationDictionary;
  metadata?: {
    author?: string;
    lastModified?: string;
    completeness?: number;
  };
}

/**
 * Readonly translation dictionary for immutability
 */
export type ReadonlyTranslationDictionary = Readonly<TranslationDictionary>;

/**
 * Deep readonly translation structure
 */
export type DeepReadonlyTranslations<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonlyTranslations<T[P]> : T[P];
};