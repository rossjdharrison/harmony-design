//! WASMEdgeExecutor: Edge traversal logic optimized for WASM execution
//! 
//! This module provides efficient edge traversal algorithms for graph processing
//! in WebAssembly, with focus on cache-friendly memory access patterns and
//! minimal allocations during traversal.
//!
//! Performance targets:
//! - Edge traversal: <1ms per 1000 edges
//! - Memory overhead: <10KB per 1000 edges
//! - Cache miss rate: <5%

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

/// Edge representation optimized for cache locality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    /// Source node ID
    pub source: u32,
    /// Target node ID
    pub target: u32,
    /// Edge weight (for weighted traversal)
    pub weight: f32,
    /// Edge type identifier
    pub edge_type: u32,
    /// Edge metadata (JSON string)
    pub metadata: Option<String>,
}

/// Traversal direction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TraversalDirection {
    Forward,
    Backward,
    Bidirectional,
}

/// Traversal strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TraversalStrategy {
    /// Depth-first search
    DFS,
    /// Breadth-first search
    BFS,
    /// Weighted shortest path
    Dijkstra,
}

/// Edge filter function type
pub type EdgeFilter = Box<dyn Fn(&Edge) -> bool>;

/// Traversal result containing visited edges and nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraversalResult {
    /// Visited edges in traversal order
    pub edges: Vec<Edge>,
    /// Visited node IDs in traversal order
    pub nodes: Vec<u32>,
    /// Total traversal time in microseconds
    pub duration_us: u64,
    /// Number of edges examined
    pub edges_examined: usize,
}

/// Adjacency list representation for efficient edge lookup
#[derive(Debug, Clone)]
pub struct AdjacencyList {
    /// Forward edges: node_id -> Vec<Edge>
    forward: HashMap<u32, Vec<Edge>>,
    /// Backward edges: node_id -> Vec<Edge>
    backward: HashMap<u32, Vec<Edge>>,
    /// Total edge count
    edge_count: usize,
}

impl AdjacencyList {
    /// Create new empty adjacency list
    pub fn new() -> Self {
        Self {
            forward: HashMap::new(),
            backward: HashMap::new(),
            edge_count: 0,
        }
    }

    /// Add edge to adjacency list
    pub fn add_edge(&mut self, edge: Edge) {
        self.forward
            .entry(edge.source)
            .or_insert_with(Vec::new)
            .push(edge.clone());
        
        self.backward
            .entry(edge.target)
            .or_insert_with(Vec::new)
            .push(edge);
        
        self.edge_count += 1;
    }

    /// Get outgoing edges from node
    pub fn get_outgoing(&self, node_id: u32) -> Option<&Vec<Edge>> {
        self.forward.get(&node_id)
    }

    /// Get incoming edges to node
    pub fn get_incoming(&self, node_id: u32) -> Option<&Vec<Edge>> {
        self.backward.get(&node_id)
    }

    /// Get total edge count
    pub fn edge_count(&self) -> usize {
        self.edge_count
    }
}

/// WASMEdgeExecutor - optimized edge traversal engine
#[wasm_bindgen]
pub struct WASMEdgeExecutor {
    adjacency_list: AdjacencyList,
    perf_window: web_sys::Performance,
}

#[wasm_bindgen]
impl WASMEdgeExecutor {
    /// Create new edge executor
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<WASMEdgeExecutor, JsValue> {
        let window = web_sys::window()
            .ok_or_else(|| JsValue::from_str("No window object"))?;
        let perf_window = window.performance()
            .ok_or_else(|| JsValue::from_str("No performance object"))?;

        Ok(Self {
            adjacency_list: AdjacencyList::new(),
            perf_window,
        })
    }

    /// Add edge to the graph
    #[wasm_bindgen(js_name = addEdge)]
    pub fn add_edge(&mut self, edge_json: &str) -> Result<(), JsValue> {
        let edge: Edge = serde_json::from_str(edge_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse edge: {}", e)))?;
        
        self.adjacency_list.add_edge(edge);
        Ok(())
    }

    /// Add multiple edges in batch (more efficient)
    #[wasm_bindgen(js_name = addEdgesBatch)]
    pub fn add_edges_batch(&mut self, edges_json: &str) -> Result<(), JsValue> {
        let edges: Vec<Edge> = serde_json::from_str(edges_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse edges: {}", e)))?;
        
        for edge in edges {
            self.adjacency_list.add_edge(edge);
        }
        
        Ok(())
    }

    /// Get edge count
    #[wasm_bindgen(js_name = getEdgeCount)]
    pub fn get_edge_count(&self) -> usize {
        self.adjacency_list.edge_count()
    }

    /// Traverse edges from starting node using BFS
    #[wasm_bindgen(js_name = traverseBFS)]
    pub fn traverse_bfs(
        &self,
        start_node: u32,
        direction: &str,
        max_depth: Option<u32>,
    ) -> Result<String, JsValue> {
        let start_time = self.perf_window.now();
        
        let dir = match direction {
            "forward" => TraversalDirection::Forward,
            "backward" => TraversalDirection::Backward,
            "bidirectional" => TraversalDirection::Bidirectional,
            _ => return Err(JsValue::from_str("Invalid direction")),
        };

        let result = self.bfs_traverse(start_node, dir, max_depth);
        
        let end_time = self.perf_window.now();
        let duration_us = ((end_time - start_time) * 1000.0) as u64;

        let mut result_with_time = result;
        result_with_time.duration_us = duration_us;

        serde_json::to_string(&result_with_time)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
    }

    /// Traverse edges from starting node using DFS
    #[wasm_bindgen(js_name = traverseDFS)]
    pub fn traverse_dfs(
        &self,
        start_node: u32,
        direction: &str,
        max_depth: Option<u32>,
    ) -> Result<String, JsValue> {
        let start_time = self.perf_window.now();
        
        let dir = match direction {
            "forward" => TraversalDirection::Forward,
            "backward" => TraversalDirection::Backward,
            "bidirectional" => TraversalDirection::Bidirectional,
            _ => return Err(JsValue::from_str("Invalid direction")),
        };

        let result = self.dfs_traverse(start_node, dir, max_depth);
        
        let end_time = self.perf_window.now();
        let duration_us = ((end_time - start_time) * 1000.0) as u64;

        let mut result_with_time = result;
        result_with_time.duration_us = duration_us;

        serde_json::to_string(&result_with_time)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
    }

    /// Get all edges connected to a node
    #[wasm_bindgen(js_name = getNodeEdges)]
    pub fn get_node_edges(&self, node_id: u32, direction: &str) -> Result<String, JsValue> {
        let edges = match direction {
            "outgoing" => self.adjacency_list.get_outgoing(node_id),
            "incoming" => self.adjacency_list.get_incoming(node_id),
            _ => return Err(JsValue::from_str("Invalid direction")),
        };

        let edges_vec = edges.map(|e| e.clone()).unwrap_or_default();
        
        serde_json::to_string(&edges_vec)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize edges: {}", e)))
    }

    /// Clear all edges
    #[wasm_bindgen(js_name = clear)]
    pub fn clear(&mut self) {
        self.adjacency_list = AdjacencyList::new();
    }
}

impl WASMEdgeExecutor {
    /// Internal BFS traversal implementation
    fn bfs_traverse(
        &self,
        start_node: u32,
        direction: TraversalDirection,
        max_depth: Option<u32>,
    ) -> TraversalResult {
        let mut visited_nodes = HashMap::new();
        let mut visited_edges = Vec::new();
        let mut node_order = Vec::new();
        let mut queue = VecDeque::new();
        let mut edges_examined = 0;

        queue.push_back((start_node, 0u32));
        visited_nodes.insert(start_node, 0);
        node_order.push(start_node);

        while let Some((current_node, depth)) = queue.pop_front() {
            if let Some(max_d) = max_depth {
                if depth >= max_d {
                    continue;
                }
            }

            let edges_to_check = match direction {
                TraversalDirection::Forward => {
                    self.adjacency_list.get_outgoing(current_node)
                }
                TraversalDirection::Backward => {
                    self.adjacency_list.get_incoming(current_node)
                }
                TraversalDirection::Bidirectional => {
                    // Check both directions
                    let mut edges = Vec::new();
                    if let Some(out) = self.adjacency_list.get_outgoing(current_node) {
                        edges.extend(out.iter().cloned());
                    }
                    if let Some(inc) = self.adjacency_list.get_incoming(current_node) {
                        edges.extend(inc.iter().cloned());
                    }
                    Some(&edges).map(|_| &edges)
                }
            };

            if let Some(edges) = edges_to_check {
                for edge in edges {
                    edges_examined += 1;
                    
                    let next_node = match direction {
                        TraversalDirection::Forward => edge.target,
                        TraversalDirection::Backward => edge.source,
                        TraversalDirection::Bidirectional => {
                            if edge.source == current_node {
                                edge.target
                            } else {
                                edge.source
                            }
                        }
                    };

                    if !visited_nodes.contains_key(&next_node) {
                        visited_nodes.insert(next_node, depth + 1);
                        node_order.push(next_node);
                        queue.push_back((next_node, depth + 1));
                        visited_edges.push(edge.clone());
                    }
                }
            }
        }

        TraversalResult {
            edges: visited_edges,
            nodes: node_order,
            duration_us: 0, // Set by caller
            edges_examined,
        }
    }

    /// Internal DFS traversal implementation
    fn dfs_traverse(
        &self,
        start_node: u32,
        direction: TraversalDirection,
        max_depth: Option<u32>,
    ) -> TraversalResult {
        let mut visited_nodes = HashMap::new();
        let mut visited_edges = Vec::new();
        let mut node_order = Vec::new();
        let mut stack = Vec::new();
        let mut edges_examined = 0;

        stack.push((start_node, 0u32));

        while let Some((current_node, depth)) = stack.pop() {
            if visited_nodes.contains_key(&current_node) {
                continue;
            }

            if let Some(max_d) = max_depth {
                if depth >= max_d {
                    continue;
                }
            }

            visited_nodes.insert(current_node, depth);
            node_order.push(current_node);

            let edges_to_check = match direction {
                TraversalDirection::Forward => {
                    self.adjacency_list.get_outgoing(current_node)
                }
                TraversalDirection::Backward => {
                    self.adjacency_list.get_incoming(current_node)
                }
                TraversalDirection::Bidirectional => {
                    let mut edges = Vec::new();
                    if let Some(out) = self.adjacency_list.get_outgoing(current_node) {
                        edges.extend(out.iter().cloned());
                    }
                    if let Some(inc) = self.adjacency_list.get_incoming(current_node) {
                        edges.extend(inc.iter().cloned());
                    }
                    Some(&edges).map(|_| &edges)
                }
            };

            if let Some(edges) = edges_to_check {
                for edge in edges.iter().rev() {
                    edges_examined += 1;
                    
                    let next_node = match direction {
                        TraversalDirection::Forward => edge.target,
                        TraversalDirection::Backward => edge.source,
                        TraversalDirection::Bidirectional => {
                            if edge.source == current_node {
                                edge.target
                            } else {
                                edge.source
                            }
                        }
                    };

                    if !visited_nodes.contains_key(&next_node) {
                        stack.push((next_node, depth + 1));
                        visited_edges.push(edge.clone());
                    }
                }
            }
        }

        TraversalResult {
            edges: visited_edges,
            nodes: node_order,
            duration_us: 0, // Set by caller
            edges_examined,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adjacency_list_add_edge() {
        let mut adj_list = AdjacencyList::new();
        let edge = Edge {
            source: 1,
            target: 2,
            weight: 1.0,
            edge_type: 0,
            metadata: None,
        };

        adj_list.add_edge(edge);
        assert_eq!(adj_list.edge_count(), 1);
        assert!(adj_list.get_outgoing(1).is_some());
        assert!(adj_list.get_incoming(2).is_some());
    }

    #[test]
    fn test_bfs_traversal() {
        let mut adj_list = AdjacencyList::new();
        
        // Create a simple graph: 1 -> 2 -> 3
        adj_list.add_edge(Edge {
            source: 1,
            target: 2,
            weight: 1.0,
            edge_type: 0,
            metadata: None,
        });
        adj_list.add_edge(Edge {
            source: 2,
            target: 3,
            weight: 1.0,
            edge_type: 0,
            metadata: None,
        });

        // BFS should visit nodes in order: 1, 2, 3
        let executor = WASMEdgeExecutor {
            adjacency_list: adj_list,
            perf_window: web_sys::window().unwrap().performance().unwrap(),
        };

        let result = executor.bfs_traverse(1, TraversalDirection::Forward, None);
        assert_eq!(result.nodes.len(), 3);
        assert_eq!(result.nodes[0], 1);
        assert_eq!(result.edges.len(), 2);
    }
}