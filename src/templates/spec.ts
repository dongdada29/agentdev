/**
 * SPEC Template
 */

export const SPEC_TEMPLATE = `
# [模块名] 实现规格

**版本**: v1.0
**日期**: YYYY-MM-DD
**负责人**: [名字]
**状态**: [Draft/In Review/Approved]

---

## 1. 目标

[一句话描述这个模块要做什么]

## 2. 背景

[为什么需要这个模块]

## 3. 技术选型

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| xxx | v1.0 | 原因 |

## 4. 功能列表

- [ ] 功能1
- [ ] 功能2
- [ ] 功能3

## 5. 接口设计

\`\`\`typescript
export interface XxxService {
  method1(): Promise<void>;
  method2(params: Type): Promise<Result>;
}
\`\`\`

## 6. 测试计划

| 测试场景 | 输入 | 预期 |
|----------|------|------|
| 场景1 | xxx | xxx |

## 7. 验收标准

- [ ] 代码编译通过
- [ ] 单元测试通过
- [ ] 覆盖率 > 70%
- [ ] 代码审查通过
`;

export const SPEC_TEMPLATE_MD = `# [模块名] 实现规格

**版本**: v1.0 | **日期**: YYYY-MM-DD | **负责人**: [名字]

## 目标
[一句话描述]

## 功能列表
- [ ] 功能1
- [ ] 功能2

## 验收标准
- [ ] 代码编译通过
- [ ] 单元测试通过
- [ ] 覆盖率 > 70%
`;
