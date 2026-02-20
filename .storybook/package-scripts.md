# Package.json Scripts for Storybook

Add these scripts to your `package.json` to run Storybook:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook",
    "test-storybook:ci": "concurrently -k -s first -n \"SB,TEST\" -c \"magenta,blue\" \"npm run build-storybook -- --quiet\" \"wait-on tcp:6006 && npm run test-storybook\""
  },
  "devDependencies": {
    "@storybook/addon-a11y": "^8.0.0",
    "@storybook/addon-essentials": "^8.0.0",
    "@storybook/addon-interactions": "^8.0.0",
    "@storybook/addon-links": "^8.0.0",
    "@storybook/addon-themes": "^8.0.0",
    "@storybook/builder-vite": "^8.0.0",
    "@storybook/test": "^8.0.0",
    "@storybook/test-runner": "^8.0.0",
    "@storybook/web-components": "^8.0.0",
    "@storybook/web-components-vite": "^8.0.0",
    "storybook": "^8.0.0"
  }
}
```

## Script Descriptions

- **storybook**: Start Storybook dev server on port 6006
- **build-storybook**: Build static Storybook site for deployment
- **test-storybook**: Run automated tests on all stories
- **test-storybook:ci**: CI-friendly test command with build and wait

## Installation

```bash
npm install --save-dev @storybook/web-components-vite @storybook/addon-essentials @storybook/addon-a11y @storybook/addon-themes @storybook/addon-interactions @storybook/test-runner
```

Note: These are **development dependencies only**. No npm packages are used in runtime code.