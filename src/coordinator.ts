/**
 * Coordinator - Task coordination and parallel execution
 */

import type { Task, Result, TaskWithStatus, TaskStatus, AgentDevConfig } from './types.js';

export class Coordinator {
  private config: AgentDevConfig;
  private tasks: Map<string, TaskWithStatus> = new Map();

  constructor(config: AgentDevConfig) {
    this.config = config;
  }

  /**
   * Add a task to the coordinator
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, {
      ...task,
      status: 'pending',
    });
  }

  /**
   * Add multiple tasks
   */
  addTasks(tasks: Task[]): void {
    tasks.forEach(t => this.addTask(t));
  }

  /**
   * Get task by id
   */
  getTask(id: string): TaskWithStatus | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks
   */
  getTasks(): TaskWithStatus[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Update task status
   */
  updateStatus(id: string, status: TaskStatus, result?: Result): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = status;
      if (result) {
        task.result = result;
      }
    }
  }

  /**
   * Execute tasks in parallel (no dependency handling)
   */
  async parallel(tasks: Task[]): Promise<Result[]> {
    // This will be implemented to call OpenClaw sessions_spawn
    // For now, return placeholder results
    const results: Result[] = tasks.map(task => ({
      taskId: task.id,
      success: true,
      output: `Task ${task.id} completed`,
      filesModified: task.files,
    }));

    return results;
  }

  /**
   * Execute tasks respecting dependencies (topological order)
   */
  async executeWithDeps(): Promise<Result[]> {
    const results: Result[] = [];
    const completed = new Set<string>();

    // Get tasks with no dependencies
    const getReadyTasks = (): TaskWithStatus[] => {
      return this.getTasks().filter(t => {
        if (t.status !== 'pending') return false;
        if (!t.deps || t.deps.length === 0) return true;
        return t.deps.every(dep => completed.has(dep));
      });
    };

    // Process until all tasks are done
    while (completed.size < this.tasks.size) {
      const ready = getReadyTasks();
      if (ready.length === 0) {
        // Check for circular dependencies
        const pending = this.getTasks().filter(t => t.status === 'pending');
        if (pending.length > 0) {
          throw new Error('Circular dependency detected or missing dependencies');
        }
        break;
      }

      // Execute ready tasks in parallel
      const batchResults = await this.parallel(ready);

      for (const result of batchResults) {
        results.push(result);
        completed.add(result.taskId);
        this.updateStatus(
          result.taskId,
          result.success ? 'completed' : 'failed',
          result
        );
      }
    }

    return results;
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
  }
}
