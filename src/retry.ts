/**
 * Retry - Task retry strategies
 */

import type { Task, Result, AgentConfig } from './types.js';
import { spawnAgent } from './spawn.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  backoff: 'fixed' | 'linear' | 'exponential';
  baseDelay: number; // ms
  maxDelay: number; // ms
  retryOn: ('error' | 'timeout' | 'rate_limit')[];
}

/**
 * Default retry config
 */
const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  backoff: 'exponential',
  baseDelay: 1000,
  maxDelay: 30000,
  retryOn: ['error', 'timeout'],
};

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  let delay: number;

  switch (config.backoff) {
    case 'fixed':
      delay = config.baseDelay;
      break;
    case 'linear':
      delay = config.baseDelay * attempt;
      break;
    case 'exponential':
      delay = config.baseDelay * Math.pow(2, attempt - 1);
      break;
  }

  return Math.min(delay, config.maxDelay);
}

/**
 * Check if error is retryable
 */
function isRetryable(result: Result, config: RetryConfig): boolean {
  if (result.success) return false;

  const output = result.output?.toLowerCase() || '';

  if (config.retryOn.includes('timeout') && output.includes('timeout')) {
    return true;
  }

  if (config.retryOn.includes('rate_limit') && 
      (output.includes('rate limit') || output.includes('429'))) {
    return true;
  }

  if (config.retryOn.includes('error')) {
    return true;
  }

  return false;
}

/**
 * Execute task with retry
 */
export async function executeWithRetry(
  task: Task,
  agentConfig: AgentConfig,
  retryConfig: Partial<RetryConfig> = {}
): Promise<Result> {
  const config = { ...defaultRetryConfig, ...retryConfig };
  const attempts: Result[] = [];

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const result = await spawnAgent(task, agentConfig);
    attempts.push(result);

    if (result.success) {
      return {
        ...result,
        output: `${result.output} (attempts: ${attempt})`,
      };
    }

    // Check if we should retry
    if (attempt < config.maxAttempts && isRetryable(result, config)) {
      const delay = calculateDelay(attempt, config);
      console.log(`Retry ${attempt}/${config.maxAttempts} for task ${task.id} in ${delay}ms`);
      await sleep(delay);
    } else {
      // No more retries
      break;
    }
  }

  // All attempts failed
  const lastResult = attempts[attempts.length - 1];
  return {
    ...lastResult,
    output: `Failed after ${config.maxAttempts} attempts: ${lastResult.output}`,
  };
}

/**
 * Execute multiple tasks with retry
 */
export async function executeBatchWithRetry(
  tasks: Task[],
  agentConfigs: Record<string, AgentConfig>,
  retryConfig: Partial<RetryConfig> = {}
): Promise<Result[]> {
  return Promise.all(
    tasks.map(task => {
      const config = agentConfigs[task.agent];
      if (!config) {
        return Promise.resolve({
          taskId: task.id,
          success: false,
          output: `Unknown agent: ${task.agent}`,
        } as Result);
      }
      return executeWithRetry(task, config, retryConfig);
    })
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry stats
 */
export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedTasks: number;
  avgAttempts: number;
}

/**
 * Calculate retry statistics
 */
export function calculateRetryStats(results: Result[]): RetryStats {
  const withRetryInfo = results.filter(r => r.output?.includes('attempts:'));
  
  let totalAttempts = 0;
  let successfulRetries = 0;

  withRetryInfo.forEach(r => {
    const match = r.output?.match(/\(attempts: (\d+)\)/);
    if (match) {
      const attempts = parseInt(match[1]);
      totalAttempts += attempts;
      if (attempts > 1 && r.success) {
        successfulRetries++;
      }
    }
  });

  return {
    totalAttempts,
    successfulRetries,
    failedTasks: results.filter(r => !r.success).length,
    avgAttempts: withRetryInfo.length > 0 ? totalAttempts / withRetryInfo.length : 1,
  };
}
