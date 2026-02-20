/**
 * @fileoverview Sensitive Data Masker - Masks PII in logs and error messages
 * @module security/sensitive-data-masker
 * 
 * Detects and masks personally identifiable information (PII) in logs, error messages,
 * and other output to prevent accidental data leakage. Supports email addresses,
 * phone numbers, credit cards, SSNs, IP addresses, and custom patterns.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Security Layer § Sensitive Data Masker
 * 
 * @example
 * import { maskPII, maskEmail, createMasker } from './security/sensitive-data-masker.js';
 * 
 * const message = "User john@example.com called from 555-123-4567";
 * console.log(maskPII(message)); // "User [EMAIL] called from [PHONE]"
 */

/**
 * PII pattern definitions with regex and replacement strategies
 * @typedef {Object} PIIPattern
 * @property {RegExp} regex - Pattern to match PII
 * @property {string} replacement - Replacement token or function
 * @property {string} type - Type identifier for the PII
 * @property {boolean} [preserveLength] - Whether to preserve original length
 */

/**
 * Built-in PII patterns for common data types
 * @type {Object.<string, PIIPattern>}
 */
const DEFAULT_PII_PATTERNS = {
  email: {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
    type: 'email',
    preserveLength: false
  },
  
  phone: {
    // Matches US/International formats: (555) 123-4567, 555-123-4567, +1-555-123-4567
    regex: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE]',
    type: 'phone',
    preserveLength: false
  },
  
  ssn: {
    // Matches XXX-XX-XXXX format
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN]',
    type: 'ssn',
    preserveLength: false
  },
  
  creditCard: {
    // Matches 13-19 digit credit card numbers with optional spaces/dashes
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b/g,
    replacement: '[CREDIT_CARD]',
    type: 'creditCard',
    preserveLength: false
  },
  
  ipv4: {
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_ADDRESS]',
    type: 'ipv4',
    preserveLength: false
  },
  
  ipv6: {
    regex: /\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g,
    replacement: '[IP_ADDRESS]',
    type: 'ipv6',
    preserveLength: false
  },
  
  apiKey: {
    // Matches common API key patterns (32+ hex chars or base64-like strings)
    regex: /\b[A-Za-z0-9_-]{32,}\b/g,
    replacement: '[API_KEY]',
    type: 'apiKey',
    preserveLength: false
  },
  
  jwt: {
    // Matches JWT tokens (three base64 segments separated by dots)
    regex: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[JWT_TOKEN]',
    type: 'jwt',
    preserveLength: false
  },
  
  password: {
    // Matches common password field patterns in strings
    regex: /(['"]?password['"]?\s*[:=]\s*)(['"])[^'"]{4,}\2/gi,
    replacement: '$1$2[REDACTED]$2',
    type: 'password',
    preserveLength: false
  }
};

/**
 * Masker configuration options
 * @typedef {Object} MaskerConfig
 * @property {Object.<string, PIIPattern>} [patterns] - Custom PII patterns to use
 * @property {string[]} [enabledPatterns] - Which patterns to enable (default: all)
 * @property {boolean} [preserveLength] - Preserve original length with asterisks
 * @property {string} [maskChar] - Character to use for length-preserving masks
 * @property {Function} [onMask] - Callback when PII is masked
 */

/**
 * Creates a custom masker with specific configuration
 * @param {MaskerConfig} config - Configuration options
 * @returns {Function} Masking function
 */
export function createMasker(config = {}) {
  const {
    patterns = DEFAULT_PII_PATTERNS,
    enabledPatterns = Object.keys(DEFAULT_PII_PATTERNS),
    preserveLength = false,
    maskChar = '*',
    onMask = null
  } = config;
  
  /**
   * Masks PII in the provided text
   * @param {string} text - Text to mask
   * @returns {string} Masked text
   */
  return function mask(text) {
    if (typeof text !== 'string') {
      return text;
    }
    
    let masked = text;
    const detectedPII = [];
    
    for (const patternName of enabledPatterns) {
      const pattern = patterns[patternName];
      if (!pattern) continue;
      
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      
      masked = masked.replace(regex, (match) => {
        detectedPII.push({
          type: pattern.type,
          length: match.length,
          position: masked.indexOf(match)
        });
        
        if (preserveLength || pattern.preserveLength) {
          return maskChar.repeat(match.length);
        }
        
        return pattern.replacement;
      });
    }
    
    if (onMask && detectedPII.length > 0) {
      onMask(detectedPII, text, masked);
    }
    
    return masked;
  };
}

/**
 * Default masker instance
 * @type {Function}
 */
const defaultMasker = createMasker();

/**
 * Masks all PII in the provided text using default patterns
 * @param {string} text - Text to mask
 * @returns {string} Masked text
 */
export function maskPII(text) {
  return defaultMasker(text);
}

/**
 * Masks only email addresses
 * @param {string} text - Text to mask
 * @returns {string} Masked text
 */
export function maskEmail(text) {
  const emailMasker = createMasker({
    enabledPatterns: ['email']
  });
  return emailMasker(text);
}

/**
 * Masks only phone numbers
 * @param {string} text - Text to mask
 * @returns {string} Masked text
 */
export function maskPhone(text) {
  const phoneMasker = createMasker({
    enabledPatterns: ['phone']
  });
  return phoneMasker(text);
}

/**
 * Masks credit card numbers
 * @param {string} text - Text to mask
 * @returns {string} Masked text
 */
export function maskCreditCard(text) {
  const cardMasker = createMasker({
    enabledPatterns: ['creditCard']
  });
  return cardMasker(text);
}

/**
 * Masks API keys and tokens
 * @param {string} text - Text to mask
 * @returns {string} Masked text
 */
export function maskSecrets(text) {
  const secretMasker = createMasker({
    enabledPatterns: ['apiKey', 'jwt', 'password']
  });
  return secretMasker(text);
}

/**
 * Masks PII in error objects, preserving stack traces
 * @param {Error} error - Error object to mask
 * @returns {Error} New error with masked message
 */
export function maskError(error) {
  if (!(error instanceof Error)) {
    return error;
  }
  
  const maskedError = new Error(maskPII(error.message));
  maskedError.name = error.name;
  maskedError.stack = error.stack; // Preserve stack trace
  
  // Copy other enumerable properties
  for (const key in error) {
    if (error.hasOwnProperty(key)) {
      const value = error[key];
      maskedError[key] = typeof value === 'string' ? maskPII(value) : value;
    }
  }
  
  return maskedError;
}

/**
 * Masks PII in structured log entries
 * @param {Object} logEntry - Log entry object
 * @returns {Object} Masked log entry
 */
export function maskLogEntry(logEntry) {
  if (typeof logEntry !== 'object' || logEntry === null) {
    return logEntry;
  }
  
  const masked = {};
  
  for (const [key, value] of Object.entries(logEntry)) {
    if (typeof value === 'string') {
      masked[key] = maskPII(value);
    } else if (value instanceof Error) {
      masked[key] = maskError(value);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskLogEntry(value); // Recursive masking
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * Creates a safe console wrapper that automatically masks PII
 * @param {Console} [console] - Console object to wrap (defaults to global console)
 * @returns {Object} Wrapped console with masking
 */
export function createSafeConsole(console = globalThis.console) {
  const methods = ['log', 'info', 'warn', 'error', 'debug'];
  const safeConsole = {};
  
  for (const method of methods) {
    safeConsole[method] = (...args) => {
      const maskedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return maskPII(arg);
        }
        if (arg instanceof Error) {
          return maskError(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
          return maskLogEntry(arg);
        }
        return arg;
      });
      
      console[method](...maskedArgs);
    };
  }
  
  return safeConsole;
}

/**
 * Validates that text contains no unmasked PII
 * @param {string} text - Text to validate
 * @returns {boolean} True if no PII detected
 */
export function validateNoUnmaskedPII(text) {
  if (typeof text !== 'string') {
    return true;
  }
  
  for (const pattern of Object.values(DEFAULT_PII_PATTERNS)) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    if (regex.test(text)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Detects PII in text without masking
 * @param {string} text - Text to analyze
 * @returns {Array<{type: string, match: string, position: number}>} Detected PII
 */
export function detectPII(text) {
  if (typeof text !== 'string') {
    return [];
  }
  
  const detected = [];
  
  for (const [name, pattern] of Object.entries(DEFAULT_PII_PATTERNS)) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      detected.push({
        type: pattern.type,
        match: match[0],
        position: match.index,
        length: match[0].length
      });
    }
  }
  
  return detected;
}

/**
 * Export patterns for custom configuration
 */
export { DEFAULT_PII_PATTERNS };