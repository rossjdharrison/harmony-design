/**
 * @fileoverview Availability Query Engine Wrapper
 * @module harmony-graph/availability-query-engine
 * 
 * Provides a specialized query engine for checking node and edge availability
 * across the multi-graph system. Wraps the core query engine with availability-specific
 * operations.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#Graph-Query-Engine Graph Query Engine}
 * @see {@link file://./query-engine.ts Core Query Engine}
 */

import type { GraphNode, GraphEdge, QueryResult } from './types.js';
import { QueryEngine } from './query-engine.js';

/**
 * Availability status for a node or edge
 */
export interface AvailabilityStatus {
  /** Whether the entity is available */
  available: boolean;
  /** Reason for unavailability (if applicable) */
  reason?: string;
  /** Timestamp of last availability check */
  checkedAt: number;
  /** Dependencies that affect availability */
  dependencies?: string[];
}

/**
 * Availability query result
 */
export interface AvailabilityQueryResult {
  /** Node or edge ID */
  id: string;
  /** Availability status */
  status: AvailabilityStatus;
  /** Related entities that affect availability */
  relatedEntities?: Array<{
    id: string;
    type: 'node' | 'edge';
    available: boolean;
  }>;
}

/**
 * Availability query options
 */
export interface AvailabilityQueryOptions {
  /** Check dependencies recursively */
  checkDependencies?: boolean;
  /** Maximum depth for dependency checking */
  maxDepth?: number;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
  /** Include unavailable entities in results */
  includeUnavailable?: boolean;
}

/**
 * Availability Query Engine
 * 
 * Wraps the core query engine to provide availability-specific queries
 * for nodes and edges across the multi-graph system.
 * 
 * Performance targets:
 * - Single node check: <1ms
 * - Dependency tree check: <10ms for depth 3
 * - Batch availability check: <5ms per 100 nodes
 * 
 * @example
 * ```typescript
 * const engine = new AvailabilityQueryEngine(queryEngine);
 * 
 * // Check single node availability
 * const status = await engine.checkNodeAvailability('node-123');
 * 
 * // Check with dependencies
 * const result = await engine.checkNodeAvailability('node-123', {
 *   checkDependencies: true,
 *   maxDepth: 3
 * });
 * 
 * // Batch check multiple nodes
 * const results = await engine.checkBatchAvailability(['node-1', 'node-2']);
 * ```
 */
export class AvailabilityQueryEngine {
  private queryEngine: QueryEngine;
  private availabilityCache: Map<string, AvailabilityStatus>;
  private readonly defaultCacheDuration = 5000; // 5 seconds
  
  /**
   * Creates a new availability query engine
   * 
   * @param queryEngine - Core query engine instance to wrap
   */
  constructor(queryEngine: QueryEngine) {
    this.queryEngine = queryEngine;
    this.availabilityCache = new Map();
  }

  /**
   * Checks availability of a single node
   * 
   * @param nodeId - Node identifier
   * @param options - Query options
   * @returns Availability query result
   */
  async checkNodeAvailability(
    nodeId: string,
    options: AvailabilityQueryOptions = {}
  ): Promise<AvailabilityQueryResult> {
    const {
      checkDependencies = false,
      maxDepth = 3,
      cacheDuration = this.defaultCacheDuration
    } = options;

    // Check cache first
    const cached = this.getCachedStatus(nodeId, cacheDuration);
    if (cached) {
      return {
        id: nodeId,
        status: cached
      };
    }

    // Query the node
    const nodeResult = await this.queryEngine.queryById(nodeId);
    
    if (!nodeResult) {
      const status: AvailabilityStatus = {
        available: false,
        reason: 'Node not found',
        checkedAt: Date.now()
      };
      
      this.cacheStatus(nodeId, status);
      
      return {
        id: nodeId,
        status
      };
    }

    // Check node-specific availability
    const status = this.evaluateNodeAvailability(nodeResult);
    
    // Check dependencies if requested
    let relatedEntities: AvailabilityQueryResult['relatedEntities'];
    if (checkDependencies && maxDepth > 0) {
      relatedEntities = await this.checkDependencies(
        nodeId,
        maxDepth,
        options
      );
      
      // Update availability based on dependencies
      if (relatedEntities.some(entity => !entity.available)) {
        status.available = false;
        status.reason = 'Unavailable dependencies';
        status.dependencies = relatedEntities
          .filter(e => !e.available)
          .map(e => e.id);
      }
    }

    this.cacheStatus(nodeId, status);

    return {
      id: nodeId,
      status,
      relatedEntities
    };
  }

  /**
   * Checks availability of an edge
   * 
   * @param edgeId - Edge identifier
   * @param options - Query options
   * @returns Availability query result
   */
  async checkEdgeAvailability(
    edgeId: string,
    options: AvailabilityQueryOptions = {}
  ): Promise<AvailabilityQueryResult> {
    const { cacheDuration = this.defaultCacheDuration } = options;

    // Check cache
    const cached = this.getCachedStatus(edgeId, cacheDuration);
    if (cached) {
      return {
        id: edgeId,
        status: cached
      };
    }

    // Query the edge
    const edgeResult = await this.queryEngine.queryEdgeById(edgeId);
    
    if (!edgeResult) {
      const status: AvailabilityStatus = {
        available: false,
        reason: 'Edge not found',
        checkedAt: Date.now()
      };
      
      this.cacheStatus(edgeId, status);
      
      return {
        id: edgeId,
        status
      };
    }

    // Check source and target node availability
    const [sourceStatus, targetStatus] = await Promise.all([
      this.checkNodeAvailability(edgeResult.source, { cacheDuration }),
      this.checkNodeAvailability(edgeResult.target, { cacheDuration })
    ]);

    const status: AvailabilityStatus = {
      available: sourceStatus.status.available && targetStatus.status.available,
      reason: !sourceStatus.status.available
        ? `Source node unavailable: ${sourceStatus.status.reason}`
        : !targetStatus.status.available
        ? `Target node unavailable: ${targetStatus.status.reason}`
        : undefined,
      checkedAt: Date.now(),
      dependencies: [edgeResult.source, edgeResult.target]
    };

    this.cacheStatus(edgeId, status);

    return {
      id: edgeId,
      status,
      relatedEntities: [
        {
          id: edgeResult.source,
          type: 'node',
          available: sourceStatus.status.available
        },
        {
          id: edgeResult.target,
          type: 'node',
          available: targetStatus.status.available
        }
      ]
    };
  }

  /**
   * Checks availability of multiple entities in batch
   * 
   * @param ids - Array of entity identifiers
   * @param options - Query options
   * @returns Array of availability query results
   */
  async checkBatchAvailability(
    ids: string[],
    options: AvailabilityQueryOptions = {}
  ): Promise<AvailabilityQueryResult[]> {
    // Process in parallel for performance
    return Promise.all(
      ids.map(id => this.checkNodeAvailability(id, options))
    );
  }

  /**
   * Finds all available nodes matching a query
   * 
   * @param query - Query criteria
   * @param options - Query options
   * @returns Array of available nodes
   */
  async findAvailableNodes(
    query: Record<string, unknown>,
    options: AvailabilityQueryOptions = {}
  ): Promise<GraphNode[]> {
    const results = await this.queryEngine.query(query);
    
    if (!results || results.length === 0) {
      return [];
    }

    // Check availability for each result
    const availabilityChecks = await Promise.all(
      results.map(node => this.checkNodeAvailability(node.id, options))
    );

    // Filter to only available nodes
    return results.filter((node, index) => {
      const check = availabilityChecks[index];
      return options.includeUnavailable || check.status.available;
    });
  }

  /**
   * Clears the availability cache
   * 
   * @param nodeId - Optional specific node to clear (clears all if not provided)
   */
  clearCache(nodeId?: string): void {
    if (nodeId) {
      this.availabilityCache.delete(nodeId);
    } else {
      this.availabilityCache.clear();
    }
  }

  /**
   * Gets cache statistics
   * 
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.availabilityCache.size,
      entries: this.availabilityCache.size
    };
  }

  /**
   * Evaluates availability of a node based on its properties
   * 
   * @param node - Graph node to evaluate
   * @returns Availability status
   * @private
   */
  private evaluateNodeAvailability(node: GraphNode): AvailabilityStatus {
    const metadata = node.metadata || {};
    
    // Check if explicitly marked as unavailable
    if (metadata.available === false) {
      return {
        available: false,
        reason: metadata.unavailableReason || 'Explicitly marked unavailable',
        checkedAt: Date.now()
      };
    }

    // Check if archived or deleted
    if (metadata.archived || metadata.deleted) {
      return {
        available: false,
        reason: metadata.archived ? 'Node is archived' : 'Node is deleted',
        checkedAt: Date.now()
      };
    }

    // Default to available
    return {
      available: true,
      checkedAt: Date.now()
    };
  }

  /**
   * Recursively checks dependencies of a node
   * 
   * @param nodeId - Node to check dependencies for
   * @param maxDepth - Maximum recursion depth
   * @param options - Query options
   * @returns Related entities with availability status
   * @private
   */
  private async checkDependencies(
    nodeId: string,
    maxDepth: number,
    options: AvailabilityQueryOptions
  ): Promise<Array<{ id: string; type: 'node' | 'edge'; available: boolean }>> {
    if (maxDepth <= 0) {
      return [];
    }

    // Get edges from this node
    const edges = await this.queryEngine.queryEdges({
      source: nodeId
    });

    if (!edges || edges.length === 0) {
      return [];
    }

    const relatedEntities: Array<{
      id: string;
      type: 'node' | 'edge';
      available: boolean;
    }> = [];

    // Check each edge and its target
    for (const edge of edges) {
      // Check edge availability
      const edgeStatus = await this.checkEdgeAvailability(edge.id, options);
      relatedEntities.push({
        id: edge.id,
        type: 'edge',
        available: edgeStatus.status.available
      });

      // Check target node
      const targetStatus = await this.checkNodeAvailability(
        edge.target,
        { ...options, maxDepth: maxDepth - 1 }
      );
      relatedEntities.push({
        id: edge.target,
        type: 'node',
        available: targetStatus.status.available
      });

      // Add recursive dependencies
      if (targetStatus.relatedEntities) {
        relatedEntities.push(...targetStatus.relatedEntities);
      }
    }

    return relatedEntities;
  }

  /**
   * Gets cached availability status if valid
   * 
   * @param id - Entity identifier
   * @param cacheDuration - Cache validity duration in ms
   * @returns Cached status or null if not found/expired
   * @private
   */
  private getCachedStatus(
    id: string,
    cacheDuration: number
  ): AvailabilityStatus | null {
    const cached = this.availabilityCache.get(id);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.checkedAt;
    if (age > cacheDuration) {
      this.availabilityCache.delete(id);
      return null;
    }

    return cached;
  }

  /**
   * Caches availability status
   * 
   * @param id - Entity identifier
   * @param status - Availability status to cache
   * @private
   */
  private cacheStatus(id: string, status: AvailabilityStatus): void {
    this.availabilityCache.set(id, status);
  }
}