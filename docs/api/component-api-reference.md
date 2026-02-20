# Component API Reference

This document provides comprehensive API tables for all Harmony Design System components, including props, events, and slots.

## Table of Contents

- [Button Component](#button-component)
- [Input Component](#input-component)
- [Card Component](#card-component)
- [Modal Component](#modal-component)
- [Dropdown Component](#dropdown-component)
- [Tabs Component](#tabs-component)
- [Slider Component](#slider-component)
- [Toggle Component](#toggle-component)
- [Tooltip Component](#tooltip-component)
- [Progress Component](#progress-component)

---

## Button Component

**Tag:** `<harmony-button>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'danger'` | `'primary'` | Visual style variant |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `disabled` | `boolean` | `false` | Disables button interaction |
| `loading` | `boolean` | `false` | Shows loading spinner |
| `icon` | `string` | `null` | Icon name to display |
| `icon-position` | `'left' \| 'right'` | `'left'` | Position of icon relative to text |
| `full-width` | `boolean` | `false` | Makes button take full container width |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-click` | `{ timestamp: number, target: HTMLElement }` | Fired when button is clicked |
| `harmony-focus` | `{ timestamp: number }` | Fired when button receives focus |
| `harmony-blur` | `{ timestamp: number }` | Fired when button loses focus |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Button text content |
| `icon` | Custom icon content (overrides icon prop) |
| `loading` | Custom loading indicator |

### Example

```html
<harmony-button variant="primary" size="large" icon="check">
  Submit Form
</harmony-button>
```

---

## Input Component

**Tag:** `<harmony-input>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url'` | `'text'` | Input type |
| `value` | `string` | `''` | Current input value |
| `placeholder` | `string` | `''` | Placeholder text |
| `label` | `string` | `null` | Input label |
| `disabled` | `boolean` | `false` | Disables input |
| `readonly` | `boolean` | `false` | Makes input read-only |
| `required` | `boolean` | `false` | Marks input as required |
| `error` | `string` | `null` | Error message to display |
| `helper-text` | `string` | `null` | Helper text below input |
| `min` | `number` | `null` | Minimum value (for number type) |
| `max` | `number` | `null` | Maximum value (for number type) |
| `maxlength` | `number` | `null` | Maximum character length |
| `pattern` | `string` | `null` | Validation pattern (regex) |
| `autocomplete` | `string` | `null` | Browser autocomplete hint |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-input` | `{ value: string, timestamp: number }` | Fired on every input change |
| `harmony-change` | `{ value: string, timestamp: number }` | Fired when input loses focus after change |
| `harmony-focus` | `{ timestamp: number }` | Fired when input receives focus |
| `harmony-blur` | `{ value: string, timestamp: number }` | Fired when input loses focus |
| `harmony-validation` | `{ valid: boolean, error: string \| null }` | Fired after validation |

### Slots

| Slot | Description |
|------|-------------|
| `prefix` | Content before input (e.g., icon) |
| `suffix` | Content after input (e.g., clear button) |
| `error` | Custom error message display |
| `helper` | Custom helper text display |

### Example

```html
<harmony-input 
  type="email" 
  label="Email Address" 
  placeholder="you@example.com"
  required>
</harmony-input>
```

---

## Card Component

**Tag:** `<harmony-card>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'elevated' \| 'outlined' \| 'filled'` | `'elevated'` | Visual style variant |
| `padding` | `'none' \| 'small' \| 'medium' \| 'large'` | `'medium'` | Internal padding |
| `clickable` | `boolean` | `false` | Makes card interactive with hover effects |
| `disabled` | `boolean` | `false` | Disables card interaction |
| `loading` | `boolean` | `false` | Shows loading state |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-click` | `{ timestamp: number, target: HTMLElement }` | Fired when clickable card is clicked |
| `harmony-focus` | `{ timestamp: number }` | Fired when card receives focus |
| `harmony-blur` | `{ timestamp: number }` | Fired when card loses focus |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Main card content |
| `header` | Card header section |
| `footer` | Card footer section |
| `media` | Media content (images, video) |
| `actions` | Action buttons area |

### Example

```html
<harmony-card variant="elevated" clickable>
  <div slot="header">
    <h3>Card Title</h3>
  </div>
  <p>Card content goes here.</p>
  <div slot="actions">
    <harmony-button>Action</harmony-button>
  </div>
</harmony-card>
```

---

## Modal Component

**Tag:** `<harmony-modal>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Controls modal visibility |
| `size` | `'small' \| 'medium' \| 'large' \| 'fullscreen'` | `'medium'` | Modal size |
| `closable` | `boolean` | `true` | Shows close button |
| `close-on-backdrop` | `boolean` | `true` | Closes modal when clicking backdrop |
| `close-on-escape` | `boolean` | `true` | Closes modal when pressing Escape |
| `persistent` | `boolean` | `false` | Prevents closing via backdrop or escape |
| `title` | `string` | `null` | Modal title |
| `loading` | `boolean` | `false` | Shows loading state |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-open` | `{ timestamp: number }` | Fired when modal opens |
| `harmony-close` | `{ reason: 'button' \| 'backdrop' \| 'escape', timestamp: number }` | Fired when modal closes |
| `harmony-before-close` | `{ reason: string, preventDefault: () => void }` | Fired before closing (cancellable) |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Main modal content |
| `header` | Custom header content (overrides title prop) |
| `footer` | Footer content (typically action buttons) |

### Example

```html
<harmony-modal open title="Confirm Action" size="small">
  <p>Are you sure you want to proceed?</p>
  <div slot="footer">
    <harmony-button variant="secondary">Cancel</harmony-button>
    <harmony-button variant="primary">Confirm</harmony-button>
  </div>
</harmony-modal>
```

---

## Dropdown Component

**Tag:** `<harmony-dropdown>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Controls dropdown visibility |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Dropdown position |
| `trigger` | `'click' \| 'hover' \| 'focus'` | `'click'` | Trigger behavior |
| `disabled` | `boolean` | `false` | Disables dropdown |
| `close-on-select` | `boolean` | `true` | Closes dropdown when item selected |
| `offset` | `number` | `8` | Offset from trigger (pixels) |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-open` | `{ timestamp: number }` | Fired when dropdown opens |
| `harmony-close` | `{ timestamp: number }` | Fired when dropdown closes |
| `harmony-select` | `{ value: any, label: string, timestamp: number }` | Fired when item is selected |

### Slots

| Slot | Description |
|------|-------------|
| `trigger` | Trigger element (button, link, etc.) |
| `default` | Dropdown content |

### Example

```html
<harmony-dropdown placement="bottom" trigger="click">
  <harmony-button slot="trigger">Menu</harmony-button>
  <harmony-menu>
    <harmony-menu-item value="1">Option 1</harmony-menu-item>
    <harmony-menu-item value="2">Option 2</harmony-menu-item>
  </harmony-menu>
</harmony-dropdown>
```

---

## Tabs Component

**Tag:** `<harmony-tabs>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `active-tab` | `string` | `null` | ID of active tab |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Tab orientation |
| `variant` | `'default' \| 'pills' \| 'underline'` | `'default'` | Visual style variant |
| `disabled` | `boolean` | `false` | Disables all tabs |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-tab-change` | `{ tabId: string, previousTabId: string, timestamp: number }` | Fired when active tab changes |
| `harmony-before-change` | `{ tabId: string, preventDefault: () => void }` | Fired before tab change (cancellable) |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Tab panel content (use `<harmony-tab-panel>`) |

### Child Component: Tab Panel

**Tag:** `<harmony-tab-panel>`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tab-id` | `string` | (required) | Unique tab identifier |
| `label` | `string` | (required) | Tab label text |
| `disabled` | `boolean` | `false` | Disables this tab |
| `icon` | `string` | `null` | Icon to display in tab |

### Example

```html
<harmony-tabs active-tab="tab1">
  <harmony-tab-panel tab-id="tab1" label="Overview">
    <p>Overview content</p>
  </harmony-tab-panel>
  <harmony-tab-panel tab-id="tab2" label="Details">
    <p>Details content</p>
  </harmony-tab-panel>
</harmony-tabs>
```

---

## Slider Component

**Tag:** `<harmony-slider>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Current slider value |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `disabled` | `boolean` | `false` | Disables slider |
| `label` | `string` | `null` | Slider label |
| `show-value` | `boolean` | `true` | Shows current value |
| `show-ticks` | `boolean` | `false` | Shows tick marks |
| `vertical` | `boolean` | `false` | Vertical orientation |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-input` | `{ value: number, timestamp: number }` | Fired during drag |
| `harmony-change` | `{ value: number, timestamp: number }` | Fired when drag ends |

### Slots

| Slot | Description |
|------|-------------|
| `label` | Custom label content |
| `value` | Custom value display |

### Example

```html
<harmony-slider 
  min="0" 
  max="100" 
  step="5" 
  value="50"
  label="Volume"
  show-ticks>
</harmony-slider>
```

---

## Toggle Component

**Tag:** `<harmony-toggle>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | `false` | Toggle state |
| `disabled` | `boolean` | `false` | Disables toggle |
| `label` | `string` | `null` | Toggle label |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Toggle size |
| `label-position` | `'left' \| 'right'` | `'right'` | Label position |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-change` | `{ checked: boolean, timestamp: number }` | Fired when toggle state changes |
| `harmony-focus` | `{ timestamp: number }` | Fired when toggle receives focus |
| `harmony-blur` | `{ timestamp: number }` | Fired when toggle loses focus |

### Slots

| Slot | Description |
|------|-------------|
| `label` | Custom label content |

### Example

```html
<harmony-toggle 
  checked 
  label="Enable notifications"
  size="medium">
</harmony-toggle>
```

---

## Tooltip Component

**Tag:** `<harmony-tooltip>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | `null` | Tooltip text content |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip position |
| `trigger` | `'hover' \| 'focus' \| 'click'` | `'hover'` | Trigger behavior |
| `delay` | `number` | `200` | Show delay in milliseconds |
| `disabled` | `boolean` | `false` | Disables tooltip |
| `max-width` | `string` | `'300px'` | Maximum tooltip width |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-show` | `{ timestamp: number }` | Fired when tooltip shows |
| `harmony-hide` | `{ timestamp: number }` | Fired when tooltip hides |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Element that triggers tooltip |
| `content` | Custom tooltip content (overrides content prop) |

### Example

```html
<harmony-tooltip content="Click to save" placement="top">
  <harmony-button icon="save">Save</harmony-button>
</harmony-tooltip>
```

---

## Progress Component

**Tag:** `<harmony-progress>`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Current progress value (0-100) |
| `variant` | `'linear' \| 'circular'` | `'linear'` | Progress indicator type |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Progress size |
| `indeterminate` | `boolean` | `false` | Shows indeterminate/loading state |
| `label` | `string` | `null` | Progress label |
| `show-value` | `boolean` | `true` | Shows percentage value |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'danger'` | `'primary'` | Progress color |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `harmony-complete` | `{ timestamp: number }` | Fired when progress reaches 100% |
| `harmony-change` | `{ value: number, timestamp: number }` | Fired when value changes |

### Slots

| Slot | Description |
|------|-------------|
| `label` | Custom label content |

### Example

```html
<harmony-progress 
  variant="linear" 
  value="75" 
  label="Uploading file..."
  color="primary">
</harmony-progress>
```

---

## API Conventions

### Event Naming

All component events follow the `harmony-*` naming convention to avoid conflicts with native events.

### Property Types

- Boolean props can be set with or without value: `<component disabled>` or `<component disabled="true">`
- Enum props are case-insensitive: `variant="PRIMARY"` works the same as `variant="primary"`
- Number props accept numeric strings: `value="50"` is automatically converted to `50`

### Slots

- `default` slot is used when no slot name is specified
- Named slots override corresponding props when both are provided
- Slots support any valid HTML content, including other web components

### Accessibility

All components implement ARIA attributes automatically:
- Proper roles and labels
- Keyboard navigation support
- Focus management
- Screen reader announcements

### Performance

All components adhere to Harmony Design System performance budgets:
- Maximum 16ms render time per frame (60fps)
- Maximum 50MB memory usage
- Lazy loading for heavy components
- GPU-accelerated animations where applicable

---

## Component Discovery

To explore all available components:

1. Check `/components` directory for primitive components
2. Check `/organisms` directory for complex components
3. Review Storybook at `/storybook` for interactive examples
4. See `/examples` directory for usage patterns

## Contributing

When adding new components, ensure:
1. Props, events, and slots are documented in this file
2. JSDoc comments in source code match this documentation
3. Examples demonstrate common use cases
4. Accessibility requirements are met
5. Performance budgets are satisfied