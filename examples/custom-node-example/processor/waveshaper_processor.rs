// Example processor implementation for Waveshaper node
// This would be added to bounded-contexts/wasm-node-registry/src/processors/

use std::f32::consts::PI;

/// Waveshaper distortion processor
pub struct WaveshaperProcessor {
    drive: f32,
    mix: f32,
    curve_type: WaveshapeCurve,
}

#[derive(Clone)]
pub enum WaveshapeCurve {
    Soft,
    Hard,
    Asymmetric,
    Custom(Vec<f32>),
}

impl WaveshaperProcessor {
    /// Create new waveshaper processor
    pub fn new() -> Self {
        Self {
            drive: 1.0,
            mix: 1.0,
            curve_type: WaveshapeCurve::Soft,
        }
    }

    /// Process audio buffer
    /// 
    /// # Performance
    /// Target: < 1ms for 512 sample buffer @ 48kHz
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        for (i, &sample) in input.iter().enumerate() {
            let driven = sample * self.drive;
            let shaped = self.apply_curve(driven);
            output[i] = sample * (1.0 - self.mix) + shaped * self.mix;
        }
    }

    /// Apply waveshaping curve
    #[inline]
    fn apply_curve(&self, input: f32) -> f32 {
        match &self.curve_type {
            WaveshapeCurve::Soft => {
                // Soft clipping using tanh
                input.tanh()
            }
            WaveshapeCurve::Hard => {
                // Hard clipping
                input.clamp(-1.0, 1.0)
            }
            WaveshapeCurve::Asymmetric => {
                // Asymmetric distortion
                if input > 0.0 {
                    1.0 - (-input).exp()
                } else {
                    -1.0 + input.exp()
                }
            }
            WaveshapeCurve::Custom(curve) => {
                // Lookup table interpolation
                let normalized = (input + 1.0) * 0.5; // Map -1..1 to 0..1
                let index = (normalized * (curve.len() - 1) as f32).clamp(0.0, (curve.len() - 1) as f32);
                let idx = index.floor() as usize;
                let frac = index - idx as f32;
                
                if idx + 1 < curve.len() {
                    curve[idx] * (1.0 - frac) + curve[idx + 1] * frac
                } else {
                    curve[idx]
                }
            }
        }
    }

    /// Set parameter value
    pub fn set_parameter(&mut self, name: &str, value: f32) {
        match name {
            "drive" => self.drive = value.clamp(0.0, 10.0),
            "mix" => self.mix = value.clamp(0.0, 1.0),
            _ => {}
        }
    }

    /// Set curve type
    pub fn set_curve(&mut self, curve: WaveshapeCurve) {
        self.curve_type = curve;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_soft_clipping() {
        let mut processor = WaveshaperProcessor::new();
        processor.set_curve(WaveshapeCurve::Soft);
        
        let input = vec![0.0, 0.5, 1.0, 2.0];
        let mut output = vec![0.0; 4];
        
        processor.process(&input, &mut output);
        
        // Verify output is bounded
        assert!(output.iter().all(|&x| x.abs() <= 1.0));
    }

    #[test]
    fn test_mix_parameter() {
        let mut processor = WaveshaperProcessor::new();
        processor.set_parameter("mix", 0.0);
        
        let input = vec![0.5; 4];
        let mut output = vec![0.0; 4];
        
        processor.process(&input, &mut output);
        
        // With mix=0, output should equal input
        assert_eq!(output, input);
    }
}