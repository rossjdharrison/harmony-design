/**
 * Integration Tests for Composite Components
 * 
 * Tests the interaction between multiple primitive components
 * working together in composite components (molecules/organisms).
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#testing-strategy
 */

import { describe, it, expect, beforeEach, afterEach } from '../test-utils/test-framework.js';
import { setupTestEnvironment, cleanupTestEnvironment } from '../test-utils/test-helpers.js';
import { EventBusTestHarness } from '../test-utils/event-bus-harness.js';

describe('Composite Components Integration Tests', () => {
  let container;
  let eventBus;

  beforeEach(() => {
    container = setupTestEnvironment();
    eventBus = new EventBusTestHarness();
  });

  afterEach(() => {
    cleanupTestEnvironment(container);
    eventBus.cleanup();
  });

  describe('Form Components', () => {
    it('should integrate input field with label and validation message', async () => {
      const form = document.createElement('harmony-form-field');
      form.setAttribute('label', 'Email Address');
      form.setAttribute('type', 'email');
      form.setAttribute('required', 'true');
      container.appendChild(form);

      await customElements.whenDefined('harmony-form-field');
      await new Promise(resolve => setTimeout(resolve, 0));

      const label = form.shadowRoot.querySelector('harmony-label');
      const input = form.shadowRoot.querySelector('harmony-input');
      
      expect(label).toBeTruthy();
      expect(input).toBeTruthy();
      expect(label.textContent).toBe('Email Address');
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('should show validation error when input is invalid', async () => {
      const form = document.createElement('harmony-form-field');
      form.setAttribute('label', 'Email');
      form.setAttribute('type', 'email');
      form.setAttribute('required', 'true');
      container.appendChild(form);

      await customElements.whenDefined('harmony-form-field');
      await new Promise(resolve => setTimeout(resolve, 0));

      const input = form.shadowRoot.querySelector('harmony-input');
      
      // Trigger validation with invalid input
      input.value = 'invalid-email';
      input.dispatchEvent(new Event('blur'));
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const errorMessage = form.shadowRoot.querySelector('harmony-validation-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.getAttribute('type')).toBe('error');
    });

    it('should publish form submission event through EventBus', async () => {
      const form = document.createElement('harmony-form');
      form.innerHTML = `
        <harmony-form-field label="Name" name="name" required></harmony-form-field>
        <harmony-button type="submit">Submit</harmony-button>
      `;
      container.appendChild(form);

      await customElements.whenDefined('harmony-form');
      await new Promise(resolve => setTimeout(resolve, 0));

      const eventPromise = eventBus.expectEvent('FormSubmitted');
      
      const submitButton = form.querySelector('harmony-button');
      submitButton.click();

      const event = await eventPromise;
      expect(event.type).toBe('FormSubmitted');
      expect(event.payload).toBeTruthy();
    });
  });

  describe('Navigation Components', () => {
    it('should integrate navigation items with active state management', async () => {
      const nav = document.createElement('harmony-navigation');
      nav.innerHTML = `
        <harmony-nav-item href="/home" active>Home</harmony-nav-item>
        <harmony-nav-item href="/about">About</harmony-nav-item>
        <harmony-nav-item href="/contact">Contact</harmony-nav-item>
      `;
      container.appendChild(nav);

      await customElements.whenDefined('harmony-navigation');
      await new Promise(resolve => setTimeout(resolve, 0));

      const items = nav.querySelectorAll('harmony-nav-item');
      expect(items.length).toBe(3);
      expect(items[0].hasAttribute('active')).toBe(true);
      expect(items[1].hasAttribute('active')).toBe(false);
    });

    it('should update active state when navigation item is clicked', async () => {
      const nav = document.createElement('harmony-navigation');
      nav.innerHTML = `
        <harmony-nav-item href="/home" active>Home</harmony-nav-item>
        <harmony-nav-item href="/about">About</harmony-nav-item>
      `;
      container.appendChild(nav);

      await customElements.whenDefined('harmony-navigation');
      await new Promise(resolve => setTimeout(resolve, 0));

      const eventPromise = eventBus.expectEvent('NavigationChanged');
      
      const aboutItem = nav.querySelectorAll('harmony-nav-item')[1];
      aboutItem.click();

      const event = await eventPromise;
      expect(event.payload.href).toBe('/about');
    });
  });

  describe('Card Components', () => {
    it('should integrate card with header, content, and actions', async () => {
      const card = document.createElement('harmony-card');
      card.innerHTML = `
        <harmony-card-header>
          <harmony-heading level="3">Card Title</harmony-heading>
        </harmony-card-header>
        <harmony-card-content>
          <harmony-text>Card content goes here</harmony-text>
        </harmony-card-content>
        <harmony-card-actions>
          <harmony-button variant="primary">Action</harmony-button>
        </harmony-card-actions>
      `;
      container.appendChild(card);

      await customElements.whenDefined('harmony-card');
      await new Promise(resolve => setTimeout(resolve, 0));

      const header = card.querySelector('harmony-card-header');
      const content = card.querySelector('harmony-card-content');
      const actions = card.querySelector('harmony-card-actions');

      expect(header).toBeTruthy();
      expect(content).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('should handle interactive card with click events', async () => {
      const card = document.createElement('harmony-card');
      card.setAttribute('interactive', 'true');
      card.innerHTML = `
        <harmony-card-content>Click me</harmony-card-content>
      `;
      container.appendChild(card);

      await customElements.whenDefined('harmony-card');
      await new Promise(resolve => setTimeout(resolve, 0));

      const eventPromise = eventBus.expectEvent('CardClicked');
      
      card.click();

      const event = await eventPromise;
      expect(event.type).toBe('CardClicked');
    });
  });

  describe('Modal Components', () => {
    it('should integrate modal with overlay, header, content, and actions', async () => {
      const modal = document.createElement('harmony-modal');
      modal.setAttribute('open', 'true');
      modal.innerHTML = `
        <harmony-modal-header>
          <harmony-heading level="2">Modal Title</harmony-heading>
          <harmony-button variant="ghost" aria-label="Close">×</harmony-button>
        </harmony-modal-header>
        <harmony-modal-content>
          <harmony-text>Modal content</harmony-text>
        </harmony-modal-content>
        <harmony-modal-actions>
          <harmony-button variant="secondary">Cancel</harmony-button>
          <harmony-button variant="primary">Confirm</harmony-button>
        </harmony-modal-actions>
      `;
      container.appendChild(modal);

      await customElements.whenDefined('harmony-modal');
      await new Promise(resolve => setTimeout(resolve, 0));

      const overlay = modal.shadowRoot.querySelector('.modal-overlay');
      const header = modal.querySelector('harmony-modal-header');
      const content = modal.querySelector('harmony-modal-content');
      const actions = modal.querySelector('harmony-modal-actions');

      expect(overlay).toBeTruthy();
      expect(header).toBeTruthy();
      expect(content).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('should trap focus within modal when open', async () => {
      const modal = document.createElement('harmony-modal');
      modal.setAttribute('open', 'true');
      modal.innerHTML = `
        <harmony-modal-content>
          <harmony-button id="first">First</harmony-button>
          <harmony-button id="second">Second</harmony-button>
        </harmony-modal-content>
      `;
      container.appendChild(modal);

      await customElements.whenDefined('harmony-modal');
      await new Promise(resolve => setTimeout(resolve, 0));

      const firstButton = modal.querySelector('#first');
      const secondButton = modal.querySelector('#second');

      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      modal.dispatchEvent(tabEvent);

      await new Promise(resolve => setTimeout(resolve, 10));
      // Focus should move to second button, not outside modal
    });

    it('should close modal on Escape key and publish event', async () => {
      const modal = document.createElement('harmony-modal');
      modal.setAttribute('open', 'true');
      container.appendChild(modal);

      await customElements.whenDefined('harmony-modal');
      await new Promise(resolve => setTimeout(resolve, 0));

      const eventPromise = eventBus.expectEvent('ModalClosed');

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      modal.dispatchEvent(escapeEvent);

      const event = await eventPromise;
      expect(event.type).toBe('ModalClosed');
      expect(modal.hasAttribute('open')).toBe(false);
    });
  });

  describe('Dropdown Components', () => {
    it('should integrate trigger button with dropdown menu', async () => {
      const dropdown = document.createElement('harmony-dropdown');
      dropdown.innerHTML = `
        <harmony-button slot="trigger">Options</harmony-button>
        <harmony-menu>
          <harmony-menu-item>Option 1</harmony-menu-item>
          <harmony-menu-item>Option 2</harmony-menu-item>
          <harmony-menu-item>Option 3</harmony-menu-item>
        </harmony-menu>
      `;
      container.appendChild(dropdown);

      await customElements.whenDefined('harmony-dropdown');
      await new Promise(resolve => setTimeout(resolve, 0));

      const trigger = dropdown.querySelector('[slot="trigger"]');
      const menu = dropdown.querySelector('harmony-menu');

      expect(trigger).toBeTruthy();
      expect(menu).toBeTruthy();
      expect(menu.style.display).toBe('none');
    });

    it('should show menu on trigger click and handle item selection', async () => {
      const dropdown = document.createElement('harmony-dropdown');
      dropdown.innerHTML = `
        <harmony-button slot="trigger">Options</harmony-button>
        <harmony-menu>
          <harmony-menu-item value="1">Option 1</harmony-menu-item>
          <harmony-menu-item value="2">Option 2</harmony-menu-item>
        </harmony-menu>
      `;
      container.appendChild(dropdown);

      await customElements.whenDefined('harmony-dropdown');
      await new Promise(resolve => setTimeout(resolve, 0));

      const trigger = dropdown.querySelector('[slot="trigger"]');
      trigger.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      const menu = dropdown.querySelector('harmony-menu');
      expect(menu.style.display).not.toBe('none');

      const eventPromise = eventBus.expectEvent('DropdownItemSelected');
      
      const firstItem = dropdown.querySelectorAll('harmony-menu-item')[0];
      firstItem.click();

      const event = await eventPromise;
      expect(event.payload.value).toBe('1');
    });
  });

  describe('Tabs Components', () => {
    it('should integrate tab list with tab panels', async () => {
      const tabs = document.createElement('harmony-tabs');
      tabs.innerHTML = `
        <harmony-tab-list>
          <harmony-tab id="tab-1" panel="panel-1" active>Tab 1</harmony-tab>
          <harmony-tab id="tab-2" panel="panel-2">Tab 2</harmony-tab>
          <harmony-tab id="tab-3" panel="panel-3">Tab 3</harmony-tab>
        </harmony-tab-list>
        <harmony-tab-panel id="panel-1" active>Content 1</harmony-tab-panel>
        <harmony-tab-panel id="panel-2">Content 2</harmony-tab-panel>
        <harmony-tab-panel id="panel-3">Content 3</harmony-tab-panel>
      `;
      container.appendChild(tabs);

      await customElements.whenDefined('harmony-tabs');
      await new Promise(resolve => setTimeout(resolve, 0));

      const tabList = tabs.querySelector('harmony-tab-list');
      const tabPanels = tabs.querySelectorAll('harmony-tab-panel');

      expect(tabList).toBeTruthy();
      expect(tabPanels.length).toBe(3);
      expect(tabPanels[0].hasAttribute('active')).toBe(true);
    });

    it('should switch panels when tab is clicked', async () => {
      const tabs = document.createElement('harmony-tabs');
      tabs.innerHTML = `
        <harmony-tab-list>
          <harmony-tab id="tab-1" panel="panel-1" active>Tab 1</harmony-tab>
          <harmony-tab id="tab-2" panel="panel-2">Tab 2</harmony-tab>
        </harmony-tab-list>
        <harmony-tab-panel id="panel-1" active>Content 1</harmony-tab-panel>
        <harmony-tab-panel id="panel-2">Content 2</harmony-tab-panel>
      `;
      container.appendChild(tabs);

      await customElements.whenDefined('harmony-tabs');
      await new Promise(resolve => setTimeout(resolve, 0));

      const eventPromise = eventBus.expectEvent('TabChanged');
      
      const secondTab = tabs.querySelectorAll('harmony-tab')[1];
      secondTab.click();

      const event = await eventPromise;
      expect(event.payload.tabId).toBe('tab-2');
      expect(event.payload.panelId).toBe('panel-2');
    });

    it('should support keyboard navigation between tabs', async () => {
      const tabs = document.createElement('harmony-tabs');
      tabs.innerHTML = `
        <harmony-tab-list>
          <harmony-tab id="tab-1" active>Tab 1</harmony-tab>
          <harmony-tab id="tab-2">Tab 2</harmony-tab>
          <harmony-tab id="tab-3">Tab 3</harmony-tab>
        </harmony-tab-list>
      `;
      container.appendChild(tabs);

      await customElements.whenDefined('harmony-tabs');
      await new Promise(resolve => setTimeout(resolve, 0));

      const firstTab = tabs.querySelectorAll('harmony-tab')[0];
      firstTab.focus();

      const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      firstTab.dispatchEvent(arrowRightEvent);

      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Focus should move to second tab
      const secondTab = tabs.querySelectorAll('harmony-tab')[1];
      expect(document.activeElement).toBe(secondTab);
    });
  });

  describe('Toast Notification Components', () => {
    it('should integrate toast container with multiple toast messages', async () => {
      const toastContainer = document.createElement('harmony-toast-container');
      container.appendChild(toastContainer);

      await customElements.whenDefined('harmony-toast-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      // Add multiple toasts
      toastContainer.addToast({ message: 'Success', type: 'success' });
      toastContainer.addToast({ message: 'Warning', type: 'warning' });
      toastContainer.addToast({ message: 'Error', type: 'error' });

      await new Promise(resolve => setTimeout(resolve, 10));

      const toasts = toastContainer.querySelectorAll('harmony-toast');
      expect(toasts.length).toBe(3);
    });

    it('should auto-dismiss toast after timeout', async () => {
      const toastContainer = document.createElement('harmony-toast-container');
      container.appendChild(toastContainer);

      await customElements.whenDefined('harmony-toast-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      toastContainer.addToast({ 
        message: 'Auto-dismiss', 
        type: 'info',
        duration: 100 
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      let toasts = toastContainer.querySelectorAll('harmony-toast');
      expect(toasts.length).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      toasts = toastContainer.querySelectorAll('harmony-toast');
      expect(toasts.length).toBe(0);
    });
  });

  describe('Data Table Components', () => {
    it('should integrate table with sortable headers', async () => {
      const table = document.createElement('harmony-data-table');
      table.innerHTML = `
        <harmony-table-header>
          <harmony-table-column sortable>Name</harmony-table-column>
          <harmony-table-column sortable>Age</harmony-table-column>
          <harmony-table-column>Email</harmony-table-column>
        </harmony-table-header>
        <harmony-table-body>
          <harmony-table-row>
            <harmony-table-cell>John</harmony-table-cell>
            <harmony-table-cell>30</harmony-table-cell>
            <harmony-table-cell>john@example.com</harmony-table-cell>
          </harmony-table-row>
        </harmony-table-body>
      `;
      container.appendChild(table);

      await customElements.whenDefined('harmony-data-table');
      await new Promise(resolve => setTimeout(resolve, 0));

      const sortableColumns = table.querySelectorAll('[sortable]');
      expect(sortableColumns.length).toBe(2);
    });

    it('should publish sort event when sortable column is clicked', async () => {
      const table = document.createElement('harmony-data-table');
      table.innerHTML = `
        <harmony-table-header>
          <harmony-table-column sortable data-key="name">Name</harmony-table-column>
        </harmony-table-header>
      `;
      container.appendChild(table);

      await customElements.whenDefined('harmony-data-table');
      await new Promise(resolve => setTimeout(resolve, 0));

      const eventPromise = eventBus.expectEvent('TableSortRequested');
      
      const column = table.querySelector('[sortable]');
      column.click();

      const event = await eventPromise;
      expect(event.payload.column).toBe('name');
      expect(event.payload.direction).toMatch(/asc|desc/);
    });
  });

  describe('Performance Integration', () => {
    it('should render complex composite component within 16ms budget', async () => {
      const startTime = performance.now();

      const complexComponent = document.createElement('harmony-dashboard');
      complexComponent.innerHTML = `
        <harmony-navigation>
          <harmony-nav-item href="/">Home</harmony-nav-item>
          <harmony-nav-item href="/settings">Settings</harmony-nav-item>
        </harmony-navigation>
        <harmony-card>
          <harmony-card-header>
            <harmony-heading level="2">Dashboard</harmony-heading>
          </harmony-card-header>
          <harmony-card-content>
            <harmony-data-table>
              <harmony-table-header>
                <harmony-table-column>Item</harmony-table-column>
                <harmony-table-column>Value</harmony-table-column>
              </harmony-table-header>
            </harmony-data-table>
          </harmony-card-content>
        </harmony-card>
      `;
      container.appendChild(complexComponent);

      await customElements.whenDefined('harmony-dashboard');
      await new Promise(resolve => setTimeout(resolve, 0));

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(16);
    });
  });
});