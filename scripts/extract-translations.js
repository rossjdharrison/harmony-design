/**
 * Translation Extraction Script
 * 
 * Scans JavaScript files for translatable strings using t() and useTranslation() patterns.
 * Extracts keys and generates/updates locale JSON files with missing translations.
 * 
 * Usage:
 *   node scripts/extract-translations.js [options]
 * 
 * Options:
 *   --check      Check for missing translations without updating files
 *   --locale     Target locale (default: all locales in locales/)
 *   --verbose    Show detailed extraction information
 * 
 * Patterns detected:
 *   - t('key.path')
 *   - t("key.path")
 *   - t(`key.path`)
 *   - useTranslation().t('key.path')
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#i18n-system}
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const LOCALES_DIR = join(ROOT_DIR, 'locales');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  check: args.includes('--check'),
  verbose: args.includes('--verbose'),
  locale: args.find(arg => arg.startsWith('--locale='))?.split('=')[1] || null
};

/**
 * Regular expressions to match translation function calls
 * Captures the translation key from various patterns
 */
const TRANSLATION_PATTERNS = [
  // t('key') or t("key") or t(`key`)
  /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  // useTranslation().t('key')
  /useTranslation\s*\(\s*\)\s*\.\s*t\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  // const { t } = useTranslation(); ... t('key')
  // This is handled by the first pattern after destructuring
];

/**
 * Directories to scan for translatable strings
 */
const SCAN_DIRECTORIES = [
  'components',
  'controls',
  'organisms',
  'primitives',
  'templates',
  'pages',
  'core',
  'utils',
  'web'
];

/**
 * File extensions to scan
 */
const SCAN_EXTENSIONS = ['.js', '.html'];

/**
 * Recursively find all files in a directory with specific extensions
 * 
 * @param {string} dir - Directory to scan
 * @param {string[]} extensions - File extensions to include
 * @returns {string[]} Array of file paths
 */
function findFiles(dir, extensions) {
  const files = [];
  
  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry !== 'node_modules' && !entry.startsWith('.')) {
        files.push(...findFiles(fullPath, extensions));
      }
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Extract translation keys from file content
 * 
 * @param {string} content - File content
 * @returns {Set<string>} Set of translation keys
 */
function extractKeys(content) {
  const keys = new Set();

  for (const pattern of TRANSLATION_PATTERNS) {
    let match;
    // Reset regex state
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      if (key && !key.includes('${')) { // Skip template literals with variables
        keys.add(key);
      }
    }
  }

  return keys;
}

/**
 * Parse a translation key into nested object path
 * 
 * @param {string} key - Translation key (e.g., 'component.button.label')
 * @returns {string[]} Array of path segments
 */
function parseKeyPath(key) {
  return key.split('.');
}

/**
 * Set a value in a nested object using a key path
 * 
 * @param {Object} obj - Target object
 * @param {string[]} path - Array of path segments
 * @param {*} value - Value to set
 */
function setNestedValue(obj, path, value) {
  let current = obj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (!current[segment] || typeof current[segment] !== 'object') {
      current[segment] = {};
    }
    current = current[segment];
  }
  
  const lastSegment = path[path.length - 1];
  if (!current[lastSegment]) {
    current[lastSegment] = value;
  }
}

/**
 * Get a value from a nested object using a key path
 * 
 * @param {Object} obj - Source object
 * @param {string[]} path - Array of path segments
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
  let current = obj;
  
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[segment];
  }
  
  return current;
}

/**
 * Load existing locale file or return empty object
 * 
 * @param {string} localePath - Path to locale file
 * @returns {Object} Locale data
 */
function loadLocale(localePath) {
  if (!existsSync(localePath)) {
    return {};
  }

  try {
    const content = readFileSync(localePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading locale file ${localePath}:`, error.message);
    return {};
  }
}

/**
 * Save locale data to file with pretty formatting
 * 
 * @param {string} localePath - Path to locale file
 * @param {Object} data - Locale data
 */
function saveLocale(localePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(localePath, content, 'utf-8');
}

/**
 * Main extraction logic
 */
function extractTranslations() {
  console.log('🔍 Scanning for translatable strings...\n');

  // Find all files to scan
  const allFiles = [];
  for (const dir of SCAN_DIRECTORIES) {
    const dirPath = join(ROOT_DIR, dir);
    const files = findFiles(dirPath, SCAN_EXTENSIONS);
    allFiles.push(...files);
  }

  if (options.verbose) {
    console.log(`Found ${allFiles.length} files to scan\n`);
  }

  // Extract all translation keys
  const allKeys = new Set();
  const keysByFile = new Map();

  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8');
    const keys = extractKeys(content);
    
    if (keys.size > 0) {
      const relativePath = relative(ROOT_DIR, file);
      keysByFile.set(relativePath, keys);
      keys.forEach(key => allKeys.add(key));
    }
  }

  console.log(`📝 Found ${allKeys.size} unique translation keys\n`);

  if (options.verbose && keysByFile.size > 0) {
    console.log('Keys by file:');
    for (const [file, keys] of keysByFile) {
      console.log(`  ${file}: ${keys.size} keys`);
    }
    console.log('');
  }

  // Get locale files
  const localeFiles = readdirSync(LOCALES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      name: file.replace('.json', ''),
      path: join(LOCALES_DIR, file)
    }));

  if (options.locale) {
    const filtered = localeFiles.filter(l => l.name === options.locale);
    if (filtered.length === 0) {
      console.error(`❌ Locale '${options.locale}' not found`);
      process.exit(1);
    }
    localeFiles.length = 0;
    localeFiles.push(...filtered);
  }

  console.log(`🌍 Processing ${localeFiles.length} locale(s): ${localeFiles.map(l => l.name).join(', ')}\n`);

  // Process each locale
  const results = [];

  for (const locale of localeFiles) {
    const localeData = loadLocale(locale.path);
    const missingKeys = [];
    const existingKeys = [];

    for (const key of allKeys) {
      const path = parseKeyPath(key);
      const value = getNestedValue(localeData, path);

      if (value === undefined) {
        missingKeys.push(key);
        
        if (!options.check) {
          // Add placeholder translation
          const placeholder = locale.name === 'en' 
            ? key.split('.').pop() // Use last segment as placeholder for English
            : `[${locale.name}] ${key}`; // Mark other locales clearly
          
          setNestedValue(localeData, path, placeholder);
        }
      } else {
        existingKeys.push(key);
      }
    }

    results.push({
      locale: locale.name,
      path: locale.path,
      missing: missingKeys,
      existing: existingKeys,
      data: localeData
    });

    // Report results
    if (missingKeys.length > 0) {
      console.log(`⚠️  ${locale.name}: ${missingKeys.length} missing translations`);
      
      if (options.verbose) {
        missingKeys.forEach(key => console.log(`     - ${key}`));
      }
    } else {
      console.log(`✅ ${locale.name}: All translations present`);
    }
  }

  console.log('');

  // Save or report
  if (options.check) {
    const totalMissing = results.reduce((sum, r) => sum + r.missing.length, 0);
    
    if (totalMissing > 0) {
      console.log(`❌ Check failed: ${totalMissing} missing translations`);
      process.exit(1);
    } else {
      console.log('✅ Check passed: All translations present');
    }
  } else {
    // Save updated locale files
    for (const result of results) {
      if (result.missing.length > 0) {
        saveLocale(result.path, result.data);
        console.log(`💾 Updated ${result.locale}.json with ${result.missing.length} new keys`);
      }
    }

    console.log('\n✨ Translation extraction complete!');
  }
}

// Run extraction
try {
  extractTranslations();
} catch (error) {
  console.error('❌ Error during extraction:', error.message);
  if (options.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
}