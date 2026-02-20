/**
 * @fileoverview Full-text search index for node properties
 * @module FullTextIndex
 * 
 * Provides full-text search capabilities for graph node properties with:
 * - Multiple tokenization strategies (whitespace, alphanumeric, n-gram)
 * - TF-IDF-based ranking
 * - Case-sensitive/insensitive search
 * - Configurable result limits
 * 
 * Performance targets:
 * - Index creation: < 5ms for 1000 documents
 * - Search: < 10ms for 10000 documents
 * - Memory: < 5MB per 10000 documents
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#full-text-index
 */

import { loadWasmModule } from '../wasm-bridge/wasm-bridge.js';

/** @type {WebAssembly.Instance | null} */
let wasmInstance = null;

/**
 * @typedef {Object} IndexConfig
 * @property {string} indexId - Unique identifier for the index
 * @property {string} propertyName - Name of the node property to index
 * @property {'whitespace' | 'alphanumeric' | 'ngram'} [tokenizer='alphanumeric'] - Tokenization strategy
 * @property {boolean} [caseSensitive=false] - Whether search is case-sensitive
 * @property {number} [minTokenLength=2] - Minimum token length to index
 * @property {number} [maxResults=100] - Maximum number of search results
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} nodeId - ID of the matching node
 * @property {number} score - Relevance score (higher is better)
 * @property {string[]} matches - Matched tokens
 */

/**
 * Initialize the WASM module
 * @returns {Promise<void>}
 */
async function initWasm() {
  if (!wasmInstance) {
    wasmInstance = await loadWasmModule('full-text-index');
  }
}

/**
 * Create a new full-text index
 * @param {IndexConfig} config - Index configuration
 * @returns {Promise<{success: boolean, indexId?: string, error?: string}>}
 */
export async function createIndex(config) {
  await initWasm();
  
  if (!config.indexId || !config.propertyName) {
    return {
      success: false,
      error: 'indexId and propertyName are required'
    };
  }

  const configJson = JSON.stringify(config);
  const resultJson = wasmInstance.exports.create_index(configJson);
  return JSON.parse(resultJson);
}

/**
 * Add a document to the index
 * @param {string} indexId - Index identifier
 * @param {string} nodeId - Node identifier
 * @param {string} content - Text content to index
 * @returns {Promise<{success: boolean, nodeId?: string, tokenCount?: number, error?: string}>}
 */
export async function addDocument(indexId, nodeId, content) {
  await initWasm();
  
  if (!indexId || !nodeId || content === undefined) {
    return {
      success: false,
      error: 'indexId, nodeId, and content are required'
    };
  }

  const resultJson = wasmInstance.exports.add_document(indexId, nodeId, content);
  return JSON.parse(resultJson);
}

/**
 * Remove a document from the index
 * @param {string} indexId - Index identifier
 * @param {string} nodeId - Node identifier
 * @returns {Promise<{success: boolean, nodeId?: string, error?: string}>}
 */
export async function removeDocument(indexId, nodeId) {
  await initWasm();
  
  if (!indexId || !nodeId) {
    return {
      success: false,
      error: 'indexId and nodeId are required'
    };
  }

  const resultJson = wasmInstance.exports.remove_document(indexId, nodeId);
  return JSON.parse(resultJson);
}

/**
 * Search the index
 * @param {string} indexId - Index identifier
 * @param {string} query - Search query
 * @returns {Promise<{success: boolean, results?: SearchResult[], queryTokens?: string[], error?: string}>}
 */
export async function search(indexId, query) {
  await initWasm();
  
  if (!indexId || !query) {
    return {
      success: false,
      error: 'indexId and query are required'
    };
  }

  const resultJson = wasmInstance.exports.search(indexId, query);
  return JSON.parse(resultJson);
}

/**
 * Clear all documents from the index
 * @param {string} indexId - Index identifier
 * @returns {Promise<{success: boolean, indexId?: string, error?: string}>}
 */
export async function clearIndex(indexId) {
  await initWasm();
  
  if (!indexId) {
    return {
      success: false,
      error: 'indexId is required'
    };
  }

  const resultJson = wasmInstance.exports.clear_index(indexId);
  return JSON.parse(resultJson);
}

/**
 * Batch add multiple documents to the index
 * @param {string} indexId - Index identifier
 * @param {Array<{nodeId: string, content: string}>} documents - Documents to add
 * @returns {Promise<{success: boolean, added: number, failed: number, errors?: string[]}>}
 */
export async function batchAddDocuments(indexId, documents) {
  await initWasm();
  
  let added = 0;
  let failed = 0;
  const errors = [];

  for (const doc of documents) {
    const result = await addDocument(indexId, doc.nodeId, doc.content);
    if (result.success) {
      added++;
    } else {
      failed++;
      errors.push(`${doc.nodeId}: ${result.error}`);
    }
  }

  return {
    success: failed === 0,
    added,
    failed,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Get index statistics
 * @param {string} indexId - Index identifier
 * @returns {Promise<{exists: boolean, documentCount?: number, tokenCount?: number}>}
 */
export async function getIndexStats(indexId) {
  // This is a placeholder - actual implementation would need to be added to Rust
  return {
    exists: true,
    documentCount: 0,
    tokenCount: 0
  };
}