/**
 * Worker Pool - Manage concurrent agent execution
 */

import type { Task, Result, AgentConfig } from './types.js';
import { spawnAgent } from './spawn.js';

/**
 * Worker state
 */
interface Worker {
  id: string;
  task: Task | null;
  startTime: number | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

/**
 * Worker pool options
 */
interface WorkerPoolOptions {
  maxWorkers: number;
  taskTimeout: number;
  agentConfigs: Record<string, AgentConfig>;
  gatewayUrl?: string;
}

/**
 * Worker pool for concurrent agent execution
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private options: WorkerPoolOptions;
  private taskIdCounter = 0;

  constructor(options: WorkerPoolOptions) {
    this.options = options;
    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      this.workers.push({
        id: `worker-${i}`,
        task: null,
        startTime: null,
        status: 'idle',
      });
    }
  }

  /**
   * Get idle worker
   */
  getIdleWorker(): Worker | undefined {
    return this.workers.find(w => w.status === 'idle');
  }

  /**
   * Assign task to worker
   */
  assignTask(worker: Worker, task: Task): void {
    worker.task = task;
    worker.startTime = Date.now();
    worker.status = 'running';
  }

  /**
   * Execute task on worker
   */
  async executeTask(worker: Worker): Promise<Result> {
    if (!worker.task) {
      throw new Error('No task assigned to worker');
    }

    const config = this.options.agentConfigs[worker.task.agent];
    if (!config) {
      worker.status = 'failed';
      return {
        taskId: worker.task.id,
        success: false,
        output: `Unknown agent: ${worker.task.agent}`,
      };
    }

    try {
      const result = await spawnAgent(worker.task, config, {
        baseUrl: this.options.gatewayUrl || 'http://localhost:18789',
        timeout: this.options.taskTimeout,
      });

      worker.status = result.success ? 'completed' : 'failed';
      return result;
    } catch (error) {
      worker.status = 'failed';
      return {
        taskId: worker.task.id,
        success: false,
        output: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      worker.task = null;
      worker.startTime = null;
    }
  }

  /**
   * Process queue with worker pool
   * FIXED: Properly collect all results from parallel execution
   */
  async processQueue(
    tasks: Task[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Result[]> {
    const results: Result[] = [];
    const pending = [...tasks];
    const runningPromises = new Map<string, Promise<Result>>();
    let completed = 0;

    // Process tasks until queue is empty
    while (pending.length > 0 || runningPromises.size > 0) {
      // Assign tasks to idle workers
      while (pending.length > 0) {
        const worker = this.getIdleWorker();
        if (!worker) break;

        const task = pending.shift()!;
        this.assignTask(worker, task);

        // Create promise and track it
        const promise = this.executeTask(worker).then(result => {
          worker.status = 'idle';
          return result;
        });
        runningPromises.set(task.id, promise);
      }

      // Wait for at least one task to complete
      if (runningPromises.size > 0) {
        // Use Promise.race to know when one completes, then collect ALL results properly
        const completedEntry = await Promise.race(
          Array.from(runningPromises.entries()).map(async ([id, promise]) => {
            const result = await promise;
            return { id, result };
          })
        );

        // Remove completed task from tracking
        runningPromises.delete(completedEntry.id);

        // Collect result
        results.push(completedEntry.result);
        completed++;

        if (onProgress) {
          onProgress(completed, tasks.length);
        }
      }
    }

    return results;
  }

  /**
   * Get pool status
   */
  getStatus(): {
    total: number;
    idle: number;
    running: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.workers.length,
      idle: this.workers.filter(w => w.status === 'idle').length,
      running: this.workers.filter(w => w.status === 'running').length,
      completed: this.workers.filter(w => w.status === 'completed').length,
      failed: this.workers.filter(w => w.status === 'failed').length,
    };
  }

  /**
   * Reset all workers to idle
   */
  reset(): void {
    this.workers.forEach(w => {
      w.task = null;
      w.startTime = null;
      w.status = 'idle';
    });
  }

  /**
   * Shutdown pool
   */
  shutdown(): void {
    // In real implementation, would cancel running tasks
    this.workers = [];
  }
}
