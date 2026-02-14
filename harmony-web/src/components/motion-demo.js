/**
 * Motion demonstration component for Harmony Design System
 * Shows all animation patterns with reduced motion support
 * @module components/motion-demo
 * @see harmony-design/DESIGN_SYSTEM.md#reduced-motion-support
 */

import { prefersReducedMotion, onReducedMotionChange, animate, transition } from '../utils/motion.js';

/**
 * @class MotionDemo
 * @extends HTMLElement
 * Demonstrates motion system capabilities and reduced motion support
 */
class MotionDemo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cleanupMotionListener = null;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    
    // Listen for reduced motion changes
    this._cleanupMotionListener = onReducedMotionChange((isReduced) => {
      this.updateMotionStatus(isReduced);
    });
  }

  disconnectedCallback() {
    if (this._cleanupMotionListener) {
      this._cleanupMotionListener();
    }
  }

  /**
   * Renders the component
   */
  render() {
    const isReduced = prefersReducedMotion();
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 24px;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 32px;
        }

        h1 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
        }

        .status.normal {
          background: #e3f2fd;
          color: #1565c0;
        }

        .status.reduced {
          background: #fff3e0;
          color: #e65100;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .section {
          margin-bottom: 32px;
          padding: 24px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        h2 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .demo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .demo-box {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #424242;
          transition: border-color var(--motion-duration-fast, 150ms) var(--motion-easing-standard, ease);
        }

        .demo-box:hover {
          border-color: #1976d2;
        }

        .demo-box:active {
          border-color: #0d47a1;
        }

        button {
          padding: 12px 24px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color var(--motion-duration-fast, 150ms) var(--motion-easing-standard, ease);
        }

        button:hover {
          background: #1565c0;
        }

        button:active {
          background: #0d47a1;
        }

        .info {
          margin-top: 16px;
          padding: 12px;
          background: white;
          border-left: 4px solid #1976d2;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.5;
        }
      </style>

      <div class="container">
        <div class="header">
          <h1>Motion System Demo</h1>
          <div class="status ${isReduced ? 'reduced' : 'normal'}" id="status">
            <span class="status-indicator"></span>
            <span id="status-text">${isReduced ? 'Reduced Motion Enabled' : 'Normal Motion Enabled'}</span>
          </div>
        </div>

        <div class="section">
          <h2>Fade Animations</h2>
          <div class="demo-grid">
            <div class="demo-box" data-animation="fade-in">Fade In</div>
            <div class="demo-box" data-animation="fade-out">Fade Out</div>
          </div>
          <div class="info">
            Click boxes to trigger animations. With reduced motion, animations complete instantly or with minimal duration.
          </div>
        </div>

        <div class="section">
          <h2>Slide Animations</h2>
          <div class="demo-grid">
            <div class="demo-box" data-animation="slide-in-up">Slide Up</div>
            <div class="demo-box" data-animation="slide-in-down">Slide Down</div>
          </div>
        </div>

        <div class="section">
          <h2>Scale Animations</h2>
          <div class="demo-grid">
            <div class="demo-box" data-animation="scale-in">Scale In</div>
            <div class="demo-box" data-animation="scale-out">Scale Out</div>
          </div>
        </div>

        <div class="section">
          <h2>Web Animations API</h2>
          <button id="animate-button">Trigger Animation</button>
          <div class="info">
            Uses the Web Animations API with automatic reduced motion support via the motion utility module.
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attaches event listeners
   */
  attachEventListeners() {
    // Demo box animations
    const boxes = this.shadowRoot.querySelectorAll('.demo-box');
    boxes.forEach(box => {
      box.addEventListener('click', () => {
        this.animateBox(box);
      });
    });

    // Web Animations API demo
    const button = this.shadowRoot.getElementById('animate-button');
    button.addEventListener('click', () => {
      this.animateButton(button);
    });
  }

  /**
   * Animates a demo box
   * @param {HTMLElement} box - Box element to animate
   */
  animateBox(box) {
    const animationType = box.dataset.animation;
    
    const animations = {
      'fade-in': [
        { opacity: 0 },
        { opacity: 1 }
      ],
      'fade-out': [
        { opacity: 1 },
        { opacity: 0 }
      ],
      'slide-in-up': [
        { transform: 'translateY(20px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ],
      'slide-in-down': [
        { transform: 'translateY(-20px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ],
      'scale-in': [
        { transform: 'scale(0.8)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      'scale-out': [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.8)', opacity: 0 }
      ]
    };

    const keyframes = animations[animationType];
    if (!keyframes) return;

    animate(box, keyframes, {
      duration: 300,
      easing: 'ease-out',
      fill: 'forwards'
    }).onfinish = () => {
      // Reset after animation
      setTimeout(() => {
        box.style.opacity = '';
        box.style.transform = '';
      }, 100);
    };
  }

  /**
   * Animates the button using transition helper
   * @param {HTMLElement} button - Button element
   */
  animateButton(button) {
    const originalText = button.textContent;
    button.textContent = 'Animating...';
    button.disabled = true;

    transition(button, {
      transform: 'scale(1.1)',
      backgroundColor: '#0d47a1'
    }, {
      duration: 200,
      easing: 'ease-out'
    }).then(() => {
      return transition(button, {
        transform: 'scale(1)',
        backgroundColor: '#1976d2'
      }, {
        duration: 200,
        easing: 'ease-in'
      });
    }).then(() => {
      button.textContent = originalText;
      button.disabled = false;
    });
  }

  /**
   * Updates motion status display
   * @param {boolean} isReduced - Whether reduced motion is enabled
   */
  updateMotionStatus(isReduced) {
    const status = this.shadowRoot.getElementById('status');
    const statusText = this.shadowRoot.getElementById('status-text');
    
    status.className = `status ${isReduced ? 'reduced' : 'normal'}`;
    statusText.textContent = isReduced ? 'Reduced Motion Enabled' : 'Normal Motion Enabled';
  }
}

customElements.define('harmony-motion-demo', MotionDemo);

export default MotionDemo;