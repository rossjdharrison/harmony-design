//! WASM Node Registry
//!
//! Registry of node types compiled to WebAssembly for high-performance
//! graph execution.

pub mod node_binary_format;
pub mod props_binary_format;

use wasm_bindgen::prelude::*;
use props_binary_format::{PropsBinaryFormat, PropsBinaryDecoder, PropType};

/// Export PropsBinaryFormat encoder to JavaScript
#[wasm_bindgen]
pub struct PropsBinaryEncoder {
    inner: PropsBinaryFormat,
}

#[wasm_bindgen]
impl PropsBinaryEncoder {
    /// Create a new encoder
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: PropsBinaryFormat::new(),
        }
    }

    /// Initialize header with property count
    #[wasm_bindgen(js_name = initHeader)]
    pub fn init_header(&mut self, property_count: u32) {
        self.inner.init_header(property_count);
    }

    /// Write a Float32 property
    #[wasm_bindgen(js_name = writeFloat32)]
    pub fn write_float32(&mut self, name: &str, value: f32) {
        self.inner.write_float32(name, value);
    }

    /// Write a Float64 property
    #[wasm_bindgen(js_name = writeFloat64)]
    pub fn write_float64(&mut self, name: &str, value: f64) {
        self.inner.write_float64(name, value);
    }

    /// Write an Int32 property
    #[wasm_bindgen(js_name = writeInt32)]
    pub fn write_int32(&mut self, name: &str, value: i32) {
        self.inner.write_int32(name, value);
    }

    /// Write a Uint32 property
    #[wasm_bindgen(js_name = writeUint32)]
    pub fn write_uint32(&mut self, name: &str, value: u32) {
        self.inner.write_uint32(name, value);
    }

    /// Write a Bool property
    #[wasm_bindgen(js_name = writeBool)]
    pub fn write_bool(&mut self, name: &str, value: bool) {
        self.inner.write_bool(name, value);
    }

    /// Write a String property
    #[wasm_bindgen(js_name = writeString)]
    pub fn write_string(&mut self, name: &str, value: &str) {
        self.inner.write_string(name, value);
    }

    /// Get buffer pointer
    #[wasm_bindgen(js_name = getPtr)]
    pub fn get_ptr(&self) -> *const u8 {
        self.inner.as_ptr()
    }

    /// Get buffer length
    #[wasm_bindgen(js_name = getLength)]
    pub fn get_length(&self) -> usize {
        self.inner.len()
    }

    /// Finalize and get buffer as Uint8Array
    #[wasm_bindgen(js_name = finalize)]
    pub fn finalize(self) -> Vec<u8> {
        self.inner.finalize()
    }
}

/// Export PropsBinaryDecoder to JavaScript
#[wasm_bindgen]
pub struct PropsDecoder {
    inner: PropsBinaryDecoder,
}

#[wasm_bindgen]
impl PropsDecoder {
    /// Create a new decoder from buffer
    #[wasm_bindgen(constructor)]
    pub fn new(buffer: Vec<u8>) -> Result<PropsDecoder, JsValue> {
        PropsBinaryDecoder::new(buffer)
            .map(|inner| PropsDecoder { inner })
            .map_err(|e| JsValue::from_str(e))
    }

    /// Get property count
    #[wasm_bindgen(js_name = propertyCount)]
    pub fn property_count(&self) -> u32 {
        self.inner.property_count()
    }

    /// Read next property (returns JSON string)
    #[wasm_bindgen(js_name = readProperty)]
    pub fn read_property(&mut self) -> Result<JsValue, JsValue> {
        self.inner
            .read_property()
            .map(|(name, prop_type, value)| {
                let type_str = match prop_type {
                    PropType::Float32 => "float32",
                    PropType::Float64 => "float64",
                    PropType::Int32 => "int32",
                    PropType::Uint32 => "uint32",
                    PropType::Int16 => "int16",
                    PropType::Uint16 => "uint16",
                    PropType::Int8 => "int8",
                    PropType::Uint8 => "uint8",
                    PropType::Bool => "bool",
                    PropType::String => "string",
                    PropType::Array => "array",
                };
                
                let js_obj = js_sys::Object::new();
                js_sys::Reflect::set(&js_obj, &"name".into(), &name.into()).unwrap();
                js_sys::Reflect::set(&js_obj, &"type".into(), &type_str.into()).unwrap();
                
                let value_array = js_sys::Uint8Array::from(&value[..]);
                js_sys::Reflect::set(&js_obj, &"value".into(), &value_array.into()).unwrap();
                
                js_obj.into()
            })
            .map_err(|e| JsValue::from_str(e))
    }
}