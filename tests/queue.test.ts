import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue } from '../src/queue.js';
import type { Task } from '../src/types.js';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue(3);
  });

  it('should enqueue tasks', () => {
    queue.enqueue({ id: 't1', agent: 'claude', task: 'Task 1', files: [] });
    expect(queue.size()).toBe(1);
  });

  it('should sort by priority', () => {
    queue.enqueueMany([
      { id: 't1', agent: 'claude', task: 'Low', files: [], priority: 'low' },
      { id: 't2', agent: 'claude', task: 'High', files: [], priority: 'high' },
      { id: 't3', agent: 'claude', task: 'Normal', files: [], priority: 'normal' },
    ]);

    const pending = queue.getPending();
    expect(pending[0].priority).toBe('high');
    expect(pending[1].priority).toBe('normal');
    expect(pending[2].priority).toBe('low');
  });

  it('should respect concurrency limit', () => {
    queue.enqueueMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [] },
      { id: 't3', agent: 'claude', task: 'Task 3', files: [] },
      { id: 't4', agent: 'claude', task: 'Task 4', files: [] },
    ]);

    // Should only get 3 (max concurrent)
    const t1 = queue.dequeue();
    const t2 = queue.dequeue();
    const t3 = queue.dequeue();
    const t4 = queue.dequeue();

    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
    expect(t3).toBeDefined();
    expect(t4).toBeUndefined(); // Limited to 3
  });

  it('should handle dependencies', () => {
    queue.enqueueMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
    ]);

    // t2 depends on t1, so t2 shouldn't be available first
    const first = queue.dequeue();
    expect(first?.id).toBe('t1');

    // Mark t1 complete
    queue.complete('t1');

    // Now t2 should be available
    const second = queue.dequeue();
    expect(second?.id).toBe('t2');
  });

  it('should track task status', () => {
    queue.enqueue({ id: 't1', agent: 'claude', task: 'Task 1', files: [] });

    const task = queue.dequeue();
    expect(task?.status).toBe('running');

    queue.complete('t1');
    expect(queue.getCompleted()).toHaveLength(1);
  });

  it('should detect when queue is empty', () => {
    queue.enqueue({ id: 't1', agent: 'claude', task: 'Task 1', files: [] });

    expect(queue.isEmpty()).toBe(false);

    queue.dequeue();
    queue.complete('t1');

    expect(queue.isEmpty()).toBe(true);
  });

  it('should clear queue', () => {
    queue.enqueueMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [] },
    ]);

    queue.clear();
    expect(queue.size()).toBe(0);
  });
});
