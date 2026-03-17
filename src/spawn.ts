/**
 * OpenClaw Integration - Agent Spawn API
 */

import type { Task, Result, AgentConfig } from './types.js';

/**
 * OpenClaw Gateway configuration
 */
interface GatewayConfig {
  baseUrl: string;
  timeout?: number;
}

const defaultGateway: GatewayConfig = {
  baseUrl: 'http://localhost:18789',
  timeout: 120000, // 2 minutes
};

/**
 * Validate task before spawning
 */
function validateTask(task: Task): void {
  if (!task.id || task.id.trim() === '') {
    throw new Error('Task id is required');
  }
  if (!task.agent || task.agent.trim() === '') {
    throw new Error('Task agent is required');
  }
  if (!task.task || task.task.trim() === '') {
    throw new Error('Task description is required');
  }
  // Files can be empty for some tasks
  if (!Array.isArray(task.files)) {
    throw new Error('Task files must be an array');
  }
}

/**
 * Spawn an agent via OpenClaw Gateway API
 */
export async function spawnAgent(
  task: Task,
  agentConfig: AgentConfig,
  gateway: GatewayConfig = defaultGateway
): Promise<Result> {
  const startTime = Date.now();
  const timeout = agentConfig.timeout || gateway.timeout || 120000;

  // Validate input
  try {
    validateTask(task);
  } catch (error) {
    return {
      taskId: task.id,
      success: false,
      output: error instanceof Error ? error.message : 'Invalid task',
      filesModified: [],
      duration: 0,
    };
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Call OpenClaw Gateway spawn endpoint
    const response = await fetch(`${gateway.baseUrl}/api/v1/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        runtime: agentConfig.runtime,
        agentId: task.agent,
        task: task.task,
        attachAs: {
          mountPath: task.files.join(','),
        },
        timeout: timeout,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Spawn failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      taskId: task.id,
      success: true,
      output: data.output || data.result,
      filesModified: task.files,
      tokensUsed: data.tokensUsed,
      duration: Date.now() - startTime,
      raw: data,
    };
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        taskId: task.id,
        success: false,
        output: `Request timed out after ${timeout}ms`,
        filesModified: [],
        duration: Date.now() - startTime,
      };
    }

    return {
      taskId: task.id,
      success: false,
      output: error instanceof Error ? error.message : 'Unknown error',
      filesModified: [],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Spawn multiple agents in parallel
 */
export async function spawnAgentsParallel(
  tasks: Task[],
  agentConfigs: Record<string, AgentConfig>,
  gateway?: GatewayConfig,
  maxConcurrent: number = 5
): Promise<Result[]> {
  const results: Result[] = [];
  const queue = [...tasks];

  // Process in batches
  while (queue.length > 0) {
    const batch = queue.splice(0, maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(task => {
        const config = agentConfigs[task.agent];
        if (!config) {
          return Promise.resolve({
            taskId: task.id,
            success: false,
            output: `Unknown agent: ${task.agent}`,
          } as Result);
        }
        return spawnAgent(task, config, gateway);
      })
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if OpenClaw Gateway is available
 */
export async function checkGateway(gateway: GatewayConfig = defaultGateway): Promise<boolean> {
  try {
    const response = await fetch(`${gateway.baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
