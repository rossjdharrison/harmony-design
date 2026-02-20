// Example schema definition for custom Waveshaper node
// This file would be added to harmony-schemas/src/graph/node_types.rs

use serde::{Deserialize, Serialize};

/// Waveshaper distortion node type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaveshaperNodeConfig {
    /// Drive amount (0.0 - 10.0)
    pub drive: f32,
    /// Output mix (0.0 = dry, 1.0 = wet)
    pub mix: f32,
    /// Waveshaping curve type
    pub curve_type: WaveshapeCurve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WaveshapeCurve {
    Soft,
    Hard,
    Asymmetric,
    Custom(Vec<f32>),
}

impl Default for WaveshaperNodeConfig {
    fn default() -> Self {
        Self {
            drive: 1.0,
            mix: 1.0,
            curve_type: WaveshapeCurve::Soft,
        }
    }
}