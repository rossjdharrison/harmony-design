/**
 * @fileoverview Capability Checker - Verifies code bundles only use declared capabilities
 * @module security/capability-checker
 * 
 * Analyzes JavaScript code to detect capability usage and validates against declared permissions.
 * Part of the security layer for user-generated and dispatched code.
 * 
 * Related: security/sandbox-policy.js, security/safe-renderer.js
 * Documentation: DESIGN_SYSTEM.md § Security
 */

/**
 * @typedef {Object} CapabilityDeclaration
 * @property {string[]} dom - DOM manipulation capabilities (e.g., 'read', 'write')
 * @property {string[]} network - Network access capabilities (e.g., 'fetch', 'websocket')
 * @property {string[]} storage - Storage access capabilities (e.g., 'localStorage', 'indexedDB')
 * @property {string[]} events - Event capabilities (e.g., 'publish', 'subscribe')
 * @property {string[]} media - Media capabilities (e.g., 'audio', 'video', 'canvas')
 * @property {string[]} worker - Worker capabilities (e.g., 'create', 'message')
 * @property {string[]} crypto - Cryptographic capabilities (e.g., 'hash', 'random')
 */

/**
 * @typedef {Object} CapabilityViolation
 * @property {string} type - Type of capability violated
 * @property {string} capability - Specific capability used without declaration
 * @property {number} line - Line number where violation occurred
 * @property {number} column - Column number where violation occurred
 * @property {string} code - Code snippet showing the violation
 * @property {string} severity - 'critical', 'high', 'medium', 'low'
 */

/**
 * @typedef {Object} CapabilityCheckResult
 * @property {boolean} allowed - Whether code is allowed to execute
 * @property {CapabilityViolation[]} violations - List of capability violations
 * @property {string[]} usedCapabilities - Capabilities detected in code
 * @property {string[]} declaredCapabilities - Capabilities declared by bundle
 * @property {string[]} warnings - Non-blocking warnings
 */

/**
 * Capability detection patterns for static analysis
 * Maps API patterns to capability requirements
 */
const CAPABILITY_PATTERNS = {
  dom: {
    read: [
      /document\.querySelector/,
      /document\.getElementById/,
      /document\.getElementsBy/,
      /element\.querySelector/,
      /\.innerHTML\s*(?!==)/,
      /\.textContent\s*(?!==)/,
      /\.getAttribute/,
      /window\.getComputedStyle/,
      /\.getBoundingClientRect/,
    ],
    write: [
      /document\.createElement/,
      /document\.createTextNode/,
      /\.innerHTML\s*=/,
      /\.textContent\s*=/,
      /\.setAttribute/,
      /\.appendChild/,
      /\.removeChild/,
      /\.replaceChild/,
      /\.insertBefore/,
      /\.remove\(/,
    ],
    style: [
      /\.style\./,
      /\.classList\./,
      /\.className\s*=/,
      /document\.styleSheets/,
    ],
  },
  network: {
    fetch: [
      /fetch\(/,
      /XMLHttpRequest/,
      /\.open\s*\(\s*['"](?:GET|POST|PUT|DELETE)/i,
    ],
    websocket: [
      /new\s+WebSocket/,
      /WebSocket\(/,
    ],
    beacon: [
      /navigator\.sendBeacon/,
    ],
  },
  storage: {
    localStorage: [
      /localStorage\./,
      /localStorage\[/,
    ],
    sessionStorage: [
      /sessionStorage\./,
      /sessionStorage\[/,
    ],
    indexedDB: [
      /indexedDB\./,
      /IDBDatabase/,
      /IDBTransaction/,
    ],
    cookie: [
      /document\.cookie/,
    ],
  },
  events: {
    publish: [
      /\.dispatchEvent/,
      /new\s+(?:Custom)?Event/,
      /EventBus\.publish/,
      /eventBus\.publish/,
    ],
    subscribe: [
      /\.addEventListener/,
      /EventBus\.subscribe/,
      /eventBus\.subscribe/,
    ],
  },
  media: {
    audio: [
      /new\s+Audio/,
      /AudioContext/,
      /AudioWorklet/,
      /createMediaElementSource/,
    ],
    video: [
      /HTMLVideoElement/,
      /\.play\(/,
      /\.pause\(/,
      /MediaStream/,
    ],
    canvas: [
      /getContext\s*\(\s*['"]2d['"]/,
      /getContext\s*\(\s*['"]webgl/,
      /CanvasRenderingContext/,
    ],
    getUserMedia: [
      /navigator\.mediaDevices\.getUserMedia/,
      /getUserMedia/,
    ],
  },
  worker: {
    create: [
      /new\s+Worker/,
      /new\s+SharedWorker/,
    ],
    message: [
      /postMessage/,
      /onmessage\s*=/,
    ],
  },
  crypto: {
    hash: [
      /crypto\.subtle\.digest/,
    ],
    random: [
      /crypto\.getRandomValues/,
      /Math\.random/,
    ],
    encrypt: [
      /crypto\.subtle\.encrypt/,
      /crypto\.subtle\.decrypt/,
    ],
  },
  timing: {
    setTimeout: [
      /setTimeout/,
    ],
    setInterval: [
      /setInterval/,
    ],
    requestAnimationFrame: [
      /requestAnimationFrame/,
    ],
  },
  eval: {
    eval: [
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /setTimeout\s*\(\s*['"`]/,
      /setInterval\s*\(\s*['"`]/,
    ],
  },
};

/**
 * Severity levels for different capability violations
 */
const CAPABILITY_SEVERITY = {
  eval: 'critical',
  network: 'high',
  storage: 'high',
  worker: 'high',
  crypto: 'medium',
  dom: 'medium',
  events: 'low',
  media: 'low',
  timing: 'low',
};

/**
 * CapabilityChecker class - Analyzes code for capability usage
 */
export class CapabilityChecker {
  constructor() {
    this.patterns = CAPABILITY_PATTERNS;
    this.severity = CAPABILITY_SEVERITY;
  }

  /**
   * Check if code bundle only uses declared capabilities
   * @param {string} code - JavaScript code to analyze
   * @param {CapabilityDeclaration} declared - Declared capabilities
   * @returns {CapabilityCheckResult} Check result with violations
   */
  check(code, declared) {
    const usedCapabilities = this.detectCapabilities(code);
    const violations = this.findViolations(code, usedCapabilities, declared);
    const warnings = this.generateWarnings(usedCapabilities, declared);

    return {
      allowed: violations.length === 0,
      violations,
      usedCapabilities: this.flattenCapabilities(usedCapabilities),
      declaredCapabilities: this.flattenCapabilities(declared),
      warnings,
    };
  }

  /**
   * Detect all capabilities used in code via static analysis
   * @param {string} code - JavaScript code to analyze
   * @returns {Object} Detected capabilities by category
   */
  detectCapabilities(code) {
    const detected = {};
    const lines = code.split('\n');

    for (const [category, subcategories] of Object.entries(this.patterns)) {
      detected[category] = [];

      for (const [capability, patterns] of Object.entries(subcategories)) {
        for (const pattern of patterns) {
          // Check each line for pattern matches
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
              if (!detected[category].includes(capability)) {
                detected[category].push(capability);
              }
            }
          }
        }
      }
    }

    return detected;
  }

  /**
   * Find violations where code uses undeclared capabilities
   * @param {string} code - JavaScript code
   * @param {Object} used - Used capabilities
   * @param {CapabilityDeclaration} declared - Declared capabilities
   * @returns {CapabilityViolation[]} List of violations
   */
  findViolations(code, used, declared) {
    const violations = [];
    const lines = code.split('\n');

    for (const [category, capabilities] of Object.entries(used)) {
      const declaredForCategory = declared[category] || [];

      for (const capability of capabilities) {
        // Check if capability is declared
        if (!declaredForCategory.includes(capability)) {
          // Find first occurrence for detailed violation info
          const patterns = this.patterns[category][capability];
          
          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            
            for (const pattern of patterns) {
              const match = line.match(pattern);
              if (match) {
                violations.push({
                  type: category,
                  capability,
                  line: lineNum + 1,
                  column: match.index + 1,
                  code: line.trim(),
                  severity: this.severity[category] || 'medium',
                });
                break; // Only report first occurrence per capability
              }
            }
            
            if (violations.some(v => v.capability === capability)) {
              break; // Move to next capability
            }
          }
        }
      }
    }

    return violations.sort((a, b) => {
      // Sort by severity, then by line number
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      return severityDiff !== 0 ? severityDiff : a.line - b.line;
    });
  }

  /**
   * Generate warnings for potentially unsafe patterns
   * @param {Object} used - Used capabilities
   * @param {CapabilityDeclaration} declared - Declared capabilities
   * @returns {string[]} List of warnings
   */
  generateWarnings(used, declared) {
    const warnings = [];

    // Warn about eval usage even if declared
    if (used.eval && used.eval.length > 0) {
      warnings.push(
        'Code uses eval() or Function constructor. This is highly discouraged even with declared capabilities.'
      );
    }

    // Warn about excessive capabilities
    const usedCount = this.flattenCapabilities(used).length;
    const declaredCount = this.flattenCapabilities(declared).length;
    
    if (declaredCount > usedCount + 5) {
      warnings.push(
        `Bundle declares ${declaredCount} capabilities but only uses ${usedCount}. Consider reducing declared capabilities.`
      );
    }

    // Warn about dangerous combinations
    if (used.network && used.storage) {
      warnings.push(
        'Code uses both network and storage capabilities. Ensure user data is not transmitted without consent.'
      );
    }

    return warnings;
  }

  /**
   * Flatten capability object to array of strings
   * @param {Object} capabilities - Capability object
   * @returns {string[]} Flattened capability list
   */
  flattenCapabilities(capabilities) {
    const flattened = [];
    for (const [category, caps] of Object.entries(capabilities)) {
      if (Array.isArray(caps)) {
        for (const cap of caps) {
          flattened.push(`${category}.${cap}`);
        }
      }
    }
    return flattened;
  }

  /**
   * Generate a capability declaration template from code analysis
   * @param {string} code - JavaScript code to analyze
   * @returns {CapabilityDeclaration} Suggested capability declaration
   */
  suggestCapabilities(code) {
    return this.detectCapabilities(code);
  }

  /**
   * Validate capability declaration format
   * @param {CapabilityDeclaration} declaration - Capability declaration to validate
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateDeclaration(declaration) {
    const errors = [];

    if (!declaration || typeof declaration !== 'object') {
      return { valid: false, errors: ['Declaration must be an object'] };
    }

    // Check each category
    for (const [category, capabilities] of Object.entries(declaration)) {
      if (!this.patterns[category]) {
        errors.push(`Unknown capability category: ${category}`);
        continue;
      }

      if (!Array.isArray(capabilities)) {
        errors.push(`Capabilities for ${category} must be an array`);
        continue;
      }

      // Check each capability in category
      for (const capability of capabilities) {
        if (!this.patterns[category][capability]) {
          errors.push(`Unknown capability: ${category}.${capability}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Create a new capability checker instance
 * @returns {CapabilityChecker} New checker instance
 */
export function createCapabilityChecker() {
  return new CapabilityChecker();
}

/**
 * Quick check function for inline usage
 * @param {string} code - JavaScript code to check
 * @param {CapabilityDeclaration} declared - Declared capabilities
 * @returns {CapabilityCheckResult} Check result
 */
export function checkCapabilities(code, declared) {
  const checker = new CapabilityChecker();
  return checker.check(code, declared);
}

// Singleton instance for global use
export const capabilityChecker = new CapabilityChecker();