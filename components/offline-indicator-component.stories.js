/**
 * @fileoverview Storybook stories for Offline Indicator Component
 * Demonstrates various states and interactions of the offline indicator.
 */

import './offline-indicator-component.js';

export default {
  title: 'Components/Offline Indicator',
  component: 'offline-indicator-component',
  parameters: {
    docs: {
      description: {
        component: 'Shows offline status and pending sync count to inform users about network state and queued operations.'
      }
    }
  },
  argTypes: {
    online: {
      control: 'boolean',
      description: 'Network online status',
      defaultValue: true
    },
    pendingCount: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Number of pending mutations',
      defaultValue: 0
    },
    syncing: {
      control: 'boolean',
      description: 'Whether sync is in progress',
      defaultValue: false
    },
    syncProgress: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Sync progress percentage',
      defaultValue: 0
    },
    hasError: {
      control: 'boolean',
      description: 'Whether there is a sync error',
      defaultValue: false
    }
  }
};

// Mock EventBus for stories
const createMockEventBus = () => {
  const subscribers = new Map();
  
  return {
    subscribe(eventType, handler) {
      if (!subscribers.has(eventType)) {
        subscribers.set(eventType, new Set());
      }
      subscribers.get(eventType).add(handler);
    },
    unsubscribe(eventType, handler) {
      if (subscribers.has(eventType)) {
        subscribers.get(eventType).delete(handler);
      }
    },
    publish(eventType, payload) {
      if (subscribers.has(eventType)) {
        subscribers.get(eventType).forEach(handler => handler(payload));
      }
    }
  };
};

const Template = (args) => {
  // Setup mock EventBus
  if (!window.eventBus) {
    window.eventBus = createMockEventBus();
  }

  const container = document.createElement('div');
  container.style.minHeight = '200px';
  container.style.position = 'relative';
  
  const component = document.createElement('offline-indicator-component');
  container.appendChild(component);

  // Simulate state after component is connected
  setTimeout(() => {
    const eventBus = window.eventBus;
    
    // Send network status
    eventBus.publish('network:status-changed', {
      status: {
        online: args.online,
        effectiveType: args.online ? '4g' : 'offline',
        downlink: args.online ? 10 : 0,
        rtt: args.online ? 50 : 0
      }
    });

    // Send queue status
    eventBus.publish('offline-queue:updated', {
      queue: {
        pendingCount: args.pendingCount,
        failedCount: 0,
        mutations: []
      }
    });

    // Send sync progress if syncing
    if (args.syncing) {
      eventBus.publish('sync:progress', {
        progress: {
          inProgress: true,
          completed: Math.floor(args.pendingCount * (args.syncProgress / 100)),
          total: args.pendingCount
        }
      });
    }

    // Send error if has error
    if (args.hasError) {
      eventBus.publish('sync:failed', {
        error: 'Failed to sync changes. Please try again.'
      });
    }
  }, 100);

  return container;
};

export const Online = Template.bind({});
Online.args = {
  online: true,
  pendingCount: 0,
  syncing: false,
  syncProgress: 0,
  hasError: false
};

export const Offline = Template.bind({});
Offline.args = {
  online: false,
  pendingCount: 0,
  syncing: false,
  syncProgress: 0,
  hasError: false
};

export const OfflineWithPending = Template.bind({});
OfflineWithPending.args = {
  online: false,
  pendingCount: 5,
  syncing: false,
  syncProgress: 0,
  hasError: false
};

export const Syncing = Template.bind({});
Syncing.args = {
  online: true,
  pendingCount: 10,
  syncing: true,
  syncProgress: 50,
  hasError: false
};

export const SyncError = Template.bind({});
SyncError.args = {
  online: true,
  pendingCount: 3,
  syncing: false,
  syncProgress: 0,
  hasError: true
};

export const Interactive = () => {
  if (!window.eventBus) {
    window.eventBus = createMockEventBus();
  }

  const container = document.createElement('div');
  container.style.minHeight = '400px';
  container.style.position = 'relative';
  
  const component = document.createElement('offline-indicator-component');
  container.appendChild(component);

  // Create control panel
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 16px; background: #f5f5f5; border-radius: 8px; margin-bottom: 16px;';
  controls.innerHTML = `
    <h3 style="margin: 0 0 12px 0;">Controls</h3>
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <button id="toggle-online" style="padding: 8px 16px; cursor: pointer;">Toggle Online/Offline</button>
      <button id="add-pending" style="padding: 8px 16px; cursor: pointer;">Add Pending Item</button>
      <button id="start-sync" style="padding: 8px 16px; cursor: pointer;">Start Sync</button>
      <button id="trigger-error" style="padding: 8px 16px; cursor: pointer;">Trigger Error</button>
      <button id="clear-all" style="padding: 8px 16px; cursor: pointer;">Clear All</button>
    </div>
    <div style="margin-top: 12px; font-size: 14px;">
      <strong>Status:</strong> <span id="status-display">Online, 0 pending</span>
    </div>
  `;
  
  container.insertBefore(controls, component);

  // State
  let state = {
    online: true,
    pendingCount: 0,
    syncing: false
  };

  const updateStatus = () => {
    const statusDisplay = controls.querySelector('#status-display');
    statusDisplay.textContent = `${state.online ? 'Online' : 'Offline'}, ${state.pendingCount} pending${state.syncing ? ', syncing...' : ''}`;
  };

  const publishState = () => {
    const eventBus = window.eventBus;
    
    eventBus.publish('network:status-changed', {
      status: {
        online: state.online,
        effectiveType: state.online ? '4g' : 'offline',
        downlink: state.online ? 10 : 0,
        rtt: state.online ? 50 : 0
      }
    });

    eventBus.publish('offline-queue:updated', {
      queue: {
        pendingCount: state.pendingCount,
        failedCount: 0,
        mutations: []
      }
    });

    if (state.syncing) {
      eventBus.publish('sync:progress', {
        progress: {
          inProgress: true,
          completed: 0,
          total: state.pendingCount
        }
      });
    }

    updateStatus();
  };

  // Event handlers
  controls.querySelector('#toggle-online').addEventListener('click', () => {
    state.online = !state.online;
    publishState();
  });

  controls.querySelector('#add-pending').addEventListener('click', () => {
    state.pendingCount++;
    publishState();
  });

  controls.querySelector('#start-sync').addEventListener('click', () => {
    if (state.pendingCount === 0) return;
    
    state.syncing = true;
    publishState();

    // Simulate sync progress
    let completed = 0;
    const interval = setInterval(() => {
      completed++;
      
      window.eventBus.publish('sync:progress', {
        progress: {
          inProgress: true,
          completed: completed,
          total: state.pendingCount
        }
      });

      if (completed >= state.pendingCount) {
        clearInterval(interval);
        state.syncing = false;
        state.pendingCount = 0;
        
        window.eventBus.publish('sync:completed', {
          timestamp: Date.now()
        });
        
        publishState();
      }
    }, 500);
  });

  controls.querySelector('#trigger-error').addEventListener('click', () => {
    state.syncing = false;
    window.eventBus.publish('sync:failed', {
      error: 'Failed to sync changes. Network error occurred.'
    });
    updateStatus();
  });

  controls.querySelector('#clear-all').addEventListener('click', () => {
    state.online = true;
    state.pendingCount = 0;
    state.syncing = false;
    publishState();
  });

  // Subscribe to retry events
  window.eventBus.subscribe('offline-indicator:retry-sync', () => {
    console.log('Retry sync requested');
    if (state.pendingCount > 0) {
      controls.querySelector('#start-sync').click();
    }
  });

  // Initial state
  setTimeout(() => publishState(), 100);

  return container;
};