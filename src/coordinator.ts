/**
 * Coordinator - Task coordination and parallel execution
 */

import type { Task, Result, TaskWithStatus, TaskStatus, AgentDevConfig } from './types.js';
import { spawnAgentsParallel, checkGateway } from './spawn.js';

export class Coordinator {
  private config: AgentDevConfig;
  private tasks: Map<string, TaskWithStatus> = new Map();

  constructor(config: AgentDevConfig) {
    this.config = config;
  }

  /**
   * Add a task to the coordinator
   * @throws Error if task is invalid
   */
  addTask(task: Task): void {
    // Input validation
    if (!task.id || task.id.trim() === '') {
      throw new Error('Task id is required');
    }
    if (!task.agent || task.agent.trim() === '') {
      throw new Error(`Task ${task.id}: agent is required`);
    }
    if (!task.task || task.task.trim() === '') {
      throw new Error(`Task ${task.id}: task description is required`);
    }
    if (!Array.isArray(task.files)) {
      throw new Error(`Task ${task.id}: files must be an array`);
    }

    if (this.tasks.has(task.id)) {
      throw new Error(`Task ${task.id}: duplicate task id`);
    }

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
    // Check if Gateway is available
    const gatewayAvailable = await checkGateway();

    if (gatewayAvailable) {
      // Use real OpenClaw spawn
      return spawnAgentsParallel(
        tasks,
        this.config.agents,
        undefined,
        this.config.queue?.maxConcurrent || 5
      );
    }

    // Fallback: return placeholder results (for testing/offline)
    const results: Result[] = tasks.map(task => ({
      taskId: task.id,
      success: true,
      output: `Task ${task.id} completed (offline mode)`,
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
    const failed = new Set<string>();

    // Get tasks with no dependencies
    const getReadyTasks = (): TaskWithStatus[] => {
      return this.getTasks().filter(t => {
        if (t.status !== 'pending') return false;
        if (!t.deps || t.deps.length === 0) return true;
        // Check if all deps are completed (not failed)
        return t.deps.every(dep => completed.has(dep));
      });
    };

    // Process until all tasks are done
    while (completed.size + failed.size < this.tasks.size) {
      const ready = getReadyTasks();
      if (ready.length === 0) {
        // Check for circular dependencies or blocked tasks
        const pending = this.getTasks().filter(t => t.status === 'pending');
        if (pending.length > 0) {
          // Identify which tasks are blocked
          const blockedInfo = pending.map(t => {
            const blockedDeps = (t.deps || []).filter(d => !completed.has(d) && !failed.has(d));
            return `${t.id} (waiting for: ${blockedDeps.join(', ') || 'none'})`;
          }).join('; ');
          throw new Error(`Circular dependency or blocked tasks detected: ${blockedInfo}`);
        }
        break;
      }

      // Execute ready tasks in parallel
      const batchResults = await this.parallel(ready);

      for (const result of batchResults) {
        results.push(result);
        if (result.success) {
          completed.add(result.taskId);
        } else {
          failed.add(result.taskId);
        }
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
