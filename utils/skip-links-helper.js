/**
 * @fileoverview Skip Links Helper - Utility functions for adding skip links
 * @module utils/skip-links-helper
 * 
 * Helper functions to automatically generate and inject skip links into pages
 * based on common landmarks.
 * 
 * Related Documentation: DESIGN_SYSTEM.md § Accessibility Primitives
 * Related Components: primitives/skip-links.js
 */

/**
 * Common skip link configurations for different page types
 * @type {Object.<string, Array<{href: string, text: string}>>}
 */
export const SKIP_LINK_PRESETS = {
  standard: [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' }
  ],
  
  withSearch: [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#search', text: 'Skip to search' },
    { href: '#navigation', text: 'Skip to navigation' }
  ],
  
  withSidebar: [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#sidebar', text: 'Skip to sidebar' },
    { href: '#navigation', text: 'Skip to navigation' }
  ],
  
  fullPage: [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' },
    { href: '#footer', text: 'Skip to footer' }
  ]
};

/**
 * Create skip links element with specified configuration
 * 
 * @param {Array<{href: string, text: string}>} links - Array of link configurations
 * @param {Object} options - Additional options
 * @param {string} options.className - CSS class to add to skip-links element
 * @returns {HTMLElement} Configured skip-links element
 * 
 * @example
 * const skipLinks = createSkipLinks(SKIP_LINK_PRESETS.standard);
 * document.body.insertBefore(skipLinks, document.body.firstChild);
 */
export function createSkipLinks(links, options = {}) {
  const skipLinksEl = document.createElement('skip-links');
  
  if (options.className) {
    skipLinksEl.className = options.className;
  }
  
  links.forEach(link => {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.text;
    
    if (link.ariaLabel) {
      anchor.setAttribute('aria-label', link.ariaLabel);
    }
    
    skipLinksEl.appendChild(anchor);
  });
  
  return skipLinksEl;
}

/**
 * Automatically inject skip links at the start of the document body
 * 
 * @param {string} presetName - Name of preset from SKIP_LINK_PRESETS
 * @param {Object} options - Additional options
 * @returns {HTMLElement} The created skip-links element
 * 
 * @example
 * // In your page initialization
 * injectSkipLinks('standard');
 */
export function injectSkipLinks(presetName = 'standard', options = {}) {
  const links = SKIP_LINK_PRESETS[presetName];
  
  if (!links) {
    console.warn(`[SkipLinksHelper] Unknown preset: ${presetName}`);
    return null;
  }
  
  const skipLinksEl = createSkipLinks(links, options);
  
  // Insert as first child of body
  if (document.body.firstChild) {
    document.body.insertBefore(skipLinksEl, document.body.firstChild);
  } else {
    document.body.appendChild(skipLinksEl);
  }
  
  return skipLinksEl;
}

/**
 * Auto-discover landmarks in the page and generate skip links
 * 
 * Looks for common landmark elements and generates appropriate skip links.
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeSearch - Include search landmark if found
 * @param {boolean} options.includeSidebar - Include sidebar/aside if found
 * @param {boolean} options.includeFooter - Include footer if found
 * @returns {HTMLElement|null} Generated skip-links element or null if no landmarks found
 * 
 * @example
 * // Automatically generate skip links based on page structure
 * document.addEventListener('DOMContentLoaded', () => {
 *   autoGenerateSkipLinks({ includeFooter: true });
 * });
 */
export function autoGenerateSkipLinks(options = {}) {
  const {
    includeSearch = true,
    includeSidebar = true,
    includeFooter = true
  } = options;
  
  const links = [];
  
  // Main content (required)
  const main = document.querySelector('main, [role="main"], #main-content, #main');
  if (main) {
    if (!main.id) {
      main.id = 'main-content';
    }
    links.push({ href: `#${main.id}`, text: 'Skip to main content' });
  }
  
  // Search
  if (includeSearch) {
    const search = document.querySelector('[role="search"], #search, .search-form');
    if (search) {
      if (!search.id) {
        search.id = 'search';
      }
      links.push({ href: `#${search.id}`, text: 'Skip to search' });
    }
  }
  
  // Navigation
  const nav = document.querySelector('nav, [role="navigation"], #navigation');
  if (nav) {
    if (!nav.id) {
      nav.id = 'navigation';
    }
    links.push({ href: `#${nav.id}`, text: 'Skip to navigation' });
  }
  
  // Sidebar
  if (includeSidebar) {
    const sidebar = document.querySelector('aside, [role="complementary"], #sidebar');
    if (sidebar) {
      if (!sidebar.id) {
        sidebar.id = 'sidebar';
      }
      links.push({ href: `#${sidebar.id}`, text: 'Skip to sidebar' });
    }
  }
  
  // Footer
  if (includeFooter) {
    const footer = document.querySelector('footer, [role="contentinfo"], #footer');
    if (footer) {
      if (!footer.id) {
        footer.id = 'footer';
      }
      links.push({ href: `#${footer.id}`, text: 'Skip to footer' });
    }
  }
  
  if (links.length === 0) {
    console.warn('[SkipLinksHelper] No landmarks found for skip links');
    return null;
  }
  
  const skipLinksEl = createSkipLinks(links);
  
  // Insert as first child of body
  if (document.body.firstChild) {
    document.body.insertBefore(skipLinksEl, document.body.firstChild);
  } else {
    document.body.appendChild(skipLinksEl);
  }
  
  console.log(`[SkipLinksHelper] Generated ${links.length} skip links`);
  return skipLinksEl;
}

/**
 * Validate that all skip link targets exist in the document
 * 
 * @param {HTMLElement} skipLinksElement - The skip-links element to validate
 * @returns {Object} Validation result with missing targets
 * 
 * @example
 * const skipLinks = document.querySelector('skip-links');
 * const validation = validateSkipLinks(skipLinks);
 * if (!validation.valid) {
 *   console.warn('Missing targets:', validation.missing);
 * }
 */
export function validateSkipLinks(skipLinksElement) {
  const links = skipLinksElement.querySelectorAll('a');
  const missing = [];
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const targetId = href.substring(1);
      const target = document.getElementById(targetId);
      if (!target) {
        missing.push({
          href,
          text: link.textContent,
          targetId
        });
      }
    }
  });
  
  return {
    valid: missing.length === 0,
    missing,
    total: links.length
  };
}