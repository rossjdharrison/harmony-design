/**
 * ReductionShader.wgsl
 * 
 * WGSL shader for parallel reduction to aggregate events efficiently.
 * Implements work-efficient parallel reduction using shared memory.
 * 
 * Purpose: Aggregate event data (counts, sums, statistics) across large datasets
 * using GPU parallelism for sub-millisecond performance.
 * 
 * Performance Target: Process 1M events in <1ms (GPU-First Performance Target)
 * Memory Budget: Fits within 50MB WASM heap constraint
 * 
 * Algorithm: Two-phase reduction
 * - Phase 1: Local reduction within workgroups using shared memory
 * - Phase 2: Global reduction of workgroup results
 * 
 * Related: See DESIGN_SYSTEM.md § GPU-Accelerated Event Aggregation
 */

// Workgroup size for parallel reduction
// 256 threads per workgroup provides good occupancy on most GPUs
const WORKGROUP_SIZE: u32 = 256u;

// Input buffer: event data to aggregate
@group(0) @binding(0) var<storage, read> input_data: array<f32>;

// Output buffer: reduced results
@group(0) @binding(1) var<storage, read_write> output_data: array<f32>;

// Uniform buffer: configuration parameters
struct ReductionParams {
    input_size: u32,        // Total number of input elements
    operation: u32,         // 0=sum, 1=max, 2=min, 3=count
    stride: u32,            // Current reduction stride (for multi-pass)
    padding: u32,           // Alignment padding
}

@group(0) @binding(2) var<uniform> params: ReductionParams;

// Shared memory for workgroup-local reduction
var<workgroup> shared_data: array<f32, WORKGROUP_SIZE>;

/**
 * Identity value for reduction operation
 * Returns the neutral element for the specified operation
 */
fn get_identity(operation: u32) -> f32 {
    switch operation {
        case 0u: { return 0.0; }      // Sum identity
        case 1u: { return -3.402823e38; } // Max identity (min float)
        case 2u: { return 3.402823e38; }  // Min identity (max float)
        case 3u: { return 0.0; }      // Count identity
        default: { return 0.0; }
    }
}

/**
 * Reduction operation
 * Combines two values according to the specified operation
 */
fn reduce_op(a: f32, b: f32, operation: u32) -> f32 {
    switch operation {
        case 0u: { return a + b; }        // Sum
        case 1u: { return max(a, b); }    // Max
        case 2u: { return min(a, b); }    // Min
        case 3u: { return a + b; }        // Count (sum of 1s)
        default: { return a; }
    }
}

/**
 * Main reduction compute shader
 * 
 * Workgroup layout: 256 threads per workgroup
 * Each thread loads one or more elements, performs local reduction,
 * then cooperates with workgroup to produce partial result.
 * 
 * @param global_id - Global thread index across all workgroups
 * @param local_id - Thread index within workgroup [0, 255]
 * @param workgroup_id - Workgroup index
 */
@compute @workgroup_size(256, 1, 1)
fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
    let tid = local_id.x;
    let gid = global_id.x;
    let operation = params.operation;
    
    // Phase 1: Load data into shared memory with grid-stride loop
    // Each thread may process multiple elements if input > total threads
    var local_sum = get_identity(operation);
    
    var i = gid;
    let stride = WORKGROUP_SIZE * params.stride;
    
    while (i < params.input_size) {
        local_sum = reduce_op(local_sum, input_data[i], operation);
        i += stride;
    }
    
    shared_data[tid] = local_sum;
    workgroupBarrier();
    
    // Phase 2: Tree-based reduction within workgroup
    // Iteratively reduce by half until single value remains
    var active_threads = WORKGROUP_SIZE / 2u;
    
    while (active_threads > 0u) {
        if (tid < active_threads) {
            shared_data[tid] = reduce_op(
                shared_data[tid],
                shared_data[tid + active_threads],
                operation
            );
        }
        workgroupBarrier();
        active_threads = active_threads / 2u;
    }
    
    // Phase 3: Write workgroup result
    // Only first thread writes the reduced value for this workgroup
    if (tid == 0u) {
        output_data[workgroup_id.x] = shared_data[0];
    }
}

/**
 * Final reduction pass for small arrays
 * Used when number of workgroups is small enough to reduce on CPU
 * or in a single final GPU pass.
 * 
 * This shader assumes input_size <= WORKGROUP_SIZE
 */
@compute @workgroup_size(256, 1, 1)
fn final_reduce(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
) {
    let tid = local_id.x;
    let operation = params.operation;
    
    // Load single element per thread
    if (tid < params.input_size) {
        shared_data[tid] = input_data[tid];
    } else {
        shared_data[tid] = get_identity(operation);
    }
    workgroupBarrier();
    
    // Tree reduction
    var active_threads = WORKGROUP_SIZE / 2u;
    
    while (active_threads > 0u) {
        if (tid < active_threads) {
            shared_data[tid] = reduce_op(
                shared_data[tid],
                shared_data[tid + active_threads],
                operation
            );
        }
        workgroupBarrier();
        active_threads = active_threads / 2u;
    }
    
    // Write final result
    if (tid == 0u) {
        output_data[0] = shared_data[0];
    }
}

/**
 * Specialized shader for event counting
 * Optimized for counting events that match a predicate
 * 
 * Input: Event flags (0.0 or 1.0)
 * Output: Total count
 */
@compute @workgroup_size(256, 1, 1)
fn count_events(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
    let tid = local_id.x;
    let gid = global_id.x;
    
    // Count events in grid-stride loop
    var count = 0.0;
    var i = gid;
    let stride = WORKGROUP_SIZE * params.stride;
    
    while (i < params.input_size) {
        count += input_data[i];
        i += stride;
    }
    
    shared_data[tid] = count;
    workgroupBarrier();
    
    // Sum reduction
    var active_threads = WORKGROUP_SIZE / 2u;
    while (active_threads > 0u) {
        if (tid < active_threads) {
            shared_data[tid] += shared_data[tid + active_threads];
        }
        workgroupBarrier();
        active_threads = active_threads / 2u;
    }
    
    if (tid == 0u) {
        output_data[workgroup_id.x] = shared_data[0];
    }
}

/**
 * Specialized shader for computing statistics
 * Computes sum, sum of squares (for variance) in single pass
 * 
 * Output buffer layout:
 * [0]: sum
 * [1]: sum of squares
 * [2]: min
 * [3]: max
 */
@compute @workgroup_size(256, 1, 1)
fn compute_statistics(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
    let tid = local_id.x;
    let gid = global_id.x;
    
    // Accumulate statistics
    var sum = 0.0;
    var sum_sq = 0.0;
    var min_val = 3.402823e38;
    var max_val = -3.402823e38;
    
    var i = gid;
    let stride = WORKGROUP_SIZE * params.stride;
    
    while (i < params.input_size) {
        let val = input_data[i];
        sum += val;
        sum_sq += val * val;
        min_val = min(min_val, val);
        max_val = max(max_val, val);
        i += stride;
    }
    
    // Store in shared memory (interleaved: sum, sum_sq, min, max)
    shared_data[tid] = sum;
    shared_data[tid + WORKGROUP_SIZE] = sum_sq;
    
    // Use atomics for min/max (simulated with shared memory)
    if (tid == 0u) {
        shared_data[2u * WORKGROUP_SIZE] = min_val;
        shared_data[2u * WORKGROUP_SIZE + 1u] = max_val;
    }
    workgroupBarrier();
    
    // Reduce sum and sum_sq
    var active_threads = WORKGROUP_SIZE / 2u;
    while (active_threads > 0u) {
        if (tid < active_threads) {
            shared_data[tid] += shared_data[tid + active_threads];
            shared_data[tid + WORKGROUP_SIZE] += shared_data[tid + active_threads + WORKGROUP_SIZE];
        }
        workgroupBarrier();
        active_threads = active_threads / 2u;
    }
    
    // Write results
    if (tid == 0u) {
        let base = workgroup_id.x * 4u;
        output_data[base] = shared_data[0];
        output_data[base + 1u] = shared_data[WORKGROUP_SIZE];
        output_data[base + 2u] = shared_data[2u * WORKGROUP_SIZE];
        output_data[base + 3u] = shared_data[2u * WORKGROUP_SIZE + 1u];
    }
}