/**
 * @fileoverview Storybook Manager Configuration
 * @module .storybook/manager
 * 
 * Configures the Storybook manager UI with custom theme and addons.
 * The manager is the outer UI that wraps the preview iframe.
 * 
 * @see {@link https://storybook.js.org/docs/react/configure/features-and-behavior|Storybook Configuration}
 * @see .storybook/harmony-theme.js for theme definitions
 */

import { addons } from '@storybook/manager-api';
import { lightTheme, darkTheme } from './harmony-theme';

/**
 * Detect user's preferred color scheme
 * @returns {'light' | 'dark'} The preferred theme
 */
function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light';
  
  // Check localStorage for saved preference
  const saved = localStorage.getItem('harmony-storybook-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

/**
 * Apply the selected theme to Storybook
 */
const preferredTheme = getPreferredTheme();
const theme = preferredTheme === 'dark' ? darkTheme : lightTheme;

addons.setConfig({
  theme,
  
  /**
   * Show/hide various UI elements
   */
  showNav: true,
  showPanel: true,
  panelPosition: 'bottom',
  
  /**
   * Enable keyboard shortcuts
   */
  enableShortcuts: true,
  
  /**
   * Show toolbar by default
   */
  isToolshown: true,
  
  /**
   * Initial active sidebar item
   */
  initialActive: 'sidebar',
  
  /**
   * Sidebar configuration
   */
  sidebar: {
    showRoots: true,
    collapsedRoots: ['other'],
    renderLabel: (item) => {
      // Custom label rendering for sidebar items
      return item.name;
    },
  },
  
  /**
   * Toolbar configuration
   */
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});

/**
 * Listen for theme changes and persist preference
 */
if (typeof window !== 'undefined') {
  // Save theme preference when changed
  window.addEventListener('storage', (e) => {
    if (e.key === 'harmony-storybook-theme') {
      // Theme changed in another tab, reload to apply
      window.location.reload();
    }
  });
  
  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      localStorage.setItem('harmony-storybook-theme', newTheme);
      window.location.reload();
    });
  }
}