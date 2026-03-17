# AgentDev 路线图

> Multi-Agent Collaborative Development Framework

---

## Phase 1: agentdev v0.1 (MVP) ✅

**目标**：验证"多 Agent 并行开发"核心价值

**状态**: ✅ 完成 (2026-03-17)

### 核心功能
- ✅ 任务拆分 + 并行执行
- ✅ 代码审查
- ✅ 自动修复 + 提交

### 技术实现

```typescript
// agentdev/src/index.ts
export class AgentDev {
  // 1. 并行开发
  static async parallelDev(tasks: Task[]): Promise<Result[]>

  // 2. 代码审查
  static async review(results: Result[]): Promise<Issue[]>

  // 3. 自动修复
  static async fix(issues: Issue[]): Promise<void>
}
```

### 目录结构
```
agentdev/
├── src/
│   ├── index.ts           # 入口
│   ├── coordinator.ts     # 任务协调
│   ├── reviewer.ts        # 代码审查
│   └── types.ts           # 类型定义
├── templates/
│   └── TASK.md            # 任务模板
├── package.json
└── README.md
```

### 时间
**1 周** (2026-03-17 ~ 2026-03-24)

---

## Phase 2: agentdev v0.2 (Runtime) ✅

**目标**：支持运行时任务队列

**状态**: ✅ 完成 (2026-03-17)

### 新增功能
- 优先级队列 (high/normal/low)
- Worker 池管理
- 失败重试

### 目录结构
```
agentdev/
├── src/
│   ├── ...
│   ├── queue.ts           # 优先级队列
│   ├── workerPool.ts      # Worker 池
│   └── retry.ts           # 重试策略
```

### 配置文件
```typescript
// agentdev.config.ts
export default {
  agents: {
    claude: { runtime: 'acp', model: 'claude-sonnet-4' },
    glm: { runtime: 'acp', model: 'zai/glm-5' },
  },
  queue: {
    maxConcurrent: 5,
    timeout: 30000,
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  }
};
```

### 时间
**1 周** (2026-03-24 ~ 2026-03-31)

---

## Phase 3: agentdev v0.3 (DAG + 多模型) ✅

**目标**：任务依赖 + 多模型支持

**状态**: ✅ 完成 (2026-03-17)

### 新增功能
- 任务依赖图 (DAG)
- 多模型路由 (claude/glm/deepseek)
- 增量开发 (只改改动的文件)

### DAG 示例
```typescript
const dag = new TaskDAG();
dag.add('screenshot', { agent: 'claude' });
dag.add('input', { agent: 'claude' });
dag.add('server', { agent: 'glm', deps: ['screenshot', 'input'] });
dag.add('test', { agent: 'claude', deps: ['server'] });

await dag.execute();
```

### 时间
**2 周** (2026-04-01 ~ 2026-04-14)

---

## Phase 4: mission-control v0.1 (Alpha)

**目标**：数字员工管理基础功能

### 核心功能
- Workspace 管理 (部门)
- Agent 配置 (员工档案)
- 简单任务分配

### 目录结构
```
mission-control/
├── src/
│   ├── index.ts
│   ├── workspace.ts       # 部门管理
│   ├── agent.ts           # 员工管理
│   └── task.ts            # 任务分配
├── templates/
│   ├── WORKSPACE.md
│   └── AGENT.md
└── package.json
```

### 集成 agentdev
```typescript
import { AgentDev } from 'agentdev';

class Workspace {
  async assign(task: string, options: AssignOptions) {
    return AgentDev.parallelDev([
      { agent: 'claude', task, files: options.files }
    ]);
  }
}
```

### 时间
**2 周** (2026-04-15 ~ 2026-04-28)

---

## Phase 5: mission-control v0.2 (监控 + 成本)

**目标**：绩效考核 + 成本控制

### 新增功能
- Agent 绩效统计 (完成率、质量分)
- Token 消耗统计
- 负载均衡

### 示例
```typescript
// 查看 agent 绩效
const report = await missionControl.performance('claude-1');
console.log(report);
// {
//   tasksCompleted: 45,
//   successRate: 0.92,
//   avgQuality: 8.5,
//   tokensUsed: 125000
// }

// 负载均衡分配任务
const agent = await missionControl.pickAgent({
  skill: 'frontend',
  workload: 'low'  // 选最空闲的
});
```

### 时间
**2 周** (2026-04-29 ~ 2026-05-12)

---

## 里程碑总览

| 版本 | 功能 | 时间 | 状态 |
|------|------|------|------|
| **agentdev v0.1** | 并行开发 + 审查 + 修复 | 1周 | ✅ 完成 |
| **agentdev v0.2** | 队列 + Worker池 + 重试 + OpenClaw集成 | 1周 | ✅ 完成 |
| **agentdev v0.3** | DAG + 多模型 | 2周 | ✅ 完成 |
| **mission-control v0.1** | Workspace + Agent管理 | 2周 | ✅ 完成 |
| **mission-control v0.2** | 绩效 + 成本 + 2周 | ✅ 完成 |

**总计**：8 周 (约 2 个月)

**总计**：8 周 (约 2 个月)

---

## Phase 1 详细任务 (本周)

### Day 1-2: 核心类实现
```typescript
// 1. Task 类型定义
interface Task {
  id: string;
  agent: string;
  task: string;
  files: string[];
}

// 2. Coordinator 协调器
class Coordinator {
  async parallel(tasks: Task[]): Promise<Result[]>
  async review(results: Result[]): Promise<Issue[]>
  async fix(issues: Issue[]): Promise<void>
}
```

### Day 3: 集成 OpenClaw
```typescript
// 调用 sessions_spawn
import { sessions_spawn } from 'openclaw';

async function spawnAgent(task: Task) {
  return sessions_spawn({
    runtime: 'acp',
    agentId: task.agent,
    task: task.task,
  });
}
```

### Day 4-5: 测试 + Demo
```bash
# 测试用例
agentdev test

# Demo: 并行开发 3 个文件
agentdev dev --config demo-tasks.json
```

### Day 6-7: 文档 + 发布
- README 更新
- 使用示例
- npm publish

---

*Last updated: 2026-03-17*
-

*Last updated: 2026-03-17*
17*
-

*Last updated: 2026-03-17*
