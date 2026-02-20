/**
 * @fileoverview ESLint plugin for Harmony Design System deprecation warnings
 * @module eslint-plugin-harmony-deprecation
 * 
 * Detects usage of deprecated patterns and provides migration guidance.
 * Enforces architectural rules and best practices.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#deprecation-warnings}
 */

/**
 * Deprecated patterns registry with migration paths
 * @type {Object.<string, DeprecationInfo>}
 */
const DEPRECATED_PATTERNS = {
  // Direct BC calls from UI
  'direct-bc-call': {
    pattern: /boundedContext\.\w+\(/,
    message: 'Direct bounded context calls are deprecated. Use EventBus pattern instead.',
    severity: 'error',
    migrationPath: 'Publish event via EventBus → BC subscribes → processes → publishes result',
    docLink: 'DESIGN_SYSTEM.md#event-bus-architecture'
  },
  
  // Async in audio thread
  'async-audio-thread': {
    pattern: /async\s+process\s*\(/,
    message: 'Async operations in audio render thread violate real-time constraints.',
    severity: 'error',
    migrationPath: 'Use synchronous processing or move to worker thread',
    docLink: 'DESIGN_SYSTEM.md#audio-processing-latency'
  },
  
  // React/Framework usage
  'react-import': {
    pattern: /import\s+.*\s+from\s+['"]react['"]/,
    message: 'React is not allowed. Use vanilla Web Components.',
    severity: 'error',
    migrationPath: 'Convert to Web Component with shadow DOM',
    docLink: 'DESIGN_SYSTEM.md#web-components-architecture'
  },
  
  // Direct DOM manipulation without shadow DOM
  'document-query': {
    pattern: /document\.querySelector/,
    message: 'Direct document queries bypass shadow DOM encapsulation.',
    severity: 'warning',
    migrationPath: 'Use this.shadowRoot.querySelector() in Web Components',
    docLink: 'DESIGN_SYSTEM.md#shadow-dom-encapsulation'
  },
  
  // Old event pattern
  'custom-event-old': {
    pattern: /new\s+CustomEvent\s*\(\s*['"]harmony:/,
    message: 'Old event naming convention. Use EventBus.publish() instead.',
    severity: 'warning',
    migrationPath: 'EventBus.publish({ type: "CommandName", payload: {...} })',
    docLink: 'DESIGN_SYSTEM.md#event-bus-commands'
  },
  
  // Electron usage
  'electron-import': {
    pattern: /require\s*\(\s*['"]electron['"]\s*\)/,
    message: 'Electron is deprecated. Use Tauri for desktop wrapper.',
    severity: 'error',
    migrationPath: 'Migrate to Tauri-based desktop wrapper',
    docLink: 'DESIGN_SYSTEM.md#desktop-wrapper'
  },
  
  // Direct Rust editing
  'rust-direct-edit': {
    pattern: /\/\/ TODO: Update schema/,
    message: 'Direct Rust edits detected. Modify schema first, then run codegen.',
    severity: 'error',
    migrationPath: 'Edit harmony-schemas → run codegen → verify compilation',
    docLink: 'DESIGN_SYSTEM.md#schema-driven-development'
  },
  
  // Production npm dependencies
  'npm-runtime-dependency': {
    pattern: /dependencies.*:/,
    message: 'Runtime npm dependencies detected. Use only for build tools.',
    severity: 'warning',
    migrationPath: 'Move to devDependencies or implement in vanilla JS',
    docLink: 'DESIGN_SYSTEM.md#dependency-policy'
  }
};

/**
 * @typedef {Object} DeprecationInfo
 * @property {RegExp} pattern - Pattern to match deprecated code
 * @property {string} message - Deprecation warning message
 * @property {'error'|'warning'} severity - Severity level
 * @property {string} migrationPath - How to migrate away from deprecated pattern
 * @property {string} docLink - Link to documentation
 */

/**
 * Rule: no-direct-bc-calls
 * Prevents direct bounded context method calls from UI components
 */
const noDirectBCCalls = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct bounded context calls from UI components',
      category: 'Architecture',
      recommended: true,
      url: 'DESIGN_SYSTEM.md#event-bus-architecture'
    },
    messages: {
      directBCCall: 'UI components must not call bounded contexts directly. Use EventBus.publish() instead. Migration: {{migrationPath}}',
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        // Check for boundedContext.method() pattern
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'boundedContext') {
          context.report({
            node,
            messageId: 'directBCCall',
            data: {
              migrationPath: DEPRECATED_PATTERNS['direct-bc-call'].migrationPath
            }
          });
        }
      }
    };
  }
};

/**
 * Rule: no-async-audio-thread
 * Prevents async operations in audio processing code
 */
const noAsyncAudioThread = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow async operations in audio render thread',
      category: 'Performance',
      recommended: true,
      url: 'DESIGN_SYSTEM.md#audio-processing-latency'
    },
    messages: {
      asyncInAudio: 'Async operations violate audio thread real-time constraints ({{latency}}ms max). Use synchronous processing.',
    },
    schema: []
  },
  create(context) {
    const filename = context.getFilename();
    const isAudioFile = filename.includes('audio') || 
                        filename.includes('AudioWorklet') ||
                        filename.includes('processor');
    
    if (!isAudioFile) return {};
    
    return {
      FunctionDeclaration(node) {
        if (node.async && node.id && node.id.name === 'process') {
          context.report({
            node,
            messageId: 'asyncInAudio',
            data: { latency: '10' }
          });
        }
      },
      ArrowFunctionExpression(node) {
        if (node.async && node.parent.type === 'VariableDeclarator' &&
            node.parent.id.name === 'process') {
          context.report({
            node,
            messageId: 'asyncInAudio',
            data: { latency: '10' }
          });
        }
      }
    };
  }
};

/**
 * Rule: no-framework-imports
 * Prevents usage of React, Vue, or other frameworks
 */
const noFrameworkImports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow framework imports (React, Vue, etc.)',
      category: 'Architecture',
      recommended: true,
      url: 'DESIGN_SYSTEM.md#web-components-architecture'
    },
    messages: {
      frameworkImport: 'Framework "{{framework}}" is not allowed. Use vanilla Web Components with shadow DOM.',
    },
    schema: []
  },
  create(context) {
    const FORBIDDEN_FRAMEWORKS = ['react', 'vue', 'angular', 'svelte', 'leptos'];
    
    return {
      ImportDeclaration(node) {
        const importSource = node.source.value.toLowerCase();
        const framework = FORBIDDEN_FRAMEWORKS.find(fw => importSource.includes(fw));
        
        if (framework) {
          context.report({
            node,
            messageId: 'frameworkImport',
            data: { framework }
          });
        }
      }
    };
  }
};

/**
 * Rule: shadow-dom-queries
 * Enforces shadow DOM query patterns in Web Components
 */
const shadowDOMQueries = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce shadow DOM queries in Web Components',
      category: 'Best Practices',
      recommended: true,
      url: 'DESIGN_SYSTEM.md#shadow-dom-encapsulation'
    },
    messages: {
      documentQuery: 'Use this.shadowRoot.querySelector() instead of document.querySelector() for shadow DOM encapsulation.',
    },
    schema: []
  },
  create(context) {
    const filename = context.getFilename();
    const isComponent = filename.includes('component') || 
                        filename.includes('web-components');
    
    if (!isComponent) return {};
    
    return {
      MemberExpression(node) {
        if (node.object.name === 'document' &&
            (node.property.name === 'querySelector' ||
             node.property.name === 'querySelectorAll')) {
          context.report({
            node,
            messageId: 'documentQuery'
          });
        }
      }
    };
  }
};

/**
 * Rule: eventbus-pattern
 * Enforces EventBus.publish() pattern over CustomEvent
 */
const eventBusPattern = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce EventBus.publish() over old CustomEvent pattern',
      category: 'Best Practices',
      recommended: true,
      url: 'DESIGN_SYSTEM.md#event-bus-commands'
    },
    messages: {
      oldEventPattern: 'Use EventBus.publish({ type, payload }) instead of CustomEvent with "harmony:" prefix.',
    },
    schema: []
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.name === 'CustomEvent' &&
            node.arguments[0] &&
            node.arguments[0].type === 'Literal' &&
            typeof node.arguments[0].value === 'string' &&
            node.arguments[0].value.startsWith('harmony:')) {
          context.report({
            node,
            messageId: 'oldEventPattern'
          });
        }
      }
    };
  }
};

/**
 * Rule: no-electron
 * Prevents Electron usage (use Tauri instead)
 */
const noElectron = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Electron (use Tauri for desktop wrapper)',
      category: 'Architecture',
      recommended: true,
      url: 'DESIGN_SYSTEM.md#desktop-wrapper'
    },
    messages: {
      electronUsage: 'Electron is deprecated. Use Tauri for desktop wrapper.',
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.name === 'require' &&
            node.arguments[0] &&
            node.arguments[0].value === 'electron') {
          context.report({
            node,
            messageId: 'electronUsage'
          });
        }
      },
      ImportDeclaration(node) {
        if (node.source.value === 'electron') {
          context.report({
            node,
            messageId: 'electronUsage'
          });
        }
      }
    };
  }
};

/**
 * Rule: performance-budgets
 * Warns about potential performance budget violations
 */
const performanceBudgets = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn about potential performance budget violations',
      category: 'Performance',
      recommended: true,
      url: 'DESIGN_SYSTEM.md#performance-budgets'
    },
    messages: {
      heavyLoop: 'Large loop detected ({{iterations}} iterations). May violate 16ms render budget.',
      largeArray: 'Large array allocation ({{size}}). Monitor memory budget (50MB max).',
    },
    schema: []
  },
  create(context) {
    return {
      ForStatement(node) {
        // Detect large loops
        if (node.test && node.test.type === 'BinaryExpression') {
          const right = node.test.right;
          if (right.type === 'Literal' && typeof right.value === 'number' && right.value > 10000) {
            context.report({
              node,
              messageId: 'heavyLoop',
              data: { iterations: right.value }
            });
          }
        }
      },
      NewExpression(node) {
        // Detect large array allocations
        if (node.callee.name === 'Array' && node.arguments[0]) {
          const size = node.arguments[0];
          if (size.type === 'Literal' && typeof size.value === 'number' && size.value > 100000) {
            context.report({
              node,
              messageId: 'largeArray',
              data: { size: size.value }
            });
          }
        }
      }
    };
  }
};

/**
 * ESLint plugin export
 */
module.exports = {
  rules: {
    'no-direct-bc-calls': noDirectBCCalls,
    'no-async-audio-thread': noAsyncAudioThread,
    'no-framework-imports': noFrameworkImports,
    'shadow-dom-queries': shadowDOMQueries,
    'eventbus-pattern': eventBusPattern,
    'no-electron': noElectron,
    'performance-budgets': performanceBudgets
  },
  configs: {
    recommended: {
      plugins: ['harmony-deprecation'],
      rules: {
        'harmony-deprecation/no-direct-bc-calls': 'error',
        'harmony-deprecation/no-async-audio-thread': 'error',
        'harmony-deprecation/no-framework-imports': 'error',
        'harmony-deprecation/shadow-dom-queries': 'warn',
        'harmony-deprecation/eventbus-pattern': 'warn',
        'harmony-deprecation/no-electron': 'error',
        'harmony-deprecation/performance-budgets': 'warn'
      }
    },
    strict: {
      plugins: ['harmony-deprecation'],
      rules: {
        'harmony-deprecation/no-direct-bc-calls': 'error',
        'harmony-deprecation/no-async-audio-thread': 'error',
        'harmony-deprecation/no-framework-imports': 'error',
        'harmony-deprecation/shadow-dom-queries': 'error',
        'harmony-deprecation/eventbus-pattern': 'error',
        'harmony-deprecation/no-electron': 'error',
        'harmony-deprecation/performance-budgets': 'error'
      }
    }
  }
};