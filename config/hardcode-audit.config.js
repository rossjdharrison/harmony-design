/**
 * @fileoverview Configuration for hardcode audit tool
 * Customize patterns, thresholds, and exclusions
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#hardcode-audit
 */

export default {
  /**
   * Severity thresholds for CI/CD integration
   */
  thresholds: {
    high: 100,      // Fail if more than 100 high-severity findings
    medium: 500,    // Warn if more than 500 medium-severity findings
    low: 1000       // Info if more than 1000 low-severity findings
  },
  
  /**
   * Additional directories to exclude
   */
  excludeDirs: [
    'test-pages',
    'examples',
    'docs-backup-20260215-110945'
  ],
  
  /**
   * Additional file patterns to exclude
   */
  excludePatterns: [
    '*.test.js',
    '*.spec.js',
    '*.stories.js',
    'demo-*.html'
  ],
  
  /**
   * Allowlist for specific patterns in specific files
   * Useful for cases where hardcoding is intentional
   */
  allowlist: {
    // Example: allow hex colors in theme files
    'tokens/colors.js': ['hexColors'],
    'styles/theme.css': ['hexColors', 'rgbColors'],
    
    // Example: allow magic numbers in test files
    'tests/**/*.js': ['magicNumbers']
  },
  
  /**
   * Custom patterns to add to the scan
   */
  customPatterns: {
    // Add project-specific patterns here
  },
  
  /**
   * Output formats to generate
   */
  outputFormats: ['markdown', 'json', 'csv'],
  
  /**
   * Integration settings
   */
  integration: {
    // Post results to GitHub as PR comment
    github: {
      enabled: false,
      token: process.env.GITHUB_TOKEN
    },
    
    // Send to Slack
    slack: {
      enabled: false,
      webhook: process.env.SLACK_WEBHOOK
    }
  }
};