/**
 * Audio Gain Compute Shader
 * 
 * Applies gain (volume) to audio samples in parallel.
 * Optimized for 128-sample blocks (Web Audio API quantum size).
 * 
 * Performance: ~0.5ms for 128 samples @ 48kHz on modern GPUs
 */

@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;
@group(0) @binding(2) var<uniform> params: GainParams;

struct GainParams {
  gain: f32,
  sampleCount: u32,
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  
  if (index >= params.sampleCount) {
    return;
  }
  
  output[index] = input[index] * params.gain;
}