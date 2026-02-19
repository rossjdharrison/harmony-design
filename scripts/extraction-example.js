/**
 * Translation Extraction Example
 * 
 * This file demonstrates how to write code that the extraction script can detect.
 * 
 * DO NOT import this file - it's for documentation only.
 * 
 * @see {@link ./extract-translations.js}
 * @see {@link ../DESIGN_SYSTEM.md#translation-extraction}
 */

// ✅ GOOD: Literal string keys - will be extracted
function goodExamples() {
  // Single quotes
  const save = t('button.save');
  
  // Double quotes
  const cancel = t("button.cancel");
  
  // Backticks (no variables)
  const delete_ = t(`button.delete`);
  
  // With useTranslation hook
  const title = useTranslation().t('component.title');
  
  // Nested keys
  const error = t('errors.validation.required');
  
  // Multiple keys
  const messages = {
    success: t('message.success'),
    warning: t('message.warning'),
    error: t('message.error')
  };
}

// ❌ BAD: These will NOT be extracted
function badExamples() {
  // Variable key - cannot be statically analyzed
  const key = 'button.save';
  const save = t(key);
  
  // Template literal with variable - dynamic key
  const code = 'ERR_001';
  const error = t(`errors.${code}`);
  
  // Computed property
  const type = 'save';
  const label = t(`button.${type}`);
  
  // Function call result
  const msg = t(getKey());
}

// ✅ WORKAROUND: For dynamic content, use parameters
function dynamicContent() {
  // Define all possible keys statically
  const errorMessages = {
    ERR_001: t('errors.network'),
    ERR_002: t('errors.validation'),
    ERR_003: t('errors.authentication')
  };
  
  // Use at runtime
  const code = 'ERR_001';
  const message = errorMessages[code];
  
  // Or use interpolation in the translation
  // Translation: "Error: {code}"
  const error = t('errors.generic', { code: 'ERR_001' });
}

// ✅ PATTERN: Semantic key naming
function semanticKeys() {
  // Component-based namespace
  t('fader.label');
  t('fader.value');
  t('fader.reset');
  
  // Feature-based namespace
  t('transport.play');
  t('transport.pause');
  t('transport.stop');
  
  // Error namespace
  t('errors.validation.required');
  t('errors.validation.invalid');
  t('errors.network.timeout');
}

// ✅ PATTERN: Keep keys DRY with constants
const TRANSLATION_KEYS = {
  BUTTON_SAVE: 'button.save',
  BUTTON_CANCEL: 'button.cancel',
  BUTTON_DELETE: 'button.delete'
};

function withConstants() {
  // Keys are still literal strings for extraction
  const save = t('button.save');
  const cancel = t('button.cancel');
  
  // But can be referenced via constants in logic
  const key = TRANSLATION_KEYS.BUTTON_SAVE;
  // Note: This won't be extracted, but the literal above will
}