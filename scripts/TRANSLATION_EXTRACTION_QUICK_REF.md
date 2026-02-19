# Translation Extraction Quick Reference

## Extract Translations

```bash
node scripts/extract-translations.js
```

## Check for Missing (CI)

```bash
node scripts/extract-translations.js --check
```

## What Gets Extracted

✅ `t('button.save')` - Single quotes
✅ `t("button.cancel")` - Double quotes  
✅ `t(\`button.delete\`)` - Backticks (no vars)
✅ `useTranslation().t('title')` - Hook pattern

❌ `t(variable)` - Dynamic keys
❌ `t(\`key.\${var}\`)` - Template with vars

## Key Naming

```javascript
// ✅ Good: Semantic, namespaced
t('component.button.save')
t('errors.validation.required')
t('transport.play')

// ❌ Bad: Generic, flat
t('label1')
t('save')
t('msg')
```

## Workflow

1. Write code with `t('new.key')`
2. Run: `node scripts/extract-translations.js`
3. Check `locales/en.json` for new placeholders
4. Update with proper English text
5. Send to translators

## Output

```
🔍 Scanning...
📝 Found 42 unique keys
🌍 Processing 3 locales
✅ en: All present
⚠️  es: 5 missing
💾 Updated es.json
✨ Complete!
```