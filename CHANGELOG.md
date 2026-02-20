# Changelog

All notable changes to the Harmony Design System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Component Development Guide with step-by-step instructions
- Token Customization Guide for design token overrides
- Graph Extension Guide for custom node/edge types
- Storybook 8 setup with Vite and TypeScript
- API Reference Site with generated documentation
- Component API Tables documenting props, events, and slots
- Graph Model Documentation explaining nodes, edges, and event flow
- Architecture Overview with high-level system design
- Storybook Docs Addon with MDX documentation pages
- Storybook custom theme matching design system brand

### Changed
- Documentation consolidated into single DESIGN_SYSTEM.md file
- Improved EventBus debugging with EventBusComponent

### Fixed
- Performance optimizations for 60fps rendering target

## [0.1.0] - 2025-02-15

### Added
- Initial design system foundation
- Core bounded contexts architecture (Rust → WASM)
- EventBus pattern for component communication
- GPU-first audio processing pipeline
- Reactive component system with shadow DOM
- Atomic design methodology (primitives → organisms)
- Design tokens system with CSS custom properties
- Graph-based state management
- WebGPU audio processing with WASM fallback
- SharedArrayBuffer for AudioWorklet ↔ GPU data transfer
- TypeNavigator for type-safe queries
- Quality gates for performance budgets
- Tauri desktop wrapper architecture
- CI/CD pipeline with bundle size checks

### Performance Targets
- Render Budget: 16ms per frame (60fps)
- Memory Budget: 50MB WASM heap maximum
- Load Budget: 200ms initial load time
- Audio Latency: 10ms end-to-end maximum

### Architecture Decisions
- **Bounded Contexts**: Rust → WASM (graph engine, audio processing)
- **UI Layer**: Vanilla HTML/CSS/JS with Web Components
- **No Runtime Dependencies**: Build tools only, zero production npm packages
- **No Frameworks**: Pure Web Components with shadow DOM
- **Event-Driven**: Components publish events, never call BCs directly
- **Schema-First**: Changes flow from harmony-schemas → codegen → implementation

---

## Breaking Changes Guide

### Understanding Breaking Changes

A breaking change is any modification that requires users to update their code. We mark these with **🚨 BREAKING** in the changelog.

### Types of Breaking Changes

1. **API Changes**: Renamed or removed props, events, or methods
2. **Behavior Changes**: Different default values or event timing
3. **Schema Changes**: Modified data structures in bounded contexts
4. **Token Changes**: Renamed or removed design tokens
5. **Build Changes**: New requirements for build tools or environment

### Migration Support

When breaking changes occur, we provide:
- Clear explanation of what changed and why
- Migration path with code examples
- Deprecation warnings in previous minor version (when possible)
- Automated migration tools (when feasible)

### Versioning Strategy

- **Major version (X.0.0)**: Breaking changes allowed
- **Minor version (0.X.0)**: New features, no breaking changes
- **Patch version (0.0.X)**: Bug fixes, no breaking changes

### Example Breaking Changes (Future Reference)

```markdown
## [2.0.0] - TBD

### 🚨 BREAKING CHANGES

#### EventBus API Redesign
**Changed**: EventBus.publish() now requires event metadata
**Migration**: Add metadata object as second parameter
```javascript
// Before
EventBus.publish('PlayRequested', { trackId: '123' });

// After
EventBus.publish('PlayRequested', { trackId: '123' }, { 
  source: 'player-controls',
  timestamp: Date.now()
});
```

#### Design Token Namespace
**Changed**: All color tokens renamed from `--color-*` to `--harmony-color-*`
**Migration**: Update CSS custom property references
```css
/* Before */
background: var(--color-primary);

/* After */
background: var(--harmony-color-primary);
```

#### Graph Schema Update
**Changed**: Node type field renamed from `nodeType` to `type`
**Migration**: Update schema references and regenerate code
```bash
cd harmony-schemas
# Update schema.yaml
npm run codegen
git add .
git commit -m "chore: apply schema migration for node type field"
```
```

---

## Version History Summary

| Version | Date | Type | Highlights |
|---------|------|------|------------|
| 0.1.0 | 2025-02-15 | Initial | Foundation, bounded contexts, EventBus, GPU audio |

---

## How to Read This Changelog

### Sections
- **Added**: New features or capabilities
- **Changed**: Modifications to existing functionality
- **Deprecated**: Features that will be removed in future versions
- **Removed**: Features that have been removed
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

### Breaking Change Markers
- **🚨 BREAKING**: Requires code changes from users
- **⚠️ DEPRECATED**: Will become breaking in next major version
- **✨ NEW**: Significant new feature
- **🐛 FIX**: Important bug fix
- **⚡ PERFORMANCE**: Performance improvement

---

## Reporting Issues

Found a bug or regression? Please report it:
1. Check existing issues in the repository
2. Create detailed bug report with reproduction steps
3. Include version number from this changelog
4. Tag with `bug` or `regression` label

---

## Contributing

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for:
- Component Development Guide
- Architecture Overview
- Contribution Guidelines
- Code Standards

---

**Note**: This changelog focuses on user-facing changes. For internal development history, see git commit log.