/**
 * @fileoverview Safe Area Visualizer Component
 * Debug component to visualize safe area insets on devices.
 * 
 * Related: DESIGN_SYSTEM.md § Safe Area Insets
 * 
 * @module components/safe-area-visualizer
 */

import { getSafeAreaInsetsHandler } from '../utils/safe-area-insets.js';

/**
 * Safe Area Visualizer Web Component
 * Shows colored overlays for safe area insets (debug tool).
 * 
 * @example
 * <safe-area-visualizer></safe-area-visualizer>
 */
export class SafeAreaVisualizer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._unsubscribe = null;
  }

  connectedCallback() {
    this._render();
    this._setupSubscription();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Setup subscription to safe area changes
   * @private
   */
  _setupSubscription() {
    const handler = getSafeAreaInsetsHandler();
    this._unsubscribe = handler.subscribe((insets) => {
      this._updateInsets(insets);
    });
  }

  /**
   * Update visualizer with new insets
   * @private
   * @param {Object} insets - Safe area insets
   */
  _updateInsets(insets) {
    const topBar = this.shadowRoot.querySelector('.top-bar');
    const rightBar = this.shadowRoot.querySelector('.right-bar');
    const bottomBar = this.shadowRoot.querySelector('.bottom-bar');
    const leftBar = this.shadowRoot.querySelector('.left-bar');
    const info = this.shadowRoot.querySelector('.info');

    if (topBar) topBar.style.height = `${insets.top}px`;
    if (rightBar) rightBar.style.width = `${insets.right}px`;
    if (bottomBar) bottomBar.style.height = `${insets.bottom}px`;
    if (leftBar) leftBar.style.width = `${insets.left}px`;

    if (info) {
      info.textContent = `T:${insets.top} R:${insets.right} B:${insets.bottom} L:${insets.left}`;
    }

    // Hide visualizer if no insets
    const hasInsets = insets.top > 0 || insets.right > 0 || insets.bottom > 0 || insets.left > 0;
    this.shadowRoot.host.style.display = hasInsets ? 'block' : 'none';
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 999999;
          display: none;
        }

        .bar {
          position: absolute;
          background: rgba(255, 0, 0, 0.3);
          pointer-events: none;
        }

        .top-bar {
          top: 0;
          left: 0;
          right: 0;
          height: 0;
        }

        .right-bar {
          top: 0;
          right: 0;
          bottom: 0;
          width: 0;
        }

        .bottom-bar {
          bottom: 0;
          left: 0;
          right: 0;
          height: 0;
        }

        .left-bar {
          top: 0;
          left: 0;
          bottom: 0;
          width: 0;
        }

        .info {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          pointer-events: auto;
        }
      </style>

      <div class="bar top-bar"></div>
      <div class="bar right-bar"></div>
      <div class="bar bottom-bar"></div>
      <div class="bar left-bar"></div>
      <div class="info">T:0 R:0 B:0 L:0</div>
    `;
  }
}

customElements.define('safe-area-visualizer', SafeAreaVisualizer);