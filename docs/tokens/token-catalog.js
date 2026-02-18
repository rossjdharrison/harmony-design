/**
 * @fileoverview Token Catalog - Interactive documentation for design tokens
 * @module docs/tokens/token-catalog
 * 
 * Provides visual previews and usage examples for all design tokens.
 * Reads from design-tokens.json and generates interactive documentation.
 * 
 * Related: {@link ../../core/token-provider.js}, {@link ../../tokens/design-tokens.json}
 * See: DESIGN_SYSTEM.md#token-system
 */

/**
 * Token category definitions with metadata
 * @type {Object<string, {title: string, description: string, renderPreview: Function}>}
 */
const TOKEN_CATEGORIES = {
  colors: {
    title: 'Color Tokens',
    description: 'Semantic color tokens for backgrounds, text, borders, and interactive elements',
    renderPreview: (token) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = token.value;
      return swatch;
    }
  },
  typography: {
    title: 'Typography Tokens',
    description: 'Font families, sizes, weights, and line heights for consistent text rendering',
    renderPreview: (token) => {
      const sample = document.createElement('div');
      sample.className = 'typography-sample';
      
      if (token.name.includes('font-family')) {
        sample.style.fontFamily = token.value;
        sample.textContent = 'The quick brown fox jumps over the lazy dog';
      } else if (token.name.includes('font-size')) {
        sample.style.fontSize = token.value;
        sample.textContent = 'Sample Text';
      } else if (token.name.includes('font-weight')) {
        sample.style.fontWeight = token.value;
        sample.textContent = 'Sample Text Weight';
      } else if (token.name.includes('line-height')) {
        sample.style.lineHeight = token.value;
        sample.textContent = 'Line height affects vertical rhythm and readability of text content.';
      }
      
      return sample;
    }
  },
  spacing: {
    title: 'Spacing Tokens',
    description: 'Consistent spacing scale for margins, padding, and layout gaps',
    renderPreview: (token) => {
      const box = document.createElement('div');
      box.className = 'spacing-box';
      box.style.width = token.value;
      box.style.height = token.value;
      return box;
    }
  },
  borders: {
    title: 'Border Tokens',
    description: 'Border widths, styles, and radius values for component styling',
    renderPreview: (token) => {
      const box = document.createElement('div');
      box.style.width = '100px';
      box.style.height = '60px';
      box.style.background = 'var(--color-background-secondary)';
      
      if (token.name.includes('radius')) {
        box.style.borderRadius = token.value;
        box.style.border = '2px solid var(--color-border-primary)';
      } else if (token.name.includes('width')) {
        box.style.borderWidth = token.value;
        box.style.borderStyle = 'solid';
        box.style.borderColor = 'var(--color-border-primary)';
      }
      
      return box;
    }
  },
  shadows: {
    title: 'Shadow Tokens',
    description: 'Box shadow presets for depth and elevation',
    renderPreview: (token) => {
      const box = document.createElement('div');
      box.style.width = '100px';
      box.style.height = '60px';
      box.style.background = 'var(--color-background-primary)';
      box.style.boxShadow = token.value;
      box.style.borderRadius = '4px';
      return box;
    }
  },
  animations: {
    title: 'Animation Tokens',
    description: 'Timing functions and durations for consistent motion',
    renderPreview: (token) => {
      const box = document.createElement('div');
      box.style.width = '60px';
      box.style.height = '60px';
      box.style.background = 'var(--color-primary)';
      box.style.borderRadius = '4px';
      box.style.opacity = '0.8';
      
      // Animate on hover
      box.addEventListener('mouseenter', () => {
        if (token.name.includes('duration')) {
          box.style.transition = `transform ${token.value} ease`;
        } else if (token.name.includes('timing')) {
          box.style.transition = `transform 300ms ${token.value}`;
        }
        box.style.transform = 'scale(1.2) rotate(5deg)';
      });
      
      box.addEventListener('mouseleave', () => {
        box.style.transform = 'scale(1) rotate(0deg)';
      });
      
      return box;
    }
  }
};

/**
 * Categorize a token based on its name
 * @param {string} tokenName - CSS variable name
 * @returns {string} Category key
 */
function categorizeToken(tokenName) {
  if (tokenName.includes('color')) return 'colors';
  if (tokenName.includes('font') || tokenName.includes('line-height')) return 'typography';
  if (tokenName.includes('spacing') || tokenName.includes('gap')) return 'spacing';
  if (tokenName.includes('border') || tokenName.includes('radius')) return 'borders';
  if (tokenName.includes('shadow')) return 'shadows';
  if (tokenName.includes('duration') || tokenName.includes('timing')) return 'animations';
  return 'other';
}

/**
 * Generate usage examples for a token
 * @param {Object} token - Token object with name and value
 * @returns {string[]} Array of usage example strings
 */
function generateUsageExamples(token) {
  const examples = [];
  const category = categorizeToken(token.name);
  
  if (category === 'colors') {
    examples.push(`background: var(${token.name});`);
    examples.push(`color: var(${token.name});`);
    examples.push(`border-color: var(${token.name});`);
  } else if (category === 'typography') {
    if (token.name.includes('font-family')) {
      examples.push(`font-family: var(${token.name});`);
    } else if (token.name.includes('font-size')) {
      examples.push(`font-size: var(${token.name});`);
    } else if (token.name.includes('font-weight')) {
      examples.push(`font-weight: var(${token.name});`);
    } else if (token.name.includes('line-height')) {
      examples.push(`line-height: var(${token.name});`);
    }
  } else if (category === 'spacing') {
    examples.push(`margin: var(${token.name});`);
    examples.push(`padding: var(${token.name});`);
    examples.push(`gap: var(${token.name});`);
  } else if (category === 'borders') {
    if (token.name.includes('radius')) {
      examples.push(`border-radius: var(${token.name});`);
    } else {
      examples.push(`border-width: var(${token.name});`);
    }
  } else if (category === 'shadows') {
    examples.push(`box-shadow: var(${token.name});`);
  } else if (category === 'animations') {
    if (token.name.includes('duration')) {
      examples.push(`transition-duration: var(${token.name});`);
    } else {
      examples.push(`transition-timing-function: var(${token.name});`);
    }
  }
  
  return examples;
}

/**
 * Create a token card element
 * @param {Object} token - Token object
 * @param {string} category - Category key
 * @returns {HTMLElement} Token card element
 */
function createTokenCard(token, category) {
  const card = document.createElement('div');
  card.className = 'token-card';
  card.dataset.category = category;
  card.dataset.tokenName = token.name.toLowerCase();
  
  // Preview section
  const preview = document.createElement('div');
  preview.className = 'token-preview';
  
  const categoryConfig = TOKEN_CATEGORIES[category];
  if (categoryConfig && categoryConfig.renderPreview) {
    preview.appendChild(categoryConfig.renderPreview(token));
  } else {
    preview.textContent = token.value;
  }
  
  // Token information
  const name = document.createElement('div');
  name.className = 'token-name';
  name.textContent = token.name;
  
  const value = document.createElement('div');
  value.className = 'token-value';
  value.textContent = `Value: ${token.value}`;
  
  // Usage examples
  const usageExamples = generateUsageExamples(token);
  const usage = document.createElement('div');
  usage.className = 'token-usage';
  usage.innerHTML = '<strong>Usage:</strong><br>' + usageExamples.join('<br>');
  
  // Code example
  const codeExample = document.createElement('div');
  codeExample.className = 'code-example';
  codeExample.innerHTML = `<span class="comment">/* CSS */</span>
<span class="keyword">.my-component</span> {
  ${usageExamples[0] || `/* Use ${token.name} */`}
}

<span class="comment">/* JavaScript with useToken hook */</span>
<span class="keyword">const</span> value = useToken(<span class="string">'${token.name.replace('--', '')}'</span>);`;
  
  card.appendChild(preview);
  card.appendChild(name);
  card.appendChild(value);
  card.appendChild(usage);
  card.appendChild(codeExample);
  
  return card;
}

/**
 * Load tokens from CSS and render catalog
 * @returns {Promise<void>}
 */
async function loadAndRenderTokens() {
  const catalog = document.getElementById('tokenCatalog');
  
  // Extract tokens from computed styles
  const rootStyles = getComputedStyle(document.documentElement);
  const tokens = [];
  
  // Get all CSS custom properties
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sheet = document.styleSheets[i];
      if (!sheet.cssRules) continue;
      
      for (let j = 0; j < sheet.cssRules.length; j++) {
        const rule = sheet.cssRules[j];
        if (rule.style) {
          for (let k = 0; k < rule.style.length; k++) {
            const prop = rule.style[k];
            if (prop.startsWith('--')) {
              const value = rule.style.getPropertyValue(prop).trim();
              if (value && !tokens.find(t => t.name === prop)) {
                tokens.push({ name: prop, value });
              }
            }
          }
        }
      }
    } catch (e) {
      // CORS or security error - skip this stylesheet
      console.warn('Could not access stylesheet:', e);
    }
  }
  
  // Group tokens by category
  const tokensByCategory = {};
  tokens.forEach(token => {
    const category = categorizeToken(token.name);
    if (!tokensByCategory[category]) {
      tokensByCategory[category] = [];
    }
    tokensByCategory[category].push(token);
  });
  
  // Render sections
  Object.keys(TOKEN_CATEGORIES).forEach(categoryKey => {
    const categoryTokens = tokensByCategory[categoryKey] || [];
    if (categoryTokens.length === 0) return;
    
    const section = document.createElement('div');
    section.className = 'token-section';
    section.dataset.category = categoryKey;
    
    const title = document.createElement('h2');
    title.textContent = TOKEN_CATEGORIES[categoryKey].title;
    
    const description = document.createElement('p');
    description.textContent = TOKEN_CATEGORIES[categoryKey].description;
    
    const grid = document.createElement('div');
    grid.className = 'token-grid';
    
    categoryTokens.forEach(token => {
      grid.appendChild(createTokenCard(token, categoryKey));
    });
    
    section.appendChild(title);
    section.appendChild(description);
    section.appendChild(grid);
    catalog.appendChild(section);
  });
}

/**
 * Filter tokens based on search query
 * @param {string} query - Search query
 */
function filterTokens(query) {
  const cards = document.querySelectorAll('.token-card');
  const lowerQuery = query.toLowerCase();
  
  cards.forEach(card => {
    const tokenName = card.dataset.tokenName;
    const matches = tokenName.includes(lowerQuery);
    card.classList.toggle('hidden', !matches);
  });
}

/**
 * Filter tokens by category
 * @param {string} category - Category key or 'all'
 */
function filterByCategory(category) {
  const sections = document.querySelectorAll('.token-section');
  
  sections.forEach(section => {
    if (category === 'all') {
      section.classList.remove('hidden');
    } else {
      section.classList.toggle('hidden', section.dataset.category !== category);
    }
  });
}

/**
 * Initialize catalog interactions
 */
function initializeCatalog() {
  // Search functionality
  const searchBox = document.getElementById('tokenSearch');
  searchBox.addEventListener('input', (e) => {
    filterTokens(e.target.value);
  });
  
  // Category navigation
  const navButtons = document.querySelectorAll('.catalog-nav button');
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filterByCategory(button.dataset.category);
    });
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndRenderTokens();
  initializeCatalog();
});