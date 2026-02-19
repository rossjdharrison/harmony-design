# Design Tokens

This directory contains the design tokens for the Harmony Design System and tools for synchronizing with Figma.

## Files

- **design-tokens.json** - Main design token definitions
- **figma-sync-config.json** - Configuration for Figma synchronization
- **sync-log.json** - History of synchronization operations
- **figma-tokens-plugin.json** - Generated format for Figma Tokens plugin

## Figma Token Synchronization

The Harmony Design System supports bidirectional synchronization between code tokens and Figma design files.

### Setup

1. **Get Figma API Token**
   - Go to https://www.figma.com/developers/api#access-tokens
   - Generate a personal access token
   - Set environment variable: `FIGMA_TOKEN=your_token_here`

2. **Get Figma File Key**
   - Open your Figma file
   - Copy the file key from the URL: `https://www.figma.com/file/{FILE_KEY}/...`
   - Set environment variable: `FIGMA_FILE_KEY=your_file_key`

3. **Configure Sync**
   - Edit `figma-sync-config.json` to customize sync behavior
   - Set `figmaFileKey` in the config file (alternative to env var)

### Usage

#### Pull tokens from Figma to code:
```bash
node scripts/figma-token-sync.js pull
```

#### Push tokens from code to Figma:
```bash
node scripts/figma-token-sync.js push
```

#### Bidirectional sync (pull then push):
```bash
node scripts/figma-token-sync.js bidirectional
```

#### Dry run (preview changes without writing):
```bash
node scripts/figma-token-sync.js pull --dry-run
```

#### Verbose output:
```bash
node scripts/figma-token-sync.js pull --verbose
```

### Watch Mode

Start a file watcher that monitors token changes:

```bash
node scripts/figma-sync-watcher.js
```

Enable automatic sync on changes:

```bash
node scripts/figma-sync-watcher.js --auto-sync
```

### Figma Tokens Plugin

The push command generates a `figma-tokens-plugin.json` file compatible with the [Figma Tokens plugin](https://www.figma.com/community/plugin/843461159747178978).

To push changes to Figma:
1. Install the Figma Tokens plugin
2. Import `tokens/figma-tokens-plugin.json`
3. Apply changes to your Figma variables

### Conflict Resolution

When running bidirectional sync, conflicts may occur if both local and remote tokens have been modified:

- **manual** (default): Stop and report conflicts
- **local**: Prefer local changes
- **remote**: Prefer remote changes

Set in `figma-sync-config.json`:
```json
{
  "conflictResolution": "manual"
}
```

Or use CLI flag:
```bash
node scripts/figma-token-sync.js bidirectional --force
```

### Sync Log

All synchronization operations are logged to `sync-log.json`:

```json
{
  "lastSync": "2025-02-15T10:30:00.000Z",
  "history": [
    {
      "timestamp": "2025-02-15T10:30:00.000Z",
      "direction": "pull",
      "changes": {
        "added": { "colors": { "primary-500": "rgb(99, 102, 241)" } },
        "modified": {},
        "removed": {}
      },
      "tokenCount": 42
    }
  ]
}
```

## Token Categories

- **colors** - Color palette tokens
- **spacing** - Spacing scale tokens
- **typography** - Font family, size, weight, line height
- **shadows** - Box shadow definitions
- **borderRadius** - Border radius values

## Integration

Tokens are automatically loaded by:
- Token loader (`scripts/token-loader.js`)
- Token validator (`scripts/token-validator.js`)
- Token transform pipeline (`scripts/token-transform-pipeline.js`)

See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#design-tokens) for more information.