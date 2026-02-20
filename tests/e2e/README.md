# E2E Test Suite - User Journey Tests

End-to-end tests for complete user workflows through the Harmony Design System.

## Overview

These tests verify complete user journeys from start to finish, ensuring all components, bounded contexts, and the EventBus work together correctly.

## Test Categories

1. **Component Interaction Journeys** - User interacts with multiple components in sequence
2. **Audio Workflow Journeys** - Complete audio processing workflows
3. **Graph Manipulation Journeys** - Building and modifying audio graphs
4. **State Persistence Journeys** - Data saves and loads correctly
5. **Performance Journeys** - System maintains performance under load

## Running Tests

```bash
# Install Playwright (dev dependency only)
npm install --save-dev @playwright/test

# Run all E2E tests
npm run test:e2e

# Run specific journey
npm run test:e2e -- --grep "Audio Playback"

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Debug mode
npm run test:e2e -- --debug
```

## Writing New Journey Tests

See `journey-template.spec.js` for the standard pattern.

## Performance Assertions

All journeys include performance checks:
- Initial load < 200ms
- Frame render < 16ms
- Audio latency < 10ms
- Memory usage < 50MB