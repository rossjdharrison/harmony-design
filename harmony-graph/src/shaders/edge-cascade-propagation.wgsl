/**
 * Edge Cascade Propagation Compute Shader
 * 
 * Propagates signals through graph edges in parallel using WebGPU compute.
 * Implements cascade propagation for reactive graph updates.
 * 
 * VISION: GPU-First Audio - Offloads graph traversal to GPU for <10ms latency
 * POLICY: Rule 25 - Audio processing functions MUST have WebGPU implementations
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#gpu-compute-shaders
 */

// Edge structure: source node, target node, weight, flags
struct Edge {
    source_id: u32,
    target_id: u32,
    weight: f32,
    flags: u32,  // bit 0: active, bit 1: bidirectional, bits 2-7: reserved
}

// Node state: value, dirty flag, generation counter
struct NodeState {
    value: f32,
    dirty: u32,      // 0 = clean, 1 = dirty
    generation: u32, // cascade generation counter
    reserved: u32,   // alignment padding
}

// Propagation metadata
struct PropagationMeta {
    total_edges: u32,
    active_nodes: u32,
    current_generation: u32,
    max_depth: u32,
}

// Input buffers (read-only)
@group(0) @binding(0) var<storage, read> edges: array<Edge>;
@group(0) @binding(1) var<storage, read> input_states: array<NodeState>;
@group(0) @binding(2) var<uniform> meta: PropagationMeta;

// Output buffers (read-write)
@group(0) @binding(3) var<storage, read_write> output_states: array<NodeState>;
@group(0) @binding(4) var<storage, read_write> propagation_count: atomic<u32>;

// Workgroup size optimized for GPU occupancy
const WORKGROUP_SIZE: u32 = 256u;

/**
 * Check if edge is active and should propagate
 */
fn is_edge_active(edge: Edge) -> bool {
    return (edge.flags & 1u) != 0u;
}

/**
 * Check if edge is bidirectional
 */
fn is_bidirectional(edge: Edge) -> bool {
    return (edge.flags & 2u) != 0u;
}

/**
 * Compute propagated value with weight
 */
fn compute_propagation(source_value: f32, weight: f32) -> f32 {
    return source_value * weight;
}

/**
 * Main propagation kernel
 * 
 * Each thread processes one edge, reading source node state
 * and updating target node state if propagation is needed.
 * 
 * Performance target: <1ms for 10k edges on mid-range GPU
 */
@compute @workgroup_size(WORKGROUP_SIZE, 1, 1)
fn propagate_edge(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let edge_idx = global_id.x;
    
    // Bounds check
    if (edge_idx >= meta.total_edges) {
        return;
    }
    
    let edge = edges[edge_idx];
    
    // Skip inactive edges
    if (!is_edge_active(edge)) {
        return;
    }
    
    // Read source node state
    let source_state = input_states[edge.source_id];
    
    // Only propagate if source is dirty and from current generation
    if (source_state.dirty == 0u || source_state.generation != meta.current_generation) {
        return;
    }
    
    // Compute propagated value
    let propagated_value = compute_propagation(source_state.value, edge.weight);
    
    // Atomic read-modify-write for target node
    // Note: Using simple assignment here; for accumulation, use atomicAdd on f32
    let target_idx = edge.target_id;
    
    // Update target node state
    output_states[target_idx].value = output_states[target_idx].value + propagated_value;
    output_states[target_idx].dirty = 1u;
    output_states[target_idx].generation = meta.current_generation + 1u;
    
    // Increment propagation counter
    atomicAdd(&propagation_count, 1u);
    
    // Handle bidirectional edges
    if (is_bidirectional(edge)) {
        let reverse_value = compute_propagation(
            input_states[edge.target_id].value,
            edge.weight
        );
        output_states[edge.source_id].value = output_states[edge.source_id].value + reverse_value;
        output_states[edge.source_id].dirty = 1u;
        output_states[edge.source_id].generation = meta.current_generation + 1u;
        atomicAdd(&propagation_count, 1u);
    }
}

/**
 * Clear dirty flags kernel
 * 
 * Resets dirty flags for nodes that have been processed.
 * Run after propagation pass completes.
 */
@compute @workgroup_size(WORKGROUP_SIZE, 1, 1)
fn clear_dirty_flags(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let node_idx = global_id.x;
    
    if (node_idx >= meta.active_nodes) {
        return;
    }
    
    // Only clear if generation matches (was processed this round)
    if (output_states[node_idx].generation == meta.current_generation + 1u) {
        output_states[node_idx].dirty = 0u;
    }
}

/**
 * Initialize cascade kernel
 * 
 * Marks initial dirty nodes for cascade start.
 * Sets generation counter to 0.
 */
@compute @workgroup_size(WORKGROUP_SIZE, 1, 1)
fn initialize_cascade(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let node_idx = global_id.x;
    
    if (node_idx >= meta.active_nodes) {
        return;
    }
    
    // Copy input state to output
    output_states[node_idx] = input_states[node_idx];
    
    // Mark as clean initially
    output_states[node_idx].dirty = 0u;
    output_states[node_idx].generation = 0u;
}

/**
 * Depth-limited propagation kernel
 * 
 * Similar to propagate_edge but respects max_depth limit
 * to prevent infinite cascades in cyclic graphs.
 */
@compute @workgroup_size(WORKGROUP_SIZE, 1, 1)
fn propagate_edge_limited(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let edge_idx = global_id.x;
    
    if (edge_idx >= meta.total_edges) {
        return;
    }
    
    // Check depth limit
    if (meta.current_generation >= meta.max_depth) {
        return;
    }
    
    let edge = edges[edge_idx];
    
    if (!is_edge_active(edge)) {
        return;
    }
    
    let source_state = input_states[edge.source_id];
    
    if (source_state.dirty == 0u || source_state.generation != meta.current_generation) {
        return;
    }
    
    let propagated_value = compute_propagation(source_state.value, edge.weight);
    let target_idx = edge.target_id;
    
    output_states[target_idx].value = output_states[target_idx].value + propagated_value;
    output_states[target_idx].dirty = 1u;
    output_states[target_idx].generation = meta.current_generation + 1u;
    
    atomicAdd(&propagation_count, 1u);
    
    if (is_bidirectional(edge)) {
        let reverse_value = compute_propagation(
            input_states[edge.target_id].value,
            edge.weight
        );
        output_states[edge.source_id].value = output_states[edge.source_id].value + reverse_value;
        output_states[edge.source_id].dirty = 1u;
        output_states[edge.source_id].generation = meta.current_generation + 1u;
        atomicAdd(&propagation_count, 1u);
    }
}