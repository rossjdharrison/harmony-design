# Getting Started with Harmony Design System

Welcome! This guide helps you start using Harmony Design System components in your project.

## What You Need

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Basic knowledge of HTML, CSS, and JavaScript
- A text editor or IDE

## Quick Start

### Step 1: Include the Design System

Add the design system to your HTML page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Harmony App</title>
</head>
<body>
    <!-- Your content here -->
    
    <!-- Load Harmony components -->
    <script type="module" src="path/to/harmony-design/components/index.js"></script>
</body>
</html>
```

### Step 2: Use Components

Components are Web Components, so you use them like regular HTML elements:

```html
<harmony-button variant="primary">Click Me</harmony-button>
<harmony-card>
    <h2>Card Title</h2>
    <p>Card content goes here.</p>
</harmony-card>
```

### Step 3: Listen to Events

Components communicate through events. Use standard event listeners:

```javascript
const button = document.querySelector('harmony-button');
button.addEventListener('harmony-click', (event) => {
    console.log('Button clicked!', event.detail);
});
```

## Next Steps

- Read [Component Basics](./component-basics.md) to understand component patterns
- Explore [Event System Guide](./event-system.md) to learn about communication
- Check [Performance Guide](./performance.md) for optimization tips
- Review [Best Practices](../best-practices/component-usage.md) for recommended patterns

## Need Help?

- Check component Storybook stories for interactive examples
- Read JSDoc comments in component source files
- Review the main [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) documentation