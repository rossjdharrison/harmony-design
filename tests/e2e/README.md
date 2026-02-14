# E2E Tests for Critical User Workflows

End-to-end tests validating complete user journeys through the Harmony Design System.

## Test Coverage

- **User Authentication Flow**: Login, logout, session management
- **Component Interaction Flow**: Navigation, form submission, state management
- **Accessibility Flow**: Keyboard navigation, screen reader announcements
- **Performance Flow**: Load time, interaction responsiveness, animation smoothness
- **Error Handling Flow**: Network failures, validation errors, recovery

## Running Tests

```bash
# Run all E2E tests
python tests/e2e/run_e2e_tests.py

# Run specific workflow
python tests/e2e/run_e2e_tests.py --workflow=authentication

# Run with Chrome headless
python tests/e2e/run_e2e_tests.py --headless

# Run with performance profiling
python tests/e2e/run_e2e_tests.py --profile
```

## Test Structure

Each workflow test:
1. Sets up initial state
2. Executes user actions
3. Validates UI updates
4. Checks EventBus messages
5. Verifies performance budgets
6. Cleans up state

See [DESIGN_SYSTEM.md](../../harmony-design/DESIGN_SYSTEM.md#testing) for testing philosophy.