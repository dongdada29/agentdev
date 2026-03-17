import { describe, it, expect, beforeEach } from 'vitest';
import { TaskDAG } from '../src/dag.js';
import type { Task, Result } from '../src/types.js';

describe('TaskDAG', () => {
  let dag: TaskDAG;

  beforeEach(() => {
    dag = new TaskDAG();
  });

  it('should add tasks', () => {
    dag.add({ id: 't1', agent: 'claude', task: 'Task 1', files: [] });
    expect(dag.get('t1')).toBeDefined();
  });

  it('should add multiple tasks', () => {
    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [] },
    ]);
    expect(dag.getAll()).toHaveLength(2);
  });

  it('should get ready tasks (no dependencies)', () => {
    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
    ]);

    const ready = dag.getReady();
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe('t1');
  });

  it('should detect cycles', () => {
    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [], deps: ['t2'] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
    ]);

    expect(dag.hasCycle()).toBe(true);
  });

  it('should get execution order', () => {
    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
      { id: 't3', agent: 'claude', task: 'Task 3', files: [], deps: ['t2'] },
    ]);

    const order = dag.getExecutionOrder();
    expect(order.indexOf('t1')).toBeLessThan(order.indexOf('t2'));
    expect(order.indexOf('t2')).toBeLessThan(order.indexOf('t3'));
  });

  it('should track completion', () => {
    dag.add({ id: 't1', agent: 'claude', task: 'Task 1', files: [] });

    expect(dag.isComplete()).toBe(false);

    dag.complete('t1');

    expect(dag.isComplete()).toBe(true);
  });

  it('should get dependencies and dependents', () => {
    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
    ]);

    expect(dag.getDependencies('t2')).toContain('t1');
    expect(dag.getDependents('t1')).toContain('t2');
  });

  it('should get critical path', () => {
    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
      { id: 't3', agent: 'claude', task: 'Task 3', files: [], deps: ['t2'] },
      { id: 't4', agent: 'claude', task: 'Task 4', files: [], deps: ['t1'] },
    ]);

    const criticalPath = dag.getCriticalPath();
    expect(criticalPath).toContain('t3');
  });

  it('should execute tasks in order', async () => {
    const executionOrder: string[] = [];

    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
      { id: 't3', agent: 'claude', task: 'Task 3', files: [], deps: ['t2'] },
    ]);

    const executor = async (task: Task): Promise<Result> => {
      executionOrder.push(task.id);
      return { taskId: task.id, success: true };
    };

    await dag.execute(executor, { maxConcurrent: 1 });

    expect(executionOrder).toEqual(['t1', 't2', 't3']);
  });

  it('should get stats', () => {
    dag.addMany([
      { id: 't1', agent: 'claude', task: 'Task 1', files: [] },
      { id: 't2', agent: 'claude', task: 'Task 2', files: [], deps: ['t1'] },
    ]);

    const stats = dag.getStats();
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(0);
    expect(stats.pending).toBe(2);
  });
});
