/**
 * @fileoverview History Branch System - Create named branches from any history point
 * @module core/history-branch-system
 * 
 * Enables branching from any point in history to explore alternative design paths.
 * Branches are named and can be switched between, merged, or deleted.
 * 
 * Related: state-machine/StateManager.js, core/history-persistence.js
 * Documentation: See DESIGN_SYSTEM.md § History Branch System
 */

/**
 * @typedef {Object} HistoryBranch
 * @property {string} id - Unique branch identifier
 * @property {string} name - Human-readable branch name
 * @property {string} parentBranchId - ID of parent branch (null for main)
 * @property {number} branchPointIndex - History index where branch was created
 * @property {Array<Object>} states - State snapshots in this branch
 * @property {number} createdAt - Timestamp of branch creation
 * @property {number} lastModified - Timestamp of last modification
 * @property {Object} metadata - Additional branch metadata
 */

/**
 * @typedef {Object} BranchCreateOptions
 * @property {string} name - Branch name
 * @property {number} fromIndex - History index to branch from
 * @property {string} [description] - Optional branch description
 * @property {Object} [metadata] - Optional metadata
 */

/**
 * History Branch System
 * Manages branching, switching, and merging of history states
 */
export class HistoryBranchSystem {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.maxBranches=50] - Maximum number of branches
   * @param {number} [options.maxStatesPerBranch=1000] - Max states per branch
   */
  constructor(options = {}) {
    this.maxBranches = options.maxBranches || 50;
    this.maxStatesPerBranch = options.maxStatesPerBranch || 1000;
    
    /** @type {Map<string, HistoryBranch>} */
    this.branches = new Map();
    
    /** @type {string} */
    this.currentBranchId = 'main';
    
    /** @type {number} */
    this.currentIndex = -1;
    
    // Initialize main branch
    this._initializeMainBranch();
    
    // Performance tracking
    this.performanceMetrics = {
      branchCreationTime: [],
      switchTime: [],
      mergeTime: []
    };
  }

  /**
   * Initialize the main branch
   * @private
   */
  _initializeMainBranch() {
    const mainBranch = {
      id: 'main',
      name: 'Main',
      parentBranchId: null,
      branchPointIndex: -1,
      states: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
      metadata: {
        isMain: true,
        protected: true
      }
    };
    
    this.branches.set('main', mainBranch);
  }

  /**
   * Create a new branch from a specific history point
   * @param {BranchCreateOptions} options - Branch creation options
   * @returns {HistoryBranch} The created branch
   * @throws {Error} If branch creation fails
   */
  createBranch(options) {
    const startTime = performance.now();
    
    // Validate options
    if (!options.name || typeof options.name !== 'string') {
      throw new Error('Branch name is required and must be a string');
    }
    
    if (options.fromIndex === undefined || options.fromIndex < -1) {
      throw new Error('Valid fromIndex is required');
    }
    
    // Check branch limit
    if (this.branches.size >= this.maxBranches) {
      throw new Error(`Maximum branch limit (${this.maxBranches}) reached`);
    }
    
    // Check for duplicate name
    for (const branch of this.branches.values()) {
      if (branch.name === options.name) {
        throw new Error(`Branch with name "${options.name}" already exists`);
      }
    }
    
    // Get current branch and validate index
    const currentBranch = this.branches.get(this.currentBranchId);
    if (options.fromIndex >= currentBranch.states.length) {
      throw new Error('Invalid fromIndex: exceeds current branch history');
    }
    
    // Create new branch
    const branchId = this._generateBranchId();
    const newBranch = {
      id: branchId,
      name: options.name,
      parentBranchId: this.currentBranchId,
      branchPointIndex: options.fromIndex,
      states: this._copyStatesUpToIndex(currentBranch, options.fromIndex),
      createdAt: Date.now(),
      lastModified: Date.now(),
      metadata: {
        description: options.description || '',
        ...options.metadata
      }
    };
    
    this.branches.set(branchId, newBranch);
    
    // Track performance
    const duration = performance.now() - startTime;
    this.performanceMetrics.branchCreationTime.push(duration);
    
    // Publish event
    this._publishEvent('branch:created', {
      branchId,
      name: options.name,
      parentBranchId: this.currentBranchId,
      fromIndex: options.fromIndex,
      duration
    });
    
    return newBranch;
  }

  /**
   * Switch to a different branch
   * @param {string} branchId - ID of branch to switch to
   * @returns {Object} Branch info and current state
   * @throws {Error} If branch doesn't exist
   */
  switchBranch(branchId) {
    const startTime = performance.now();
    
    if (!this.branches.has(branchId)) {
      throw new Error(`Branch "${branchId}" does not exist`);
    }
    
    const previousBranchId = this.currentBranchId;
    this.currentBranchId = branchId;
    
    const branch = this.branches.get(branchId);
    this.currentIndex = branch.states.length - 1;
    
    // Track performance
    const duration = performance.now() - startTime;
    this.performanceMetrics.switchTime.push(duration);
    
    // Publish event
    this._publishEvent('branch:switched', {
      fromBranch: previousBranchId,
      toBranch: branchId,
      currentIndex: this.currentIndex,
      duration
    });
    
    return {
      branch,
      currentState: this.currentIndex >= 0 ? branch.states[this.currentIndex] : null,
      index: this.currentIndex
    };
  }

  /**
   * Delete a branch
   * @param {string} branchId - ID of branch to delete
   * @throws {Error} If branch is protected or doesn't exist
   */
  deleteBranch(branchId) {
    if (!this.branches.has(branchId)) {
      throw new Error(`Branch "${branchId}" does not exist`);
    }
    
    const branch = this.branches.get(branchId);
    
    // Protect main branch
    if (branch.metadata.protected) {
      throw new Error('Cannot delete protected branch');
    }
    
    // Cannot delete current branch
    if (branchId === this.currentBranchId) {
      throw new Error('Cannot delete current branch. Switch to another branch first.');
    }
    
    this.branches.delete(branchId);
    
    // Publish event
    this._publishEvent('branch:deleted', {
      branchId,
      name: branch.name
    });
  }

  /**
   * Add a state to the current branch
   * @param {Object} state - State snapshot to add
   */
  pushState(state) {
    const branch = this.branches.get(this.currentBranchId);
    
    // Check state limit
    if (branch.states.length >= this.maxStatesPerBranch) {
      // Remove oldest state (keep branch point)
      branch.states.splice(1, 1);
    }
    
    // If we're not at the end, truncate forward history
    if (this.currentIndex < branch.states.length - 1) {
      branch.states.splice(this.currentIndex + 1);
    }
    
    branch.states.push({
      ...state,
      timestamp: Date.now(),
      branchId: this.currentBranchId
    });
    
    this.currentIndex = branch.states.length - 1;
    branch.lastModified = Date.now();
    
    // Publish event
    this._publishEvent('branch:state:added', {
      branchId: this.currentBranchId,
      index: this.currentIndex,
      stateCount: branch.states.length
    });
  }

  /**
   * Get state at specific index in current branch
   * @param {number} index - State index
   * @returns {Object|null} State snapshot or null
   */
  getStateAt(index) {
    const branch = this.branches.get(this.currentBranchId);
    if (index < 0 || index >= branch.states.length) {
      return null;
    }
    return branch.states[index];
  }

  /**
   * Navigate to a specific index in current branch
   * @param {number} index - Target index
   * @returns {Object|null} State at index
   */
  navigateToIndex(index) {
    const branch = this.branches.get(this.currentBranchId);
    if (index < 0 || index >= branch.states.length) {
      throw new Error('Invalid index');
    }
    
    this.currentIndex = index;
    
    // Publish event
    this._publishEvent('branch:navigated', {
      branchId: this.currentBranchId,
      index,
      state: branch.states[index]
    });
    
    return branch.states[index];
  }

  /**
   * Get all branches
   * @returns {Array<HistoryBranch>} Array of all branches
   */
  getAllBranches() {
    return Array.from(this.branches.values());
  }

  /**
   * Get current branch
   * @returns {HistoryBranch} Current branch
   */
  getCurrentBranch() {
    return this.branches.get(this.currentBranchId);
  }

  /**
   * Get branch by ID
   * @param {string} branchId - Branch ID
   * @returns {HistoryBranch|null} Branch or null
   */
  getBranch(branchId) {
    return this.branches.get(branchId) || null;
  }

  /**
   * Get branch tree structure
   * @returns {Object} Tree structure of branches
   */
  getBranchTree() {
    const tree = {
      main: {
        branch: this.branches.get('main'),
        children: []
      }
    };
    
    // Build tree recursively
    const addChildren = (parentId, node) => {
      for (const branch of this.branches.values()) {
        if (branch.parentBranchId === parentId) {
          const childNode = {
            branch,
            children: []
          };
          node.children.push(childNode);
          addChildren(branch.id, childNode);
        }
      }
    };
    
    addChildren('main', tree.main);
    return tree;
  }

  /**
   * Rename a branch
   * @param {string} branchId - Branch ID
   * @param {string} newName - New branch name
   */
  renameBranch(branchId, newName) {
    if (!this.branches.has(branchId)) {
      throw new Error(`Branch "${branchId}" does not exist`);
    }
    
    // Check for duplicate name
    for (const branch of this.branches.values()) {
      if (branch.name === newName && branch.id !== branchId) {
        throw new Error(`Branch with name "${newName}" already exists`);
      }
    }
    
    const branch = this.branches.get(branchId);
    const oldName = branch.name;
    branch.name = newName;
    branch.lastModified = Date.now();
    
    // Publish event
    this._publishEvent('branch:renamed', {
      branchId,
      oldName,
      newName
    });
  }

  /**
   * Update branch metadata
   * @param {string} branchId - Branch ID
   * @param {Object} metadata - Metadata to merge
   */
  updateBranchMetadata(branchId, metadata) {
    if (!this.branches.has(branchId)) {
      throw new Error(`Branch "${branchId}" does not exist`);
    }
    
    const branch = this.branches.get(branchId);
    branch.metadata = {
      ...branch.metadata,
      ...metadata
    };
    branch.lastModified = Date.now();
    
    // Publish event
    this._publishEvent('branch:metadata:updated', {
      branchId,
      metadata: branch.metadata
    });
  }

  /**
   * Export branch to JSON
   * @param {string} branchId - Branch ID
   * @returns {string} JSON string
   */
  exportBranch(branchId) {
    if (!this.branches.has(branchId)) {
      throw new Error(`Branch "${branchId}" does not exist`);
    }
    
    const branch = this.branches.get(branchId);
    return JSON.stringify(branch, null, 2);
  }

  /**
   * Import branch from JSON
   * @param {string} jsonString - JSON string
   * @returns {HistoryBranch} Imported branch
   */
  importBranch(jsonString) {
    let branchData;
    try {
      branchData = JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Invalid JSON: ' + error.message);
    }
    
    // Validate structure
    if (!branchData.id || !branchData.name || !Array.isArray(branchData.states)) {
      throw new Error('Invalid branch data structure');
    }
    
    // Generate new ID to avoid conflicts
    const newBranchId = this._generateBranchId();
    const importedBranch = {
      ...branchData,
      id: newBranchId,
      createdAt: Date.now(),
      lastModified: Date.now(),
      metadata: {
        ...branchData.metadata,
        imported: true,
        originalId: branchData.id
      }
    };
    
    this.branches.set(newBranchId, importedBranch);
    
    // Publish event
    this._publishEvent('branch:imported', {
      branchId: newBranchId,
      name: importedBranch.name
    });
    
    return importedBranch;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    
    return {
      branchCreation: {
        average: avg(this.performanceMetrics.branchCreationTime),
        count: this.performanceMetrics.branchCreationTime.length
      },
      branchSwitch: {
        average: avg(this.performanceMetrics.switchTime),
        count: this.performanceMetrics.switchTime.length
      },
      branchMerge: {
        average: avg(this.performanceMetrics.mergeTime),
        count: this.performanceMetrics.mergeTime.length
      },
      totalBranches: this.branches.size,
      currentBranch: this.currentBranchId
    };
  }

  /**
   * Clear all performance metrics
   */
  clearPerformanceMetrics() {
    this.performanceMetrics = {
      branchCreationTime: [],
      switchTime: [],
      mergeTime: []
    };
  }

  /**
   * Copy states up to a specific index
   * @private
   * @param {HistoryBranch} branch - Source branch
   * @param {number} toIndex - Index to copy up to (inclusive)
   * @returns {Array<Object>} Copied states
   */
  _copyStatesUpToIndex(branch, toIndex) {
    if (toIndex === -1) {
      return [];
    }
    
    return branch.states.slice(0, toIndex + 1).map(state => ({
      ...state,
      copiedAt: Date.now()
    }));
  }

  /**
   * Generate unique branch ID
   * @private
   * @returns {string} Branch ID
   */
  _generateBranchId() {
    return `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   */
  _publishEvent(eventType, payload) {
    if (typeof window !== 'undefined' && window.EventBus) {
      window.EventBus.publish({
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: 'HistoryBranchSystem'
      });
    }
  }

  /**
   * Serialize system to JSON
   * @returns {Object} Serialized data
   */
  toJSON() {
    return {
      branches: Array.from(this.branches.entries()),
      currentBranchId: this.currentBranchId,
      currentIndex: this.currentIndex,
      maxBranches: this.maxBranches,
      maxStatesPerBranch: this.maxStatesPerBranch
    };
  }

  /**
   * Restore system from JSON
   * @param {Object} data - Serialized data
   */
  fromJSON(data) {
    this.branches = new Map(data.branches);
    this.currentBranchId = data.currentBranchId;
    this.currentIndex = data.currentIndex;
    this.maxBranches = data.maxBranches;
    this.maxStatesPerBranch = data.maxStatesPerBranch;
    
    // Publish event
    this._publishEvent('branch:system:restored', {
      branchCount: this.branches.size,
      currentBranch: this.currentBranchId
    });
  }
}

// Export singleton instance
export const historyBranchSystem = new HistoryBranchSystem();