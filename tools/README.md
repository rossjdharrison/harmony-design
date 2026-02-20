# Harmony Design System Tools

Development tools for the Harmony Design System.

## Component Scaffold CLI

Generate component boilerplate from templates.

### Usage

```bash
node tools/scaffold-component.js <component-name> [options]
```

### Options

- `--type <type>` - Component type: `primitive`, `molecule`, or `organism` (default: `primitive`)
- `--category <cat>` - Category subfolder for organization
- `--with-styles` - Generate separate CSS file
- `--with-story` - Generate Storybook story file
- `--with-test` - Generate test file

### Examples

#### Basic Primitive

```bash
node tools/scaffold-component.js my-button --type primitive
```

Creates:
- `primitives/my-button/my-button.js`
- `primitives/my-button/README.md`

#### Molecule with Full Setup

```bash
node tools/scaffold-component.js search-field --type molecule --category forms --with-story --with-test
```

Creates:
- `components/forms/search-field/search-field.js`
- `components/forms/search-field/README.md`
- `components/forms/search-field/search-field.stories.js`
- `components/forms/search-field/search-field.test.js`

#### Organism with Styles

```bash
node tools/scaffold-component.js data-grid --type organism --with-styles --with-story
```

Creates:
- `organisms/data-grid/data-grid.js`
- `organisms/data-grid/data-grid.css`
- `organisms/data-grid/README.md`
- `organisms/data-grid/data-grid.stories.js`

### Component Structure

Generated components follow Harmony Design System patterns:

- **Web Components** - Custom elements with shadow DOM
- **No Dependencies** - Vanilla JavaScript only
- **Event-Driven** - Emit custom events for state changes
- **Accessible** - Semantic HTML and ARIA support
- **Themeable** - CSS custom properties for styling
- **Documented** - JSDoc comments and README

### Template Customization

Edit `tools/component-templates.json` to customize:

- Component types and directories
- Common categories
- Required attributes and methods
- CSS custom properties
- Event naming conventions

### Integration with Workflow

1. **Generate** - Use CLI to scaffold component
2. **Implement** - Add logic and styling
3. **Test** - Verify in Chrome (all states)
4. **Document** - Update DESIGN_SYSTEM.md
5. **Story** - Add Storybook examples
6. **Commit** - Push changes with conventional commit

### Quality Checklist

Before marking component complete:

- [ ] All states tested in Chrome (default, hover, focus, active, disabled)
- [ ] Shadow DOM properly encapsulates styles
- [ ] Events follow naming convention (`component-name:event`)
- [ ] JSDoc comments on all public methods
- [ ] README includes usage examples
- [ ] CSS custom properties documented
- [ ] Performance: <16ms render time
- [ ] Accessibility: keyboard navigation works
- [ ] DESIGN_SYSTEM.md updated

### Troubleshooting

**Error: Component name must be in kebab-case**

Component names must use lowercase letters and hyphens only (e.g., `my-component`, not `MyComponent` or `my_component`).

**Error: Component directory already exists**

The component has already been scaffolded. Either use a different name or delete the existing directory.

**Error: Invalid type**

Type must be one of: `primitive`, `molecule`, or `organism`.

## Other Tools

Additional development tools will be documented here as they are added.