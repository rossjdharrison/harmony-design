/**
 * @fileoverview Tests for FileSystemStore
 * @module core/graph/FileSystemStore.test
 * 
 * Node.js test suite for filesystem-based graph persistence.
 * Run with: node core/graph/FileSystemStore.test.js
 */

import { FileSystemStore } from './FileSystemStore.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Simple test runner
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running FileSystemStore tests...\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✓ ${name}`);
      } catch (error) {
        this.failed++;
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);
      }
    }

    console.log(`\n${this.passed} passed, ${this.failed} failed`);
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

const runner = new TestRunner();

/**
 * Create temporary test directory
 */
async function createTempDir() {
  const testDir = join(tmpdir(), `fs-store-test-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test directory
 */
async function cleanupTempDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to cleanup temp dir:', error.message);
  }
}

/**
 * Create sample graph snapshot
 */
function createSampleSnapshot(id = 'test-snapshot') {
  return {
    id,
    timestamp: Date.now(),
    version: '1.0.0',
    graph: {
      nodes: [
        { id: 'node1', type: 'audio', data: { gain: 0.5 } },
        { id: 'node2', type: 'filter', data: { frequency: 440 } }
      ],
      edges: [
        { from: 'node1', to: 'node2', type: 'audio' }
      ]
    },
    metadata: {
      author: 'test',
      description: 'Test snapshot'
    }
  };
}

// Test: Store initialization
runner.test('should initialize store and create directories', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });
    await store.initialize();

    // Check directories exist
    const snapshotsDir = join(testDir, 'snapshots');
    const transactionsDir = join(testDir, 'transactions');
    const backupsDir = join(testDir, 'backups');

    await fs.access(snapshotsDir);
    await fs.access(transactionsDir);
    await fs.access(backupsDir);

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Save and load snapshot
runner.test('should save and load snapshot', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });
    await store.initialize();

    const snapshot = createSampleSnapshot();
    await store.saveSnapshot(snapshot);

    const loaded = await store.loadSnapshot(snapshot.id);

    if (!loaded) throw new Error('Snapshot not loaded');
    if (loaded.id !== snapshot.id) throw new Error('Snapshot ID mismatch');
    if (loaded.graph.nodes.length !== 2) throw new Error('Graph nodes mismatch');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Load latest snapshot
runner.test('should load latest snapshot', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });
    await store.initialize();

    // Save multiple snapshots
    await store.saveSnapshot(createSampleSnapshot('snapshot-1'));
    await new Promise(resolve => setTimeout(resolve, 10));
    await store.saveSnapshot(createSampleSnapshot('snapshot-2'));
    await new Promise(resolve => setTimeout(resolve, 10));
    await store.saveSnapshot(createSampleSnapshot('snapshot-3'));

    const latest = await store.loadLatestSnapshot();

    if (!latest) throw new Error('Latest snapshot not loaded');
    if (latest.id !== 'snapshot-3') throw new Error('Wrong snapshot loaded');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Transaction log
runner.test('should append and read transactions', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });
    await store.initialize();

    const transactions = [
      { type: 'addNode', nodeId: 'node1', timestamp: Date.now() },
      { type: 'addEdge', from: 'node1', to: 'node2', timestamp: Date.now() },
      { type: 'removeNode', nodeId: 'node3', timestamp: Date.now() }
    ];

    for (const tx of transactions) {
      await store.appendTransaction(tx);
    }

    const loaded = await store.readTransactions();

    if (loaded.length !== 3) throw new Error('Transaction count mismatch');
    if (loaded[0].type !== 'addNode') throw new Error('Transaction type mismatch');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Clear transactions
runner.test('should clear transaction log', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });
    await store.initialize();

    await store.appendTransaction({ type: 'test', data: 'test' });
    await store.clearTransactions();

    const loaded = await store.readTransactions();

    if (loaded.length !== 0) throw new Error('Transactions not cleared');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Compressed storage
runner.test('should save and load compressed snapshots', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ 
      basePath: testDir,
      compress: true 
    });
    await store.initialize();

    const snapshot = createSampleSnapshot();
    const savedPath = await store.saveSnapshot(snapshot);

    if (!savedPath.endsWith('.gz')) throw new Error('Snapshot not compressed');

    const loaded = await store.loadSnapshot(snapshot.id);

    if (!loaded) throw new Error('Compressed snapshot not loaded');
    if (loaded.id !== snapshot.id) throw new Error('Snapshot ID mismatch');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Backup rotation
runner.test('should rotate old backups', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ 
      basePath: testDir,
      maxBackups: 2
    });
    await store.initialize();

    const snapshot = createSampleSnapshot('rotating-snapshot');

    // Save multiple times to create backups
    for (let i = 0; i < 5; i++) {
      snapshot.timestamp = Date.now() + i;
      await store.saveSnapshot(snapshot);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const backupsDir = join(testDir, 'backups');
    const backups = await fs.readdir(backupsDir);

    if (backups.length > 2) throw new Error('Too many backups retained');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Storage statistics
runner.test('should return storage statistics', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });
    await store.initialize();

    await store.saveSnapshot(createSampleSnapshot('snapshot-1'));
    await store.saveSnapshot(createSampleSnapshot('snapshot-2'));
    await store.appendTransaction({ type: 'test' });

    const stats = await store.getStats();

    if (stats.snapshotCount !== 2) throw new Error('Snapshot count mismatch');
    if (stats.transactionCount !== 1) throw new Error('Transaction count mismatch');
    if (stats.totalSize === 0) throw new Error('Total size should be > 0');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Error handling - uninitialized store
runner.test('should throw error when not initialized', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });

    let errorThrown = false;
    try {
      await store.saveSnapshot(createSampleSnapshot());
    } catch (error) {
      errorThrown = error.message.includes('not initialized');
    }

    if (!errorThrown) throw new Error('Expected initialization error');
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Test: Load non-existent snapshot
runner.test('should return null for non-existent snapshot', async () => {
  const testDir = await createTempDir();
  
  try {
    const store = new FileSystemStore({ basePath: testDir });
    await store.initialize();

    const loaded = await store.loadSnapshot('non-existent');

    if (loaded !== null) throw new Error('Expected null for non-existent snapshot');

    await store.dispose();
  } finally {
    await cleanupTempDir(testDir);
  }
});

// Run all tests
runner.run();