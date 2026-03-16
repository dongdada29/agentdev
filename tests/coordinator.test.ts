import { describe, it, expect } from 'vitest';
import { Coordinator } from '../src/coordinator.js';
import type { Task, AgentDevConfig } from '../src/types.js';

const mockConfig: AgentDevConfig = {
  agents: {
    claude: { runtime: 'acp', model: 'claude-sonnet-4' },
  },
};

describe('Coordinator', () => {
  it('should add tasks', () => {
    const coordinator = new Coordinator(mockConfig);
    const task: Task = {
      id: 'task-1',
      agent: 'claude',
      task: 'Test task',
      files: ['test.ts'],
    };

    coordinator.addTask(task);

    expect(coordinator.getTask('task-1')).toBeDefined();
    expect(coordinator.getTask('task-1')?.status).toBe('pending');
  });

  it('should add multiple tasks', () => {
    const coordinator = new Coordinator(mockConfig);
    const tasks: Task[] = [
      { id: 'task-1', agent: 'claude', task: 'Task 1', files: ['a.ts'] },
      { id: 'task-2', agent: 'claude', task: 'Task 2', files: ['b.ts'] },
    ];

    coordinator.addTasks(tasks);

    expect(coordinator.getTasks()).toHaveLength(2);
  });

  it('should update task status', () => {
    const coordinator = new Coordinator(mockConfig);
    coordinator.addTask({
      id: 'task-1',
      agent: 'claude',
      task: 'Test',
      files: ['test.ts'],
    });

    coordinator.updateStatus('task-1', 'completed', {
      taskId: 'task-1',
      success: true,
    });

    const task = coordinator.getTask('task-1');
    expect(task?.status).toBe('completed');
    expect(task?.result?.success).toBe(true);
  });

  it('should execute tasks in parallel', async () => {
    const coordinator = new Coordinator(mockConfig);
    const tasks: Task[] = [
      { id: 'task-1', agent: 'claude', task: 'Task 1', files: ['a.ts'] },
      { id: 'task-2', agent: 'claude', task: 'Task 2', files: ['b.ts'] },
    ];

    const results = await coordinator.parallel(tasks);

    expect(results).toHaveLength(2);
    expect(results[0].taskId).toBe('task-1');
    expect(results[1].taskId).toBe('task-2');
  });

  it('should handle dependencies', async () => {
    const coordinator = new Coordinator(mockConfig);
    coordinator.addTasks([
      { id: 'task-1', agent: 'claude', task: 'Task 1', files: ['a.ts'] },
      { id: 'task-2', agent: 'claude', task: 'Task 2', files: ['b.ts'], deps: ['task-1'] },
      { id: 'task-3', agent: 'claude', task: 'Task 3', files: ['c.ts'], deps: ['task-2'] },
    ]);

    const results = await coordinator.executeWithDeps();

    expect(results).toHaveLength(3);
    // Results should be in dependency order
    expect(results[0].taskId).toBe('task-1');
    expect(results[1].taskId).toBe('task-2');
    expect(results[2].taskId).toBe('task-3');
  });
});
