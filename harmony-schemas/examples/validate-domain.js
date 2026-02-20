/**
 * @fileoverview Domain Schema Validation Example
 * @doc-ref DESIGN_SYSTEM.md#domain-bounded-context
 * 
 * Example demonstrating validation of Domain graph nodes
 * against the JSON schema definition.
 */

import { validateSchema } from '../utils/schema-validator.js';
import domainSchema from '../schemas/domain.schema.json' assert { type: 'json' };

/**
 * Example valid domain node
 */
const validDomain = {
  id: 'domain-audio-engine',
  type: 'Domain',
  name: 'Audio Engine',
  description: 'Core audio processing and playback engine',
  ubiquitousLanguage: {
    Track: 'An audio file loaded into the workspace',
    Timeline: 'The temporal arrangement of tracks',
    Playhead: 'Current playback position marker'
  },
  aggregateRoots: ['Project', 'Track', 'Timeline'],
  entities: ['AudioClip', 'EffectChain', 'Automation'],
  valueObjects: ['TimePosition', 'AudioBuffer', 'SampleRate'],
  domainEvents: ['TrackLoaded', 'PlaybackStarted', 'EffectApplied'],
  metadata: {
    created: '2024-01-15T10:00:00Z',
    lastModified: '2024-01-20T14:30:00Z',
    version: '1.0.0',
    tags: ['audio', 'core', 'processing']
  }
};

/**
 * Example invalid domain node (missing required fields)
 */
const invalidDomain = {
  id: 'domain-incomplete',
  type: 'Domain',
  name: 'Incomplete Domain'
  // Missing: description, ubiquitousLanguage, aggregateRoots
};

// Validate examples
console.log('=== Domain Schema Validation Examples ===\n');

console.log('1. Valid Domain Node:');
const validResult = validateSchema(domainSchema, validDomain);
console.log(`   Valid: ${validResult.valid}`);
if (!validResult.valid) {
  console.log('   Errors:', validResult.errors);
}
console.log();

console.log('2. Invalid Domain Node:');
const invalidResult = validateSchema(domainSchema, invalidDomain);
console.log(`   Valid: ${invalidResult.valid}`);
if (!invalidResult.valid) {
  console.log('   Errors:', invalidResult.errors);
}
console.log();

console.log('=== Validation Complete ===');