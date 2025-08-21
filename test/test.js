const IdaSync = require('../lib/index');
const fs = require('fs').promises;
const path = require('path');
const { randomBytes } = require('crypto');

// Test utilities
async function createTempDir() {
  const tmpDir = path.join(__dirname, 'tmp', randomBytes(8).toString('hex'));
  await fs.mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

async function createTestFile(filePath, content = 'test content') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cleanup(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// Test functions
async function testBasicSync() {
  console.log('Testing basic sync...');
  
  const sourceDir = await createTempDir();
  const destDir = await createTempDir();
  
  try {
    // Create test files in source
    await createTestFile(path.join(sourceDir, 'file1.txt'), 'content1');
    await createTestFile(path.join(sourceDir, 'subdir', 'file2.txt'), 'content2');
    
    const sync = new IdaSync({ verbose: true });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify files were copied
    const file1Exists = await fileExists(path.join(destDir, 'file1.txt'));
    const file2Exists = await fileExists(path.join(destDir, 'subdir', 'file2.txt'));
    
    if (file1Exists && file2Exists && result.copied === 2) {
      console.log('✓ Basic sync test passed');
    } else {
      throw new Error('Basic sync test failed');
    }
  } finally {
    await cleanup(sourceDir);
    await cleanup(destDir);
  }
}

async function testDeletion() {
  console.log('Testing file deletion...');
  
  const sourceDir = await createTempDir();
  const destDir = await createTempDir();
  
  try {
    // Create files in both directories
    await createTestFile(path.join(sourceDir, 'keep.txt'), 'keep this');
    await createTestFile(path.join(destDir, 'keep.txt'), 'keep this');
    await createTestFile(path.join(destDir, 'delete.txt'), 'delete this');
    
    const sync = new IdaSync({ verbose: true });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify file was deleted
    const keepExists = await fileExists(path.join(destDir, 'keep.txt'));
    const deleteExists = await fileExists(path.join(destDir, 'delete.txt'));
    
    if (keepExists && !deleteExists && result.deleted === 1) {
      console.log('✓ Deletion test passed');
    } else {
      throw new Error('Deletion test failed');
    }
  } finally {
    await cleanup(sourceDir);
    await cleanup(destDir);
  }
}

async function testCopyExclusions() {
  console.log('Testing copy exclusions...');
  
  const sourceDir = await createTempDir();
  const destDir = await createTempDir();
  
  try {
    // Create test files
    await createTestFile(path.join(sourceDir, 'include.txt'), 'include');
    await createTestFile(path.join(sourceDir, 'exclude.log'), 'exclude');
    await createTestFile(path.join(sourceDir, 'temp', 'exclude.tmp'), 'exclude');
    
    const sync = new IdaSync({ 
      copyExclusions: ['*.log', 'temp/*'],
      verbose: true 
    });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify only included file was copied
    const includeExists = await fileExists(path.join(destDir, 'include.txt'));
    const excludeLogExists = await fileExists(path.join(destDir, 'exclude.log'));
    const excludeTmpExists = await fileExists(path.join(destDir, 'temp', 'exclude.tmp'));
    
    if (includeExists && !excludeLogExists && !excludeTmpExists && result.copied === 1 && result.skipped === 2) {
      console.log('✓ Copy exclusions test passed');
    } else {
      throw new Error('Copy exclusions test failed');
    }
  } finally {
    await cleanup(sourceDir);
    await cleanup(destDir);
  }
}

async function testDeleteExclusions() {
  console.log('Testing delete exclusions...');
  
  const sourceDir = await createTempDir();
  const destDir = await createTempDir();
  
  try {
    // Create files in source
    await createTestFile(path.join(sourceDir, 'keep.txt'), 'keep');
    
    // Create files in destination
    await createTestFile(path.join(destDir, 'keep.txt'), 'keep');
    await createTestFile(path.join(destDir, 'config.json'), 'config');
    await createTestFile(path.join(destDir, 'delete.txt'), 'delete');
    
    const sync = new IdaSync({ 
      deleteExclusions: ['config.json'],
      verbose: true 
    });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify config was preserved, delete.txt was removed
    const keepExists = await fileExists(path.join(destDir, 'keep.txt'));
    const configExists = await fileExists(path.join(destDir, 'config.json'));
    const deleteExists = await fileExists(path.join(destDir, 'delete.txt'));
    
    if (keepExists && configExists && !deleteExists && result.deleted === 1) {
      console.log('✓ Delete exclusions test passed');
    } else {
      throw new Error('Delete exclusions test failed');
    }
  } finally {
    await cleanup(sourceDir);
    await cleanup(destDir);
  }
}

async function testNonExistentSource() {
  console.log('Testing non-existent source directory...');
  
  const sourceDir = path.join(__dirname, 'tmp', 'nonexistent-source');
  const destDir = await createTempDir();
  
  try {
    // Create a file in destination to verify nothing gets deleted
    await createTestFile(path.join(destDir, 'existing.txt'), 'should stay');
    
    const sync = new IdaSync({ verbose: true });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify no operations were performed
    const existingFileStillThere = await fileExists(path.join(destDir, 'existing.txt'));
    
    if (existingFileStillThere && result.copied === 0 && result.deleted === 0 && result.skipped === 0) {
      console.log('✓ Non-existent source test passed');
    } else {
      throw new Error('Non-existent source test failed');
    }
  } finally {
    await cleanup(destDir);
    // Note: sourceDir doesn't exist, so no cleanup needed
  }
}

// Run all tests
async function runTests() {
  console.log('Running idasync tests...\n');
  
  try {
    await testBasicSync();
    await testDeletion();
    await testCopyExclusions();
    await testDeleteExclusions();
    await testNonExistentSource();
    
    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error(`\n✗ Test failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Cleanup temp directory
    const tmpDir = path.join(__dirname, 'tmp');
    await cleanup(tmpDir);
  }
}

runTests();
