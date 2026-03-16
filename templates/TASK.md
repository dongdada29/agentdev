# Task Template

## Task Information

- **ID**: `<task-id>`
- **Agent**: `<agent-name>` (e.g., claude, glm)
- **Priority**: `high` | `normal` | `low`
- **Dependencies**: `<comma-separated task ids>`

## Description

Describe what this task should accomplish.

## Files to Modify

- `path/to/file1.ts`
- `path/to/file2.ts`

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass

## Context (Optional)

Any additional context that might help the agent complete this task.

---

## Example

```yaml
id: implement-screenshot
agent: claude
priority: high
deps:
description: Implement screenshot service for GUI automation
files:
  - src/services/screenshot.ts
  - src/types/screenshot.ts
criteria:
  - Take screenshots of specified regions
  - Support multiple display monitors
  - Handle errors gracefully
```
