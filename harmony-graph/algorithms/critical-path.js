/**
 * @fileoverview CriticalPath: Find longest path for execution scheduling
 * 
 * Implements the Critical Path Method (CPM) for DAGs to determine:
 * - Longest path through the graph (critical path)
 * - Earliest start times for each node
 * - Latest start times for each node
 * - Slack time for each node
 * - Total project duration
 * 
 * Used for scheduling, identifying bottlenecks, and optimizing execution order.
 * 
 * Performance: O(V + E) time complexity, O(V) space complexity
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#graph-algorithms
 */

import { topologicalSort } from './topological-sort.js';

/**
 * Result of critical path analysis
 * @typedef {Object} CriticalPathResult
 * @property {string[]} criticalPath - Ordered list of node IDs on the critical path
 * @property {number} duration - Total duration of the critical path
 * @property {Map<string, NodeSchedule>} schedule - Schedule information for each node
 * @property {boolean} hasCycle - Whether a cycle was detected (invalid for CPM)
 */

/**
 * Schedule information for a single node
 * @typedef {Object} NodeSchedule
 * @property {number} earliestStart - Earliest time this node can start
 * @property {number} latestStart - Latest time this node can start without delaying project
 * @property {number} earliestFinish - Earliest time this node can finish
 * @property {number} latestFinish - Latest time this node can finish
 * @property {number} slack - Amount of time this node can be delayed (latestStart - earliestStart)
 * @property {boolean} isCritical - Whether this node is on the critical path (slack === 0)
 * @property {number} duration - Duration of this node's execution
 */

/**
 * Computes the critical path through a directed acyclic graph (DAG)
 * 
 * The critical path is the longest path through the graph, determining
 * the minimum time needed to complete all tasks. Nodes on this path
 * have zero slack and cannot be delayed without delaying the entire project.
 * 
 * Algorithm:
 * 1. Perform topological sort to get valid execution order
 * 2. Forward pass: compute earliest start/finish times
 * 3. Backward pass: compute latest start/finish times
 * 4. Calculate slack for each node
 * 5. Identify critical path (nodes with zero slack)
 * 
 * @param {Object} graph - Graph structure with nodes and edges
 * @param {Map<string, Object>} graph.nodes - Map of node ID to node object
 * @param {Map<string, Set<string>>} graph.edges - Map of node ID to set of successor IDs
 * @param {Function} getDuration - Function that returns duration for a node (default: node => node.duration || 1)
 * @returns {CriticalPathResult} Critical path analysis results
 * 
 * @example
 * const graph = {
 *   nodes: new Map([
 *     ['A', { id: 'A', duration: 5 }],
 *     ['B', { id: 'B', duration: 3 }],
 *     ['C', { id: 'C', duration: 2 }]
 *   ]),
 *   edges: new Map([
 *     ['A', new Set(['B', 'C'])],
 *     ['B', new Set(['C'])],
 *     ['C', new Set()]
 *   ])
 * };
 * 
 * const result = findCriticalPath(graph);
 * console.log(result.criticalPath); // ['A', 'B', 'C']
 * console.log(result.duration); // 10
 */
export function findCriticalPath(graph, getDuration = (node) => node.duration || 1) {
  if (!graph || !graph.nodes || !graph.edges) {
    throw new Error('Invalid graph structure: must have nodes and edges');
  }

  // Step 1: Get topological order (validates DAG and provides execution order)
  const topoResult = topologicalSort(graph);
  
  if (topoResult.hasCycle) {
    return {
      criticalPath: [],
      duration: 0,
      schedule: new Map(),
      hasCycle: true
    };
  }

  const topoOrder = topoResult.order;
  const schedule = new Map();

  // Initialize schedule for all nodes
  for (const nodeId of graph.nodes.keys()) {
    const node = graph.nodes.get(nodeId);
    const duration = getDuration(node);
    
    schedule.set(nodeId, {
      earliestStart: 0,
      latestStart: 0,
      earliestFinish: 0,
      latestFinish: 0,
      slack: 0,
      isCritical: false,
      duration: duration
    });
  }

  // Step 2: Forward pass - compute earliest start/finish times
  for (const nodeId of topoOrder) {
    const nodeSchedule = schedule.get(nodeId);
    const predecessors = getPredecessors(graph, nodeId);
    
    if (predecessors.length === 0) {
      // Start node: earliest start is 0
      nodeSchedule.earliestStart = 0;
    } else {
      // Earliest start is the maximum earliest finish of all predecessors
      nodeSchedule.earliestStart = Math.max(
        ...predecessors.map(predId => {
          const predSchedule = schedule.get(predId);
          return predSchedule.earliestFinish;
        })
      );
    }
    
    nodeSchedule.earliestFinish = nodeSchedule.earliestStart + nodeSchedule.duration;
  }

  // Find the maximum earliest finish time (project duration)
  const projectDuration = Math.max(
    ...Array.from(schedule.values()).map(s => s.earliestFinish)
  );

  // Step 3: Backward pass - compute latest start/finish times
  // Process nodes in reverse topological order
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const nodeId = topoOrder[i];
    const nodeSchedule = schedule.get(nodeId);
    const successors = graph.edges.get(nodeId) || new Set();
    
    if (successors.size === 0) {
      // End node: latest finish is project duration
      nodeSchedule.latestFinish = projectDuration;
    } else {
      // Latest finish is the minimum latest start of all successors
      nodeSchedule.latestFinish = Math.min(
        ...Array.from(successors).map(succId => {
          const succSchedule = schedule.get(succId);
          return succSchedule.latestStart;
        })
      );
    }
    
    nodeSchedule.latestStart = nodeSchedule.latestFinish - nodeSchedule.duration;
  }

  // Step 4: Calculate slack and identify critical nodes
  for (const [nodeId, nodeSchedule] of schedule.entries()) {
    nodeSchedule.slack = nodeSchedule.latestStart - nodeSchedule.earliestStart;
    nodeSchedule.isCritical = nodeSchedule.slack === 0;
  }

  // Step 5: Extract critical path by following critical nodes
  const criticalPath = extractCriticalPath(graph, schedule, topoOrder);

  return {
    criticalPath,
    duration: projectDuration,
    schedule,
    hasCycle: false
  };
}

/**
 * Gets all predecessors (incoming edges) for a node
 * 
 * @param {Object} graph - Graph structure
 * @param {string} nodeId - Target node ID
 * @returns {string[]} Array of predecessor node IDs
 * @private
 */
function getPredecessors(graph, nodeId) {
  const predecessors = [];
  
  for (const [sourceId, targets] of graph.edges.entries()) {
    if (targets.has(nodeId)) {
      predecessors.push(sourceId);
    }
  }
  
  return predecessors;
}

/**
 * Extracts the critical path by following nodes with zero slack
 * 
 * @param {Object} graph - Graph structure
 * @param {Map<string, NodeSchedule>} schedule - Schedule information
 * @param {string[]} topoOrder - Topological order of nodes
 * @returns {string[]} Ordered list of node IDs on critical path
 * @private
 */
function extractCriticalPath(graph, schedule, topoOrder) {
  const criticalPath = [];
  
  // Find starting critical nodes (critical nodes with no critical predecessors)
  const criticalNodes = topoOrder.filter(nodeId => 
    schedule.get(nodeId).isCritical
  );
  
  if (criticalNodes.length === 0) {
    return [];
  }

  // Start from the first critical node in topological order
  let currentId = criticalNodes[0];
  criticalPath.push(currentId);
  
  // Follow critical successors
  while (true) {
    const successors = graph.edges.get(currentId) || new Set();
    const criticalSuccessors = Array.from(successors).filter(succId => 
      schedule.get(succId).isCritical
    );
    
    if (criticalSuccessors.length === 0) {
      break;
    }
    
    // If multiple critical successors, choose the one with earliest start
    // (though in a proper critical path, there should only be one)
    const nextId = criticalSuccessors.reduce((best, succId) => {
      const bestSchedule = schedule.get(best);
      const succSchedule = schedule.get(succId);
      return succSchedule.earliestStart < bestSchedule.earliestStart ? succId : best;
    });
    
    criticalPath.push(nextId);
    currentId = nextId;
  }
  
  return criticalPath;
}

/**
 * Finds all critical paths in the graph (there may be multiple)
 * 
 * @param {Object} graph - Graph structure
 * @param {Function} getDuration - Function that returns duration for a node
 * @returns {string[][]} Array of critical paths
 * 
 * @example
 * const paths = findAllCriticalPaths(graph);
 * paths.forEach(path => console.log('Critical path:', path));
 */
export function findAllCriticalPaths(graph, getDuration = (node) => node.duration || 1) {
  const result = findCriticalPath(graph, getDuration);
  
  if (result.hasCycle || result.criticalPath.length === 0) {
    return [];
  }

  const paths = [];
  const criticalNodes = Array.from(result.schedule.entries())
    .filter(([_, schedule]) => schedule.isCritical)
    .map(([nodeId, _]) => nodeId);
  
  // Find all paths through critical nodes
  const startNodes = criticalNodes.filter(nodeId => {
    const predecessors = getPredecessors(graph, nodeId);
    return predecessors.every(predId => !result.schedule.get(predId).isCritical);
  });
  
  for (const startNode of startNodes) {
    const pathsFromStart = findPathsFromNode(graph, startNode, result.schedule);
    paths.push(...pathsFromStart);
  }
  
  return paths;
}

/**
 * Finds all critical paths starting from a given node
 * 
 * @param {Object} graph - Graph structure
 * @param {string} startId - Starting node ID
 * @param {Map<string, NodeSchedule>} schedule - Schedule information
 * @returns {string[][]} Array of paths
 * @private
 */
function findPathsFromNode(graph, startId, schedule) {
  const paths = [];
  const currentPath = [startId];
  
  function dfs(nodeId) {
    const successors = graph.edges.get(nodeId) || new Set();
    const criticalSuccessors = Array.from(successors).filter(succId => 
      schedule.get(succId).isCritical
    );
    
    if (criticalSuccessors.length === 0) {
      paths.push([...currentPath]);
      return;
    }
    
    for (const succId of criticalSuccessors) {
      currentPath.push(succId);
      dfs(succId);
      currentPath.pop();
    }
  }
  
  dfs(startId);
  return paths;
}

/**
 * Computes slack time for a specific node
 * 
 * @param {CriticalPathResult} result - Result from findCriticalPath
 * @param {string} nodeId - Node ID to query
 * @returns {number} Slack time (0 means critical)
 */
export function getSlack(result, nodeId) {
  const schedule = result.schedule.get(nodeId);
  return schedule ? schedule.slack : 0;
}

/**
 * Checks if a node is on the critical path
 * 
 * @param {CriticalPathResult} result - Result from findCriticalPath
 * @param {string} nodeId - Node ID to query
 * @returns {boolean} True if node is critical
 */
export function isCritical(result, nodeId) {
  const schedule = result.schedule.get(nodeId);
  return schedule ? schedule.isCritical : false;
}

/**
 * Gets the schedule window for a node (earliest to latest start)
 * 
 * @param {CriticalPathResult} result - Result from findCriticalPath
 * @param {string} nodeId - Node ID to query
 * @returns {{earliest: number, latest: number, window: number}} Schedule window
 */
export function getScheduleWindow(result, nodeId) {
  const schedule = result.schedule.get(nodeId);
  
  if (!schedule) {
    return { earliest: 0, latest: 0, window: 0 };
  }
  
  return {
    earliest: schedule.earliestStart,
    latest: schedule.latestStart,
    window: schedule.slack
  };
}