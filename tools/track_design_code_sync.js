/**
 * @fileoverview Design-Code Sync Tracker
 * 
 * Monitors drift between .pen design specifications and .tsx implementations.
 * Detects when design specs change but implementations haven't been updated,
 * or when implementations exist without corresponding design specs.
 * 
 * Related documentation: harmony-design/DESIGN_SYSTEM.md § Design-Code Sync
 * 
 * @module tools/track_design_code_sync
 */

import { TypeNavigator, isTypeNavigator } from '../core/type_navigator.js';

/**
 * @typedef {Object} DriftReport
 * @property {string} componentId - Component identifier
 * @property {string} componentName - Human-readable component name
 * @property {DriftStatus} status - Current drift status
 * @property {string|null} penPath - Path to .pen file (if exists)
 * @property {string|null} tsxPath - Path to .tsx file (if exists)
 * @property {number|null} penLastModified - Timestamp of last .pen modification
 * @property {number|null} tsxLastModified - Timestamp of last .tsx modification
 * @property {string|null} driftReason - Human-readable drift explanation
 */

/**
 * @typedef {'in-sync'|'pen-newer'|'tsx-newer'|'pen-missing'|'tsx-missing'|'both-missing'} DriftStatus
 */

/**
 * Track design-code synchronization status across all components
 */
export class DesignCodeSyncTracker {
  /**
   * @param {TypeNavigator} typeNavigator - Type navigator instance for querying graph
   */
  constructor(typeNavigator) {
    if (!isTypeNavigator(typeNavigator)) {
      throw new Error('DesignCodeSyncTracker requires a TypeNavigator-compatible instance (queryByType, queryEdges, getNode)');
    }
    this.typeNavigator = typeNavigator;
  }

  /**
   * Scan all components and generate drift report
   * 
   * @returns {Promise<DriftReport[]>} Array of drift reports for all components
   */
  async scanAllComponents() {
    const reports = [];
    
    // Query all DesignSpecNodes (components with design specs)
    const designSpecs = await this.typeNavigator.queryByType('DesignSpecNode');
    
    for (const spec of designSpecs) {
      const report = await this.analyzeComponent(spec);
      reports.push(report);
    }
    
    // Also check for orphaned implementations (tsx without pen)
    const orphanedImpls = await this.findOrphanedImplementations(designSpecs);
    reports.push(...orphanedImpls);
    
    return reports;
  }

  /**
   * Analyze a single component for drift
   * 
   * @param {Object} designSpec - DesignSpecNode from graph
   * @returns {Promise<DriftReport>} Drift report for this component
   * @private
   */
  async analyzeComponent(designSpec) {
    const componentId = designSpec.id;
    const componentName = designSpec.name || componentId;
    
    // Get .pen file path from spec
    const penPath = designSpec.source_file || null;
    
    // Find linked .tsx implementation via impl_file edge
    const tsxPath = await this.findImplementationPath(componentId);
    
    // Get modification timestamps
    const penLastModified = penPath ? await this.getFileTimestamp(penPath) : null;
    const tsxLastModified = tsxPath ? await this.getFileTimestamp(tsxPath) : null;
    
    // Determine drift status
    const { status, reason } = this.calculateDriftStatus(
      penPath,
      tsxPath,
      penLastModified,
      tsxLastModified
    );
    
    return {
      componentId,
      componentName,
      status,
      penPath,
      tsxPath,
      penLastModified,
      tsxLastModified,
      driftReason: reason
    };
  }

  /**
   * Find implementation file path for a component
   * 
   * @param {string} componentId - Component identifier
   * @returns {Promise<string|null>} Path to .tsx file or null
   * @private
   */
  async findImplementationPath(componentId) {
    // Query for impl_file edges from this component
    const edges = await this.typeNavigator.queryEdges({
      source: componentId,
      edgeType: 'impl_file'
    });
    
    if (edges.length === 0) {
      return null;
    }
    
    // Get the target node (should be a file path or reference)
    const implNode = await this.typeNavigator.getNode(edges[0].target);
    return implNode?.file_path || implNode?.path || null;
  }

  /**
   * Get file modification timestamp
   * 
   * @param {string} filePath - Path to file
   * @returns {Promise<number|null>} Unix timestamp or null if file doesn't exist
   * @private
   */
  async getFileTimestamp(filePath) {
    try {
      // In browser context, we'd need to query this from a service
      // For now, return null to indicate we need file system access
      // In a real implementation, this would call a file system API
      return null;
    } catch (error) {
      console.warn(`Could not get timestamp for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Calculate drift status based on file existence and timestamps
   * 
   * @param {string|null} penPath - Path to .pen file
   * @param {string|null} tsxPath - Path to .tsx file
   * @param {number|null} penTime - .pen modification time
   * @param {number|null} tsxTime - .tsx modification time
   * @returns {{status: DriftStatus, reason: string|null}} Drift status and explanation
   * @private
   */
  calculateDriftStatus(penPath, tsxPath, penTime, tsxTime) {
    // Both missing
    if (!penPath && !tsxPath) {
      return {
        status: 'both-missing',
        reason: 'No design spec or implementation found'
      };
    }
    
    // Only pen exists
    if (penPath && !tsxPath) {
      return {
        status: 'tsx-missing',
        reason: 'Design spec exists but no implementation found'
      };
    }
    
    // Only tsx exists
    if (!penPath && tsxPath) {
      return {
        status: 'pen-missing',
        reason: 'Implementation exists but no design spec found'
      };
    }
    
    // Both exist - compare timestamps
    if (penTime === null || tsxTime === null) {
      // Can't determine timestamps - assume in sync
      return {
        status: 'in-sync',
        reason: 'Both files exist (timestamps unavailable)'
      };
    }
    
    const timeDiff = Math.abs(penTime - tsxTime);
    const SYNC_THRESHOLD_MS = 60000; // 1 minute tolerance
    
    if (timeDiff < SYNC_THRESHOLD_MS) {
      return {
        status: 'in-sync',
        reason: 'Design and implementation are synchronized'
      };
    }
    
    if (penTime > tsxTime) {
      const daysDiff = Math.floor((penTime - tsxTime) / (1000 * 60 * 60 * 24));
      return {
        status: 'pen-newer',
        reason: `Design spec modified ${daysDiff} day(s) after implementation`
      };
    }
    
    const daysDiff = Math.floor((tsxTime - penTime) / (1000 * 60 * 60 * 24));
    return {
      status: 'tsx-newer',
      reason: `Implementation modified ${daysDiff} day(s) after design spec`
    };
  }

  /**
   * Find implementations that don't have corresponding design specs
   * 
   * @param {Array<Object>} designSpecs - All known design specs
   * @returns {Promise<DriftReport[]>} Reports for orphaned implementations
   * @private
   */
  async findOrphanedImplementations(designSpecs) {
    const reports = [];
    const knownPaths = new Set(designSpecs.map(s => s.source_file).filter(Boolean));
    
    // Query all implementation file nodes
    const implNodes = await this.typeNavigator.queryByType('ImplementationFile');
    
    for (const implNode of implNodes) {
      const tsxPath = implNode.file_path || implNode.path;
      if (!tsxPath) continue;
      
      // Check if this implementation has a design spec
      const hasSpec = await this.hasDesignSpec(implNode.id);
      
      if (!hasSpec) {
        reports.push({
          componentId: implNode.id,
          componentName: this.extractComponentName(tsxPath),
          status: 'pen-missing',
          penPath: null,
          tsxPath,
          penLastModified: null,
          tsxLastModified: await this.getFileTimestamp(tsxPath),
          driftReason: 'Implementation exists without design specification'
        });
      }
    }
    
    return reports;
  }

  /**
   * Check if an implementation has a corresponding design spec
   * 
   * @param {string} implNodeId - Implementation node ID
   * @returns {Promise<boolean>} True if design spec exists
   * @private
   */
  async hasDesignSpec(implNodeId) {
    const edges = await this.typeNavigator.queryEdges({
      target: implNodeId,
      edgeType: 'impl_file'
    });
    
    return edges.length > 0;
  }

  /**
   * Extract component name from file path
   * 
   * @param {string} filePath - Path to file
   * @returns {string} Component name
   * @private
   */
  extractComponentName(filePath) {
    const fileName = filePath.split('/').pop();
    return fileName.replace(/\.(tsx|pen)$/, '');
  }

  /**
   * Filter reports by drift status
   * 
   * @param {DriftReport[]} reports - All drift reports
   * @param {DriftStatus} status - Status to filter by
   * @returns {DriftReport[]} Filtered reports
   */
  filterByStatus(reports, status) {
    return reports.filter(r => r.status === status);
  }

  /**
   * Get summary statistics for drift reports
   * 
   * @param {DriftReport[]} reports - All drift reports
   * @returns {Object} Summary statistics
   */
  getSummary(reports) {
    const summary = {
      total: reports.length,
      inSync: 0,
      penNewer: 0,
      tsxNewer: 0,
      penMissing: 0,
      tsxMissing: 0,
      bothMissing: 0
    };
    
    for (const report of reports) {
      switch (report.status) {
        case 'in-sync': summary.inSync++; break;
        case 'pen-newer': summary.penNewer++; break;
        case 'tsx-newer': summary.tsxNewer++; break;
        case 'pen-missing': summary.penMissing++; break;
        case 'tsx-missing': summary.tsxMissing++; break;
        case 'both-missing': summary.bothMissing++; break;
      }
    }
    
    summary.outOfSync = summary.total - summary.inSync;
    summary.syncPercentage = summary.total > 0 
      ? Math.round((summary.inSync / summary.total) * 100) 
      : 100;
    
    return summary;
  }

  /**
   * Generate human-readable report
   * 
   * @param {DriftReport[]} reports - All drift reports
   * @returns {string} Formatted report text
   */
  generateReport(reports) {
    const summary = this.getSummary(reports);
    
    let report = '# Design-Code Sync Report\n\n';
    report += `## Summary\n\n`;
    report += `- Total Components: ${summary.total}\n`;
    report += `- In Sync: ${summary.inSync} (${summary.syncPercentage}%)\n`;
    report += `- Out of Sync: ${summary.outOfSync}\n\n`;
    
    if (summary.penNewer > 0) {
      report += `### Design Specs Newer (${summary.penNewer})\n`;
      report += 'Implementations need updating:\n\n';
      for (const r of this.filterByStatus(reports, 'pen-newer')) {
        report += `- **${r.componentName}**: ${r.driftReason}\n`;
        report += `  - Design: ${r.penPath}\n`;
        report += `  - Code: ${r.tsxPath}\n\n`;
      }
    }
    
    if (summary.tsxNewer > 0) {
      report += `### Implementations Newer (${summary.tsxNewer})\n`;
      report += 'Design specs may need updating:\n\n';
      for (const r of this.filterByStatus(reports, 'tsx-newer')) {
        report += `- **${r.componentName}**: ${r.driftReason}\n`;
        report += `  - Design: ${r.penPath}\n`;
        report += `  - Code: ${r.tsxPath}\n\n`;
      }
    }
    
    if (summary.tsxMissing > 0) {
      report += `### Missing Implementations (${summary.tsxMissing})\n`;
      report += 'Design specs without code:\n\n';
      for (const r of this.filterByStatus(reports, 'tsx-missing')) {
        report += `- **${r.componentName}**: ${r.penPath}\n`;
      }
      report += '\n';
    }
    
    if (summary.penMissing > 0) {
      report += `### Missing Design Specs (${summary.penMissing})\n`;
      report += 'Code without design specs:\n\n';
      for (const r of this.filterByStatus(reports, 'pen-missing')) {
        report += `- **${r.componentName}**: ${r.tsxPath}\n`;
      }
      report += '\n';
    }
    
    return report;
  }
}

/**
 * CLI-style interface for running sync tracker
 * 
 * @param {TypeNavigator} typeNavigator - Type navigator instance
 * @param {Object} options - Options
 * @param {DriftStatus} [options.filterStatus] - Filter by specific status
 * @param {boolean} [options.summaryOnly=false] - Show only summary
 * @returns {Promise<{reports: DriftReport[], summary: Object, reportText: string}>}
 */
export async function trackDesignCodeSync(typeNavigator, options = {}) {
  const tracker = new DesignCodeSyncTracker(typeNavigator);
  
  console.log('🔍 Scanning for design-code drift...');
  const reports = await tracker.scanAllComponents();
  
  let filteredReports = reports;
  if (options.filterStatus) {
    filteredReports = tracker.filterByStatus(reports, options.filterStatus);
  }
  
  const summary = tracker.getSummary(reports);
  const reportText = options.summaryOnly 
    ? `Sync Status: ${summary.inSync}/${summary.total} in sync (${summary.syncPercentage}%)`
    : tracker.generateReport(filteredReports);
  
  console.log(reportText);
  
  return {
    reports: filteredReports,
    summary,
    reportText
  };
}