import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkerPool } from '../src/pool.js';
import type { Task, AgentConfig } from '../src/types.js';

// Mock spawn
vi.mock('../src/spawn.js', () => ({
  spawnAgent: vi.fn().mockImplementation(async (task: Task) => ({
    taskId: task.id,
    success: true,
    output: `Mocked: ${task.task}`,
  })),
}));

describe('WorkerPool', () => {
  let pool: WorkerPool;
  const agentConfigs: Record<string, AgentConfig> = {
    claude: { runtime: 'acp', model: 'claude-sonnet-4' },
  };

  beforeEach(() => {
    pool = new WorkerPool({
      maxWorkers: 3,
      taskTimeout: 30000,
      agentConfigs,
    });
    vi.clearAllMocks();
  });

  it('should initialize workers', () => {
    const status = pool.getStatus();
    expect(status.total).toBe(3);
    expect(status.idle).toBe(3);
  });

  it('should get idle worker', () => {
    const worker = pool.getIdleWorker();
    expect(worker).toBeDefined();
    expect(worker?.status).toBe('idle');
  });

  it('should process queue', async () => {
    const tasks: Task[] = [
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [] },
    ];

    const results = await pool.processQueue(tasks);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  it('should call progress callback', async () => {
    const tasks: Task[] = [
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
    ];

    const progressFn = vi.fn();
    await pool.processQueue(tasks, progressFn);

    expect(progressFn).toHaveBeenCalledWith(1, 1);
  });

  it('should reset workers', () => {
    pool.reset();
    const status = pool.getStatus();
    expect(status.idle).toBe(3);
  });

  it('should handle unknown agent', async () => {
    const tasks: Task[] = [
      { id: 't1', agent: 'unknown-agent', task: 'Task 1', files: [] },
    ];

    const results = await pool.processQueue(tasks);

    expect(results[0].success).toBe(false);
    expect(results[0].output).toContain('Unknown agent');
  });
});
