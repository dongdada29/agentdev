/**
 * DAG - Directed Acyclic Graph for task dependencies
 */

import type { Task, Result } from './types.js';

/**
 * DAG node
 */
interface DAGNode {
  task: Task;
  dependencies: Set<string>;
  dependents: Set<string>;
}

/**
 * Task DAG for dependency-based execution
 */
export class TaskDAG {
  private nodes: Map<string, DAGNode> = new Map();
  private completed: Set<string> = new Set();

  /**
   * Add task to DAG
   */
  add(task: Task): void {
    // Create node first
    const node: DAGNode = {
      task,
      dependencies: new Set(task.deps || []),
      dependents: new Set(),
    };

    // Link to existing dependencies
    for (const depId of node.dependencies) {
      const depNode = this.nodes.get(depId);
      if (depNode) {
        depNode.dependents.add(task.id);
      }
    }

    this.nodes.set(task.id, node);
  }

  /**
   * Add multiple tasks
   */
  addMany(tasks: Task[]): void {
    // First pass: add all nodes
    tasks.forEach(t => {
      this.nodes.set(t.id, {
        task: t,
        dependencies: new Set(t.deps || []),
        dependents: new Set(),
      });
    });

    // Second pass: link dependents
    for (const [, node] of this.nodes) {
      for (const depId of node.dependencies) {
        const depNode = this.nodes.get(depId);
        if (depNode) {
          depNode.dependents.add(node.task.id);
        }
      }
    }
  }

  /**
   * Get task by id
   */
  get(id: string): Task | undefined {
    return this.nodes.get(id)?.task;
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return Array.from(this.nodes.values()).map(n => n.task);
  }

  /**
   * Get tasks ready to execute (no pending dependencies)
   */
  getReady(): Task[] {
    const ready: Task[] = [];

    for (const [id, node] of this.nodes) {
      if (this.completed.has(id)) continue;

      const depsComplete = Array.from(node.dependencies).every(depId =>
        this.completed.has(depId)
      );

      if (depsComplete) {
        ready.push(node.task);
      }
    }

    return ready;
  }

  /**
   * Mark task as completed
   */
  complete(taskId: string): void {
    this.completed.add(taskId);
  }

  /**
   * Check if all tasks are completed
   */
  isComplete(): boolean {
    return this.completed.size === this.nodes.size;
  }

  /**
   * Get execution order (topological sort)
   */
  getExecutionOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string): boolean => {
      if (visited.has(id)) return true;
      if (visiting.has(id)) return false; // Cycle detected

      visiting.add(id);

      const node = this.nodes.get(id);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visit(depId)) {
            return false;
          }
        }
      }

      visiting.delete(id);
      visited.add(id);
      order.push(id);

      return true;
    };

    for (const id of this.nodes.keys()) {
      if (!visited.has(id)) {
        if (!visit(id)) {
          throw new Error('Circular dependency detected in DAG');
        }
      }
    }

    return order;
  }

  /**
   * Detect circular dependencies
   */
  hasCycle(): boolean {
    try {
      this.getExecutionOrder();
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Get dependencies of a task
   */
  getDependencies(taskId: string): string[] {
    return Array.from(this.nodes.get(taskId)?.dependencies || []);
  }

  /**
   * Get dependents of a task
   */
  getDependents(taskId: string): string[] {
    return Array.from(this.nodes.get(taskId)?.dependents || []);
  }

  /**
   * Get critical path (longest path through DAG)
   */
  getCriticalPath(): string[] {
    const pathLength = new Map<string, number>();

    const calcPath = (id: string): number => {
      if (pathLength.has(id)) {
        return pathLength.get(id)!;
      }

      const node = this.nodes.get(id);
      if (!node || node.dependencies.size === 0) {
        pathLength.set(id, 1);
        return 1;
      }

      let maxDepPath = 0;
      for (const depId of node.dependencies) {
        maxDepPath = Math.max(maxDepPath, calcPath(depId));
      }

      const length = maxDepPath + 1;
      pathLength.set(id, length);
      return length;
    };

    for (const id of this.nodes.keys()) {
      calcPath(id);
    }

    let maxNode = '';
    let maxLength = 0;
    for (const [id, length] of pathLength) {
      if (length > maxLength) {
        maxLength = length;
        maxNode = id;
      }
    }

    if (!maxNode) return [];

    const path: string[] = [maxNode];
    let current = maxNode;

    while (true) {
      const node = this.nodes.get(current);
      if (!node || node.dependencies.size === 0) break;

      let maxDep = '';
      let maxDepLength = 0;
      for (const depId of node.dependencies) {
        const depLength = pathLength.get(depId) || 0;
        if (depLength > maxDepLength) {
          maxDepLength = depLength;
          maxDep = depId;
        }
      }

      if (!maxDep) break;
      path.unshift(maxDep);
      current = maxDep;
    }

    return path;
  }

  /**
   * Execute DAG with callback
   * FIXED: Properly collect all results from parallel execution
   */
  async execute(
    executor: (task: Task) => Promise<Result>,
    options?: {
      maxConcurrent?: number;
      onTaskStart?: (task: Task) => void;
      onTaskComplete?: (task: Task, result: Result) => void;
    }
  ): Promise<Result[]> {
    const results: Result[] = [];
    const maxConcurrent = options?.maxConcurrent || 5;
    const runningPromises = new Map<string, Promise<Result>>();

    while (!this.isComplete()) {
      const ready = this.getReady();

      while (runningPromises.size < maxConcurrent && ready.length > 0) {
        const task = ready.shift()!;
        
        if (options?.onTaskStart) {
          options.onTaskStart(task);
        }

        const promise = executor(task)
          .then(result => {
            this.complete(task.id);
            if (options?.onTaskComplete) {
              options.onTaskComplete(task, result);
            }
            return result;
          })
          .catch((error): Result => {
            // Handle errors gracefully
            const result: Result = {
              taskId: task.id,
              success: false,
              output: error instanceof Error ? error.message : 'Unknown error',
            };
            this.complete(task.id);
            if (options?.onTaskComplete) {
              options.onTaskComplete(task, result);
            }
            return result;
          });

        runningPromises.set(task.id, promise);
      }

      if (runningPromises.size > 0) {
        // Wait for one to complete using race, then collect its result
        const completedEntry = await Promise.race(
          Array.from(runningPromises.entries()).map(async ([id, promise]) => {
            const result = await promise;
            return { id, result };
          })
        );

        runningPromises.delete(completedEntry.id);
        results.push(completedEntry.result);
      }

      if (this.getReady().length === 0 && runningPromises.size === 0) {
        break;
      }
    }

    // Collect any remaining running tasks
    if (runningPromises.size > 0) {
      const remaining = await Promise.all(runningPromises.values());
      results.push(...remaining);
    }

    return results;
  }

  /**
   * Reset completed state
   */
  reset(): void {
    this.completed.clear();
  }

  /**
   * Clear DAG
   */
  clear(): void {
    this.nodes.clear();
    this.completed.clear();
  }

  /**
   * Get stats
   */
  getStats(): { total: number; completed: number; pending: number; ready: number } {
    return {
      total: this.nodes.size,
      completed: this.completed.size,
      pending: this.nodes.size - this.completed.size,
      ready: this.getReady().length,
    };
  }
}
