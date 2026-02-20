/**
 * @fileoverview E2E tests for audio workflow journeys
 * @module tests/e2e/journeys/audio-workflow
 */

import { test, expect } from '@playwright/test';
import {
  startEventBusMonitoring,
  getEventBusLog,
  assertPerformanceBudget
} from '../helpers/performance-metrics.js';
import {
  waitForComponent,
  clickInShadow,
  waitForEvent,
  setComponentProperty
} from '../helpers/component-helpers.js';

test.describe('Audio Workflow Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-pages/audio-demo.html');
    await startEventBusMonitoring(page);
  });

  test('User loads and plays audio file', async ({ page }) => {
    await waitForComponent(page, 'harmony-audio-player');
    
    // Load audio file
    await setComponentProperty(page, 'harmony-audio-player', 'src', '/examples/audio/sample.mp3');
    
    // Wait for load event
    const loadEvent = await waitForEvent(page, 'audio:loaded', 10000);
    expect(loadEvent.duration).toBeGreaterThan(0);
    
    // Start playback
    await clickInShadow(page, 'harmony-audio-player', '[data-action="play"]');
    
    // Wait for playback start
    const playEvent = await waitForEvent(page, 'audio:play');
    expect(playEvent.timestamp).toBeDefined();
    
    // Measure audio latency
    const latency = await page.evaluate(() => {
      return window.__audioContext?.baseLatency || 0;
    });
    
    assertPerformanceBudget({ audioLatency: latency * 1000 }, { audioLatency: 10 });
  });

  test('User adjusts volume and pan', async ({ page }) => {
    await waitForComponent(page, 'harmony-audio-player');
    
    // Set volume
    await setComponentProperty(page, 'harmony-audio-player', 'volume', 0.5);
    const volumeEvent = await waitForEvent(page, 'audio:volume-change');
    expect(volumeEvent.volume).toBe(0.5);
    
    // Set pan
    await setComponentProperty(page, 'harmony-audio-player', 'pan', -0.5);
    const panEvent = await waitForEvent(page, 'audio:pan-change');
    expect(panEvent.pan).toBe(-0.5);
  });

  test('User creates audio graph', async ({ page }) => {
    await page.goto('/test-pages/audio-graph-editor.html');
    
    await waitForComponent(page, 'harmony-graph-editor');
    
    // Add oscillator node
    await page.evaluate(() => {
      window.EventBus.publish('graph:add-node', {
        type: 'oscillator',
        x: 100,
        y: 100
      });
    });
    
    const nodeAdded = await waitForEvent(page, 'graph:node-added');
    expect(nodeAdded.type).toBe('oscillator');
    
    // Add gain node
    await page.evaluate(() => {
      window.EventBus.publish('graph:add-node', {
        type: 'gain',
        x: 300,
        y: 100
      });
    });
    
    // Connect nodes
    await page.evaluate(({ sourceId, targetId }) => {
      window.EventBus.publish('graph:connect', {
        source: sourceId,
        target: targetId
      });
    }, { sourceId: nodeAdded.id, targetId: (await waitForEvent(page, 'graph:node-added')).id });
    
    const edgeAdded = await waitForEvent(page, 'graph:edge-added');
    expect(edgeAdded.source).toBeDefined();
    expect(edgeAdded.target).toBeDefined();
  });

  test('User applies audio effects', async ({ page }) => {
    await waitForComponent(page, 'harmony-audio-player');
    
    // Load audio
    await setComponentProperty(page, 'harmony-audio-player', 'src', '/examples/audio/sample.mp3');
    await waitForEvent(page, 'audio:loaded', 10000);
    
    // Apply reverb effect
    await page.evaluate(() => {
      window.EventBus.publish('audio:add-effect', {
        type: 'reverb',
        params: { roomSize: 0.8, dampening: 0.5 }
      });
    });
    
    const effectAdded = await waitForEvent(page, 'audio:effect-added');
    expect(effectAdded.type).toBe('reverb');
    
    // Start playback with effect
    await clickInShadow(page, 'harmony-audio-player', '[data-action="play"]');
    await waitForEvent(page, 'audio:play');
    
    // Verify effect is active
    const isActive = await page.evaluate(() => {
      return document.querySelector('harmony-audio-player').hasActiveEffects;
    });
    expect(isActive).toBe(true);
  });

  test('User records audio', async ({ page }) => {
    await page.goto('/test-pages/audio-recorder.html');
    
    await waitForComponent(page, 'harmony-audio-recorder');
    
    // Grant microphone permission (in test environment)
    await page.context().grantPermissions(['microphone']);
    
    // Start recording
    await clickInShadow(page, 'harmony-audio-recorder', '[data-action="start"]');
    const startEvent = await waitForEvent(page, 'recorder:start');
    expect(startEvent.timestamp).toBeDefined();
    
    // Record for 2 seconds
    await page.waitForTimeout(2000);
    
    // Stop recording
    await clickInShadow(page, 'harmony-audio-recorder', '[data-action="stop"]');
    const stopEvent = await waitForEvent(page, 'recorder:stop');
    expect(stopEvent.duration).toBeGreaterThan(1.9);
    expect(stopEvent.duration).toBeLessThan(2.5);
    
    // Verify audio data
    expect(stopEvent.blob).toBeDefined();
  });
});