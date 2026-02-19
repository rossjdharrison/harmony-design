/**
 * @fileoverview File watcher for automatic Figma token synchronization
 * Watches local token files and triggers sync when changes are detected
 * @module scripts/figma-sync-watcher
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { FigmaTokenSync } from './figma-token-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Watch for token file changes and trigger sync
 */
class FigmaSyncWatcher {
  /**
   * @param {FigmaTokenSync} sync - Sync instance
   * @param {Object} config - Watcher configuration
   */
  constructor(sync, config = {}) {
    this.sync = sync;
    this.config = {
      watchPath: path.join(__dirname, '../tokens/design-tokens.json'),
      debounceMs: 1000,
      autoSync: false,
      ...config
    };
    this.debounceTimer = null;
    this.watcher = null;
  }

  /**
   * Start watching for changes
   */
  async start() {
    console.log('👀 Starting Figma sync watcher...');
    console.log(`   Watching: ${this.config.watchPath}`);

    try {
      const { watch } = await import('fs');
      
      this.watcher = watch(this.config.watchPath, async (eventType, filename) => {
        if (eventType === 'change') {
          console.log(`📝 Token file changed: ${filename}`);
          this.handleChange();
        }
      });

      console.log('✅ Watcher started successfully');
    } catch (error) {
      console.error('❌ Failed to start watcher:', error.message);
      throw error;
    }
  }

  /**
   * Handle file change with debouncing
   */
  handleChange() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      if (this.config.autoSync) {
        console.log('🔄 Auto-syncing changes...');
        try {
          await this.sync.pushToFigma({ verbose: true });
          console.log('✅ Auto-sync complete');
        } catch (error) {
          console.error('❌ Auto-sync failed:', error.message);
        }
      } else {
        console.log('💡 Changes detected. Run sync manually or enable autoSync.');
      }
    }, this.config.debounceMs);
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('🛑 Watcher stopped');
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

/**
 * CLI entry point
 */
async function main() {
  const figmaToken = process.env.FIGMA_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;

  if (!figmaToken || !fileKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   FIGMA_TOKEN - Your Figma API token');
    console.error('   FIGMA_FILE_KEY - Your Figma file key');
    process.exit(1);
  }

  const sync = new FigmaTokenSync(figmaToken, fileKey);
  const watcher = new FigmaSyncWatcher(sync, {
    autoSync: process.argv.includes('--auto-sync')
  });

  await watcher.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down watcher...');
    watcher.stop();
    process.exit(0);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FigmaSyncWatcher };