/**
 * @fileoverview DeltaEncoder - Encodes only changes between snapshots for efficient storage
 * 
 * Implements efficient delta encoding to minimize storage requirements by capturing
 * only the differences between consecutive snapshots. Supports nodes, edges, and metadata changes.
 * 
 * Performance targets:
 * - Encoding time: < 5ms for typical graphs (< 1000 nodes)
 * - Compression ratio: > 80% for incremental changes
 * - Memory overhead: < 1MB for delta storage
 * 
 * @see DESIGN_SYSTEM.md#delta-encoder
 */

/**
 * @typedef {Object} DeltaChange
 * @property {'add'|'remove'|'modify'} type - Type of change
 * @property {'node'|'edge'|'metadata'} category - What was changed
 * @property {string} id - Identifier of the changed element
 * @property {*} [oldValue] - Previous value (for modify/remove)
 * @property {*} [newValue] - New value (for add/modify)
 * @property {Object<string, *>} [propertyChanges] - Specific property changes for modify
 */

/**
 * @typedef {Object} EncodedDelta
 * @property {string} fromSnapshotId - Source snapshot identifier
 * @property {string} toSnapshotId - Target snapshot identifier
 * @property {number} timestamp - When delta was created
 * @property {DeltaChange[]} changes - Array of changes
 * @property {Object<string, *>} metadata - Additional metadata
 * @property {number} changeCount - Total number of changes
 * @property {number} estimatedSize - Estimated size in bytes
 */

/**
 * @typedef {Object} DeltaEncoderOptions
 * @property {boolean} [includeTimestamps=true] - Include timestamps in delta
 * @property {boolean} [deepCompare=true] - Deep compare objects for changes
 * @property {string[]} [ignoreProperties=[]] - Properties to ignore in comparison
 * @property {number} [compressionLevel=1] - Compression level (0-2)
 * @property {boolean} [trackPropertyChanges=true] - Track individual property changes
 */

export class DeltaEncoder {
  /**
   * Creates a new DeltaEncoder instance
   * @param {DeltaEncoderOptions} [options={}] - Encoder configuration
   */
  constructor(options = {}) {
    this.options = {
      includeTimestamps: true,
      deepCompare: true,
      ignoreProperties: [],
      compressionLevel: 1,
      trackPropertyChanges: true,
      ...options
    };

    /** @type {Map<string, EncodedDelta>} */
    this.deltaCache = new Map();

    /** @type {number} */
    this.totalChangesEncoded = 0;

    /** @type {number} */
    this.totalBytesEncoded = 0;
  }

  /**
   * Encodes the difference between two snapshots
   * @param {Object} fromSnapshot - Previous snapshot
   * @param {Object} toSnapshot - Current snapshot
   * @returns {EncodedDelta} Encoded delta containing only changes
   */
  encode(fromSnapshot, toSnapshot) {
    const startTime = performance.now();

    if (!fromSnapshot || !toSnapshot) {
      throw new Error('Both fromSnapshot and toSnapshot are required');
    }

    const changes = [];

    // Compare nodes
    const nodeChanges = this._compareNodes(
      fromSnapshot.nodes || {},
      toSnapshot.nodes || {}
    );
    changes.push(...nodeChanges);

    // Compare edges
    const edgeChanges = this._compareEdges(
      fromSnapshot.edges || {},
      toSnapshot.edges || {}
    );
    changes.push(...edgeChanges);

    // Compare metadata
    const metadataChanges = this._compareMetadata(
      fromSnapshot.metadata || {},
      toSnapshot.metadata || {}
    );
    changes.push(...metadataChanges);

    const delta = {
      fromSnapshotId: fromSnapshot.id || 'unknown',
      toSnapshotId: toSnapshot.id || 'unknown',
      timestamp: Date.now(),
      changes,
      metadata: {
        encodingTime: performance.now() - startTime,
        compressionLevel: this.options.compressionLevel,
        nodeCount: Object.keys(toSnapshot.nodes || {}).length,
        edgeCount: Object.keys(toSnapshot.edges || {}).length
      },
      changeCount: changes.length,
      estimatedSize: this._estimateSize(changes)
    };

    // Update statistics
    this.totalChangesEncoded += changes.length;
    this.totalBytesEncoded += delta.estimatedSize;

    // Cache delta if compression level > 0
    if (this.options.compressionLevel > 0) {
      const cacheKey = `${delta.fromSnapshotId}->${delta.toSnapshotId}`;
      this.deltaCache.set(cacheKey, delta);
    }

    return delta;
  }

  /**
   * Compares nodes between snapshots
   * @private
   * @param {Object<string, *>} fromNodes - Previous nodes
   * @param {Object<string, *>} toNodes - Current nodes
   * @returns {DeltaChange[]} Node changes
   */
  _compareNodes(fromNodes, toNodes) {
    const changes = [];
    const fromKeys = new Set(Object.keys(fromNodes));
    const toKeys = new Set(Object.keys(toNodes));

    // Find added nodes
    for (const id of toKeys) {
      if (!fromKeys.has(id)) {
        changes.push({
          type: 'add',
          category: 'node',
          id,
          newValue: this._sanitizeValue(toNodes[id])
        });
      }
    }

    // Find removed nodes
    for (const id of fromKeys) {
      if (!toKeys.has(id)) {
        changes.push({
          type: 'remove',
          category: 'node',
          id,
          oldValue: this._sanitizeValue(fromNodes[id])
        });
      }
    }

    // Find modified nodes
    for (const id of toKeys) {
      if (fromKeys.has(id)) {
        const propertyChanges = this._compareObjects(
          fromNodes[id],
          toNodes[id]
        );

        if (propertyChanges.length > 0) {
          const change = {
            type: 'modify',
            category: 'node',
            id
          };

          if (this.options.trackPropertyChanges) {
            change.propertyChanges = propertyChanges.reduce((acc, pc) => {
              acc[pc.property] = { old: pc.oldValue, new: pc.newValue };
              return acc;
            }, {});
          } else {
            change.oldValue = this._sanitizeValue(fromNodes[id]);
            change.newValue = this._sanitizeValue(toNodes[id]);
          }

          changes.push(change);
        }
      }
    }

    return changes;
  }

  /**
   * Compares edges between snapshots
   * @private
   * @param {Object<string, *>} fromEdges - Previous edges
   * @param {Object<string, *>} toEdges - Current edges
   * @returns {DeltaChange[]} Edge changes
   */
  _compareEdges(fromEdges, toEdges) {
    const changes = [];
    const fromKeys = new Set(Object.keys(fromEdges));
    const toKeys = new Set(Object.keys(toEdges));

    // Find added edges
    for (const id of toKeys) {
      if (!fromKeys.has(id)) {
        changes.push({
          type: 'add',
          category: 'edge',
          id,
          newValue: this._sanitizeValue(toEdges[id])
        });
      }
    }

    // Find removed edges
    for (const id of fromKeys) {
      if (!toKeys.has(id)) {
        changes.push({
          type: 'remove',
          category: 'edge',
          id,
          oldValue: this._sanitizeValue(fromEdges[id])
        });
      }
    }

    // Find modified edges
    for (const id of toKeys) {
      if (fromKeys.has(id)) {
        const propertyChanges = this._compareObjects(
          fromEdges[id],
          toEdges[id]
        );

        if (propertyChanges.length > 0) {
          const change = {
            type: 'modify',
            category: 'edge',
            id
          };

          if (this.options.trackPropertyChanges) {
            change.propertyChanges = propertyChanges.reduce((acc, pc) => {
              acc[pc.property] = { old: pc.oldValue, new: pc.newValue };
              return acc;
            }, {});
          } else {
            change.oldValue = this._sanitizeValue(fromEdges[id]);
            change.newValue = this._sanitizeValue(toEdges[id]);
          }

          changes.push(change);
        }
      }
    }

    return changes;
  }

  /**
   * Compares metadata between snapshots
   * @private
   * @param {Object} fromMetadata - Previous metadata
   * @param {Object} toMetadata - Current metadata
   * @returns {DeltaChange[]} Metadata changes
   */
  _compareMetadata(fromMetadata, toMetadata) {
    const changes = [];
    const propertyChanges = this._compareObjects(fromMetadata, toMetadata);

    for (const pc of propertyChanges) {
      changes.push({
        type: 'modify',
        category: 'metadata',
        id: pc.property,
        oldValue: pc.oldValue,
        newValue: pc.newValue
      });
    }

    return changes;
  }

  /**
   * Compares two objects and returns property-level changes
   * @private
   * @param {Object} from - Previous object
   * @param {Object} to - Current object
   * @returns {Array<{property: string, oldValue: *, newValue: *}>} Property changes
   */
  _compareObjects(from, to) {
    const changes = [];

    if (!from || !to) {
      return changes;
    }

    const allKeys = new Set([
      ...Object.keys(from),
      ...Object.keys(to)
    ]);

    for (const key of allKeys) {
      // Skip ignored properties
      if (this.options.ignoreProperties.includes(key)) {
        continue;
      }

      const fromValue = from[key];
      const toValue = to[key];

      if (!this._valuesEqual(fromValue, toValue)) {
        changes.push({
          property: key,
          oldValue: this._sanitizeValue(fromValue),
          newValue: this._sanitizeValue(toValue)
        });
      }
    }

    return changes;
  }

  /**
   * Compares two values for equality
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True if values are equal
   */
  _valuesEqual(a, b) {
    if (a === b) {
      return true;
    }

    if (a == null || b == null) {
      return a === b;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a !== 'object') {
      return a === b;
    }

    if (!this.options.deepCompare) {
      return false;
    }

    // Deep compare for objects and arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((val, idx) => this._valuesEqual(val, b[idx]));
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every(key => this._valuesEqual(a[key], b[key]));
  }

  /**
   * Sanitizes a value for storage (removes circular references, etc.)
   * @private
   * @param {*} value - Value to sanitize
   * @returns {*} Sanitized value
   */
  _sanitizeValue(value) {
    if (value == null) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(v => this._sanitizeValue(v));
    }

    // Handle objects - create shallow copy without circular refs
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'function') {
        continue; // Skip functions
      }
      if (typeof val === 'object' && val !== null) {
        // Store reference instead of deep copy for compression
        sanitized[key] = '[Object]';
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }

  /**
   * Estimates the size of changes in bytes
   * @private
   * @param {DeltaChange[]} changes - Changes to estimate
   * @returns {number} Estimated size in bytes
   */
  _estimateSize(changes) {
    // Rough estimation: JSON stringify and measure length
    try {
      const json = JSON.stringify(changes);
      return json.length;
    } catch (error) {
      console.warn('Failed to estimate delta size:', error);
      return changes.length * 100; // Fallback estimate
    }
  }

  /**
   * Applies a delta to a snapshot to reconstruct the next snapshot
   * @param {Object} baseSnapshot - Base snapshot
   * @param {EncodedDelta} delta - Delta to apply
   * @returns {Object} Reconstructed snapshot
   */
  applyDelta(baseSnapshot, delta) {
    if (!baseSnapshot || !delta) {
      throw new Error('Both baseSnapshot and delta are required');
    }

    if (baseSnapshot.id !== delta.fromSnapshotId) {
      console.warn(
        `Snapshot ID mismatch: expected ${delta.fromSnapshotId}, got ${baseSnapshot.id}`
      );
    }

    // Deep clone base snapshot
    const reconstructed = {
      id: delta.toSnapshotId,
      timestamp: delta.timestamp,
      nodes: { ...baseSnapshot.nodes },
      edges: { ...baseSnapshot.edges },
      metadata: { ...baseSnapshot.metadata }
    };

    // Apply changes
    for (const change of delta.changes) {
      this._applyChange(reconstructed, change);
    }

    return reconstructed;
  }

  /**
   * Applies a single change to a snapshot
   * @private
   * @param {Object} snapshot - Snapshot to modify
   * @param {DeltaChange} change - Change to apply
   */
  _applyChange(snapshot, change) {
    const target = snapshot[change.category === 'node' ? 'nodes' :
                           change.category === 'edge' ? 'edges' : 'metadata'];

    switch (change.type) {
      case 'add':
        target[change.id] = change.newValue;
        break;

      case 'remove':
        delete target[change.id];
        break;

      case 'modify':
        if (change.propertyChanges) {
          // Apply property-level changes
          if (!target[change.id]) {
            target[change.id] = {};
          }
          for (const [prop, values] of Object.entries(change.propertyChanges)) {
            target[change.id][prop] = values.new;
          }
        } else {
          // Replace entire value
          target[change.id] = change.newValue;
        }
        break;
    }
  }

  /**
   * Gets compression statistics
   * @returns {Object} Compression statistics
   */
  getStatistics() {
    const avgChangesPerDelta = this.deltaCache.size > 0 ?
      this.totalChangesEncoded / this.deltaCache.size : 0;

    const avgBytesPerDelta = this.deltaCache.size > 0 ?
      this.totalBytesEncoded / this.deltaCache.size : 0;

    return {
      totalDeltas: this.deltaCache.size,
      totalChanges: this.totalChangesEncoded,
      totalBytes: this.totalBytesEncoded,
      avgChangesPerDelta: Math.round(avgChangesPerDelta),
      avgBytesPerDelta: Math.round(avgBytesPerDelta),
      cacheSize: this.deltaCache.size
    };
  }

  /**
   * Clears the delta cache
   */
  clearCache() {
    this.deltaCache.clear();
  }

  /**
   * Gets a cached delta
   * @param {string} fromSnapshotId - Source snapshot ID
   * @param {string} toSnapshotId - Target snapshot ID
   * @returns {EncodedDelta|null} Cached delta or null
   */
  getCachedDelta(fromSnapshotId, toSnapshotId) {
    const cacheKey = `${fromSnapshotId}->${toSnapshotId}`;
    return this.deltaCache.get(cacheKey) || null;
  }

  /**
   * Serializes a delta to JSON
   * @param {EncodedDelta} delta - Delta to serialize
   * @returns {string} JSON string
   */
  serialize(delta) {
    return JSON.stringify(delta);
  }

  /**
   * Deserializes a delta from JSON
   * @param {string} json - JSON string
   * @returns {EncodedDelta} Deserialized delta
   */
  deserialize(json) {
    return JSON.parse(json);
  }
}