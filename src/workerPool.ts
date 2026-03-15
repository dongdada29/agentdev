/**
 * Worker Pool
 * Manages a pool of workers for parallel execution
 */

import { EventEmitter } from 'events';
import log from 'electron-log';

export interface Worker {
  id: string;
  status: 'idle' | 'busy';
  currentTask?: string;
}

export interface WorkerPoolConfig {
  minWorkers?: number;
  maxWorkers?: number;
  idleTimeout?: number;
}

export interface PoolStats {
  total: number;
  idle: number;
  busy: number;
}

/**
 * WorkerPool - Manages a pool of workers
 */
export class WorkerPool extends EventEmitter {
  private workers: Map<string, Worker> = new Map();
  private taskQueue: Array<{ task: any; resolve: Function; reject: Function }> = [];
  private minWorkers: number;
  private maxWorkers: number;
  private idleTimeout: number;

  constructor(config: WorkerPoolConfig = {}) {
    super();
    this.minWorkers = config.minWorkers ?? 2;
    this.maxWorkers = config.maxWorkers ?? 10;
    this.idleTimeout = config.idleTimeout ?? 60000;

    // Initialize workers
    for (let i = 0; i < this.minWorkers; i++) {
      this.addWorker();
    }
  }

  /**
   * Add a new worker
   */
  private addWorker(): string {
    const id = `worker_${this.workers.size + 1}`;
    this.workers.set(id, { id, status: 'idle' });
    log.debug(`[WorkerPool] Worker added: ${id}`);
    return id;
  }

  /**
   * Execute a task
   */
  async execute<T, R>(task: () => Promise<R>): Promise<R> {
    // Find idle worker
    let idleWorker = Array.from(this.workers.values()).find((w) => w.status === 'idle');

    // Scale up if needed
    if (!idleWorker && this.workers.size < this.maxWorkers) {
      const id = this.addWorker();
      idleWorker = this.workers.get(id);
    }

    if (idleWorker) {
      // Execute immediately
      return this.runTask<T, R>(idleWorker.id, task);
    } else {
      // Queue task
      return new Promise((resolve, reject) => {
        this.taskQueue.push({ task, resolve, reject });
        log.debug(`[WorkerPool] Task queued, queue size: ${this.taskQueue.length}`);
      });
    }
  }

  /**
   * Run task on worker
   */
  private async runTask<T, R>(workerId: string, task: () => Promise<R>): Promise<R> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker not found: ${workerId}`);
    }

    worker.status = 'busy';
    worker.currentTask = `task_${Date.now()}`;
    this.emit('task-start', { workerId });

    try {
      const result = await task();
      this.emit('task-complete', { workerId });
      return result;
    } catch (error) {
      this.emit('task-error', { workerId, error });
      throw error;
    } finally {
      worker.status = 'idle';
      worker.currentTask = undefined;
      
      // Process queued tasks
      this.processQueue();
      
      // Scale down if idle workers too many
      this.scaleDown();
    }
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    const next = this.taskQueue.shift();
    if (next) {
      const idleWorker = Array.from(this.workers.values()).find((w) => w.status === 'idle');
      if (idleWorker) {
        this.runTask(idleWorker.id, next.task)
          .then(next.resolve)
          .catch(next.reject);
      } else {
        this.taskQueue.unshift(next);
      }
    }
  }

  /**
   * Scale down idle workers
   */
  private scaleDown(): void {
    if (this.workers.size <= this.minWorkers) return;

    const idleWorkers = Array.from(this.workers.values()).filter(
      (w) => w.status === 'idle'
    );

    if (idleWorkers.length > this.minWorkers) {
      const toRemove = idleWorkers[0];
      this.workers.delete(toRemove.id);
      log.debug(`[WorkerPool] Worker removed: ${toRemove.id}`);
    }
  }

  /**
   * Get pool stats
   */
  getStats(): PoolStats {
    const workers = Array.from(this.workers.values());
    return {
      total: workers.length,
      idle: workers.filter((w) => w.status === 'idle').length,
      busy: workers.filter((w) => w.status === 'busy').length,
    };
  }

  /**
   * Shutdown pool
   */
  async shutdown(): Promise<void> {
    // Wait for busy workers
    const busyWorkers = Array.from(this.workers.values()).filter(
      (w) => w.status === 'busy'
    );
    
    await Promise.all(
      busyWorkers.map((w) => {
        return new Promise<void>((resolve) => {
          const checkStatus = () => {
            const worker = this.workers.get(w.id);
            if (!worker || worker.status === 'idle') {
              resolve();
            } else {
              setTimeout(checkStatus, 100);
            }
          };
          checkStatus();
        });
      })
    );

    this.workers.clear();
    this.taskQueue = [];
    log.info('[WorkerPool] Shutdown complete');
  }
}
