/**
 * Component Domain Tool
 * 
 * Provides UI for exploring Component → Domain links in the design system.
 * Shows what domain types each component can render and how they're bound.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#component-domain-links
 */

class ComponentDomainTool extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.selectedComponent = null;
    this.selectedDomain = null;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.loadInitialData();
  }

  /**
   * Render the tool UI
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
          max-width: 1200px;
        }

        .tool-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e0e0e0;
        }

        .tool-title {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .tool-description {
          margin: 0;
          font-size: 14px;
          color: #666666;
        }

        .view-switcher {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .view-button {
          padding: 8px 16px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .view-button:hover {
          background: #e8e8e8;
        }

        .view-button.active {
          background: #0066cc;
          color: #ffffff;
          border-color: #0066cc;
        }

        .content-area {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .panel {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          background: #fafafa;
        }

        .panel-title {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333333;
        }

        .item-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
        }

        .item {
          padding: 8px 12px;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .item:hover {
          border-color: #0066cc;
          background: #f0f7ff;
        }

        .item.selected {
          border-color: #0066cc;
          background: #e6f2ff;
          font-weight: 500;
        }

        .item-name {
          font-size: 14px;
          color: #1a1a1a;
        }

        .item-meta {
          font-size: 12px;
          color: #666666;
          margin-top: 4px;
        }

        .link-details {
          grid-column: 1 / -1;
        }

        .link-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .link-card {
          padding: 12px;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }

        .link-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .link-component {
          font-weight: 600;
          color: #0066cc;
        }

        .link-domain {
          font-weight: 600;
          color: #cc6600;
        }

        .binding-badge {
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .binding-badge.primary {
          background: #e6f2ff;
          color: #0066cc;
        }

        .binding-badge.reference {
          background: #fff4e6;
          color: #cc6600;
        }

        .binding-badge.collection {
          background: #f0e6ff;
          color: #6600cc;
        }

        .props-mapping {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
        }

        .props-title {
          font-size: 12px;
          font-weight: 600;
          color: #666666;
          margin-bottom: 4px;
        }

        .prop-mapping {
          font-size: 12px;
          color: #333333;
          margin: 2px 0;
        }

        .prop-name {
          color: #0066cc;
        }

        .prop-field {
          color: #cc6600;
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: #999999;
          font-size: 14px;
        }
      </style>

      <div class="tool-header">
        <h2 class="tool-title">Component → Domain Links</h2>
        <p class="tool-description">
          Explore what domain types each component can render and how they're bound.
        </p>
      </div>

      <div class="view-switcher">
        <button class="view-button active" data-view="by-component">
          By Component
        </button>
        <button class="view-button" data-view="by-domain">
          By Domain Type
        </button>
        <button class="view-button" data-view="all-links">
          All Links
        </button>
      </div>

      <div class="content-area" id="contentArea">
        <!-- Dynamic content rendered here -->
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const viewButtons = this.shadowRoot.querySelectorAll('.view-button');
    viewButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        viewButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.switchView(e.target.dataset.view);
      });
    });
  }

  /**
   * Load initial data from graph
   */
  async loadInitialData() {
    // Query the graph via TypeNavigator
    const event = new CustomEvent('harmony:query', {
      detail: {
        query: 'get_all_component_domain_links',
        params: {},
        responseHandler: (data) => {
          this.handleDataLoaded(data);
        }
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle loaded data
   * @param {Object} data - Query result data
   */
  handleDataLoaded(data) {
    this.data = data || this.getMockData();
    this.switchView('by-component');
  }

  /**
   * Switch between different views
   * @param {string} view - View mode: 'by-component', 'by-domain', 'all-links'
   */
  switchView(view) {
    const contentArea = this.shadowRoot.getElementById('contentArea');
    
    switch (view) {
      case 'by-component':
        this.renderByComponentView(contentArea);
        break;
      case 'by-domain':
        this.renderByDomainView(contentArea);
        break;
      case 'all-links':
        this.renderAllLinksView(contentArea);
        break;
    }
  }

  /**
   * Render by-component view
   * @param {HTMLElement} container - Container element
   */
  renderByComponentView(container) {
    const components = this.getUniqueComponents();
    
    container.innerHTML = `
      <div class="panel">
        <h3 class="panel-title">Components</h3>
        <div class="item-list" id="componentList"></div>
      </div>
      <div class="panel">
        <h3 class="panel-title">Domain Types</h3>
        <div class="item-list" id="domainList"></div>
      </div>
      <div class="panel link-details">
        <h3 class="panel-title">Links</h3>
        <div class="link-grid" id="linkGrid"></div>
      </div>
    `;

    const componentList = container.querySelector('#componentList');
    components.forEach(comp => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="item-name">${comp.name}</div>
        <div class="item-meta">${comp.linkCount} domain type(s)</div>
      `;
      item.addEventListener('click', () => this.selectComponent(comp.name));
      componentList.appendChild(item);
    });

    if (components.length > 0) {
      this.selectComponent(components[0].name);
    }
  }

  /**
   * Render by-domain view
   * @param {HTMLElement} container - Container element
   */
  renderByDomainView(container) {
    const domains = this.getUniqueDomains();
    
    container.innerHTML = `
      <div class="panel">
        <h3 class="panel-title">Domain Types</h3>
        <div class="item-list" id="domainList"></div>
      </div>
      <div class="panel">
        <h3 class="panel-title">Components</h3>
        <div class="item-list" id="componentList"></div>
      </div>
      <div class="panel link-details">
        <h3 class="panel-title">Links</h3>
        <div class="link-grid" id="linkGrid"></div>
      </div>
    `;

    const domainList = container.querySelector('#domainList');
    domains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="item-name">${domain.name}</div>
        <div class="item-meta">${domain.linkCount} component(s)</div>
      `;
      item.addEventListener('click', () => this.selectDomain(domain.name));
      domainList.appendChild(item);
    });

    if (domains.length > 0) {
      this.selectDomain(domains[0].name);
    }
  }

  /**
   * Render all-links view
   * @param {HTMLElement} container - Container element
   */
  renderAllLinksView(container) {
    container.innerHTML = `
      <div class="panel link-details">
        <h3 class="panel-title">All Component → Domain Links</h3>
        <div class="link-grid" id="linkGrid"></div>
      </div>
    `;

    const linkGrid = container.querySelector('#linkGrid');
    this.data.links.forEach(link => {
      linkGrid.appendChild(this.createLinkCard(link));
    });
  }

  /**
   * Select a component
   * @param {string} componentId - Component ID
   */
  selectComponent(componentId) {
    this.selectedComponent = componentId;
    
    // Update UI
    const items = this.shadowRoot.querySelectorAll('#componentList .item');
    items.forEach(item => {
      if (item.querySelector('.item-name').textContent === componentId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });

    // Show related domains
    const links = this.data.links.filter(l => l.component_id === componentId);
    this.renderLinks(links);
  }

  /**
   * Select a domain
   * @param {string} domainType - Domain type
   */
  selectDomain(domainType) {
    this.selectedDomain = domainType;
    
    // Update UI
    const items = this.shadowRoot.querySelectorAll('#domainList .item');
    items.forEach(item => {
      if (item.querySelector('.item-name').textContent === domainType) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });

    // Show related components
    const links = this.data.links.filter(l => l.domain_type === domainType);
    this.renderLinks(links);
  }

  /**
   * Render links in the link grid
   * @param {Array} links - Array of link objects
   */
  renderLinks(links) {
    const linkGrid = this.shadowRoot.querySelector('#linkGrid');
    linkGrid.innerHTML = '';
    
    if (links.length === 0) {
      linkGrid.innerHTML = '<div class="empty-state">No links found</div>';
      return;
    }

    links.forEach(link => {
      linkGrid.appendChild(this.createLinkCard(link));
    });
  }

  /**
   * Create a link card element
   * @param {Object} link - Link object
   * @returns {HTMLElement} Link card element
   */
  createLinkCard(link) {
    const card = document.createElement('div');
    card.className = 'link-card';
    
    let propsHtml = '';
    if (link.props_mapping && Object.keys(link.props_mapping).length > 0) {
      propsHtml = `
        <div class="props-mapping">
          <div class="props-title">Props Mapping:</div>
          ${Object.entries(link.props_mapping).map(([prop, field]) => `
            <div class="prop-mapping">
              <span class="prop-name">${prop}</span> → <span class="prop-field">${field}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    card.innerHTML = `
      <div class="link-header">
        <div>
          <div class="link-component">${link.component_id}</div>
          <div class="link-domain">${link.domain_type}</div>
        </div>
        <span class="binding-badge ${link.binding_mode}">${link.binding_mode}</span>
      </div>
      ${propsHtml}
    `;
    
    return card;
  }

  /**
   * Get unique components from data
   * @returns {Array} Array of component objects with counts
   */
  getUniqueComponents() {
    const componentMap = new Map();
    this.data.links.forEach(link => {
      if (!componentMap.has(link.component_id)) {
        componentMap.set(link.component_id, { name: link.component_id, linkCount: 0 });
      }
      componentMap.get(link.component_id).linkCount++;
    });
    return Array.from(componentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get unique domains from data
   * @returns {Array} Array of domain objects with counts
   */
  getUniqueDomains() {
    const domainMap = new Map();
    this.data.links.forEach(link => {
      if (!domainMap.has(link.domain_type)) {
        domainMap.set(link.domain_type, { name: link.domain_type, linkCount: 0 });
      }
      domainMap.get(link.domain_type).linkCount++;
    });
    return Array.from(domainMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get mock data for development
   * @returns {Object} Mock data structure
   */
  getMockData() {
    return {
      links: [
        {
          component_id: 'TrackCard',
          domain_type: 'Track',
          binding_mode: 'primary',
          props_mapping: {
            title: 'name',
            duration: 'length_seconds',
            waveform: 'audio_buffer'
          }
        },
        {
          component_id: 'TrackCard',
          domain_type: 'Project',
          binding_mode: 'reference',
          props_mapping: {
            projectName: 'name'
          }
        },
        {
          component_id: 'ProjectList',
          domain_type: 'Project',
          binding_mode: 'collection',
          props_mapping: {
            items: 'projects'
          }
        },
        {
          component_id: 'WaveformDisplay',
          domain_type: 'AudioBuffer',
          binding_mode: 'primary',
          props_mapping: {
            data: 'samples',
            sampleRate: 'sample_rate'
          }
        },
        {
          component_id: 'MixerChannel',
          domain_type: 'Track',
          binding_mode: 'primary',
          props_mapping: {
            label: 'name',
            volume: 'gain',
            pan: 'pan'
          }
        }
      ]
    };
  }
}

customElements.define('component-domain-tool', ComponentDomainTool);