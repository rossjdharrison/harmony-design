/**
 * FilterShader.wgsl
 * 
 * WebGPU shader for parallel node and edge filtering operations.
 * Applies predicate-based filtering to graph elements using GPU parallelization.
 * 
 * Performance Target: Process 100K+ nodes/edges in <5ms
 * Memory Budget: Works within 50MB WASM heap constraint
 * 
 * Related: DESIGN_SYSTEM.md § GPU-Accelerated Graph Processing
 */

// ============================================================================
// STORAGE BUFFERS
// ============================================================================

/**
 * Input buffer containing node data to filter
 * Layout: [id: u32, type: u32, flags: u32, propOffset: u32] per node
 */
@group(0) @binding(0)
var<storage, read> nodeData: array<u32>;

/**
 * Input buffer containing edge data to filter
 * Layout: [sourceId: u32, targetId: u32, type: u32, weight: f32] per edge
 */
@group(0) @binding(1)
var<storage, read> edgeData: array<u32>;

/**
 * Filter predicate parameters
 * Layout: [filterType: u32, param1: u32, param2: u32, param3: u32, ...]
 */
@group(0) @binding(2)
var<storage, read> filterParams: array<u32>;

/**
 * Output buffer for filtered node indices
 * Contains indices of nodes that pass the filter
 */
@group(0) @binding(3)
var<storage, read_write> filteredNodes: array<u32>;

/**
 * Output buffer for filtered edge indices
 * Contains indices of edges that pass the filter
 */
@group(0) @binding(4)
var<storage, read_write> filteredEdges: array<u32>;

/**
 * Atomic counters for output array sizes
 * [0]: nodeCount, [1]: edgeCount
 */
@group(0) @binding(5)
var<storage, read_write> outputCounts: array<atomic<u32>>;

/**
 * Node property data buffer (variable-length properties)
 * Used for property-based filtering
 */
@group(0) @binding(6)
var<storage, read> nodeProps: array<u32>;

// ============================================================================
// CONSTANTS
// ============================================================================

const WORKGROUP_SIZE: u32 = 256u;
const NODE_STRIDE: u32 = 4u;      // 4 u32s per node
const EDGE_STRIDE: u32 = 4u;      // 4 u32s per edge (weight stored as bits)

// Filter types
const FILTER_BY_TYPE: u32 = 0u;
const FILTER_BY_FLAGS: u32 = 1u;
const FILTER_BY_PROPERTY: u32 = 2u;
const FILTER_BY_DEGREE: u32 = 3u;
const FILTER_BY_CONNECTED: u32 = 4u;
const FILTER_BY_WEIGHT: u32 = 5u;
const FILTER_COMPOSITE_AND: u32 = 6u;
const FILTER_COMPOSITE_OR: u32 = 7u;

// Node flags (bit positions)
const FLAG_ACTIVE: u32 = 1u;
const FLAG_SELECTED: u32 = 2u;
const FLAG_HIDDEN: u32 = 4u;
const FLAG_LOCKED: u32 = 8u;
const FLAG_DIRTY: u32 = 16u;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract node ID from node data at given index
 */
fn getNodeId(nodeIndex: u32) -> u32 {
    return nodeData[nodeIndex * NODE_STRIDE];
}

/**
 * Extract node type from node data at given index
 */
fn getNodeType(nodeIndex: u32) -> u32 {
    return nodeData[nodeIndex * NODE_STRIDE + 1u];
}

/**
 * Extract node flags from node data at given index
 */
fn getNodeFlags(nodeIndex: u32) -> u32 {
    return nodeData[nodeIndex * NODE_STRIDE + 2u];
}

/**
 * Extract node property offset from node data at given index
 */
fn getNodePropOffset(nodeIndex: u32) -> u32 {
    return nodeData[nodeIndex * NODE_STRIDE + 3u];
}

/**
 * Extract edge source ID from edge data at given index
 */
fn getEdgeSource(edgeIndex: u32) -> u32 {
    return edgeData[edgeIndex * EDGE_STRIDE];
}

/**
 * Extract edge target ID from edge data at given index
 */
fn getEdgeTarget(edgeIndex: u32) -> u32 {
    return edgeData[edgeIndex * EDGE_STRIDE + 1u];
}

/**
 * Extract edge type from edge data at given index
 */
fn getEdgeType(edgeIndex: u32) -> u32 {
    return edgeData[edgeIndex * EDGE_STRIDE + 2u];
}

/**
 * Extract edge weight from edge data at given index
 */
fn getEdgeWeight(edgeIndex: u32) -> f32 {
    return bitcast<f32>(edgeData[edgeIndex * EDGE_STRIDE + 3u]);
}

/**
 * Check if node has specific flag set
 */
fn hasFlag(flags: u32, flag: u32) -> bool {
    return (flags & flag) != 0u;
}

// ============================================================================
// FILTER PREDICATES
// ============================================================================

/**
 * Filter by node type
 * param1: target type ID
 */
fn filterNodeByType(nodeIndex: u32) -> bool {
    let targetType = filterParams[1];
    return getNodeType(nodeIndex) == targetType;
}

/**
 * Filter by node flags
 * param1: required flags (must have all)
 * param2: excluded flags (must have none)
 */
fn filterNodeByFlags(nodeIndex: u32) -> bool {
    let flags = getNodeFlags(nodeIndex);
    let requiredFlags = filterParams[1];
    let excludedFlags = filterParams[2];
    
    let hasRequired = (flags & requiredFlags) == requiredFlags;
    let hasExcluded = (flags & excludedFlags) != 0u;
    
    return hasRequired && !hasExcluded;
}

/**
 * Filter by node property value
 * param1: property key hash
 * param2: expected value
 * param3: comparison type (0=equal, 1=greater, 2=less, 3=range)
 */
fn filterNodeByProperty(nodeIndex: u32) -> bool {
    let propOffset = getNodePropOffset(nodeIndex);
    let keyHash = filterParams[1];
    let expectedValue = filterParams[2];
    let comparisonType = filterParams[3];
    
    // Simple property lookup (real implementation would parse property buffer)
    if (propOffset == 0u) {
        return false;
    }
    
    let propValue = nodeProps[propOffset];
    
    switch (comparisonType) {
        case 0u: { return propValue == expectedValue; }
        case 1u: { return propValue > expectedValue; }
        case 2u: { return propValue < expectedValue; }
        case 3u: {
            let maxValue = filterParams[4];
            return propValue >= expectedValue && propValue <= maxValue;
        }
        default: { return false; }
    }
}

/**
 * Filter edge by type
 * param1: target edge type ID
 */
fn filterEdgeByType(edgeIndex: u32) -> bool {
    let targetType = filterParams[1];
    return getEdgeType(edgeIndex) == targetType;
}

/**
 * Filter edge by weight range
 * param1: min weight (as u32 bits)
 * param2: max weight (as u32 bits)
 */
fn filterEdgeByWeight(edgeIndex: u32) -> bool {
    let weight = getEdgeWeight(edgeIndex);
    let minWeight = bitcast<f32>(filterParams[1]);
    let maxWeight = bitcast<f32>(filterParams[2]);
    
    return weight >= minWeight && weight <= maxWeight;
}

/**
 * Filter edge by connected node properties
 * param1: filter source nodes
 * param2: filter target nodes
 */
fn filterEdgeByConnected(edgeIndex: u32) -> bool {
    let filterSource = filterParams[1] != 0u;
    let filterTarget = filterParams[2] != 0u;
    
    // This would check if source/target nodes pass their own filters
    // Simplified implementation - real version would reference node filter results
    return true;
}

// ============================================================================
// MAIN COMPUTE SHADERS
// ============================================================================

/**
 * Filter nodes in parallel
 * Each invocation processes one node
 */
@compute @workgroup_size(256, 1, 1)
fn filterNodes(
    @builtin(global_invocation_id) globalId: vec3<u32>,
    @builtin(num_workgroups) numWorkgroups: vec3<u32>
) {
    let nodeIndex = globalId.x;
    let totalNodes = arrayLength(&nodeData) / NODE_STRIDE;
    
    if (nodeIndex >= totalNodes) {
        return;
    }
    
    let filterType = filterParams[0];
    var passes = false;
    
    switch (filterType) {
        case FILTER_BY_TYPE: {
            passes = filterNodeByType(nodeIndex);
        }
        case FILTER_BY_FLAGS: {
            passes = filterNodeByFlags(nodeIndex);
        }
        case FILTER_BY_PROPERTY: {
            passes = filterNodeByProperty(nodeIndex);
        }
        default: {
            passes = false;
        }
    }
    
    if (passes) {
        let outputIndex = atomicAdd(&outputCounts[0], 1u);
        filteredNodes[outputIndex] = nodeIndex;
    }
}

/**
 * Filter edges in parallel
 * Each invocation processes one edge
 */
@compute @workgroup_size(256, 1, 1)
fn filterEdges(
    @builtin(global_invocation_id) globalId: vec3<u32>,
    @builtin(num_workgroups) numWorkgroups: vec3<u32>
) {
    let edgeIndex = globalId.x;
    let totalEdges = arrayLength(&edgeData) / EDGE_STRIDE;
    
    if (edgeIndex >= totalEdges) {
        return;
    }
    
    let filterType = filterParams[0];
    var passes = false;
    
    switch (filterType) {
        case FILTER_BY_TYPE: {
            passes = filterEdgeByType(edgeIndex);
        }
        case FILTER_BY_WEIGHT: {
            passes = filterEdgeByWeight(edgeIndex);
        }
        case FILTER_BY_CONNECTED: {
            passes = filterEdgeByConnected(edgeIndex);
        }
        default: {
            passes = false;
        }
    }
    
    if (passes) {
        let outputIndex = atomicAdd(&outputCounts[1], 1u);
        filteredEdges[outputIndex] = edgeIndex;
    }
}

/**
 * Combined filter pass - filters both nodes and edges
 * More efficient for composite filters that need both
 */
@compute @workgroup_size(256, 1, 1)
fn filterCombined(
    @builtin(global_invocation_id) globalId: vec3<u32>,
    @builtin(num_workgroups) numWorkgroups: vec3<u32>
) {
    let index = globalId.x;
    let totalNodes = arrayLength(&nodeData) / NODE_STRIDE;
    let totalEdges = arrayLength(&edgeData) / EDGE_STRIDE;
    
    // Process nodes in first half of work items
    if (index < totalNodes) {
        let filterType = filterParams[0];
        var passes = false;
        
        switch (filterType) {
            case FILTER_BY_TYPE: {
                passes = filterNodeByType(index);
            }
            case FILTER_BY_FLAGS: {
                passes = filterNodeByFlags(index);
            }
            default: {
                passes = false;
            }
        }
        
        if (passes) {
            let outputIndex = atomicAdd(&outputCounts[0], 1u);
            filteredNodes[outputIndex] = index;
        }
    }
    
    // Process edges in second half of work items
    let edgeIndex = index - totalNodes;
    if (edgeIndex < totalEdges) {
        let filterType = filterParams[0];
        var passes = false;
        
        switch (filterType) {
            case FILTER_BY_TYPE: {
                passes = filterEdgeByType(edgeIndex);
            }
            case FILTER_BY_WEIGHT: {
                passes = filterEdgeByWeight(edgeIndex);
            }
            default: {
                passes = false;
            }
        }
        
        if (passes) {
            let outputIndex = atomicAdd(&outputCounts[1], 1u);
            filteredEdges[outputIndex] = edgeIndex;
        }
    }
}