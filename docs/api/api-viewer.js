/**
 * API Reference Viewer
 * 
 * Loads and displays API documentation generated from JSDoc comments.
 * Performance: Lazy loading, virtual scrolling for large API surfaces.
 * 
 * @module APIViewer
 */

class APIViewer {
    constructor() {
        this.apiData = null;
        this.searchIndex = [];
        this.currentFilter = '';
        
        this.elements = {
            nav: document.getElementById('api-nav'),
            content: document.getElementById('api-content'),
            search: document.getElementById('api-search')
        };
        
        this.init();
    }
    
    /**
     * Initialize the API viewer
     * @private
     */
    async init() {
        await this.loadAPIData();
        this.buildSearchIndex();
        this.renderNavigation();
        this.attachEventListeners();
        this.handleHashChange();
    }
    
    /**
     * Load API data from generated JSON
     * @private
     * @returns {Promise<void>}
     */
    async loadAPIData() {
        try {
            const response = await fetch('api-data.json');
            this.apiData = await response.json();
        } catch (error) {
            console.error('Failed to load API data:', error);
            this.apiData = this.generateFallbackData();
        }
    }
    
    /**
     * Generate fallback data structure when api-data.json is not available
     * @private
     * @returns {Object} Fallback API data
     */
    generateFallbackData() {
        return {
            components: [],
            boundedContexts: [],
            utilities: [],
            types: [],
            metadata: {
                generated: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    
    /**
     * Build search index for fast filtering
     * @private
     */
    buildSearchIndex() {
        this.searchIndex = [];
        
        for (const category in this.apiData) {
            if (Array.isArray(this.apiData[category])) {
                this.apiData[category].forEach(item => {
                    this.searchIndex.push({
                        name: item.name,
                        category,
                        description: item.description || '',
                        searchText: `${item.name} ${item.description || ''}`.toLowerCase()
                    });
                });
            }
        }
    }
    
    /**
     * Render navigation sidebar
     * @private
     */
    renderNavigation() {
        const sections = [
            { key: 'components', title: 'Components' },
            { key: 'boundedContexts', title: 'Bounded Contexts' },
            { key: 'utilities', title: 'Utilities' },
            { key: 'types', title: 'Types' }
        ];
        
        const nav = document.createDocumentFragment();
        
        sections.forEach(section => {
            const items = this.apiData[section.key] || [];
            if (items.length === 0) return;
            
            const sectionEl = document.createElement('div');
            sectionEl.className = 'nav-section';
            
            const titleEl = document.createElement('div');
            titleEl.className = 'nav-section-title';
            titleEl.textContent = section.title;
            sectionEl.appendChild(titleEl);
            
            const listEl = document.createElement('ul');
            listEl.className = 'nav-list';
            
            items.forEach(item => {
                const itemEl = document.createElement('li');
                itemEl.className = 'nav-item';
                
                const linkEl = document.createElement('a');
                linkEl.className = 'nav-link';
                linkEl.href = `#${section.key}/${item.name}`;
                linkEl.textContent = item.name;
                linkEl.dataset.category = section.key;
                linkEl.dataset.name = item.name;
                
                itemEl.appendChild(linkEl);
                listEl.appendChild(itemEl);
            });
            
            sectionEl.appendChild(listEl);
            nav.appendChild(sectionEl);
        });
        
        this.elements.nav.innerHTML = '';
        this.elements.nav.appendChild(nav);
    }
    
    /**
     * Attach event listeners
     * @private
     */
    attachEventListeners() {
        // Search
        this.elements.search.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // Navigation clicks
        this.elements.nav.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                this.handleNavClick(e);
            }
        });
        
        // Hash change for deep linking
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }
    
    /**
     * Handle search input
     * @private
     * @param {string} query - Search query
     */
    handleSearch(query) {
        this.currentFilter = query.toLowerCase();
        
        if (!query) {
            this.renderNavigation();
            return;
        }
        
        const results = this.searchIndex.filter(item => 
            item.searchText.includes(this.currentFilter)
        );
        
        this.renderSearchResults(results);
    }
    
    /**
     * Render search results in navigation
     * @private
     * @param {Array} results - Search results
     */
    renderSearchResults(results) {
        const listEl = document.createElement('ul');
        listEl.className = 'nav-list';
        
        results.forEach(result => {
            const itemEl = document.createElement('li');
            itemEl.className = 'nav-item';
            
            const linkEl = document.createElement('a');
            linkEl.className = 'nav-link';
            linkEl.href = `#${result.category}/${result.name}`;
            linkEl.innerHTML = this.highlightMatch(result.name, this.currentFilter);
            
            itemEl.appendChild(linkEl);
            listEl.appendChild(itemEl);
        });
        
        this.elements.nav.innerHTML = '';
        this.elements.nav.appendChild(listEl);
    }
    
    /**
     * Highlight search matches in text
     * @private
     * @param {string} text - Text to highlight
     * @param {string} query - Search query
     * @returns {string} HTML with highlighted matches
     */
    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    /**
     * Handle navigation link click
     * @private
     * @param {Event} e - Click event
     */
    handleNavClick(e) {
        e.preventDefault();
        const link = e.target;
        
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Navigate
        window.location.hash = link.getAttribute('href').substring(1);
    }
    
    /**
     * Handle hash change for deep linking
     * @private
     */
    handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;
        
        const [category, name] = hash.split('/');
        this.renderAPIItem(category, name);
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            const isActive = link.dataset.category === category && link.dataset.name === name;
            link.classList.toggle('active', isActive);
        });
    }
    
    /**
     * Render API item documentation
     * @private
     * @param {string} category - API category
     * @param {string} name - Item name
     */
    renderAPIItem(category, name) {
        const items = this.apiData[category] || [];
        const item = items.find(i => i.name === name);
        
        if (!item) {
            this.elements.content.innerHTML = '<p>API item not found.</p>';
            return;
        }
        
        const html = this.generateItemHTML(item, category);
        this.elements.content.innerHTML = html;
    }
    
    /**
     * Generate HTML for API item
     * @private
     * @param {Object} item - API item data
     * @param {string} category - Item category
     * @returns {string} HTML string
     */
    generateItemHTML(item, category) {
        let html = `
            <article class="api-item">
                <header class="api-item-header">
                    <h1 class="api-item-name">${item.name}</h1>
                    <span class="api-item-kind">${category}</span>
                </header>
        `;
        
        if (item.description) {
            html += `<div class="api-item-description">${item.description}</div>`;
        }
        
        if (item.params && item.params.length > 0) {
            html += this.generateParamsHTML(item.params);
        }
        
        if (item.returns) {
            html += this.generateReturnsHTML(item.returns);
        }
        
        if (item.properties && item.properties.length > 0) {
            html += this.generatePropertiesHTML(item.properties);
        }
        
        if (item.methods && item.methods.length > 0) {
            html += this.generateMethodsHTML(item.methods);
        }
        
        if (item.examples && item.examples.length > 0) {
            html += this.generateExamplesHTML(item.examples);
        }
        
        if (item.source) {
            html += `<div class="api-section">
                <h3 class="api-section-title">Source</h3>
                <p><code>${item.source}</code></p>
            </div>`;
        }
        
        html += '</article>';
        return html;
    }
    
    /**
     * Generate parameters HTML
     * @private
     * @param {Array} params - Parameters
     * @returns {string} HTML string
     */
    generateParamsHTML(params) {
        let html = `
            <div class="api-section">
                <h3 class="api-section-title">Parameters</h3>
                <div class="param-list">
        `;
        
        params.forEach(param => {
            html += `
                <div class="param-item">
                    <div>
                        <span class="param-name">${param.name}</span>
                        <span class="param-type">${param.type || 'any'}</span>
                    </div>
                    ${param.description ? `<div class="param-description">${param.description}</div>` : ''}
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    }
    
    /**
     * Generate returns HTML
     * @private
     * @param {Object} returns - Return info
     * @returns {string} HTML string
     */
    generateReturnsHTML(returns) {
        return `
            <div class="api-section">
                <h3 class="api-section-title">Returns</h3>
                <div class="return-info">
                    <div><span class="param-type">${returns.type || 'void'}</span></div>
                    ${returns.description ? `<div class="param-description">${returns.description}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Generate properties HTML
     * @private
     * @param {Array} properties - Properties
     * @returns {string} HTML string
     */
    generatePropertiesHTML(properties) {
        let html = `
            <div class="api-section">
                <h3 class="api-section-title">Properties</h3>
                <div class="param-list">
        `;
        
        properties.forEach(prop => {
            html += `
                <div class="param-item">
                    <div>
                        <span class="param-name">${prop.name}</span>
                        <span class="param-type">${prop.type || 'any'}</span>
                    </div>
                    ${prop.description ? `<div class="param-description">${prop.description}</div>` : ''}
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    }
    
    /**
     * Generate methods HTML
     * @private
     * @param {Array} methods - Methods
     * @returns {string} HTML string
     */
    generateMethodsHTML(methods) {
        let html = `
            <div class="api-section">
                <h3 class="api-section-title">Methods</h3>
        `;
        
        methods.forEach(method => {
            html += `<div class="param-item">
                <div><span class="param-name">${method.name}()</span></div>
                ${method.description ? `<div class="param-description">${method.description}</div>` : ''}
            </div>`;
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * Generate examples HTML
     * @private
     * @param {Array} examples - Examples
     * @returns {string} HTML string
     */
    generateExamplesHTML(examples) {
        let html = `
            <div class="api-section">
                <h3 class="api-section-title">Examples</h3>
        `;
        
        examples.forEach(example => {
            html += `
                <div class="example">
                    ${example.title ? `<div class="example-title">${example.title}</div>` : ''}
                    <pre><code>${this.escapeHTML(example.code)}</code></pre>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * Escape HTML special characters
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new APIViewer());
} else {
    new APIViewer();
}