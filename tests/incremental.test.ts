import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { IncrementalDev, createIncremental } from '../src/incremental.js';
import type { Task } from '../src/types.js';

describe('IncrementalDev', () => {
  let incremental: IncrementalDev;
  const testDir = path.join('/tmp', 'agentdev-test', Date.now().toString());

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    incremental = createIncremental(testDir);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should detect new file as changed', () => {
    const filePath = path.join(testDir, 'new-file.ts');
    fs.writeFileSync(filePath, 'console.log("test");');

    expect(incremental.hasFileChanged(filePath)).toBe(true);
  });

  it('should track file state', () => {
    const filePath = path.join(testDir, 'tracked.ts');
    fs.writeFileSync(filePath, 'console.log("test");');

    incremental.recordFile(filePath);

    expect(incremental.hasFileChanged(filePath)).toBe(false);
  });

  it('should detect modified file', () => {
    const filePath = path.join(testDir, 'modified.ts');
    fs.writeFileSync(filePath, 'v1');

    incremental.recordFile(filePath);

    // Modify file
    fs.writeFileSync(filePath, 'v2');

    expect(incremental.hasFileChanged(filePath)).toBe(true);
  });

  it('should get changed files from list', () => {
    const file1 = path.join(testDir, 'file1.ts');
    const file2 = path.join(testDir, 'file2.ts');

    fs.writeFileSync(file1, 'v1');
    fs.writeFileSync(file2, 'v2');

    incremental.recordFile(file1);

    const changed = incremental.getChangedFiles([file1, file2]);

    expect(changed).toContain(file2);
    expect(changed).not.toContain(file1);
  });

  it('should filter tasks with changed files', () => {
    const task1: Task = {
      id: 't1',
      agent: 'claude',
      task: 'Task 1',
      files: [path.join(testDir, 'unchanged.ts')],
    };

    const task2: Task = {
      id: 't2',
      agent: 'claude',
      task: 'Task 2',
      files: [path.join(testDir, 'changed.ts')],
    };

    fs.writeFileSync(task1.files[0], 'v1');
    fs.writeFileSync(task2.files[0], 'v1');

    incremental.recordFiles(task1.files);

    const filtered = incremental.filterChangedTasks([task1, task2]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('t2');
  });

  it('should get stats', () => {
    const filePath = path.join(testDir, 'stats.ts');
    fs.writeFileSync(filePath, 'content');

    incremental.recordFiles([filePath]);

    const stats = incremental.getStats();

    expect(stats.trackedFiles).toBe(1);
    expect(stats.lastRun).toBeInstanceOf(Date);
  });

  it('should clear state', () => {
    const filePath = path.join(testDir, 'clear.ts');
    fs.writeFileSync(filePath, 'content');

    incremental.recordFiles([filePath]);
    incremental.clear();

    const stats = incremental.getStats();
    expect(stats.trackedFiles).toBe(0);
  });
});
