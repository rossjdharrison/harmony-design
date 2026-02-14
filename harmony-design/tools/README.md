/**
 * Design System Tools
 * 
 * Collection of tools for querying and analyzing the Harmony Design System graph.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#design-system-tools
 */

/**
 * Available Tools:
 * 
 * 1. query_components - Filter and search components by various criteria
 *    - Filter by level (atom, molecule, organism, template, page)
 *    - Filter by state (draft, design_complete, implementation_ready, etc.)
 *    - Filter by token usage
 * 
 * 2. get_component_dependencies - Trace composition chains
 *    - Get upstream dependencies (what a component uses)
 *    - Get downstream dependents (what uses a component)
 *    - Find circular dependencies
 *    - Calculate dependency statistics
 *    - Find shortest paths between components
 * 
 * Usage Examples:
 * 
 * // Find all atoms in draft state
 * const draftAtoms = await queryComponents({
 *   level: 'atom',
 *   state: 'draft'
 * });
 * 
 * // Get all dependencies of a button
 * const deps = await getComponentDependencies({
 *   componentId: 'button-primary',
 *   direction: 'upstream',
 *   maxDepth: 5
 * });
 * 
 * // Find what components use an icon
 * const usages = await getComponentDependencies({
 *   componentId: 'icon-base',
 *   direction: 'downstream'
 * });
 * 
 * // Check for circular dependencies
 * const cycles = await findCircularDependencies('button-primary');
 * 
 * // Get dependency statistics
 * const stats = await getDependencyStats('card-stats');
 */

export { queryComponents } from './query_components.js';
export { 
  getComponentDependencies,
  findCircularDependencies,
  getDependencyStats,
  findShortestPath
} from './get_component_dependencies.js';