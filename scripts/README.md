# Translation Extraction Script

## Overview

The `extract-translations.js` script automatically scans the codebase for translatable strings and manages locale files.

## Usage

### Basic Extraction

Extract all translation keys and update locale files:

```bash
node scripts/extract-translations.js
```

### Check Mode

Check for missing translations without modifying files (useful for CI):

```bash
node scripts/extract-translations.js --check
```

### Specific Locale

Process only a specific locale:

```bash
node scripts/extract-translations.js --locale=es
```

### Verbose Output

Show detailed information about extraction:

```bash
node scripts/extract-translations.js --verbose
```

## How It Works

### 1. Pattern Detection

The script scans JavaScript and HTML files for these patterns:

- `t('translation.key')`
- `t("translation.key")`
- `t(\`translation.key\`)`
- `useTranslation().t('translation.key')`

### 2. Key Extraction

Translation keys are extracted and parsed into nested object paths:

- `component.button.label` → `{ component: { button: { label: "..." } } }`

### 3. Locale Update

For each locale file:

- **Existing keys**: Preserved as-is
- **Missing keys**: Added with placeholder values
  - English (en): Uses last segment as placeholder (`button.label` → `"label"`)
  - Other locales: Marked clearly (`"[es] button.label"`)

### 4. File Generation

Updated locale files are written with:

- Proper JSON formatting (2-space indent)
- Alphabetical key ordering (maintained by JSON.stringify)
- Trailing newline

## Scanned Directories

- `components/`
- `controls/`
- `organisms/`
- `primitives/`
- `templates/`
- `pages/`
- `core/`
- `utils/`
- `web/`

## File Extensions

- `.js` - JavaScript files
- `.html` - HTML templates

## Integration

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
node scripts/extract-translations.js --check
```

### CI Pipeline

Add to GitHub Actions workflow:

```yaml
- name: Check translations
  run: node scripts/extract-translations.js --check
```

### Development Workflow

1. Write code with `t('new.key')`
2. Run extraction: `node scripts/extract-translations.js`
3. Review generated placeholders in `locales/en.json`
4. Update with proper English text
5. Send to translators for other locales

## Output Format

### Success

```
🔍 Scanning for translatable strings...

📝 Found 42 unique translation keys

🌍 Processing 3 locale(s): en, es, fr

✅ en: All translations present
⚠️  es: 5 missing translations
⚠️  fr: 8 missing translations

💾 Updated es.json with 5 new keys
💾 Updated fr.json with 8 new keys

✨ Translation extraction complete!
```

### Check Mode Failure

```
❌ Check failed: 13 missing translations
```

## Best Practices

1. **Run regularly**: Extract translations after adding new features
2. **Check in CI**: Prevent missing translations from reaching production
3. **Review placeholders**: Don't ship auto-generated placeholder text
4. **Keep keys semantic**: Use descriptive key names (`button.save` not `btn1`)
5. **Namespace properly**: Group related translations (`component.name.key`)

## Troubleshooting

### Keys Not Detected

- Ensure using literal strings: `t('key')` ✅
- Avoid variables: `t(keyVar)` ❌
- Avoid template literals with variables: `t(\`key.\${id}\`)` ❌

### Files Not Scanned

- Check file is in scanned directories
- Verify file extension is `.js` or `.html`
- Check file is not in `node_modules` or hidden directory

### Locale File Corruption

- Script creates backup before writing (future enhancement)
- Manual recovery: restore from git

## See Also

- [i18n System Documentation](../DESIGN_SYSTEM.md#i18n-system)
- [useTranslation Hook](../core/i18n/useTranslation.js)
- [Locale Files](../locales/)