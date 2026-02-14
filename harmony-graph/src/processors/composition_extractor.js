/**
 * @fileoverview Extracts composition relationships from design specifications
 * and creates composes_of edges in the graph.
 * 
 * Composition relationships indicate that a component is composed of other
 * components (e.g., a Button contains an Icon and Text).
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#composition-relationships
 */

import { TypeNavigator } from '../core/type_navigator.js';
import { EventBus } from '../core/event_bus.js';

/**
 * Extracts composition relationships from design nodes and creates edges.
 * Listens for DesignSpecNode creation/updates and analyzes component structure.
 */
export class CompositionExtractor {
  constructor() {
    this.typeNavigator = new TypeNavigator();
    this.eventBus = EventBus.getInstance();
    this._subscribeToEvents();
  }

  /**
   * Subscribe to relevant events for composition extraction
   * @private
   */
  _subscribeToEvents() {
    this.eventBus.subscribe('DesignSpecNode.Created', (event) => {
      this._handleDesignSpecCreated(event.payload);
    });

    this.eventBus.subscribe('DesignSpecNode.Updated', (event) => {
      this._handleDesignSpecUpdated(event.payload);
    });

    this.eventBus.subscribe('ExtractCompositions.Command', (event) => {
      this._handleExtractCommand(event.payload);
    });
  }

  /**
   * Handle newly created design spec nodes
   * @private
   * @param {Object} payload - Event payload with node data
   */
  async _handleDesignSpecCreated(payload) {
    try {
      const { nodeId, specData } = payload;
      await this._extractCompositionsFromSpec(nodeId, specData);
      
      this.eventBus.publish({
        type: 'CompositionsExtracted',
        source: 'CompositionExtractor',
        payload: { nodeId, timestamp: Date.now() }
      });
    } catch (error) {
      console.error('Failed to extract compositions on create:', error);
      this.eventBus.publish({
        type: 'CompositionExtraction.Failed',
        source: 'CompositionExtractor',
        payload: { error: error.message, context: payload }
      });
    }
  }

  /**
   * Handle updated design spec nodes
   * @private
   * @param {Object} payload - Event payload with node data
   */
  async _handleDesignSpecUpdated(payload) {
    try {
      const { nodeId, specData } = payload;
      // Remove existing composition edges before re-extracting
      await this._removeExistingCompositions(nodeId);
      await this._extractCompositionsFromSpec(nodeId, specData);
      
      this.eventBus.publish({
        type: 'CompositionsExtracted',
        source: 'CompositionExtractor',
        payload: { nodeId, timestamp: Date.now() }
      });
    } catch (error) {
      console.error('Failed to extract compositions on update:', error);
      this.eventBus.publish({
        type: 'CompositionExtraction.Failed',
        source: 'CompositionExtractor',
        payload: { error: error.message, context: payload }
      });
    }
  }

  /**
   * Handle manual extraction command
   * @private
   * @param {Object} payload - Command payload
   */
  async _handleExtractCommand(payload) {
    try {
      const { nodeId } = payload;
      const specData = await this.typeNavigator.getNode(nodeId);
      
      if (!specData) {
        throw new Error(`Node ${nodeId} not found`);
      }

      await this._removeExistingCompositions(nodeId);
      await this._extractCompositionsFromSpec(nodeId, specData);
      
      this.eventBus.publish({
        type: 'CompositionsExtracted',
        source: 'CompositionExtractor',
        payload: { nodeId, timestamp: Date.now() }
      });
    } catch (error) {
      console.error('Failed to extract compositions on command:', error);
      this.eventBus.publish({
        type: 'CompositionExtraction.Failed',
        source: 'CompositionExtractor',
        payload: { error: error.message, context: payload }
      });
    }
  }

  /**
   * Extract composition relationships from a design spec
   * @private
   * @param {string} nodeId - ID of the parent node
   * @param {Object} specData - Design specification data
   */
  async _extractCompositionsFromSpec(nodeId, specData) {
    const compositions = this._parseCompositions(specData);
    
    for (const composition of compositions) {
      await this._createCompositionEdge(nodeId, composition);
    }
  }

  /**
   * Parse composition data from spec
   * @private
   * @param {Object} specData - Design specification data
   * @returns {Array<Object>} Array of composition relationships
   */
  _parseCompositions(specData) {
    const compositions = [];

    // Check for explicit composition declarations
    if (specData.compositions && Array.isArray(specData.compositions)) {
      compositions.push(...specData.compositions);
    }

    // Check for component children in hierarchy
    if (specData.children && Array.isArray(specData.children)) {
      for (const child of specData.children) {
        if (child.componentType) {
          compositions.push({
            childId: child.id || child.componentType,
            componentType: child.componentType,
            role: child.role || 'child',
            required: child.required !== false
          });
        }
      }
    }

    // Check for slots (Web Component pattern)
    if (specData.slots && Array.isArray(specData.slots)) {
      for (const slot of specData.slots) {
        compositions.push({
          childId: slot.name,
          componentType: slot.allowedComponents || 'any',
          role: 'slot',
          slotName: slot.name,
          required: slot.required || false
        });
      }
    }

    // Check for parts (CSS Shadow Parts pattern)
    if (specData.parts && Array.isArray(specData.parts)) {
      for (const part of specData.parts) {
        if (part.componentType) {
          compositions.push({
            childId: part.name,
            componentType: part.componentType,
            role: 'part',
            partName: part.name,
            required: true
          });
        }
      }
    }

    return compositions;
  }

  /**
   * Create a composes_of edge in the graph
   * @private
   * @param {string} parentId - ID of parent node
   * @param {Object} composition - Composition relationship data
   */
  async _createCompositionEdge(parentId, composition) {
    const edgeData = {
      fromNodeId: parentId,
      toNodeId: composition.childId,
      edgeType: 'composes_of',
      metadata: {
        componentType: composition.componentType,
        role: composition.role,
        required: composition.required,
        slotName: composition.slotName,
        partName: composition.partName,
        extractedAt: Date.now()
      }
    };

    await this.typeNavigator.createEdge(edgeData);
  }

  /**
   * Remove existing composition edges for a node
   * @private
   * @param {string} nodeId - ID of the node
   */
  async _removeExistingCompositions(nodeId) {
    const existingEdges = await this.typeNavigator.getOutgoingEdges(
      nodeId,
      'composes_of'
    );

    for (const edge of existingEdges) {
      await this.typeNavigator.deleteEdge(edge.id);
    }
  }

  /**
   * Query all composition relationships for a node
   * @param {string} nodeId - ID of the node
   * @returns {Promise<Array<Object>>} Array of composition edges
   */
  async getCompositions(nodeId) {
    return await this.typeNavigator.getOutgoingEdges(nodeId, 'composes_of');
  }

  /**
   * Query what components compose a given node (reverse lookup)
   * @param {string} nodeId - ID of the node
   * @returns {Promise<Array<Object>>} Array of parent composition edges
   */
  async getComposedBy(nodeId) {
    return await this.typeNavigator.getIncomingEdges(nodeId, 'composes_of');
  }
}