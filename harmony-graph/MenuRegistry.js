/**
 * @fileoverview MenuRegistry - Manages dynamic menu items from Intent Graph
 * @module harmony-graph/MenuRegistry
 * 
 * Provides dynamic menu item resolution using TypeNavigator queries.
 * Menu items are stored as intents in the graph, not hardcoded.
 * 
 * @see {@link ../DESIGN_SYSTEM.md#intent-graph}
 */

import { TypeNavigator } from './TypeNavigator.js';
import { EventBus } from '../core/EventBus.js';

/**
 * Registry for dynamic menu items sourced from Intent Graph
 * @class MenuRegistry
 */
export class MenuRegistry {
  /**
   * @param {TypeNavigator} typeNavigator - TypeNavigator instance for querying
   * @param {EventBus} eventBus - EventBus for publishing menu events
   */
  constructor(typeNavigator, eventBus) {
    if (!typeNavigator) {
      throw new Error('MenuRegistry requires TypeNavigator instance');
    }
    if (!eventBus) {
      throw new Error('MenuRegistry requires EventBus instance');
    }

    /** @private */
    this.typeNavigator = typeNavigator;
    
    /** @private */
    this.eventBus = eventBus;

    /** @private */
    this.cache = new Map();

    /** @private */
    this.cacheTimeout = 5000; // 5 seconds cache

    this._setupEventListeners();
  }

  /**
   * Set up event listeners for menu invalidation
   * @private
   */
  _setupEventListeners() {
    // Listen for graph changes that might affect menu items
    this.eventBus.subscribe('IntentGraph.NodeAdded', (event) => {
      if (event.payload?.type === 'MenuItem') {
        this._invalidateCache();
      }
    });

    this.eventBus.subscribe('IntentGraph.NodeRemoved', (event) => {
      if (event.payload?.type === 'MenuItem') {
        this._invalidateCache();
      }
    });

    this.eventBus.subscribe('IntentGraph.NodeUpdated', (event) => {
      if (event.payload?.type === 'MenuItem') {
        this._invalidateCache();
      }
    });
  }

  /**
   * Invalidate the menu cache
   * @private
   */
  _invalidateCache() {
    this.cache.clear();
    this.eventBus.publish({
      type: 'MenuRegistry.CacheInvalidated',
      source: 'MenuRegistry',
      payload: { timestamp: Date.now() }
    });
  }

  /**
   * Get menu items for a specific context
   * @param {string} context - Context identifier (e.g., 'main', 'contextual', 'toolbar')
   * @returns {Promise<Array<Object>>} Array of menu items
   */
  async getMenuItems(context = 'main') {
    const cacheKey = `menu:${context}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.items;
    }

    try {
      // Query Intent Graph for menu items
      const menuNodes = await this.typeNavigator.findByType('MenuItem');
      
      // Filter by context
      const contextMenuItems = menuNodes.filter(node => {
        const contexts = node.data?.context || [];
        return contexts.includes(context) || contexts.length === 0;
      });

      // Sort by order
      const sortedItems = contextMenuItems.sort((a, b) => {
        const orderA = a.data?.order ?? 999;
        const orderB = b.data?.order ?? 999;
        return orderA - orderB;
      });

      // Build hierarchical structure
      const hierarchicalItems = this._buildHierarchy(sortedItems);

      // Cache the result
      this.cache.set(cacheKey, {
        items: hierarchicalItems,
        timestamp: Date.now()
      });

      return hierarchicalItems;
    } catch (error) {
      console.error('MenuRegistry: Error fetching menu items', {
        context,
        error: error.message
      });
      
      this.eventBus.publish({
        type: 'MenuRegistry.Error',
        source: 'MenuRegistry',
        payload: { context, error: error.message }
      });

      return [];
    }
  }

  /**
   * Build hierarchical menu structure from flat list
   * @private
   * @param {Array<Object>} items - Flat list of menu items
   * @returns {Array<Object>} Hierarchical menu structure
   */
  _buildHierarchy(items) {
    const itemMap = new Map();
    const rootItems = [];

    // First pass: create map of all items
    items.forEach(item => {
      const menuItem = {
        id: item.id,
        label: item.data?.label || 'Unnamed',
        intent: item.data?.intent,
        icon: item.data?.icon,
        shortcut: item.data?.shortcut,
        enabled: item.data?.enabled !== false,
        visible: item.data?.visible !== false,
        metadata: item.data?.metadata || {},
        children: []
      };
      itemMap.set(item.id, menuItem);
    });

    // Second pass: build hierarchy
    items.forEach(item => {
      const menuItem = itemMap.get(item.id);
      const parentId = item.data?.parentId;

      if (parentId && itemMap.has(parentId)) {
        const parent = itemMap.get(parentId);
        parent.children.push(menuItem);
      } else {
        rootItems.push(menuItem);
      }
    });

    return rootItems;
  }

  /**
   * Get a specific menu item by ID
   * @param {string} itemId - Menu item ID
   * @returns {Promise<Object|null>} Menu item or null if not found
   */
  async getMenuItem(itemId) {
    try {
      const node = await this.typeNavigator.findById(itemId);
      
      if (!node || node.type !== 'MenuItem') {
        return null;
      }

      return {
        id: node.id,
        label: node.data?.label || 'Unnamed',
        intent: node.data?.intent,
        icon: node.data?.icon,
        shortcut: node.data?.shortcut,
        enabled: node.data?.enabled !== false,
        visible: node.data?.visible !== false,
        metadata: node.data?.metadata || {}
      };
    } catch (error) {
      console.error('MenuRegistry: Error fetching menu item', {
        itemId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Register a new menu item in the Intent Graph
   * @param {Object} menuItem - Menu item configuration
   * @returns {Promise<string>} ID of the created menu item
   */
  async registerMenuItem(menuItem) {
    if (!menuItem.label || !menuItem.intent) {
      throw new Error('Menu item must have label and intent');
    }

    try {
      const nodeId = await this.typeNavigator.addNode({
        type: 'MenuItem',
        data: {
          label: menuItem.label,
          intent: menuItem.intent,
          icon: menuItem.icon,
          parentId: menuItem.parentId,
          order: menuItem.order ?? 999,
          enabled: menuItem.enabled !== false,
          visible: menuItem.visible !== false,
          shortcut: menuItem.shortcut,
          context: menuItem.context || [],
          metadata: menuItem.metadata || {}
        }
      });

      this._invalidateCache();

      this.eventBus.publish({
        type: 'MenuRegistry.ItemRegistered',
        source: 'MenuRegistry',
        payload: { id: nodeId, menuItem }
      });

      return nodeId;
    } catch (error) {
      console.error('MenuRegistry: Error registering menu item', {
        menuItem,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update an existing menu item
   * @param {string} itemId - Menu item ID
   * @param {Object} updates - Properties to update
   * @returns {Promise<boolean>} Success status
   */
  async updateMenuItem(itemId, updates) {
    try {
      const node = await this.typeNavigator.findById(itemId);
      
      if (!node || node.type !== 'MenuItem') {
        throw new Error(`Menu item not found: ${itemId}`);
      }

      await this.typeNavigator.updateNode(itemId, {
        data: {
          ...node.data,
          ...updates
        }
      });

      this._invalidateCache();

      this.eventBus.publish({
        type: 'MenuRegistry.ItemUpdated',
        source: 'MenuRegistry',
        payload: { id: itemId, updates }
      });

      return true;
    } catch (error) {
      console.error('MenuRegistry: Error updating menu item', {
        itemId,
        updates,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Remove a menu item from the registry
   * @param {string} itemId - Menu item ID
   * @returns {Promise<boolean>} Success status
   */
  async removeMenuItem(itemId) {
    try {
      await this.typeNavigator.removeNode(itemId);
      this._invalidateCache();

      this.eventBus.publish({
        type: 'MenuRegistry.ItemRemoved',
        source: 'MenuRegistry',
        payload: { id: itemId }
      });

      return true;
    } catch (error) {
      console.error('MenuRegistry: Error removing menu item', {
        itemId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Search menu items by label
   * @param {string} query - Search query
   * @param {string} context - Optional context filter
   * @returns {Promise<Array<Object>>} Matching menu items
   */
  async searchMenuItems(query, context = null) {
    try {
      const allItems = await this.getMenuItems(context || 'main');
      const lowerQuery = query.toLowerCase();

      const searchRecursive = (items) => {
        const results = [];
        
        for (const item of items) {
          if (item.label.toLowerCase().includes(lowerQuery)) {
            results.push(item);
          }
          
          if (item.children && item.children.length > 0) {
            results.push(...searchRecursive(item.children));
          }
        }
        
        return results;
      };

      return searchRecursive(allItems);
    } catch (error) {
      console.error('MenuRegistry: Error searching menu items', {
        query,
        context,
        error: error.message
      });
      return [];
    }
  }
}