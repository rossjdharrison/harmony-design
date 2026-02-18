/**
 * @fileoverview Event type constants for Harmony Design System
 * Centralized registry of all event types used in the system.
 * See DESIGN_SYSTEM.md § Event Architecture for event patterns.
 */

/**
 * UI Component Events
 * Published by primitive and molecule components
 */
export const UI_EVENTS = {
  // Button events
  BUTTON_CLICKED: 'harmony.ui.button.clicked',
  BUTTON_PRESSED: 'harmony.ui.button.pressed',
  BUTTON_RELEASED: 'harmony.ui.button.released',
  
  // Toggle events
  TOGGLE_CHANGED: 'harmony.ui.toggle.changed',
  TOGGLE_ENABLED: 'harmony.ui.toggle.enabled',
  TOGGLE_DISABLED: 'harmony.ui.toggle.disabled',
  
  // Input events
  INPUT_CHANGED: 'harmony.ui.input.changed',
  INPUT_FOCUSED: 'harmony.ui.input.focused',
  INPUT_BLURRED: 'harmony.ui.input.blurred',
  
  // Selection events
  SELECTION_CHANGED: 'harmony.ui.selection.changed'
};

/**
 * Audio Context Commands
 * Commands sent to audio bounded context
 */
export const AUDIO_COMMANDS = {
  PLAY: 'harmony.audio.play',
  PAUSE: 'harmony.audio.pause',
  STOP: 'harmony.audio.stop',
  SEEK: 'harmony.audio.seek',
  SET_VOLUME: 'harmony.audio.setVolume',
  LOAD_TRACK: 'harmony.audio.loadTrack'
};

/**
 * Audio Context Events
 * Events published by audio bounded context
 */
export const AUDIO_EVENTS = {
  PLAYBACK_STARTED: 'harmony.audio.playbackStarted',
  PLAYBACK_PAUSED: 'harmony.audio.playbackPaused',
  PLAYBACK_STOPPED: 'harmony.audio.playbackStopped',
  PLAYBACK_ENDED: 'harmony.audio.playbackEnded',
  POSITION_CHANGED: 'harmony.audio.positionChanged',
  VOLUME_CHANGED: 'harmony.audio.volumeChanged',
  TRACK_LOADED: 'harmony.audio.trackLoaded',
  ERROR: 'harmony.audio.error'
};

/**
 * Graph Context Commands
 * Commands sent to graph bounded context
 */
export const GRAPH_COMMANDS = {
  ADD_NODE: 'harmony.graph.addNode',
  REMOVE_NODE: 'harmony.graph.removeNode',
  CONNECT_NODES: 'harmony.graph.connectNodes',
  DISCONNECT_NODES: 'harmony.graph.disconnectNodes',
  UPDATE_NODE: 'harmony.graph.updateNode'
};

/**
 * Graph Context Events
 * Events published by graph bounded context
 */
export const GRAPH_EVENTS = {
  NODE_ADDED: 'harmony.graph.nodeAdded',
  NODE_REMOVED: 'harmony.graph.nodeRemoved',
  NODES_CONNECTED: 'harmony.graph.nodesConnected',
  NODES_DISCONNECTED: 'harmony.graph.nodesDisconnected',
  NODE_UPDATED: 'harmony.graph.nodeUpdated',
  GRAPH_CHANGED: 'harmony.graph.graphChanged'
};

/**
 * Application Events
 * System-level events
 */
export const APP_EVENTS = {
  INITIALIZED: 'harmony.app.initialized',
  ERROR: 'harmony.app.error',
  THEME_CHANGED: 'harmony.app.themeChanged'
};