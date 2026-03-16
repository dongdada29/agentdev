import { describe, it, expect, vi } from 'vitest';
import { spawnAgent, checkGateway } from '../src/spawn.js';
import type { Task, AgentConfig } from '../src/types.js';

// Mock fetch
global.fetch = vi.fn();

describe('spawn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should spawn an agent successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ output: 'Task completed', tokensUsed: 100 }),
    } as Response);

    const task: Task = {
      id: 'task-1',
      agent: 'claude',
      task: 'Test task',
      files: ['test.ts'],
    };

    const config: AgentConfig = {
      runtime: 'acp',
      model: 'claude-sonnet-4',
    };

    const result = await spawnAgent(task, config);

    expect(result.success).toBe(true);
    expect(result.taskId).toBe('task-1');
    expect(result.tokensUsed).toBe(100);
  });

  it('should handle spawn failure', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const task: Task = {
      id: 'task-1',
      agent: 'claude',
      task: 'Test task',
      files: ['test.ts'],
    };

    const config: AgentConfig = {
      runtime: 'acp',
      model: 'claude-sonnet-4',
    };

    const result = await spawnAgent(task, config);

    expect(result.success).toBe(false);
    expect(result.output).toContain('500');
  });

  it('should check gateway availability', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
    } as Response);

    const available = await checkGateway();
    expect(available).toBe(true);
  });

  it('should return false when gateway unavailable', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const available = await checkGateway();
    expect(available).toBe(false);
  });
});
