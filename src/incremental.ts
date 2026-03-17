/**
 * Incremental - Incremental development support
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * File change info
 */
interface FileChange {
  path: string;
  hash: string;
  lastModified: number;
}

/**
 * Incremental state
 */
interface IncrementalState {
  files: Record<string, FileChange>;
  lastRun: number;
}

/**
 * Incremental development manager
 */
export class IncrementalDev {
  private stateFile: string;
  private state: IncrementalState;

  constructor(workDir: string = '.') {
    this.stateFile = path.join(workDir, '.agentdev', 'incremental.json');
    this.state = this.loadState();
  }

  /**
   * Load state from disk
   */
  private loadState(): IncrementalState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const content = fs.readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // Ignore errors
    }

    return { files: {}, lastRun: 0 };
  }

  /**
   * Save state to disk
   */
  private saveState(): void {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  /**
   * Calculate file hash
   */
  private hashFile(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Check if file has changed
   */
  hasFileChanged(filePath: string): boolean {
    const absPath = path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absPath)) {
      return true; // New file
    }

    const stat = fs.statSync(absPath);
    const previous = this.state.files[absPath];

    if (!previous) {
      return true; // Not tracked
    }

    // Quick check: modification time
    if (stat.mtimeMs > previous.lastModified) {
      // Verify with hash
      const currentHash = this.hashFile(absPath);
      return currentHash !== previous.hash;
    }

    return false;
  }

  /**
   * Get changed files from list
   */
  getChangedFiles(filePaths: string[]): string[] {
    return filePaths.filter(f => this.hasFileChanged(f));
  }

  /**
   * Record file state
   */
  recordFile(filePath: string): void {
    const absPath = path.resolve(filePath);
    
    if (!fs.existsSync(absPath)) {
      delete this.state.files[absPath];
      return;
    }

    const stat = fs.statSync(absPath);
    const hash = this.hashFile(absPath);

    this.state.files[absPath] = {
      path: absPath,
      hash,
      lastModified: stat.mtimeMs,
    };
  }

  /**
   * Record multiple files
   */
  recordFiles(filePaths: string[]): void {
    filePaths.forEach(f => this.recordFile(f));
    this.state.lastRun = Date.now();
    this.saveState();
  }

  /**
   * Filter tasks to only those with changed files
   */
  filterChangedTasks<T extends { files: string[] }>(tasks: T[]): T[] {
    return tasks.filter(task => {
      return task.files.some(f => this.hasFileChanged(f));
    });
  }

  /**
   * Clear state
   */
  clear(): void {
    this.state = { files: {}, lastRun: 0 };
    this.saveState();
  }

  /**
   * Get stats
   */
  getStats(): { trackedFiles: number; lastRun: Date | null } {
    return {
      trackedFiles: Object.keys(this.state.files).length,
      lastRun: this.state.lastRun ? new Date(this.state.lastRun) : null,
    };
  }
}

/**
 * Create incremental dev manager
 */
export function createIncremental(workDir?: string): IncrementalDev {
  return new IncrementalDev(workDir);
}
