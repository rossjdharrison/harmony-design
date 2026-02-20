//! Binary encoding format for node properties using typed arrays
//!
//! Provides efficient serialization/deserialization of node properties
//! with support for various data types and minimal memory overhead.

use std::mem;

/// Property type identifiers for binary encoding
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PropType {
    Float32 = 0,
    Float64 = 1,
    Int32 = 2,
    Uint32 = 3,
    Int16 = 4,
    Uint16 = 5,
    Int8 = 6,
    Uint8 = 7,
    Bool = 8,
    String = 9,
    Array = 10,
}

impl PropType {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(PropType::Float32),
            1 => Some(PropType::Float64),
            2 => Some(PropType::Int32),
            3 => Some(PropType::Uint32),
            4 => Some(PropType::Int16),
            5 => Some(PropType::Uint16),
            6 => Some(PropType::Int8),
            7 => Some(PropType::Uint8),
            8 => Some(PropType::Bool),
            9 => Some(PropType::String),
            10 => Some(PropType::Array),
            _ => None,
        }
    }

    pub fn byte_size(&self) -> usize {
        match self {
            PropType::Float32 => 4,
            PropType::Float64 => 8,
            PropType::Int32 => 4,
            PropType::Uint32 => 4,
            PropType::Int16 => 2,
            PropType::Uint16 => 2,
            PropType::Int8 => 1,
            PropType::Uint8 => 1,
            PropType::Bool => 1,
            PropType::String => 0, // Variable length
            PropType::Array => 0,  // Variable length
        }
    }
}

/// Binary format for node properties
///
/// Layout:
/// - Header (8 bytes):
///   - property_count (u32)
///   - total_size (u32)
/// - Property entries (variable):
///   - name_length (u16)
///   - name_bytes (variable)
///   - prop_type (u8)
///   - value_size (u32)
///   - value_bytes (variable)
pub struct PropsBinaryFormat {
    buffer: Vec<u8>,
    cursor: usize,
}

impl PropsBinaryFormat {
    /// Create a new binary format encoder
    pub fn new() -> Self {
        Self {
            buffer: Vec::with_capacity(1024),
            cursor: 0,
        }
    }

    /// Create from existing buffer
    pub fn from_buffer(buffer: Vec<u8>) -> Self {
        Self { buffer, cursor: 0 }
    }

    /// Initialize header with property count
    pub fn init_header(&mut self, property_count: u32) {
        self.buffer.clear();
        self.cursor = 0;
        
        // Write property count
        self.buffer.extend_from_slice(&property_count.to_le_bytes());
        // Reserve space for total size (will be updated on finalize)
        self.buffer.extend_from_slice(&[0u8; 4]);
        self.cursor = 8;
    }

    /// Write a property to the buffer
    pub fn write_property(&mut self, name: &str, prop_type: PropType, value: &[u8]) {
        // Write name length
        let name_bytes = name.as_bytes();
        let name_len = name_bytes.len() as u16;
        self.buffer.extend_from_slice(&name_len.to_le_bytes());

        // Write name bytes
        self.buffer.extend_from_slice(name_bytes);

        // Write property type
        self.buffer.push(prop_type as u8);

        // Write value size
        let value_size = value.len() as u32;
        self.buffer.extend_from_slice(&value_size.to_le_bytes());

        // Write value bytes
        self.buffer.extend_from_slice(value);

        self.cursor = self.buffer.len();
    }

    /// Write a Float32 property
    pub fn write_float32(&mut self, name: &str, value: f32) {
        self.write_property(name, PropType::Float32, &value.to_le_bytes());
    }

    /// Write a Float64 property
    pub fn write_float64(&mut self, name: &str, value: f64) {
        self.write_property(name, PropType::Float64, &value.to_le_bytes());
    }

    /// Write an Int32 property
    pub fn write_int32(&mut self, name: &str, value: i32) {
        self.write_property(name, PropType::Int32, &value.to_le_bytes());
    }

    /// Write a Uint32 property
    pub fn write_uint32(&mut self, name: &str, value: u32) {
        self.write_property(name, PropType::Uint32, &value.to_le_bytes());
    }

    /// Write a Bool property
    pub fn write_bool(&mut self, name: &str, value: bool) {
        self.write_property(name, PropType::Bool, &[value as u8]);
    }

    /// Write a String property
    pub fn write_string(&mut self, name: &str, value: &str) {
        self.write_property(name, PropType::String, value.as_bytes());
    }

    /// Finalize and return the buffer
    pub fn finalize(mut self) -> Vec<u8> {
        // Update total size in header
        let total_size = self.buffer.len() as u32;
        self.buffer[4..8].copy_from_slice(&total_size.to_le_bytes());
        self.buffer
    }

    /// Get a reference to the buffer
    pub fn buffer(&self) -> &[u8] {
        &self.buffer
    }

    /// Get the buffer pointer for WASM export
    pub fn as_ptr(&self) -> *const u8 {
        self.buffer.as_ptr()
    }

    /// Get the buffer length
    pub fn len(&self) -> usize {
        self.buffer.len()
    }
}

/// Binary format decoder for node properties
pub struct PropsBinaryDecoder {
    buffer: Vec<u8>,
    cursor: usize,
    property_count: u32,
    total_size: u32,
}

impl PropsBinaryDecoder {
    /// Create a new decoder from buffer
    pub fn new(buffer: Vec<u8>) -> Result<Self, &'static str> {
        if buffer.len() < 8 {
            return Err("Buffer too small for header");
        }

        let property_count = u32::from_le_bytes([buffer[0], buffer[1], buffer[2], buffer[3]]);
        let total_size = u32::from_le_bytes([buffer[4], buffer[5], buffer[6], buffer[7]]);

        Ok(Self {
            buffer,
            cursor: 8,
            property_count,
            total_size,
        })
    }

    /// Get property count
    pub fn property_count(&self) -> u32 {
        self.property_count
    }

    /// Read next property
    pub fn read_property(&mut self) -> Result<(String, PropType, Vec<u8>), &'static str> {
        if self.cursor >= self.buffer.len() {
            return Err("End of buffer");
        }

        // Read name length
        if self.cursor + 2 > self.buffer.len() {
            return Err("Invalid name length");
        }
        let name_len = u16::from_le_bytes([
            self.buffer[self.cursor],
            self.buffer[self.cursor + 1],
        ]) as usize;
        self.cursor += 2;

        // Read name bytes
        if self.cursor + name_len > self.buffer.len() {
            return Err("Invalid name bytes");
        }
        let name = String::from_utf8(self.buffer[self.cursor..self.cursor + name_len].to_vec())
            .map_err(|_| "Invalid UTF-8 in name")?;
        self.cursor += name_len;

        // Read property type
        if self.cursor >= self.buffer.len() {
            return Err("Invalid property type");
        }
        let prop_type = PropType::from_u8(self.buffer[self.cursor])
            .ok_or("Unknown property type")?;
        self.cursor += 1;

        // Read value size
        if self.cursor + 4 > self.buffer.len() {
            return Err("Invalid value size");
        }
        let value_size = u32::from_le_bytes([
            self.buffer[self.cursor],
            self.buffer[self.cursor + 1],
            self.buffer[self.cursor + 2],
            self.buffer[self.cursor + 3],
        ]) as usize;
        self.cursor += 4;

        // Read value bytes
        if self.cursor + value_size > self.buffer.len() {
            return Err("Invalid value bytes");
        }
        let value = self.buffer[self.cursor..self.cursor + value_size].to_vec();
        self.cursor += value_size;

        Ok((name, prop_type, value))
    }

    /// Read Float32 value from bytes
    pub fn read_float32(bytes: &[u8]) -> Result<f32, &'static str> {
        if bytes.len() != 4 {
            return Err("Invalid Float32 size");
        }
        Ok(f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    /// Read Float64 value from bytes
    pub fn read_float64(bytes: &[u8]) -> Result<f64, &'static str> {
        if bytes.len() != 8 {
            return Err("Invalid Float64 size");
        }
        Ok(f64::from_le_bytes([
            bytes[0], bytes[1], bytes[2], bytes[3],
            bytes[4], bytes[5], bytes[6], bytes[7],
        ]))
    }

    /// Read Int32 value from bytes
    pub fn read_int32(bytes: &[u8]) -> Result<i32, &'static str> {
        if bytes.len() != 4 {
            return Err("Invalid Int32 size");
        }
        Ok(i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    /// Read Uint32 value from bytes
    pub fn read_uint32(bytes: &[u8]) -> Result<u32, &'static str> {
        if bytes.len() != 4 {
            return Err("Invalid Uint32 size");
        }
        Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    /// Read Bool value from bytes
    pub fn read_bool(bytes: &[u8]) -> Result<bool, &'static str> {
        if bytes.len() != 1 {
            return Err("Invalid Bool size");
        }
        Ok(bytes[0] != 0)
    }

    /// Read String value from bytes
    pub fn read_string(bytes: &[u8]) -> Result<String, &'static str> {
        String::from_utf8(bytes.to_vec()).map_err(|_| "Invalid UTF-8 in string")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_properties() {
        let mut encoder = PropsBinaryFormat::new();
        encoder.init_header(4);
        encoder.write_float32("frequency", 440.0);
        encoder.write_float64("gain", 0.75);
        encoder.write_int32("octave", -2);
        encoder.write_bool("enabled", true);

        let buffer = encoder.finalize();
        let mut decoder = PropsBinaryDecoder::new(buffer).unwrap();

        assert_eq!(decoder.property_count(), 4);

        let (name, prop_type, value) = decoder.read_property().unwrap();
        assert_eq!(name, "frequency");
        assert_eq!(prop_type, PropType::Float32);
        assert_eq!(PropsBinaryDecoder::read_float32(&value).unwrap(), 440.0);

        let (name, prop_type, value) = decoder.read_property().unwrap();
        assert_eq!(name, "gain");
        assert_eq!(prop_type, PropType::Float64);
        assert_eq!(PropsBinaryDecoder::read_float64(&value).unwrap(), 0.75);

        let (name, prop_type, value) = decoder.read_property().unwrap();
        assert_eq!(name, "octave");
        assert_eq!(prop_type, PropType::Int32);
        assert_eq!(PropsBinaryDecoder::read_int32(&value).unwrap(), -2);

        let (name, prop_type, value) = decoder.read_property().unwrap();
        assert_eq!(name, "enabled");
        assert_eq!(prop_type, PropType::Bool);
        assert_eq!(PropsBinaryDecoder::read_bool(&value).unwrap(), true);
    }

    #[test]
    fn test_string_property() {
        let mut encoder = PropsBinaryFormat::new();
        encoder.init_header(1);
        encoder.write_string("label", "Oscillator");

        let buffer = encoder.finalize();
        let mut decoder = PropsBinaryDecoder::new(buffer).unwrap();

        let (name, prop_type, value) = decoder.read_property().unwrap();
        assert_eq!(name, "label");
        assert_eq!(prop_type, PropType::String);
        assert_eq!(PropsBinaryDecoder::read_string(&value).unwrap(), "Oscillator");
    }
}