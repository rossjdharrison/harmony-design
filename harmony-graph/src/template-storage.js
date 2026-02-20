/**
 * Template Storage Module
 * 
 * Manages storage and retrieval of template nodes in the graph database.
 * Templates are stored as structured data, not raw HTML strings.
 * 
 * Related: docs/architecture/template-storage-strategy.md
 * 
 * @module harmony-graph/template-storage
 */

/**
 * Template storage manager
 * Handles CRUD operations for template nodes in the graph
 */
export class TemplateStorage {
  /**
   * @param {Object} graphDB - Graph database instance
   */
  constructor(graphDB) {
    this.graphDB = graphDB;
    this.templateIndex = new Map(); // template_id -> node_id
  }

  /**
   * Store a template in the graph
   * 
   * @param {Object} templateDef - Template definition
   * @param {string} templateDef.template_id - Unique template identifier
   * @param {string} templateDef.element_type - HTML element type
   * @param {Array<{name: string, value: string}>} templateDef.attributes - Element attributes
   * @param {Array<Object>} templateDef.slots - Slot definitions
   * @param {Array<string>} templateDef.children - Child node IDs
   * @param {Object} [templateDef.shadow_config] - Shadow DOM configuration
   * @param {Object} [templateDef.gpu_metadata] - GPU acceleration metadata
   * @returns {string} Node ID of stored template
   */
  store(templateDef) {
    // Validate template structure
    this._validateTemplate(templateDef);

    // Create graph node
    const nodeId = this.graphDB.createNode({
      node_type: 'template',
      data: templateDef,
      metadata: {
        created_at: Date.now(),
        version: 1
      }
    });

    // Index by template_id for fast lookup
    this.templateIndex.set(templateDef.template_id, nodeId);

    return nodeId;
  }

  /**
   * Retrieve a template by ID
   * 
   * @param {string} templateId - Template identifier
   * @returns {Object|null} Template definition or null if not found
   */
  get(templateId) {
    const nodeId = this.templateIndex.get(templateId);
    if (!nodeId) {
      return null;
    }

    const node = this.graphDB.getNode(nodeId);
    return node?.data || null;
  }

  /**
   * Update an existing template
   * 
   * @param {string} templateId - Template identifier
   * @param {Object} updates - Partial template updates
   * @returns {boolean} Success status
   */
  update(templateId, updates) {
    const nodeId = this.templateIndex.get(templateId);
    if (!nodeId) {
      return false;
    }

    const node = this.graphDB.getNode(nodeId);
    if (!node) {
      return false;
    }

    // Merge updates
    const updatedData = {
      ...node.data,
      ...updates
    };

    // Validate merged template
    this._validateTemplate(updatedData);

    // Update node
    this.graphDB.updateNode(nodeId, {
      data: updatedData,
      metadata: {
        ...node.metadata,
        updated_at: Date.now(),
        version: (node.metadata.version || 1) + 1
      }
    });

    return true;
  }

  /**
   * Delete a template
   * 
   * @param {string} templateId - Template identifier
   * @returns {boolean} Success status
   */
  delete(templateId) {
    const nodeId = this.templateIndex.get(templateId);
    if (!nodeId) {
      return false;
    }

    this.graphDB.deleteNode(nodeId);
    this.templateIndex.delete(templateId);

    return true;
  }

  /**
   * List all template IDs
   * 
   * @returns {Array<string>} Array of template identifiers
   */
  listTemplates() {
    return Array.from(this.templateIndex.keys());
  }

  /**
   * Build index from existing graph nodes
   * Call this after loading a graph from storage
   */
  rebuildIndex() {
    this.templateIndex.clear();

    const templateNodes = this.graphDB.queryNodes({
      node_type: 'template'
    });

    for (const node of templateNodes) {
      if (node.data?.template_id) {
        this.templateIndex.set(node.data.template_id, node.id);
      }
    }
  }

  /**
   * Validate template structure
   * 
   * @private
   * @param {Object} template - Template to validate
   * @throws {Error} If template is invalid
   */
  _validateTemplate(template) {
    if (!template.template_id) {
      throw new Error('Template must have template_id');
    }

    if (!template.element_type) {
      throw new Error('Template must have element_type');
    }

    if (!Array.isArray(template.attributes)) {
      throw new Error('Template attributes must be an array');
    }

    if (!Array.isArray(template.slots)) {
      throw new Error('Template slots must be an array');
    }

    if (!Array.isArray(template.children)) {
      throw new Error('Template children must be an array');
    }

    // Validate shadow config if present
    if (template.shadow_config) {
      const validModes = ['open', 'closed'];
      if (!validModes.includes(template.shadow_config.mode)) {
        throw new Error(`Invalid shadow mode: ${template.shadow_config.mode}`);
      }
    }

    // Validate slots
    for (const slot of template.slots) {
      if (typeof slot.slot_name !== 'string') {
        throw new Error('Slot must have string slot_name');
      }
      if (typeof slot.required !== 'boolean') {
        throw new Error('Slot must have boolean required');
      }
    }
  }

  /**
   * Export template as JSON (for serialization)
   * 
   * @param {string} templateId - Template identifier
   * @returns {string} JSON string
   */
  exportJSON(templateId) {
    const template = this.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   * 
   * @param {string} json - JSON string
   * @returns {string} Node ID of imported template
   */
  importJSON(json) {
    const template = JSON.parse(json);
    return this.store(template);
  }
}