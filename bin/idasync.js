#!/usr/bin/env node

const IdaSync = require('../lib/index');
const path = require('path');

function printUsage() {
  console.log(`
Usage: idasync <source> <destination> [options]

Arguments:
  source       Source directory to sync from
  destination  Destination directory to sync to

Options:
  --copy-exclude <pattern>    Exclude files matching pattern from copying (can be used multiple times)
  --delete-exclude <pattern>  Exclude files matching pattern from deletion (can be used multiple times)
  --verbose, -v               Enable verbose output
  --help, -h                  Show this help message

Examples:
  idasync ./src ./dist
  idasync ./src ./dist --verbose
  idasync ./src ./dist --copy-exclude "*.log" --copy-exclude "tmp/*"
  idasync ./src ./dist --delete-exclude "config.json" --verbose

Note: Patterns support wildcards (* and ?) and are case-insensitive.
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }
  
  const source = args[0];
  const destination = args[1];
  
  const options = {
    copyExclusions: [],
    deleteExclusions: [],
    verbose: false
  };
  
  // Parse options
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--copy-exclude' && i + 1 < args.length) {
      options.copyExclusions.push(args[++i]);
    } else if (arg === '--delete-exclude' && i + 1 < args.length) {
      options.deleteExclusions.push(args[++i]);
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else {
      console.error(`Unknown option: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }
  
  try {
    const sync = new IdaSync(options);
    const result = await sync.sync(source, destination);
    
    console.log(`Synchronization complete!`);
    console.log(`Files copied: ${result.copied}`);
    console.log(`Files deleted: ${result.deleted}`);
    console.log(`Files skipped: ${result.skipped}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
