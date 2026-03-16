import { describe, it, expect } from 'vitest';
import { AgentDev } from '../src/index.js';
import type { Task } from '../src/types.js';

describe('AgentDev', () => {
  it('should execute parallel development', async () => {
    const tasks: Task[] = [
      { id: 'task-1', agent: 'claude', task: 'Task 1', files: ['a.ts'] },
      { id: 'task-2', agent: 'claude', task: 'Task 2', files: ['b.ts'] },
    ];

    const results = await AgentDev.parallelDev(tasks);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
  });

  it('should review results', async () => {
    const results = [
      { taskId: 'task-1', success: true, filesModified: ['a.ts'] },
    ];

    const issues = await AgentDev.review(results);

    expect(Array.isArray(issues)).toBe(true);
  });

  it('should run full cycle', async () => {
    const tasks: Task[] = [
      { id: 'task-1', agent: 'claude', task: 'Task 1', files: ['a.ts'] },
    ];

    const { results, issues, fixes } = await AgentDev.fullCycle(tasks);

    expect(results).toHaveLength(1);
    expect(Array.isArray(issues)).toBe(true);
    expect(Array.isArray(fixes)).toBe(true);
  });
});
