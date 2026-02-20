/**
 * @fileoverview Tests for Availability Query Engine
 * @module harmony-graph/availability-query-engine.test
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { GraphEngine } from './graph-engine.js';
import { QueryEngine } from './query-engine.js';
import { AvailabilityQueryEngine, AvailabilityStatus } from './availability-query-engine.js';

describe('AvailabilityQueryEngine', () => {
  let graphEngine: GraphEngine;
  let queryEngine: QueryEngine;
  let availEngine: AvailabilityQueryEngine;

  beforeEach(() => {
    graphEngine = new GraphEngine();
    queryEngine = new QueryEngine(graphEngine);
    availEngine = new AvailabilityQueryEngine(graphEngine, queryEngine);
  });

  describe('checkAvailability', () => {
    it('should return Unknown for non-existent node', () => {
      const result = availEngine.checkAvailability('non-existent');
      
      expect(result.status).toBe(AvailabilityStatus.Unknown);
      expect(result.nodeId).toBe('non-existent');
      expect(result.reason).toContain('not found');
    });

    it('should return Available for node with no blocking conditions', () => {
      graphEngine.addNode({
        id: 'test-node',
        type: 'component',
        attributes: {}
      });

      const result = availEngine.checkAvailability('test-node');
      
      expect(result.status).toBe(AvailabilityStatus.Available);
      expect(result.nodeId).toBe('test-node');
    });

    it('should return Unavailable for disabled node', () => {
      graphEngine.addNode({
        id: 'disabled-node',
        type: 'component',
        attributes: { disabled: true }
      });

      const result = availEngine.checkAvailability('disabled-node');
      
      expect(result.status).toBe(AvailabilityStatus.Unavailable);
      expect(result.reason).toContain('disabled');
    });

    it('should return Busy for busy node', () => {
      graphEngine.addNode({
        id: 'busy-node',
        type: 'component',
        attributes: { busy: true }
      });

      const result = availEngine.checkAvailability('busy-node');
      
      expect(result.status).toBe(AvailabilityStatus.Busy);
    });

    it('should return InUse for node with active users', () => {
      graphEngine.addNode({
        id: 'inuse-node',
        type: 'component',
        attributes: { inUse: true, activeUsers: 3 }
      });

      const result = availEngine.checkAvailability('inuse-node');
      
      expect(result.status).toBe(AvailabilityStatus.InUse);
      expect(result.reason).toContain('3 users');
    });

    it('should respect explicit availability attribute', () => {
      graphEngine.addNode({
        id: 'explicit-node',
        type: 'component',
        attributes: { availability: AvailabilityStatus.Busy }
      });

      const result = availEngine.checkAvailability('explicit-node');
      
      expect(result.status).toBe(AvailabilityStatus.Busy);
    });
  });

  describe('checkDependencies', () => {
    it('should check transitive dependencies', () => {
      // Create dependency chain: A -> B -> C
      graphEngine.addNode({ id: 'A', type: 'component', attributes: {} });
      graphEngine.addNode({ id: 'B', type: 'component', attributes: {} });
      graphEngine.addNode({ id: 'C', type: 'component', attributes: { disabled: true } });
      
      graphEngine.addEdge({ source: 'A', target: 'B', type: 'depends-on' });
      graphEngine.addEdge({ source: 'B', target: 'C', type: 'depends-on' });

      const result = availEngine.checkAvailability('A', { includeTransitive: true });
      
      expect(result.status).toBe(AvailabilityStatus.Unavailable);
      expect(result.blockedBy).toContain('C');
    });

    it('should respect maxDepth option', () => {
      // Create long dependency chain
      graphEngine.addNode({ id: 'A', type: 'component', attributes: {} });
      graphEngine.addNode({ id: 'B', type: 'component', attributes: {} });
      graphEngine.addNode({ id: 'C', type: 'component', attributes: {} });
      graphEngine.addNode({ id: 'D', type: 'component', attributes: { disabled: true } });
      
      graphEngine.addEdge({ source: 'A', target: 'B', type: 'depends-on' });
      graphEngine.addEdge({ source: 'B', target: 'C', type: 'depends-on' });
      graphEngine.addEdge({ source: 'C', target: 'D', type: 'depends-on' });

      // With maxDepth=1, should not reach D
      const result = availEngine.checkAvailability('A', { 
        includeTransitive: true,
        maxDepth: 1
      });
      
      expect(result.status).toBe(AvailabilityStatus.Available);
    });
  });

  describe('checkBatch', () => {
    it('should check multiple nodes efficiently', () => {
      for (let i = 0; i < 10; i++) {
        graphEngine.addNode({
          id: `node-${i}`,
          type: 'component',
          attributes: i % 2 === 0 ? {} : { disabled: true }
        });
      }

      const nodeIds = Array.from({ length: 10 }, (_, i) => `node-${i}`);
      const results = availEngine.checkBatch(nodeIds);
      
      expect(results).toHaveLength(10);
      expect(results.filter(r => r.status === AvailabilityStatus.Available)).toHaveLength(5);
      expect(results.filter(r => r.status === AvailabilityStatus.Unavailable)).toHaveLength(5);
    });

    it('should complete within performance budget for 100 nodes', () => {
      for (let i = 0; i < 100; i++) {
        graphEngine.addNode({
          id: `node-${i}`,
          type: 'component',
          attributes: {}
        });
      }

      const nodeIds = Array.from({ length: 100 }, (_, i) => `node-${i}`);
      
      const startTime = performance.now();
      availEngine.checkBatch(nodeIds);
      const elapsed = performance.now() - startTime;
      
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('findAvailable', () => {
    it('should find all available nodes of a type', () => {
      graphEngine.addNode({ id: 'comp-1', type: 'button', attributes: {} });
      graphEngine.addNode({ id: 'comp-2', type: 'button', attributes: { disabled: true } });
      graphEngine.addNode({ id: 'comp-3', type: 'button', attributes: {} });
      graphEngine.addNode({ id: 'comp-4', type: 'input', attributes: {} });

      const available = availEngine.findAvailable('button');
      
      expect(available).toHaveLength(2);
      expect(available).toContain('comp-1');
      expect(available).toContain('comp-3');
      expect(available).not.toContain('comp-2');
      expect(available).not.toContain('comp-4');
    });
  });

  describe('waitForAvailability', () => {
    it('should resolve immediately if node is available', async () => {
      graphEngine.addNode({ id: 'ready-node', type: 'component', attributes: {} });

      const startTime = Date.now();
      const result = await availEngine.waitForAvailability('ready-node');
      const elapsed = Date.now() - startTime;
      
      expect(result.status).toBe(AvailabilityStatus.Available);
      expect(elapsed).toBeLessThan(50);
    });

    it('should timeout if node never becomes available', async () => {
      graphEngine.addNode({ 
        id: 'blocked-node', 
        type: 'component', 
        attributes: { disabled: true } 
      });

      const result = await availEngine.waitForAvailability('blocked-node', { 
        timeout: 200 
      });
      
      expect(result.status).toBe(AvailabilityStatus.Unavailable);
      expect(result.reason).toContain('Timeout');
    });
  });

  describe('performance', () => {
    it('should check single node availability in < 1ms', () => {
      graphEngine.addNode({ id: 'perf-node', type: 'component', attributes: {} });

      const startTime = performance.now();
      availEngine.checkAvailability('perf-node');
      const elapsed = performance.now() - startTime;
      
      expect(elapsed).toBeLessThan(1);
    });
  });
});