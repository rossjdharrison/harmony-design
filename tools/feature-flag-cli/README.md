# Feature Flag CLI

Command-line tool for managing feature flags in the Harmony Design System.

## Installation

From the project root:

```bash
cd tools/feature-flag-cli
npm install
npm link
```

## Usage

### List all flags
```bash
harmony-flags list
```

### Get flag details
```bash
harmony-flags get my-feature
```

### Create a new flag
```bash
harmony-flags create my-feature --enabled true --description "My new feature"
```

With rollout:
```bash
harmony-flags create my-feature --enabled true --rollout 50
```

With environment targeting:
```bash
harmony-flags create my-feature --enabled true --environment development
```

### Set flag value
```bash
harmony-flags set my-feature true
harmony-flags set my-feature false
```

### Delete flag
```bash
harmony-flags delete my-feature
```

### Export flags
```bash
harmony-flags export backup.json
```

### Import flags
```bash
harmony-flags import backup.json
```

Merge with existing:
```bash
harmony-flags import backup.json --merge
```

### Validate configuration
```bash
harmony-flags validate
```

## Configuration

By default, the CLI reads/writes to `config/feature-flags.json`. You can specify a different path:

```bash
harmony-flags list --config path/to/flags.json
```

## Testing

Run the test suite:

```bash
npm test
```

## Integration

The CLI manages the same configuration file used by:
- `gates/feature-flag-context.js` - Runtime feature flag system
- `gates/remote-config-fetch.js` - Remote configuration fetching
- `components/dev-tools/feature-flag-override.js` - Dev toolbar

See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#feature-flags) for complete documentation.

## Development

This tool follows Policy #8: npm packages are allowed for dev tools.

The CLI is a pure Node.js tool and does not run in the browser. It's designed for:
- Local development workflows
- CI/CD pipelines
- Build-time flag configuration
- Flag management automation

## Examples

### CI/CD Integration

Enable features for production:
```bash
harmony-flags set new-dashboard true --config config/production-flags.json
```

### Environment-specific setup

```bash
# Development
harmony-flags create debug-mode --enabled true --environment development

# Staging
harmony-flags create beta-features --enabled true --environment staging --rollout 50

# Production
harmony-flags create stable-features --enabled true --environment production
```

### Batch operations

Export current state:
```bash
harmony-flags export current-state.json
```

Restore previous state:
```bash
harmony-flags import previous-state.json
```