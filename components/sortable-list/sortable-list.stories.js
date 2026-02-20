/**
 * @fileoverview Storybook stories for Sortable List component
 * @module components/sortable-list/stories
 */

export default {
  title: 'Components/Sortable List',
  component: 'sortable-list',
  parameters: {
    docs: {
      description: {
        component: 'A drag-to-reorder list with smooth GPU-accelerated animations. Supports both mouse and touch interactions.'
      }
    }
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disable drag-to-reorder functionality'
    },
    animationDuration: {
      control: { type: 'number', min: 0, max: 1000, step: 50 },
      description: 'Animation duration in milliseconds'
    }
  }
};

const Template = (args) => {
  const container = document.createElement('div');
  
  const sortableList = document.createElement('sortable-list');
  if (args.disabled) sortableList.setAttribute('disabled', '');
  if (args.animationDuration) sortableList.setAttribute('animation-duration', args.animationDuration);

  // Create sample items
  const items = args.items || [
    { id: '1', text: 'First Item', color: '#e3f2fd' },
    { id: '2', text: 'Second Item', color: '#f3e5f5' },
    { id: '3', text: 'Third Item', color: '#e8f5e9' },
    { id: '4', text: 'Fourth Item', color: '#fff3e0' },
    { id: '5', text: 'Fifth Item', color: '#fce4ec' }
  ];

  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.dataset.id = item.id;
    itemElement.style.cssText = `
      padding: 16px;
      margin: 8px 0;
      background: ${item.color};
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: box-shadow 200ms ease;
    `;
    itemElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="20" height="20" viewBox="0 0 20 20" style="opacity: 0.5;">
          <circle cx="6" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="14" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="6" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="14" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="6" cy="15" r="1.5" fill="currentColor"/>
          <circle cx="14" cy="15" r="1.5" fill="currentColor"/>
        </svg>
        <strong>${item.text}</strong>
      </div>
    `;
    sortableList.appendChild(itemElement);
  });

  // Event logging
  const eventLog = document.createElement('div');
  eventLog.style.cssText = `
    margin-top: 24px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    max-height: 200px;
    overflow-y: auto;
  `;
  eventLog.innerHTML = '<strong>Event Log:</strong><div id="log-content"></div>';

  const logContent = eventLog.querySelector('#log-content');

  sortableList.addEventListener('sortable-list:drag-start', (e) => {
    const entry = document.createElement('div');
    entry.style.color = '#1976d2';
    entry.textContent = `▶ Drag Start: ${e.detail.item} at index ${e.detail.index}`;
    logContent.insertBefore(entry, logContent.firstChild);
  });

  sortableList.addEventListener('sortable-list:reorder', (e) => {
    const entry = document.createElement('div');
    entry.style.color = '#388e3c';
    entry.textContent = `✓ Reorder: ${e.detail.item} from ${e.detail.fromIndex} to ${e.detail.toIndex}`;
    logContent.insertBefore(entry, logContent.firstChild);
  });

  sortableList.addEventListener('sortable-list:drag-end', (e) => {
    const entry = document.createElement('div');
    entry.style.color = '#757575';
    entry.textContent = `■ Drag End: ${e.detail.item} at index ${e.detail.index}`;
    logContent.insertBefore(entry, logContent.firstChild);
  });

  container.appendChild(sortableList);
  container.appendChild(eventLog);

  return container;
};

export const Default = Template.bind({});
Default.args = {
  disabled: false,
  animationDuration: 200
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  animationDuration: 200
};

export const FastAnimation = Template.bind({});
FastAnimation.args = {
  disabled: false,
  animationDuration: 100
};
FastAnimation.parameters = {
  docs: {
    description: {
      story: 'Sortable list with faster animation (100ms)'
    }
  }
};

export const SlowAnimation = Template.bind({});
SlowAnimation.args = {
  disabled: false,
  animationDuration: 400
};
SlowAnimation.parameters = {
  docs: {
    description: {
      story: 'Sortable list with slower animation (400ms)'
    }
  }
};

export const ManyItems = Template.bind({});
ManyItems.args = {
  disabled: false,
  animationDuration: 200,
  items: Array.from({ length: 12 }, (_, i) => ({
    id: `item-${i + 1}`,
    text: `Item ${i + 1}`,
    color: `hsl(${(i * 30) % 360}, 70%, 90%)`
  }))
};
ManyItems.parameters = {
  docs: {
    description: {
      story: 'Sortable list with many items to test performance'
    }
  }
};