/**
 * Self-Iteration Module
 * Enables the framework to learn and improve itself
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import log from 'electron-log';

export interface SessionRecord {
  id: string;
  timestamp: number;
  spec: string;
  tasks: TaskRecord[];
  results: ResultRecord[];
  duration: number;
  issues: IssueRecord[];
  success: boolean;
}

export interface TaskRecord {
  id: number;
  task: string;
  files: string[];
  agent: string;
  duration: number;
  success: boolean;
}

export interface ResultRecord {
  taskId: number;
  files: string[];
  linesAdded: number;
  linesRemoved: number;
  testCoverage?: number;
}

export interface IssueRecord {
  severity: 'error' | 'warning' | 'info';
  file: string;
  message: string;
  source: 'review' | 'test' | 'compile';
}

export interface IterationInsight {
  type: 'task_splitting' | 'agent_selection' | 'template' | 'workflow';
  before: string;
  after: string;
  confidence: number;
  evidence: string[];
}

/**
 * SelfIteration - Learn and improve the development framework
 */
export class SelfIteration {
  private dataDir: string;
  private sessions: SessionRecord[] = [];
  private insights: IterationInsight[] = [];

  constructor(dataDir: string = './.agentdev') {
    this.dataDir = dataDir;
  }

  /**
   * Record a development session
   */
  async recordSession(session: SessionRecord): Promise<void> {
    this.sessions.push(session);
    
    // Save to disk
    await this.saveSession(session);
    
    // Analyze for insights
    await this.analyzeSession(session);
    
    log.info(`[SelfIteration] Recorded session ${session.id}, ${this.sessions.length} total`);
  }

  /**
   * Analyze session for improvements
   */
  private async analyzeSession(session: SessionRecord): Promise<void> {
    // 1. Analyze task splitting
    await this.analyzeTaskSplitting(session);
    
    // 2. Analyze agent performance
    await this.analyzeAgentPerformance(session);
    
    // 3. Analyze issues
    await this.analyzeIssues(session);
    
    // 4. Generate insights
    await this.generateInsights();
  }

  /**
   * Analyze task splitting effectiveness
   */
  private async analyzeTaskSplitting(session: SessionRecord): Promise<void> {
    if (!session.success) {
      // Find correlation between task count and failure
      const taskCount = session.tasks.length;
      const avgTaskDuration = session.tasks.reduce((a, t) => a + t.duration, 0) / taskCount;
      
      // Check if tasks were too granular or too coarse
      if (avgTaskDuration < 30000) {
        // Tasks too small - suggest combining
        this.addInsight({
          type: 'task_splitting',
          before: `${taskCount} small tasks`,
          after: `Combine into ${Math.ceil(taskCount / 2)} larger tasks`,
          confidence: 0.7,
          evidence: [
            `Average task duration: ${(avgTaskDuration/1000).toFixed(1)}s`,
            `Total duration: ${(session.duration/1000).toFixed(1)}s`,
          ],
        });
      }
    }

    // Check dependency issues
    const tasksWithDeps = session.tasks.filter(t => t.files.some(f => 
      session.tasks.some(other => 
        other.id !== t.id && 
        other.files.some(of => f.includes(dirname(of)))
      )
    ));

    if (tasksWithDeps.length > 0) {
      this.addInsight({
        type: 'task_splitting',
        before: 'Sequential dependencies detected',
        after: 'Consider using sequential execution for dependent tasks',
        confidence: 0.8,
        evidence: [`${tasksWithDeps.length} tasks have file dependencies`],
      });
    }
  }

  /**
   * Analyze agent performance
   */
  private async analyzeAgentPerformance(session: SessionRecord): Promise<void> {
    const agentStats = new Map<string, { total: number; success: number; avgDuration: number }>();

    for (const task of session.tasks) {
      const stats = agentStats.get(task.agent) || { total: 0, success: 0, avgDuration: 0 };
      stats.total++;
      if (task.success) stats.success++;
      stats.avgDuration = (stats.avgDuration * (stats.total - 1) + task.duration) / stats.total;
      agentStats.set(task.agent, stats);
    }

    // Find best performing agent
    let bestAgent = '';
    let bestScore = 0;

    for (const [agent, stats] of agentStats) {
      const score = (stats.success / stats.total) * 100 - (stats.avgDuration / 1000);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    if (bestAgent) {
      this.addInsight({
        type: 'agent_selection',
        before: 'Equal agent distribution',
        after: `Prefer ${bestAgent} for this task type`,
        confidence: 0.6,
        evidence: [`${bestAgent} has best success/duration ratio`],
      });
    }
  }

  /**
   * Analyze recurring issues
   */
  private async analyzeIssues(session: SessionRecord): Promise<void> {
    const issueTypes = new Map<string, number>();

    for (const issue of session.issues) {
      const count = issueTypes.get(issue.message) || 0;
      issueTypes.set(issue.message, count + 1);
    }

    // Find recurring issues
    for (const [message, count] of issueTypes) {
      if (count >= 2) {
        this.addInsight({
          type: 'template',
          before: 'Issue occurs repeatedly',
          after: `Add checklist item: ${message.substring(0, 50)}`,
          confidence: Math.min(0.9, count * 0.3),
          evidence: [`Issue occurred ${count} times`],
        });
      }
    }
  }

  /**
   * Generate insights from all sessions
   */
  private async generateInsights(): Promise<void> {
    if (this.sessions.length < 3) return;

    // Calculate success rate trend
    const recentSessions = this.sessions.slice(-5);
    const successRate = recentSessions.filter(s => s.success).length / recentSessions.length;

    if (successRate < 0.7) {
      this.addInsight({
        type: 'workflow',
        before: 'Current workflow',
        after: 'Add more detailed SPEC requirements',
        confidence: 0.7,
        evidence: [`Success rate: ${(successRate * 100).toFixed(0)}%`],
      });
    }
  }

  /**
   * Add insight
   */
  private addInsight(insight: IterationInsight): void {
    // Avoid duplicates
    const exists = this.insights.some(i => 
      i.type === insight.type && i.before === insight.before
    );
    
    if (!exists) {
      this.insights.push(insight);
    }
  }

  /**
   * Get recommendations for next session
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    for (const insight of this.insights.slice(-10)) {
      if (insight.confidence > 0.6) {
        recommendations.push(`[${insight.type}] ${insight.after} (${(insight.confidence * 100).toFixed(0)}% confidence)`);
      }
    }

    return recommendations;
  }

  /**
   * Get optimized task split
   */
  getOptimizedTaskSplit(totalTasks: number): number {
    if (this.sessions.length < 3) return totalTasks;

    const avgDuration = this.sessions
      .filter(s => s.success)
      .reduce((a, s) => a + s.duration / s.tasks.length, 0) / 
      this.sessions.filter(s => s.success).length;

    // Target: 30-60 seconds per task
    const targetDuration = 45000; // 45 seconds
    const ratio = targetDuration / avgDuration;

    return Math.max(1, Math.round(totalTasks * ratio));
  }

  /**
   * Save session to disk
   */
  private async saveSession(session: SessionRecord): Promise<void> {
    try {
      const dir = join(this.dataDir, 'sessions');
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${session.id}.json`);
      await writeFile(file, JSON.stringify(session, null, 2));
    } catch (error) {
      log.error('[SelfIteration] Failed to save session:', error);
    }
  }

  /**
   * Load all sessions
   */
  async loadSessions(): Promise<void> {
    try {
      const dir = join(this.dataDir, 'sessions');
      const files = await readdir(dir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await readFile(join(dir, file), 'utf-8');
          this.sessions.push(JSON.parse(content));
        }
      }
      
      log.info(`[SelfIteration] Loaded ${this.sessions.length} sessions`);
    } catch (error) {
      log.info('[SelfIteration] No previous sessions found');
    }
  }

  /**
   * Export insights as improved templates
   */
  async exportImprovedTemplates(): Promise<string> {
    const recommendations = this.getRecommendations();
    
    return `# AgentDev Improved Templates

Generated from ${this.sessions.length} development sessions

## Recommendations

${recommendations.map(r => `- ${r}`).join('\n')}

## Optimized Settings

- Recommended task granularity: ${this.getOptimizedTaskSplit(5)} tasks for typical project
- Agent preference: ${this.insights.filter(i => i.type === 'agent_selection').pop()?.after || 'balanced'}

---
Auto-generated by AgentDev Self-Iteration
`;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number;
    successRate: number;
    avgDuration: number;
    topIssues: string[];
  } {
    const successful = this.sessions.filter(s => s.success).length;
    const avgDuration = this.sessions.reduce((a, s) => a + s.duration, 0) / this.sessions.length;
    
    const issueCounts = new Map<string, number>();
    for (const session of this.sessions) {
      for (const issue of session.issues) {
        const count = issueCounts.get(issue.message) || 0;
        issueCounts.set(issue.message, count + 1);
      }
    }

    const topIssues = Array.from(issueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([msg]) => msg.substring(0, 50));

    return {
      totalSessions: this.sessions.length,
      successRate: this.sessions.length > 0 ? successful / this.sessions.length : 0,
      avgDuration: this.sessions.length > 0 ? avgDuration : 0,
      topIssues,
    };
  }
}
