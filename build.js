const fs = require('fs').promises;
const path = require('path');

// Simple build script to copy source files to lib directory
async function build() {
  const sourceDir = path.join(__dirname, 'src');
  const libDir = path.join(__dirname, 'lib');
  
  try {
    // Remove lib directory if it exists
    await fs.rm(libDir, { recursive: true, force: true }).catch(() => {});
    
    // Create lib directory
    await fs.mkdir(libDir, { recursive: true });
    
    // Copy all files from src to lib
    const files = await fs.readdir(sourceDir);
    
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(libDir, file);
      
      const stat = await fs.stat(sourcePath);
      if (stat.isFile()) {
        await fs.copyFile(sourcePath, destPath);
        console.log(`Copied: ${file}`);
      }
    }
    
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

build();
