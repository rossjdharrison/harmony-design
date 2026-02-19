/**
 * @fileoverview Strict ESLint configuration for Harmony Design System
 * @module config/eslint
 * 
 * POLICY NOTE: This configuration is designed for vanilla TypeScript/JavaScript
 * with strict accessibility rules. React rules are included but commented out
 * as the project uses vanilla Web Components per global policy.
 * 
 * @see {@link ../DESIGN_SYSTEM.md#code-quality Code Quality Standards}
 */

export default [
  {
    // Global ignores
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/coverage/**',
      '**/.vscode/**',
      '**/.github/**',
      '**/harmony-schemas/target/**',
      '**/bounded-contexts/**/target/**',
    ],
  },
  {
    // Base configuration for all JavaScript/TypeScript files
    files: ['**/*.js', '**/*.ts', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        HTMLElement: 'readonly',
        customElements: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        ShadowRoot: 'readonly',
        CSSStyleSheet: 'readonly',
        // Web Components
        ShadowRoot: 'readonly',
        // Testing
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // Node.js (for build scripts only)
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      // ═══════════════════════════════════════════════════════════
      // CRITICAL POLICY ENFORCEMENT
      // ═══════════════════════════════════════════════════════════
      
      // NO npm imports in runtime code - only relative paths
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['!./*', '!../*'],
          message: 'POLICY VIOLATION: Use relative paths only (./file.js or ../dir/file.js). No npm imports in runtime code.',
        }],
      }],

      // ═══════════════════════════════════════════════════════════
      // STRICT ERROR PREVENTION
      // ═══════════════════════════════════════════════════════════
      
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      
      // Variable declaration
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-undef': 'error',
      'no-shadow': 'error',
      'no-redeclare': 'error',
      
      // Code quality
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-with': 'error',
      'no-proto': 'error',
      'no-extend-native': 'error',
      
      // Async/Promise handling
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'require-atomic-updates': 'error',
      
      // Performance-critical rules (16ms render budget)
      'no-loop-func': 'error',
      'no-caller': 'error',
      'no-script-url': 'error',
      
      // Memory management (50MB budget)
      'no-new-wrappers': 'error',
      'no-array-constructor': 'error',
      'no-new-object': 'error',
      
      // ═══════════════════════════════════════════════════════════
      // ACCESSIBILITY (A11Y) - STRICT ENFORCEMENT
      // ═══════════════════════════════════════════════════════════
      
      // Custom rules for Web Components accessibility
      // These enforce WCAG 2.1 Level AA compliance
      
      // Note: These are pattern-based checks. For full a11y validation,
      // use axe-core in integration tests (see tests/a11y/)
      
      // ═══════════════════════════════════════════════════════════
      // CODE STYLE & CONSISTENCY
      // ═══════════════════════════════════════════════════════════
      
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'max-len': ['warn', { 
        code: 100, 
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
      
      // Function complexity (maintainability)
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['warn', 5],
      'complexity': ['warn', 15],
      
      // Documentation requirements
      'require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
        },
      }],
      'valid-jsdoc': ['error', {
        requireReturn: true,
        requireReturnType: false, // TypeScript handles this
        requireParamDescription: true,
        requireReturnDescription: true,
      }],
      
      // ═══════════════════════════════════════════════════════════
      // WEB COMPONENTS SPECIFIC
      // ═══════════════════════════════════════════════════════════
      
      // Enforce proper custom element naming
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression[callee.object.name="customElements"][callee.property.name="define"][arguments.0.value=/^(?![a-z]+-[a-z])/]',
        message: 'Custom element names must contain a hyphen (e.g., "my-element")',
      }],
    },
  },
  {
    // TypeScript-specific rules
    files: ['**/*.ts'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // TypeScript-specific strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      
      // Disable base rules that are covered by TypeScript
      'no-unused-vars': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
    },
  },
  {
    // Build scripts and Node.js files
    files: ['scripts/**/*.js', 'scripts/**/*.mjs', '*.config.js'],
    rules: {
      // Relax import restrictions for build tooling
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // REACT RULES (COMMENTED OUT - POLICY VIOLATION)
  // ═══════════════════════════════════════════════════════════════
  // Uncomment if project policies change to allow React
  // 
  // {
  //   files: ['**/*.jsx', '**/*.tsx'],
  //   plugins: ['react', 'react-hooks', 'jsx-a11y'],
  //   settings: {
  //     react: {
  //       version: 'detect',
  //     },
  //   },
  //   rules: {
  //     // React specific
  //     'react/jsx-uses-react': 'error',
  //     'react/jsx-uses-vars': 'error',
  //     'react/jsx-key': 'error',
  //     'react/no-danger': 'error',
  //     'react/no-deprecated': 'error',
  //     'react/no-direct-mutation-state': 'error',
  //     'react/require-render-return': 'error',
  //     
  //     // React Hooks
  //     'react-hooks/rules-of-hooks': 'error',
  //     'react-hooks/exhaustive-deps': 'warn',
  //     
  //     // JSX Accessibility (jsx-a11y)
  //     'jsx-a11y/alt-text': 'error',
  //     'jsx-a11y/anchor-has-content': 'error',
  //     'jsx-a11y/anchor-is-valid': 'error',
  //     'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
  //     'jsx-a11y/aria-props': 'error',
  //     'jsx-a11y/aria-proptypes': 'error',
  //     'jsx-a11y/aria-role': 'error',
  //     'jsx-a11y/aria-unsupported-elements': 'error',
  //     'jsx-a11y/click-events-have-key-events': 'error',
  //     'jsx-a11y/heading-has-content': 'error',
  //     'jsx-a11y/html-has-lang': 'error',
  //     'jsx-a11y/iframe-has-title': 'error',
  //     'jsx-a11y/img-redundant-alt': 'error',
  //     'jsx-a11y/interactive-supports-focus': 'error',
  //     'jsx-a11y/label-has-associated-control': 'error',
  //     'jsx-a11y/media-has-caption': 'error',
  //     'jsx-a11y/mouse-events-have-key-events': 'error',
  //     'jsx-a11y/no-access-key': 'error',
  //     'jsx-a11y/no-autofocus': 'warn',
  //     'jsx-a11y/no-distracting-elements': 'error',
  //     'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
  //     'jsx-a11y/no-noninteractive-element-interactions': 'error',
  //     'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
  //     'jsx-a11y/no-noninteractive-tabindex': 'error',
  //     'jsx-a11y/no-redundant-roles': 'error',
  //     'jsx-a11y/no-static-element-interactions': 'error',
  //     'jsx-a11y/role-has-required-aria-props': 'error',
  //     'jsx-a11y/role-supports-aria-props': 'error',
  //     'jsx-a11y/scope': 'error',
  //     'jsx-a11y/tabindex-no-positive': 'error',
  //   },
  // },
];