/**
 * @fileoverview GraphDocGenerator - Generate documentation from graph schema and nodes
 * @module harmony-graph/graph-doc-generator
 * 
 * Generates human-readable documentation from graph schemas and node instances.
 * Supports multiple output formats (Markdown, HTML, JSON).
 * 
 * Related: harmony-graph/graph-introspector.js, harmony-graph/schema-validator.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Documentation Generation
 */

/**
 * @typedef {Object} DocGenerationOptions
 * @property {'markdown'|'html'|'json'} format - Output format
 * @property {boolean} includeExamples - Include example usage
 * @property {boolean} includeMetadata - Include schema metadata
 * @property {boolean} includeRelationships - Document edge types
 * @property {number} maxDepth - Maximum traversal depth for relationships
 */

/**
 * @typedef {Object} NodeDocumentation
 * @property {string} nodeType - Type of the node
 * @property {string} description - Human-readable description
 * @property {Object.<string, PropertyDoc>} properties - Property documentation
 * @property {Array<string>} requiredProperties - Required property names
 * @property {Array<EdgeDoc>} incomingEdges - Documented incoming edge types
 * @property {Array<EdgeDoc>} outgoingEdges - Documented outgoing edge types
 * @property {Array<string>} examples - Example node instances
 */

/**
 * @typedef {Object} PropertyDoc
 * @property {string} type - Property data type
 * @property {string} description - Property description
 * @property {boolean} required - Whether property is required
 * @property {*} defaultValue - Default value if any
 * @property {Array<string>} constraints - Validation constraints
 */

/**
 * @typedef {Object} EdgeDoc
 * @property {string} edgeType - Type of edge
 * @property {string} description - Edge description
 * @property {string} sourceType - Source node type
 * @property {string} targetType - Target node type
 * @property {Object.<string, PropertyDoc>} properties - Edge properties
 */

/**
 * GraphDocGenerator generates documentation from graph schemas and nodes
 */
export class GraphDocGenerator {
  /**
   * @param {Object} schema - Graph schema definition
   * @param {Object} [introspector=null] - Optional GraphIntrospector instance
   */
  constructor(schema, introspector = null) {
    /** @private */
    this.schema = schema;
    
    /** @private */
    this.introspector = introspector;
    
    /** @private */
    this.nodeTypeCache = new Map();
    
    /** @private */
    this.edgeTypeCache = new Map();
  }

  /**
   * Generate complete documentation for the graph schema
   * @param {DocGenerationOptions} [options={}] - Generation options
   * @returns {string} Generated documentation
   */
  generateDocumentation(options = {}) {
    const opts = {
      format: 'markdown',
      includeExamples: true,
      includeMetadata: true,
      includeRelationships: true,
      maxDepth: 2,
      ...options
    };

    const docs = this._buildDocumentationStructure(opts);

    switch (opts.format) {
      case 'markdown':
        return this._renderMarkdown(docs, opts);
      case 'html':
        return this._renderHTML(docs, opts);
      case 'json':
        return JSON.stringify(docs, null, 2);
      default:
        throw new Error(`Unsupported format: ${opts.format}`);
    }
  }

  /**
   * Generate documentation for a specific node type
   * @param {string} nodeType - Node type to document
   * @param {DocGenerationOptions} [options={}] - Generation options
   * @returns {NodeDocumentation} Node documentation
   */
  generateNodeDocumentation(nodeType, options = {}) {
    if (this.nodeTypeCache.has(nodeType)) {
      return this.nodeTypeCache.get(nodeType);
    }

    const nodeSchema = this._getNodeSchema(nodeType);
    if (!nodeSchema) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }

    const doc = {
      nodeType,
      description: nodeSchema.description || `${nodeType} node`,
      properties: this._documentProperties(nodeSchema.properties || {}),
      requiredProperties: nodeSchema.required || [],
      incomingEdges: this._documentIncomingEdges(nodeType),
      outgoingEdges: this._documentOutgoingEdges(nodeType),
      examples: options.includeExamples ? this._generateExamples(nodeType) : []
    };

    this.nodeTypeCache.set(nodeType, doc);
    return doc;
  }

  /**
   * Generate documentation for edge types
   * @param {DocGenerationOptions} [options={}] - Generation options
   * @returns {Array<EdgeDoc>} Edge documentation
   */
  generateEdgeDocumentation(options = {}) {
    const edges = this.schema.edges || {};
    return Object.entries(edges).map(([edgeType, edgeSchema]) => ({
      edgeType,
      description: edgeSchema.description || `${edgeType} edge`,
      sourceType: edgeSchema.source || '*',
      targetType: edgeSchema.target || '*',
      properties: this._documentProperties(edgeSchema.properties || {})
    }));
  }

  /**
   * Build complete documentation structure
   * @private
   * @param {DocGenerationOptions} options - Generation options
   * @returns {Object} Documentation structure
   */
  _buildDocumentationStructure(options) {
    const structure = {
      title: this.schema.title || 'Graph Schema Documentation',
      version: this.schema.version || '1.0.0',
      description: this.schema.description || '',
      metadata: options.includeMetadata ? this._extractMetadata() : null,
      nodeTypes: {},
      edgeTypes: options.includeRelationships ? this.generateEdgeDocumentation(options) : []
    };

    const nodeTypes = this.schema.nodes || {};
    for (const nodeType of Object.keys(nodeTypes)) {
      structure.nodeTypes[nodeType] = this.generateNodeDocumentation(nodeType, options);
    }

    return structure;
  }

  /**
   * Get node schema from schema definition
   * @private
   * @param {string} nodeType - Node type
   * @returns {Object|null} Node schema
   */
  _getNodeSchema(nodeType) {
    return this.schema.nodes?.[nodeType] || null;
  }

  /**
   * Document properties from schema
   * @private
   * @param {Object} properties - Property definitions
   * @returns {Object.<string, PropertyDoc>} Documented properties
   */
  _documentProperties(properties) {
    const docs = {};
    
    for (const [propName, propSchema] of Object.entries(properties)) {
      docs[propName] = {
        type: propSchema.type || 'any',
        description: propSchema.description || '',
        required: propSchema.required || false,
        defaultValue: propSchema.default,
        constraints: this._extractConstraints(propSchema)
      };
    }

    return docs;
  }

  /**
   * Extract validation constraints from property schema
   * @private
   * @param {Object} propSchema - Property schema
   * @returns {Array<string>} Constraint descriptions
   */
  _extractConstraints(propSchema) {
    const constraints = [];

    if (propSchema.minimum !== undefined) {
      constraints.push(`minimum: ${propSchema.minimum}`);
    }
    if (propSchema.maximum !== undefined) {
      constraints.push(`maximum: ${propSchema.maximum}`);
    }
    if (propSchema.minLength !== undefined) {
      constraints.push(`minLength: ${propSchema.minLength}`);
    }
    if (propSchema.maxLength !== undefined) {
      constraints.push(`maxLength: ${propSchema.maxLength}`);
    }
    if (propSchema.pattern) {
      constraints.push(`pattern: ${propSchema.pattern}`);
    }
    if (propSchema.enum) {
      constraints.push(`enum: [${propSchema.enum.join(', ')}]`);
    }

    return constraints;
  }

  /**
   * Document incoming edges for a node type
   * @private
   * @param {string} nodeType - Node type
   * @returns {Array<EdgeDoc>} Incoming edge documentation
   */
  _documentIncomingEdges(nodeType) {
    const edges = this.schema.edges || {};
    const incoming = [];

    for (const [edgeType, edgeSchema] of Object.entries(edges)) {
      const targetType = edgeSchema.target || '*';
      if (targetType === '*' || targetType === nodeType) {
        incoming.push({
          edgeType,
          description: edgeSchema.description || '',
          sourceType: edgeSchema.source || '*',
          targetType: nodeType,
          properties: this._documentProperties(edgeSchema.properties || {})
        });
      }
    }

    return incoming;
  }

  /**
   * Document outgoing edges for a node type
   * @private
   * @param {string} nodeType - Node type
   * @returns {Array<EdgeDoc>} Outgoing edge documentation
   */
  _documentOutgoingEdges(nodeType) {
    const edges = this.schema.edges || {};
    const outgoing = [];

    for (const [edgeType, edgeSchema] of Object.entries(edges)) {
      const sourceType = edgeSchema.source || '*';
      if (sourceType === '*' || sourceType === nodeType) {
        outgoing.push({
          edgeType,
          description: edgeSchema.description || '',
          sourceType: nodeType,
          targetType: edgeSchema.target || '*',
          properties: this._documentProperties(edgeSchema.properties || {})
        });
      }
    }

    return outgoing;
  }

  /**
   * Generate example nodes for a type
   * @private
   * @param {string} nodeType - Node type
   * @returns {Array<string>} Example JSON strings
   */
  _generateExamples(nodeType) {
    const nodeSchema = this._getNodeSchema(nodeType);
    if (!nodeSchema) return [];

    const example = {
      type: nodeType,
      id: `${nodeType.toLowerCase()}-example-1`
    };

    // Generate example properties
    const properties = nodeSchema.properties || {};
    for (const [propName, propSchema] of Object.entries(properties)) {
      example[propName] = this._generateExampleValue(propSchema);
    }

    return [JSON.stringify(example, null, 2)];
  }

  /**
   * Generate example value for a property
   * @private
   * @param {Object} propSchema - Property schema
   * @returns {*} Example value
   */
  _generateExampleValue(propSchema) {
    if (propSchema.default !== undefined) {
      return propSchema.default;
    }

    switch (propSchema.type) {
      case 'string':
        return propSchema.enum ? propSchema.enum[0] : 'example';
      case 'number':
      case 'integer':
        return propSchema.minimum || 0;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * Extract metadata from schema
   * @private
   * @returns {Object} Schema metadata
   */
  _extractMetadata() {
    return {
      version: this.schema.version,
      created: this.schema.created,
      modified: this.schema.modified,
      author: this.schema.author,
      tags: this.schema.tags || []
    };
  }

  /**
   * Render documentation as Markdown
   * @private
   * @param {Object} docs - Documentation structure
   * @param {DocGenerationOptions} options - Generation options
   * @returns {string} Markdown documentation
   */
  _renderMarkdown(docs, options) {
    let md = `# ${docs.title}\n\n`;
    
    if (docs.description) {
      md += `${docs.description}\n\n`;
    }

    if (docs.metadata && options.includeMetadata) {
      md += `## Metadata\n\n`;
      md += `- **Version:** ${docs.metadata.version || 'N/A'}\n`;
      if (docs.metadata.author) {
        md += `- **Author:** ${docs.metadata.author}\n`;
      }
      md += `\n`;
    }

    // Node types
    md += `## Node Types\n\n`;
    for (const [nodeType, nodeDoc] of Object.entries(docs.nodeTypes)) {
      md += this._renderNodeMarkdown(nodeDoc, options);
    }

    // Edge types
    if (options.includeRelationships && docs.edgeTypes.length > 0) {
      md += `## Edge Types\n\n`;
      for (const edgeDoc of docs.edgeTypes) {
        md += this._renderEdgeMarkdown(edgeDoc);
      }
    }

    return md;
  }

  /**
   * Render node documentation as Markdown
   * @private
   * @param {NodeDocumentation} nodeDoc - Node documentation
   * @param {DocGenerationOptions} options - Generation options
   * @returns {string} Markdown section
   */
  _renderNodeMarkdown(nodeDoc, options) {
    let md = `### ${nodeDoc.nodeType}\n\n`;
    md += `${nodeDoc.description}\n\n`;

    // Properties
    if (Object.keys(nodeDoc.properties).length > 0) {
      md += `#### Properties\n\n`;
      md += `| Property | Type | Required | Description |\n`;
      md += `|----------|------|----------|-------------|\n`;
      
      for (const [propName, propDoc] of Object.entries(nodeDoc.properties)) {
        const required = nodeDoc.requiredProperties.includes(propName) ? '✓' : '';
        md += `| ${propName} | ${propDoc.type} | ${required} | ${propDoc.description} |\n`;
      }
      md += `\n`;
    }

    // Relationships
    if (options.includeRelationships) {
      if (nodeDoc.outgoingEdges.length > 0) {
        md += `#### Outgoing Edges\n\n`;
        for (const edge of nodeDoc.outgoingEdges) {
          md += `- **${edge.edgeType}** → ${edge.targetType}: ${edge.description}\n`;
        }
        md += `\n`;
      }

      if (nodeDoc.incomingEdges.length > 0) {
        md += `#### Incoming Edges\n\n`;
        for (const edge of nodeDoc.incomingEdges) {
          md += `- ${edge.sourceType} → **${edge.edgeType}**: ${edge.description}\n`;
        }
        md += `\n`;
      }
    }

    // Examples
    if (options.includeExamples && nodeDoc.examples.length > 0) {
      md += `#### Example\n\n`;
      md += `\`\`\`json\n${nodeDoc.examples[0]}\n\`\`\`\n\n`;
    }

    return md;
  }

  /**
   * Render edge documentation as Markdown
   * @private
   * @param {EdgeDoc} edgeDoc - Edge documentation
   * @returns {string} Markdown section
   */
  _renderEdgeMarkdown(edgeDoc) {
    let md = `### ${edgeDoc.edgeType}\n\n`;
    md += `${edgeDoc.description}\n\n`;
    md += `- **Source:** ${edgeDoc.sourceType}\n`;
    md += `- **Target:** ${edgeDoc.targetType}\n\n`;

    if (Object.keys(edgeDoc.properties).length > 0) {
      md += `#### Properties\n\n`;
      md += `| Property | Type | Description |\n`;
      md += `|----------|------|-------------|\n`;
      
      for (const [propName, propDoc] of Object.entries(edgeDoc.properties)) {
        md += `| ${propName} | ${propDoc.type} | ${propDoc.description} |\n`;
      }
      md += `\n`;
    }

    return md;
  }

  /**
   * Render documentation as HTML
   * @private
   * @param {Object} docs - Documentation structure
   * @param {DocGenerationOptions} options - Generation options
   * @returns {string} HTML documentation
   */
  _renderHTML(docs, options) {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docs.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.5rem; }
    h2 { color: #333; margin-top: 2rem; }
    h3 { color: #555; margin-top: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background-color: #f5f5f5; font-weight: 600; }
    pre { background-color: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { font-family: 'Courier New', monospace; }
    .metadata { background-color: #f9f9f9; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>${docs.title}</h1>
`;

    if (docs.description) {
      html += `  <p>${docs.description}</p>\n`;
    }

    if (docs.metadata && options.includeMetadata) {
      html += `  <div class="metadata">
    <h2>Metadata</h2>
    <ul>
      <li><strong>Version:</strong> ${docs.metadata.version || 'N/A'}</li>
`;
      if (docs.metadata.author) {
        html += `      <li><strong>Author:</strong> ${docs.metadata.author}</li>\n`;
      }
      html += `    </ul>
  </div>\n`;
    }

    html += `  <h2>Node Types</h2>\n`;
    for (const [nodeType, nodeDoc] of Object.entries(docs.nodeTypes)) {
      html += this._renderNodeHTML(nodeDoc, options);
    }

    if (options.includeRelationships && docs.edgeTypes.length > 0) {
      html += `  <h2>Edge Types</h2>\n`;
      for (const edgeDoc of docs.edgeTypes) {
        html += this._renderEdgeHTML(edgeDoc);
      }
    }

    html += `</body>
</html>`;

    return html;
  }

  /**
   * Render node documentation as HTML
   * @private
   * @param {NodeDocumentation} nodeDoc - Node documentation
   * @param {DocGenerationOptions} options - Generation options
   * @returns {string} HTML section
   */
  _renderNodeHTML(nodeDoc, options) {
    let html = `  <h3>${nodeDoc.nodeType}</h3>
  <p>${nodeDoc.description}</p>\n`;

    if (Object.keys(nodeDoc.properties).length > 0) {
      html += `  <h4>Properties</h4>
  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th>Type</th>
        <th>Required</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
`;
      for (const [propName, propDoc] of Object.entries(nodeDoc.properties)) {
        const required = nodeDoc.requiredProperties.includes(propName) ? '✓' : '';
        html += `      <tr>
        <td><code>${propName}</code></td>
        <td>${propDoc.type}</td>
        <td>${required}</td>
        <td>${propDoc.description}</td>
      </tr>
`;
      }
      html += `    </tbody>
  </table>\n`;
    }

    if (options.includeExamples && nodeDoc.examples.length > 0) {
      html += `  <h4>Example</h4>
  <pre><code>${this._escapeHTML(nodeDoc.examples[0])}</code></pre>\n`;
    }

    return html;
  }

  /**
   * Render edge documentation as HTML
   * @private
   * @param {EdgeDoc} edgeDoc - Edge documentation
   * @returns {string} HTML section
   */
  _renderEdgeHTML(edgeDoc) {
    let html = `  <h3>${edgeDoc.edgeType}</h3>
  <p>${edgeDoc.description}</p>
  <ul>
    <li><strong>Source:</strong> ${edgeDoc.sourceType}</li>
    <li><strong>Target:</strong> ${edgeDoc.targetType}</li>
  </ul>\n`;

    return html;
  }

  /**
   * Escape HTML special characters
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  _escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear documentation cache
   */
  clearCache() {
    this.nodeTypeCache.clear();
    this.edgeTypeCache.clear();
  }
}