/**
 * Task Queue - Priority-based task queue
 */

import type { Task, TaskWithStatus, TaskStatus } from './types.js';

/**
 * Priority queue for tasks
 */
export class TaskQueue {
  private queue: TaskWithStatus[] = [];
  private maxConcurrent: number;
  private running: number = 0;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add task to queue
   */
  enqueue(task: Task): void {
    const taskWithStatus: TaskWithStatus = {
      ...task,
      status: 'pending',
    };
    this.queue.push(taskWithStatus);
    this.sort();
  }

  /**
   * Add multiple tasks
   */
  enqueueMany(tasks: Task[]): void {
    tasks.forEach(t => this.enqueue(t));
  }

  /**
   * Get next task to execute (respects concurrency limit)
   */
  dequeue(): TaskWithStatus | undefined {
    if (this.running >= this.maxConcurrent) {
      return undefined;
    }

    const task = this.queue.find(t => t.status === 'pending' && this.canRun(t));
    if (task) {
      task.status = 'running';
      this.running++;
      return task;
    }

    return undefined;
  }

  /**
   * Mark task as completed
   */
  complete(taskId: string): void {
    const task = this.queue.find(t => t.id === taskId);
    if (task && task.status === 'running') {
      task.status = 'completed';
      this.running--;
    }
  }

  /**
   * Mark task as failed
   */
  fail(taskId: string): void {
    const task = this.queue.find(t => t.id === taskId);
    if (task && task.status === 'running') {
      task.status = 'failed';
      this.running--;
    }
  }

  /**
   * Check if task can run (dependencies met)
   */
  private canRun(task: TaskWithStatus): boolean {
    if (!task.deps || task.deps.length === 0) {
      return true;
    }
    return task.deps.every(depId => {
      const dep = this.queue.find(t => t.id === depId);
      return dep?.status === 'completed';
    });
  }

  /**
   * Sort queue by priority
   */
  private sort(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    this.queue.sort((a, b) => {
      const pa = priorityOrder[a.priority || 'normal'];
      const pb = priorityOrder[b.priority || 'normal'];
      return pa - pb;
    });
  }

  /**
   * Get all tasks
   */
  getAll(): TaskWithStatus[] {
    return [...this.queue];
  }

  /**
   * Get pending tasks
   */
  getPending(): TaskWithStatus[] {
    return this.queue.filter(t => t.status === 'pending');
  }

  /**
   * Get running tasks
   */
  getRunning(): TaskWithStatus[] {
    return this.queue.filter(t => t.status === 'running');
  }

  /**
   * Get completed tasks
   */
  getCompleted(): TaskWithStatus[] {
    return this.queue.filter(t => t.status === 'completed');
  }

  /**
   * Get failed tasks
   */
  getFailed(): TaskWithStatus[] {
    return this.queue.filter(t => t.status === 'failed');
  }

  /**
   * Check if queue is empty (all tasks processed)
   */
  isEmpty(): boolean {
    return this.queue.every(t => t.status === 'completed' || t.status === 'failed');
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.running = 0;
  }
}
