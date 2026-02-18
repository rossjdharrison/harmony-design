#!/usr/bin/env node

/**
 * @fileoverview Token Build Script
 * CLI wrapper for Style Dictionary token transformation
 * 
 * Usage: node scripts/build-tokens.js
 * 
 * @see DESIGN_SYSTEM.md#design-tokens
 */

import { build } from '../tokens/style-dictionary/build.js';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Harmony Design System - Token Build                      ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});