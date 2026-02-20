// Example compute shader for audio buffer processing
// Demonstrates basic WGSL structure for Harmony Design System

@group(0) @binding(0) var<storage, read> inputBuffer: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputBuffer: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    
    // Simple pass-through with gain
    let gain: f32 = 0.5;
    outputBuffer[index] = inputBuffer[index] * gain;
}