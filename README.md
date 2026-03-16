# AgentDev Framework

**Multi-Agent Collaborative Development Framework**

[![npm version](https://badge.fury.io/js/agentdev.svg)](https://badge.fury.io/js/agentdev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

## 安装

```bash
npm install agentdev
# 或
pnpm add agentdev
```

## 快速开始

```typescript
import { AgentDev } from 'agentdev';
import type { Task } from 'agentdev';

// 1. 定义任务
const tasks: Task[] = [
  { 
    id: 'screenshot', 
    agent: 'claude', 
    task: 'Implement screenshot service', 
    files: ['src/screenshot.ts'] 
  },
  { 
    id: 'input', 
    agent: 'claude', 
    task: 'Implement input service', 
    files: ['src/input.ts'] 
  },
  { 
    id: 'server', 
    agent: 'glm', 
    task: 'Implement HTTP server', 
    files: ['src/server.ts'],
    deps: ['screenshot', 'input']
  },
];

// 2. 并行执行
const results = await AgentDev.parallelDev(tasks);

// 3. 代码审查
const issues = await AgentDev.review(results);

// 4. 修复 + 提交
await AgentDev.fix(issues);
await AgentDev.commit(results);
```

## API

### `AgentDev.parallelDev(tasks, config?)`

并行执行多个任务（忽略依赖关系）。

```typescript
const results = await AgentDev.parallelDev([
  { id: 'task-1', agent: 'claude', task: '...', files: ['a.ts'] },
  { id: 'task-2', agent: 'glm', task: '...', files: ['b.ts'] },
]);
```

### `AgentDev.dev(tasks, config?)`

执行任务（遵守依赖关系，按拓扑顺序执行）。

```typescript
const results = await AgentDev.dev([
  { id: 'task-1', agent: 'claude', task: '...', files: ['a.ts'] },
  { id: 'task-2', agent: 'claude', task: '...', files: ['b.ts'], deps: ['task-1'] },
]);
```

### `AgentDev.review(results, config?)`

审查执行结果，发现问题。

```typescript
const issues = await AgentDev.review(results);
// issues: Issue[]
```

### `AgentDev.fix(issues, config?)`

修复发现的问题。

```typescript
const fixes = await AgentDev.fix(issues);
```

### `AgentDev.fullCycle(tasks, config?)`

完整开发周期：开发 → 审查 → 修复。

```typescript
const { results, issues, fixes } = await AgentDev.fullCycle(tasks);
```

## 类型定义

```typescript
interface Task {
  id: string;              // 任务 ID
  agent: string;           // Agent 名称 (claude, glm, etc.)
  task: string;            // 任务描述
  files: string[];         // 要修改的文件
  priority?: 'high' | 'normal' | 'low';  // 优先级
  deps?: string[];         // 依赖的任务 ID
}

interface Result {
  taskId: string;          // 任务 ID
  success: boolean;        // 是否成功
  output?: string;         // 输出/错误信息
  filesModified?: string[]; // 修改的文件
  tokensUsed?: number;     // 消耗的 token
  duration?: number;       // 执行时长 (ms)
}

interface Issue {
  id: string;              // 问题 ID
  taskId: string;          // 关联的任务 ID
  type: 'error' | 'warning' | 'suggestion';  // 问题类型
  file: string;            // 文件路径
  line?: number;           // 行号
  message: string;         // 问题描述
  suggestion?: string;     // 修复建议
}
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
    glm: {
      runtime: 'acp',
      model: 'zai/glm-5',
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

## CLI

```bash
# 并行开发
agentdev dev --config tasks.json --parallel 3

# 代码审查
agentdev review

# 完整周期
agentdev full --config tasks.json
```

## 项目结构

```
agentdev/
├── src/
│   ├── index.ts           # 入口
│   ├── coordinator.ts     # 任务协调器
│   ├── reviewer.ts        # 代码审查
│   └── types.ts           # 类型定义
├── templates/
│   ├── SPEC.md            # SPEC 模板
│   ├── TASK.md            # 任务模板
│   └── REVIEW.md          # 审查清单
├── tests/                 # 单元测试
├── examples/              # 示例代码
├── ROADMAP.md             # 版本路线图
└── package.json
```

## 技术栈

- **运行时**: Node.js 18+
- **Agent**: Claude Code, Codex, OpenCode
- **协议**: ACP (Agent Client Protocol)
- **测试**: Vitest

## 文档

- [版本路线图](./ROADMAP.md)
- [SPEC 模板](./templates/SPEC.md)
- [任务模板](./templates/TASK.md)
- [审查清单](./templates/REVIEW.md)

## License

MIT

---

**Status**: v0.1.0 (MVP) - 2026-03-17
