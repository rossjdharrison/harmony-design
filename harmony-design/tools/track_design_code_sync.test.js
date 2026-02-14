/**
 * @fileoverview Tests for Design-Code Sync Tracker
 * 
 * @module tools/track_design_code_sync.test
 */

import { DesignCodeSyncTracker } from './track_design_code_sync.js';

/**
 * Mock TypeNavigator for testing
 */
class MockTypeNavigator {
  constructor(mockData) {
    this.mockData = mockData;
  }

  async queryByType(type) {
    return this.mockData[type] || [];
  }

  async queryEdges(query) {
    return this.mockData.edges?.filter(e => {
      if (query.source && e.source !== query.source) return false;
      if (query.target && e.target !== query.target) return false;
      if (query.edgeType && e.edgeType !== query.edgeType) return false;
      return true;
    }) || [];
  }

  async getNode(id) {
    return this.mockData.nodes?.[id] || null;
  }
}

/**
 * Test suite for DesignCodeSyncTracker
 */
export function runTests() {
  console.log('Running DesignCodeSyncTracker tests...\n');

  testBasicDriftDetection();
  testMissingImplementation();
  testMissingDesignSpec();
  testOrphanedImplementations();
  testSummaryGeneration();
  testReportFiltering();

  console.log('\n✅ All tests passed!');
}

function testBasicDriftDetection() {
  console.log('Test: Basic drift detection');

  const mockNav = new MockTypeNavigator({
    DesignSpecNode: [
      { id: 'button-spec', name: 'Button', source_file: 'button.pen' }
    ],
    edges: [
      { source: 'button-spec', target: 'button-impl', edgeType: 'impl_file' }
    ],
    nodes: {
      'button-impl': { file_path: 'button.tsx' }
    }
  });

  const tracker = new DesignCodeSyncTracker(mockNav);
  const status = tracker.calculateDriftStatus('button.pen', 'button.tsx', null, null);

  if (status.status !== 'in-sync') {
    throw new Error(`Expected 'in-sync', got '${status.status}'`);
  }

  console.log('  ✓ Detects in-sync components');
}

function testMissingImplementation() {
  console.log('Test: Missing implementation detection');

  const tracker = new DesignCodeSyncTracker(new MockTypeNavigator({}));
  const status = tracker.calculateDriftStatus('button.pen', null, 123456, null);

  if (status.status !== 'tsx-missing') {
    throw new Error(`Expected 'tsx-missing', got '${status.status}'`);
  }

  if (!status.reason.includes('no implementation')) {
    throw new Error('Expected reason to mention missing implementation');
  }

  console.log('  ✓ Detects missing implementations');
}

function testMissingDesignSpec() {
  console.log('Test: Missing design spec detection');

  const tracker = new DesignCodeSyncTracker(new MockTypeNavigator({}));
  const status = tracker.calculateDriftStatus(null, 'button.tsx', null, 123456);

  if (status.status !== 'pen-missing') {
    throw new Error(`Expected 'pen-missing', got '${status.status}'`);
  }

  if (!status.reason.includes('no design spec')) {
    throw new Error('Expected reason to mention missing design spec');
  }

  console.log('  ✓ Detects missing design specs');
}

function testOrphanedImplementations() {
  console.log('Test: Orphaned implementation detection');

  const tracker = new DesignCodeSyncTracker(new MockTypeNavigator({}));
  const componentName = tracker.extractComponentName('src/components/button.tsx');

  if (componentName !== 'button') {
    throw new Error(`Expected 'button', got '${componentName}'`);
  }

  console.log('  ✓ Extracts component names correctly');
}

function testSummaryGeneration() {
  console.log('Test: Summary generation');

  const reports = [
    { status: 'in-sync' },
    { status: 'in-sync' },
    { status: 'pen-newer' },
    { status: 'tsx-missing' }
  ];

  const tracker = new DesignCodeSyncTracker(new MockTypeNavigator({}));
  const summary = tracker.getSummary(reports);

  if (summary.total !== 4) {
    throw new Error(`Expected total 4, got ${summary.total}`);
  }

  if (summary.inSync !== 2) {
    throw new Error(`Expected inSync 2, got ${summary.inSync}`);
  }

  if (summary.outOfSync !== 2) {
    throw new Error(`Expected outOfSync 2, got ${summary.outOfSync}`);
  }

  if (summary.syncPercentage !== 50) {
    throw new Error(`Expected syncPercentage 50, got ${summary.syncPercentage}`);
  }

  console.log('  ✓ Generates accurate summaries');
}

function testReportFiltering() {
  console.log('Test: Report filtering');

  const reports = [
    { status: 'in-sync', componentName: 'A' },
    { status: 'pen-newer', componentName: 'B' },
    { status: 'in-sync', componentName: 'C' },
    { status: 'tsx-missing', componentName: 'D' }
  ];

  const tracker = new DesignCodeSyncTracker(new MockTypeNavigator({}));
  const filtered = tracker.filterByStatus(reports, 'in-sync');

  if (filtered.length !== 2) {
    throw new Error(`Expected 2 filtered reports, got ${filtered.length}`);
  }

  if (filtered[0].componentName !== 'A' || filtered[1].componentName !== 'C') {
    throw new Error('Filtered reports do not match expected components');
  }

  console.log('  ✓ Filters reports by status');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}