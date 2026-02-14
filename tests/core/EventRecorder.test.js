/**
 * @fileoverview Tests for EventRecorder
 * @module tests/core/EventRecorder.test
 */

import { EventRecorder } from '../../src/core/EventRecorder.js';

/**
 * Mock EventBus for testing
 */
class MockEventBus {
  constructor() {
    this.emitCalls = [];
  }

  emit(type, payload, source) {
    this.emitCalls.push({ type, payload, source });
  }
}

/**
 * Run all EventRecorder tests
 */
export function runEventRecorderTests() {
  console.log('Running EventRecorder tests...');

  testRecorderStartStop();
  testEventCapture();
  testMaxEventsLimit();
  testExportJSON();
  testFiltering();
  testStats();

  console.log('✓ All EventRecorder tests passed');
}

function testRecorderStartStop() {
  const eventBus = new MockEventBus();
  const recorder = new EventRecorder(eventBus);

  // Should not be recording initially
  if (recorder.isRecording) {
    throw new Error('Recorder should not be recording initially');
  }

  // Start recording
  recorder.start();
  if (!recorder.isRecording) {
    throw new Error('Recorder should be recording after start()');
  }

  // Stop recording
  recorder.stop();
  if (recorder.isRecording) {
    throw new Error('Recorder should not be recording after stop()');
  }

  console.log('  ✓ Start/stop works correctly');
}

function testEventCapture() {
  const eventBus = new MockEventBus();
  const recorder = new EventRecorder(eventBus);

  recorder.start();

  // Emit some events
  eventBus.emit('TestEvent1', { data: 'test1' }, 'TestComponent');
  eventBus.emit('TestEvent2', { data: 'test2' }, 'TestComponent');

  const events = recorder.getEvents();
  if (events.length !== 2) {
    throw new Error(`Expected 2 events, got ${events.length}`);
  }

  if (events[0].type !== 'TestEvent1') {
    throw new Error('First event type incorrect');
  }

  if (events[1].type !== 'TestEvent2') {
    throw new Error('Second event type incorrect');
  }

  recorder.stop();
  console.log('  ✓ Event capture works correctly');
}

function testMaxEventsLimit() {
  const eventBus = new MockEventBus();
  const recorder = new EventRecorder(eventBus);
  recorder.maxEvents = 10; // Set low limit for testing

  recorder.start();

  // Emit more events than limit
  for (let i = 0; i < 15; i++) {
    eventBus.emit(`Event${i}`, { index: i }, 'Test');
  }

  const events = recorder.getEvents();
  if (events.length !== 10) {
    throw new Error(`Expected 10 events (max), got ${events.length}`);
  }

  // Should have dropped oldest events
  if (events[0].type !== 'Event5') {
    throw new Error('Oldest events not dropped correctly');
  }

  recorder.stop();
  console.log('  ✓ Max events limit works correctly');
}

function testExportJSON() {
  const eventBus = new MockEventBus();
  const recorder = new EventRecorder(eventBus);

  recorder.start();
  eventBus.emit('TestEvent', { data: 'test' }, 'TestComponent');
  recorder.stop();

  const json = recorder.exportJSON();
  const parsed = JSON.parse(json);

  if (!parsed.metadata) {
    throw new Error('Exported JSON missing metadata');
  }

  if (!parsed.events) {
    throw new Error('Exported JSON missing events');
  }

  if (parsed.events.length !== 1) {
    throw new Error('Exported JSON has wrong event count');
  }

  console.log('  ✓ JSON export works correctly');
}

function testFiltering() {
  const eventBus = new MockEventBus();
  const recorder = new EventRecorder(eventBus);

  recorder.start();
  eventBus.emit('TypeA', {}, 'Source1');
  eventBus.emit('TypeB', {}, 'Source1');
  eventBus.emit('TypeA', {}, 'Source2');

  const typeAEvents = recorder.filterByType('TypeA');
  if (typeAEvents.length !== 2) {
    throw new Error('Type filtering incorrect');
  }

  const source1Events = recorder.filterBySource('Source1');
  if (source1Events.length !== 2) {
    throw new Error('Source filtering incorrect');
  }

  recorder.stop();
  console.log('  ✓ Event filtering works correctly');
}

function testStats() {
  const eventBus = new MockEventBus();
  const recorder = new EventRecorder(eventBus);

  recorder.start();
  eventBus.emit('TypeA', {}, 'Source1');
  eventBus.emit('TypeA', {}, 'Source1');
  eventBus.emit('TypeB', {}, 'Source2');

  const stats = recorder.getStats();

  if (stats.totalEvents !== 3) {
    throw new Error('Stats total events incorrect');
  }

  if (Object.keys(stats.eventTypes).length !== 2) {
    throw new Error('Stats event types count incorrect');
  }

  if (stats.eventTypes.TypeA !== 2) {
    throw new Error('Stats event type count incorrect');
  }

  if (Object.keys(stats.sources).length !== 2) {
    throw new Error('Stats sources count incorrect');
  }

  recorder.stop();
  console.log('  ✓ Statistics calculation works correctly');
}