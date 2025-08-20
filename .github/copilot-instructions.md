<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements - Node.js npm package for folder synchronization similar to rsync

- [x] Scaffold the Project - Created package structure with src/, bin/, test/, and configuration files

- [x] Customize the Project - Implemented idasync functionality with all requested features

- [x] Install Required Extensions - No extensions required

- [x] Compile the Project - Built successfully and all tests pass

- [x] Create and Run Task - Created build task

- [x] Launch the Project - N/A for npm package (can be used via CLI or programmatically)

- [x] Ensure Documentation is Complete - README.md and copilot-instructions.md exist and are complete

# idasync Project

This is a cross-platform folder synchronization npm package similar to rsync, written in pure JavaScript for Node.js.

## Features Implemented
- One-way sync from source to destination
- File copying with modification time comparison
- File deletion for files not in source
- Copy exclusion patterns (filemasks)
- Delete exclusion patterns (filemasks)
- Cross-platform compatibility
- CLI and programmatic interfaces

## Project Structure
- `src/` - Source code
- `lib/` - Built code
- `bin/` - CLI executable
- `test/` - Test suite
- `package.json` - Package configuration
- `README.md` - Documentation
