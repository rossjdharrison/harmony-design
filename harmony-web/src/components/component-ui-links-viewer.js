/**
 * Component UI Links Viewer Web Component
 * 
 * Displays Component → UI links in a visual interface.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#component-ui-links
 */

/**
 * Web component for viewing Component → UI links
 * 
 * @element component-ui-links-viewer
 * 
 * @attr {string} component-id - The component ID to display links for
 * @attr {string} ui-location - The UI location to display components for
 * 
 * @fires link-selected - When a link is selected
 */
class ComponentUILinksViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._links = [];
  }

  static get observedAttributes() {
    return ['component-id', 'ui-location'];
  }

  connectedCallback() {
    this.render();
    this.loadLinks();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.loadLinks();
    }
  }

  /**
   * Set the links to display
   * 
   * @param {Array} links - Array of link objects
   */
  setLinks(links) {
    this._links = links;
    this.render();
  }

  /**
   * Load links based on current attributes
   */
  async loadLinks() {
    const componentId = this.getAttribute('component-id');
    const uiLocation = this.getAttribute('ui-location');

    if (!componentId && !uiLocation) {
      this._links = [];
      this.render();
      return;
    }

    // This would integrate with ComponentUILinksTool
    // For now, render with empty state
    this.render();
  }

  /**
   * Handle link selection
   * 
   * @param {Object} link - The selected link
   */
  handleLinkClick(link) {
    this.dispatchEvent(new CustomEvent('link-selected', {
      detail: { link },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const componentId = this.getAttribute('component-id');
    const uiLocation = this.getAttribute('ui-location');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .container {
          padding: 16px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background: #ffffff;
        }

        .header {
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .links-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .link-item {
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .link-item:hover {
          background-color: #f5f5f5;
        }

        .link-item:active {
          background-color: #eeeeee;
        }

        .link-location {
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 4px;
        }

        .link-path {
          font-size: 12px;
          color: #666;
          font-family: monospace;
        }

        .link-context {
          display: inline-block;
          margin-top: 4px;
          padding: 2px 8px;
          font-size: 11px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 12px;
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          color: #999;
        }
      </style>

      <div class="container">
        <div class="header">
          ${componentId ? `UI Locations for: ${componentId}` : ''}
          ${uiLocation ? `Components in: ${uiLocation}` : ''}
        </div>

        ${this._links.length > 0 ? `
          <ul class="links-list">
            ${this._links.map(link => `
              <li class="link-item" data-link='${JSON.stringify(link)}'>
                <div class="link-location">
                  ${link.uiLocation || link.componentId}
                </div>
                <div class="link-path">
                  ${link.filePath}${link.lineNumber ? `:${link.lineNumber}` : ''}
                </div>
                <span class="link-context">${link.usageContext}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <div class="empty-state">
            No links found
          </div>
        `}
      </div>
    `;

    // Attach click handlers
    this.shadowRoot.querySelectorAll('.link-item').forEach(item => {
      item.addEventListener('click', () => {
        const link = JSON.parse(item.dataset.link);
        this.handleLinkClick(link);
      });
    });
  }
}

customElements.define('component-ui-links-viewer', ComponentUILinksViewer);

export { ComponentUILinksViewer };