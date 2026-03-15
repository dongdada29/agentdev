---
name: agentdev
description: 'Multi-Agent Collaborative Development Framework. Use for: (1) parallel development tasks, (2) coordinated multi-agent workflows, (3) task queue management, (4) code review automation. NOT for: simple file edits, reading files, or single-agent tasks.'
metadata:
  {
    "openclaw": { "emoji": "🤖", "requires": {} },
  }
---

# AgentDev - Multi-Agent Development Framework

Use this skill to coordinate multiple AI agents for parallel development tasks.

## What It Does

- **Parallel Development**: Split tasks across multiple agents
- **Task Queue**: Priority-based queue with concurrency control
- **Code Review**: Automated quality checks
- **Templates**: SPEC, Task, and Review templates

## Usage

### 1. Parallel Development

```
User: "实现一个用户认证模块，用多Agent并行开发"

Your response:
```

```typescript
// Use sessions_spawn to launch multiple agents
const tasks = [
  { id: 1, task: "实现用户注册功能", files: ["auth/register.ts"] },
  { id: 2, task: "实现用户登录功能", files: ["auth/login.ts"] },
  { id: 3, task: "实现JWT令牌", files: ["auth/token.ts"] },
  { id: 4, task: "编写单元测试", files: ["auth/*.test.ts"] },
];

// Launch all agents in parallel
const results = await Promise.all(
  tasks.map(t => sessions_spawn({
    runtime: "acp",
    task: t.task,
    cwd: "/path/to/project",
  }))
);
```

### 2. Task Queue (for runtime)

```typescript
// Create a task queue
const queue = new TaskQueue({ maxConcurrent: 5 });

// Add tasks with priority
await queue.enqueue('screenshot', { scale: 1 }, 'high');
await queue.enqueue('click', { x: 100, y: 200 }, 'normal');
await queue.enqueue('type', { text: 'hello' }, 'low');
```

### 3. Code Review

After agent完成任务，用这个检查清单：

```
## Code Review Checklist

### 正确性
- [ ] 代码可编译 (tsc --noEmit)
- [ ] 单元测试通过

### 安全性
- [ ] 无硬编码敏感信息
- [ ] 输入验证

### 测试覆盖
- [ ] 测试文件存在
- [ ] 覆盖率 > 70%
```

## Templates

### SPEC Template

```markdown
## [模块名] 实现规格

### 目标
[一句话]

### 任务拆分
| # | 任务 | Agent |
|---|------|-------|
| 1 | 子任务1 | claude |
| 2 | 子任务2 | claude |

### 验收标准
- [ ] 编译通过
- [ ] 测试通过
- [ ] 覆盖率 > 70%
```

## Examples

### Example 1: Full Development Flow

```
User: "帮我开发一个REST API，用多Agent分工"

1. 先写 SPEC
2. 拆分任务:
   - Agent 1: 路由定义
   - Agent 2: 控制器
   - Agent 3: 数据模型
   - Agent 4: 测试
3. 并行执行
4. 代码审查
5. 提交
```

### Example 2: Parallel Testing

```
User: "给这个项目添加测试"

- Agent 1: 单元测试
- Agent 2: 集成测试
- Agent 3: E2E测试
```

## Commands

No direct commands - just describe what you want to build and the framework will:
1. Create a SPEC
2. Split into tasks
3. Launch agents in parallel
4. Review results
5. Commit

## 🚀 Self-Iteration

The framework can **learn and improve itself** over time!

### How It Works

```
Session 1 → 分析 → Insight 1
Session 2 → 分析 → Insight 2 + 历史
Session 3 → 分析 → 优化建议
...
Session N → 自适应最佳实践
```

### Features

1. **Record Sessions**: 自动记录每个开发会话
2. **Analyze Patterns**: 分析任务拆分、Agent 表现、常见问题
3. **Generate Insights**: 生成优化建议
4. **Auto-Improve**: 自动调整任务粒度、Agent 选择

### Usage

```typescript
import { SelfIteration } from 'agentdev';

const selfIter = new SelfIteration('./.agentdev');

// 1. 记录开发过程
await selfIter.recordSession({
  id: 'session_001',
  timestamp: Date.now(),
  spec: '实现用户认证模块',
  tasks: [
    { id: 1, task: '注册', files: ['register.ts'], agent: 'claude', duration: 45000, success: true },
    { id: 2, task: '登录', files: ['login.ts'], agent: 'claude', duration: 42000, success: true },
  ],
  results: [...],
  duration: 120000,
  issues: [],
  success: true,
});

// 2. 获取优化建议
const recommendations = selfIter.getRecommendations();
// ["[task_splitting] Combine into 3 larger tasks (70% confidence)", ...]

// 3. 获取统计数据
const stats = selfIter.getStats();
// { totalSessions: 5, successRate: 0.8, avgDuration: 180000, topIssues: [...] }
```

### Auto-Improvements

| 指标 | 优化方向 |
|------|----------|
| 任务太细 | 建议合并 |
| 任务太粗 | 建议拆分 |
| Agent 成功率 | 调整 Agent 选择 |
| 常见错误 | 更新模板 Checklist |

---

## Notes

- Requires Claude Code, Codex, or similar agent CLI
- Works best with projects that have clear module boundaries
- Review all generated code before committing
- Self-iteration improves with more sessions (minimum 3 for insights)
