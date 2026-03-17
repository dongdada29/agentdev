import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter, createRouter } from '../src/router.js';
import type { Task } from '../src/types.js';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = createRouter();
  });

  it('should select model for coding task', () => {
    const task: Task = {
      id: 't1',
      agent: 'claude',
      task: 'Implement a new API endpoint',
      files: ['api.ts'],
    };

    const model = router.selectModel(task);
    expect(model).toBeDefined();
  });

  it('should select model for Chinese task', () => {
    const task: Task = {
      id: 't1',
      agent: 'claude',
      task: '实现一个新的功能',
      files: ['feature.ts'],
    };

    const model = router.selectModel(task);
    expect(model).toBeDefined();
  });

  it('should prioritize speed when configured', () => {
    const fastRouter = createRouter({ prioritizeSpeed: true });
    
    const task: Task = {
      id: 't1',
      agent: 'claude',
      task: 'Quick fix for bug',
      files: ['bug.ts'],
      priority: 'high',
    };

    const model = fastRouter.selectModel(task);
    expect(model).toBeDefined();
  });

  it('should use preferred models when set', () => {
    const preferredRouter = createRouter({
      preferredModels: ['zai/glm-5'],
    });

    const task: Task = {
      id: 't1',
      agent: 'claude',
      task: 'Write a function',
      files: ['func.ts'],
    };

    const model = preferredRouter.selectModel(task);
    expect(model).toBe('zai/glm-5');
  });

  it('should route task to model config', () => {
    const task: Task = {
      id: 't1',
      agent: 'claude',
      task: 'Implement API',
      files: ['api.ts'],
    };

    const { model, config } = router.route(task);

    expect(model).toBeDefined();
    expect(config.runtime).toBe('acp');
    expect(config.model).toBe(model);
  });

  it('should route multiple tasks', () => {
    const tasks: Task[] = [
      { id: 't1', agent: 'claude', task: 'Code feature', files: [] },
      { id: 't2', agent: 'claude', task: '分析问题', files: [] },
    ];

    const routing = router.routeMany(tasks);

    expect(routing.size).toBe(2);
    expect(routing.get('t1')).toBeDefined();
    expect(routing.get('t2')).toBeDefined();
  });

  it('should get available models', () => {
    const models = router.getAvailableModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models.find(m => m.id === 'claude-sonnet-4')).toBeDefined();
  });

  it('should add custom model', () => {
    router.addProfile('custom-model', {
      id: 'custom-model',
      provider: 'custom',
      strengths: ['coding'],
      maxTokens: 100000,
      costPerToken: 0.001,
      latency: 'low',
    });

    const task: Task = {
      id: 't1',
      agent: 'custom',
      task: 'Code something',
      files: [],
    };

    const model = router.selectModel(task);
    // Should select custom model if it scores highest
    expect(model).toBeDefined();
  });
});
