# Harmony Design System

This document describes the Harmony Design System architecture, development workflows, and implementation guidelines.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Development Workflow](#development-workflow)
4. [Code Formatting](#code-formatting)
5. [Component Development](#component-development)
6. [Performance Guidelines](#performance-guidelines)
7. [Testing Requirements](#testing-requirements)
8. [Documentation Standards](#documentation-standards)

## Overview

Harmony is a high-performance design system for audio production interfaces. It combines Rust/WASM for audio processing with vanilla Web Components for UI rendering.

## Architecture

### Technology Stack

- **UI Layer**: Vanilla HTML/CSS/JavaScript with Web Components
- **Core Logic**: Rust compiled to WebAssembly
- **State Management**: EventBus with TypeNavigator queries
- **Audio Processing**: WebGPU + WASM implementations
- **Desktop Wrapper**: Tauri (not Electron)

### Bounded Contexts

Bounded contexts handle domain logic in Rust:

- `component-lifecycle/` - Component state management
- See `bounded-contexts/` for all contexts

### File Organization

```
harmony-design/
├── components/        # Web Components (UI layer)
├── bounded-contexts/  # Rust bounded contexts
├── core/             # Core utilities (EventBus, errors, etc.)
├── primitives/       # Atomic UI components
├── tokens/           # Design tokens
├── styles/           # Global styles
└── scripts/          # Build and dev tools
```

## Development Workflow

### Setup

1. Clone repository
2. Install dependencies: `npm install` (dev tools only)
3. Build WASM: `cd bounded-contexts && cargo build --target wasm32-unknown-unknown`
4. Run dev server: `npm run dev`

### Making Changes

1. **UI Components**: Edit files in `components/`, `primitives/`, etc.
2. **Core Logic**: Edit schemas in `harmony-schemas/`, run codegen
3. **Documentation**: Update this file (DESIGN_SYSTEM.md)

### Schema Changes

When modifying Rust behavior:

1. Navigate to `harmony-schemas/`
2. Modify the schema
3. Run codegen: `npm run codegen`
4. Verify compilation
5. Commit schema + generated code together

**Important**: CI fails if schema changed but generated code is stale.

## Code Formatting

### Prettier Configuration

The project uses Prettier for consistent code formatting. Configuration is in `.prettierrc.json`.

**Key formatting rules:**

- **Print width**: 100 characters (80 for Markdown/JSON)
- **Indentation**: 2 spaces (4 for Rust)
- **Quotes**: Single quotes for JS/CSS, double for HTML attributes
- **Semicolons**: Always required
- **Trailing commas**: ES5 style
- **Line endings**: LF (Unix style)

### Running Prettier

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check

# Format specific file
npx prettier --write path/to/file.js
```

### Editor Integration

The `.editorconfig` file provides IDE-agnostic formatting rules. Most modern editors support it automatically.

**Recommended VS Code settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### File-Specific Rules

- **JavaScript/HTML/CSS**: 100 character line length, 2 space indent
- **Markdown**: 80 character line length, wrap prose
- **JSON**: 80 character line length for readability
- **Rust**: 4 space indent (Rust convention), 100 character line length
- **YAML**: 2 space indent, single quotes

### Ignored Files

See `.prettierignore` for excluded paths:

- Generated files (`harmony-dev/crates/`, `harmony-dev/workers/`)
- Build outputs (`dist/`, `target/`, `*.wasm`)
- Dependencies (`node_modules/`)
- Lock files and logs

### Pre-commit Hooks

Husky runs Prettier on staged files before commit. If formatting fails, the commit is blocked.

To bypass (not recommended): `git commit --no-verify`

## Component Development

### Web Component Pattern

All UI components must:

1. Extend `HTMLElement`
2. Use Shadow DOM
3. Publish events (never call bounded contexts directly)
4. Follow performance budgets

**Example structure**:

```javascript
/**
 * MyComponent - Brief description
 * @fires my-event - When something happens
 */
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>/* Component styles */</style>
      <div>/* Component markup */</div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```

See `components/` for examples.

### Event-Driven Communication

**UI → Bounded Context**:

```javascript
// Component publishes event
this.dispatchEvent(new CustomEvent('play-clicked', {
  bubbles: true,
  composed: true,
  detail: { trackId: 123 }
}));
```

**Bounded Context → UI**:

```javascript
// Component subscribes to result
window.EventBus.subscribe('playback-started', (data) => {
  this.updatePlayState(data);
});
```

### EventBus Pattern

- UI components publish command events
- EventBus routes to bounded contexts
- Bounded contexts publish result events
- UI components subscribe to results

**Required on every page**: `<event-bus-component>` for debugging (Ctrl+Shift+E)

See `core/event-bus.js` for implementation.

## Performance Guidelines

### Absolute Constraints

1. **Render Budget**: Maximum 16ms per frame (60fps)
2. **Memory Budget**: Maximum 50MB WASM heap
3. **Load Budget**: Maximum 200ms initial load time
4. **Audio Latency**: Maximum 10ms end-to-end

### Optimization Strategies

- Use GPU-first rendering where possible
- Avoid async operations in audio render thread
- Use SharedArrayBuffer for AudioWorklet ↔ GPU transfer
- Minimize DOM manipulation (batch updates)
- Use CSS transforms for animations (GPU-accelerated)

### Performance Testing

Test animations with Chrome DevTools Performance panel. Target: 60fps for all UI animations.

## Testing Requirements

### Chrome Testing (Mandatory)

All UI components must be tested in Chrome before task completion.

**Test all states**:

- Default, hover, focus, active, disabled
- Error states, loading states, empty states (for complex components)

### Test Files

Components should have corresponding `.test.html` files:

```
components/
  my-component/
    my-component.js
    my-component.test.html
```

Open test file in Chrome to verify behavior.

### Quality Gates

Quality gates must pass before proceeding:

- TypeScript type checking
- Prettier formatting
- ESLint rules
- Rust compilation
- WASM build

Run all gates: `npm run quality-gates`

## Documentation Standards

### B1-Level English

Write documentation in clear, simple English (B1 CEFR level):

- Short sentences
- Common vocabulary
- Active voice
- Clear structure

### Code Comments

**Minimal inline comments**. Code should be self-documenting. Use JSDoc for public APIs:

```javascript
/**
 * Calculates the peak value over a time window
 * @param {Float32Array} samples - Audio samples
 * @param {number} windowMs - Window size in milliseconds
 * @returns {number} Peak value (0-1)
 */
function calculatePeak(samples, windowMs) {
  // Implementation
}
```

### Linking

Use relative links to code files:

```markdown
See [EventBus implementation](core/event-bus.js) for details.
```

### Documentation Updates

Updating DESIGN_SYSTEM.md is **mandatory** for every task. Agent cannot declare completion without filesystem evidence of documentation changes.

## Additional Resources

- **Architecture Decisions**: See `docs/` directory
- **Component Examples**: See `components/` and `primitives/`
- **Performance Reports**: See `reports/` directory
- **GitHub Workflows**: See `.github/workflows/`

---

**Last Updated**: 2025-01-XX (update with each change)

## Internationalization (i18n)

### Language Detection

The Language Detector automatically detects and manages the user's preferred language.

**Location:** `core/i18n/language-detector.js`

**Detection Priority:**
1. localStorage (saved preference)
2. Browser's navigator.language
3. Default fallback (English)

**Usage:**
```javascript
import { languageDetector } from './core/i18n/language-detector.js';

// Get current language
const lang = languageDetector.getCurrentLanguage(); // 'en'

// Change language
languageDetector.setLanguage('es');

// Listen for changes
EventBus.subscribe('LanguageChanged', (event) => {
  console.log(event.detail.current); // New language
});
```

**Supported Languages:**
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Chinese (zh)

**Persistence:**
Language preferences are saved to localStorage with key `harmony-language`. This ensures the user's choice persists across browser sessions.

**Events:**
- `LanguageChanged`: Published when language changes, includes previous and current language codes.

**Testing:**
Open `core/i18n/language-detector.test.html` in Chrome to test language detection, switching, and persistence.


### Translation Extraction

The translation extraction script automates the process of finding translatable strings in code and updating locale files.

**Location**: `scripts/extract-translations.js`

**Usage**:
```bash
# Extract and update locale files
node scripts/extract-translations.js

# Check for missing translations (CI mode)
node scripts/extract-translations.js --check

# Process specific locale
node scripts/extract-translations.js --locale=es

# Verbose output
node scripts/extract-translations.js --verbose
```

**Detection Patterns**:
- `t('key')` - Direct translation call
- `useTranslation().t('key')` - Hook-based translation

**Workflow**:
1. Scans `components/`, `controls/`, `organisms/`, `primitives/`, `templates/`, `pages/`, `core/`, `utils/`, `web/`
2. Extracts translation keys from `.js` and `.html` files
3. Parses keys into nested object structure (`component.button.label` ? `{ component: { button: { label: "..." } } }`)
4. Updates locale files with missing keys:
   - English: Uses last segment as placeholder
   - Other locales: Marked with `[locale] key` for translator review
5. Preserves existing translations

**CI Integration**: Add `--check` flag to pre-commit hook or CI pipeline to prevent missing translations.

**See**: `scripts/README.md` for detailed documentation

## Accessibility - Motion Preferences

The Harmony Design System respects user motion preferences through the `useReducedMotion` hook.

### useReducedMotion Hook

**Purpose:** Detect and respond to the `prefers-reduced-motion` media query for accessibility.

**Location:** [hooks/use-reduced-motion.js](./hooks/use-reduced-motion.js)

**Key Features:**
- Reactive subscription to motion preference changes
- Global singleton instance for shared state
- Helper functions for conditional animations
- Automatic cleanup of listeners

**Basic Usage:**
``javascript
import { useReducedMotion } from './hooks/use-reduced-motion.js';

const motionHook = useReducedMotion();

if (motionHook.prefersReducedMotion) {
  // Disable or reduce animations
  element.style.transition = 'none';
}
``

**Subscribing to Changes:**
``javascript
const unsubscribe = motionHook.subscribe((prefersReduced) => {
  if (prefersReduced) {
    disableAnimations();
  } else {
    enableAnimations();
  }
});

// Cleanup when done
unsubscribe();
motionHook.cleanup();
``

**Helper Functions:**

1. **getAnimationDuration(normalDuration, reducedDuration)** - Returns appropriate duration based on user preference
2. **applyConditionalAnimation(element, animationClass, reducedClass)** - Applies correct animation class
3. **getGlobalReducedMotion()** - Returns singleton instance for shared state

**Integration with Animation System:**

The hook works seamlessly with the animation system:
- [animations/motion-variants.js](./animations/motion-variants.js) - Reusable animation variants
- [animations/transition-presets.js](./animations/transition-presets.js) - Standard transitions

**Testing:**
Open [hooks/use-reduced-motion.test.html](./hooks/use-reduced-motion.test.html) in Chrome and use DevTools to emulate motion preferences (Ctrl+Shift+P ? "Emulate CSS prefers-reduced-motion").

**Accessibility Guidelines:**
1. Always provide a reduced motion alternative for animations
2. Use the hook in all animated components
3. Test with motion preferences enabled
4. Respect user choice - never override reduced motion preference

**Performance:** The hook uses efficient media query listeners with minimal overhead. Cleanup is automatic on page unload but should be called explicitly in long-lived components.



## Animations

### Gesture Animations

Gesture animations provide visual feedback for user interactions like hovering, tapping, and dragging. All animations are optimized to run at 60fps (under 16ms per frame).

**Implementation:** `animations/gesture-animations.js`

#### Hover Animations

Applied when the pointer enters or leaves interactive elements:

- **scale** - Subtle size increase for buttons and cards
- **lift** - Elevation with shadow for depth
- **brighten** - Brightness increase for media elements
- **underline** - Expanding underline for text links
- **glow** - Soft glow effect for primary actions

#### Tap Animations

Applied during active press state:

- **shrink** - Scale down for tactile feedback
- **push** - Push down effect with shadow change
- **ripple** - Material-style ripple effect
- **flash** - Quick brightness change for immediate feedback

#### Drag Animations

Applied during drag operations (faders, knobs, timeline items):

- **active** - Cursor and selection changes
- **elevated** - Lift effect during drag
- **dragging** - Visual feedback for drag source
- **ghost** - Placeholder at original position
- **dropTarget** - Highlight valid drop zones

#### Usage

Use `attachGestureAnimations()` for automatic setup:

```javascript
import { attachGestureAnimations } from './animations/gesture-animations.js';

const cleanup = attachGestureAnimations(button, {
  hover: 'lift',
  tap: 'shrink'
});
```

Or use `createGestureController()` for manual control:

```javascript
import { createGestureController } from './animations/gesture-animations.js';

const controller = createGestureController(element, {
  hover: 'scale',
  tap: 'push',
  disabled: false
});

element.addEventListener('mouseenter', controller.onHoverEnter);
element.addEventListener('mouseleave', controller.onHoverExit);
```

**Testing:** Open `animations/gesture-animations.test.html` in Chrome to see all gesture animations in action.

**Related:**
- Motion Variants: `animations/motion-variants.js`
- Transition Presets: `animations/transition-presets.js`
- Stagger Children: `animations/stagger-children.js`


## Motion System

The Harmony Design System uses purposeful motion to enhance user experience while maintaining 60fps performance and respecting accessibility preferences.

### Core Principles

1. **Purposeful**: Every animation has a clear purpose (feedback, transition, hierarchy, or delight)
2. **Performance First**: Target 60fps using GPU-accelerated properties
3. **Accessible**: Respect prefers-reduced-motion media query

### Duration Guidelines

- **Instant** (0ms): Immediate state changes
- **Fast** (100ms): Micro-interactions (hover, focus)
- **Normal** (200ms): Standard transitions (fade, slide)
- **Slow** (300ms): Complex animations (expand, morph)
- **Deliberate** (400ms): Attention-grabbing effects

### Implementation Files

- **Motion Variants** [animations/motion-variants.js](animations/motion-variants.js) - Reusable animation configurations (fade, slide, scale, rotate)
- **Transition Presets** [animations/transition-presets.js](animations/transition-presets.js) - Standard timing configurations
- **Gesture Animations** [animations/gesture-animations.js](animations/gesture-animations.js) - Interactive animation helpers (hover, tap, drag)
- **Stagger Children** [animations/stagger-children.js](animations/stagger-children.js) - Orchestrate list and group animations
- **Reduced Motion Hook** [hooks/useReducedMotion.js](hooks/useReducedMotion.js) - Accessibility helper for motion preferences

### Usage Example

```javascript
import { motionVariants } from './animations/motion-variants.js';
import { TRANSITIONS } from './animations/transition-presets.js';
import { useReducedMotion } from './hooks/useReducedMotion.js';

// Respect user preferences
const duration = useReducedMotion() ? 0 : TRANSITIONS.NORMAL.duration;

// Apply animation
element.animate(
  motionVariants.fadeIn.keyframes,
  { ...motionVariants.fadeIn.options, duration }
);
```

### Performance Requirements

- Maximum 16ms per frame for 60fps
- Use GPU-accelerated properties only: 	ransform, opacity
- Avoid layout-triggering properties: width, height, 	op, left
- Test with Chrome DevTools Performance panel

### Comprehensive Documentation

For detailed guidelines, easing functions, patterns, and interactive examples, see:
- [Motion Guidelines](docs/motion-guidelines.md) - Complete animation guidelines
- [Motion Examples](docs/motion-examples.html) - Interactive demonstrations

### Icon Storybook Catalog

The icon system includes a comprehensive visual catalog in Storybook with search functionality.

**Location**: `primitives/icons/harmony-icon.stories.js`

**Features**:
- **Visual catalog**: Grid display of all available icons
- **Search**: Real-time filtering by icon name
- **Click to copy**: Copy icon name to clipboard
- **Size variants**: Preview icons at different sizes
- **Color customization**: Apply custom colors
- **Grouped categories**: Playback controls, editing tools, etc.

**Usage in Storybook**:
1. Run Storybook: `npm run storybook`
2. Navigate to Primitives > Icons
3. View "Icon Catalog" story for searchable grid
4. Click any icon to copy its name

**Stories included**:
- **Default**: Single icon with controls
- **Sizes**: Icon size variants (16px to 64px)
- **Playback Controls**: Transport and playback icons
- **Editing Tools**: Cut, copy, paste, undo, etc.
- **Icon Catalog**: Complete searchable catalog
- **Custom Colors**: Color variants
- **States**: Hover, active, disabled states

**Development workflow**:
When adding new icons:
1. Add icon type to `icon-types.js`
2. Implement SVG in `harmony-icon.js`
3. Icon automatically appears in catalog
4. No manual story updates needed

