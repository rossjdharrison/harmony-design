/**
 * @fileoverview EventBus integration for signal-graph bridge
 * @module signal-graph-bridge/event-bus-integration
 * 
 * Implements the ProcessCommand pattern for signal graph operations.
 * See DESIGN_SYSTEM.md § EventBus Integration for event contracts.
 * 
 * MANDATORY RULE: EventBus ProcessCommand Pattern Required
 * - UI publishes command events
 * - This module subscribes and processes
 * - Results published as result events
 */

import { EventBus } from '../../../core/event-bus.js';
import { SignalGraphBridge } from './signal-graph-bridge.js';

/**
 * Signal Graph EventBus Integration
 * 
 * Connects the SignalGraphBridge to the EventBus for command/event pattern.
 */
export class SignalGraphEventBusIntegration {
  /**
   * @private
   * @type {SignalGraphBridge}
   */
  #bridge;

  /**
   * @private
   * @type {EventBus}
   */
  #eventBus;

  /**
   * @private
   * @type {Array<Function>} - Unsubscribe functions
   */
  #unsubscribers = [];

  /**
   * Create integration instance
   * @param {SignalGraphBridge} bridge - Signal graph bridge instance
   * @param {EventBus} eventBus - EventBus singleton
   */
  constructor(bridge, eventBus) {
    this.#bridge = bridge;
    this.#eventBus = eventBus;
  }

  /**
   * Register all event handlers
   */
  register() {
    // Create Node command
    this.#unsubscribers.push(
      this.#eventBus.subscribe('SignalGraph.CreateNode', (event) => {
        this.#handleCreateNode(event);
      })
    );

    // Connect Nodes command
    this.#unsubscribers.push(
      this.#eventBus.subscribe('SignalGraph.ConnectNodes', (event) => {
        this.#handleConnectNodes(event);
      })
    );

    // Disconnect Nodes command
    this.#unsubscribers.push(
      this.#eventBus.subscribe('SignalGraph.DisconnectNodes', (event) => {
        this.#handleDisconnectNodes(event);
      })
    );

    // Set Parameter command
    this.#unsubscribers.push(
      this.#eventBus.subscribe('SignalGraph.SetParameter', (event) => {
        this.#handleSetParameter(event);
      })
    );

    // Remove Node command
    this.#unsubscribers.push(
      this.#eventBus.subscribe('SignalGraph.RemoveNode', (event) => {
        this.#handleRemoveNode(event);
      })
    );

    // Clear Graph command
    this.#unsubscribers.push(
      this.#eventBus.subscribe('SignalGraph.ClearGraph', (event) => {
        this.#handleClearGraph(event);
      })
    );

    console.log('SignalGraphEventBusIntegration registered');
  }

  /**
   * Unregister all event handlers
   */
  unregister() {
    this.#unsubscribers.forEach(unsub => unsub());
    this.#unsubscribers = [];
    console.log('SignalGraphEventBusIntegration unregistered');
  }

  /**
   * Handle CreateNode command
   * @private
   * @param {Object} event - Event payload
   */
  #handleCreateNode(event) {
    try {
      const { nodeType, parameters } = event.payload;

      if (!nodeType) {
        throw new Error('nodeType is required');
      }

      const nodeId = this.#bridge.createNode(nodeType, parameters);

      this.#eventBus.publish('SignalGraph.NodeCreated', {
        nodeId,
        nodeType,
        parameters: parameters || {}
      });

    } catch (error) {
      console.error('SignalGraph.CreateNode failed:', error);
      this.#eventBus.publish('SignalGraph.NodeCreationFailed', {
        error: error.message,
        nodeType: event.payload.nodeType
      });
    }
  }

  /**
   * Handle ConnectNodes command
   * @private
   * @param {Object} event - Event payload
   */
  #handleConnectNodes(event) {
    try {
      const { sourceId, targetId, sourcePort = 0, targetPort = 0 } = event.payload;

      if (sourceId === undefined || targetId === undefined) {
        throw new Error('sourceId and targetId are required');
      }

      this.#bridge.connectNodes(sourceId, targetId, sourcePort, targetPort);

      this.#eventBus.publish('SignalGraph.NodesConnected', {
        sourceId,
        targetId,
        sourcePort,
        targetPort
      });

    } catch (error) {
      console.error('SignalGraph.ConnectNodes failed:', error);
      this.#eventBus.publish('SignalGraph.ConnectionFailed', {
        error: error.message,
        sourceId: event.payload.sourceId,
        targetId: event.payload.targetId
      });
    }
  }

  /**
   * Handle DisconnectNodes command
   * @private
   * @param {Object} event - Event payload
   */
  #handleDisconnectNodes(event) {
    try {
      const { sourceId, targetId, sourcePort = 0, targetPort = 0 } = event.payload;

      if (sourceId === undefined || targetId === undefined) {
        throw new Error('sourceId and targetId are required');
      }

      this.#bridge.disconnectNodes(sourceId, targetId, sourcePort, targetPort);

      this.#eventBus.publish('SignalGraph.NodesDisconnected', {
        sourceId,
        targetId,
        sourcePort,
        targetPort
      });

    } catch (error) {
      console.error('SignalGraph.DisconnectNodes failed:', error);
      this.#eventBus.publish('SignalGraph.DisconnectionFailed', {
        error: error.message,
        sourceId: event.payload.sourceId,
        targetId: event.payload.targetId
      });
    }
  }

  /**
   * Handle SetParameter command
   * @private
   * @param {Object} event - Event payload
   */
  #handleSetParameter(event) {
    try {
      const { nodeId, parameterName, value } = event.payload;

      if (nodeId === undefined || !parameterName || value === undefined) {
        throw new Error('nodeId, parameterName, and value are required');
      }

      this.#bridge.setParameter(nodeId, parameterName, value);

      this.#eventBus.publish('SignalGraph.ParameterSet', {
        nodeId,
        parameterName,
        value
      });

    } catch (error) {
      console.error('SignalGraph.SetParameter failed:', error);
      this.#eventBus.publish('SignalGraph.ParameterSetFailed', {
        error: error.message,
        nodeId: event.payload.nodeId,
        parameterName: event.payload.parameterName
      });
    }
  }

  /**
   * Handle RemoveNode command
   * @private
   * @param {Object} event - Event payload
   */
  #handleRemoveNode(event) {
    try {
      const { nodeId } = event.payload;

      if (nodeId === undefined) {
        throw new Error('nodeId is required');
      }

      this.#bridge.removeNode(nodeId);

      this.#eventBus.publish('SignalGraph.NodeRemoved', {
        nodeId
      });

    } catch (error) {
      console.error('SignalGraph.RemoveNode failed:', error);
      this.#eventBus.publish('SignalGraph.NodeRemovalFailed', {
        error: error.message,
        nodeId: event.payload.nodeId
      });
    }
  }

  /**
   * Handle ClearGraph command
   * @private
   * @param {Object} event - Event payload
   */
  #handleClearGraph(event) {
    try {
      this.#bridge.clearGraph();

      this.#eventBus.publish('SignalGraph.GraphCleared', {});

    } catch (error) {
      console.error('SignalGraph.ClearGraph failed:', error);
      this.#eventBus.publish('SignalGraph.GraphClearFailed', {
        error: error.message
      });
    }
  }
}