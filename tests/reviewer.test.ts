import { describe, it, expect } from 'vitest';
import { Reviewer } from '../src/reviewer.js';
import type { Result, AgentDevConfig } from '../src/types.js';

const mockConfig: AgentDevConfig = {
  agents: {
    claude: { runtime: 'acp', model: 'claude-sonnet-4' },
  },
};

describe('Reviewer', () => {
  it('should review successful results', async () => {
    const reviewer = new Reviewer(mockConfig);
    const results: Result[] = [
      {
        taskId: 'task-1',
        success: true,
        filesModified: ['test.ts'],
      },
    ];

    const issues = await reviewer.review(results);

    // Successful task should have no issues
    expect(issues).toHaveLength(0);
  });

  it('should detect failed tasks', async () => {
    const reviewer = new Reviewer(mockConfig);
    const results: Result[] = [
      {
        taskId: 'task-1',
        success: false,
        output: 'Error: Something went wrong',
        filesModified: ['test.ts'],
      },
    ];

    const issues = await reviewer.review(results);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('error');
    expect(issues[0].message).toContain('Error');
  });

  it('should filter issues by type', () => {
    const reviewer = new Reviewer(mockConfig);

    const issues = [
      { id: '1', taskId: 't1', type: 'error' as const, file: 'a.ts', message: 'err' },
      { id: '2', taskId: 't2', type: 'warning' as const, file: 'b.ts', message: 'warn' },
      { id: '3', taskId: 't3', type: 'error' as const, file: 'c.ts', message: 'err2' },
    ];

    const errors = reviewer.filterByType(issues, 'error');
    const warnings = reviewer.filterByType(issues, 'warning');

    expect(errors).toHaveLength(2);
    expect(warnings).toHaveLength(1);
  });

  it('should group issues by file', () => {
    const reviewer = new Reviewer(mockConfig);

    const issues = [
      { id: '1', taskId: 't1', type: 'error' as const, file: 'a.ts', message: 'err' },
      { id: '2', taskId: 't2', type: 'warning' as const, file: 'a.ts', message: 'warn' },
      { id: '3', taskId: 't3', type: 'error' as const, file: 'b.ts', message: 'err2' },
    ];

    const grouped = reviewer.groupByFile(issues);

    expect(grouped.size).toBe(2);
    expect(grouped.get('a.ts')).toHaveLength(2);
    expect(grouped.get('b.ts')).toHaveLength(1);
  });

  it('should detect critical issues', () => {
    const reviewer = new Reviewer(mockConfig);

    const issues = [
      { id: '1', taskId: 't1', type: 'warning' as const, file: 'a.ts', message: 'warn' },
      { id: '2', taskId: 't2', type: 'error' as const, file: 'b.ts', message: 'err' },
    ];

    expect(reviewer.hasCriticalIssues(issues)).toBe(true);

    const noErrors = [
      { id: '1', taskId: 't1', type: 'warning' as const, file: 'a.ts', message: 'warn' },
    ];
    expect(reviewer.hasCriticalIssues(noErrors)).toBe(false);
  });
});
