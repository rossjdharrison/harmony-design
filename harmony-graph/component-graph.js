/**
 * @fileoverview Component Graph - Manages reactive component nodes
 * @module harmony-graph/component-graph
 * 
 * Related docs: docs/del-cross-graph-reactivity-flow.md
 */

/**
 * Represents a reactive component node in the graph
 */
class ComponentNode {
  /**
   * Create a reactive component node
   * @param {HTMLElement} component - Web component instance
   * @param {string[]} intents - Array of intent types to react to
   */
  constructor(component, intents = []) {
    this.component = component;
    this.intents = intents;
    this.dirtyFlag = false;
    this.updateScheduled = false;
    this.lastUpdateTimestamp = 0;
    this.updateCount = 0;
    
    /** @type {Map<string, boolean>} */
    this.intentStates = new Map();
    
    // Initialize intent states
    for (const intent of intents) {
      this.intentStates.set(intent, true);
    }
  }

  /**
   * Called when a dependent intent changes
   * @param {string} intentType - Type of intent that changed
   * @param {boolean} available - New availability state
   */
  onIntentChange(intentType, available) {
    if (this.intents.includes(intentType)) {
      const previousState = this.intentStates.get(intentType);
      
      if (previousState !== available) {
        this.intentStates.set(intentType, available);
        this.dirtyFlag = true;
        this.scheduleUpdate();
      }
    }
  }

  /**
   * Schedule a component update in the next animation frame
   */
  scheduleUpdate() {
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      requestAnimationFrame(() => {
        this.update();
        this.updateScheduled = false;
      });
    }
  }

  /**
   * Execute the component update
   */
  update() {
    if (this.dirtyFlag && this.component.onIntentUpdate) {
      const startTime = performance.now();
      
      // Pass current intent states to component
      this.component.onIntentUpdate(Object.fromEntries(this.intentStates));
      
      this.dirtyFlag = false;
      this.lastUpdateTimestamp = performance.now();
      this.updateCount++;
      
      const updateTime = this.lastUpdateTimestamp - startTime;
      if (updateTime > 16) {
        console.warn(`Component update exceeded 16ms budget: ${updateTime.toFixed(2)}ms`, this.component);
      }
    }
  }

  /**
   * Get current state of a specific intent
   * @param {string} intentType - Type of intent
   * @returns {boolean} Current availability
   */
  getIntentState(intentType) {
    return this.intentStates.get(intentType) ?? false;
  }

  /**
   * Check if all intents are available
   * @returns {boolean} True if all intents are available
   */
  areAllIntentsAvailable() {
    for (const available of this.intentStates.values()) {
      if (!available) return false;
    }
    return true;
  }

  /**
   * Get diagnostic information
   * @returns {object} Diagnostic data
   */
  getDiagnostics() {
    return {
      componentTag: this.component.tagName?.toLowerCase(),
      intents: this.intents,
      intentStates: Object.fromEntries(this.intentStates),
      dirtyFlag: this.dirtyFlag,
      updateScheduled: this.updateScheduled,
      lastUpdateTimestamp: this.lastUpdateTimestamp,
      updateCount: this.updateCount
    };
  }

  /**
   * Cleanup when component is disconnected
   */
  disconnect() {
    this.dirtyFlag = false;
    this.updateScheduled = false;
    this.intentStates.clear();
  }
}

/**
 * Component Graph - Manages all component nodes
 */
class ComponentGraph {
  constructor() {
    /** @type {Map<HTMLElement, ComponentNode>} */
    this.components = new Map();
  }

  /**
   * Register a component with the graph
   * @param {HTMLElement} component - Web component instance
   * @param {string[]} intents - Array of intent types to react to
   * @returns {ComponentNode} The created component node
   */
  registerComponent(component, intents) {
    if (!this.components.has(component)) {
      const node = new ComponentNode(component, intents);
      this.components.set(component, node);
      return node;
    }
    return this.components.get(component);
  }

  /**
   * Unregister a component from the graph
   * @param {HTMLElement} component - Web component instance
   */
  unregisterComponent(component) {
    const node = this.components.get(component);
    if (node) {
      node.disconnect();
      this.components.delete(component);
    }
  }

  /**
   * Get component node for a component
   * @param {HTMLElement} component - Web component instance
   * @returns {ComponentNode|undefined} The component node
   */
  getComponentNode(component) {
    return this.components.get(component);
  }

  /**
   * Get all components reacting to a specific intent
   * @param {string} intentType - Type of intent
   * @returns {Array<HTMLElement>} Array of components
   */
  getComponentsForIntent(intentType) {
    const components = [];
    for (const [component, node] of this.components) {
      if (node.intents.includes(intentType)) {
        components.push(component);
      }
    }
    return components;
  }

  /**
   * Get diagnostic information for all components
   * @returns {object} Diagnostic data
   */
  getDiagnostics() {
    const componentDiagnostics = [];
    for (const node of this.components.values()) {
      componentDiagnostics.push(node.getDiagnostics());
    }

    return {
      componentCount: this.components.size,
      components: componentDiagnostics
    };
  }

  /**
   * Clear all components (for testing)
   */
  clear() {
    for (const node of this.components.values()) {
      node.disconnect();
    }
    this.components.clear();
  }
}

// Singleton instance
const componentGraph = new ComponentGraph();

export { ComponentNode, ComponentGraph, componentGraph };