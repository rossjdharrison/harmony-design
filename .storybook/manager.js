/**
 * Storybook 8 Manager Configuration
 * 
 * Customizes the Storybook UI manager interface.
 * Configures branding and theme for the Storybook chrome.
 * 
 * @see DESIGN_SYSTEM.md#storybook-configuration
 */

import { addons } from '@storybook/manager-api';
import { themes } from '@storybook/theming';

addons.setConfig({
  theme: {
    ...themes.normal,
    brandTitle: 'Harmony Design System',
    brandUrl: 'https://github.com/yourusername/harmony-design',
    brandImage: undefined,
    brandTarget: '_self',
    
    // Color palette aligned with design system
    colorPrimary: '#6366f1',
    colorSecondary: '#8b5cf6',
    
    // UI
    appBg: '#ffffff',
    appContentBg: '#ffffff',
    appBorderColor: '#e5e7eb',
    appBorderRadius: 8,
    
    // Typography
    fontBase: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontCode: '"Fira Code", "Courier New", monospace',
    
    // Text colors
    textColor: '#1f2937',
    textInverseColor: '#ffffff',
    
    // Toolbar default and active colors
    barTextColor: '#6b7280',
    barSelectedColor: '#6366f1',
    barBg: '#f9fafb',
    
    // Form colors
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    inputTextColor: '#1f2937',
    inputBorderRadius: 6,
  },
  
  // Panel position
  panelPosition: 'bottom',
  
  // Show addon panel by default
  showPanel: true,
  
  // Sidebar configuration
  sidebar: {
    showRoots: true,
    collapsedRoots: ['other'],
  },
  
  // Toolbar configuration
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});