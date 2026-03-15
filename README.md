# AgentDev Framework

**Multi-Agent Collaborative Development Framework**

```
┌─────────────────────────────────────────────────────────────────┐
│                     AgentDev Framework                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │                  Build Time (开发阶段)                    │ │
│   │                                                          │ │
│   │   需求 → SPEC → 任务拆分 → 多Agent并行 → 审查 → 交付   │ │
│   │                                                          │ │
│   └──────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │                   Runtime (运行时)                        │ │
│   │                                                          │ │
│   │   多请求 → 任务队列 → Worker池 → 并行执行 → 结果        │ │
│   │                                                          │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 核心特性

### 🔧 开发阶段 (Build Time)
- **多 Agent 并行开发** - 任务拆分 + 并行执行
- **自动代码审查** - 质量保证
- **测试覆盖率** - 自动验证
- **模板系统** - SPEC/任务模板

### ⚡ 运行时 (Runtime)
- **优先级任务队列** - high/normal/low
- **Worker 池** - 并行处理
- **缓存机制** - LRU + TTL
- **监控指标** - 统计 + 告警

## 快速开始

```typescript
import { AgentDev } from 'agentdev';

// 1. 定义任务
const tasks = [
  { id: 1, agent: 'claude', task: '实现截图服务', files: ['screenshot.ts'] },
  { id: 2, agent: 'claude', task: '实现HTTP服务', files: ['server.ts'] },
  { id: 3, agent: 'claude', task: '编写测试', files: ['*.test.ts'] },
];

// 2. 并行执行
const results = await AgentDev.parallelDev(tasks);

// 3. 代码审查
const issues = await AgentDev.review(results);

// 4. 修复 + 提交
await AgentDev.fix(issues);
await AgentDev.commit(results);
```

## 项目结构

```
agentdev/
├── src/
│   ├── coordinator.ts       # 任务协调器
│   ├── taskQueue.ts        # 优先级队列
│   ├── workerPool.ts       # Worker 池
│   ├── cache.ts            # 缓存机制
│   ├── metrics.ts          # 监控指标
│   ├── reviewer.ts         # 代码审查
│   └── templates/          # 模板
├── templates/
│   ├── SPEC.md             # SPEC 模板
│   ├── TASK.md             # 任务模板
│   └── REVIEW.md           # 审查清单
├── tests/                  # 单元测试
├── README.md
└── package.json
```

## 技术栈

- **运行时**: Node.js
- **Agent**: Claude Code, Codex, OpenCode
- **测试**: Vitest
- **协议**: ACP (Agent Client Protocol)

## 安装

```bash
npm install agentdev
# 或
pnpm add agentdev
```

## 配置

```typescript
// agentdev.config.ts
export default {
  agents: {
    claude: {
      runtime: 'acp',
      model: 'claude-sonnet-4',
    },
  },
  queue: {
    maxConcurrent: 5,
    timeout: 30000,
  },
  review: {
    minCoverage: 70,
    rules: ['error-handling', 'types', 'naming'],
  },
};
```

## 示例

### 1. 多 Agent 并行开发

```typescript
const result = await AgentDev.dev({
  spec: {
    name: 'GUI Agent',
    tasks: [
      { agent: 'claude', task: '截图服务', files: ['screenshot.ts'] },
      { agent: 'claude', task: '键鼠服务', files: ['input.ts'] },
      { agent: 'claude', task: 'HTTP服务', files: ['server.ts'] },
      { agent: 'claude', task: '测试', files: ['*.test.ts'] },
    ],
  },
});
```

### 2. 运行时并行处理

```typescript
const server = new AgentDevServer({
  port: 8080,
  maxConcurrent: 10,
});

// 批量处理
const results = await server.batch([
  { op: 'screenshot' },
  { op: 'click', x: 100, y: 200 },
  { op: 'type', text: 'hello' },
]);
```

## 文档

- [开发范式](./docs/DEVELOPMENT_WORKFLOW.md)
- [运行时架构](./docs/RUNTIME_ARCHITECTURE.md)
- [模板](./docs/TEMPLATES.md)
- [API 参考](./docs/API.md)

## License

MIT
