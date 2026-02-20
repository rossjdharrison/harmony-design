// check-import-cases.cjs — finds relative imports that don't exist on disk
const fs = require('fs');
const path = require('path');

const files = [
  'core/graph/FileSystemStore.test.js',
  'core/reactive-propagation.test.js',
  'harmony-graph/tests/composition_extractor.test.js',
  'harmony-web/js/lifecycle-manager.test.js',
  'scripts/extract-translations.test.js',
  'src/types/__tests__/DesignTokenNode.test.js',
  'tests/control-factory-semantic-map.test.js',
  'tests/core/EventRecorder.test.js',
  'tests/graph/component-intent-commands.test.js',
  'tests/graph/component-intent-link.test.js',
  'tests/graph/component-intent-queries.test.js',
  'tools/track_design_code_sync.test.js',
  'types/component-node.test.js',
  'utils/color-contrast.test.js',
];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  const dir = path.dirname(f);
  const problems = [];

  for (const imp of imports) {
    if (!imp.startsWith('.') && !imp.startsWith('/')) continue; // skip builtins/npm
    const candidates = [imp, imp + '.js', imp + '/index.js'];
    const found = candidates.some(c => {
      try { fs.accessSync(path.resolve(dir, c)); return true; } catch { return false; }
    });
    if (!found) problems.push(imp);
  }

  // Also warn if any import path uses uppercase first char on a known file
  // (case-insensitive on Win, case-sensitive on Linux)
  const caseWarnings = [];
  for (const imp of imports) {
    if (!imp.startsWith('.') && !imp.startsWith('/')) continue;
    const resolved = path.resolve(dir, imp.endsWith('.js') ? imp : imp + '.js');
    const base = path.basename(resolved);
    const parentDir = path.dirname(resolved);
    try {
      const actual = fs.readdirSync(parentDir).find(n => n.toLowerCase() === base.toLowerCase());
      if (actual && actual !== base) caseWarnings.push(`${imp} → actual: ${actual}`);
    } catch {}
  }

  if (problems.length > 0 || caseWarnings.length > 0) {
    console.log(`\nFILE: ${f}`);
    if (problems.length) console.log(`  MISSING: ${problems.join(', ')}`);
    if (caseWarnings.length) console.log(`  CASE MISMATCH: ${caseWarnings.join(', ')}`);
  } else {
    console.log(`OK  ${f}`);
  }
}
