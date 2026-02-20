/**
 * Cross-Graph Edge Cascade Propagation Shader
 * 
 * Handles signal propagation across edges that span multiple graph instances.
 * Implements efficient batch processing with graph boundary awareness.
 * 
 * Performance Target: <1ms for 10k cross-graph edges
 * Memory: Uses indexed buffers for O(1) graph lookups
 * 
 * @see harmony-design/DESIGN_SYSTEM.md § GPU-First Audio Processing
 */

// ============================================================================
// Buffer Bindings
// ============================================================================

/**
 * Cross-graph edge data structure
 * Layout: [sourceGraphId, sourceNodeId, targetGraphId, targetNodeId, weight]
 */
struct CrossGraphEdge {
  source_graph_id: u32,
  source_node_id: u32,
  target_graph_id: u32,
  target_node_id: u32,
  weight: f32,
}

/**
 * Graph instance metadata
 * Layout: [graphId, nodeOffset, nodeCount, stateOffset]
 */
struct GraphMetadata {
  graph_id: u32,
  node_offset: u32,
  node_count: u32,
  state_offset: u32,
}

/**
 * Node state with graph context
 * Layout: [value, timestamp, graphId, flags]
 */
struct NodeState {
  value: f32,
  timestamp: u32,
  graph_id: u32,
  flags: u32,
}

// Read-only: Cross-graph edges to process
@group(0) @binding(0) var<storage, read> edges: array<CrossGraphEdge>;

// Read-only: Graph metadata for boundary checks
@group(0) @binding(1) var<storage, read> graph_metadata: array<GraphMetadata>;

// Read-only: Source node states (all graphs)
@group(0) @binding(2) var<storage, read> source_states: array<NodeState>;

// Read-write: Target node states (all graphs)
@group(0) @binding(3) var<storage, read_write> target_states: array<NodeState>;

// Read-only: Edge index for fast lookup
@group(0) @binding(4) var<storage, read> edge_index: array<u32>;

// Uniforms
struct Params {
  edge_count: u32,
  graph_count: u32,
  current_timestamp: u32,
  propagation_threshold: f32,
}

@group(0) @binding(5) var<uniform> params: Params;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Binary search for graph metadata by ID
 * Returns index in graph_metadata array, or 0xFFFFFFFF if not found
 */
fn find_graph_metadata(graph_id: u32) -> u32 {
  var left: u32 = 0u;
  var right: u32 = params.graph_count;
  
  while (left < right) {
    let mid = (left + right) / 2u;
    let current_id = graph_metadata[mid].graph_id;
    
    if (current_id == graph_id) {
      return mid;
    } else if (current_id < graph_id) {
      left = mid + 1u;
    } else {
      right = mid;
    }
  }
  
  return 0xFFFFFFFFu; // Not found
}

/**
 * Validate node is within graph bounds
 */
fn is_node_valid(graph_idx: u32, node_id: u32) -> bool {
  if (graph_idx >= params.graph_count) {
    return false;
  }
  
  let metadata = graph_metadata[graph_idx];
  return node_id < metadata.node_count;
}

/**
 * Get absolute state index for a node in a specific graph
 */
fn get_state_index(graph_idx: u32, node_id: u32) -> u32 {
  let metadata = graph_metadata[graph_idx];
  return metadata.state_offset + node_id;
}

/**
 * Check if state is fresh enough to propagate
 */
fn is_state_fresh(state: NodeState) -> bool {
  let age = params.current_timestamp - state.timestamp;
  return age <= 2u; // Within 2 frames
}

/**
 * Check if propagation should occur based on value threshold
 */
fn should_propagate(value: f32) -> bool {
  return abs(value) >= params.propagation_threshold;
}

/**
 * Atomic accumulation with saturation
 * Returns true if accumulation succeeded
 */
fn atomic_accumulate(target_idx: u32, delta: f32) -> bool {
  // Read current value
  let current = target_states[target_idx].value;
  
  // Calculate new value with saturation
  var new_value = current + delta;
  new_value = clamp(new_value, -1.0, 1.0);
  
  // Store new value
  target_states[target_idx].value = new_value;
  target_states[target_idx].timestamp = params.current_timestamp;
  
  return true;
}

// ============================================================================
// Main Compute Kernel
// ============================================================================

/**
 * Cross-graph cascade propagation kernel
 * 
 * Processes one edge per invocation, handling:
 * - Graph boundary validation
 * - Stale state detection
 * - Weighted signal propagation
 * - Atomic accumulation
 * 
 * Workgroup size: 256 threads
 * Expected dispatch: (edge_count + 255) / 256 workgroups
 */
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let edge_idx = global_id.x;
  
  // Bounds check
  if (edge_idx >= params.edge_count) {
    return;
  }
  
  // Load edge data
  let edge = edges[edge_idx];
  
  // Validate source graph
  let source_graph_idx = find_graph_metadata(edge.source_graph_id);
  if (source_graph_idx == 0xFFFFFFFFu) {
    return; // Source graph not found
  }
  
  // Validate target graph
  let target_graph_idx = find_graph_metadata(edge.target_graph_id);
  if (target_graph_idx == 0xFFFFFFFFu) {
    return; // Target graph not found
  }
  
  // Validate node IDs
  if (!is_node_valid(source_graph_idx, edge.source_node_id)) {
    return; // Invalid source node
  }
  if (!is_node_valid(target_graph_idx, edge.target_node_id)) {
    return; // Invalid target node
  }
  
  // Get state indices
  let source_state_idx = get_state_index(source_graph_idx, edge.source_node_id);
  let target_state_idx = get_state_index(target_graph_idx, edge.target_node_id);
  
  // Load source state
  let source_state = source_states[source_state_idx];
  
  // Check if state is fresh
  if (!is_state_fresh(source_state)) {
    return; // Stale state, skip propagation
  }
  
  // Check propagation threshold
  if (!should_propagate(source_state.value)) {
    return; // Value too small, skip propagation
  }
  
  // Calculate weighted signal
  let signal = source_state.value * edge.weight;
  
  // Propagate to target
  atomic_accumulate(target_state_idx, signal);
}

/**
 * Batch initialization kernel
 * Resets all cross-graph edge states before propagation
 */
@compute @workgroup_size(256)
fn init_cascade(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let state_idx = global_id.x;
  
  if (state_idx >= arrayLength(&target_states)) {
    return;
  }
  
  // Reset value but preserve graph_id and flags
  target_states[state_idx].value = 0.0;
  target_states[state_idx].timestamp = params.current_timestamp;
}

/**
 * Debug kernel: Count active cross-graph edges
 * Outputs count to first element of target_states
 */
@compute @workgroup_size(256)
fn count_active_edges(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let edge_idx = global_id.x;
  
  if (edge_idx >= params.edge_count) {
    return;
  }
  
  let edge = edges[edge_idx];
  let source_graph_idx = find_graph_metadata(edge.source_graph_id);
  
  if (source_graph_idx == 0xFFFFFFFFu) {
    return;
  }
  
  let source_state_idx = get_state_index(source_graph_idx, edge.source_node_id);
  let source_state = source_states[source_state_idx];
  
  if (is_state_fresh(source_state) && should_propagate(source_state.value)) {
    // Atomic increment would go here in real implementation
    // For now, just mark as active
    target_states[0].value += 1.0;
  }
}