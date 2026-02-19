/**
 * @fileoverview Design Handoff Documentation Watcher
 * Watches for changes to components and tokens, automatically regenerates
 * design handoff documentation.
 * 
 * @module scripts/watch-design-handoff
 */

import { watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateDesignHandoff } from './generate-design-handoff.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let regenerateTimeout = null;

/**
 * Debounced regeneration function
 */
function scheduleRegeneration() {
  if (regenerateTimeout) {
    clearTimeout(regenerateTimeout);
  }
  
  regenerateTimeout = setTimeout(() => {
    console.log('\n🔄 Changes detected, regenerating documentation...\n');
    try {
      generateDesignHandoff();
      console.log('✅ Documentation updated successfully\n');
    } catch (error) {
      console.error('❌ Error regenerating documentation:', error.message);
    }
  }, 1000); // Debounce for 1 second
}

/**
 * Starts watching for changes
 */
function startWatching() {
  console.log('👀 Watching for changes to components and tokens...\n');
  console.log('   Press Ctrl+C to stop\n');
  
  const watchDirs = [
    join(rootDir, 'components'),
    join(rootDir, 'primitives'),
    join(rootDir, 'controls'),
    join(rootDir, 'organisms'),
    join(rootDir, 'composites'),
    join(rootDir, 'templates'),
    join(rootDir, 'tokens')
  ];
  
  for (const dir of watchDirs) {
    try {
      watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.js') || filename.endsWith('.json'))) {
          console.log(`📝 ${eventType}: ${filename}`);
          scheduleRegeneration();
        }
      });
      console.log(`   Watching: ${dir}`);
    } catch (error) {
      // Directory might not exist yet
      console.log(`   Skipping: ${dir} (not found)`);
    }
  }
  
  console.log('\n✅ Watchers started\n');
  
  // Generate initial documentation
  generateDesignHandoff();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWatching();
}

export { startWatching };