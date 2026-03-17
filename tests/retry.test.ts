import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWithRetry, calculateRetryStats } from '../src/retry.js';
import type { Task, AgentConfig, Result } from '../src/types.js';

// Mock spawn
const mockSpawn = vi.fn();
vi.mock('../src/spawn.js', () => ({
  spawnAgent: (...args: unknown[]) => mockSpawn(...args),
}));

describe('retry', () => {
  const task: Task = { id: 't1', agent: 'claude', task: 'Test', files: [] };
  const config: AgentConfig = { runtime: 'acp', model: 'claude-sonnet-4' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    mockSpawn.mockResolvedValueOnce({
      taskId: 't1',
      success: true,
      output: 'Done',
    } as Result);

    const result = await executeWithRetry(task, config);

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    mockSpawn
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        taskId: 't1',
        success: true,
        output: 'Done',
      } as Result);

    const result = await executeWithRetry(task, config, {
      maxAttempts: 3,
      baseDelay: 10, // Fast for tests
    });

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledTimes(2);
  });

  it('should fail after max attempts', async () => {
    mockSpawn.mockRejectedValue(new Error('Always fails'));

    const result = await executeWithRetry(task, config, {
      maxAttempts: 3,
      baseDelay: 10,
    });

    expect(result.success).toBe(false);
    expect(mockSpawn).toHaveBeenCalledTimes(3);
  });

  it('should calculate retry stats', () => {
    const results: Result[] = [
      { taskId: 't1', success: true, output: 'Done (attempts: 1)' },
      { taskId: 't2', success: true, output: 'Done (attempts: 2)' },
      { taskId: 't3', success: false, output: 'Failed (attempts: 3)' },
    ];

    const stats = calculateRetryStats(results);

    expect(stats.totalAttempts).toBe(6);
    expect(stats.successfulRetries).toBe(1); // t2
    expect(stats.failedTasks).toBe(1); // t3
    expect(stats.avgAttempts).toBe(2);
  });
});
