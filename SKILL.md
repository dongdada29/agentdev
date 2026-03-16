---
name: agentdev
description: 'Multi-Agent Collaborative Development Framework. Use for: parallel development, task queuing, code review, self-iteration, or any multi-agent development task.'
metadata:
  {
    "openclaw": { "emoji": "🤖", "requires": {} },
  }
---

# AgentDev Skill

多 Agent 并行开发框架

## 安装

```bash
npm install agentdev
```

## 核心模块

| 模块 | 功能 |
|------|------|
| **TaskQueue** | 优先级任务队列 |
| **WorkerPool** | Worker 池自动扩缩容 |
| **Coordinator** | 多 Agent 协调 |
| **Cache** | LRU 缓存 + TTL |
| **Metrics** | 监控统计 |
| **Reviewer** | 代码审查 |
| **SelfIteration** | 自迭代学习 |
| **NightlyBuild** | 自动化构建 |

## 快速开始

```typescript
import { 
  TaskQueue, 
  WorkerPool, 
  Coordinator,
  NightlyBuild 
} from 'agentdev';

// 1. 创建任务队列
const queue = new TaskQueue();

// 2. 添加任务
queue.enqueue({
  id: 'task-1',
  description: '实现用户模块',
  priority: 10,
  skills: ['react', 'typescript'],
});

// 3. 创建 Worker 池
const pool = new WorkerPool({
  maxWorkers: 5,
  concurrency: 3,
});

// 4. 协调执行
const coordinator = new Coordinator(queue, pool);
await coordinator.run();

// 5. 自动化构建
const build = new NightlyBuild({
  projectPath: '/path/to/project',
  steps: [
    { name: 'install', command: 'npm ci', timeout: 300000 },
    { name: 'test', command: 'npm test', timeout: 300000 },
    { name: 'build', command: 'npm run build', timeout: 300000 },
  ],
});

build.start(); // 每天自动运行
```

## Agent 类型

| 类型 | 用途 | 并发 |
|------|------|------|
| **worker** | 日常开发 | 5 |
| **reviewer** | 代码审查 | 3 |
| **coordinator** | 任务协调 | 1 |

## TaskQueue

```typescript
// 优先级队列
queue.enqueue({
  id: 'task-1',
  description: '实现登录',
  priority: 10, // 越高越先
  skills: ['react'],
});

// 按优先级取出
const task = queue.dequeue();
```

## WorkerPool

```typescript
const pool = new WorkerPool({
  maxWorkers: 10,
  concurrency: 3,    // 每个 worker 并发
  idleTimeout: 60000, // 空闲超时
});

// 执行任务
const result = await pool.execute(worker => {
  return worker.run(task);
});
```

## SelfIteration

```typescript
const iter = new SelfIteration('/path/to/.agentdev');

// 记录会话
await iter.recordSession({
  id: 'session-1',
  timestamp: Date.now(),
  spec: '实现 REST API',
  tasks: [{ id: 1, task: '写代码', files: ['a.ts'] }],
  results: [],
  duration: 60000,
});

// 获取改进建议
const insights = await iter.analyze();
```

## NightlyBuild

```typescript
const build = new NightlyBuild({
  projectPath: '.',
  steps: [
    { name: 'install', command: 'npm ci' },
    { name: 'lint', command: 'npm run lint' },
    { name: 'test', command: 'npm test' },
    { name: 'build', command: 'npm run build' },
  ],
  notify: {
    onSuccess: ['https://hooks.slack.com/xxx'],
    onFailure: ['https://hooks.slack.com/xxx'],
  },
});

// 运行一次
const result = await build.run();

// 或启动定时
build.start(); // 每天 2 AM
```

## 指标

```typescript
const metrics = new Metrics();

// 记录指标
metrics.increment('tasks.completed');
metrics.record('duration', 5000, 'ms');

// 获取统计
const stats = metrics.getSummary();
```

## CLI

```bash
# 初始化
agentdev init

# 添加任务
agentdev task add "实现登录" --priority 10

# 运行
agentdev run

# 查看状态
agentdev status
```

## 工作流

```
┌─────────────┐
│  TaskQueue  │ ← 添加任务
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Coordinator │ ← 拆分任务
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ WorkerPool  │ ← 并行执行
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Reviewer   │ ← 代码审查
└──────┬──────┘
       │
       ▼
   结果汇总
```

## 使用场景

- **多模块并行开发**: 多个 worker 同时开发不同模块
- **CI/CD**: 自动化构建、测试、部署
- **Code Review**: 自动化代码审查
- **自迭代**: 从错误中学习改进
- **定时任务**: 每日构建、监控

---

*多 Agent 并行开发框架*
