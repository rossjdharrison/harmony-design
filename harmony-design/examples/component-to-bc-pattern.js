/**
 * @fileoverview Example implementations showing correct EventBus patterns.
 * See: /harmony-design/docs/architecture/event-bus-pattern.md
 * 
 * This file demonstrates:
 * - How UI components publish events
 * - How Bounded Contexts subscribe and handle events
 * - Proper event flow and error handling
 * 
 * @module harmony-design/examples/component-to-bc-pattern
 */

// ============================================================================
// EXAMPLE 1: Play Button Component
// ============================================================================

/**
 * Example UI component that publishes playback events.
 * Never calls AudioPlaybackBC directly.
 * 
 * @class PlayButtonComponent
 * @extends HTMLElement
 */
class PlayButtonComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isPlaying = false;
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    
    // Subscribe to playback state changes
    this.unsubscribe = window.eventBus.subscribe(
      'audio.playback.state-changed',
      (event) => this.handleStateChange(event)
    );
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  attachEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    button.addEventListener('click', () => this.handleClick());
  }

  /**
   * Publishes event instead of calling BC directly.
   */
  handleClick() {
    const eventType = this.isPlaying ? 'audio.playback.pause' : 'audio.playback.play';
    
    window.eventBus.publish({
      type: eventType,
      source: 'PlayButtonComponent',
      payload: {
        trackId: this.getAttribute('track-id') || 'default'
      }
    });
  }

  /**
   * Updates UI based on BC result events.
   */
  handleStateChange(event) {
    this.isPlaying = event.payload.isPlaying;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        button {
          padding: 12px 24px;
          background: ${this.isPlaying ? '#ff4444' : '#4a9eff'};
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover {
          opacity: 0.9;
        }
      </style>
      <button>${this.isPlaying ? 'Pause' : 'Play'}</button>
    `;
    
    // Reattach listeners after render
    if (this.isConnected) {
      this.attachEventListeners();
    }
  }
}

customElements.define('play-button', PlayButtonComponent);

// ============================================================================
// EXAMPLE 2: Audio Playback Bounded Context
// ============================================================================

/**
 * Example Bounded Context that handles audio playback logic.
 * Subscribes to command events, publishes result events.
 * 
 * @class AudioPlaybackBC
 */
class AudioPlaybackBC {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isPlaying = false;
    this.currentTrackId = null;
    
    this.setupSubscriptions();
  }

  setupSubscriptions() {
    // Subscribe to play commands
    this.eventBus.subscribe('audio.playback.play', (event) => {
      this.handlePlay(event.payload);
    });

    // Subscribe to pause commands
    this.eventBus.subscribe('audio.playback.pause', (event) => {
      this.handlePause(event.payload);
    });
  }

  /**
   * Handles play command and publishes result.
   */
  handlePlay(payload) {
    try {
      // Business logic here
      this.currentTrackId = payload.trackId;
      this.isPlaying = true;
      
      // Simulate audio engine call
      console.log(`[AudioPlaybackBC] Playing track: ${payload.trackId}`);
      
      // Publish result event
      this.eventBus.publish({
        type: 'audio.playback.state-changed',
        source: 'AudioPlaybackBC',
        payload: {
          isPlaying: true,
          trackId: this.currentTrackId,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      // Publish error event
      this.eventBus.publish({
        type: 'audio.playback.error',
        source: 'AudioPlaybackBC',
        payload: {
          error: error.message,
          trackId: payload.trackId
        }
      });
    }
  }

  /**
   * Handles pause command and publishes result.
   */
  handlePause(payload) {
    try {
      this.isPlaying = false;
      
      console.log(`[AudioPlaybackBC] Pausing track: ${this.currentTrackId}`);
      
      this.eventBus.publish({
        type: 'audio.playback.state-changed',
        source: 'AudioPlaybackBC',
        payload: {
          isPlaying: false,
          trackId: this.currentTrackId,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      this.eventBus.publish({
        type: 'audio.playback.error',
        source: 'AudioPlaybackBC',
        payload: {
          error: error.message,
          trackId: payload.trackId
        }
      });
    }
  }
}

// Initialize BC when EventBus is ready
if (typeof window !== 'undefined' && window.eventBus) {
  window.audioPlaybackBC = new AudioPlaybackBC(window.eventBus);
}

// ============================================================================
// EXAMPLE 3: Component State Update Pattern
// ============================================================================

/**
 * Example component that updates state via EventBus.
 * Demonstrates the ProcessCommand pattern.
 * 
 * @class StateAwareComponent
 * @extends HTMLElement
 */
class StateAwareComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = { count: 0 };
  }

  connectedCallback() {
    this.render();
    
    // Subscribe to state update results
    window.eventBus.subscribe('component.state.updated', (event) => {
      if (event.payload.componentId === this.id) {
        this.state = event.payload.newState;
        this.render();
      }
    });
  }

  /**
   * Publishes state update command instead of direct mutation.
   */
  updateState(newState) {
    window.eventBus.publish({
      type: 'component.state.update',
      source: 'StateAwareComponent',
      payload: {
        componentId: this.id,
        currentState: this.state,
        newState: newState
      }
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div>Count: ${this.state.count}</div>
      <button id="increment">Increment</button>
    `;
    
    this.shadowRoot.querySelector('#increment').addEventListener('click', () => {
      this.updateState({ count: this.state.count + 1 });
    });
  }
}

customElements.define('state-aware-component', StateAwareComponent);