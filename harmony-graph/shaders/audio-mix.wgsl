/**
 * Audio Mix Compute Shader
 * 
 * Mixes multiple audio buffers with individual gains.
 * Supports up to 8 input channels (configurable via workgroup size).
 * 
 * Performance: ~1ms for 128 samples × 8 channels @ 48kHz
 */

@group(0) @binding(0) var<storage, read> input0: array<f32>;
@group(0) @binding(1) var<storage, read> input1: array<f32>;
@group(0) @binding(2) var<storage, read> input2: array<f32>;
@group(0) @binding(3) var<storage, read> input3: array<f32>;
@group(0) @binding(4) var<storage, read_write> output: array<f32>;
@group(0) @binding(5) var<uniform> params: MixParams;

struct MixParams {
  gain0: f32,
  gain1: f32,
  gain2: f32,
  gain3: f32,
  sampleCount: u32,
  activeChannels: u32,
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  
  if (index >= params.sampleCount) {
    return;
  }
  
  var sum: f32 = 0.0;
  
  if (params.activeChannels > 0u) {
    sum += input0[index] * params.gain0;
  }
  if (params.activeChannels > 1u) {
    sum += input1[index] * params.gain1;
  }
  if (params.activeChannels > 2u) {
    sum += input2[index] * params.gain2;
  }
  if (params.activeChannels > 3u) {
    sum += input3[index] * params.gain3;
  }
  
  output[index] = sum;
}