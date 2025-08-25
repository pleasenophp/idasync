# idasync

A simple cross-platform left-to-right folder synchronization utility, written in pure JavaScript. Perfect for build scripts and development workflows.

## Features

- **Cross-platform**: Works on Windows, macOS, and Linux without requiring external utilities
- **One-way sync**: Synchronizes from source to destination (left to right)
- **File copying**: Copies new and modified files from source to destination
- **File deletion**: Removes files from destination that don't exist in source
- **Copy exclusions**: Skip copying files that match specified patterns
- **Delete exclusions**: Prevent deletion of files that match specified patterns
- **Pattern matching**: Supports wildcards (`*` and `?`) in exclusion patterns
- **Empty directory cleanup**: Removes empty directories from destination
- **Dev-friendly**: Designed for use in package.json scripts and build processes

## Installation

### As a Development Dependency (Recommended)

```bash
npm install --save-dev idasync
```

### Global Installation

```bash
npm install -g idasync
```

### As a Regular Dependency

```bash
npm install idasync
```

## Package.json Integration (Recommended Usage)

idasync is designed primarily as a development dependency for build processes and deployment scripts:

```json
{
  "devDependencies": {
    "idasync": "^1.0.0"
  },
  "scripts": {
    "build": "webpack --mode production",
    "sync-assets": "idasync ./assets ./dist/assets --copy-exclude '*.psd' --copy-exclude '*.ai'",
    "sync-public": "idasync ./public ./dist/public --delete-exclude '.htaccess'",
    "deploy-staging": "npm run build && idasync ./dist ./staging --verbose",
    "deploy-prod": "npm run build && idasync ./dist ./production --delete-exclude 'config.json' --verbose",
    "watch-assets": "chokidar 'assets/**/*' -c 'npm run sync-assets'"
  }
}
```

### Common Development Workflows

```bash
# Sync assets during development
npm run sync-assets

# Deploy to staging
npm run deploy-staging

# Deploy to production (preserving config files)
npm run deploy-prod
```

## Command Line Usage

```bash
idasync <source> <destination> [options]
```

### Arguments

- `source`: Source directory to sync from
- `destination`: Destination directory to sync to

### Options

- `--copy-exclude <pattern>`: Exclude files matching pattern from copying (can be used multiple times)
- `--delete-exclude <pattern>`: Exclude files matching pattern from deletion (can be used multiple times)
- `--verbose`, `-v`: Enable verbose output
- `--help`, `-h`: Show help message

### Examples

```bash
# Basic sync
idasync ./src ./dist

# Sync with verbose output
idasync ./src ./dist --verbose

# Exclude log files from copying
idasync ./src ./dist --copy-exclude "*.log"

# Multiple exclusions
idasync ./src ./dist --copy-exclude "*.log" --copy-exclude "tmp/*" --delete-exclude "config.json"

# Using with npx (no global install needed)
npx idasync ./assets ./dist/assets --verbose

# Using in package.json scripts (recommended)
npm run sync-assets
```

## Programmatic Usage

```javascript
const IdaSync = require("idasync");

const sync = new IdaSync({
  copyExclusions: ["*.log", "node_modules/*", "*.tmp"],
  deleteExclusions: ["config.json", ".env*", "uploads/*"],
  verbose: true,
});

async function syncFolders() {
  try {
    const result = await sync.sync("./source", "./destination");
    console.log(`Sync complete!`);
    console.log(`Files copied: ${result.copied}`);
    console.log(`Files deleted: ${result.deleted}`);
    console.log(`Files skipped: ${result.skipped}`);
  } catch (error) {
    console.error("Sync failed:", error.message);
    process.exit(1);
  }
}

syncFolders();
```

## Use Cases

- **Asset Pipeline**: Sync processed assets to distribution folder
- **Static Site Generation**: Copy static files while preserving build outputs
- **Docker Builds**: Sync application files while excluding development dependencies
- **Deployment Scripts**: Deploy built applications while preserving server configs
- **Development Workflows**: Keep multiple environments in sync during development
- **Build Processes**: Integrate with webpack, gulp, or other build tools

## Pattern Matching

Exclusion patterns support wildcards:

- `*` matches any number of characters
- `?` matches a single character
- Patterns are case-insensitive
- Patterns can match filenames or relative paths

### Pattern Examples

- `*.log` - Excludes all `.log` files
- `temp/*` - Excludes all files recursively in `temp` directories
- `node_modules/*` - Excludes all files recursively in `node_modules` directories
- `config.json` - Excludes specific file named `config.json`
- `*.tmp` - Excludes all temporary files

## How It Works

1. **File Discovery**: Recursively scans both source and destination directories
2. **Copy Phase**:
   - Compares files between source and destination
   - Copies files that are new or have different modification times/sizes
   - Skips files matching copy exclusion patterns
3. **Delete Phase**:
   - Identifies files in destination that don't exist in source
   - Deletes these files unless they match delete exclusion patterns
4. **Cleanup**: Removes empty directories from destination

## API Reference

### Constructor

```javascript
new IdaSync(options);
```

Options:

- `copyExclusions` (Array): Patterns for files to exclude from copying
- `deleteExclusions` (Array): Patterns for files to exclude from deletion
- `verbose` (Boolean): Enable verbose logging

### Methods

#### `sync(source, destination)`

Synchronizes the source directory to the destination directory.

Returns a Promise that resolves to:

```javascript
{
  copied: number,    // Number of files copied
  deleted: number,   // Number of files deleted
  skipped: number    // Number of files skipped due to exclusions
}
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
