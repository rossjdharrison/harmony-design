/**
 * @fileoverview Cross-Graph Index Usage Example
 * @see DESIGN_SYSTEM.md § Graph Engine → Cross-Graph Edges
 * 
 * Demonstrates how to use CrossGraphIndex to manage relationships
 * between Domain, Intent, and Component graphs.
 */

import { CrossGraphIndex } from '../cross-graph-index.js';

/**
 * Example: Building a feature with cross-graph relationships.
 */
export function demonstrateCrossGraphIndex() {
  console.group('Cross-Graph Index Example');
  
  const index = new CrossGraphIndex();
  
  // Scenario: Audio playback feature
  // Domain: "Audio Playback" capability
  // Intent: "Play Audio File" user intention
  // Component: "PlayButton" UI component
  
  // Domain → Intent: Domain capability implements user intent
  index.addEdge({
    id: 'domain-intent-1',
    sourceGraph: 'domain',
    sourceNode: 'audio-playback',
    targetGraph: 'intent',
    targetNode: 'play-audio-file',
    edgeType: 'implements',
    metadata: {
      description: 'Audio playback domain implements play intent',
      priority: 'high'
    }
  });
  
  // Intent → Component: Intent requires UI component
  index.addEdge({
    id: 'intent-comp-1',
    sourceGraph: 'intent',
    sourceNode: 'play-audio-file',
    targetGraph: 'component',
    targetNode: 'play-button',
    edgeType: 'requires',
    metadata: {
      description: 'Play intent requires play button component'
    }
  });
  
  // Domain → Component: Direct domain-to-component mapping
  index.addEdge({
    id: 'domain-comp-1',
    sourceGraph: 'domain',
    sourceNode: 'audio-playback',
    targetGraph: 'component',
    targetNode: 'waveform-display',
    edgeType: 'contains',
    metadata: {
      description: 'Audio playback contains waveform visualization'
    }
  });
  
  console.log('\n--- Query Examples ---\n');
  
  // Find all intents implemented by audio playback domain
  const implementedIntents = index.query({
    sourceGraph: 'domain',
    sourceNode: 'audio-playback',
    targetGraph: 'intent',
    edgeType: 'implements'
  });
  console.log('Intents implemented by audio-playback domain:', implementedIntents);
  
  // Find all components required by play intent
  const requiredComponents = index.query({
    sourceGraph: 'intent',
    sourceNode: 'play-audio-file',
    targetGraph: 'component',
    edgeType: 'requires'
  });
  console.log('Components required by play-audio-file intent:', requiredComponents);
  
  // Find all outgoing edges from audio playback domain
  const outgoing = index.getOutgoingEdges('domain', 'audio-playback');
  console.log('All edges from audio-playback domain:', outgoing);
  
  // Find all incoming edges to play button component
  const incoming = index.getIncomingEdges('component', 'play-button');
  console.log('All edges to play-button component:', incoming);
  
  console.log('\n--- Index Statistics ---\n');
  console.log(index.getStats());
  
  console.log('\n--- Serialization ---\n');
  const serialized = index.toJSON();
  console.log('Serialized index:', JSON.stringify(serialized, null, 2));
  
  console.groupEnd();
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateCrossGraphIndex();
}