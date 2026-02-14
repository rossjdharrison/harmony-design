# Component Basics

Learn the fundamental patterns for working with Harmony Design System components.

## Component Structure

All Harmony components follow these principles:

### Web Components Standard

Components use the Web Components standard with:
- Custom elements (e.g., `<harmony-button>`)
- Shadow DOM for style encapsulation
- Standard HTML attributes and properties
- Custom events for communication

### Naming Convention

All components use the `harmony-` prefix:
- `harmony-button`
- `harmony-card`
- `harmony-input`
- `harmony-modal`

## Using Attributes

Components accept configuration through HTML attributes:

```html
<!-- Simple attributes -->
<harmony-button variant="primary" size="large">
    Large Primary Button
</harmony-button>

<!-- Boolean attributes -->
<harmony-button disabled>
    Disabled Button
</harmony-button>

<!-- Data attributes for custom values -->
<harmony-input 
    type="text" 
    placeholder="Enter your name"
    required>
</harmony-input>
```

## Using Properties

For complex data, use JavaScript properties:

```javascript
const dropdown = document.querySelector('harmony-dropdown');
dropdown.items = [
    { id: '1', label: 'Option 1', value: 'opt1' },
    { id: '2', label: 'Option 2', value: 'opt2' },
    { id: '3', label: 'Option 3', value: 'opt3' }
];
```

## Component Lifecycle

Components follow standard Web Component lifecycle:

```javascript
// Wait for component to be defined
await customElements.whenDefined('harmony-button');

// Component is now ready to use
const button = document.createElement('harmony-button');
button.textContent = 'Dynamic Button';
document.body.appendChild(button);
```

## Styling Components

### Using CSS Custom Properties

Components expose CSS variables for theming:

```css
harmony-button {
    --harmony-button-bg: #0066cc;
    --harmony-button-color: white;
    --harmony-button-padding: 12px 24px;
    --harmony-button-radius: 8px;
}
```

### Part Selectors

Access internal elements using `::part()`:

```css
harmony-card::part(header) {
    background: linear-gradient(to right, #667eea, #764ba2);
}

harmony-card::part(content) {
    padding: 24px;
}
```

## Slots for Content

Use slots to insert custom content:

```html
<harmony-card>
    <span slot="header">Custom Header</span>
    <div slot="content">
        <p>Your custom content here</p>
    </div>
    <div slot="footer">
        <harmony-button>Action</harmony-button>
    </div>
</harmony-card>
```

## Component States

Components manage their own state and reflect it through attributes:

```html
<!-- Initial state -->
<harmony-button>Click Me</harmony-button>

<!-- After interaction (managed by component) -->
<harmony-button aria-pressed="true">Click Me</harmony-button>
```

Access state programmatically:

```javascript
const button = document.querySelector('harmony-button');
console.log(button.pressed); // true or false
```

## Related Guides

- [Event System Guide](./event-system.md) - Learn about component communication
- [Accessibility Guide](./accessibility.md) - Make your app accessible
- [Performance Guide](./performance.md) - Optimize component usage