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

describe('IdaSync', () => {
  let tempDirs;

  // Initialize temp directories array before each test
  beforeEach(() => {
    tempDirs = [];
  });

  // Helper to track temp directories for cleanup
  async function createTempDirTracked() {
    const dir = await createTempDir();
    tempDirs.push(dir);
    return dir;
  }

  // Clean up all temp directories after each test
  afterEach(async () => {
    await Promise.all(tempDirs.map(dir => cleanup(dir)));
  });

  // Cleanup temp directory after all tests
  afterAll(async () => {
    const tmpDir = path.join(__dirname, 'tmp');
    await cleanup(tmpDir);
  });

  test('should perform basic sync', async () => {
    const sourceDir = await createTempDirTracked();
    const destDir = await createTempDirTracked();
    
    // Create test files in source
    await createTestFile(path.join(sourceDir, 'file1.txt'), 'content1');
    await createTestFile(path.join(sourceDir, 'subdir', 'file2.txt'), 'content2');
    
    const sync = new IdaSync({ verbose: true });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify files were copied
    const file1Exists = await fileExists(path.join(destDir, 'file1.txt'));
    const file2Exists = await fileExists(path.join(destDir, 'subdir', 'file2.txt'));
    
    expect(file1Exists).toBe(true);
    expect(file2Exists).toBe(true);
    expect(result.copied).toBe(2);
  });

  test('should delete files not in source', async () => {
    const sourceDir = await createTempDirTracked();
    const destDir = await createTempDirTracked();
    
    // Create files in both directories
    await createTestFile(path.join(sourceDir, 'keep.txt'), 'keep this');
    await createTestFile(path.join(destDir, 'keep.txt'), 'keep this');
    await createTestFile(path.join(destDir, 'delete.txt'), 'delete this');
    
    const sync = new IdaSync({ verbose: true });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify file was deleted
    const keepExists = await fileExists(path.join(destDir, 'keep.txt'));
    const deleteExists = await fileExists(path.join(destDir, 'delete.txt'));
    
    expect(keepExists).toBe(true);
    expect(deleteExists).toBe(false);
    expect(result.deleted).toBe(1);
  });

  test('should respect copy exclusions', async () => {
    const sourceDir = await createTempDirTracked();
    const destDir = await createTempDirTracked();
    
    // Create test files
    await createTestFile(path.join(sourceDir, 'include.txt'), 'include');
    await createTestFile(path.join(sourceDir, 'exclude.log'), 'exclude');
    await createTestFile(path.join(sourceDir, 'temp', 'exclude.tmp'), 'exclude');
    await createTestFile(path.join(sourceDir, 'temp', 'sub', 'exclude.tmp'), 'exclude2');

    const sync = new IdaSync({ 
      copyExclusions: ['*.log', 'temp/*'],
      verbose: true 
    });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify only included file was copied
    const includeExists = await fileExists(path.join(destDir, 'include.txt'));
    const excludeLogExists = await fileExists(path.join(destDir, 'exclude.log'));
    const excludeTmpExists = await fileExists(path.join(destDir, 'temp', 'exclude.tmp'));
    const excludeTmpSubExists = await fileExists(path.join(destDir, 'temp', 'sub', 'exclude.tmp'));

    expect(includeExists).toBe(true);
    expect(excludeLogExists).toBe(false);
    expect(excludeTmpExists).toBe(false);
    expect(excludeTmpSubExists).toBe(false);
    expect(result.copied).toBe(1);
    expect(result.skipped).toBe(3);
  });

  test('should respect delete exclusions', async () => {
    const sourceDir = await createTempDirTracked();
    const destDir = await createTempDirTracked();
    
    // Create files in source
    await createTestFile(path.join(sourceDir, 'keep.txt'), 'keep');
    
    // Create files in destination
    await createTestFile(path.join(destDir, 'keep.txt'), 'keep');
    await createTestFile(path.join(destDir, 'config.json'), 'config');
    await createTestFile(path.join(destDir, 'sub1', 'config1.json'), 'config1');
    await createTestFile(path.join(destDir, 'sub1', 'sub2', 'config2.json'), 'config2');
    await createTestFile(path.join(destDir, 'delete.txt'), 'delete');
    
    const sync = new IdaSync({ 
      deleteExclusions: ['config.json', 'sub1/*'],
      verbose: true 
    });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify config was preserved, delete.txt was removed
    const keepExists = await fileExists(path.join(destDir, 'keep.txt'));
    const configExists = await fileExists(path.join(destDir, 'config.json'));
    const config1Exists = await fileExists(path.join(destDir, 'sub1', 'config1.json'));
    const config2Exists = await fileExists(path.join(destDir, 'sub1', 'sub2', 'config2.json'));
    const deleteExists = await fileExists(path.join(destDir, 'delete.txt'));

    expect(keepExists).toBe(true);
    expect(configExists).toBe(true);
    expect(config1Exists).toBe(true);
    expect(config2Exists).toBe(true);
    expect(deleteExists).toBe(false);
    expect(result.deleted).toBe(1);
  });

  test('should handle non-existent source directory', async () => {
    const sourceDir = path.join(__dirname, 'tmp', 'nonexistent-source');
    const destDir = await createTempDirTracked();
    
    // Create a file in destination to verify nothing gets deleted
    await createTestFile(path.join(destDir, 'existing.txt'), 'should stay');
    
    const sync = new IdaSync({ verbose: true });
    const result = await sync.sync(sourceDir, destDir);
    
    // Verify no operations were performed
    const existingFileStillThere = await fileExists(path.join(destDir, 'existing.txt'));
    
    expect(existingFileStillThere).toBe(true);
    expect(result.copied).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
