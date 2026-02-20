use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexConfig {
    pub index_id: String,
    pub property_name: String,
    #[serde(default = "default_tokenizer")]
    pub tokenizer: String,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default = "default_min_token_length")]
    pub min_token_length: usize,
    #[serde(default = "default_max_results")]
    pub max_results: usize,
}

fn default_tokenizer() -> String {
    "alphanumeric".to_string()
}

fn default_min_token_length() -> usize {
    2
}

fn default_max_results() -> usize {
    100
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub node_id: String,
    pub score: f64,
    pub matches: Vec<String>,
}

#[derive(Debug, Clone)]
struct InvertedIndex {
    token_to_nodes: HashMap<String, Vec<String>>,
    node_to_tokens: HashMap<String, Vec<String>>,
    node_to_content: HashMap<String, String>,
}

impl InvertedIndex {
    fn new() -> Self {
        Self {
            token_to_nodes: HashMap::new(),
            node_to_tokens: HashMap::new(),
            node_to_content: HashMap::new(),
        }
    }

    fn add_document(&mut self, node_id: String, tokens: Vec<String>, content: String) {
        // Remove existing document if present
        self.remove_document(&node_id);

        // Store content
        self.node_to_content.insert(node_id.clone(), content);

        // Store tokens for this node
        self.node_to_tokens.insert(node_id.clone(), tokens.clone());

        // Update inverted index
        for token in tokens {
            self.token_to_nodes
                .entry(token)
                .or_insert_with(Vec::new)
                .push(node_id.clone());
        }
    }

    fn remove_document(&mut self, node_id: &str) {
        if let Some(tokens) = self.node_to_tokens.remove(node_id) {
            for token in tokens {
                if let Some(nodes) = self.token_to_nodes.get_mut(&token) {
                    nodes.retain(|id| id != node_id);
                    if nodes.is_empty() {
                        self.token_to_nodes.remove(&token);
                    }
                }
            }
        }
        self.node_to_content.remove(node_id);
    }

    fn search(&self, query_tokens: &[String], max_results: usize) -> Vec<SearchResult> {
        let mut node_scores: HashMap<String, (f64, Vec<String>)> = HashMap::new();

        // Calculate TF-IDF-like scores
        let total_docs = self.node_to_content.len() as f64;

        for query_token in query_tokens {
            if let Some(matching_nodes) = self.token_to_nodes.get(query_token) {
                let idf = (total_docs / matching_nodes.len() as f64).ln();

                for node_id in matching_nodes {
                    let entry = node_scores.entry(node_id.clone()).or_insert((0.0, Vec::new()));
                    
                    // Calculate term frequency
                    let node_tokens = self.node_to_tokens.get(node_id).unwrap();
                    let tf = node_tokens.iter().filter(|t| *t == query_token).count() as f64;
                    
                    entry.0 += tf * idf;
                    entry.1.push(query_token.clone());
                }
            }
        }

        // Convert to results and sort by score
        let mut results: Vec<SearchResult> = node_scores
            .into_iter()
            .map(|(node_id, (score, matches))| SearchResult {
                node_id,
                score,
                matches,
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        results.truncate(max_results);

        results
    }

    fn clear(&mut self) {
        self.token_to_nodes.clear();
        self.node_to_tokens.clear();
        self.node_to_content.clear();
    }
}

// Global state for indices
static mut INDICES: Option<HashMap<String, (IndexConfig, InvertedIndex)>> = None;

fn get_indices() -> &'static mut HashMap<String, (IndexConfig, InvertedIndex)> {
    unsafe {
        if INDICES.is_none() {
            INDICES = Some(HashMap::new());
        }
        INDICES.as_mut().unwrap()
    }
}

fn tokenize(text: &str, config: &IndexConfig) -> Vec<String> {
    let normalized = if config.case_sensitive {
        text.to_string()
    } else {
        text.to_lowercase()
    };

    let tokens: Vec<String> = match config.tokenizer.as_str() {
        "whitespace" => normalized
            .split_whitespace()
            .map(|s| s.to_string())
            .collect(),
        "alphanumeric" => {
            let mut tokens = Vec::new();
            let mut current = String::new();
            
            for ch in normalized.chars() {
                if ch.is_alphanumeric() {
                    current.push(ch);
                } else if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
            }
            
            if !current.is_empty() {
                tokens.push(current);
            }
            
            tokens
        }
        "ngram" => {
            let mut tokens = Vec::new();
            let chars: Vec<char> = normalized.chars().collect();
            let n = 3; // trigrams
            
            for i in 0..=chars.len().saturating_sub(n) {
                let ngram: String = chars[i..i + n].iter().collect();
                tokens.push(ngram);
            }
            
            tokens
        }
        _ => normalized
            .split_whitespace()
            .map(|s| s.to_string())
            .collect(),
    };

    // Filter by minimum length
    tokens
        .into_iter()
        .filter(|t| t.len() >= config.min_token_length)
        .collect()
}

#[wasm_bindgen]
pub fn create_index(config_json: String) -> String {
    let config: IndexConfig = match serde_json::from_str(&config_json) {
        Ok(c) => c,
        Err(e) => {
            return serde_json::json!({
                "success": false,
                "error": format!("Invalid config: {}", e)
            })
            .to_string();
        }
    };

    let indices = get_indices();
    let index = InvertedIndex::new();
    indices.insert(config.index_id.clone(), (config.clone(), index));

    serde_json::json!({
        "success": true,
        "indexId": config.index_id
    })
    .to_string()
}

#[wasm_bindgen]
pub fn add_document(index_id: String, node_id: String, content: String) -> String {
    let indices = get_indices();

    let (config, index) = match indices.get_mut(&index_id) {
        Some(entry) => entry,
        None => {
            return serde_json::json!({
                "success": false,
                "error": "Index not found"
            })
            .to_string();
        }
    };

    let tokens = tokenize(&content, config);
    index.add_document(node_id.clone(), tokens.clone(), content);

    serde_json::json!({
        "success": true,
        "nodeId": node_id,
        "tokenCount": tokens.len()
    })
    .to_string()
}

#[wasm_bindgen]
pub fn remove_document(index_id: String, node_id: String) -> String {
    let indices = get_indices();

    let (_config, index) = match indices.get_mut(&index_id) {
        Some(entry) => entry,
        None => {
            return serde_json::json!({
                "success": false,
                "error": "Index not found"
            })
            .to_string();
        }
    };

    index.remove_document(&node_id);

    serde_json::json!({
        "success": true,
        "nodeId": node_id
    })
    .to_string()
}

#[wasm_bindgen]
pub fn search(index_id: String, query: String) -> String {
    let indices = get_indices();

    let (config, index) = match indices.get(&index_id) {
        Some(entry) => entry,
        None => {
            return serde_json::json!({
                "success": false,
                "error": "Index not found"
            })
            .to_string();
        }
    };

    let query_tokens = tokenize(&query, config);
    let results = index.search(&query_tokens, config.max_results);

    serde_json::json!({
        "success": true,
        "results": results,
        "queryTokens": query_tokens
    })
    .to_string()
}

#[wasm_bindgen]
pub fn clear_index(index_id: String) -> String {
    let indices = get_indices();

    let (_config, index) = match indices.get_mut(&index_id) {
        Some(entry) => entry,
        None => {
            return serde_json::json!({
                "success": false,
                "error": "Index not found"
            })
            .to_string();
        }
    };

    index.clear();

    serde_json::json!({
        "success": true,
        "indexId": index_id
    })
    .to_string()
}