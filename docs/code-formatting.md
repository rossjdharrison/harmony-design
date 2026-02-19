# Code Formatting Guide

This document explains the code formatting standards for the Harmony Design System.

## Quick Start

```bash
# Format all files
npm run format

# Check formatting (CI)
npm run format:check

# Format happens automatically on commit via Husky
```

## Prettier Configuration

Configuration file: `.prettierrc.json`

### General Rules

- **Line Length**: 100 characters (80 for Markdown/JSON)
- **Indentation**: 2 spaces for JS/HTML/CSS/YAML, 4 spaces for Rust
- **Quotes**: Single quotes in JavaScript, double quotes in HTML
- **Semicolons**: Always required in JavaScript
- **Trailing Commas**: ES5 style (objects, arrays)
- **Line Endings**: LF (Unix-style)

### File-Specific Formatting

#### JavaScript/TypeScript

```javascript
// Good
const myFunction = (param1, param2) => {
  return {
    result: 'value',
    count: 42,
  };
};

// Bad (wrong quotes, missing trailing comma)
const myFunction = (param1, param2) => {
  return {
    result: "value",
    count: 42
  }
}
```

#### HTML

```html
<!-- Good: 100 char width, proper indentation -->
<my-component
  id="example"
  class="component-class"
  data-value="123"
>
  <div class="content">
    <p>Text content here</p>
  </div>
</my-component>

<!-- Bad: inconsistent indentation -->
<my-component id="example" class="component-class" data-value="123">
<div class="content">
<p>Text content here</p>
</div>
</my-component>
```

#### CSS

```css
/* Good: consistent spacing, alphabetical properties */
.my-class {
  background-color: #ffffff;
  border: 1px solid #cccccc;
  display: flex;
  padding: 16px;
}

/* Bad: inconsistent spacing */
.my-class{
  display:flex;
  padding:16px;
  border:1px solid #cccccc;
  background-color:#ffffff;
}
```

#### Markdown

- Maximum 80 characters per line
- Wrap prose automatically
- Use reference-style links for readability

```markdown
<!-- Good -->
This is a paragraph that wraps at 80 characters. It makes the source
code easier to read in version control diffs.

See the [component guide][guide] for more information.

[guide]: ./component-guide.md

<!-- Bad -->
This is a very long paragraph that extends beyond 80 characters and makes it difficult to read in version control systems and text editors.
```

#### JSON

```json
{
  "name": "example",
  "version": "1.0.0",
  "scripts": {
    "build": "build command",
    "test": "test command"
  }
}
```

## EditorConfig

The `.editorconfig` file provides IDE-agnostic settings. Most editors support it automatically.

### Supported Editors

- VS Code: Built-in support
- WebStorm/IntelliJ: Built-in support
- Sublime Text: Install EditorConfig plugin
- Vim/Neovim: Install editorconfig-vim plugin

## IDE Integration

### VS Code

Install the Prettier extension:

```bash
code --install-extension esbenp.prettier-vscode
```

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

### WebStorm/IntelliJ

1. Go to Settings → Languages & Frameworks → JavaScript → Prettier
2. Check "On save"
3. Set Prettier package path to `node_modules/prettier`

## Pre-commit Hooks

Husky automatically formats staged files before commit.

**What happens on commit:**

1. Git stages your changes
2. Husky runs Prettier on staged files
3. Formatted files are re-staged
4. Commit proceeds with formatted code

**To bypass** (not recommended):

```bash
git commit --no-verify
```

## CI Integration

The CI pipeline checks formatting on every pull request:

```yaml
# .github/workflows/ci-build.yml
- name: Check formatting
  run: npm run format:check
```

If formatting fails, the PR is blocked until fixed.

## Ignored Files

See `.prettierignore` for excluded paths:

- **Generated files**: `harmony-dev/crates/`, `harmony-dev/workers/`
- **Build outputs**: `dist/`, `target/`, `*.wasm`
- **Dependencies**: `node_modules/`
- **Lock files**: `package-lock.json`, `Cargo.lock`
- **Logs**: `*.log`

## Troubleshooting

### Prettier Not Running

```bash
# Check Prettier is installed
npx prettier --version

# Manually format a file
npx prettier --write path/to/file.js
```

### Formatting Conflicts

If EditorConfig and Prettier conflict:

1. Prettier takes precedence for supported languages
2. EditorConfig applies to other files
3. Check `.prettierrc.json` overrides for specific file types

### Performance Issues

For large projects, Prettier can be slow. Options:

```bash
# Format only changed files
git diff --name-only | xargs npx prettier --write

# Use --cache flag (Prettier 2.2+)
npx prettier --write --cache .
```

## Best Practices

1. **Format before commit**: Let Husky handle it automatically
2. **Run format:check in CI**: Catch formatting issues early
3. **Use IDE integration**: Format on save for instant feedback
4. **Don't bypass pre-commit**: It ensures consistency
5. **Update .prettierignore**: Exclude generated/binary files

## Resources

- [Prettier Documentation](https://prettier.io/docs/en/)
- [EditorConfig Documentation](https://editorconfig.org/)
- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Main documentation

---

**Questions?** Open an issue or check existing formatting in `components/` for examples.