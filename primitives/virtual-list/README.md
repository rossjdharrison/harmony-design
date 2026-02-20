# Virtual List Component

Efficient virtualized list rendering for large datasets with variable item heights.

## Features

- **Performance Optimized**: Only renders visible items + buffer
- **Variable Heights**: Automatically measures and caches item heights
- **Smooth Scrolling**: Maintains 60fps during scroll
- **Memory Efficient**: Handles 10k+ items without performance degradation
- **Flexible Templates**: Support for custom item rendering
- **Accessibility**: Proper ARIA attributes and keyboard navigation

## Usage

### Basic Example

\`\`\`html
<virtual-list id="myList" buffer-size="5" estimated-item-height="60">
  <template data-item-template>
    <div class="item">
      <h3>\${item.title}</h3>
      <p>\${item.description}</p>
    </div>
  </template>
</virtual-list>

<script type="module">
  import './primitives/virtual-list/virtual-list.js';
  
  const list = document.getElementById('myList');
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    title: \`Item \${i}\`,
    description: \`Description for item \${i}\`
  }));
  
  list.setItems(items);
</script>
\`\`\`

### Scroll to Item

\`\`\`javascript
// Scroll to item at index 500
list.scrollToIndex(500, 'center');
\`\`\`

### Dynamic Updates

\`\`\`javascript
// Update items
const newItems = [...items, { id: 10000, title: 'New Item' }];
list.setItems(newItems);

// Force remeasurement (e.g., after CSS changes)
list.remeasure();
\`\`\`

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `buffer-size` | number | 3 | Number of items to render outside viewport |
| `estimated-item-height` | number | 50 | Initial height estimate for unmeasured items |
| `item-key` | string | 'id' | Property name to use as unique key |

## Events

### `virtual-list:scroll`

Dispatched during scroll with visible range information.

\`\`\`javascript
list.addEventListener('virtual-list:scroll', (e) => {
  console.log('Scroll position:', e.detail.scrollTop);
  console.log('Visible range:', e.detail.visibleRange);
});
\`\`\`

### `virtual-list:items-rendered`

Dispatched after rendering with item count.

\`\`\`javascript
list.addEventListener('virtual-list:items-rendered', (e) => {
  console.log('Rendered items:', e.detail.count);
  console.log('Range:', e.detail.range);
});
\`\`\`

## Methods

### `setItems(items: Array)`

Set the data items to render.

### `getItems(): Array`

Get current items array.

### `scrollToIndex(index: number, align?: string)`

Scroll to specific item. Align options: 'start', 'center', 'end'.

### `remeasure()`

Force remeasurement of all items.

## CSS Custom Properties

\`\`\`css
virtual-list {
  --virtual-list-bg: #ffffff;
  --virtual-list-scrollbar-width: 8px;
  --virtual-list-scrollbar-track: #f5f5f5;
  --virtual-list-scrollbar-thumb: #cccccc;
  --virtual-list-scrollbar-thumb-hover: #999999;
  --virtual-list-item-padding: 12px;
  --virtual-list-item-border: 1px solid #e0e0e0;
}
\`\`\`

## CSS Parts

- `container`: The scrollable container
- `spacer`: The spacer element that defines total height
- `content`: The content wrapper for items
- `item`: Individual item wrapper

## Performance Characteristics

- **Render Budget**: < 16ms per frame (60fps target)
- **Memory**: O(visible items) not O(total items)
- **Scroll Performance**: Constant time O(1) for range calculation
- **Measurement**: Lazy measurement with caching

## Implementation Notes

- Uses `position: absolute` with `transform: translateY()` for GPU acceleration
- Binary search for efficient start index calculation
- ResizeObserver for viewport size tracking
- RequestAnimationFrame for batched updates
- Map-based caching for O(1) height/offset lookups

## Related Documentation

See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) § Virtual List for architecture details.
\`\`\`
--- END FILE ---

--- FILE: primitives/virtual-list/virtual-list.stories.js ---
```javascript
/**
 * @fileoverview Storybook stories for Virtual List component
 */

export default {
  title: 'Primitives/Virtual List',
  parameters: {
    docs: {
      description: {
        component: 'Virtualized list rendering with variable item heights for optimal performance with large datasets.'
      }
    }
  }
};

const Template = (args) => {
  const container = document.createElement('div');
  container.style.height = '600px';
  container.style.border = '1px solid #ccc';
  
  const list = document.createElement('virtual-list');
  list.setAttribute('buffer-size', args.bufferSize);
  list.setAttribute('estimated-item-height', args.estimatedItemHeight);
  list.setAttribute('item-key', args.itemKey);
  
  const template = document.createElement('template');
  template.setAttribute('data-item-template', '');
  template.innerHTML = args.template;
  list.appendChild(template);
  
  container.appendChild(list);
  
  // Generate items
  setTimeout(() => {
    list.setItems(args.items);
  }, 0);
  
  return container;
};

// Generate sample data
const generateItems = (count, variableHeight = false) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    title: `Item ${i}`,
    description: variableHeight 
      ? `Description for item ${i}. `.repeat(Math.floor(Math.random() * 5) + 1)
      : `Description for item ${i}.`
  }));
};

export const Basic = Template.bind({});
Basic.args = {
  bufferSize: 3,
  estimatedItemHeight: 60,
  itemKey: 'id',
  items: generateItems(1000),
  template: `
    <div style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px;">\${item.title}</h3>
      <p style="margin: 0; font-size: 14px; color: #666;">\${item.description}</p>
    </div>
  `
};

export const VariableHeights = Template.bind({});
VariableHeights.args = {
  bufferSize: 3,
  estimatedItemHeight: 80,
  itemKey: 'id',
  items: generateItems(1000, true),
  template: `
    <div style="padding: 16px; border-bottom: 1px solid #e0e0e0;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">\${item.title}</h3>
      <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">\${item.description}</p>
    </div>
  `
};

export const LargeDataset = Template.bind({});
LargeDataset.args = {
  bufferSize: 5,
  estimatedItemHeight: 50,
  itemKey: 'id',
  items: generateItems(10000),
  template: `
    <div style="padding: 12px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between;">
      <span style="font-weight: 500;">\${item.title}</span>
      <span style="color: #999; font-size: 12px;">ID: \${item.id}</span>
    </div>
  `
};

export const StyledItems = Template.bind({});
StyledItems.args = {
  bufferSize: 3,
  estimatedItemHeight: 100,
  itemKey: 'id',
  items: generateItems(500, true),
  template: `
    <div style="
      padding: 16px;
      margin: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">\${item.title}</h3>
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">\${item.description}</p>
    </div>
  `
};

export const CompactList = Template.bind({});
CompactList.args = {
  bufferSize: 5,
  estimatedItemHeight: 32,
  itemKey: 'id',
  items: generateItems(5000),
  template: `
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    ">
      <span style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #667eea;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
      ">\${item.id}</span>
      <span>\${item.title}</span>
    </div>
  `
};