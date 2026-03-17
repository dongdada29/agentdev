/**
 * AgentDev Framework
 * Multi-Agent Collaborative Development Framework
 */

import { Coordinator } from './coordinator.js';
import { Reviewer } from './reviewer.js';
import type { Task, Result, Issue, AgentDevConfig } from './types.js';

export { Coordinator } from './coordinator.js';
export { Reviewer } from './reviewer.js';
export { spawnAgent, spawnAgentsParallel, checkGateway } from './spawn.js';
export { TaskQueue } from './queue.js';
export { WorkerPool } from './pool.js';
export { executeWithRetry, executeBatchWithRetry, calculateRetryStats } from './retry.js';
export type { RetryConfig, RetryStats } from './retry.js';
export type {
  Task,
  Result,
  Issue,
  AgentConfig,
  AgentDevConfig,
  TaskStatus,
  TaskWithStatus,
} from './types.js';

/**
 * Default configuration
 */
const defaultConfig: AgentDevConfig = {
  agents: {
    claude: {
      runtime: 'acp',
      model: 'claude-sonnet-4',
    },
    glm: {
      runtime: 'acp',
      model: 'zai/glm-5',
    },
  },
  queue: {
    maxConcurrent: 5,
    timeout: 30000,
  },
  review: {
    minCoverage: 70,
    rules: ['error-handling', 'types', 'naming'],
  },
};

/**
 * AgentDev - Main API
 */
export class AgentDev {
  private config: AgentDevConfig;
  private coordinator: Coordinator;
  private reviewer: Reviewer;

  constructor(config: Partial<AgentDevConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.coordinator = new Coordinator(this.config);
    this.reviewer = new Reviewer(this.config);
  }

  /**
   * Parallel development - execute tasks in parallel
   */
  static async parallelDev(tasks: Task[], config?: Partial<AgentDevConfig>): Promise<Result[]> {
    const agentDev = new AgentDev(config);
    agentDev.coordinator.addTasks(tasks);
    return agentDev.coordinator.parallel(tasks);
  }

  /**
   * Development with dependencies - execute tasks in topological order
   */
  static async dev(tasks: Task[], config?: Partial<AgentDevConfig>): Promise<Result[]> {
    const agentDev = new AgentDev(config);
    agentDev.coordinator.addTasks(tasks);
    return agentDev.coordinator.executeWithDeps();
  }

  /**
   * Review results and find issues
   */
  static async review(results: Result[], config?: Partial<AgentDevConfig>): Promise<Issue[]> {
    const agentDev = new AgentDev(config);
    return agentDev.reviewer.review(results);
  }

  /**
   * Fix issues (spawn fixer agents)
   */
  static async fix(issues: Issue[], config?: Partial<AgentDevConfig>): Promise<Result[]> {
    const agentDev = new AgentDev(config);

    // Convert issues to fix tasks
    const fixTasks: Task[] = issues.map((issue, index) => ({
      id: `fix-${issue.taskId}-${index}`,
      agent: 'claude',
      task: `Fix: ${issue.message}\n\nSuggestion: ${issue.suggestion || 'Apply appropriate fix'}`,
      files: [issue.file],
      priority: issue.type === 'error' ? 'high' : 'normal',
    }));

    return agentDev.coordinator.parallel(fixTasks);
  }

  /**
   * Full development cycle: dev -> review -> fix
   */
  static async fullCycle(
    tasks: Task[],
    config?: Partial<AgentDevConfig>
  ): Promise<{ results: Result[]; issues: Issue[]; fixes: Result[] }> {
    // 1. Parallel development
    const results = await AgentDev.parallelDev(tasks, config);

    // 2. Review
    const issues = await AgentDev.review(results, config);

    // 3. Fix if there are issues
    let fixes: Result[] = [];
    if (issues.length > 0) {
      fixes = await AgentDev.fix(issues, config);
    }

    return { results, issues, fixes };
  }

  /**
   * Commit changes
   */
  static async commit(results: Result[], message?: string): Promise<void> {
    // TODO: Implement git commit
    const files = results.flatMap(r => r.filesModified || []);
    console.log(`Would commit files: ${files.join(', ')}`);
    console.log(`Message: ${message || 'chore: agentdev updates'}`);
  }
}

/**
 * Create AgentDev instance
 */
export function createAgentDev(config?: Partial<AgentDevConfig>): AgentDev {
  return new AgentDev(config);
}
