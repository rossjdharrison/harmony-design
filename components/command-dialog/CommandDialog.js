/**
 * @fileoverview Command Dialog Web Component
 * @module components/command-dialog/CommandDialog
 * 
 * Keyboard-triggered command dialog (Cmd+K / Ctrl+K) for quick actions and navigation.
 * Implements fuzzy search, keyboard navigation, and command execution via EventBus.
 * 
 * Performance targets:
 * - Render: < 16ms per frame
 * - Search latency: < 50ms for 1000+ commands
 * - Memory: < 2MB for component state
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#command-dialog Command Dialog Documentation}
 */

import { EventBusComponent } from '../../core/EventBus.js';

/**
 * CommandDialog - Keyboard-triggered command palette
 * 
 * @class CommandDialog
 * @extends HTMLElement
 * 
 * @fires command:open - Emitted when dialog opens
 * @fires command:close - Emitted when dialog closes
 * @fires command:execute - Emitted when command is executed
 * @fires command:search - Emitted when search query changes
 * 
 * @example
 * <command-dialog></command-dialog>
 * 
 * @example
 * // Register commands programmatically
 * const dialog = document.querySelector('command-dialog');
 * dialog.registerCommand({
 *   id: 'save-project',
 *   label: 'Save Project',
 *   description: 'Save the current project',
 *   keywords: ['save', 'project', 'file'],
 *   icon: '💾',
 *   action: () => console.log('Saving...')
 * });
 */
class CommandDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._isOpen = false;
    
    /** @type {Array<Command>} */
    this._commands = [];
    
    /** @type {Array<Command>} */
    this._filteredCommands = [];
    
    /** @type {number} */
    this._selectedIndex = 0;
    
    /** @type {string} */
    this._searchQuery = '';
    
    /** @type {AbortController|null} */
    this._abortController = null;
    
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleGlobalKeyDown = this._handleGlobalKeyDown.bind(this);
    this._handleSearchInput = this._handleSearchInput.bind(this);
    this._handleBackdropClick = this._handleBackdropClick.bind(this);
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
    this._subscribeToEvents();
    this._loadDefaultCommands();
  }

  disconnectedCallback() {
    this._detachEventListeners();
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  /**
   * Register a command
   * @param {Command} command - Command definition
   */
  registerCommand(command) {
    if (!command.id || !command.label) {
      console.error('[CommandDialog] Invalid command:', command);
      return;
    }
    
    // Remove existing command with same ID
    this._commands = this._commands.filter(c => c.id !== command.id);
    this._commands.push(command);
    
    if (this._isOpen) {
      this._filterCommands(this._searchQuery);
    }
  }

  /**
   * Unregister a command
   * @param {string} commandId - Command ID to remove
   */
  unregisterCommand(commandId) {
    this._commands = this._commands.filter(c => c.id !== commandId);
    
    if (this._isOpen) {
      this._filterCommands(this._searchQuery);
    }
  }

  /**
   * Open the command dialog
   */
  open() {
    if (this._isOpen) return;
    
    this._isOpen = true;
    this._searchQuery = '';
    this._selectedIndex = 0;
    this._filterCommands('');
    this._render();
    
    // Focus search input
    requestAnimationFrame(() => {
      const input = this.shadowRoot.querySelector('.command-dialog__search-input');
      if (input) input.focus();
    });
    
    this._publishEvent('command:open', {});
  }

  /**
   * Close the command dialog
   */
  close() {
    if (!this._isOpen) return;
    
    this._isOpen = false;
    this._searchQuery = '';
    this._selectedIndex = 0;
    this._render();
    
    this._publishEvent('command:close', {});
  }

  /**
   * Toggle dialog open/closed
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Load default system commands
   * @private
   */
  _loadDefaultCommands() {
    const defaultCommands = [
      {
        id: 'theme-toggle',
        label: 'Toggle Theme',
        description: 'Switch between light and dark theme',
        keywords: ['theme', 'dark', 'light', 'appearance'],
        icon: '🎨',
        action: () => this._executeCommand('theme:toggle')
      },
      {
        id: 'show-shortcuts',
        label: 'Show Keyboard Shortcuts',
        description: 'Display all available keyboard shortcuts',
        keywords: ['shortcuts', 'keyboard', 'help'],
        icon: '⌨️',
        action: () => this._executeCommand('shortcuts:show')
      },
      {
        id: 'show-eventbus',
        label: 'Show Event Bus',
        description: 'Open EventBus debug panel',
        keywords: ['eventbus', 'debug', 'events'],
        icon: '🔍',
        action: () => this._executeCommand('eventbus:show')
      }
    ];
    
    defaultCommands.forEach(cmd => this.registerCommand(cmd));
  }

  /**
   * Filter commands based on search query
   * @private
   * @param {string} query - Search query
   */
  _filterCommands(query) {
    const startTime = performance.now();
    
    if (!query.trim()) {
      this._filteredCommands = [...this._commands];
    } else {
      const lowerQuery = query.toLowerCase();
      this._filteredCommands = this._commands
        .map(command => ({
          command,
          score: this._calculateMatchScore(command, lowerQuery)
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ command }) => command);
    }
    
    // Clamp selected index
    this._selectedIndex = Math.min(
      this._selectedIndex,
      Math.max(0, this._filteredCommands.length - 1)
    );
    
    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`[CommandDialog] Search took ${elapsed.toFixed(2)}ms (target: <50ms)`);
    }
    
    this._render();
  }

  /**
   * Calculate match score for fuzzy search
   * @private
   * @param {Command} command - Command to score
   * @param {string} query - Search query (lowercase)
   * @returns {number} Match score (higher is better)
   */
  _calculateMatchScore(command, query) {
    let score = 0;
    
    // Exact label match
    if (command.label.toLowerCase() === query) {
      score += 100;
    }
    
    // Label starts with query
    if (command.label.toLowerCase().startsWith(query)) {
      score += 50;
    }
    
    // Label contains query
    if (command.label.toLowerCase().includes(query)) {
      score += 25;
    }
    
    // Description contains query
    if (command.description && command.description.toLowerCase().includes(query)) {
      score += 10;
    }
    
    // Keywords match
    if (command.keywords) {
      command.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(query)) {
          score += 15;
        }
      });
    }
    
    // Fuzzy match (simple implementation)
    if (this._fuzzyMatch(command.label.toLowerCase(), query)) {
      score += 5;
    }
    
    return score;
  }

  /**
   * Simple fuzzy matching
   * @private
   * @param {string} text - Text to search in
   * @param {string} query - Query to search for
   * @returns {boolean} True if fuzzy match
   */
  _fuzzyMatch(text, query) {
    let textIndex = 0;
    let queryIndex = 0;
    
    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        queryIndex++;
      }
      textIndex++;
    }
    
    return queryIndex === query.length;
  }

  /**
   * Execute selected command
   * @private
   */
  _executeSelectedCommand() {
    const command = this._filteredCommands[this._selectedIndex];
    if (!command) return;
    
    this._publishEvent('command:execute', {
      commandId: command.id,
      label: command.label
    });
    
    if (command.action) {
      try {
        command.action();
      } catch (error) {
        console.error('[CommandDialog] Command execution failed:', error);
      }
    }
    
    this.close();
  }

  /**
   * Execute command by event name
   * @private
   * @param {string} eventName - Event to publish
   */
  _executeCommand(eventName) {
    this._publishEvent(eventName, {});
  }

  /**
   * Publish event via EventBus
   * @private
   * @param {string} eventName - Event name
   * @param {Object} payload - Event payload
   */
  _publishEvent(eventName, payload) {
    const eventBus = EventBusComponent.getInstance();
    if (eventBus) {
      eventBus.publish(eventName, {
        source: 'CommandDialog',
        timestamp: Date.now(),
        ...payload
      });
    }
  }

  /**
   * Subscribe to EventBus events
   * @private
   */
  _subscribeToEvents() {
    const eventBus = EventBusComponent.getInstance();
    if (!eventBus) return;
    
    this._abortController = new AbortController();
    
    // Subscribe to command registration events
    eventBus.subscribe('command:register', (event) => {
      if (event.detail?.command) {
        this.registerCommand(event.detail.command);
      }
    }, { signal: this._abortController.signal });
    
    // Subscribe to command unregistration events
    eventBus.subscribe('command:unregister', (event) => {
      if (event.detail?.commandId) {
        this.unregisterCommand(event.detail.commandId);
      }
    }, { signal: this._abortController.signal });
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    document.addEventListener('keydown', this._handleGlobalKeyDown);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    document.removeEventListener('keydown', this._handleGlobalKeyDown);
  }

  /**
   * Handle global keyboard shortcuts
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleGlobalKeyDown(event) {
    // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.toggle();
    }
  }

  /**
   * Handle keyboard navigation within dialog
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyDown(event) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        this._selectedIndex = Math.min(
          this._selectedIndex + 1,
          this._filteredCommands.length - 1
        );
        this._render();
        this._scrollSelectedIntoView();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
        this._render();
        this._scrollSelectedIntoView();
        break;
        
      case 'Enter':
        event.preventDefault();
        this._executeSelectedCommand();
        break;
        
      case 'Home':
        event.preventDefault();
        this._selectedIndex = 0;
        this._render();
        this._scrollSelectedIntoView();
        break;
        
      case 'End':
        event.preventDefault();
        this._selectedIndex = this._filteredCommands.length - 1;
        this._render();
        this._scrollSelectedIntoView();
        break;
    }
  }

  /**
   * Handle search input changes
   * @private
   * @param {InputEvent} event - Input event
   */
  _handleSearchInput(event) {
    this._searchQuery = event.target.value;
    this._selectedIndex = 0;
    this._filterCommands(this._searchQuery);
    
    this._publishEvent('command:search', {
      query: this._searchQuery,
      resultCount: this._filteredCommands.length
    });
  }

  /**
   * Handle backdrop click to close
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  _handleBackdropClick(event) {
    if (event.target.classList.contains('command-dialog__backdrop')) {
      this.close();
    }
  }

  /**
   * Scroll selected item into view
   * @private
   */
  _scrollSelectedIntoView() {
    requestAnimationFrame(() => {
      const selected = this.shadowRoot.querySelector('.command-dialog__item--selected');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    const visible = this._isOpen ? 'visible' : '';
    
    this.shadowRoot.innerHTML = `
      <style>
        ${this._getStyles()}
      </style>
      <div class="command-dialog__backdrop ${visible}" part="backdrop">
        <div class="command-dialog__container" part="container" role="dialog" aria-modal="true" aria-label="Command palette">
          <div class="command-dialog__search" part="search">
            <span class="command-dialog__search-icon" part="search-icon">🔍</span>
            <input
              type="text"
              class="command-dialog__search-input"
              part="search-input"
              placeholder="Type a command or search..."
              value="${this._searchQuery}"
              autocomplete="off"
              spellcheck="false"
              aria-label="Search commands"
            />
            <kbd class="command-dialog__shortcut" part="shortcut">ESC</kbd>
          </div>
          <div class="command-dialog__results" part="results" role="listbox">
            ${this._renderResults()}
          </div>
          <div class="command-dialog__footer" part="footer">
            <div class="command-dialog__hint">
              <kbd>↑</kbd><kbd>↓</kbd> Navigate
              <kbd>↵</kbd> Select
              <kbd>ESC</kbd> Close
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Attach event listeners after render
    if (this._isOpen) {
      const backdrop = this.shadowRoot.querySelector('.command-dialog__backdrop');
      const input = this.shadowRoot.querySelector('.command-dialog__search-input');
      const container = this.shadowRoot.querySelector('.command-dialog__container');
      
      backdrop?.addEventListener('click', this._handleBackdropClick);
      input?.addEventListener('input', this._handleSearchInput);
      container?.addEventListener('keydown', this._handleKeyDown);
      
      // Handle item clicks
      const items = this.shadowRoot.querySelectorAll('.command-dialog__item');
      items.forEach((item, index) => {
        item.addEventListener('click', () => {
          this._selectedIndex = index;
          this._executeSelectedCommand();
        });
      });
    }
  }

  /**
   * Render results list
   * @private
   * @returns {string} HTML for results
   */
  _renderResults() {
    if (this._filteredCommands.length === 0) {
      return `
        <div class="command-dialog__empty" part="empty">
          <span class="command-dialog__empty-icon">🔍</span>
          <p class="command-dialog__empty-text">No commands found</p>
          ${this._searchQuery ? `<p class="command-dialog__empty-hint">Try a different search term</p>` : ''}
        </div>
      `;
    }
    
    return this._filteredCommands
      .map((command, index) => {
        const selected = index === this._selectedIndex ? 'command-dialog__item--selected' : '';
        const icon = command.icon || '⚡';
        
        return `
          <div
            class="command-dialog__item ${selected}"
            part="item ${selected ? 'item-selected' : ''}"
            role="option"
            aria-selected="${index === this._selectedIndex}"
            data-command-id="${command.id}"
          >
            <span class="command-dialog__item-icon" part="item-icon">${icon}</span>
            <div class="command-dialog__item-content">
              <div class="command-dialog__item-label" part="item-label">${this._escapeHtml(command.label)}</div>
              ${command.description ? `<div class="command-dialog__item-description" part="item-description">${this._escapeHtml(command.description)}</div>` : ''}
            </div>
            ${command.shortcut ? `<kbd class="command-dialog__item-shortcut" part="item-shortcut">${this._escapeHtml(command.shortcut)}</kbd>` : ''}
          </div>
        `;
      })
      .join('');
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get component styles
   * @private
   * @returns {string} CSS styles
   */
  _getStyles() {
    return `
      :host {
        --dialog-z-index: 9999;
        --dialog-backdrop-bg: rgba(0, 0, 0, 0.5);
        --dialog-bg: #ffffff;
        --dialog-border: #e5e7eb;
        --dialog-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        --dialog-width: 640px;
        --dialog-max-height: 400px;
        --dialog-border-radius: 12px;
        
        --search-bg: #ffffff;
        --search-border: #e5e7eb;
        --search-focus-border: #3b82f6;
        --search-text: #111827;
        --search-placeholder: #9ca3af;
        
        --item-hover-bg: #f3f4f6;
        --item-selected-bg: #eff6ff;
        --item-selected-border: #3b82f6;
        --item-text: #111827;
        --item-description: #6b7280;
        
        --kbd-bg: #f3f4f6;
        --kbd-border: #d1d5db;
        --kbd-text: #6b7280;
        
        --transition-duration: 150ms;
        --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .command-dialog__backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: var(--dialog-z-index);
        background: var(--dialog-backdrop-bg);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 20vh;
        opacity: 0;
        visibility: hidden;
        transition: opacity var(--transition-duration) var(--transition-timing),
                    visibility var(--transition-duration) var(--transition-timing);
        backdrop-filter: blur(4px);
      }

      .command-dialog__backdrop.visible {
        opacity: 1;
        visibility: visible;
      }

      .command-dialog__container {
        width: var(--dialog-width);
        max-width: calc(100vw - 32px);
        max-height: var(--dialog-max-height);
        background: var(--dialog-bg);
        border: 1px solid var(--dialog-border);
        border-radius: var(--dialog-border-radius);
        box-shadow: var(--dialog-shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.95) translateY(-10px);
        transition: transform var(--transition-duration) var(--transition-timing);
      }

      .command-dialog__backdrop.visible .command-dialog__container {
        transform: scale(1) translateY(0);
      }

      .command-dialog__search {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid var(--search-border);
        background: var(--search-bg);
      }

      .command-dialog__search-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .command-dialog__search-input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 16px;
        font-family: inherit;
        color: var(--search-text);
        background: transparent;
      }

      .command-dialog__search-input::placeholder {
        color: var(--search-placeholder);
      }

      .command-dialog__shortcut {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        font-size: 12px;
        font-family: monospace;
        font-weight: 600;
        color: var(--kbd-text);
        background: var(--kbd-bg);
        border: 1px solid var(--kbd-border);
        border-radius: 4px;
        flex-shrink: 0;
      }

      .command-dialog__results {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 200px;
      }

      .command-dialog__results::-webkit-scrollbar {
        width: 8px;
      }

      .command-dialog__results::-webkit-scrollbar-track {
        background: transparent;
      }

      .command-dialog__results::-webkit-scrollbar-thumb {
        background: var(--dialog-border);
        border-radius: 4px;
      }

      .command-dialog__results::-webkit-scrollbar-thumb:hover {
        background: var(--kbd-border);
      }

      .command-dialog__item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color var(--transition-duration) var(--transition-timing);
        border-left: 2px solid transparent;
      }

      .command-dialog__item:hover {
        background: var(--item-hover-bg);
      }

      .command-dialog__item--selected {
        background: var(--item-selected-bg);
        border-left-color: var(--item-selected-border);
      }

      .command-dialog__item-icon {
        font-size: 20px;
        flex-shrink: 0;
        width: 24px;
        text-align: center;
      }

      .command-dialog__item-content {
        flex: 1;
        min-width: 0;
      }

      .command-dialog__item-label {
        font-size: 14px;
        font-weight: 500;
        color: var(--item-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .command-dialog__item-description {
        font-size: 12px;
        color: var(--item-description);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 2px;
      }

      .command-dialog__item-shortcut {
        flex-shrink: 0;
      }

      .command-dialog__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
      }

      .command-dialog__empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .command-dialog__empty-text {
        font-size: 16px;
        font-weight: 500;
        color: var(--item-text);
        margin-bottom: 8px;
      }

      .command-dialog__empty-hint {
        font-size: 14px;
        color: var(--item-description);
      }

      .command-dialog__footer {
        padding: 12px 16px;
        border-top: 1px solid var(--dialog-border);
        background: var(--search-bg);
      }

      .command-dialog__hint {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--item-description);
      }

      .command-dialog__hint kbd {
        padding: 2px 6px;
        font-size: 11px;
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --dialog-backdrop-bg: rgba(0, 0, 0, 0.75);
          --dialog-bg: #1f2937;
          --dialog-border: #374151;
          
          --search-bg: #1f2937;
          --search-border: #374151;
          --search-text: #f9fafb;
          --search-placeholder: #6b7280;
          
          --item-hover-bg: #374151;
          --item-selected-bg: #1e3a8a;
          --item-text: #f9fafb;
          --item-description: #9ca3af;
          
          --kbd-bg: #374151;
          --kbd-border: #4b5563;
          --kbd-text: #9ca3af;
        }
      }

      @media (max-width: 768px) {
        .command-dialog__backdrop {
          padding-top: 10vh;
        }

        :host {
          --dialog-width: 100%;
          --dialog-max-height: 60vh;
        }

        .command-dialog__container {
          border-radius: 12px 12px 0 0;
        }
      }
    `;
  }
}

/**
 * @typedef {Object} Command
 * @property {string} id - Unique command identifier
 * @property {string} label - Display label
 * @property {string} [description] - Command description
 * @property {string[]} [keywords] - Search keywords
 * @property {string} [icon] - Icon emoji or character
 * @property {string} [shortcut] - Keyboard shortcut display
 * @property {Function} [action] - Action to execute
 */

customElements.define('command-dialog', CommandDialog);

export { CommandDialog };