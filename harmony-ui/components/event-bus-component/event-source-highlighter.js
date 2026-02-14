/**
 * Event Source Highlighter
 * 
 * Provides visual highlighting to show which component emitted each event.
 * Assigns unique colors to event sources and maintains consistency across the session.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#event-source-highlighting
 * 
 * @module EventSourceHighlighter
 */

/**
 * Manages color assignment and highlighting for event sources
 */
export class EventSourceHighlighter {
  constructor() {
    /** @type {Map<string, string>} Map of source identifiers to color codes */
    this.sourceColorMap = new Map();
    
    /** @type {string[]} Predefined color palette for source highlighting */
    this.colorPalette = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
      '#6366f1', // indigo
      '#14b8a6', // teal
      '#a855f7', // purple
    ];
    
    /** @type {number} Index for cycling through color palette */
    this.colorIndex = 0;
  }

  /**
   * Gets or assigns a color for a given event source
   * 
   * @param {string} source - The event source identifier
   * @returns {string} Hex color code for the source
   */
  getColorForSource(source) {
    if (!source) {
      return '#6b7280'; // gray for unknown sources
    }

    if (this.sourceColorMap.has(source)) {
      return this.sourceColorMap.get(source);
    }

    // Assign new color from palette
    const color = this.colorPalette[this.colorIndex % this.colorPalette.length];
    this.sourceColorMap.set(source, color);
    this.colorIndex++;

    return color;
  }

  /**
   * Extracts source identifier from event detail
   * 
   * @param {Object} eventDetail - Event detail object
   * @returns {string} Source identifier
   */
  extractSource(eventDetail) {
    // Check for explicit source field
    if (eventDetail?.source) {
      return eventDetail.source;
    }

    // Check for componentId field
    if (eventDetail?.componentId) {
      return eventDetail.componentId;
    }

    // Check for emitter field
    if (eventDetail?.emitter) {
      return eventDetail.emitter;
    }

    return 'unknown';
  }

  /**
   * Creates a source badge element with highlighting
   * 
   * @param {string} source - Source identifier
   * @returns {HTMLElement} Badge element
   */
  createSourceBadge(source) {
    const color = this.getColorForSource(source);
    const badge = document.createElement('span');
    badge.className = 'event-source-badge';
    badge.textContent = source;
    badge.style.backgroundColor = `${color}20`; // 20% opacity
    badge.style.color = color;
    badge.style.borderColor = color;
    badge.title = `Event emitted by: ${source}`;

    return badge;
  }

  /**
   * Gets all registered sources with their colors
   * 
   * @returns {Array<{source: string, color: string}>} Array of source-color pairs
   */
  getAllSources() {
    return Array.from(this.sourceColorMap.entries()).map(([source, color]) => ({
      source,
      color
    }));
  }

  /**
   * Clears all source color assignments
   */
  reset() {
    this.sourceColorMap.clear();
    this.colorIndex = 0;
  }

  /**
   * Highlights a DOM element with source color
   * 
   * @param {HTMLElement} element - Element to highlight
   * @param {string} source - Source identifier
   */
  highlightElement(element, source) {
    const color = this.getColorForSource(source);
    element.style.borderLeftColor = color;
    element.style.borderLeftWidth = '3px';
    element.style.borderLeftStyle = 'solid';
  }
}