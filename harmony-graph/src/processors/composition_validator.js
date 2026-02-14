/**
 * @fileoverview Validates composition relationships for correctness and consistency.
 * 
 * Ensures that:
 * - Required child components are present
 * - Component types are valid
 * - Circular compositions are detected and prevented
 * - Composition depth stays within reasonable bounds
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#composition-validation
 */

import { TypeNavigator } from '../core/type_navigator.js';
import { EventBus } from '../core/event_bus.js';

/**
 * Maximum allowed depth for nested compositions to prevent performance issues
 * @const {number}
 */
const MAX_COMPOSITION_DEPTH = 10;

/**
 * Validates composition relationships in the design system graph
 */
export class CompositionValidator {
  constructor() {
    this.typeNavigator = new TypeNavigator();
    this.eventBus = EventBus.getInstance();
    this._subscribeToEvents();
  }

  /**
   * Subscribe to validation events
   * @private
   */
  _subscribeToEvents() {
    this.eventBus.subscribe('CompositionsExtracted', (event) => {
      this._handleCompositionsExtracted(event.payload);
    });

    this.eventBus.subscribe('ValidateCompositions.Command', (event) => {
      this._handleValidateCommand(event.payload);
    });
  }

  /**
   * Handle compositions extracted event
   * @private
   * @param {Object} payload - Event payload
   */
  async _handleCompositionsExtracted(payload) {
    try {
      const { nodeId } = payload;
      const validationResult = await this.validateNode(nodeId);
      
      if (!validationResult.valid) {
        this.eventBus.publish({
          type: 'CompositionValidation.Failed',
          source: 'CompositionValidator',
          payload: {
            nodeId,
            errors: validationResult.errors,
            warnings: validationResult.warnings
          }
        });
      } else {
        this.eventBus.publish({
          type: 'CompositionValidation.Passed',
          source: 'CompositionValidator',
          payload: {
            nodeId,
            warnings: validationResult.warnings
          }
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      this.eventBus.publish({
        type: 'CompositionValidation.Error',
        source: 'CompositionValidator',
        payload: { error: error.message, context: payload }
      });
    }
  }

  /**
   * Handle manual validation command
   * @private
   * @param {Object} payload - Command payload
   */
  async _handleValidateCommand(payload) {
    await this._handleCompositionsExtracted(payload);
  }

  /**
   * Validate composition relationships for a node
   * @param {string} nodeId - ID of the node to validate
   * @returns {Promise<Object>} Validation result with errors and warnings
   */
  async validateNode(nodeId) {
    const errors = [];
    const warnings = [];

    // Check for circular dependencies
    const circularCheck = await this._checkCircularComposition(nodeId);
    if (circularCheck.hasCircular) {
      errors.push({
        type: 'circular_composition',
        message: `Circular composition detected: ${circularCheck.path.join(' -> ')}`,
        severity: 'error'
      });
    }

    // Check composition depth
    const depth = await this._getCompositionDepth(nodeId);
    if (depth > MAX_COMPOSITION_DEPTH) {
      errors.push({
        type: 'excessive_depth',
        message: `Composition depth (${depth}) exceeds maximum (${MAX_COMPOSITION_DEPTH})`,
        severity: 'error'
      });
    } else if (depth > MAX_COMPOSITION_DEPTH * 0.8) {
      warnings.push({
        type: 'high_depth',
        message: `Composition depth (${depth}) is approaching maximum`,
        severity: 'warning'
      });
    }

    // Check required children
    const missingRequired = await this._checkRequiredChildren(nodeId);
    if (missingRequired.length > 0) {
      warnings.push({
        type: 'missing_required',
        message: `Required child components may be missing: ${missingRequired.join(', ')}`,
        severity: 'warning'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for circular composition dependencies
   * @private
   * @param {string} nodeId - Starting node ID
   * @param {Set<string>} visited - Set of visited node IDs
   * @param {Array<string>} path - Current path
   * @returns {Promise<Object>} Result with hasCircular flag and path
   */
  async _checkCircularComposition(nodeId, visited = new Set(), path = []) {
    if (visited.has(nodeId)) {
      return {
        hasCircular: true,
        path: [...path, nodeId]
      };
    }

    visited.add(nodeId);
    path.push(nodeId);

    const compositions = await this.typeNavigator.getOutgoingEdges(
      nodeId,
      'composes_of'
    );

    for (const edge of compositions) {
      const result = await this._checkCircularComposition(
        edge.toNodeId,
        new Set(visited),
        [...path]
      );
      
      if (result.hasCircular) {
        return result;
      }
    }

    return { hasCircular: false, path: [] };
  }

  /**
   * Calculate maximum composition depth from a node
   * @private
   * @param {string} nodeId - Node ID
   * @param {number} currentDepth - Current depth in traversal
   * @param {Set<string>} visited - Set of visited nodes
   * @returns {Promise<number>} Maximum depth
   */
  async _getCompositionDepth(nodeId, currentDepth = 0, visited = new Set()) {
    if (visited.has(nodeId)) {
      return currentDepth;
    }

    visited.add(nodeId);

    const compositions = await this.typeNavigator.getOutgoingEdges(
      nodeId,
      'composes_of'
    );

    if (compositions.length === 0) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const edge of compositions) {
      const depth = await this._getCompositionDepth(
        edge.toNodeId,
        currentDepth + 1,
        new Set(visited)
      );
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Check for missing required child components
   * @private
   * @param {string} nodeId - Node ID
   * @returns {Promise<Array<string>>} Array of missing required component IDs
   */
  async _checkRequiredChildren(nodeId) {
    const missing = [];
    const compositions = await this.typeNavigator.getOutgoingEdges(
      nodeId,
      'composes_of'
    );

    for (const edge of compositions) {
      if (edge.metadata?.required) {
        const childExists = await this.typeNavigator.nodeExists(edge.toNodeId);
        if (!childExists) {
          missing.push(edge.toNodeId);
        }
      }
    }

    return missing;
  }
}