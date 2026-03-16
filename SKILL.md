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

## 快速开始

```typescript
import { TaskQueue, WorkerPool, Coordinator, NightlyBuild } from 'agentdev';

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
```

## 使用示例

### 示例 1: 多模块并行开发

```typescript
import { TaskQueue, WorkerPool, Coordinator } from 'agentdev';

async function parallelDevelopment() {
  // 创建队列
  const queue = new TaskQueue();
  
  // 添加多个并行任务
  const modules = [
    { id: 'auth', desc: '实现登录注册模块', priority: 10 },
    { id: 'user', desc: '实现用户资料模块', priority: 8 },
    { id: 'payment', desc: '实现支付模块', priority: 9 },
  ];
  
  for (const m of modules) {
    queue.enqueue({
      id: m.id,
      description: m.desc,
      priority: m.priority,
      skills: ['nodejs', 'typescript'],
    });
  }
  
  // 创建 3 个 Worker
  const pool = new WorkerPool({ maxWorkers: 3 });
  
  // 并行执行
  const coordinator = new Coordinator(queue, pool);
  const results = await coordinator.run();
  
  console.log('完成:', results);
}

parallelDevelopment();
```

### 示例 2: 自动化 CI/CD

```typescript
import { NightlyBuild } from 'agentdev';

const build = new NightlyBuild({
  projectPath: '/path/to/myapp',
  steps: [
    { name: 'install', command: 'npm ci', timeout: 300000 },
    { name: 'lint', command: 'npm run lint', timeout: 120000 },
    { name: 'type-check', command: 'npm run type-check', timeout: 120000 },
    { name: 'test', command: 'npm run test', timeout: 300000 },
    { name: 'build', command: 'npm run build', timeout: 300000 },
  ],
  notify: {
    onSuccess: ['https://hooks.slack.com/services/xxx'],
    onFailure: ['https://hooks.slack.com/services/xxx'],
  },
});

// 运行一次
const result = await build.run();

// 或启动每日定时 (每天凌晨 2 点)
build.start();

// 获取周报
const report = await build.getReport(7);
console.log(report);
```

### 示例 3: 自迭代学习

```typescript
import { SelfIteration } from 'agentdev';

const iter = new SelfIteration('/path/to/project/.agentdev');

// 记录开发会话
await iter.recordSession({
  id: 'session-1',
  timestamp: Date.now(),
  spec: '实现 RESTful API',
  tasks: [
    { id: 1, task: '创建 Express 服务器', files: ['server.ts'], agent: 'claude', duration: 5000, success: true },
    { id: 2, task: '实现用户 CRUD', files: ['user.ts'], agent: 'claude', duration: 12000, success: true },
  ],
  results: [],
  duration: 20000,
  issues: [],
  success: true,
});

// 分析改进
const insights = await iter.analyze();
console.log(insights);

// 获取学习
const learnings = await iter.getLearnings();
```

### 示例 4: 代码审查

```typescript
import { CodeReviewer } from 'agentdev';

const reviewer = new CodeReviewer({
  strict: true,
  rules: ['no-console', 'no-var', 'prefer-const'],
});

// 审查代码
const result = await reviewer.review({
  files: ['src/index.ts', 'src/utils.ts'],
  check: ['lint', 'types', 'security'],
});

if (result.issues.length > 0) {
  console.log('发现问题:', result.issues);
} else {
  console.log('✅ 代码审查通过');
}
```

### 示例 5: 深度研究

```typescript
import { ResearchAgent } from 'agentdev';

const agent = new ResearchAgent();

// 进行深度研究
const report = await agent.research({
  id: 'query-1',
  topic: 'Rust Tauri vs Electron',
  depth: 'deep',
  focusAreas: ['performance', 'developer-experience'],
});

console.log('=== 研究报告 ===');
console.log(report.summary);
console.log('\n发现:', report.findings.length);
console.log('\n洞察:', report.insights);
console.log('\n来源:', report.sources);

// 继续研究
const extended = await agent.continueResearch(report, ['mobile-support', 'community']);
```

### 示例 6: 缓存管理

```typescript
import { Cache } from 'agentdev';

const cache = new Cache({
  maxSize: 100,
  ttl: 60000, // 1 分钟
});

// 设置缓存
cache.set('user:1', { name: '张三', age: 25 });
cache.set('api:data', { items: [1, 2, 3] }, 300000); // 5 分钟 TTL

// 获取缓存
const user = cache.get('user:1');
const data = cache.get('api:data');

// 批量操作
const keys = ['user:1', 'user:2', 'user:3'];
const results = cache.mget(keys);
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
| **ResearchAgent** | 深度研究分析 |

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

---

*多 Agent 并行开发框架*
