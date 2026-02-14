/**
 * Integration Patch for Event Source Highlighting
 * 
 * Patches the existing EventBusComponent to add source highlighting functionality.
 * This file should be imported after the main EventBusComponent definition.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#event-source-highlighting
 * 
 * @module IntegrationPatch
 */

import { EventSourceHighlighter } from './event-source-highlighter.js';
import { SourceLegend } from './source-legend.js';

/**
 * Patches EventBusComponent with source highlighting
 * 
 * @param {typeof HTMLElement} EventBusComponent - The EventBusComponent class
 */
export function patchEventBusComponent(EventBusComponent) {
  const originalConnectedCallback = EventBusComponent.prototype.connectedCallback;
  const originalRenderEvent = EventBusComponent.prototype.renderEvent;
  const originalClearLog = EventBusComponent.prototype.clearLog;

  // Add highlighter and legend to component
  EventBusComponent.prototype.connectedCallback = function() {
    this.sourceHighlighter = new EventSourceHighlighter();
    this.sourceLegend = new SourceLegend(this.sourceHighlighter);

    if (originalConnectedCallback) {
      originalConnectedCallback.call(this);
    }

    // Add legend to shadow DOM
    const shadowRoot = this.shadowRoot;
    if (shadowRoot) {
      const eventLog = shadowRoot.querySelector('.event-log');
      if (eventLog) {
        const legendContainer = this.sourceLegend.createContainer();
        eventLog.insertBefore(legendContainer, eventLog.firstChild);
      }

      // Add source highlighting styles
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = '/harmony-ui/components/event-bus-component/styles/source-highlighting.css';
      shadowRoot.appendChild(styleLink);
    }
  };

  // Enhance event rendering with source highlighting
  EventBusComponent.prototype.renderEvent = function(eventData) {
    let eventElement;

    if (originalRenderEvent) {
      eventElement = originalRenderEvent.call(this, eventData);
    } else {
      // Fallback if renderEvent doesn't exist
      eventElement = document.createElement('div');
      eventElement.className = 'event-item';
    }

    if (!eventElement) return null;

    // Extract and highlight source
    const source = this.sourceHighlighter.extractSource(eventData.detail);
    this.sourceHighlighter.highlightElement(eventElement, source);

    // Add source badge
    const sourceBadge = this.sourceHighlighter.createSourceBadge(source);
    const eventHeader = eventElement.querySelector('.event-header') || eventElement;
    eventHeader.insertBefore(sourceBadge, eventHeader.firstChild);

    // Update legend
    this.sourceLegend.update();
    this.sourceLegend.highlightSource(source);

    return eventElement;
  };

  // Reset highlighter when clearing log
  EventBusComponent.prototype.clearLog = function() {
    if (originalClearLog) {
      originalClearLog.call(this);
    }

    if (this.sourceHighlighter) {
      this.sourceHighlighter.reset();
    }

    if (this.sourceLegend) {
      this.sourceLegend.update();
    }
  };
}