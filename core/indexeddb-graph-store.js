/**
 * @fileoverview IndexedDB Graph Store - Persists entire graph to IndexedDB for offline access
 * @module core/indexeddb-graph-store
 * 
 * Provides offline-first graph persistence with:
 * - Full graph serialization to IndexedDB
 * - Incremental updates for performance
 * - Version management and migrations
 * - Cross-graph edge indexing (Policy #22)
 * - Serializable to JSON format (Policy #27)
 * 
 * Architecture:
 * - Stores: nodes, edges, metadata, versions
 * - Indexes: node type, edge source/target, cross-graph edges
 * - Transaction-based updates for consistency
 * 
 * @see {@link ../DESIGN_SYSTEM.md#graph-persistence}
 */

/**
 * IndexedDB database configuration
 * @const {Object}
 */
const DB_CONFIG = {
  name: 'HarmonyGraphStore',
  version: 1,
  stores: {
    nodes: 'nodes',
    edges: 'edges',
    metadata: 'metadata',
    versions: 'versions'
  }
};

/**
 * IndexedDB Graph Store
 * Manages offline persistence of graph data with incremental updates
 * 
 * @class IndexedDBGraphStore
 * @example
 * const store = new IndexedDBGraphStore();
 * await store.initialize();
 * await store.persistGraph(graphData);
 * const graph = await store.loadGraph();
 */
export class IndexedDBGraphStore {
  /**
   * @constructor
   */
  constructor() {
    /** @type {IDBDatabase|null} */
    this.db = null;
    
    /** @type {boolean} */
    this.initialized = false;
    
    /** @type {Map<string, any>} */
    this.cache = new Map();
    
    /** @type {number} */
    this.version = DB_CONFIG.version;
  }

  /**
   * Initialize IndexedDB connection and create object stores
   * 
   * @returns {Promise<void>}
   * @throws {Error} If IndexedDB is not supported or initialization fails
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (!window.indexedDB) {
      throw new Error('IndexedDB is not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('[IndexedDBGraphStore] Initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this._createStores(db);
      };
    });
  }

  /**
   * Create object stores and indexes during database upgrade
   * 
   * @private
   * @param {IDBDatabase} db - Database instance
   */
  _createStores(db) {
    // Nodes store with indexes
    if (!db.objectStoreNames.contains(DB_CONFIG.stores.nodes)) {
      const nodeStore = db.createObjectStore(DB_CONFIG.stores.nodes, { 
        keyPath: 'id' 
      });
      nodeStore.createIndex('type', 'type', { unique: false });
      nodeStore.createIndex('graphId', 'graphId', { unique: false });
      nodeStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Edges store with indexes for cross-graph edge indexing (Policy #22)
    if (!db.objectStoreNames.contains(DB_CONFIG.stores.edges)) {
      const edgeStore = db.createObjectStore(DB_CONFIG.stores.edges, { 
        keyPath: 'id' 
      });
      edgeStore.createIndex('source', 'source', { unique: false });
      edgeStore.createIndex('target', 'target', { unique: false });
      edgeStore.createIndex('graphId', 'graphId', { unique: false });
      // Cross-graph edge index (Policy #22)
      edgeStore.createIndex('crossGraph', 'crossGraph', { unique: false });
      edgeStore.createIndex('sourceGraphId', 'sourceGraphId', { unique: false });
      edgeStore.createIndex('targetGraphId', 'targetGraphId', { unique: false });
    }

    // Metadata store for graph-level information
    if (!db.objectStoreNames.contains(DB_CONFIG.stores.metadata)) {
      db.createObjectStore(DB_CONFIG.stores.metadata, { 
        keyPath: 'graphId' 
      });
    }

    // Versions store for tracking changes
    if (!db.objectStoreNames.contains(DB_CONFIG.stores.versions)) {
      const versionStore = db.createObjectStore(DB_CONFIG.stores.versions, { 
        keyPath: 'id',
        autoIncrement: true
      });
      versionStore.createIndex('graphId', 'graphId', { unique: false });
      versionStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    console.log('[IndexedDBGraphStore] Object stores created');
  }

  /**
   * Persist entire graph to IndexedDB
   * Serializes graph to JSON format (Policy #27)
   * 
   * @param {Object} graphData - Complete graph data
   * @param {string} graphData.graphId - Unique graph identifier
   * @param {Array<Object>} graphData.nodes - Array of node objects
   * @param {Array<Object>} graphData.edges - Array of edge objects
   * @param {Object} [graphData.metadata] - Optional metadata
   * @returns {Promise<void>}
   * @throws {Error} If persistence fails
   */
  async persistGraph(graphData) {
    this._ensureInitialized();
    
    const { graphId, nodes, edges, metadata } = graphData;
    
    if (!graphId) {
      throw new Error('graphId is required');
    }

    const transaction = this.db.transaction(
      [DB_CONFIG.stores.nodes, DB_CONFIG.stores.edges, DB_CONFIG.stores.metadata, DB_CONFIG.stores.versions],
      'readwrite'
    );

    try {
      // Persist nodes
      const nodeStore = transaction.objectStore(DB_CONFIG.stores.nodes);
      for (const node of nodes || []) {
        const nodeData = {
          ...node,
          graphId,
          timestamp: Date.now()
        };
        await this._putInStore(nodeStore, nodeData);
      }

      // Persist edges with cross-graph indexing (Policy #22)
      const edgeStore = transaction.objectStore(DB_CONFIG.stores.edges);
      for (const edge of edges || []) {
        const edgeData = {
          ...edge,
          graphId,
          timestamp: Date.now(),
          // Mark cross-graph edges for indexing
          crossGraph: edge.sourceGraphId !== edge.targetGraphId,
          sourceGraphId: edge.sourceGraphId || graphId,
          targetGraphId: edge.targetGraphId || graphId
        };
        await this._putInStore(edgeStore, edgeData);
      }

      // Persist metadata
      const metadataStore = transaction.objectStore(DB_CONFIG.stores.metadata);
      const metadataData = {
        graphId,
        ...metadata,
        nodeCount: nodes?.length || 0,
        edgeCount: edges?.length || 0,
        lastUpdated: Date.now()
      };
      await this._putInStore(metadataStore, metadataData);

      // Create version entry
      const versionStore = transaction.objectStore(DB_CONFIG.stores.versions);
      const versionData = {
        graphId,
        timestamp: Date.now(),
        nodeCount: nodes?.length || 0,
        edgeCount: edges?.length || 0
      };
      await this._putInStore(versionStore, versionData);

      await this._completeTransaction(transaction);
      
      console.log(`[IndexedDBGraphStore] Persisted graph ${graphId}: ${nodes?.length || 0} nodes, ${edges?.length || 0} edges`);
    } catch (error) {
      transaction.abort();
      throw new Error(`Failed to persist graph: ${error.message}`);
    }
  }

  /**
   * Load entire graph from IndexedDB
   * 
   * @param {string} graphId - Graph identifier
   * @returns {Promise<Object>} Graph data with nodes, edges, and metadata
   * @throws {Error} If graph not found or load fails
   */
  async loadGraph(graphId) {
    this._ensureInitialized();

    const transaction = this.db.transaction(
      [DB_CONFIG.stores.nodes, DB_CONFIG.stores.edges, DB_CONFIG.stores.metadata],
      'readonly'
    );

    try {
      // Load nodes
      const nodeStore = transaction.objectStore(DB_CONFIG.stores.nodes);
      const nodeIndex = nodeStore.index('graphId');
      const nodes = await this._getAllFromIndex(nodeIndex, graphId);

      // Load edges
      const edgeStore = transaction.objectStore(DB_CONFIG.stores.edges);
      const edgeIndex = edgeStore.index('graphId');
      const edges = await this._getAllFromIndex(edgeIndex, graphId);

      // Load metadata
      const metadataStore = transaction.objectStore(DB_CONFIG.stores.metadata);
      const metadata = await this._getFromStore(metadataStore, graphId);

      if (!metadata) {
        throw new Error(`Graph ${graphId} not found`);
      }

      console.log(`[IndexedDBGraphStore] Loaded graph ${graphId}: ${nodes.length} nodes, ${edges.length} edges`);

      return {
        graphId,
        nodes,
        edges,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to load graph: ${error.message}`);
    }
  }

  /**
   * Update specific nodes incrementally
   * 
   * @param {string} graphId - Graph identifier
   * @param {Array<Object>} nodes - Nodes to update
   * @returns {Promise<void>}
   */
  async updateNodes(graphId, nodes) {
    this._ensureInitialized();

    const transaction = this.db.transaction(
      [DB_CONFIG.stores.nodes, DB_CONFIG.stores.metadata],
      'readwrite'
    );

    try {
      const nodeStore = transaction.objectStore(DB_CONFIG.stores.nodes);
      
      for (const node of nodes) {
        const nodeData = {
          ...node,
          graphId,
          timestamp: Date.now()
        };
        await this._putInStore(nodeStore, nodeData);
      }

      // Update metadata timestamp
      const metadataStore = transaction.objectStore(DB_CONFIG.stores.metadata);
      const metadata = await this._getFromStore(metadataStore, graphId);
      if (metadata) {
        metadata.lastUpdated = Date.now();
        await this._putInStore(metadataStore, metadata);
      }

      await this._completeTransaction(transaction);
      
      console.log(`[IndexedDBGraphStore] Updated ${nodes.length} nodes in graph ${graphId}`);
    } catch (error) {
      transaction.abort();
      throw new Error(`Failed to update nodes: ${error.message}`);
    }
  }

  /**
   * Update specific edges incrementally
   * 
   * @param {string} graphId - Graph identifier
   * @param {Array<Object>} edges - Edges to update
   * @returns {Promise<void>}
   */
  async updateEdges(graphId, edges) {
    this._ensureInitialized();

    const transaction = this.db.transaction(
      [DB_CONFIG.stores.edges, DB_CONFIG.stores.metadata],
      'readwrite'
    );

    try {
      const edgeStore = transaction.objectStore(DB_CONFIG.stores.edges);
      
      for (const edge of edges) {
        const edgeData = {
          ...edge,
          graphId,
          timestamp: Date.now(),
          crossGraph: edge.sourceGraphId !== edge.targetGraphId,
          sourceGraphId: edge.sourceGraphId || graphId,
          targetGraphId: edge.targetGraphId || graphId
        };
        await this._putInStore(edgeStore, edgeData);
      }

      // Update metadata timestamp
      const metadataStore = transaction.objectStore(DB_CONFIG.stores.metadata);
      const metadata = await this._getFromStore(metadataStore, graphId);
      if (metadata) {
        metadata.lastUpdated = Date.now();
        await this._putInStore(metadataStore, metadata);
      }

      await this._completeTransaction(transaction);
      
      console.log(`[IndexedDBGraphStore] Updated ${edges.length} edges in graph ${graphId}`);
    } catch (error) {
      transaction.abort();
      throw new Error(`Failed to update edges: ${error.message}`);
    }
  }

  /**
   * Query cross-graph edges (Policy #22)
   * 
   * @param {string} sourceGraphId - Source graph identifier
   * @param {string} targetGraphId - Target graph identifier
   * @returns {Promise<Array<Object>>} Cross-graph edges
   */
  async queryCrossGraphEdges(sourceGraphId, targetGraphId) {
    this._ensureInitialized();

    const transaction = this.db.transaction([DB_CONFIG.stores.edges], 'readonly');
    const edgeStore = transaction.objectStore(DB_CONFIG.stores.edges);
    const crossGraphIndex = edgeStore.index('crossGraph');
    
    // Get all cross-graph edges
    const allCrossGraphEdges = await this._getAllFromIndex(crossGraphIndex, true);
    
    // Filter by source and target graph IDs
    const filtered = allCrossGraphEdges.filter(edge => 
      edge.sourceGraphId === sourceGraphId && edge.targetGraphId === targetGraphId
    );

    console.log(`[IndexedDBGraphStore] Found ${filtered.length} cross-graph edges from ${sourceGraphId} to ${targetGraphId}`);
    
    return filtered;
  }

  /**
   * Delete entire graph
   * 
   * @param {string} graphId - Graph identifier
   * @returns {Promise<void>}
   */
  async deleteGraph(graphId) {
    this._ensureInitialized();

    const transaction = this.db.transaction(
      [DB_CONFIG.stores.nodes, DB_CONFIG.stores.edges, DB_CONFIG.stores.metadata, DB_CONFIG.stores.versions],
      'readwrite'
    );

    try {
      // Delete nodes
      const nodeStore = transaction.objectStore(DB_CONFIG.stores.nodes);
      const nodeIndex = nodeStore.index('graphId');
      await this._deleteAllFromIndex(nodeIndex, graphId);

      // Delete edges
      const edgeStore = transaction.objectStore(DB_CONFIG.stores.edges);
      const edgeIndex = edgeStore.index('graphId');
      await this._deleteAllFromIndex(edgeIndex, graphId);

      // Delete metadata
      const metadataStore = transaction.objectStore(DB_CONFIG.stores.metadata);
      await this._deleteFromStore(metadataStore, graphId);

      // Delete versions
      const versionStore = transaction.objectStore(DB_CONFIG.stores.versions);
      const versionIndex = versionStore.index('graphId');
      await this._deleteAllFromIndex(versionIndex, graphId);

      await this._completeTransaction(transaction);
      
      console.log(`[IndexedDBGraphStore] Deleted graph ${graphId}`);
    } catch (error) {
      transaction.abort();
      throw new Error(`Failed to delete graph: ${error.message}`);
    }
  }

  /**
   * List all stored graphs
   * 
   * @returns {Promise<Array<Object>>} Array of graph metadata
   */
  async listGraphs() {
    this._ensureInitialized();

    const transaction = this.db.transaction([DB_CONFIG.stores.metadata], 'readonly');
    const metadataStore = transaction.objectStore(DB_CONFIG.stores.metadata);
    
    const graphs = await this._getAllFromStore(metadataStore);
    
    console.log(`[IndexedDBGraphStore] Found ${graphs.length} stored graphs`);
    
    return graphs;
  }

  /**
   * Export graph to JSON (Policy #27)
   * 
   * @param {string} graphId - Graph identifier
   * @returns {Promise<string>} JSON string of graph data
   */
  async exportToJSON(graphId) {
    const graphData = await this.loadGraph(graphId);
    return JSON.stringify(graphData, null, 2);
  }

  /**
   * Import graph from JSON (Policy #27)
   * 
   * @param {string} jsonString - JSON string of graph data
   * @returns {Promise<void>}
   */
  async importFromJSON(jsonString) {
    const graphData = JSON.parse(jsonString);
    await this.persistGraph(graphData);
  }

  /**
   * Clear all data from IndexedDB
   * 
   * @returns {Promise<void>}
   */
  async clearAll() {
    this._ensureInitialized();

    const transaction = this.db.transaction(
      [DB_CONFIG.stores.nodes, DB_CONFIG.stores.edges, DB_CONFIG.stores.metadata, DB_CONFIG.stores.versions],
      'readwrite'
    );

    try {
      await this._clearStore(transaction.objectStore(DB_CONFIG.stores.nodes));
      await this._clearStore(transaction.objectStore(DB_CONFIG.stores.edges));
      await this._clearStore(transaction.objectStore(DB_CONFIG.stores.metadata));
      await this._clearStore(transaction.objectStore(DB_CONFIG.stores.versions));

      await this._completeTransaction(transaction);
      
      console.log('[IndexedDBGraphStore] Cleared all data');
    } catch (error) {
      transaction.abort();
      throw new Error(`Failed to clear all data: ${error.message}`);
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[IndexedDBGraphStore] Connection closed');
    }
  }

  // Private helper methods

  /**
   * Ensure store is initialized
   * @private
   * @throws {Error} If not initialized
   */
  _ensureInitialized() {
    if (!this.initialized || !this.db) {
      throw new Error('IndexedDBGraphStore not initialized. Call initialize() first.');
    }
  }

  /**
   * Put data in object store
   * @private
   * @param {IDBObjectStore} store - Object store
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   */
  _putInStore(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data from object store
   * @private
   * @param {IDBObjectStore} store - Object store
   * @param {string} key - Key to retrieve
   * @returns {Promise<Object|null>}
   */
  _getFromStore(store, key) {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data from object store
   * @private
   * @param {IDBObjectStore} store - Object store
   * @returns {Promise<Array<Object>>}
   */
  _getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data from index
   * @private
   * @param {IDBIndex} index - Index
   * @param {any} key - Key to query
   * @returns {Promise<Array<Object>>}
   */
  _getAllFromIndex(index, key) {
    return new Promise((resolve, reject) => {
      const request = index.getAll(key);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete data from object store
   * @private
   * @param {IDBObjectStore} store - Object store
   * @param {string} key - Key to delete
   * @returns {Promise<void>}
   */
  _deleteFromStore(store, key) {
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all data matching index key
   * @private
   * @param {IDBIndex} index - Index
   * @param {any} key - Key to match
   * @returns {Promise<void>}
   */
  async _deleteAllFromIndex(index, key) {
    const items = await this._getAllFromIndex(index, key);
    const store = index.objectStore;
    
    for (const item of items) {
      await this._deleteFromStore(store, item.id);
    }
  }

  /**
   * Clear object store
   * @private
   * @param {IDBObjectStore} store - Object store
   * @returns {Promise<void>}
   */
  _clearStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Complete transaction
   * @private
   * @param {IDBTransaction} transaction - Transaction
   * @returns {Promise<void>}
   */
  _completeTransaction(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
  }
}

/**
 * Create singleton instance
 * @type {IndexedDBGraphStore}
 */
export const graphStore = new IndexedDBGraphStore();