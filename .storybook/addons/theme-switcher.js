/**
 * @fileoverview Theme Switcher Addon for Storybook
 * @module .storybook/addons/theme-switcher
 * 
 * Provides a toolbar button to toggle between light and dark themes
 * in the Storybook manager UI.
 * 
 * Usage: Automatically registered in manager.js
 */

import { addons, types } from '@storybook/manager-api';
import { IconButton } from '@storybook/components';
import React from 'react';

const ADDON_ID = 'harmony/theme-switcher';
const TOOL_ID = `${ADDON_ID}/tool`;

/**
 * Theme Switcher Tool Component
 * Renders a button in the toolbar to toggle theme
 */
const ThemeSwitcher = () => {
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('harmony-storybook-theme') || 'light';
  });
  
  const toggleTheme = React.useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('harmony-storybook-theme', newTheme);
    
    // Reload to apply new theme
    window.location.reload();
  }, [theme]);
  
  return React.createElement(
    IconButton,
    {
      key: TOOL_ID,
      title: `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`,
      onClick: toggleTheme,
    },
    React.createElement(
      'svg',
      {
        width: '14',
        height: '14',
        viewBox: '0 0 14 14',
        fill: 'currentColor',
      },
      theme === 'light'
        ? // Moon icon for dark mode
          React.createElement('path', {
            d: 'M7 0a7 7 0 1 0 0 14 5.5 5.5 0 0 1 0-11 5.5 5.5 0 0 1 0 11 7 7 0 0 0 0-14z',
          })
        : // Sun icon for light mode
          React.createElement('path', {
            d: 'M7 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-9.5v1m0 10v1M3.5 7h-1m10 0h1M4.9 4.9l-.7-.7m7.6 7.6l-.7-.7m0-7.6l.7-.7M4.9 11.1l-.7.7',
            stroke: 'currentColor',
            strokeWidth: '1.5',
            strokeLinecap: 'round',
            fill: 'none',
          })
    )
  );
};

/**
 * Register the theme switcher addon
 */
addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Theme Switcher',
    match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
    render: ThemeSwitcher,
  });
});