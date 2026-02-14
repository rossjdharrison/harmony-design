/**
 * @fileoverview MixerPanel organism - Assembles multiple channel strips in a mixer layout
 * @module components/organisms/mixer-panel
 * 
 * MixerPanel is a composite organism that displays multiple ChannelStrip components
 * in a horizontal layout, representing a traditional audio mixer interface.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#mixer-panel
 * 
 * @example
 * <mixer-panel channels="8"></mixer-panel>
 */

import { EventBus } from '../../../core/event-bus.js';

/**
 * MixerPanel Web Component
 * Displays multiple channel strips in a mixer layout
 * 
 * @class MixerPanel
 * @extends HTMLElement
 * 
 * @attr {number} channels - Number of channel strips to display (default: 8)
 * @attr {string} channel-labels - Comma-separated labels for channels
 * 
 * @fires mixer-panel:channel-changed - When any channel parameter changes
 * @fires mixer-panel:initialized - When panel is fully initialized
 */
class MixerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {number} */
    this._channels = 8;
    
    /** @type {string[]} */
    this._channelLabels = [];
    
    /** @type {Map<number, Object>} */
    this._channelStates = new Map();
  }

  static get observedAttributes() {
    return ['channels', 'channel-labels'];
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
    this._initializeChannels();
    
    // Publish initialization event
    EventBus.publish({
      type: 'mixer-panel:initialized',
      payload: {
        channels: this._channels,
        timestamp: Date.now()
      }
    });
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'channels':
        this._channels = parseInt(newValue, 10) || 8;
        if (this.isConnected) {
          this._render();
          this._initializeChannels();
        }
        break;
      case 'channel-labels':
        this._channelLabels = newValue ? newValue.split(',').map(l => l.trim()) : [];
        if (this.isConnected) {
          this._updateChannelLabels();
        }
        break;
    }
  }

  /**
   * Initialize channel states
   * @private
   */
  _initializeChannels() {
    this._channelStates.clear();
    for (let i = 0; i < this._channels; i++) {
      this._channelStates.set(i, {
        volume: 0.75,
        pan: 0.5,
        muted: false,
        soloed: false,
        label: this._channelLabels[i] || `Ch ${i + 1}`
      });
    }
  }

  /**
   * Update channel labels
   * @private
   */
  _updateChannelLabels() {
    const strips = this.shadowRoot.querySelectorAll('channel-strip');
    strips.forEach((strip, index) => {
      const label = this._channelLabels[index] || `Ch ${index + 1}`;
      strip.setAttribute('label', label);
    });
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this._handleChannelChange = this._onChannelChange.bind(this);
    this.shadowRoot.addEventListener('channel-strip:change', this._handleChannelChange);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    if (this._handleChannelChange) {
      this.shadowRoot.removeEventListener('channel-strip:change', this._handleChannelChange);
    }
  }

  /**
   * Handle channel parameter changes
   * @private
   * @param {CustomEvent} event
   */
  _onChannelChange(event) {
    const strip = event.target;
    const channelIndex = parseInt(strip.getAttribute('channel-index'), 10);
    
    if (!isNaN(channelIndex) && this._channelStates.has(channelIndex)) {
      const state = this._channelStates.get(channelIndex);
      Object.assign(state, event.detail);
      
      // Publish change event via EventBus
      EventBus.publish({
        type: 'mixer-panel:channel-changed',
        payload: {
          channelIndex,
          ...event.detail,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Get state of a specific channel
   * @public
   * @param {number} channelIndex
   * @returns {Object|null}
   */
  getChannelState(channelIndex) {
    return this._channelStates.get(channelIndex) || null;
  }

  /**
   * Get states of all channels
   * @public
   * @returns {Object[]}
   */
  getAllChannelStates() {
    return Array.from(this._channelStates.entries()).map(([index, state]) => ({
      index,
      ...state
    }));
  }

  /**
   * Set state of a specific channel
   * @public
   * @param {number} channelIndex
   * @param {Object} state
   */
  setChannelState(channelIndex, state) {
    if (!this._channelStates.has(channelIndex)) return;
    
    const currentState = this._channelStates.get(channelIndex);
    Object.assign(currentState, state);
    
    const strip = this.shadowRoot.querySelector(`channel-strip[channel-index="${channelIndex}"]`);
    if (strip) {
      if (state.volume !== undefined) strip.setAttribute('volume', state.volume);
      if (state.pan !== undefined) strip.setAttribute('pan', state.pan);
      if (state.muted !== undefined) strip.setAttribute('muted', state.muted);
      if (state.soloed !== undefined) strip.setAttribute('soloed', state.soloed);
    }
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          background: var(--color-surface-secondary, #1a1a1a);
          overflow-x: auto;
          overflow-y: hidden;
        }

        .mixer-container {
          display: flex;
          flex-direction: row;
          height: 100%;
          padding: var(--spacing-md, 16px);
          gap: var(--spacing-sm, 8px);
          min-width: min-content;
        }

        .channel-wrapper {
          display: flex;
          flex-direction: column;
          min-width: 80px;
          max-width: 120px;
          flex-shrink: 0;
        }

        channel-strip {
          height: 100%;
        }

        /* Scrollbar styling */
        :host::-webkit-scrollbar {
          height: 8px;
        }

        :host::-webkit-scrollbar-track {
          background: var(--color-surface-primary, #0d0d0d);
        }

        :host::-webkit-scrollbar-thumb {
          background: var(--color-border-primary, #333333);
          border-radius: 4px;
        }

        :host::-webkit-scrollbar-thumb:hover {
          background: var(--color-border-hover, #444444);
        }

        /* Empty state */
        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--color-text-secondary, #888888);
          font-family: var(--font-family-base, system-ui, sans-serif);
          font-size: var(--font-size-md, 14px);
        }
      </style>
      
      ${this._renderContent()}
    `;
  }

  /**
   * Render content based on channel count
   * @private
   * @returns {string}
   */
  _renderContent() {
    if (this._channels === 0) {
      return '<div class="empty-state">No channels configured</div>';
    }

    const channelStrips = Array.from({ length: this._channels }, (_, i) => {
      const label = this._channelLabels[i] || `Ch ${i + 1}`;
      return `
        <div class="channel-wrapper">
          <channel-strip 
            channel-index="${i}"
            label="${label}"
            volume="0.75"
            pan="0.5">
          </channel-strip>
        </div>
      `;
    }).join('');

    return `
      <div class="mixer-container">
        ${channelStrips}
      </div>
    `;
  }
}

customElements.define('mixer-panel', MixerPanel);

export { MixerPanel };