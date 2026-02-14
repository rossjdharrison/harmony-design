/**
 * @fileoverview Query Components Tool - Filters design system components by level, state, token usage
 * @module tools/query-components
 * 
 * Provides filtering capabilities for DesignSpecNodes in the graph.
 * Integrates with TypeNavigator for queries and EventBus for commands.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#query-components-tool
 */

import { EventBus } from '../../core/event-bus.js';
import { TypeNavigator } from '../../core/type-navigator.js';

/**
 * Valid component levels in the design system hierarchy
 * @typedef {'primitive'|'molecule'|'organism'|'template'} ComponentLevel
 */

/**
 * Valid lifecycle states for components
 * @typedef {'draft'|'design_complete'|'implementation_in_progress'|'implemented'|'deprecated'} ComponentState
 */

/**
 * Query filter options
 * @typedef {Object} QueryFilter
 * @property {ComponentLevel[]} [levels] - Filter by component levels
 * @property {ComponentState[]} [states] - Filter by lifecycle states
 * @property {Object} [tokenUsage] - Filter by token usage
 * @property {string[]} [tokenUsage.includes] - Must use these tokens
 * @property {string[]} [tokenUsage.excludes] - Must not use these tokens
 * @property {number} [tokenUsage.minCount] - Minimum number of tokens used
 * @property {number} [tokenUsage.maxCount] - Maximum number of tokens used
 */

/**
 * Query result item
 * @typedef {Object} QueryResult
 * @property {string} id - Component node ID
 * @property {string} name - Component name
 * @property {ComponentLevel} level - Component level
 * @property {ComponentState} state - Lifecycle state
 * @property {string[]} tokens - Tokens used by this component
 * @property {number} tokenCount - Number of tokens used
 */

/**
 * QueryComponents tool for filtering design system components
 */
export class QueryComponentsTool {
  /**
   * @param {TypeNavigator} typeNavigator - Graph query interface
   * @param {EventBus} eventBus - Event bus for commands
   */
  constructor(typeNavigator, eventBus) {
    if (!typeNavigator) {
      throw new Error('QueryComponentsTool requires TypeNavigator instance');
    }
    if (!eventBus) {
      throw new Error('QueryComponentsTool requires EventBus instance');
    }
    
    this.typeNavigator = typeNavigator;
    this.eventBus = eventBus;
    
    this._registerCommands();
  }

  /**
   * Register command handlers with EventBus
   * @private
   */
  _registerCommands() {
    this.eventBus.subscribe('QueryComponents', (event) => {
      try {
        const results = this.query(event.payload.filter);
        this.eventBus.publish({
          type: 'QueryComponentsComplete',
          payload: {
            requestId: event.payload.requestId,
            results,
            count: results.length
          },
          source: 'QueryComponentsTool'
        });
      } catch (error) {
        this.eventBus.publish({
          type: 'QueryComponentsError',
          payload: {
            requestId: event.payload.requestId,
            error: error.message
          },
          source: 'QueryComponentsTool'
        });
        console.error('QueryComponents error:', error);
      }
    });
  }

  /**
   * Query components with filters
   * @param {QueryFilter} filter - Filter criteria
   * @returns {QueryResult[]} Matching components
   */
  query(filter = {}) {
    // Get all DesignSpecNodes from graph
    const allComponents = this.typeNavigator.queryByType('DesignSpecNode');
    
    let results = allComponents;

    // Filter by level
    if (filter.levels && filter.levels.length > 0) {
      results = results.filter(node => 
        filter.levels.includes(node.properties.level)
      );
    }

    // Filter by state
    if (filter.states && filter.states.length > 0) {
      results = results.filter(node =>
        filter.states.includes(node.properties.state)
      );
    }

    // Filter by token usage
    if (filter.tokenUsage) {
      results = this._filterByTokenUsage(results, filter.tokenUsage);
    }

    // Transform to result format
    return results.map(node => this._nodeToResult(node));
  }

  /**
   * Filter components by token usage criteria
   * @private
   * @param {Object[]} nodes - Component nodes
   * @param {Object} tokenFilter - Token usage filter
   * @returns {Object[]} Filtered nodes
   */
  _filterByTokenUsage(nodes, tokenFilter) {
    return nodes.filter(node => {
      const tokens = this._getComponentTokens(node.id);
      const tokenCount = tokens.length;

      // Check includes
      if (tokenFilter.includes && tokenFilter.includes.length > 0) {
        const hasAllRequired = tokenFilter.includes.every(token =>
          tokens.includes(token)
        );
        if (!hasAllRequired) return false;
      }

      // Check excludes
      if (tokenFilter.excludes && tokenFilter.excludes.length > 0) {
        const hasAnyExcluded = tokenFilter.excludes.some(token =>
          tokens.includes(token)
        );
        if (hasAnyExcluded) return false;
      }

      // Check min count
      if (tokenFilter.minCount !== undefined && tokenCount < tokenFilter.minCount) {
        return false;
      }

      // Check max count
      if (tokenFilter.maxCount !== undefined && tokenCount > tokenFilter.maxCount) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get all tokens used by a component
   * @private
   * @param {string} componentId - Component node ID
   * @returns {string[]} Token IDs
   */
  _getComponentTokens(componentId) {
    // Query uses_token edges from this component
    const tokenEdges = this.typeNavigator.queryEdges({
      sourceId: componentId,
      edgeType: 'uses_token'
    });

    return tokenEdges.map(edge => edge.targetId);
  }

  /**
   * Transform node to query result format
   * @private
   * @param {Object} node - Graph node
   * @returns {QueryResult} Result object
   */
  _nodeToResult(node) {
    const tokens = this._getComponentTokens(node.id);
    
    return {
      id: node.id,
      name: node.properties.name || node.id,
      level: node.properties.level,
      state: node.properties.state,
      tokens: tokens,
      tokenCount: tokens.length
    };
  }

  /**
   * Get component statistics
   * @returns {Object} Statistics about components
   */
  getStatistics() {
    const allComponents = this.typeNavigator.queryByType('DesignSpecNode');
    
    const stats = {
      total: allComponents.length,
      byLevel: {},
      byState: {},
      tokenUsage: {
        min: Infinity,
        max: 0,
        average: 0
      }
    };

    let totalTokens = 0;

    allComponents.forEach(node => {
      // Count by level
      const level = node.properties.level;
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;

      // Count by state
      const state = node.properties.state;
      stats.byState[state] = (stats.byState[state] || 0) + 1;

      // Token usage stats
      const tokenCount = this._getComponentTokens(node.id).length;
      totalTokens += tokenCount;
      stats.tokenUsage.min = Math.min(stats.tokenUsage.min, tokenCount);
      stats.tokenUsage.max = Math.max(stats.tokenUsage.max, tokenCount);
    });

    stats.tokenUsage.average = allComponents.length > 0 
      ? totalTokens / allComponents.length 
      : 0;

    if (stats.tokenUsage.min === Infinity) {
      stats.tokenUsage.min = 0;
    }

    return stats;
  }
}