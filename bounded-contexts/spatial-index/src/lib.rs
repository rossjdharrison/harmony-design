use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Point in 2D space with coordinates
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

/// Bounding box for spatial queries
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BoundingBox {
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

impl BoundingBox {
    /// Check if a point is contained within this bounding box
    pub fn contains(&self, point: &Point) -> bool {
        point.x >= self.min_x
            && point.x <= self.max_x
            && point.y >= self.min_y
            && point.y <= self.max_y
    }

    /// Check if this bounding box intersects with another
    pub fn intersects(&self, other: &BoundingBox) -> bool {
        !(self.max_x < other.min_x
            || self.min_x > other.max_x
            || self.max_y < other.min_y
            || self.min_y > other.max_y)
    }
}

/// Node with spatial coordinates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialNode {
    pub id: String,
    pub position: Point,
    pub metadata: HashMap<String, String>,
}

/// Quadtree node for spatial partitioning
#[derive(Debug)]
struct QuadTreeNode {
    bounds: BoundingBox,
    capacity: usize,
    nodes: Vec<SpatialNode>,
    divided: bool,
    northeast: Option<Box<QuadTreeNode>>,
    northwest: Option<Box<QuadTreeNode>>,
    southeast: Option<Box<QuadTreeNode>>,
    southwest: Option<Box<QuadTreeNode>>,
}

impl QuadTreeNode {
    fn new(bounds: BoundingBox, capacity: usize) -> Self {
        QuadTreeNode {
            bounds,
            capacity,
            nodes: Vec::new(),
            divided: false,
            northeast: None,
            northwest: None,
            southeast: None,
            southwest: None,
        }
    }

    fn subdivide(&mut self) {
        let x = self.bounds.min_x;
        let y = self.bounds.min_y;
        let w = (self.bounds.max_x - self.bounds.min_x) / 2.0;
        let h = (self.bounds.max_y - self.bounds.min_y) / 2.0;

        let ne = BoundingBox {
            min_x: x + w,
            min_y: y,
            max_x: x + 2.0 * w,
            max_y: y + h,
        };
        let nw = BoundingBox {
            min_x: x,
            min_y: y,
            max_x: x + w,
            max_y: y + h,
        };
        let se = BoundingBox {
            min_x: x + w,
            min_y: y + h,
            max_x: x + 2.0 * w,
            max_y: y + 2.0 * h,
        };
        let sw = BoundingBox {
            min_x: x,
            min_y: y + h,
            max_x: x + w,
            max_y: y + 2.0 * h,
        };

        self.northeast = Some(Box::new(QuadTreeNode::new(ne, self.capacity)));
        self.northwest = Some(Box::new(QuadTreeNode::new(nw, self.capacity)));
        self.southeast = Some(Box::new(QuadTreeNode::new(se, self.capacity)));
        self.southwest = Some(Box::new(QuadTreeNode::new(sw, self.capacity)));
        self.divided = true;
    }

    fn insert(&mut self, node: SpatialNode) -> bool {
        if !self.bounds.contains(&node.position) {
            return false;
        }

        if self.nodes.len() < self.capacity {
            self.nodes.push(node);
            return true;
        }

        if !self.divided {
            self.subdivide();
        }

        if let Some(ref mut ne) = self.northeast {
            if ne.insert(node.clone()) {
                return true;
            }
        }
        if let Some(ref mut nw) = self.northwest {
            if nw.insert(node.clone()) {
                return true;
            }
        }
        if let Some(ref mut se) = self.southeast {
            if se.insert(node.clone()) {
                return true;
            }
        }
        if let Some(ref mut sw) = self.southwest {
            if sw.insert(node) {
                return true;
            }
        }

        false
    }

    fn query(&self, range: &BoundingBox, found: &mut Vec<SpatialNode>) {
        if !self.bounds.intersects(range) {
            return;
        }

        for node in &self.nodes {
            if range.contains(&node.position) {
                found.push(node.clone());
            }
        }

        if self.divided {
            if let Some(ref ne) = self.northeast {
                ne.query(range, found);
            }
            if let Some(ref nw) = self.northwest {
                nw.query(range, found);
            }
            if let Some(ref se) = self.southeast {
                se.query(range, found);
            }
            if let Some(ref sw) = self.southwest {
                sw.query(range, found);
            }
        }
    }

    fn query_radius(&self, center: &Point, radius: f64, found: &mut Vec<SpatialNode>) {
        let range = BoundingBox {
            min_x: center.x - radius,
            min_y: center.y - radius,
            max_x: center.x + radius,
            max_y: center.y + radius,
        };

        if !self.bounds.intersects(&range) {
            return;
        }

        let radius_squared = radius * radius;
        for node in &self.nodes {
            let dx = node.position.x - center.x;
            let dy = node.position.y - center.y;
            let distance_squared = dx * dx + dy * dy;
            if distance_squared <= radius_squared {
                found.push(node.clone());
            }
        }

        if self.divided {
            if let Some(ref ne) = self.northeast {
                ne.query_radius(center, radius, found);
            }
            if let Some(ref nw) = self.northwest {
                nw.query_radius(center, radius, found);
            }
            if let Some(ref se) = self.southeast {
                se.query_radius(center, radius, found);
            }
            if let Some(ref sw) = self.southwest {
                sw.query_radius(center, radius, found);
            }
        }
    }
}

/// Spatial index using quadtree for efficient spatial queries
#[wasm_bindgen]
pub struct SpatialIndex {
    root: QuadTreeNode,
    node_lookup: HashMap<String, Point>,
}

#[wasm_bindgen]
impl SpatialIndex {
    /// Create a new spatial index with given bounds and capacity per node
    #[wasm_bindgen(constructor)]
    pub fn new(min_x: f64, min_y: f64, max_x: f64, max_y: f64, capacity: usize) -> Self {
        let bounds = BoundingBox {
            min_x,
            min_y,
            max_x,
            max_y,
        };
        SpatialIndex {
            root: QuadTreeNode::new(bounds, capacity),
            node_lookup: HashMap::new(),
        }
    }

    /// Insert a node with coordinates into the spatial index
    pub fn insert(&mut self, id: String, x: f64, y: f64, metadata_json: String) -> bool {
        let metadata: HashMap<String, String> = serde_json::from_str(&metadata_json).unwrap_or_default();
        let node = SpatialNode {
            id: id.clone(),
            position: Point { x, y },
            metadata,
        };

        let result = self.root.insert(node);
        if result {
            self.node_lookup.insert(id, Point { x, y });
        }
        result
    }

    /// Query nodes within a bounding box
    pub fn query_range(&self, min_x: f64, min_y: f64, max_x: f64, max_y: f64) -> String {
        let range = BoundingBox {
            min_x,
            min_y,
            max_x,
            max_y,
        };
        let mut found = Vec::new();
        self.root.query(&range, &mut found);
        serde_json::to_string(&found).unwrap_or_else(|_| "[]".to_string())
    }

    /// Query nodes within a radius from a center point
    pub fn query_radius(&self, center_x: f64, center_y: f64, radius: f64) -> String {
        let center = Point {
            x: center_x,
            y: center_y,
        };
        let mut found = Vec::new();
        self.root.query_radius(&center, radius, &mut found);
        serde_json::to_string(&found).unwrap_or_else(|_| "[]".to_string())
    }

    /// Find k-nearest neighbors to a point
    pub fn query_nearest(&self, x: f64, y: f64, k: usize) -> String {
        let point = Point { x, y };
        let mut all_nodes = Vec::new();
        
        // Query a large area to get candidates
        let search_radius = 1000.0; // Start with a large radius
        self.root.query_radius(&point, search_radius, &mut all_nodes);

        // Sort by distance
        all_nodes.sort_by(|a, b| {
            let dist_a = ((a.position.x - x).powi(2) + (a.position.y - y).powi(2)).sqrt();
            let dist_b = ((b.position.x - x).powi(2) + (b.position.y - y).powi(2)).sqrt();
            dist_a.partial_cmp(&dist_b).unwrap_or(std::cmp::Ordering::Equal)
        });

        // Take k nearest
        let nearest: Vec<SpatialNode> = all_nodes.into_iter().take(k).collect();
        serde_json::to_string(&nearest).unwrap_or_else(|_| "[]".to_string())
    }

    /// Get position of a node by ID
    pub fn get_position(&self, id: String) -> String {
        if let Some(pos) = self.node_lookup.get(&id) {
            serde_json::to_string(pos).unwrap_or_else(|_| "null".to_string())
        } else {
            "null".to_string()
        }
    }

    /// Get total number of indexed nodes
    pub fn size(&self) -> usize {
        self.node_lookup.len()
    }

    /// Clear all nodes from the index
    pub fn clear(&mut self) {
        let bounds = self.root.bounds;
        let capacity = self.root.capacity;
        self.root = QuadTreeNode::new(bounds, capacity);
        self.node_lookup.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bounding_box_contains() {
        let bbox = BoundingBox {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 100.0,
            max_y: 100.0,
        };
        assert!(bbox.contains(&Point { x: 50.0, y: 50.0 }));
        assert!(!bbox.contains(&Point { x: 150.0, y: 50.0 }));
    }

    #[test]
    fn test_spatial_index_insert_and_query() {
        let mut index = SpatialIndex::new(0.0, 0.0, 1000.0, 1000.0, 4);
        assert!(index.insert("node1".to_string(), 100.0, 100.0, "{}".to_string()));
        assert!(index.insert("node2".to_string(), 200.0, 200.0, "{}".to_string()));
        
        let result = index.query_range(50.0, 50.0, 150.0, 150.0);
        assert!(result.contains("node1"));
    }

    #[test]
    fn test_query_radius() {
        let mut index = SpatialIndex::new(0.0, 0.0, 1000.0, 1000.0, 4);
        index.insert("node1".to_string(), 100.0, 100.0, "{}".to_string());
        index.insert("node2".to_string(), 200.0, 200.0, "{}".to_string());
        
        let result = index.query_radius(100.0, 100.0, 50.0);
        assert!(result.contains("node1"));
        assert!(!result.contains("node2"));
    }
}