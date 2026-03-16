/**
 * Reviewer - Code review and issue detection
 */

import type { Result, Issue, AgentDevConfig } from './types.js';

export class Reviewer {
  private config: AgentDevConfig;

  constructor(config: AgentDevConfig) {
    this.config = config;
  }

  /**
   * Review results and find issues
   */
  async review(results: Result[]): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const result of results) {
      // Basic review checks
      const resultIssues = await this.reviewResult(result);
      issues.push(...resultIssues);
    }

    return issues;
  }

  /**
   * Review a single result
   */
  private async reviewResult(result: Result): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Check if task failed
    if (!result.success) {
      issues.push({
        id: `issue-${result.taskId}-error`,
        taskId: result.taskId,
        type: 'error',
        file: result.filesModified?.[0] || 'unknown',
        message: result.output || 'Task failed without output',
      });
      return issues;
    }

    // TODO: Add more sophisticated review logic
    // - Run linter
    // - Run tests
    // - Check code quality
    // - Security scan

    return issues;
  }

  /**
   * Check if there are critical issues
   */
  hasCriticalIssues(issues: Issue[]): boolean {
    return issues.some(i => i.type === 'error');
  }

  /**
   * Filter issues by type
   */
  filterByType(issues: Issue[], type: Issue['type']): Issue[] {
    return issues.filter(i => i.type === type);
  }

  /**
   * Group issues by file
   */
  groupByFile(issues: Issue[]): Map<string, Issue[]> {
    const grouped = new Map<string, Issue[]>();

    for (const issue of issues) {
      const fileIssues = grouped.get(issue.file) || [];
      fileIssues.push(issue);
      grouped.set(issue.file, fileIssues);
    }

    return grouped;
  }
}
