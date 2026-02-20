/**
 * @fileoverview Component Schema Validation Example
 * @doc-ref DESIGN_SYSTEM.md#component-graph-nodes
 * 
 * Example demonstrating validation of Component graph nodes
 * against the JSON schema definition.
 */

import { validateSchema } from '../utils/schema-validator.js';
import componentSchema from '../schemas/component.schema.json' assert { type: 'json' };

/**
 * Example valid component node
 */
const validComponent = {
  id: 'comp-audio-waveform',
  type: 'Component',
  name: 'AudioWaveform',
  componentType: 'organism',
  description: 'Displays audio waveform visualization with playhead',
  props: {
    audioBuffer: { type: 'AudioBuffer', required: true },
    width: { type: 'number', default: 800 },
    height: { type: 'number', default: 200 },
    color: { type: 'string', default: '#4A90E2' }
  },
  events: ['waveformClick', 'playheadMove', 'zoomChange'],
  slots: ['controls', 'overlay'],
  dependencies: ['WaveformRenderer', 'PlayheadControl'],
  metadata: {
    created: '2024-01-10T09:00:00Z',
    lastModified: '2024-01-15T16:45:00Z',
    version: '2.1.0',
    tags: ['audio', 'visualization', 'interactive']
  }
};

/**
 * Example invalid component node (wrong componentType)
 */
const invalidComponent = {
  id: 'comp-invalid',
  type: 'Component',
  name: 'InvalidComponent',
  componentType: 'widget', // Invalid - not in enum
  description: 'Component with invalid type'
};

// Validate examples
console.log('=== Component Schema Validation Examples ===\n');

console.log('1. Valid Component Node:');
const validResult = validateSchema(componentSchema, validComponent);
console.log(`   Valid: ${validResult.valid}`);
if (!validResult.valid) {
  console.log('   Errors:', validResult.errors);
}
console.log();

console.log('2. Invalid Component Node:');
const invalidResult = validateSchema(componentSchema, invalidComponent);
console.log(`   Valid: ${invalidResult.valid}`);
if (!invalidResult.valid) {
  console.log('   Errors:', invalidResult.errors);
}
console.log();

console.log('=== Validation Complete ===');