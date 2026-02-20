/**
 * Intent Availability Query Shader
 * 
 * Performs parallel queries of intent availability states across the graph.
 * Checks if intents can be satisfied based on current node states and edge connections.
 * 
 * @see DESIGN_SYSTEM.md#gpu-first-audio-processing
 * @see harmony-graph/src/gpu/intent-query.js
 */

// Intent state flags
const INTENT_PENDING: u32 = 0u;
const INTENT_AVAILABLE: u32 = 1u;
const INTENT_UNAVAILABLE: u32 = 2u;
const INTENT_SATISFIED: u32 = 3u;

// Node state flags
const NODE_INACTIVE: u32 = 0u;
const NODE_ACTIVE: u32 = 1u;
const NODE_PROCESSING: u32 = 2u;
const NODE_ERROR: u32 = 3u;

// Edge state flags
const EDGE_DISCONNECTED: u32 = 0u;
const EDGE_CONNECTED: u32 = 1u;
const EDGE_BLOCKED: u32 = 2u;

/**
 * Intent query descriptor
 * Layout: [intent_id, target_node_id, required_state, flags]
 */
struct IntentQuery {
    intent_id: u32,
    target_node_id: u32,
    required_state: u32,
    flags: u32,
}

/**
 * Node state descriptor
 * Layout: [node_id, state, timestamp, reserved]
 */
struct NodeState {
    node_id: u32,
    state: u32,
    timestamp: u32,
    reserved: u32,
}

/**
 * Edge connection descriptor
 * Layout: [edge_id, source_node, target_node, state]
 */
struct EdgeConnection {
    edge_id: u32,
    source_node: u32,
    target_node: u32,
    state: u32,
}

/**
 * Availability result
 * Layout: [intent_id, availability, blocking_count, first_blocker_id]
 */
struct AvailabilityResult {
    intent_id: u32,
    availability: u32,
    blocking_count: u32,
    first_blocker_id: u32,
}

// Uniform buffer for query configuration
struct QueryConfig {
    query_count: u32,
    node_count: u32,
    edge_count: u32,
    timestamp: u32,
}

@group(0) @binding(0) var<uniform> config: QueryConfig;
@group(0) @binding(1) var<storage, read> queries: array<IntentQuery>;
@group(0) @binding(2) var<storage, read> nodes: array<NodeState>;
@group(0) @binding(3) var<storage, read> edges: array<EdgeConnection>;
@group(0) @binding(4) var<storage, read_write> results: array<AvailabilityResult>;

/**
 * Check if a node is in the required state
 */
fn is_node_available(node_id: u32, required_state: u32) -> bool {
    for (var i = 0u; i < config.node_count; i++) {
        if (nodes[i].node_id == node_id) {
            return nodes[i].state == required_state;
        }
    }
    return false;
}

/**
 * Count blocking edges for a target node
 * Returns the number of edges that are not in CONNECTED state
 */
fn count_blocking_edges(target_node_id: u32) -> u32 {
    var blocking_count = 0u;
    
    for (var i = 0u; i < config.edge_count; i++) {
        if (edges[i].target_node == target_node_id) {
            if (edges[i].state != EDGE_CONNECTED) {
                blocking_count++;
            }
        }
    }
    
    return blocking_count;
}

/**
 * Find the first blocking edge ID for a target node
 */
fn find_first_blocker(target_node_id: u32) -> u32 {
    for (var i = 0u; i < config.edge_count; i++) {
        if (edges[i].target_node == target_node_id) {
            if (edges[i].state != EDGE_CONNECTED) {
                return edges[i].edge_id;
            }
        }
    }
    return 0xFFFFFFFFu; // No blocker found
}

/**
 * Check if all incoming edges are connected
 */
fn are_incoming_edges_connected(target_node_id: u32) -> bool {
    for (var i = 0u; i < config.edge_count; i++) {
        if (edges[i].target_node == target_node_id) {
            if (edges[i].state != EDGE_CONNECTED) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Determine intent availability based on node and edge states
 */
fn compute_availability(query: IntentQuery) -> u32 {
    // Check if target node exists and is in required state
    let node_available = is_node_available(query.target_node_id, query.required_state);
    
    if (!node_available) {
        return INTENT_UNAVAILABLE;
    }
    
    // Check if all incoming edges are connected
    let edges_connected = are_incoming_edges_connected(query.target_node_id);
    
    if (!edges_connected) {
        return INTENT_UNAVAILABLE;
    }
    
    // All conditions met
    return INTENT_AVAILABLE;
}

/**
 * Main compute shader entry point
 * Each invocation processes one intent query
 */
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let query_index = global_id.x;
    
    // Bounds check
    if (query_index >= config.query_count) {
        return;
    }
    
    // Load query
    let query = queries[query_index];
    
    // Compute availability
    let availability = compute_availability(query);
    
    // Count blocking edges
    let blocking_count = count_blocking_edges(query.target_node_id);
    
    // Find first blocker
    let first_blocker = find_first_blocker(query.target_node_id);
    
    // Write result
    results[query_index] = AvailabilityResult(
        query.intent_id,
        availability,
        blocking_count,
        first_blocker
    );
}

/**
 * Batch query variant - processes multiple queries per invocation
 * More efficient for large query sets
 */
@compute @workgroup_size(64)
fn batch_query(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let thread_id = global_id.x;
    let queries_per_thread = 4u;
    let base_index = thread_id * queries_per_thread;
    
    for (var i = 0u; i < queries_per_thread; i++) {
        let query_index = base_index + i;
        
        if (query_index >= config.query_count) {
            return;
        }
        
        let query = queries[query_index];
        let availability = compute_availability(query);
        let blocking_count = count_blocking_edges(query.target_node_id);
        let first_blocker = find_first_blocker(query.target_node_id);
        
        results[query_index] = AvailabilityResult(
            query.intent_id,
            availability,
            blocking_count,
            first_blocker
        );
    }
}

/**
 * Optimized variant using shared memory for node lookups
 * Best for workloads with high node reuse
 */
var<workgroup> shared_nodes: array<NodeState, 256>;

@compute @workgroup_size(64)
fn optimized_query(@builtin(global_invocation_id) global_id: vec3<u32>,
                   @builtin(local_invocation_id) local_id: vec3<u32>) {
    let query_index = global_id.x;
    let local_index = local_id.x;
    
    // Cooperatively load nodes into shared memory
    let nodes_per_thread = (config.node_count + 63u) / 64u;
    for (var i = 0u; i < nodes_per_thread; i++) {
        let node_index = local_index + i * 64u;
        if (node_index < config.node_count && node_index < 256u) {
            shared_nodes[node_index] = nodes[node_index];
        }
    }
    
    // Synchronize workgroup
    workgroupBarrier();
    
    // Process query using shared memory
    if (query_index < config.query_count) {
        let query = queries[query_index];
        
        // Look up node in shared memory first
        var node_available = false;
        for (var i = 0u; i < min(config.node_count, 256u); i++) {
            if (shared_nodes[i].node_id == query.target_node_id) {
                node_available = shared_nodes[i].state == query.required_state;
                break;
            }
        }
        
        var availability = INTENT_UNAVAILABLE;
        if (node_available && are_incoming_edges_connected(query.target_node_id)) {
            availability = INTENT_AVAILABLE;
        }
        
        let blocking_count = count_blocking_edges(query.target_node_id);
        let first_blocker = find_first_blocker(query.target_node_id);
        
        results[query_index] = AvailabilityResult(
            query.intent_id,
            availability,
            blocking_count,
            first_blocker
        );
    }
}