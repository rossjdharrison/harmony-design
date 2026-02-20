/**
 * GraphQL Resolvers for Harmony Graph Structure
 * 
 * Implements resolver functions that bridge GraphQL queries to the graph engine.
 * Uses TypeNavigator pattern for all graph queries.
 * 
 * Related: harmony-graph/type-navigator.js, harmony-graph/graph-engine.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Query Interface
 * 
 * @module harmony-graph/graphql/resolvers
 */

import { TypeNavigator } from '../type-navigator.js';
import { GraphEngine } from '../graph-engine.js';

/**
 * Create GraphQL resolvers for the graph schema
 * @param {GraphEngine} graphEngine - Instance of graph engine
 * @param {TypeNavigator} typeNavigator - Instance of type navigator
 * @returns {Object} Resolver map for GraphQL execution
 */
export function createResolvers(graphEngine, typeNavigator) {
  return {
    Query: {
      /**
       * Get single node by ID
       */
      node: (parent, { id }) => {
        return typeNavigator.getNode(id);
      },

      /**
       * Get multiple nodes by IDs
       */
      nodes: (parent, { ids }) => {
        return ids.map(id => typeNavigator.getNode(id)).filter(Boolean);
      },

      /**
       * Search nodes with filtering
       */
      searchNodes: (parent, { filter, sortBy, sortOrder, limit, offset }) => {
        return typeNavigator.queryNodes(filter, {
          sortBy,
          sortOrder: sortOrder?.toLowerCase(),
          limit,
          offset
        });
      },

      /**
       * Get single edge by ID
       */
      edge: (parent, { id }) => {
        return typeNavigator.getEdge(id);
      },

      /**
       * Search edges with filtering
       */
      searchEdges: (parent, { filter, limit, offset }) => {
        return typeNavigator.queryEdges(filter, { limit, offset });
      },

      /**
       * Find shortest path between nodes
       */
      shortestPath: (parent, { fromId, toId, edgeType, maxDepth }) => {
        return typeNavigator.findShortestPath(fromId, toId, {
          edgeType,
          maxDepth
        });
      },

      /**
       * Find all paths between nodes
       */
      allPaths: (parent, { fromId, toId, edgeType, maxDepth, limit }) => {
        return typeNavigator.findAllPaths(fromId, toId, {
          edgeType,
          maxDepth,
          limit
        });
      },

      /**
       * Traverse graph from starting node
       */
      traverse: (parent, { startId, direction, edgeType, maxDepth, breadthFirst }) => {
        return typeNavigator.traverse(startId, {
          direction: direction?.toLowerCase(),
          edgeType,
          maxDepth,
          breadthFirst
        });
      },

      /**
       * Get nodes by type
       */
      nodesByType: (parent, { type, limit, offset }) => {
        return typeNavigator.getNodesByType(type, { limit, offset });
      },

      /**
       * Get edges by type
       */
      edgesByType: (parent, { type, limit, offset }) => {
        return typeNavigator.getEdgesByType(type, { limit, offset });
      },

      /**
       * Get graph statistics
       */
      stats: () => {
        return typeNavigator.getGraphStats();
      },

      /**
       * Get current graph version
       */
      currentVersion: () => {
        return graphEngine.getCurrentVersion();
      },

      /**
       * Get snapshot by version
       */
      snapshot: (parent, { version }) => {
        return typeNavigator.getSnapshot(version);
      },

      /**
       * Get all snapshots
       */
      snapshots: (parent, { limit, offset }) => {
        return typeNavigator.getSnapshots({ limit, offset });
      },

      /**
       * Get transaction history
       */
      transactions: (parent, { type, after, before, limit, offset }) => {
        return typeNavigator.getTransactions({
          type,
          after,
          before,
          limit,
          offset
        });
      },

      /**
       * Check if path exists
       */
      hasPath: (parent, { fromId, toId, maxDepth }) => {
        return typeNavigator.hasPath(fromId, toId, maxDepth);
      },

      /**
       * Find connected component
       */
      connectedComponent: (parent, { nodeId }) => {
        return typeNavigator.getConnectedComponent(nodeId);
      },

      /**
       * Detect cycles
       */
      detectCycles: () => {
        return typeNavigator.detectCycles();
      }
    },

    Node: {
      /**
       * Resolve outgoing edges for a node
       */
      outgoingEdges: (node, { type, limit, offset }) => {
        return typeNavigator.getOutgoingEdges(node.id, {
          type,
          limit,
          offset
        });
      },

      /**
       * Resolve incoming edges for a node
       */
      incomingEdges: (node, { type, limit, offset }) => {
        return typeNavigator.getIncomingEdges(node.id, {
          type,
          limit,
          offset
        });
      },

      /**
       * Resolve neighbors for a node
       */
      neighbors: (node, { direction, edgeType, limit }) => {
        return typeNavigator.getNeighbors(node.id, {
          direction: direction?.toLowerCase(),
          edgeType,
          limit
        });
      }
    },

    Edge: {
      /**
       * Resolve source node for an edge
       */
      from: (edge) => {
        return typeNavigator.getNode(edge.fromId);
      },

      /**
       * Resolve target node for an edge
       */
      to: (edge) => {
        return typeNavigator.getNode(edge.toId);
      }
    },

    Subscription: {
      /**
       * Subscribe to node changes
       */
      nodeChanged: {
        subscribe: (parent, { type, nodeIds }) => {
          return graphEngine.subscribeToNodeChanges({ type, nodeIds });
        }
      },

      /**
       * Subscribe to edge changes
       */
      edgeChanged: {
        subscribe: (parent, { type }) => {
          return graphEngine.subscribeToEdgeChanges({ type });
        }
      },

      /**
       * Subscribe to version changes
       */
      versionChanged: {
        subscribe: () => {
          return graphEngine.subscribeToVersionChanges();
        }
      },

      /**
       * Subscribe to transaction completion
       */
      transactionCompleted: {
        subscribe: () => {
          return graphEngine.subscribeToTransactions();
        }
      }
    }
  };
}

/**
 * Scalar resolver for DateTime
 */
export const DateTimeScalar = {
  serialize: (value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue: (value) => {
    return new Date(value);
  },
  parseLiteral: (ast) => {
    if (ast.kind === 'StringValue') {
      return new Date(ast.value);
    }
    return null;
  }
};

/**
 * Scalar resolver for JSON
 */
export const JSONScalar = {
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === 'StringValue') {
      return JSON.parse(ast.value);
    }
    return null;
  }
};