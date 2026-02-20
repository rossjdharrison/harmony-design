/**
 * @fileoverview Intent Schema Validation Example
 * @doc-ref DESIGN_SYSTEM.md#intent-graph-nodes
 * 
 * Example demonstrating validation of Intent graph nodes
 * against the JSON schema definition.
 */

import { validateSchema } from '../utils/schema-validator.js';
import intentSchema from '../schemas/intent.schema.json' assert { type: 'json' };

/**
 * Example valid intent node
 */
const validIntent = {
  id: 'intent-play-audio',
  type: 'Intent',
  name: 'Play Audio Track',
  description: 'User wants to start audio playback',
  trigger: 'user-action',
  priority: 'high',
  context: {
    userRole: 'producer',
    workflowStage: 'editing',
    requiredState: ['track-loaded', 'timeline-ready']
  },
  targetDomains: ['audio-engine', 'timeline'],
  expectedOutcome: 'Audio playback begins at current playhead position',
  metadata: {
    created: '2024-01-12T11:30:00Z',
    lastModified: '2024-01-18T09:15:00Z',
    version: '1.2.0',
    tags: ['playback', 'user-action', 'core']
  }
};

/**
 * Example invalid intent node (invalid priority)
 */
const invalidIntent = {
  id: 'intent-invalid',
  type: 'Intent',
  name: 'Invalid Intent',
  description: 'Intent with invalid priority',
  trigger: 'user-action',
  priority: 'urgent' // Invalid - not in enum
};

// Validate examples
console.log('=== Intent Schema Validation Examples ===\n');

console.log('1. Valid Intent Node:');
const validResult = validateSchema(intentSchema, validIntent);
console.log(`   Valid: ${validResult.valid}`);
if (!validResult.valid) {
  console.log('   Errors:', validResult.errors);
}
console.log();

console.log('2. Invalid Intent Node:');
const invalidResult = validateSchema(intentSchema, invalidIntent);
console.log(`   Valid: ${invalidResult.valid}`);
if (!invalidResult.valid) {
  console.log('   Errors:', validResult.errors);
}
console.log();

console.log('=== Validation Complete ===');