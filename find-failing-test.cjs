// find-failing-test.cjs — mirrors exactly the CI runner logic
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IGNORE = new Set(['node_modules', '.git', 'dist']);
const tests = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (e.name.endsWith('.test.js')) tests.push(full);
  }
}
walk('.');

const DOM_APIS = /\bdocument\b|\bwindow\b|\bHTMLElement\b|\bcustomElements\b|\bnavigator\.(?!userAgent)|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/;
const TEST_RUNNER_GLOBALS = /\bdescribe\s*\(|\bbeforeEach\s*\(|\bafterEach\s*\(|\bbeforeAll\s*\(|\bafterAll\s*\(/;

console.log(`Found ${tests.length} test files\n`);

let passed = 0, failed = [], skipped = 0;
for (const t of tests) {
  const src = fs.readFileSync(t, 'utf8');
  if (DOM_APIS.test(src) || TEST_RUNNER_GLOBALS.test(src)) { skipped++; continue; }
  try {
    execSync(`node "${t}"`, { stdio: 'pipe', timeout: 10000 });
    passed++;
  } catch (err) {
    const stderr = (err.stderr || Buffer.alloc(0)).toString();
    const stdout = (err.stdout || Buffer.alloc(0)).toString();
    failed.push({ file: t, stderr, stdout, killed: err.killed });
  }
}

console.log(`Runnable: ${passed} passed, ${failed.length} failed, ${skipped} skipped\n`);

for (const f of failed) {
  console.log('=== FAIL:', path.relative(process.cwd(), f.file));
  if (f.killed) { console.log('  TIMEOUT'); continue; }
  const out = (f.stdout + '\n' + f.stderr).trim();
  console.log(out.slice(-1200));
  console.log('');
}
