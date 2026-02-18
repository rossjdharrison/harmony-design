/**
 * @fileoverview Example usage of Design-Code Sync Tracker
 * 
 * Demonstrates how to use the track_design_code_sync tool to monitor
 * drift between design specifications and implementations.
 * 
 * @module examples/track_sync_usage
 */

import { TypeNavigator } from '../core/type_navigator.js';
import { trackDesignCodeSync, DesignCodeSyncTracker } from '../tools/track_design_code_sync.js';

/**
 * Example 1: Basic sync check
 */
async function example1_basicSyncCheck() {
  console.log('=== Example 1: Basic Sync Check ===\n');

  // Initialize TypeNavigator with graph connection
  const typeNav = new TypeNavigator(window.harmonyGraph);

  // Run sync tracker with default options
  const result = await trackDesignCodeSync(typeNav);

  console.log(`Found ${result.summary.total} components`);
  console.log(`${result.summary.inSync} in sync, ${result.summary.outOfSync} out of sync`);
  console.log(`Sync rate: ${result.summary.syncPercentage}%\n`);
}

/**
 * Example 2: Filter by specific drift status
 */
async function example2_filterByStatus() {
  console.log('=== Example 2: Filter by Status ===\n');

  const typeNav = new TypeNavigator(window.harmonyGraph);

  // Only show components where design is newer than code
  const result = await trackDesignCodeSync(typeNav, {
    filterStatus: 'pen-newer'
  });

  console.log('Components needing implementation updates:');
  for (const report of result.reports) {
    console.log(`  - ${report.componentName}: ${report.driftReason}`);
  }
  console.log();
}

/**
 * Example 3: Summary-only mode
 */
async function example3_summaryOnly() {
  console.log('=== Example 3: Summary Only ===\n');

  const typeNav = new TypeNavigator(window.harmonyGraph);

  // Get just the summary without full report
  const result = await trackDesignCodeSync(typeNav, {
    summaryOnly: true
  });

  console.log(result.reportText);
  console.log();
}

/**
 * Example 4: Programmatic analysis
 */
async function example4_programmaticAnalysis() {
  console.log('=== Example 4: Programmatic Analysis ===\n');

  const typeNav = new TypeNavigator(window.harmonyGraph);
  const tracker = new DesignCodeSyncTracker(typeNav);

  // Scan all components
  const reports = await tracker.scanAllComponents();

  // Find high-priority issues (missing implementations)
  const missingImpls = tracker.filterByStatus(reports, 'tsx-missing');

  if (missingImpls.length > 0) {
    console.log('⚠️  High Priority: Design specs without implementations:');
    for (const report of missingImpls) {
      console.log(`  - ${report.componentName} (${report.penPath})`);
    }
  }

  // Find components that may need design updates
  const codeNewer = tracker.filterByStatus(reports, 'tsx-newer');

  if (codeNewer.length > 0) {
    console.log('\n📝 Design specs may need updating:');
    for (const report of codeNewer) {
      console.log(`  - ${report.componentName}: ${report.driftReason}`);
    }
  }

  console.log();
}

/**
 * Example 5: Generate markdown report for CI/CD
 */
async function example5_cicdReport() {
  console.log('=== Example 5: CI/CD Report ===\n');

  const typeNav = new TypeNavigator(window.harmonyGraph);
  const tracker = new DesignCodeSyncTracker(typeNav);

  const reports = await tracker.scanAllComponents();
  const summary = tracker.getSummary(reports);

  // Exit with error if sync rate is below threshold
  const SYNC_THRESHOLD = 80;

  if (summary.syncPercentage < SYNC_THRESHOLD) {
    console.error(`❌ Sync rate ${summary.syncPercentage}% is below threshold ${SYNC_THRESHOLD}%`);
    console.error(tracker.generateReport(reports));
    process.exit(1);
  } else {
    console.log(`✅ Sync rate ${summary.syncPercentage}% meets threshold ${SYNC_THRESHOLD}%`);
  }
}

/**
 * Example 6: Watch mode (continuous monitoring)
 */
async function example6_watchMode() {
  console.log('=== Example 6: Watch Mode ===\n');

  const typeNav = new TypeNavigator(window.harmonyGraph);
  const tracker = new DesignCodeSyncTracker(typeNav);

  console.log('Monitoring design-code sync (press Ctrl+C to stop)...\n');

  // Check every 30 seconds
  setInterval(async () => {
    const reports = await tracker.scanAllComponents();
    const summary = tracker.getSummary(reports);

    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Sync: ${summary.inSync}/${summary.total} (${summary.syncPercentage}%)`);

    // Alert on new drift
    const outOfSync = tracker.filterByStatus(reports, 'pen-newer')
      .concat(tracker.filterByStatus(reports, 'tsx-newer'));

    if (outOfSync.length > 0) {
      console.log(`  ⚠️  ${outOfSync.length} component(s) out of sync`);
    }
  }, 30000);
}

// Export examples for use in documentation or testing
export const examples = {
  basicSyncCheck: example1_basicSyncCheck,
  filterByStatus: example2_filterByStatus,
  summaryOnly: example3_summaryOnly,
  programmaticAnalysis: example4_programmaticAnalysis,
  cicdReport: example5_cicdReport,
  watchMode: example6_watchMode
};