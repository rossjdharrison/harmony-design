/**
 * Translation Extraction Script Tests
 * 
 * Simple tests to verify extraction patterns work correctly.
 * Run with: node scripts/extract-translations.test.js
 * 
 * @see {@link ./extract-translations.js}
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test cases for translation pattern extraction
 */
const TEST_CASES = [
  {
    name: 'Single quote t() call',
    code: `const label = t('button.save');`,
    expected: ['button.save']
  },
  {
    name: 'Double quote t() call',
    code: `const label = t("button.cancel");`,
    expected: ['button.cancel']
  },
  {
    name: 'Backtick t() call',
    code: `const label = t(\`button.delete\`);`,
    expected: ['button.delete']
  },
  {
    name: 'useTranslation hook',
    code: `const text = useTranslation().t('component.title');`,
    expected: ['component.title']
  },
  {
    name: 'Multiple keys in file',
    code: `
      const save = t('button.save');
      const cancel = t('button.cancel');
      const title = t('component.title');
    `,
    expected: ['button.save', 'button.cancel', 'component.title']
  },
  {
    name: 'Nested object keys',
    code: `const msg = t('errors.validation.required');`,
    expected: ['errors.validation.required']
  },
  {
    name: 'Skip template literals with variables',
    code: `const msg = t(\`error.\${code}\`);`,
    expected: []
  },
  {
    name: 'Skip variable keys',
    code: `const msg = t(dynamicKey);`,
    expected: []
  }
];

/**
 * Extract keys using same patterns as main script
 */
const TRANSLATION_PATTERNS = [
  /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  /useTranslation\s*\(\s*\)\s*\.\s*t\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
];

function extractKeys(content) {
  const keys = new Set();

  for (const pattern of TRANSLATION_PATTERNS) {
    let match;
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      if (key && !key.includes('${')) {
        keys.add(key);
      }
    }
  }

  return Array.from(keys);
}

/**
 * Run tests
 */
function runTests() {
  console.log('🧪 Running translation extraction tests...\n');

  let passed = 0;
  let failed = 0;

  for (const test of TEST_CASES) {
    const extracted = extractKeys(test.code);
    const expectedSet = new Set(test.expected);
    const extractedSet = new Set(extracted);

    // Check if sets are equal
    const isEqual = 
      expectedSet.size === extractedSet.size &&
      [...expectedSet].every(key => extractedSet.has(key));

    if (isEqual) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}`);
      console.log(`   Expected: [${test.expected.join(', ')}]`);
      console.log(`   Got:      [${extracted.join(', ')}]`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();