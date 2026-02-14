/**
 * Source Legend Component
 * 
 * Displays a legend showing all active event sources and their assigned colors.
 * Updates dynamically as new sources emit events.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#event-source-highlighting
 * 
 * @module SourceLegend
 */

/**
 * Creates and manages the source legend UI
 */
export class SourceLegend {
  /**
   * @param {import('./event-source-highlighter.js').EventSourceHighlighter} highlighter
   */
  constructor(highlighter) {
    this.highlighter = highlighter;
    this.container = null;
  }

  /**
   * Creates the legend container element
   * 
   * @returns {HTMLElement} Legend container
   */
  createContainer() {
    const container = document.createElement('div');
    container.className = 'event-source-legend';
    container.innerHTML = `
      <div class="legend-header">
        <span class="legend-title">Event Sources</span>
        <button class="legend-toggle" title="Toggle legend">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4l-4 4h8l-4-4zm0 8l4-4H4l4 4z"/>
          </svg>
        </button>
      </div>
      <div class="legend-content"></div>
    `;

    // Toggle functionality
    const toggle = container.querySelector('.legend-toggle');
    const content = container.querySelector('.legend-content');
    toggle.addEventListener('click', () => {
      content.classList.toggle('collapsed');
    });

    this.container = container;
    return container;
  }

  /**
   * Updates the legend with current sources
   */
  update() {
    if (!this.container) return;

    const content = this.container.querySelector('.legend-content');
    const sources = this.highlighter.getAllSources();

    if (sources.length === 0) {
      content.innerHTML = '<div class="legend-empty">No events yet</div>';
      return;
    }

    // Sort sources alphabetically
    sources.sort((a, b) => a.source.localeCompare(b.source));

    content.innerHTML = sources.map(({ source, color }) => `
      <div class="legend-item">
        <span class="legend-color" style="background-color: ${color}"></span>
        <span class="legend-source">${this.escapeHtml(source)}</span>
      </div>
    `).join('');
  }

  /**
   * Escapes HTML to prevent XSS
   * 
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Highlights a specific source in the legend
   * 
   * @param {string} source - Source to highlight
   */
  highlightSource(source) {
    if (!this.container) return;

    // Remove previous highlights
    this.container.querySelectorAll('.legend-item').forEach(item => {
      item.classList.remove('highlighted');
    });

    // Add highlight to matching source
    const items = Array.from(this.container.querySelectorAll('.legend-item'));
    const matchingItem = items.find(item => {
      const sourceText = item.querySelector('.legend-source').textContent;
      return sourceText === source;
    });

    if (matchingItem) {
      matchingItem.classList.add('highlighted');
      setTimeout(() => matchingItem.classList.remove('highlighted'), 1000);
    }
  }
}