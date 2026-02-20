/**
 * @fileoverview Tests for Layer Stack Manager
 * @module utils/layer-stack-manager.test
 */

import { LayerStackManager, LAYER_BASE_VALUES, STACK_INCREMENT } from './layer-stack-manager.js';

/**
 * Creates a mock DOM element
 * @returns {Object} Mock element
 */
function createMockElement() {
  return {
    tagName: 'DIV',
    style: { zIndex: '' }
  };
}

/**
 * Test suite for LayerStackManager
 */
export function runLayerStackTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  // Test: Basic layer push
  test('Should push layer and assign correct z-index', () => {
    const manager = new LayerStackManager();
    const element = createMockElement();
    const zIndex = manager.pushLayer('modal-1', element, 'modal');

    assert(zIndex === LAYER_BASE_VALUES.modal, 'First modal should have base z-index');
    assert(element.style.zIndex === zIndex.toString(), 'Element should have z-index applied');
  });

  // Test: Multiple layers stacking
  test('Should stack multiple layers with incremental z-index', () => {
    const manager = new LayerStackManager();
    const el1 = createMockElement();
    const el2 = createMockElement();
    const el3 = createMockElement();

    const z1 = manager.pushLayer('modal-1', el1, 'modal');
    const z2 = manager.pushLayer('modal-2', el2, 'modal');
    const z3 = manager.pushLayer('modal-3', el3, 'modal');

    assert(z2 === z1 + STACK_INCREMENT, 'Second layer should increment');
    assert(z3 === z2 + STACK_INCREMENT, 'Third layer should increment');
  });

  // Test: Pop layer
  test('Should pop layer and recalculate stack', () => {
    const manager = new LayerStackManager();
    const el1 = createMockElement();
    const el2 = createMockElement();
    const el3 = createMockElement();

    manager.pushLayer('modal-1', el1, 'modal');
    manager.pushLayer('modal-2', el2, 'modal');
    manager.pushLayer('modal-3', el3, 'modal');

    const removed = manager.popLayer('modal-2');
    assert(removed === true, 'Should return true when layer removed');

    const depth = manager.getStackDepth('modal');
    assert(depth === 2, 'Stack depth should be 2 after removal');
  });

  // Test: Bring to front
  test('Should bring layer to front', () => {
    const manager = new LayerStackManager();
    const el1 = createMockElement();
    const el2 = createMockElement();
    const el3 = createMockElement();

    manager.pushLayer('modal-1', el1, 'modal');
    manager.pushLayer('modal-2', el2, 'modal');
    manager.pushLayer('modal-3', el3, 'modal');

    const newZIndex = manager.bringToFront('modal-1');
    const topLayer = manager.getTopLayer('modal');

    assert(topLayer.id === 'modal-1', 'modal-1 should be on top');
    assert(newZIndex > manager.getZIndex('modal-2'), 'Should have higher z-index');
  });

  // Test: Different layer types
  test('Should manage different layer types independently', () => {
    const manager = new LayerStackManager();
    const modal = createMockElement();
    const tooltip = createMockElement();

    const modalZ = manager.pushLayer('modal-1', modal, 'modal');
    const tooltipZ = manager.pushLayer('tooltip-1', tooltip, 'tooltip');

    assert(tooltipZ > modalZ, 'Tooltip should have higher base z-index than modal');
    assert(manager.getStackDepth('modal') === 1, 'Modal stack should have 1 item');
    assert(manager.getStackDepth('tooltip') === 1, 'Tooltip stack should have 1 item');
  });

  // Test: Get z-index
  test('Should get z-index for existing layer', () => {
    const manager = new LayerStackManager();
    const element = createMockElement();
    const assignedZ = manager.pushLayer('modal-1', element, 'modal');
    const retrievedZ = manager.getZIndex('modal-1');

    assert(assignedZ === retrievedZ, 'Retrieved z-index should match assigned');
  });

  // Test: Get z-index for non-existent layer
  test('Should return -1 for non-existent layer', () => {
    const manager = new LayerStackManager();
    const zIndex = manager.getZIndex('non-existent');

    assert(zIndex === -1, 'Should return -1 for non-existent layer');
  });

  // Test: Has active layers
  test('Should detect active layers', () => {
    const manager = new LayerStackManager();
    assert(!manager.hasActiveLayers('modal'), 'Should have no active modals initially');

    const element = createMockElement();
    manager.pushLayer('modal-1', element, 'modal');

    assert(manager.hasActiveLayers('modal'), 'Should have active modals after push');
  });

  // Test: Clear type
  test('Should clear all layers of a type', () => {
    const manager = new LayerStackManager();
    const el1 = createMockElement();
    const el2 = createMockElement();

    manager.pushLayer('modal-1', el1, 'modal');
    manager.pushLayer('modal-2', el2, 'modal');
    manager.clearType('modal');

    assert(manager.getStackDepth('modal') === 0, 'Modal stack should be empty');
    assert(manager.getZIndex('modal-1') === -1, 'Layer should no longer exist');
  });

  // Test: Clear all
  test('Should clear all layers', () => {
    const manager = new LayerStackManager();
    const modal = createMockElement();
    const tooltip = createMockElement();

    manager.pushLayer('modal-1', modal, 'modal');
    manager.pushLayer('tooltip-1', tooltip, 'tooltip');
    manager.clearAll();

    assert(manager.getStackDepth('modal') === 0, 'Modal stack should be empty');
    assert(manager.getStackDepth('tooltip') === 0, 'Tooltip stack should be empty');
  });

  // Test: Update layer
  test('Should update layer element', () => {
    const manager = new LayerStackManager();
    const el1 = createMockElement();
    const el2 = createMockElement();

    const originalZ = manager.pushLayer('modal-1', el1, 'modal');
    const updatedZ = manager.updateLayer('modal-1', el2);

    assert(originalZ === updatedZ, 'Z-index should remain the same');
    assert(el2.style.zIndex === updatedZ.toString(), 'New element should have z-index');
  });

  // Test: Get top layer
  test('Should get top layer of type', () => {
    const manager = new LayerStackManager();
    const el1 = createMockElement();
    const el2 = createMockElement();

    manager.pushLayer('modal-1', el1, 'modal');
    manager.pushLayer('modal-2', el2, 'modal');

    const topLayer = manager.getTopLayer('modal');
    assert(topLayer.id === 'modal-2', 'Top layer should be modal-2');
  });

  // Test: Get layers by type
  test('Should get all layers of type', () => {
    const manager = new LayerStackManager();
    const el1 = createMockElement();
    const el2 = createMockElement();

    manager.pushLayer('modal-1', el1, 'modal');
    manager.pushLayer('modal-2', el2, 'modal');

    const layers = manager.getLayersByType('modal');
    assert(layers.length === 2, 'Should return 2 modal layers');
    assert(layers[0].id === 'modal-1', 'First layer should be modal-1');
    assert(layers[1].id === 'modal-2', 'Second layer should be modal-2');
  });

  // Test: Debug info
  test('Should provide debug information', () => {
    const manager = new LayerStackManager();
    const modal = createMockElement();
    const tooltip = createMockElement();

    manager.pushLayer('modal-1', modal, 'modal');
    manager.pushLayer('tooltip-1', tooltip, 'tooltip');

    const info = manager.getDebugInfo();
    assert(info.totalLayers === 2, 'Should report 2 total layers');
    assert(info.byType.modal === 1, 'Should report 1 modal');
    assert(info.byType.tooltip === 1, 'Should report 1 tooltip');
  });

  console.log(`\n✓ ${results.passed} tests passed`);
  if (results.failed > 0) {
    console.log(`✗ ${results.failed} tests failed`);
  }

  return results;
}

// Auto-run if in test environment
if (typeof window !== 'undefined' && window.__HARMONY_TEST__) {
  runLayerStackTests();
}