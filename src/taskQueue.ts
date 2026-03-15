/**
 * Task Queue
 * Priority-based task queue with concurrency control
 */

import { EventEmitter } from 'events';
import log from 'electron-log';

export type TaskPriority = 'high' | 'normal' | 'low';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Task<T = unknown, R = unknown> {
  id: string;
  type: string;
  input: T;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: R;
  error?: Error;
}

export interface TaskQueueConfig {
  maxConcurrent?: number;
  timeout?: number;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * TaskQueue - Priority-based task queue with concurrency control
 */
export class TaskQueue extends EventEmitter {
  private queue: Task[] = [];
  private running: Map<string, Task> = new Map();
  private handlers: Map<string, (input: any) => Promise<any>> = new Map();
  private maxConcurrent: number;
  private timeout: number;
  private stats: QueueStats = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  constructor(config: TaskQueueConfig = {}) {
    super();
    this.maxConcurrent = config.maxConcurrent ?? 5;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Register a task handler
   */
  registerHandler(name: string, handler: (input: any) => Promise<any>): void {
    this.handlers.set(name, handler);
    log.debug(`[TaskQueue] Handler registered: ${name}`);
  }

  /**
   * Add task to queue
   */
  async enqueue<T, R>(
    type: string,
    input: T,
    priority: TaskPriority = 'normal'
  ): Promise<Task<T, R>> {
    const task: Task<T, R> = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      input,
      priority,
      status: 'pending',
      createdAt: Date.now(),
    };

    // Priority sorting
    const priorityWeight = { high: 3, normal: 2, low: 1 };
    const insertIndex = this.queue.findIndex(
      (t) => priorityWeight[t.priority] < priorityWeight[task.priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }

    this.stats.pending = this.queue.length;
    this.emit('enqueue', task);
    
    // Process if possible
    this.process();
    
    return task;
  }

  /**
   * Process next task
   */
  private async process(): Promise<void> {
    if (this.running.size >= this.maxConcurrent) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = 'failed';
      task.error = new Error(`No handler for task type: ${task.type}`);
      this.stats.failed++;
      this.emit('error', task);
      return;
    }

    // Start task
    task.status = 'running';
    task.startedAt = Date.now();
    this.running.set(task.id, task);
    this.stats.pending = this.queue.length;
    this.stats.running = this.running.size;
    this.emit('start', task);

    try {
      // Execute with timeout
      const result = await Promise.race([
        handler(task.input),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), this.timeout)
        ),
      ]);

      task.status = 'completed';
      task.result = result;
      task.completedAt = Date.now();
      this.stats.completed++;
      this.emit('complete', task);
    } catch (error: any) {
      task.status = 'failed';
      task.error = error;
      task.completedAt = Date.now();
      this.stats.failed++;
      this.emit('error', task);
    } finally {
      this.running.delete(task.id);
      this.stats.running = this.running.size;
      
      // Process next
      this.process();
    }
  }

  /**
   * Cancel a task
   */
  cancel(taskId: string): boolean {
    // Check running
    const runningTask = this.running.get(taskId);
    if (runningTask) {
      runningTask.status = 'cancelled';
      this.stats.cancelled++;
      this.emit('cancel', runningTask);
      return true;
    }

    // Check queue
    const queueIndex = this.queue.findIndex((t) => t.id === taskId);
    if (queueIndex !== -1) {
      this.queue[queueIndex].status = 'cancelled';
      this.queue.splice(queueIndex, 1);
      this.stats.cancelled++;
      this.stats.pending = this.queue.length;
      return true;
    }

    return false;
  }

  /**
   * Get queue stats
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Get queue status
   */
  getStatus(): { pending: number; running: number } {
    return {
      pending: this.queue.length,
      running: this.running.size,
    };
  }
}
