/**
 * @fileoverview Web component for displaying component usage in the dashboard
 * Provides interactive UI for analyzing component relationships
 * See: harmony-design/DESIGN_SYSTEM.md#component-usage-panel
 */

import { GetComponentUsageTool } from './get_component_usage.js';
import { EventBus } from '../core/event-bus.js';

/**
 * Web component for component usage analysis panel
 * @class ComponentUsagePanel
 * @extends HTMLElement
 */
class ComponentUsagePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tool = new GetComponentUsageTool();
    this.eventBus = EventBus.getInstance();
    this.currentUsage = null;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.subscribeToEvents();
  }

  /**
   * Subscribes to relevant EventBus events
   */
  subscribeToEvents() {
    this.eventBus.subscribe('ComponentSelected', (event) => {
      this.analyzeComponent(event.payload.componentId);
    });

    this.eventBus.subscribe('ComponentUsageFound', (event) => {
      this.displayUsage(event.payload);
    });
  }

  /**
   * Renders the panel UI
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          max-height: 600px;
          overflow-y: auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f0f0f0;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .search-box {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 14px;
        }

        button {
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        button:hover {
          background: #0052a3;
        }

        button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 32px;
          color: #666;
        }

        .spinner {
          display: inline-block;
          width: 24px;
          height: 24px;
          border: 3px solid #f0f0f0;
          border-top-color: #0066cc;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .usage-summary {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .usage-summary h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #333;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 14px;
        }

        .stat-label {
          color: #666;
        }

        .stat-value {
          font-weight: 600;
          color: #333;
        }

        .usage-section {
          margin-bottom: 24px;
        }

        .usage-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .usage-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .usage-item {
          padding: 8px 12px;
          background: #f8f9fa;
          border-left: 3px solid #0066cc;
          margin-bottom: 8px;
          border-radius: 4px;
        }

        .usage-item-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .usage-item-detail {
          font-size: 12px;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 48px 16px;
          color: #999;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error {
          background: #fee;
          color: #c00;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
      </style>

      <div class="header">
        <h2>Component Usage</h2>
      </div>

      <div class="search-box">
        <input 
          type="text" 
          id="component-input" 
          placeholder="Enter component ID..."
          autocomplete="off"
        />
        <button id="analyze-btn">Analyze</button>
      </div>

      <div id="content">
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>Enter a component ID to analyze its usage</p>
        </div>
      </div>
    `;
  }

  /**
   * Attaches event listeners to UI elements
   */
  attachEventListeners() {
    const input = this.shadowRoot.getElementById('component-input');
    const button = this.shadowRoot.getElementById('analyze-btn');

    button.addEventListener('click', () => {
      const componentId = input.value.trim();
      if (componentId) {
        this.analyzeComponent(componentId);
      }
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const componentId = input.value.trim();
        if (componentId) {
          this.analyzeComponent(componentId);
        }
      }
    });
  }

  /**
   * Analyzes a component's usage
   * @param {string} componentId - Component to analyze
   */
  async analyzeComponent(componentId) {
    const content = this.shadowRoot.getElementById('content');
    const button = this.shadowRoot.getElementById('analyze-btn');
    
    button.disabled = true;
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Analyzing component usage...</p>
      </div>
    `;

    try {
      const usage = await this.tool.findUsage(componentId);
      this.currentUsage = usage;
      this.displayUsage(usage);
    } catch (error) {
      content.innerHTML = `
        <div class="error">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
    } finally {
      button.disabled = false;
    }
  }

  /**
   * Displays usage results
   * @param {ComponentUsageResult} usage - Usage data to display
   */
  displayUsage(usage) {
    const content = this.shadowRoot.getElementById('content');

    if (usage.usageCount === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p><strong>${usage.componentId}</strong> is not used anywhere</p>
          <p style="font-size: 14px; color: #666;">
            This component may be newly created or a candidate for removal
          </p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="usage-summary">
        <h3>${usage.componentId}</h3>
        <div class="stat">
          <span class="stat-label">Total Usages:</span>
          <span class="stat-value">${usage.usageCount}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Analysis Time:</span>
          <span class="stat-value">${usage.executionTime.toFixed(2)}ms</span>
        </div>
      </div>
    `;

    if (usage.usedIn.components.length > 0) {
      html += `
        <div class="usage-section">
          <h4>Used in Components (${usage.usedIn.components.length})</h4>
          <ul class="usage-list">
            ${usage.usedIn.components.map(comp => `
              <li class="usage-item">
                <div class="usage-item-name">${comp.name}</div>
                <div class="usage-item-detail">ID: ${comp.id}</div>
                <div class="usage-item-detail">Relationship: ${comp.relationship}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    if (usage.usedIn.implementations.length > 0) {
      html += `
        <div class="usage-section">
          <h4>Implementation References (${usage.usedIn.implementations.length})</h4>
          <ul class="usage-list">
            ${usage.usedIn.implementations.map(impl => `
              <li class="usage-item">
                <div class="usage-item-name">${impl.filePath}</div>
                <div class="usage-item-detail">Language: ${impl.language}</div>
                ${impl.lineNumber ? `<div class="usage-item-detail">Line: ${impl.lineNumber}</div>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    if (usage.usedIn.templates.length > 0) {
      html += `
        <div class="usage-section">
          <h4>Used in Templates (${usage.usedIn.templates.length})</h4>
          <ul class="usage-list">
            ${usage.usedIn.templates.map(template => `
              <li class="usage-item">
                <div class="usage-item-name">${template.name}</div>
                <div class="usage-item-detail">ID: ${template.id}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    if (usage.usedIn.designTokens.length > 0) {
      html += `
        <div class="usage-section">
          <h4>Related Design Tokens (${usage.usedIn.designTokens.length})</h4>
          <ul class="usage-list">
            ${usage.usedIn.designTokens.map(token => `
              <li class="usage-item">
                <div class="usage-item-name">${token.tokenName}</div>
                <div class="usage-item-detail">Type: ${token.tokenType}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    content.innerHTML = html;
  }
}

customElements.define('component-usage-panel', ComponentUsagePanel);

export { ComponentUsagePanel };