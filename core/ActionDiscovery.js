/**
 * @fileoverview Action Discovery System
 * Discovers available actions from the Intent Graph dynamically instead of using hardcoded lists.
 * Integrates with TypeNavigator for graph queries and EventBus for action execution.
 * 
 * @see DESIGN_SYSTEM.md#action-discovery
 */

/**
 * Action Discovery Service
 * Queries the Intent Graph to discover available actions based on context.
 * 
 * @class ActionDiscovery
 * 
 * @example
 * const discovery = new ActionDiscovery(typeNavigator, eventBus);
 * const actions = await discovery.discoverActions({ context: 'audio-track' });
 * // Returns: [{ id: 'play', label: 'Play', icon: 'play', ... }]
 */
export class ActionDiscovery {
  /**
   * @param {Object} typeNavigator - TypeNavigator instance for graph queries
   * @param {Object} eventBus - EventBus instance for command execution
   */
  constructor(typeNavigator, eventBus) {
    this.typeNavigator = typeNavigator;
    this.eventBus = eventBus;
    this.cache = new Map();
    this.cacheTimeout = 5000; // 5 seconds cache
  }

  /**
   * Discover available actions for a given context
   * 
   * @param {Object} options - Discovery options
   * @param {string} options.context - Context identifier (e.g., 'audio-track', 'clip', 'project')
   * @param {string} [options.entityId] - Specific entity ID for context-aware discovery
   * @param {Object} [options.state] - Current state for conditional actions
   * @param {string[]} [options.tags] - Filter actions by tags
   * @returns {Promise<Array<Action>>} Discovered actions
   * 
   * @typedef {Object} Action
   * @property {string} id - Unique action identifier
   * @property {string} label - Human-readable label
   * @property {string} [icon] - Icon identifier
   * @property {string} [shortcut] - Keyboard shortcut
   * @property {string} commandType - EventBus command type
   * @property {Object} [commandPayload] - Default command payload
   * @property {boolean} [disabled] - Whether action is currently disabled
   * @property {string} [disabledReason] - Why action is disabled
   * @property {number} [priority] - Display priority (higher = more prominent)
   * @property {string[]} [tags] - Action tags for filtering
   */
  async discoverActions(options) {
    const { context, entityId, state = {}, tags = [] } = options;
    
    // Check cache
    const cacheKey = this._getCacheKey(options);
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Query graph for action nodes related to context
      const actionNodes = await this._queryActionsFromGraph(context, tags);
      
      // Filter and enrich actions based on current state
      const actions = await this._processActions(actionNodes, {
        context,
        entityId,
        state,
        tags
      });
      
      // Sort by priority
      actions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      // Cache results
      this._setCache(cacheKey, actions);
      
      return actions;
    } catch (error) {
      console.error('[ActionDiscovery] Failed to discover actions:', error);
      return [];
    }
  }

  /**
   * Query action nodes from the Intent Graph
   * @private
   */
  async _queryActionsFromGraph(context, tags) {
    // Query for nodes with type 'action' connected to the context
    const query = {
      nodeType: 'action',
      filters: [
        { property: 'context', value: context }
      ]
    };

    if (tags.length > 0) {
      query.filters.push({
        property: 'tags',
        operator: 'contains-any',
        value: tags
      });
    }

    const nodes = await this.typeNavigator.queryNodes(query);
    return nodes || [];
  }

  /**
   * Process and enrich action nodes with runtime information
   * @private
   */
  async _processActions(actionNodes, options) {
    const { context, entityId, state } = options;
    
    const actions = [];
    
    for (const node of actionNodes) {
      try {
        const action = await this._buildAction(node, { context, entityId, state });
        if (action) {
          actions.push(action);
        }
      } catch (error) {
        console.warn('[ActionDiscovery] Failed to process action node:', node.id, error);
      }
    }
    
    return actions;
  }

  /**
   * Build action object from graph node
   * @private
   */
  async _buildAction(node, options) {
    const { state } = options;
    
    // Extract action properties from node
    const action = {
      id: node.id,
      label: node.properties?.label || node.id,
      icon: node.properties?.icon,
      shortcut: node.properties?.shortcut,
      commandType: node.properties?.commandType,
      commandPayload: node.properties?.commandPayload || {},
      priority: node.properties?.priority || 0,
      tags: node.properties?.tags || []
    };

    // Check conditional availability
    if (node.properties?.condition) {
      const isAvailable = this._evaluateCondition(node.properties.condition, state);
      if (!isAvailable) {
        action.disabled = true;
        action.disabledReason = node.properties?.disabledReason || 'Not available';
      }
    }

    // Query for related metadata (e.g., tooltips, descriptions)
    const metadata = await this._queryActionMetadata(node.id);
    if (metadata) {
      Object.assign(action, metadata);
    }

    return action;
  }

  /**
   * Evaluate conditional expression
   * @private
   */
  _evaluateCondition(condition, state) {
    try {
      // Simple condition evaluation
      // Format: { property: 'isPlaying', operator: 'equals', value: false }
      if (condition.property && condition.operator) {
        const stateValue = state[condition.property];
        
        switch (condition.operator) {
          case 'equals':
            return stateValue === condition.value;
          case 'not-equals':
            return stateValue !== condition.value;
          case 'exists':
            return stateValue !== undefined;
          case 'not-exists':
            return stateValue === undefined;
          default:
            console.warn('[ActionDiscovery] Unknown operator:', condition.operator);
            return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[ActionDiscovery] Condition evaluation error:', error);
      return true; // Fail open
    }
  }

  /**
   * Query additional metadata for an action
   * @private
   */
  async _queryActionMetadata(actionId) {
    try {
      const edges = await this.typeNavigator.queryEdges({
        sourceId: actionId,
        edgeType: 'has-metadata'
      });

      if (edges && edges.length > 0) {
        const metadataNodeId = edges[0].targetId;
        const metadataNode = await this.typeNavigator.getNode(metadataNodeId);
        return metadataNode?.properties || {};
      }
    } catch (error) {
      console.warn('[ActionDiscovery] Failed to query metadata:', error);
    }
    
    return null;
  }

  /**
   * Execute a discovered action
   * 
   * @param {Action} action - Action to execute
   * @param {Object} [additionalPayload] - Additional payload to merge
   * @returns {Promise<void>}
   */
  async executeAction(action, additionalPayload = {}) {
    if (!action.commandType) {
      console.error('[ActionDiscovery] Action missing commandType:', action);
      return;
    }

    const payload = {
      ...action.commandPayload,
      ...additionalPayload
    };

    try {
      await this.eventBus.processCommand(action.commandType, payload);
    } catch (error) {
      console.error('[ActionDiscovery] Action execution failed:', action.id, error);
      throw error;
    }
  }

  /**
   * Register a new action in the graph
   * 
   * @param {Object} actionDefinition - Action definition
   * @param {string} actionDefinition.id - Action ID
   * @param {string} actionDefinition.context - Context identifier
   * @param {string} actionDefinition.label - Display label
   * @param {string} actionDefinition.commandType - EventBus command type
   * @param {Object} [actionDefinition.properties] - Additional properties
   * @returns {Promise<void>}
   */
  async registerAction(actionDefinition) {
    const { id, context, label, commandType, properties = {} } = actionDefinition;

    try {
      // Create action node in graph
      await this.typeNavigator.createNode({
        id,
        type: 'action',
        properties: {
          context,
          label,
          commandType,
          ...properties
        }
      });

      // Invalidate cache for this context
      this._invalidateCacheForContext(context);
      
      console.log('[ActionDiscovery] Registered action:', id);
    } catch (error) {
      console.error('[ActionDiscovery] Failed to register action:', error);
      throw error;
    }
  }

  /**
   * Unregister an action from the graph
   * 
   * @param {string} actionId - Action ID to remove
   * @returns {Promise<void>}
   */
  async unregisterAction(actionId) {
    try {
      await this.typeNavigator.deleteNode(actionId);
      
      // Clear entire cache (could be optimized)
      this.cache.clear();
      
      console.log('[ActionDiscovery] Unregistered action:', actionId);
    } catch (error) {
      console.error('[ActionDiscovery] Failed to unregister action:', error);
      throw error;
    }
  }

  /**
   * Get cache key for options
   * @private
   */
  _getCacheKey(options) {
    return JSON.stringify({
      context: options.context,
      entityId: options.entityId,
      tags: options.tags?.sort() || []
    });
  }

  /**
   * Get from cache if not expired
   * @private
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cache entry
   * @private
   */
  _setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache entries for a context
   * @private
   */
  _invalidateCacheForContext(context) {
    for (const [key] of this.cache) {
      if (key.includes(`"context":"${context}"`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached actions
   */
  clearCache() {
    this.cache.clear();
  }
}