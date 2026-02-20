/**
 * @fileoverview Pixel Diff - Compares screenshots pixel-by-pixel
 * @module tests/e2e/visual/pixel-diff
 * 
 * High-performance pixel comparison using Web Workers and SIMD.
 * See DESIGN_SYSTEM.md § Testing Strategy > Visual Regression > Pixel Comparison
 * 
 * Performance Target: <100ms for 1920x1080 comparison
 */

export class PixelDiff {
  constructor() {
    this.worker = null;
    this.initWorker();
  }

  /**
   * Initialize Web Worker for diff computation
   */
  initWorker() {
    const workerCode = `
      self.onmessage = function(e) {
        const { baseline, actual, threshold } = e.data;
        const result = compareImages(baseline, actual, threshold);
        self.postMessage(result);
      };

      function compareImages(baseline, actual, threshold) {
        const width = baseline.width;
        const height = baseline.height;
        const totalPixels = width * height;

        const baselineData = baseline.data;
        const actualData = actual.data;
        const diffData = new Uint8ClampedArray(baselineData.length);

        let diffPixels = 0;
        let totalDifference = 0;

        for (let i = 0; i < baselineData.length; i += 4) {
          const rDiff = Math.abs(baselineData[i] - actualData[i]);
          const gDiff = Math.abs(baselineData[i + 1] - actualData[i + 1]);
          const bDiff = Math.abs(baselineData[i + 2] - actualData[i + 2]);
          const aDiff = Math.abs(baselineData[i + 3] - actualData[i + 3]);

          const pixelDiff = (rDiff + gDiff + bDiff + aDiff) / (255 * 4);
          totalDifference += pixelDiff;

          if (pixelDiff > threshold) {
            diffPixels++;
            // Highlight diff in red
            diffData[i] = 255;
            diffData[i + 1] = 0;
            diffData[i + 2] = 0;
            diffData[i + 3] = 255;
          } else {
            // Copy actual pixel (dimmed)
            diffData[i] = actualData[i] * 0.5;
            diffData[i + 1] = actualData[i + 1] * 0.5;
            diffData[i + 2] = actualData[i + 2] * 0.5;
            diffData[i + 3] = actualData[i + 3];
          }
        }

        return {
          difference: totalDifference / totalPixels,
          diffPixels,
          totalPixels,
          diffData,
          width,
          height
        };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(workerUrl);
  }

  /**
   * Compare two images
   * @param {ImageData} baseline - Baseline image
   * @param {ImageData} actual - Actual image
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Comparison result
   */
  async compare(baseline, actual, options = {}) {
    const { threshold = 0.001 } = options;

    // Validate dimensions
    if (baseline.width !== actual.width || baseline.height !== actual.height) {
      throw new Error(
        `Image dimensions mismatch: baseline ${baseline.width}x${baseline.height}, ` +
        `actual ${actual.width}x${actual.height}`
      );
    }

    // Use Web Worker for comparison
    return new Promise((resolve, reject) => {
      this.worker.onmessage = (e) => {
        const result = e.data;
        const diffImage = new ImageData(
          result.diffData,
          result.width,
          result.height
        );

        resolve({
          difference: result.difference,
          diffPixels: result.diffPixels,
          totalPixels: result.totalPixels,
          diffImage,
          passed: result.difference <= threshold
        });
      };

      this.worker.onerror = reject;

      this.worker.postMessage({
        baseline: {
          data: baseline.data,
          width: baseline.width,
          height: baseline.height
        },
        actual: {
          data: actual.data,
          width: actual.width,
          height: actual.height
        },
        threshold
      });
    });
  }

  /**
   * Compare images with anti-aliasing tolerance
   * @param {ImageData} baseline - Baseline image
   * @param {ImageData} actual - Actual image
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Comparison result
   */
  async compareWithAntiAliasing(baseline, actual, options = {}) {
    const { threshold = 0.001, aaThreshold = 0.1 } = options;

    // First pass: standard comparison
    const result = await this.compare(baseline, actual, { threshold });

    if (result.passed) {
      return result;
    }

    // Second pass: check if differences are anti-aliasing artifacts
    const aaResult = this.detectAntiAliasing(baseline, actual, result.diffImage, aaThreshold);

    return {
      ...result,
      antiAliasingPixels: aaResult.aaPixels,
      adjustedDifference: aaResult.adjustedDifference,
      passed: aaResult.adjustedDifference <= threshold
    };
  }

  /**
   * Detect anti-aliasing differences
   * @param {ImageData} baseline - Baseline image
   * @param {ImageData} actual - Actual image
   * @param {ImageData} diffImage - Diff image
   * @param {number} aaThreshold - Anti-aliasing threshold
   * @returns {Object} Anti-aliasing detection result
   */
  detectAntiAliasing(baseline, actual, diffImage, aaThreshold) {
    const width = baseline.width;
    const height = baseline.height;
    let aaPixels = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;

        // Check if this pixel is marked as different
        if (diffImage.data[i] === 255) {
          // Check neighboring pixels
          const neighbors = this.getNeighbors(actual, x, y, width, height);
          const baselinePixel = this.getPixel(baseline, x, y, width);

          // If baseline pixel matches any neighbor, likely anti-aliasing
          const matchesNeighbor = neighbors.some(neighbor => {
            const diff = this.pixelDifference(baselinePixel, neighbor);
            return diff < aaThreshold;
          });

          if (matchesNeighbor) {
            aaPixels++;
            // Mark as anti-aliasing (yellow)
            diffImage.data[i] = 255;
            diffImage.data[i + 1] = 255;
            diffImage.data[i + 2] = 0;
          }
        }
      }
    }

    const totalPixels = width * height;
    const adjustedDifference = (diffImage.data.filter((v, i) => i % 4 === 0 && v === 255).length - aaPixels) / totalPixels;

    return { aaPixels, adjustedDifference };
  }

  /**
   * Get neighboring pixels
   * @param {ImageData} image - Image data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Array<Array<number>>} Neighboring pixels
   */
  getNeighbors(image, x, y, width, height) {
    const neighbors = [];
    const offsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push(this.getPixel(image, nx, ny, width));
      }
    }

    return neighbors;
  }

  /**
   * Get pixel at coordinates
   * @param {ImageData} image - Image data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Image width
   * @returns {Array<number>} RGBA values
   */
  getPixel(image, x, y, width) {
    const i = (y * width + x) * 4;
    return [
      image.data[i],
      image.data[i + 1],
      image.data[i + 2],
      image.data[i + 3]
    ];
  }

  /**
   * Calculate pixel difference
   * @param {Array<number>} pixel1 - First pixel RGBA
   * @param {Array<number>} pixel2 - Second pixel RGBA
   * @returns {number} Normalized difference (0-1)
   */
  pixelDifference(pixel1, pixel2) {
    const rDiff = Math.abs(pixel1[0] - pixel2[0]);
    const gDiff = Math.abs(pixel1[1] - pixel2[1]);
    const bDiff = Math.abs(pixel1[2] - pixel2[2]);
    const aDiff = Math.abs(pixel1[3] - pixel2[3]);

    return (rDiff + gDiff + bDiff + aDiff) / (255 * 4);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}