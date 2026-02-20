/**
 * @fileoverview Semantic Design Inference Engine
 * Maps semantic intents (e.g., "lighter", "darker", "emphasized") to affected design properties
 * (e.g., bgcolor, text-color, shadows, borders)
 * 
 * @module core/semantic-design-inference
 * @see DESIGN_SYSTEM.md#semantic-design-inference
 */

/**
 * @typedef {Object} SemanticIntent
 * @property {string} intent - The semantic intent keyword (e.g., "lighter", "darker")
 * @property {number} [magnitude] - Optional magnitude (0-1 scale, default 0.5)
 * @property {string} [context] - Optional context (e.g., "background", "text", "border")
 */

/**
 * @typedef {Object} PropertyMapping
 * @property {string} property - CSS property name or design token category
 * @property {string} action - Action to perform (adjust, set, multiply, etc.)
 * @property {number} [weight] - Relative weight of this property (0-1)
 * @property {Function} [transformer] - Optional custom transformation function
 */

/**
 * @typedef {Object} InferenceResult
 * @property {string} intent - The original intent
 * @property {Array<PropertyMapping>} properties - Affected properties
 * @property {Object} suggestions - Suggested token values or adjustments
 * @property {number} confidence - Confidence score (0-1)
 */

/**
 * Semantic Design Inference Engine
 * Analyzes semantic intents and maps them to concrete design property changes
 */
class SemanticDesignInferenceEngine {
  constructor() {
    /**
     * @private
     * @type {Map<string, Array<PropertyMapping>>}
     */
    this.intentMappings = new Map();

    /**
     * @private
     * @type {Map<string, Array<string>>}
     */
    this.contextAliases = new Map();

    /**
     * @private
     * @type {Map<string, Function>}
     */
    this.transformers = new Map();

    this._initializeDefaultMappings();
    this._initializeContextAliases();
    this._initializeTransformers();
  }

  /**
   * Initialize default intent-to-property mappings
   * @private
   */
  _initializeDefaultMappings() {
    // Lightness intents
    this.intentMappings.set('lighter', [
      { property: 'background-color', action: 'lighten', weight: 1.0 },
      { property: 'color', action: 'lighten', weight: 0.8 },
      { property: 'box-shadow', action: 'soften', weight: 0.6 },
      { property: 'border-color', action: 'lighten', weight: 0.7 },
      { property: 'opacity', action: 'increase', weight: 0.5 }
    ]);

    this.intentMappings.set('darker', [
      { property: 'background-color', action: 'darken', weight: 1.0 },
      { property: 'color', action: 'darken', weight: 0.8 },
      { property: 'box-shadow', action: 'intensify', weight: 0.6 },
      { property: 'border-color', action: 'darken', weight: 0.7 },
      { property: 'opacity', action: 'decrease', weight: 0.5 }
    ]);

    // Emphasis intents
    this.intentMappings.set('emphasized', [
      { property: 'font-weight', action: 'increase', weight: 1.0 },
      { property: 'color', action: 'saturate', weight: 0.9 },
      { property: 'background-color', action: 'saturate', weight: 0.7 },
      { property: 'box-shadow', action: 'intensify', weight: 0.8 },
      { property: 'border-width', action: 'increase', weight: 0.6 },
      { property: 'transform', action: 'scale', weight: 0.4 }
    ]);

    this.intentMappings.set('subtle', [
      { property: 'font-weight', action: 'decrease', weight: 0.8 },
      { property: 'color', action: 'desaturate', weight: 0.9 },
      { property: 'background-color', action: 'desaturate', weight: 0.7 },
      { property: 'opacity', action: 'decrease', weight: 0.9 },
      { property: 'box-shadow', action: 'soften', weight: 0.8 },
      { property: 'border-width', action: 'decrease', weight: 0.6 }
    ]);

    // Contrast intents
    this.intentMappings.set('high-contrast', [
      { property: 'color', action: 'maximize-contrast', weight: 1.0 },
      { property: 'background-color', action: 'maximize-contrast', weight: 1.0 },
      { property: 'border-color', action: 'maximize-contrast', weight: 0.8 },
      { property: 'outline', action: 'add', weight: 0.7 }
    ]);

    this.intentMappings.set('low-contrast', [
      { property: 'color', action: 'minimize-contrast', weight: 1.0 },
      { property: 'background-color', action: 'minimize-contrast', weight: 1.0 },
      { property: 'border-color', action: 'minimize-contrast', weight: 0.8 }
    ]);

    // Size intents
    this.intentMappings.set('larger', [
      { property: 'font-size', action: 'scale-up', weight: 1.0 },
      { property: 'padding', action: 'scale-up', weight: 0.8 },
      { property: 'margin', action: 'scale-up', weight: 0.6 },
      { property: 'border-radius', action: 'scale-up', weight: 0.5 },
      { property: 'line-height', action: 'scale-up', weight: 0.7 }
    ]);

    this.intentMappings.set('smaller', [
      { property: 'font-size', action: 'scale-down', weight: 1.0 },
      { property: 'padding', action: 'scale-down', weight: 0.8 },
      { property: 'margin', action: 'scale-down', weight: 0.6 },
      { property: 'border-radius', action: 'scale-down', weight: 0.5 },
      { property: 'line-height', action: 'scale-down', weight: 0.7 }
    ]);

    // Spacing intents
    this.intentMappings.set('spacious', [
      { property: 'padding', action: 'increase', weight: 1.0 },
      { property: 'margin', action: 'increase', weight: 0.9 },
      { property: 'gap', action: 'increase', weight: 0.9 },
      { property: 'line-height', action: 'increase', weight: 0.7 }
    ]);

    this.intentMappings.set('compact', [
      { property: 'padding', action: 'decrease', weight: 1.0 },
      { property: 'margin', action: 'decrease', weight: 0.9 },
      { property: 'gap', action: 'decrease', weight: 0.9 },
      { property: 'line-height', action: 'decrease', weight: 0.7 }
    ]);

    // Depth intents
    this.intentMappings.set('elevated', [
      { property: 'box-shadow', action: 'elevate', weight: 1.0 },
      { property: 'transform', action: 'translateZ', weight: 0.8 },
      { property: 'z-index', action: 'increase', weight: 0.9 },
      { property: 'filter', action: 'brighten', weight: 0.5 }
    ]);

    this.intentMappings.set('flat', [
      { property: 'box-shadow', action: 'remove', weight: 1.0 },
      { property: 'transform', action: 'reset', weight: 0.8 },
      { property: 'border', action: 'add', weight: 0.6 }
    ]);

    // State intents
    this.intentMappings.set('interactive', [
      { property: 'cursor', action: 'set-pointer', weight: 1.0 },
      { property: 'transition', action: 'add-all', weight: 0.9 },
      { property: 'box-shadow', action: 'add-hover', weight: 0.7 },
      { property: 'transform', action: 'add-hover-scale', weight: 0.6 }
    ]);

    this.intentMappings.set('disabled', [
      { property: 'opacity', action: 'set-low', weight: 1.0 },
      { property: 'cursor', action: 'set-not-allowed', weight: 1.0 },
      { property: 'pointer-events', action: 'none', weight: 1.0 },
      { property: 'color', action: 'desaturate', weight: 0.8 }
    ]);

    // Color temperature intents
    this.intentMappings.set('warmer', [
      { property: 'color', action: 'shift-warm', weight: 1.0 },
      { property: 'background-color', action: 'shift-warm', weight: 0.9 },
      { property: 'border-color', action: 'shift-warm', weight: 0.7 }
    ]);

    this.intentMappings.set('cooler', [
      { property: 'color', action: 'shift-cool', weight: 1.0 },
      { property: 'background-color', action: 'shift-cool', weight: 0.9 },
      { property: 'border-color', action: 'shift-cool', weight: 0.7 }
    ]);

    // Saturation intents
    this.intentMappings.set('vibrant', [
      { property: 'color', action: 'saturate', weight: 1.0 },
      { property: 'background-color', action: 'saturate', weight: 0.9 },
      { property: 'border-color', action: 'saturate', weight: 0.7 },
      { property: 'filter', action: 'saturate', weight: 0.8 }
    ]);

    this.intentMappings.set('muted', [
      { property: 'color', action: 'desaturate', weight: 1.0 },
      { property: 'background-color', action: 'desaturate', weight: 0.9 },
      { property: 'border-color', action: 'desaturate', weight: 0.7 },
      { property: 'filter', action: 'desaturate', weight: 0.8 }
    ]);

    // Rounded intents
    this.intentMappings.set('rounded', [
      { property: 'border-radius', action: 'increase', weight: 1.0 }
    ]);

    this.intentMappings.set('sharp', [
      { property: 'border-radius', action: 'decrease', weight: 1.0 }
    ]);
  }

  /**
   * Initialize context aliases for more flexible matching
   * @private
   */
  _initializeContextAliases() {
    this.contextAliases.set('background', ['background-color', 'backdrop-filter']);
    this.contextAliases.set('text', ['color', 'font-weight', 'font-size', 'line-height']);
    this.contextAliases.set('border', ['border-color', 'border-width', 'border-style']);
    this.contextAliases.set('shadow', ['box-shadow', 'text-shadow', 'filter']);
    this.contextAliases.set('spacing', ['padding', 'margin', 'gap']);
    this.contextAliases.set('size', ['width', 'height', 'font-size']);
  }

  /**
   * Initialize transformation functions
   * @private
   */
  _initializeTransformers() {
    // Color transformers
    this.transformers.set('lighten', (value, magnitude = 0.5) => {
      return this._adjustColorLightness(value, magnitude);
    });

    this.transformers.set('darken', (value, magnitude = 0.5) => {
      return this._adjustColorLightness(value, -magnitude);
    });

    this.transformers.set('saturate', (value, magnitude = 0.5) => {
      return this._adjustColorSaturation(value, magnitude);
    });

    this.transformers.set('desaturate', (value, magnitude = 0.5) => {
      return this._adjustColorSaturation(value, -magnitude);
    });

    // Numeric transformers
    this.transformers.set('scale-up', (value, magnitude = 0.5) => {
      return this._scaleNumericValue(value, 1 + magnitude);
    });

    this.transformers.set('scale-down', (value, magnitude = 0.5) => {
      return this._scaleNumericValue(value, 1 - magnitude * 0.5);
    });

    this.transformers.set('increase', (value, magnitude = 0.5) => {
      return this._incrementNumericValue(value, magnitude);
    });

    this.transformers.set('decrease', (value, magnitude = 0.5) => {
      return this._incrementNumericValue(value, -magnitude);
    });
  }

  /**
   * Infer affected properties from a semantic intent
   * @param {SemanticIntent|string} intent - The semantic intent
   * @returns {InferenceResult} The inference result with affected properties
   */
  infer(intent) {
    const intentObj = typeof intent === 'string' 
      ? { intent, magnitude: 0.5, context: null }
      : intent;

    const { intent: intentName, magnitude = 0.5, context } = intentObj;

    // Get base mappings for the intent
    let mappings = this.intentMappings.get(intentName);

    if (!mappings) {
      return {
        intent: intentName,
        properties: [],
        suggestions: {},
        confidence: 0
      };
    }

    // Filter by context if provided
    if (context) {
      const contextProps = this.contextAliases.get(context) || [context];
      mappings = mappings.filter(m => 
        contextProps.some(cp => m.property.includes(cp))
      );
    }

    // Apply magnitude to weights
    const adjustedMappings = mappings.map(m => ({
      ...m,
      weight: m.weight * magnitude
    }));

    // Sort by weight (highest first)
    adjustedMappings.sort((a, b) => b.weight - a.weight);

    // Generate suggestions
    const suggestions = this._generateSuggestions(intentName, adjustedMappings, magnitude);

    // Calculate confidence based on mapping coverage
    const confidence = this._calculateConfidence(intentName, context, mappings.length);

    return {
      intent: intentName,
      properties: adjustedMappings,
      suggestions,
      confidence
    };
  }

  /**
   * Infer from multiple intents and merge results
   * @param {Array<SemanticIntent|string>} intents - Multiple semantic intents
   * @returns {InferenceResult} Merged inference result
   */
  inferMultiple(intents) {
    const results = intents.map(intent => this.infer(intent));
    
    // Merge property mappings
    const mergedProperties = new Map();
    
    results.forEach(result => {
      result.properties.forEach(prop => {
        const key = prop.property;
        if (mergedProperties.has(key)) {
          const existing = mergedProperties.get(key);
          existing.weight = Math.max(existing.weight, prop.weight);
        } else {
          mergedProperties.set(key, { ...prop });
        }
      });
    });

    // Merge suggestions
    const mergedSuggestions = {};
    results.forEach(result => {
      Object.assign(mergedSuggestions, result.suggestions);
    });

    // Average confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      intent: intents.map(i => typeof i === 'string' ? i : i.intent).join('+'),
      properties: Array.from(mergedProperties.values()).sort((a, b) => b.weight - a.weight),
      suggestions: mergedSuggestions,
      confidence: avgConfidence
    };
  }

  /**
   * Register a custom intent mapping
   * @param {string} intent - Intent name
   * @param {Array<PropertyMapping>} mappings - Property mappings
   */
  registerIntent(intent, mappings) {
    this.intentMappings.set(intent, mappings);
  }

  /**
   * Register a custom transformer function
   * @param {string} action - Action name
   * @param {Function} transformer - Transformation function
   */
  registerTransformer(action, transformer) {
    this.transformers.set(action, transformer);
  }

  /**
   * Get all registered intents
   * @returns {Array<string>} List of intent names
   */
  getRegisteredIntents() {
    return Array.from(this.intentMappings.keys());
  }

  /**
   * Get properties affected by an intent
   * @param {string} intent - Intent name
   * @returns {Array<string>} List of affected properties
   */
  getAffectedProperties(intent) {
    const mappings = this.intentMappings.get(intent);
    return mappings ? mappings.map(m => m.property) : [];
  }

  /**
   * Generate concrete value suggestions
   * @private
   * @param {string} intent - Intent name
   * @param {Array<PropertyMapping>} mappings - Property mappings
   * @param {number} magnitude - Intent magnitude
   * @returns {Object} Suggested values
   */
  _generateSuggestions(intent, mappings, magnitude) {
    const suggestions = {};

    mappings.forEach(mapping => {
      const transformer = this.transformers.get(mapping.action);
      if (transformer) {
        // Generate example transformation
        suggestions[mapping.property] = {
          action: mapping.action,
          magnitude: magnitude * mapping.weight,
          example: this._getExampleTransformation(mapping.property, mapping.action, magnitude)
        };
      } else {
        suggestions[mapping.property] = {
          action: mapping.action,
          magnitude: magnitude * mapping.weight
        };
      }
    });

    return suggestions;
  }

  /**
   * Get example transformation for documentation
   * @private
   * @param {string} property - CSS property
   * @param {string} action - Action name
   * @param {number} magnitude - Magnitude
   * @returns {string} Example transformation
   */
  _getExampleTransformation(property, action, magnitude) {
    const examples = {
      'background-color': {
        'lighten': `hsl(var(--h), var(--s), calc(var(--l) + ${magnitude * 20}%))`,
        'darken': `hsl(var(--h), var(--s), calc(var(--l) - ${magnitude * 20}%))`
      },
      'font-size': {
        'scale-up': `calc(var(--base-size) * ${1 + magnitude})`,
        'scale-down': `calc(var(--base-size) * ${1 - magnitude * 0.5})`
      },
      'padding': {
        'increase': `calc(var(--base-padding) + ${magnitude}rem)`,
        'decrease': `calc(var(--base-padding) - ${magnitude * 0.5}rem)`
      },
      'box-shadow': {
        'elevate': `0 ${magnitude * 8}px ${magnitude * 16}px rgba(0,0,0,${magnitude * 0.2})`,
        'soften': `0 2px 4px rgba(0,0,0,${magnitude * 0.05})`
      }
    };

    return examples[property]?.[action] || `${action} by ${magnitude}`;
  }

  /**
   * Calculate confidence score
   * @private
   * @param {string} intent - Intent name
   * @param {string|null} context - Context filter
   * @param {number} mappingCount - Number of mappings found
   * @returns {number} Confidence score (0-1)
   */
  _calculateConfidence(intent, context, mappingCount) {
    let confidence = 0.8; // Base confidence for known intent

    // Adjust for mapping coverage
    if (mappingCount === 0) return 0;
    if (mappingCount < 2) confidence *= 0.7;
    if (mappingCount > 5) confidence = Math.min(1.0, confidence * 1.1);

    // Adjust for context specificity
    if (context) {
      confidence *= 0.95; // Slightly lower for filtered context
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Adjust color lightness (simplified HSL adjustment)
   * @private
   * @param {string} color - Color value
   * @param {number} amount - Adjustment amount (-1 to 1)
   * @returns {string} Adjusted color expression
   */
  _adjustColorLightness(color, amount) {
    const percentage = Math.round(amount * 20);
    return `calc-lightness(${color}, ${percentage > 0 ? '+' : ''}${percentage}%)`;
  }

  /**
   * Adjust color saturation
   * @private
   * @param {string} color - Color value
   * @param {number} amount - Adjustment amount (-1 to 1)
   * @returns {string} Adjusted color expression
   */
  _adjustColorSaturation(color, amount) {
    const percentage = Math.round(amount * 30);
    return `calc-saturation(${color}, ${percentage > 0 ? '+' : ''}${percentage}%)`;
  }

  /**
   * Scale numeric value
   * @private
   * @param {string} value - Numeric value with unit
   * @param {number} scale - Scale factor
   * @returns {string} Scaled value expression
   */
  _scaleNumericValue(value, scale) {
    return `calc(${value} * ${scale.toFixed(3)})`;
  }

  /**
   * Increment numeric value
   * @private
   * @param {string} value - Numeric value with unit
   * @param {number} amount - Increment amount
   * @returns {string} Incremented value expression
   */
  _incrementNumericValue(value, amount) {
    const unit = value.match(/[a-z%]+$/)?.[0] || '';
    return `calc(${value} ${amount > 0 ? '+' : '-'} ${Math.abs(amount)}${unit})`;
  }
}

// Singleton instance
let inferenceEngineInstance = null;

/**
 * Get or create the singleton inference engine instance
 * @returns {SemanticDesignInferenceEngine}
 */
export function getInferenceEngine() {
  if (!inferenceEngineInstance) {
    inferenceEngineInstance = new SemanticDesignInferenceEngine();
  }
  return inferenceEngineInstance;
}

/**
 * Convenience function to infer from an intent
 * @param {SemanticIntent|string} intent - Semantic intent
 * @returns {InferenceResult}
 */
export function infer(intent) {
  return getInferenceEngine().infer(intent);
}

/**
 * Convenience function to infer from multiple intents
 * @param {Array<SemanticIntent|string>} intents - Multiple intents
 * @returns {InferenceResult}
 */
export function inferMultiple(intents) {
  return getInferenceEngine().inferMultiple(intents);
}

export { SemanticDesignInferenceEngine };