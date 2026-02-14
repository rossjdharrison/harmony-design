/**
 * @fileoverview Tests for CompositionExtractor
 * 
 * Tests composition relationship extraction and edge creation.
 */

import { CompositionExtractor } from '../src/processors/composition_extractor.js';
import { TypeNavigator } from '../src/core/type_navigator.js';
import { EventBus } from '../src/core/event_bus.js';

/**
 * Mock TypeNavigator for testing
 */
class MockTypeNavigator {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  async getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  async createEdge(edgeData) {
    const edge = { id: `edge-${this.edges.length}`, ...edgeData };
    this.edges.push(edge);
    return edge;
  }

  async getOutgoingEdges(nodeId, edgeType) {
    return this.edges.filter(
      e => e.fromNodeId === nodeId && e.edgeType === edgeType
    );
  }

  async deleteEdge(edgeId) {
    const index = this.edges.findIndex(e => e.id === edgeId);
    if (index !== -1) {
      this.edges.splice(index, 1);
    }
  }

  async nodeExists(nodeId) {
    return this.nodes.has(nodeId);
  }
}

/**
 * Test suite for CompositionExtractor
 */
export class CompositionExtractorTests {
  constructor() {
    this.extractor = null;
    this.mockNavigator = null;
  }

  async setup() {
    this.mockNavigator = new MockTypeNavigator();
    this.extractor = new CompositionExtractor();
    this.extractor.typeNavigator = this.mockNavigator;
  }

  async testExtractExplicitCompositions() {
    const specData = {
      id: 'button-component',
      compositions: [
        {
          childId: 'icon-component',
          componentType: 'Icon',
          role: 'child',
          required: false
        },
        {
          childId: 'text-component',
          componentType: 'Text',
          role: 'child',
          required: true
        }
      ]
    };

    await this.extractor._extractCompositionsFromSpec('button-component', specData);

    const edges = await this.mockNavigator.getOutgoingEdges(
      'button-component',
      'composes_of'
    );

    console.assert(edges.length === 2, 'Should create 2 composition edges');
    console.assert(
      edges[0].toNodeId === 'icon-component',
      'First edge should point to icon'
    );
    console.assert(
      edges[1].toNodeId === 'text-component',
      'Second edge should point to text'
    );
    console.log('✓ testExtractExplicitCompositions passed');
  }

  async testExtractFromChildren() {
    const specData = {
      id: 'card-component',
      children: [
        {
          id: 'header',
          componentType: 'CardHeader',
          role: 'header',
          required: true
        },
        {
          id: 'body',
          componentType: 'CardBody',
          role: 'body',
          required: true
        }
      ]
    };

    await this.extractor._extractCompositionsFromSpec('card-component', specData);

    const edges = await this.mockNavigator.getOutgoingEdges(
      'card-component',
      'composes_of'
    );

    console.assert(edges.length === 2, 'Should create 2 composition edges from children');
    console.assert(
      edges[0].metadata.componentType === 'CardHeader',
      'Should preserve component type'
    );
    console.log('✓ testExtractFromChildren passed');
  }

  async testExtractFromSlots() {
    const specData = {
      id: 'dialog-component',
      slots: [
        {
          name: 'header',
          allowedComponents: ['DialogHeader'],
          required: true
        },
        {
          name: 'footer',
          allowedComponents: ['DialogFooter'],
          required: false
        }
      ]
    };

    await this.extractor._extractCompositionsFromSpec('dialog-component', specData);

    const edges = await this.mockNavigator.getOutgoingEdges(
      'dialog-component',
      'composes_of'
    );

    console.assert(edges.length === 2, 'Should create 2 composition edges from slots');
    console.assert(
      edges[0].metadata.role === 'slot',
      'Should mark edges as slot role'
    );
    console.assert(
      edges[0].metadata.slotName === 'header',
      'Should preserve slot name'
    );
    console.log('✓ testExtractFromSlots passed');
  }

  async testRemoveExistingCompositions() {
    // Create initial edges
    await this.mockNavigator.createEdge({
      fromNodeId: 'component-a',
      toNodeId: 'component-b',
      edgeType: 'composes_of'
    });

    let edges = await this.mockNavigator.getOutgoingEdges(
      'component-a',
      'composes_of'
    );
    console.assert(edges.length === 1, 'Should have 1 edge initially');

    // Remove existing compositions
    await this.extractor._removeExistingCompositions('component-a');

    edges = await this.mockNavigator.getOutgoingEdges(
      'component-a',
      'composes_of'
    );
    console.assert(edges.length === 0, 'Should have removed all edges');
    console.log('✓ testRemoveExistingCompositions passed');
  }

  async runAll() {
    console.log('Running CompositionExtractor tests...');
    await this.setup();
    await this.testExtractExplicitCompositions();
    await this.setup();
    await this.testExtractFromChildren();
    await this.setup();
    await this.testExtractFromSlots();
    await this.setup();
    await this.testRemoveExistingCompositions();
    console.log('All CompositionExtractor tests passed!');
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new CompositionExtractorTests();
  tests.runAll().catch(console.error);
}