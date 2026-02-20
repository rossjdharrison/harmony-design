/**
 * @fileoverview Design State Snapshot Capture
 * Captures current design state for intention graph to reference and diff against.
 * Part of the Reactive Component System vision.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#design-state-snapshot
 */

import { EventBus } from '../event-bus/event-bus.js';

/**
 * @typedef {Object} DesignTokenSnapshot
 * @property {string} token - Token path (e.g., "color.primary.500")
 * @property {string} value - Current resolved value
 * @property {string} rawValue - Raw value before resolution
 * @property {string} source - Source file path
 * @property {number} timestamp - Capture timestamp
 */

/**
 * @typedef {Object} ComponentStateSnapshot
 * @property {string} componentId - Unique component identifier
 * @property {string} componentType - Component type name
 * @property {Object} props - Current component properties
 * @property {Object} computedStyles - Computed CSS styles
 * @property {string[]} appliedTokens - Design tokens applied to component
 * @property {number} timestamp - Capture timestamp
 */

/**
 * @typedef {Object} DesignSnapshot
 * @property {string} id - Unique snapshot identifier
 * @property {number} timestamp - Snapshot creation time
 * @property {string} label - Human-readable label
 * @property {DesignTokenSnapshot[]} tokens - All design tokens
 * @property {ComponentStateSnapshot[]} components - All component states
 * @property {Object} metadata - Additional metadata
 * @property {string} metadata.commitHash - Git commit hash (if available)
 * @property {string} metadata.branch - Git branch name (if available)
 * @property {string} metadata.captureReason - Reason for capture
 */

/**
 * @typedef {Object} SnapshotDiff
 * @property {string} snapshotId1 - First snapshot ID
 * @property {string} snapshotId2 - Second snapshot ID
 * @property {Object[]} tokenChanges - Changed tokens
 * @property {Object[]} componentChanges - Changed components
 * @property {Object} summary - Change summary statistics
 */

/**
 * Design State Snapshot Capture System
 * Captures complete design state including tokens and component states
 */
export class DesignStateSnapshotCapture {
  constructor() {
    /** @type {Map<string, DesignSnapshot>} */
    this.snapshots = new Map();
    
    /** @type {string|null} */
    this.currentSnapshotId = null;
    
    /** @type {EventBus} */
    this.eventBus = EventBus.getInstance();
    
    this.init();
  }

  /**
   * Initialize the snapshot capture system
   * @private
   */
  init() {
    // Subscribe to design change events
    this.eventBus.subscribe('design:token:changed', this.handleTokenChange.bind(this));
    this.eventBus.subscribe('design:component:updated', this.handleComponentUpdate.bind(this));
    this.eventBus.subscribe('design:snapshot:capture', this.handleCaptureRequest.bind(this));
    this.eventBus.subscribe('design:snapshot:restore', this.handleRestoreRequest.bind(this));
    
    // Load persisted snapshots from IndexedDB
    this.loadPersistedSnapshots();
  }

  /**
   * Capture current design state as a snapshot
   * @param {Object} options - Capture options
   * @param {string} [options.label] - Human-readable label
   * @param {string} [options.captureReason] - Reason for capture
   * @param {boolean} [options.persist=true] - Whether to persist to IndexedDB
   * @returns {Promise<DesignSnapshot>} Captured snapshot
   */
  async captureSnapshot(options = {}) {
    const startTime = performance.now();
    
    const snapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      label: options.label || `Snapshot ${new Date().toISOString()}`,
      tokens: await this.captureTokenState(),
      components: await this.captureComponentState(),
      metadata: {
        commitHash: await this.getGitCommitHash(),
        branch: await this.getGitBranch(),
        captureReason: options.captureReason || 'manual',
        captureTime: performance.now() - startTime
      }
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.currentSnapshotId = snapshot.id;

    if (options.persist !== false) {
      await this.persistSnapshot(snapshot);
    }

    this.eventBus.publish('design:snapshot:captured', {
      snapshotId: snapshot.id,
      timestamp: snapshot.timestamp,
      label: snapshot.label
    });

    return snapshot;
  }

  /**
   * Capture current design token state
   * @private
   * @returns {Promise<DesignTokenSnapshot[]>} Token snapshots
   */
  async captureTokenState() {
    const tokens = [];
    const tokenRegistry = await this.getTokenRegistry();

    for (const [tokenPath, tokenData] of tokenRegistry.entries()) {
      tokens.push({
        token: tokenPath,
        value: tokenData.resolved || tokenData.value,
        rawValue: tokenData.value,
        source: tokenData.source || 'unknown',
        timestamp: Date.now()
      });
    }

    return tokens;
  }

  /**
   * Capture current component state
   * @private
   * @returns {Promise<ComponentStateSnapshot[]>} Component snapshots
   */
  async captureComponentState() {
    const components = [];
    const componentRegistry = await this.getComponentRegistry();

    for (const component of componentRegistry) {
      const snapshot = await this.captureComponentSnapshot(component);
      if (snapshot) {
        components.push(snapshot);
      }
    }

    return components;
  }

  /**
   * Capture snapshot of a single component
   * @private
   * @param {HTMLElement} component - Component element
   * @returns {Promise<ComponentStateSnapshot|null>} Component snapshot
   */
  async captureComponentSnapshot(component) {
    try {
      const computedStyles = window.getComputedStyle(component);
      const appliedTokens = this.extractAppliedTokens(component, computedStyles);

      return {
        componentId: component.id || this.generateComponentId(component),
        componentType: component.tagName.toLowerCase(),
        props: this.extractComponentProps(component),
        computedStyles: this.serializeComputedStyles(computedStyles),
        appliedTokens,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to capture component snapshot:', error);
      return null;
    }
  }

  /**
   * Extract design tokens applied to a component
   * @private
   * @param {HTMLElement} component - Component element
   * @param {CSSStyleDeclaration} computedStyles - Computed styles
   * @returns {string[]} Applied token paths
   */
  extractAppliedTokens(component, computedStyles) {
    const tokens = [];
    const cssVarRegex = /var\(--([^)]+)\)/g;

    // Check inline styles
    const inlineStyle = component.getAttribute('style') || '';
    let match;
    while ((match = cssVarRegex.exec(inlineStyle)) !== null) {
      tokens.push(match[1].replace(/-/g, '.'));
    }

    // Check computed styles for CSS variables
    for (let i = 0; i < computedStyles.length; i++) {
      const prop = computedStyles[i];
      const value = computedStyles.getPropertyValue(prop);
      
      if (value.includes('var(--')) {
        while ((match = cssVarRegex.exec(value)) !== null) {
          tokens.push(match[1].replace(/-/g, '.'));
        }
      }
    }

    return [...new Set(tokens)]; // Remove duplicates
  }

  /**
   * Extract component properties
   * @private
   * @param {HTMLElement} component - Component element
   * @returns {Object} Component properties
   */
  extractComponentProps(component) {
    const props = {};
    
    // Extract attributes
    for (const attr of component.attributes) {
      props[attr.name] = attr.value;
    }

    // Extract data attributes
    if (component.dataset) {
      props.dataset = { ...component.dataset };
    }

    return props;
  }

  /**
   * Serialize computed styles to plain object
   * @private
   * @param {CSSStyleDeclaration} computedStyles - Computed styles
   * @returns {Object} Serialized styles
   */
  serializeComputedStyles(computedStyles) {
    const styles = {};
    const relevantProps = [
      'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight',
      'padding', 'margin', 'border', 'borderRadius', 'boxShadow',
      'width', 'height', 'display', 'position'
    ];

    for (const prop of relevantProps) {
      const value = computedStyles.getPropertyValue(prop);
      if (value) {
        styles[prop] = value;
      }
    }

    return styles;
  }

  /**
   * Compare two snapshots and generate diff
   * @param {string} snapshotId1 - First snapshot ID
   * @param {string} snapshotId2 - Second snapshot ID
   * @returns {SnapshotDiff} Difference between snapshots
   */
  diffSnapshots(snapshotId1, snapshotId2) {
    const snapshot1 = this.snapshots.get(snapshotId1);
    const snapshot2 = this.snapshots.get(snapshotId2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    const tokenChanges = this.diffTokens(snapshot1.tokens, snapshot2.tokens);
    const componentChanges = this.diffComponents(snapshot1.components, snapshot2.components);

    return {
      snapshotId1,
      snapshotId2,
      tokenChanges,
      componentChanges,
      summary: {
        tokensChanged: tokenChanges.length,
        componentsChanged: componentChanges.length,
        totalChanges: tokenChanges.length + componentChanges.length
      }
    };
  }

  /**
   * Diff token states between snapshots
   * @private
   * @param {DesignTokenSnapshot[]} tokens1 - First token set
   * @param {DesignTokenSnapshot[]} tokens2 - Second token set
   * @returns {Object[]} Token changes
   */
  diffTokens(tokens1, tokens2) {
    const changes = [];
    const tokenMap1 = new Map(tokens1.map(t => [t.token, t]));
    const tokenMap2 = new Map(tokens2.map(t => [t.token, t]));

    // Check for changed and removed tokens
    for (const [token, data1] of tokenMap1) {
      const data2 = tokenMap2.get(token);
      
      if (!data2) {
        changes.push({ token, type: 'removed', oldValue: data1.value });
      } else if (data1.value !== data2.value) {
        changes.push({
          token,
          type: 'changed',
          oldValue: data1.value,
          newValue: data2.value
        });
      }
    }

    // Check for added tokens
    for (const [token, data2] of tokenMap2) {
      if (!tokenMap1.has(token)) {
        changes.push({ token, type: 'added', newValue: data2.value });
      }
    }

    return changes;
  }

  /**
   * Diff component states between snapshots
   * @private
   * @param {ComponentStateSnapshot[]} components1 - First component set
   * @param {ComponentStateSnapshot[]} components2 - Second component set
   * @returns {Object[]} Component changes
   */
  diffComponents(components1, components2) {
    const changes = [];
    const compMap1 = new Map(components1.map(c => [c.componentId, c]));
    const compMap2 = new Map(components2.map(c => [c.componentId, c]));

    for (const [id, comp1] of compMap1) {
      const comp2 = compMap2.get(id);
      
      if (!comp2) {
        changes.push({ componentId: id, type: 'removed' });
      } else {
        const propChanges = this.diffObjects(comp1.props, comp2.props);
        const styleChanges = this.diffObjects(comp1.computedStyles, comp2.computedStyles);
        const tokenChanges = this.diffArrays(comp1.appliedTokens, comp2.appliedTokens);

        if (propChanges.length || styleChanges.length || tokenChanges.length) {
          changes.push({
            componentId: id,
            type: 'changed',
            propChanges,
            styleChanges,
            tokenChanges
          });
        }
      }
    }

    for (const [id] of compMap2) {
      if (!compMap1.has(id)) {
        changes.push({ componentId: id, type: 'added' });
      }
    }

    return changes;
  }

  /**
   * Diff two objects
   * @private
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {Object[]} Changes
   */
  diffObjects(obj1, obj2) {
    const changes = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      if (obj1[key] !== obj2[key]) {
        changes.push({
          key,
          oldValue: obj1[key],
          newValue: obj2[key]
        });
      }
    }

    return changes;
  }

  /**
   * Diff two arrays
   * @private
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @returns {Object[]} Changes
   */
  diffArrays(arr1, arr2) {
    const changes = [];
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    for (const item of set1) {
      if (!set2.has(item)) {
        changes.push({ type: 'removed', value: item });
      }
    }

    for (const item of set2) {
      if (!set1.has(item)) {
        changes.push({ type: 'added', value: item });
      }
    }

    return changes;
  }

  /**
   * Get token registry
   * @private
   * @returns {Promise<Map>} Token registry
   */
  async getTokenRegistry() {
    // This would integrate with the design token system
    // For now, return empty map
    return new Map();
  }

  /**
   * Get component registry
   * @private
   * @returns {Promise<HTMLElement[]>} Component registry
   */
  async getComponentRegistry() {
    // Get all custom elements in the document
    const components = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          return node.tagName.includes('-') 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      components.push(node);
    }

    return components;
  }

  /**
   * Generate unique snapshot ID
   * @private
   * @returns {string} Snapshot ID
   */
  generateSnapshotId() {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate component ID
   * @private
   * @param {HTMLElement} component - Component element
   * @returns {string} Component ID
   */
  generateComponentId(component) {
    const tag = component.tagName.toLowerCase();
    const path = this.getElementPath(component);
    return `${tag}-${path}`;
  }

  /**
   * Get element path in DOM
   * @private
   * @param {HTMLElement} element - Element
   * @returns {string} Element path
   */
  getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current);
        path.unshift(index);
      }
      current = parent;
    }

    return path.join('-');
  }

  /**
   * Get git commit hash
   * @private
   * @returns {Promise<string|null>} Commit hash
   */
  async getGitCommitHash() {
    // This would need backend integration
    return null;
  }

  /**
   * Get git branch name
   * @private
   * @returns {Promise<string|null>} Branch name
   */
  async getGitBranch() {
    // This would need backend integration
    return null;
  }

  /**
   * Persist snapshot to IndexedDB
   * @private
   * @param {DesignSnapshot} snapshot - Snapshot to persist
   * @returns {Promise<void>}
   */
  async persistSnapshot(snapshot) {
    try {
      const db = await this.openDatabase();
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      
      await store.put(snapshot);
      await tx.complete;
    } catch (error) {
      console.error('Failed to persist snapshot:', error);
    }
  }

  /**
   * Load persisted snapshots from IndexedDB
   * @private
   * @returns {Promise<void>}
   */
  async loadPersistedSnapshots() {
    try {
      const db = await this.openDatabase();
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const snapshots = await store.getAll();

      for (const snapshot of snapshots) {
        this.snapshots.set(snapshot.id, snapshot);
      }
    } catch (error) {
      console.error('Failed to load persisted snapshots:', error);
    }
  }

  /**
   * Open IndexedDB database
   * @private
   * @returns {Promise<IDBDatabase>} Database instance
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HarmonyDesignSnapshots', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Handle token change event
   * @private
   * @param {Object} event - Token change event
   */
  handleTokenChange(event) {
    // Auto-capture on significant token changes if enabled
    if (this.autoCapture) {
      this.captureSnapshot({
        label: `Auto: Token ${event.token} changed`,
        captureReason: 'token-change'
      });
    }
  }

  /**
   * Handle component update event
   * @private
   * @param {Object} event - Component update event
   */
  handleComponentUpdate(event) {
    // Auto-capture on significant component changes if enabled
    if (this.autoCapture) {
      this.captureSnapshot({
        label: `Auto: Component ${event.componentId} updated`,
        captureReason: 'component-update'
      });
    }
  }

  /**
   * Handle snapshot capture request
   * @private
   * @param {Object} event - Capture request event
   */
  async handleCaptureRequest(event) {
    const snapshot = await this.captureSnapshot(event.options || {});
    
    this.eventBus.publish('design:snapshot:captured', {
      snapshotId: snapshot.id,
      success: true
    });
  }

  /**
   * Handle snapshot restore request
   * @private
   * @param {Object} event - Restore request event
   */
  handleRestoreRequest(event) {
    const snapshot = this.snapshots.get(event.snapshotId);
    
    if (!snapshot) {
      this.eventBus.publish('design:snapshot:restore:failed', {
        snapshotId: event.snapshotId,
        error: 'Snapshot not found'
      });
      return;
    }

    // Restore logic would go here
    this.eventBus.publish('design:snapshot:restored', {
      snapshotId: event.snapshotId,
      success: true
    });
  }

  /**
   * Get snapshot by ID
   * @param {string} snapshotId - Snapshot ID
   * @returns {DesignSnapshot|null} Snapshot or null
   */
  getSnapshot(snapshotId) {
    return this.snapshots.get(snapshotId) || null;
  }

  /**
   * Get all snapshots
   * @returns {DesignSnapshot[]} All snapshots
   */
  getAllSnapshots() {
    return Array.from(this.snapshots.values());
  }

  /**
   * Delete snapshot
   * @param {string} snapshotId - Snapshot ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteSnapshot(snapshotId) {
    const deleted = this.snapshots.delete(snapshotId);
    
    if (deleted) {
      try {
        const db = await this.openDatabase();
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        await store.delete(snapshotId);
        await tx.complete;
      } catch (error) {
        console.error('Failed to delete snapshot from IndexedDB:', error);
      }
    }

    return deleted;
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of DesignStateSnapshotCapture
 * @returns {DesignStateSnapshotCapture} Singleton instance
 */
export function getSnapshotCapture() {
  if (!instance) {
    instance = new DesignStateSnapshotCapture();
  }
  return instance;
}