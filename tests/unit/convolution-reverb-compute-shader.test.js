/**
 * @fileoverview Tests for Convolution Reverb Compute Shader
 * 
 * Validates:
 * - Shader initialization
 * - Impulse response loading and partitioning
 * - Convolution accuracy
 * - Performance targets (10ms latency)
 * - Overlap-add correctness
 * - Memory management
 */

import { ConvolutionReverbComputeShader } from '../../core/convolution-reverb-compute-shader.js';
import { GPUDevice } from '../../core/gpu-device.js';

describe('ConvolutionReverbComputeShader', () => {
  let gpuDevice;
  let shader;

  beforeAll(async () => {
    gpuDevice = new GPUDevice();
    await gpuDevice.initialize();
  });

  afterAll(() => {
    if (gpuDevice) {
      gpuDevice.dispose();
    }
  });

  beforeEach(() => {
    shader = new ConvolutionReverbComputeShader(gpuDevice, 512, 512);
  });

  afterEach(() => {
    if (shader) {
      shader.dispose();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await shader.initialize();
      expect(shader.initialized).toBe(true);
    });

    test('should require valid GPU device', () => {
      expect(() => {
        new ConvolutionReverbComputeShader(null);
      }).toThrow('Valid GPUDevice instance required');
    });

    test('should validate block size is power of 2', () => {
      expect(() => {
        new ConvolutionReverbComputeShader(gpuDevice, 500);
      }).toThrow('Block size must be power of 2');
    });

    test('should validate partition size is power of 2', () => {
      expect(() => {
        new ConvolutionReverbComputeShader(gpuDevice, 512, 500);
      }).toThrow('Partition size must be power of 2');
    });
  });

  describe('Impulse Response Loading', () => {
    beforeEach(async () => {
      await shader.initialize();
    });

    test('should load short impulse response', async () => {
      const ir = new Float32Array(512);
      ir[0] = 1.0; // Unit impulse
      
      await shader.loadImpulseResponse(ir);
      expect(shader.numPartitions).toBe(1);
    });

    test('should partition long impulse response', async () => {
      const ir = new Float32Array(2048);
      ir[0] = 1.0;
      
      await shader.loadImpulseResponse(ir);
      expect(shader.numPartitions).toBe(4); // 2048 / 512
    });

    test('should handle non-aligned IR length', async () => {
      const ir = new Float32Array(1000);
      ir[0] = 1.0;
      
      await shader.loadImpulseResponse(ir);
      expect(shader.numPartitions).toBe(2); // ceil(1000 / 512)
    });

    test('should throw if not initialized', async () => {
      const uninitializedShader = new ConvolutionReverbComputeShader(gpuDevice);
      const ir = new Float32Array(512);
      
      await expect(uninitializedShader.loadImpulseResponse(ir))
        .rejects.toThrow('Shader not initialized');
    });
  });

  describe('Audio Processing', () => {
    beforeEach(async () => {
      await shader.initialize();
    });

    test('should process audio with unit impulse (passthrough)', async () => {
      // Unit impulse = passthrough
      const ir = new Float32Array(512);
      ir[0] = 1.0;
      await shader.loadImpulseResponse(ir);

      const input = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        input[i] = Math.sin(2 * Math.PI * 440 * i / 48000);
      }

      const output = await shader.process(input);
      
      expect(output.length).toBe(512);
      
      // Check similarity (allowing for FFT/IFFT rounding)
      let maxDiff = 0;
      for (let i = 0; i < 512; i++) {
        const diff = Math.abs(output[i] - input[i]);
        maxDiff = Math.max(maxDiff, diff);
      }
      expect(maxDiff).toBeLessThan(0.01);
    });

    test('should apply gain with constant IR', async () => {
      // Constant IR = gain
      const ir = new Float32Array(1);
      ir[0] = 0.5;
      await shader.loadImpulseResponse(ir);

      const input = new Float32Array(512).fill(1.0);
      const output = await shader.process(input);
      
      // Check approximate gain
      const avgOutput = output.reduce((a, b) => a + b, 0) / output.length;
      expect(Math.abs(avgOutput - 0.5)).toBeLessThan(0.1);
    });

    test('should validate input block size', async () => {
      const ir = new Float32Array(512);
      ir[0] = 1.0;
      await shader.loadImpulseResponse(ir);

      const wrongSizeInput = new Float32Array(256);
      
      await expect(shader.process(wrongSizeInput))
        .rejects.toThrow('Input block must be 512 samples');
    });

    test('should throw if no IR loaded', async () => {
      const input = new Float32Array(512);
      
      await expect(shader.process(input))
        .rejects.toThrow('No impulse response loaded');
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await shader.initialize();
    });

    test('should meet 10ms latency target for short IR', async () => {
      const ir = new Float32Array(512);
      ir[0] = 1.0;
      await shader.loadImpulseResponse(ir);

      const input = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        input[i] = Math.random() * 2 - 1;
      }

      const startTime = performance.now();
      await shader.process(input);
      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(10);
    });

    test('should handle multiple blocks efficiently', async () => {
      const ir = new Float32Array(1024);
      ir[0] = 1.0;
      await shader.loadImpulseResponse(ir);

      const input = new Float32Array(512);
      const numBlocks = 10;

      const startTime = performance.now();
      for (let i = 0; i < numBlocks; i++) {
        await shader.process(input);
      }
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / numBlocks;

      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Overlap-Add', () => {
    beforeEach(async () => {
      await shader.initialize();
    });

    test('should maintain continuity between blocks', async () => {
      // Create IR with decay
      const ir = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        ir[i] = Math.exp(-i / 100);
      }
      await shader.loadImpulseResponse(ir);

      // Process two consecutive blocks
      const input1 = new Float32Array(512);
      input1[0] = 1.0; // Impulse at start
      
      const input2 = new Float32Array(512).fill(0);

      const output1 = await shader.process(input1);
      const output2 = await shader.process(input2);

      // Second block should have non-zero values from tail of first block
      const hasCarryover = output2.some(val => Math.abs(val) > 0.001);
      expect(hasCarryover).toBe(true);
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await shader.initialize();
    });

    test('should clean up IR partitions on new load', async () => {
      const ir1 = new Float32Array(512);
      ir1[0] = 1.0;
      await shader.loadImpulseResponse(ir1);
      
      const partitions1 = shader.numPartitions;

      const ir2 = new Float32Array(2048);
      ir2[0] = 1.0;
      await shader.loadImpulseResponse(ir2);
      
      expect(shader.numPartitions).toBe(4);
      expect(shader.numPartitions).not.toBe(partitions1);
    });

    test('should dispose all resources', async () => {
      const ir = new Float32Array(1024);
      await shader.loadImpulseResponse(ir);

      shader.dispose();
      
      expect(shader.initialized).toBe(false);
      expect(shader.irPartitions.length).toBe(0);
    });
  });
});