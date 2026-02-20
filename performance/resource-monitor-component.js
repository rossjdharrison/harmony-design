/**
 * @fileoverview ResourceMonitorComponent - Web Component UI for ResourceMonitor
 * @module performance/resource-monitor-component
 * 
 * Visual component that displays real-time resource metrics.
 * Shows CPU, memory, and GPU utilization with color-coded indicators.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#resource-monitoring}
 * @see {@link file://./performance/resource-monitor.js}
 */

/**
 * ResourceMonitorComponent displays real-time resource metrics
 * @extends HTMLElement
 */
class ResourceMonitorComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.monitor = null;
    this.updateInterval = null;
  }

  connectedCallback() {
    this.render();
    this.initialize();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  /**
   * Initialize the resource monitor
   * @private
   */
  async initialize() {
    // Import ResourceMonitor if not already available
    if (typeof ResourceMonitor === 'undefined') {
      console.error('[ResourceMonitorComponent] ResourceMonitor not available');
      return;
    }

    this.monitor = new ResourceMonitor({
      sampleInterval: 500,
      publishInterval: 1000
    });

    await this.monitor.start();

    // Update UI every 500ms
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 500);

    this.updateDisplay();
  }

  /**
   * Cleanup resources
   * @private
   */
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.monitor) {
      this.monitor.stop();
      this.monitor = null;
    }
  }

  /**
   * Update the display with current metrics
   * @private
   */
  updateDisplay() {
    if (!this.monitor) return;

    const metrics = this.monitor.getCurrentMetrics();
    const budgets = this.monitor.checkBudgets();

    // Update CPU
    this.updateMetric('cpu', metrics.cpu.utilization, budgets.frameTime.exceeded);
    this.updateValue('cpu-frame-time', `${metrics.cpu.frameTime.toFixed(2)}ms`);
    this.updateValue('cpu-avg-frame-time', `${metrics.cpu.averageFrameTime.toFixed(2)}ms`);

    // Update Memory
    const memoryMB = metrics.memory.usedJSHeapSize / 1024 / 1024;
    const memoryLimitMB = metrics.memory.jsHeapSizeLimit / 1024 / 1024;
    this.updateMetric('memory', metrics.memory.utilizationPercent, budgets.memory.exceeded);
    this.updateValue('memory-used', `${memoryMB.toFixed(2)}MB / ${memoryLimitMB.toFixed(2)}MB`);

    // Update GPU
    if (metrics.gpu.available) {
      this.updateMetric('gpu', metrics.gpu.utilization, false);
      this.updateValue('gpu-status', 'Available');
    } else {
      this.updateValue('gpu-status', 'Not Available');
    }
  }

  /**
   * Update a metric bar
   * @private
   * @param {string} name - Metric name
   * @param {number} value - Percentage value
   * @param {boolean} exceeded - Whether budget is exceeded
   */
  updateMetric(name, value, exceeded) {
    const bar = this.shadowRoot.querySelector(`#${name}-bar`);
    const text = this.shadowRoot.querySelector(`#${name}-value`);
    
    if (bar) {
      bar.style.width = `${Math.min(100, value)}%`;
      bar.className = `metric-bar ${exceeded ? 'exceeded' : ''}`;
    }
    
    if (text) {
      text.textContent = `${value.toFixed(1)}%`;
    }
  }

  /**
   * Update a text value
   * @private
   * @param {string} id - Element ID
   * @param {string} value - Text value
   */
  updateValue(id, value) {
    const element = this.shadowRoot.querySelector(`#${id}`);
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * Render the component
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          padding: 16px;
          border-radius: 8px;
          min-width: 300px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .header {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .metric {
          margin-bottom: 16px;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .metric-name {
          font-weight: 500;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.8);
        }

        .metric-value {
          font-weight: 600;
          font-size: 14px;
        }

        .metric-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .metric-bar {
          height: 100%;
          background: linear-gradient(90deg, #4ade80, #22c55e);
          transition: width 0.3s ease, background 0.3s ease;
        }

        .metric-bar.exceeded {
          background: linear-gradient(90deg, #f87171, #ef4444);
        }

        .metric-details {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 4px;
        }

        .budget-warning {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          border-radius: 4px;
          padding: 8px;
          margin-top: 12px;
          font-size: 12px;
          color: #fca5a5;
        }
      </style>

      <div class="header">Resource Monitor</div>

      <div class="metric">
        <div class="metric-header">
          <span class="metric-name">CPU</span>
          <span class="metric-value" id="cpu-value">0%</span>
        </div>
        <div class="metric-bar-container">
          <div class="metric-bar" id="cpu-bar"></div>
        </div>
        <div class="metric-details">
          Frame: <span id="cpu-frame-time">0ms</span> | 
          Avg: <span id="cpu-avg-frame-time">0ms</span>
        </div>
      </div>

      <div class="metric">
        <div class="metric-header">
          <span class="metric-name">Memory</span>
          <span class="metric-value" id="memory-value">0%</span>
        </div>
        <div class="metric-bar-container">
          <div class="metric-bar" id="memory-bar"></div>
        </div>
        <div class="metric-details">
          <span id="memory-used">0MB / 0MB</span>
        </div>
      </div>

      <div class="metric">
        <div class="metric-header">
          <span class="metric-name">GPU</span>
          <span class="metric-value" id="gpu-value">0%</span>
        </div>
        <div class="metric-bar-container">
          <div class="metric-bar" id="gpu-bar"></div>
        </div>
        <div class="metric-details">
          Status: <span id="gpu-status">Initializing...</span>
        </div>
      </div>
    `;
  }
}

// Register the custom element
customElements.define('resource-monitor', ResourceMonitorComponent);