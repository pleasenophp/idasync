const fs = require('fs').promises;
const path = require('path');

/**
 * idasync - A cross-platform folder synchronization utility
 * 
 * Features:
 * - Syncs from source to destination (left to right only)
 * - Copies new/modified files from source to destination
 * - Deletes files from destination that don't exist in source
 * - Supports copy exclusion patterns
 * - Supports delete exclusion patterns
 */

class IdaSync {
  constructor(options = {}) {
    this.copyExclusions = options.copyExclusions || [];
    this.deleteExclusions = options.deleteExclusions || [];
    this.verbose = options.verbose || false;
  }

  /**
   * Check if a file matches any of the provided patterns
   * @param {string} filePath - The file path to check
   * @param {string[]} patterns - Array of glob-like patterns
   * @returns {boolean} - True if the file matches any pattern
   */
  matchesPattern(filePath, patterns) {
    if (!patterns || patterns.length === 0) return false;
    
    const fileName = path.basename(filePath);
    const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize path separators
    
    return patterns.some(pattern => {
      // Convert glob-like pattern to regex
      const regexPattern = pattern
        .replace(/\\/g, '/') // Normalize pattern separators
        .replace(/\./g, '\\.')
        .replace(/\*/g, '[^/]*') // * matches any characters except path separator
        .replace(/\?/g, '[^/]'); // ? matches single character except path separator
      
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      
      // For patterns with /, match against full path; otherwise match filename only
      if (pattern.includes('/')) {
        return regex.test(normalizedPath);
      } else {
        return regex.test(fileName);
      }
    });
  }

  /**
   * Get all files recursively from a directory
   * @param {string} dirPath - Directory path
   * @param {string} basePath - Base path for relative paths
   * @returns {Promise<string[]>} - Array of relative file paths
   */
  async getFilesRecursively(dirPath, basePath = dirPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, basePath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    return files;
  }

  /**
   * Check if two files are different
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<boolean>} - True if files are different
   */
  async filesAreDifferent(sourcePath, destPath) {
    try {
      const [sourceStat, destStat] = await Promise.all([
        fs.stat(sourcePath),
        fs.stat(destPath)
      ]);
      
      // Compare modification time and size
      return sourceStat.mtime.getTime() !== destStat.mtime.getTime() || 
             sourceStat.size !== destStat.size;
    } catch (error) {
      // If destination doesn't exist, files are different
      return true;
    }
  }

  /**
   * Copy a file from source to destination
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   */
  async copyFile(sourcePath, destPath) {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    
    // Copy file
    await fs.copyFile(sourcePath, destPath);
    
    // Preserve modification time
    const sourceStat = await fs.stat(sourcePath);
    await fs.utimes(destPath, sourceStat.atime, sourceStat.mtime);
  }

  /**
   * Log a message if verbose mode is enabled
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.verbose) {
      console.log(`[idasync] ${message}`);
    }
  }

  /**
   * Synchronize source directory to destination directory
   * @param {string} source - Source directory path
   * @param {string} destination - Destination directory path
   */
  async sync(source, destination) {
    const sourceAbs = path.resolve(source);
    const destAbs = path.resolve(destination);
    
    this.log(`Syncing from ${sourceAbs} to ${destAbs}`);
    
    // Ensure source exists
    try {
      await fs.access(sourceAbs);
    } catch (error) {
      throw new Error(`Source directory does not exist: ${sourceAbs}`);
    }
    
    // Create destination if it doesn't exist
    await fs.mkdir(destAbs, { recursive: true });
    
    // Get all files from source and destination
    const [sourceFiles, destFiles] = await Promise.all([
      this.getFilesRecursively(sourceAbs),
      this.getFilesRecursively(destAbs)
    ]);
    
    let copiedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;
    
    // Copy files from source to destination
    for (const relativeFile of sourceFiles) {
      const sourcePath = path.join(sourceAbs, relativeFile);
      const destPath = path.join(destAbs, relativeFile);
      
      // Skip if file matches copy exclusion pattern
      if (this.matchesPattern(relativeFile, this.copyExclusions)) {
        this.log(`Skipping copy (excluded): ${relativeFile}`);
        skippedCount++;
        continue;
      }
      
      // Check if file needs to be copied
      if (await this.filesAreDifferent(sourcePath, destPath)) {
        await this.copyFile(sourcePath, destPath);
        this.log(`Copied: ${relativeFile}`);
        copiedCount++;
      }
    }
    
    // Delete files from destination that don't exist in source
    const sourceFileSet = new Set(sourceFiles);
    for (const relativeFile of destFiles) {
      if (!sourceFileSet.has(relativeFile)) {
        // Skip if file matches delete exclusion pattern
        if (this.matchesPattern(relativeFile, this.deleteExclusions)) {
          this.log(`Skipping delete (excluded): ${relativeFile}`);
          continue;
        }
        
        const destPath = path.join(destAbs, relativeFile);
        await fs.unlink(destPath);
        this.log(`Deleted: ${relativeFile}`);
        deletedCount++;
      }
    }
    
    // Clean up empty directories in destination
    await this.cleanupEmptyDirectories(destAbs, sourceAbs);
    
    this.log(`Sync complete: ${copiedCount} copied, ${deletedCount} deleted, ${skippedCount} skipped`);
    
    return {
      copied: copiedCount,
      deleted: deletedCount,
      skipped: skippedCount
    };
  }

  /**
   * Remove empty directories from destination that don't exist in source
   * @param {string} destAbs - Absolute destination path
   * @param {string} sourceAbs - Absolute source path
   */
  async cleanupEmptyDirectories(destAbs, sourceAbs) {
    const destDirs = await this.getDirectoriesRecursively(destAbs);
    
    // Sort by depth (deepest first) to remove child directories before parents
    destDirs.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);
    
    for (const relativeDir of destDirs) {
      const destDirPath = path.join(destAbs, relativeDir);
      const sourceDirPath = path.join(sourceAbs, relativeDir);
      
      try {
        // Check if directory exists in source
        await fs.access(sourceDirPath);
      } catch (error) {
        // Directory doesn't exist in source, check if it's empty and remove
        try {
          const entries = await fs.readdir(destDirPath);
          if (entries.length === 0) {
            await fs.rmdir(destDirPath);
            this.log(`Removed empty directory: ${relativeDir}`);
          }
        } catch (error) {
          // Directory might already be removed or not accessible
        }
      }
    }
  }

  /**
   * Get all directories recursively from a directory
   * @param {string} dirPath - Directory path
   * @param {string} basePath - Base path for relative paths
   * @returns {Promise<string[]>} - Array of relative directory paths
   */
  async getDirectoriesRecursively(dirPath, basePath = dirPath) {
    const directories = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(basePath, fullPath);
          
          directories.push(relativePath);
          
          const subDirectories = await this.getDirectoriesRecursively(fullPath, basePath);
          directories.push(...subDirectories);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    return directories;
  }
}

module.exports = IdaSync;
