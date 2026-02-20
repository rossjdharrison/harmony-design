# Security Module

This directory contains security and compliance tools for the Harmony Design System.

## Components

### License Checker (`license-checker.js`)

Verifies that all npm dependencies use approved open-source licenses.

**Approved Licenses:**
- MIT
- Apache-2.0
- BSD-2-Clause, BSD-3-Clause
- ISC
- CC0-1.0
- Unlicense
- 0BSD
- BlueOak-1.0.0
- Python-2.0 (for dev tools)

**Usage:**

```bash
# Check licenses
node scripts/check-licenses.js

# Export to JSON
node scripts/check-licenses.js --json reports/licenses.json

# Fail on licenses needing review
node scripts/check-licenses.js --fail-on-review

# Verbose output
node scripts/check-licenses.js --verbose
```

**CI Integration:**

The license checker runs automatically on:
- Pull requests that modify `package.json` or `package-lock.json`
- Pushes to `main` and `develop` branches
- Manual workflow dispatch

**Adding Exceptions:**

If a dependency has a non-standard license but is approved for use, add it to `LICENSE_EXCEPTIONS` in `license-checker.js`:

```javascript
const LICENSE_EXCEPTIONS = {
  'package-name': 'Reason: Approved by legal team on YYYY-MM-DD',
};
```

## Related Documentation

See `DESIGN_SYSTEM.md` § Security & Compliance for architectural context.