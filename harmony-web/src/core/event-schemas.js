/**
 * @fileoverview Event schema definitions for all component-BC interactions
 * @see harmony-design/DESIGN_SYSTEM.md#event-schemas
 */

import { registerEventSchema } from './event-bus-validator.js';

/**
 * Register all event schemas for runtime validation
 * Called during application initialization
 */
export function registerAllEventSchemas() {
  // Playback control events
  registerEventSchema('playback.play', {
    description: 'Start audio playback',
    payload: {
      trackId: {
        type: 'string',
        required: false,
        validate: (v) => v.length > 0 || 'trackId must not be empty'
      },
      startTime: {
        type: 'number',
        required: false,
        validate: (v) => v >= 0 || 'startTime must be non-negative'
      }
    }
  });

  registerEventSchema('playback.pause', {
    description: 'Pause audio playback',
    payload: {}
  });

  registerEventSchema('playback.stop', {
    description: 'Stop audio playback',
    payload: {}
  });

  registerEventSchema('playback.seek', {
    description: 'Seek to position in track',
    payload: {
      position: {
        type: 'number',
        required: true,
        validate: (v) => v >= 0 || 'position must be non-negative'
      }
    }
  });

  // Volume control events
  registerEventSchema('audio.volumeChange', {
    description: 'Change audio volume',
    payload: {
      volume: {
        type: 'number',
        required: true,
        validate: (v) => v >= 0 && v <= 1 || 'volume must be between 0 and 1'
      }
    }
  });

  registerEventSchema('audio.mute', {
    description: 'Mute audio',
    payload: {
      muted: {
        type: 'boolean',
        required: true
      }
    }
  });

  // Track selection events
  registerEventSchema('track.select', {
    description: 'Select a track',
    payload: {
      trackId: {
        type: 'string',
        required: true,
        validate: (v) => v.length > 0 || 'trackId must not be empty'
      }
    }
  });

  registerEventSchema('track.load', {
    description: 'Load a track',
    payload: {
      trackId: {
        type: 'string',
        required: true
      },
      url: {
        type: 'string',
        required: true,
        validate: (v) => v.startsWith('http') || v.startsWith('/') || 'url must be valid'
      }
    }
  });

  // Graph manipulation events
  registerEventSchema('graph.nodeAdd', {
    description: 'Add node to audio graph',
    payload: {
      nodeType: {
        type: 'string',
        required: true
      },
      nodeId: {
        type: 'string',
        required: false
      },
      parameters: {
        type: 'object',
        required: false
      }
    }
  });

  registerEventSchema('graph.nodeRemove', {
    description: 'Remove node from audio graph',
    payload: {
      nodeId: {
        type: 'string',
        required: true
      }
    }
  });

  registerEventSchema('graph.nodeConnect', {
    description: 'Connect two nodes in audio graph',
    payload: {
      sourceId: {
        type: 'string',
        required: true
      },
      targetId: {
        type: 'string',
        required: true
      }
    }
  });

  registerEventSchema('graph.nodeDisconnect', {
    description: 'Disconnect two nodes in audio graph',
    payload: {
      sourceId: {
        type: 'string',
        required: true
      },
      targetId: {
        type: 'string',
        required: true
      }
    }
  });

  registerEventSchema('graph.parameterChange', {
    description: 'Change node parameter',
    payload: {
      nodeId: {
        type: 'string',
        required: true
      },
      parameter: {
        type: 'string',
        required: true
      },
      value: {
        type: 'any',
        required: true
      }
    }
  });

  // State change events (from BCs to UI)
  registerEventSchema('playback.stateChanged', {
    description: 'Playback state changed',
    requiresSource: false,
    payload: {
      state: {
        type: 'string',
        required: true,
        validate: (v) => ['playing', 'paused', 'stopped', 'loading'].includes(v) || 
                        'state must be playing, paused, stopped, or loading'
      },
      trackId: {
        type: 'string',
        required: false
      },
      position: {
        type: 'number',
        required: false
      }
    }
  });

  registerEventSchema('playback.error', {
    description: 'Playback error occurred',
    requiresSource: false,
    payload: {
      error: {
        type: 'string',
        required: true
      },
      code: {
        type: 'string',
        required: false
      }
    }
  });

  registerEventSchema('audio.levelUpdate', {
    description: 'Audio level meter update',
    requiresSource: false,
    payload: {
      level: {
        type: 'number',
        required: true,
        validate: (v) => v >= 0 && v <= 1 || 'level must be between 0 and 1'
      },
      peak: {
        type: 'number',
        required: false,
        validate: (v) => v >= 0 && v <= 1 || 'peak must be between 0 and 1'
      }
    }
  });

  registerEventSchema('graph.stateChanged', {
    description: 'Audio graph state changed',
    requiresSource: false,
    payload: {
      nodes: {
        type: 'array',
        required: true
      },
      connections: {
        type: 'array',
        required: true
      }
    }
  });

  console.log('[EventSchemas] All event schemas registered');
}