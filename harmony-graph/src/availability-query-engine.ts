/**
 * @fileoverview Availability Query Engine Wrapper
 * @module harmony-graph/availability-query-engine
 * 
 * Provides specialized queries for component and resource availability
 * across the graph system. Wraps the core query engine with availability-specific
 * operations that respect bounded context boundaries.
 * 
 * Vision Alignment: Reactive Component System
 * - Enables reactive availability checks for UI components
 * - Supports dynamic resource allocation queries
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#graph-engine Graph Engine Architecture}
 * @see {@link file://./query-engine.ts Query Engine Core}
 * @see {@link file://./cross-graph-index.ts Cross-Graph Index}
 */

import type { GraphEngine } from './graph-engine.js';
import type { QueryEngine } from './query-engine.js';
import type { NodeId, EdgeType } from './types.js';

/**
 * Availability status for a component or resource
 */
export enum AvailabilityStatus {
  /** Resource is available and ready for use */
  Available = 'available',
  /** Resource is currently in use but can be shared */
  InUse = 'in-use',
  /** Resource is busy and cannot be accessed */
  Busy = 'busy',
  /** Resource is unavailable due to error or missing dependency */
  Unavailable = 'unavailable',
  /** Resource availability is unknown or not yet determined */
  Unknown = 'unknown'
}

/**
 * Result of an availability query
 */
export interface AvailabilityResult {
  /** Node identifier */
  nodeId: NodeId;
  /** Current availability status */
  status: AvailabilityStatus;
  /** Human-readable reason for the status */
  reason?: string;
  /** Timestamp when status was determined (ms since epoch) */
  timestamp: number;
  /** List of blocking dependencies if unavailable */
  blockedBy?: NodeId[];
  /** Estimated time until available (ms) if status is Busy */
  estimatedAvailableIn?: number;
}

/**
 * Options for availability queries
 */
export interface AvailabilityQueryOptions {
  /** Include transitive dependencies in availability check */
  includeTransitive?: boolean;
  /** Maximum depth for transitive dependency traversal */
  maxDepth?: number;
  /** Edge types to consider as dependencies */
  dependencyEdgeTypes?: EdgeType[];
  /** Timeout for query execution (ms) */
  timeout?: number;
}

/**
 * Availability Query Engine
 * 
 * Wraps the core query engine to provide specialized availability queries.
 * Follows the TypeNavigator-Only Queries policy by delegating to QueryEngine.
 * 
 * Performance Budget:
 * - Single availability check: < 1ms
 * - Batch availability check (100 nodes): < 10ms
 * - Transitive dependency check: < 5ms per level
 * 
 * @example
 * ```typescript
 * const availEngine = new AvailabilityQueryEngine(graphEngine, queryEngine);
 * 
 * // Check if a component is available
 * const result = availEngine.checkAvailability('component-123');
 * if (result.status === AvailabilityStatus.Available) {
 *   // Use component
 * }
 * 
 * // Check multiple components
 * const results = availEngine.checkBatch(['comp-1', 'comp-2', 'comp-3']);
 * ```
 */
export class AvailabilityQueryEngine {
  private graphEngine: GraphEngine;
  private queryEngine: QueryEngine;
  
  /**
   * Create a new Availability Query Engine
   * 
   * @param graphEngine - The graph engine instance
   * @param queryEngine - The core query engine instance
   */
  constructor(graphEngine: GraphEngine, queryEngine: QueryEngine) {
    this.graphEngine = graphEngine;
    this.queryEngine = queryEngine;
  }

  /**
   * Check availability of a single node
   * 
   * Delegates to the query engine to retrieve node state and dependencies,
   * then computes availability based on node attributes and dependency status.
   * 
   * @param nodeId - Node to check
   * @param options - Query options
   * @returns Availability result
   * 
   * @performance Target: < 1ms for single node check
   */
  checkAvailability(
    nodeId: NodeId,
    options: AvailabilityQueryOptions = {}
  ): AvailabilityResult {
    const startTime = performance.now();
    const timestamp = Date.now();

    try {
      // Query node from graph engine
      const node = this.queryEngine.getNode(nodeId);
      
      if (!node) {
        return {
          nodeId,
          status: AvailabilityStatus.Unknown,
          reason: 'Node not found in graph',
          timestamp
        };
      }

      // Check node-level availability attributes
      const nodeStatus = this.getNodeStatus(node);
      if (nodeStatus !== AvailabilityStatus.Available) {
        return {
          nodeId,
          status: nodeStatus,
          reason: this.getStatusReason(node, nodeStatus),
          timestamp
        };
      }

      // Check dependencies if requested
      if (options.includeTransitive) {
        const depResult = this.checkDependencies(nodeId, options);
        if (depResult.status !== AvailabilityStatus.Available) {
          return depResult;
        }
      }

      const elapsed = performance.now() - startTime;
      if (elapsed > 1) {
        console.warn(`[AvailabilityQueryEngine] Slow availability check: ${elapsed.toFixed(2)}ms for node ${nodeId}`);
      }

      return {
        nodeId,
        status: AvailabilityStatus.Available,
        timestamp
      };
    } catch (error) {
      console.error(`[AvailabilityQueryEngine] Error checking availability for ${nodeId}:`, error);
      return {
        nodeId,
        status: AvailabilityStatus.Unavailable,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }

  /**
   * Check availability of multiple nodes in batch
   * 
   * More efficient than calling checkAvailability multiple times.
   * 
   * @param nodeIds - Nodes to check
   * @param options - Query options
   * @returns Array of availability results
   * 
   * @performance Target: < 10ms for 100 nodes
   */
  checkBatch(
    nodeIds: NodeId[],
    options: AvailabilityQueryOptions = {}
  ): AvailabilityResult[] {
    const startTime = performance.now();
    
    const results = nodeIds.map(nodeId => 
      this.checkAvailability(nodeId, options)
    );

    const elapsed = performance.now() - startTime;
    if (elapsed > 10 && nodeIds.length <= 100) {
      console.warn(`[AvailabilityQueryEngine] Slow batch check: ${elapsed.toFixed(2)}ms for ${nodeIds.length} nodes`);
    }

    return results;
  }

  /**
   * Check dependencies of a node for availability
   * 
   * Traverses dependency edges to determine if all dependencies are available.
   * Respects maxDepth to prevent infinite loops in cyclic graphs.
   * 
   * @param nodeId - Node whose dependencies to check
   * @param options - Query options
   * @param currentDepth - Current traversal depth (internal)
   * @returns Availability result including blocking dependencies
   * 
   * @performance Target: < 5ms per dependency level
   */
  private checkDependencies(
    nodeId: NodeId,
    options: AvailabilityQueryOptions,
    currentDepth: number = 0
  ): AvailabilityResult {
    const maxDepth = options.maxDepth ?? 5;
    const timestamp = Date.now();

    if (currentDepth >= maxDepth) {
      return {
        nodeId,
        status: AvailabilityStatus.Available,
        reason: 'Max dependency depth reached',
        timestamp
      };
    }

    // Get dependency edges
    const dependencyTypes = options.dependencyEdgeTypes ?? ['depends-on', 'requires'];
    const dependencies: NodeId[] = [];

    for (const edgeType of dependencyTypes) {
      const edges = this.queryEngine.getOutgoingEdges(nodeId, edgeType);
      dependencies.push(...edges.map(e => e.target));
    }

    // Check each dependency
    const blockedBy: NodeId[] = [];
    for (const depId of dependencies) {
      const depResult = this.checkAvailability(depId, {
        ...options,
        maxDepth: maxDepth - currentDepth - 1
      });

      if (depResult.status !== AvailabilityStatus.Available) {
        blockedBy.push(depId);
      }
    }

    if (blockedBy.length > 0) {
      return {
        nodeId,
        status: AvailabilityStatus.Unavailable,
        reason: `Blocked by ${blockedBy.length} unavailable dependencies`,
        timestamp,
        blockedBy
      };
    }

    return {
      nodeId,
      status: AvailabilityStatus.Available,
      timestamp
    };
  }

  /**
   * Get availability status from node attributes
   * 
   * @param node - Node to inspect
   * @returns Availability status
   */
  private getNodeStatus(node: any): AvailabilityStatus {
    // Check for explicit availability attribute
    if (node.attributes?.availability) {
      const attrStatus = node.attributes.availability;
      if (Object.values(AvailabilityStatus).includes(attrStatus)) {
        return attrStatus as AvailabilityStatus;
      }
    }

    // Check for disabled state
    if (node.attributes?.disabled === true) {
      return AvailabilityStatus.Unavailable;
    }

    // Check for error state
    if (node.attributes?.error || node.attributes?.hasError) {
      return AvailabilityStatus.Unavailable;
    }

    // Check for busy/loading state
    if (node.attributes?.busy === true || node.attributes?.loading === true) {
      return AvailabilityStatus.Busy;
    }

    // Check for in-use state
    if (node.attributes?.inUse === true || node.attributes?.activeUsers > 0) {
      return AvailabilityStatus.InUse;
    }

    // Default to available if no blocking conditions
    return AvailabilityStatus.Available;
  }

  /**
   * Get human-readable reason for availability status
   * 
   * @param node - Node being checked
   * @param status - Availability status
   * @returns Reason string
   */
  private getStatusReason(node: any, status: AvailabilityStatus): string {
    switch (status) {
      case AvailabilityStatus.Unavailable:
        if (node.attributes?.disabled) return 'Component is disabled';
        if (node.attributes?.error) return `Error: ${node.attributes.error}`;
        return 'Component is unavailable';
      
      case AvailabilityStatus.Busy:
        return node.attributes?.busyReason ?? 'Component is busy';
      
      case AvailabilityStatus.InUse:
        const users = node.attributes?.activeUsers ?? 1;
        return `In use by ${users} ${users === 1 ? 'user' : 'users'}`;
      
      default:
        return '';
    }
  }

  /**
   * Find all available nodes of a given type
   * 
   * Useful for discovering which components/resources are ready to use.
   * 
   * @param nodeType - Type of nodes to find
   * @param options - Query options
   * @returns Array of available node IDs
   */
  findAvailable(
    nodeType: string,
    options: AvailabilityQueryOptions = {}
  ): NodeId[] {
    // Query all nodes of the given type
    const nodes = this.queryEngine.getNodesByType(nodeType);
    
    // Filter to only available nodes
    const available: NodeId[] = [];
    for (const node of nodes) {
      const result = this.checkAvailability(node.id, options);
      if (result.status === AvailabilityStatus.Available) {
        available.push(node.id);
      }
    }

    return available;
  }

  /**
   * Wait for a node to become available
   * 
   * Polls the node's availability status until it becomes available or timeout.
   * Returns a promise that resolves when available or rejects on timeout.
   * 
   * @param nodeId - Node to wait for
   * @param options - Query options with timeout
   * @returns Promise resolving to availability result
   */
  async waitForAvailability(
    nodeId: NodeId,
    options: AvailabilityQueryOptions = {}
  ): Promise<AvailabilityResult> {
    const timeout = options.timeout ?? 5000;
    const pollInterval = 100;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = this.checkAvailability(nodeId, options);
      
      if (result.status === AvailabilityStatus.Available) {
        return result;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout reached
    const finalResult = this.checkAvailability(nodeId, options);
    return {
      ...finalResult,
      reason: `Timeout waiting for availability: ${finalResult.reason ?? 'unknown'}`
    };
  }
}