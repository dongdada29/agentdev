/**
 * Coordinator
 * Multi-Agent Collaborative Development Coordinator
 */

import { sessions_spawn } from './sessions';
import { CodeReviewer } from './reviewer';
import log from 'electron-log';

export interface AgentDevConfig {
  runtime?: 'acp' | 'subagent';
  model?: string;
  cwd?: string;
}

export interface DevTask {
  id: number;
  agent: 'claude' | 'codex' | 'opencode';
  task: string;
  files: string[];
  dependencies?: number[];
}

export interface DevSpec {
  name: string;
  description?: string;
  tasks: DevTask[];
  cwd: string;
}

export interface DevResult {
  taskId: number;
  files: string[];
  success: boolean;
  error?: Error;
}

/**
 * AgentDev - Multi-Agent Collaborative Development
 */
export class AgentDev {
  private config: AgentDevConfig;
  private reviewer: CodeReviewer;

  constructor(config: AgentDevConfig = {}) {
    this.config = {
      runtime: 'acp',
      ...config,
    };
    this.reviewer = new CodeReviewer();
  }

  /**
   * Parallel development with multiple agents
   */
  async parallelDev(spec: DevSpec): Promise<DevResult[]> {
    log.info(`[AgentDev] Starting parallel development: ${spec.name}`);
    log.info(`[AgentDev] ${spec.tasks.length} tasks to execute`);

    // Execute all tasks in parallel
    const promises = spec.tasks.map((task) =>
      this.executeTask(task, spec.cwd)
    );

    const results = await Promise.all(promises);

    // Summary
    const successCount = results.filter((r) => r.success).length;
    log.info(
      `[AgentDev] Completed: ${successCount}/${results.length} tasks successful`
    );

    return results;
  }

  /**
   * Sequential development
   */
  async sequentialDev(spec: DevSpec): Promise<DevResult[]> {
    log.info(`[AgentDev] Starting sequential development: ${spec.name}`);

    const results: DevResult[] = [];

    for (const task of spec.tasks) {
      const result = await this.executeTask(task, spec.cwd);
      results.push(result);

      if (!result.success) {
        log.warn(`[AgentDev] Task ${task.id} failed, stopping sequence`);
        break;
      }
    }

    return results;
  }

  /**
   * Execute single task with agent
   */
  private async executeTask(task: DevTask, cwd: string): Promise<DevResult> {
    log.info(`[AgentDev] Executing task ${task.id}: ${task.task.substring(0, 50)}...`);

    try {
      const result = await sessions_spawn({
        runtime: this.config.runtime || 'acp',
        agentId: task.agent,
        cwd,
        task: task.task,
        mode: 'run',
      });

      log.info(`[AgentDev] Task ${task.id} completed`);

      return {
        taskId: task.id,
        files: task.files,
        success: true,
      };
    } catch (error: any) {
      log.error(`[AgentDev] Task ${task.id} failed:`, error.message);

      return {
        taskId: task.id,
        files: task.files,
        success: false,
        error,
      };
    }
  }

  /**
   * Review code
   */
  async review(results: DevResult[]): Promise<any> {
    const successfulResults = results.filter((r) => r.success);
    log.info(`[AgentDev] Reviewing ${successfulResults.length} task results`);

    return await this.reviewer.review(successfulResults);
  }

  /**
   * Commit changes
   */
  async commit(results: DevResult[], message?: string): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const files = results.flatMap((r) => r.files);
    const msg = message || `feat: ${results.length} tasks completed`;

    try {
      await execAsync(`git add ${files.join(' ')}`);
      await execAsync(`git commit -m "${msg}"`);
      log.info(`[AgentDev] Committed: ${msg}`);
    } catch (error: any) {
      log.error(`[AgentDev] Commit failed:`, error.message);
    }
  }
}

// Default instance
export const agentDev = new AgentDev();
