/**
 * Template Cache Module
 * 
 * Compiles and caches template nodes for efficient instantiation.
 * Compiled templates are optimized for cloning and binding.
 * 
 * Performance target: <2ms compilation, <1ms instantiation
 * 
 * Related: docs/architecture/template-storage-strategy.md
 * 
 * @module harmony-graph/template-cache
 */

/**
 * Compiled template structure
 * Ready for efficient cloning and instantiation
 * 
 * @typedef {Object} CompiledTemplate
 * @property {string} template_id - Template identifier
 * @property {HTMLTemplateElement} template_element - DOM template element
 * @property {Array<{path: string, attribute: string}>} bindings - Data binding points
 * @property {Object} shadow_config - Shadow DOM configuration
 * @property {Object} gpu_metadata - GPU acceleration metadata
 * @property {number} compiled_at - Compilation timestamp
 */

/**
 * Template cache manager
 * Handles compilation and caching of templates
 */
export class TemplateCache {
  constructor() {
    /** @type {Map<string, CompiledTemplate>} */
    this.cache = new Map();
    
    /** @type {Map<string, number>} */
    this.hitCount = new Map();
    
    this.maxCacheSize = 100; // Prevent unbounded growth
  }

  /**
   * Compile a template definition into optimized structure
   * 
   * @param {Object} templateDef - Template definition from storage
   * @returns {CompiledTemplate} Compiled template
   */
  compile(templateDef) {
    const startTime = performance.now();

    // Check cache first
    if (this.cache.has(templateDef.template_id)) {
      this._recordHit(templateDef.template_id);
      return this.cache.get(templateDef.template_id);
    }

    // Create HTMLTemplateElement
    const templateElement = document.createElement('template');
    const fragment = this._buildFragment(templateDef);
    templateElement.content.appendChild(fragment);

    // Extract binding points
    const bindings = this._extractBindings(templateElement.content);

    // Create compiled structure
    const compiled = {
      template_id: templateDef.template_id,
      template_element: templateElement,
      bindings,
      shadow_config: templateDef.shadow_config || null,
      gpu_metadata: templateDef.gpu_metadata || null,
      compiled_at: Date.now()
    };

    // Cache it
    this._cacheTemplate(templateDef.template_id, compiled);

    const compileTime = performance.now() - startTime;
    if (compileTime > 2) {
      console.warn(`Template compilation exceeded 2ms: ${templateDef.template_id} (${compileTime.toFixed(2)}ms)`);
    }

    return compiled;
  }

  /**
   * Get a compiled template from cache
   * 
   * @param {string} templateId - Template identifier
   * @returns {CompiledTemplate|null} Compiled template or null
   */
  get(templateId) {
    const compiled = this.cache.get(templateId);
    if (compiled) {
      this._recordHit(templateId);
    }
    return compiled || null;
  }

  /**
   * Clear the cache
   * 
   * @param {string} [templateId] - Optional specific template to clear
   */
  clear(templateId) {
    if (templateId) {
      this.cache.delete(templateId);
      this.hitCount.delete(templateId);
    } else {
      this.cache.clear();
      this.hitCount.clear();
    }
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache stats
   */
  getStats() {
    const totalHits = Array.from(this.hitCount.values()).reduce((sum, count) => sum + count, 0);
    const avgHits = totalHits / this.cache.size || 0;

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      totalHits,
      avgHitsPerTemplate: avgHits,
      templates: Array.from(this.cache.keys())
    };
  }

  /**
   * Build DOM fragment from template definition
   * 
   * @private
   * @param {Object} templateDef - Template definition
   * @returns {DocumentFragment} DOM fragment
   */
  _buildFragment(templateDef) {
    const element = document.createElement(templateDef.element_type);

    // Apply attributes
    for (const attr of templateDef.attributes) {
      element.setAttribute(attr.name, attr.value);
    }

    // Add slots
    for (const slot of templateDef.slots) {
      const slotElement = document.createElement('slot');
      if (slot.slot_name) {
        slotElement.name = slot.slot_name;
      }
      if (slot.fallback_content) {
        slotElement.textContent = slot.fallback_content;
      }
      element.appendChild(slotElement);
    }

    // Recursively add children (if they're inline)
    // Note: child node IDs are handled during instantiation
    
    const fragment = document.createDocumentFragment();
    fragment.appendChild(element);
    
    return fragment;
  }

  /**
   * Extract data binding points from template
   * 
   * @private
   * @param {DocumentFragment} content - Template content
   * @returns {Array<Object>} Binding point descriptors
   */
  _extractBindings(content) {
    const bindings = [];
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check attributes for binding syntax {{variable}}
        for (const attr of node.attributes) {
          if (attr.value.includes('{{')) {
            bindings.push({
              type: 'attribute',
              path: this._getNodePath(node, content),
              attribute: attr.name,
              expression: attr.value
            });
          }
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        // Check text content for binding syntax
        if (node.textContent.includes('{{')) {
          bindings.push({
            type: 'text',
            path: this._getNodePath(node, content),
            expression: node.textContent
          });
        }
      }
    }

    return bindings;
  }

  /**
   * Get path to node within fragment
   * 
   * @private
   * @param {Node} node - Target node
   * @param {DocumentFragment} root - Root fragment
   * @returns {string} Path descriptor
   */
  _getNodePath(node, root) {
    const path = [];
    let current = node;

    while (current && current !== root) {
      const parent = current.parentNode;
      if (parent) {
        const index = Array.from(parent.childNodes).indexOf(current);
        path.unshift(index);
      }
      current = parent;
    }

    return path.join('.');
  }

  /**
   * Cache a compiled template
   * 
   * @private
   * @param {string} templateId - Template identifier
   * @param {CompiledTemplate} compiled - Compiled template
   */
  _cacheTemplate(templateId, compiled) {
    // Evict least-used if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const leastUsed = this._findLeastUsed();
      if (leastUsed) {
        this.cache.delete(leastUsed);
        this.hitCount.delete(leastUsed);
      }
    }

    this.cache.set(templateId, compiled);
    this.hitCount.set(templateId, 0);
  }

  /**
   * Record cache hit
   * 
   * @private
   * @param {string} templateId - Template identifier
   */
  _recordHit(templateId) {
    const count = this.hitCount.get(templateId) || 0;
    this.hitCount.set(templateId, count + 1);
  }

  /**
   * Find least-used template for eviction
   * 
   * @private
   * @returns {string|null} Template ID or null
   */
  _findLeastUsed() {
    let minHits = Infinity;
    let leastUsed = null;

    for (const [templateId, hits] of this.hitCount.entries()) {
      if (hits < minHits) {
        minHits = hits;
        leastUsed = templateId;
      }
    }

    return leastUsed;
  }
}