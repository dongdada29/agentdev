/**
 * Nightly Build
 * Automated build, test, and report system
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';
import { Metrics } from './metrics.js';
import { SelfIteration } from './selfIteration.js';

const execAsync = promisify(exec);

export interface BuildConfig {
  projectPath: string;
  branch?: string;
  schedule?: string; // cron expression
  steps: BuildStep[];
  notify?: NotifyConfig;
}

export interface BuildStep {
  name: string;
  command: string;
  timeout?: number;
  continueOnError?: boolean;
}

export interface NotifyConfig {
  onSuccess?: string[]; // webhook URLs
  onFailure?: string[]; // webhook URLs
}

export interface BuildResult {
  id: string;
  timestamp: number;
  status: 'success' | 'failed' | 'partial';
  steps: StepResult[];
  duration: number;
  coverage?: number;
  artifacts?: string[];
}

export interface StepResult {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  output?: string;
  error?: string;
}

export interface NightlyReport {
  date: string;
  totalBuilds: number;
  successRate: number;
  avgDuration: number;
  coverageTrend: number[];
  issues: string[];
}

/**
 * NightlyBuild - Automated nightly build system
 */
export class NightlyBuild {
  private config: BuildConfig;
  private metrics: Metrics;
  private selfIter: SelfIteration;
  private buildHistory: BuildResult[] = [];
  private timer?: NodeJS.Timeout;

  constructor(config: BuildConfig) {
    this.config = config;
    this.metrics = new Metrics();
    this.selfIter = new SelfIteration(`${config.projectPath}/.agentdev`);
  }

  /**
   * Run a single build
   */
  async run(): Promise<BuildResult> {
    const buildId = `build_${Date.now()}`;
    const startTime = Date.now();
    
    log.info(`[NightlyBuild] Starting build ${buildId}`);
    this.metrics.increment('builds');

    const result: BuildResult = {
      id: buildId,
      timestamp: startTime,
      status: 'success',
      steps: [],
      duration: 0,
    };

    for (const step of this.config.steps) {
      const stepResult = await this.runStep(step);
      result.steps.push(stepResult);

      if (stepResult.status === 'failed' && !step.continueOnError) {
        result.status = 'failed';
        break;
      }
    }

    // Check partial success
    if (result.status === 'success' && result.steps.some(s => s.status === 'failed')) {
      result.status = 'partial';
    }

    result.duration = Date.now() - startTime;
    result.coverage = await this.getCoverage();

    // Save result
    this.buildHistory.push(result);
    await this.saveResult(result);

    // Notify
    await this.notify(result);

    log.info(`[NightlyBuild] Build ${buildId} completed: ${result.status}`);

    // Record in self-iteration
    await this.selfIter.recordSession({
      id: buildId,
      timestamp: startTime,
      spec: 'Nightly Build',
      tasks: result.steps.map((s, i) => ({
        id: i,
        task: s.name,
        files: [],
        agent: 'system',
        duration: s.duration,
        success: s.status === 'success',
      })),
      results: [],
      duration: result.duration,
      issues: result.steps
        .filter(s => s.status === 'failed')
        .map(s => ({ severity: 'error' as const, file: s.name, message: s.error || 'Failed' })),
      success: result.status === 'success',
    });

    return result;
  }

  /**
   * Run a single step
   */
  private async runStep(step: BuildStep): Promise<StepResult> {
    const startTime = Date.now();
    log.info(`[NightlyBuild] Running step: ${step.name}`);

    try {
      const { stdout, stderr } = await execAsync(step.command, {
        cwd: this.config.projectPath,
        timeout: step.timeout || 300000,
      });

      const duration = Date.now() - startTime;
      this.metrics.increment('steps.success');

      return {
        name: step.name,
        status: 'success',
        duration,
        output: stdout,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.metrics.increment('steps.failed');

      return {
        name: step.name,
        status: 'failed',
        duration,
        error: error.message,
      };
    }
  }

  /**
   * Get test coverage
   */
  private async getCoverage(): Promise<number | undefined> {
    try {
      const { stdout } = await execAsync(
        'npm run test:coverage -- --json 2>/dev/null | grep -oP "coverage.*?\\K\\d+" | tail -1',
        { cwd: this.config.projectPath }
      );
      return parseInt(stdout.trim()) || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Send notifications
   */
  private async notify(result: BuildResult): Promise<void> {
    const urls = result.status === 'success' 
      ? this.config.notify?.onSuccess 
      : this.config.notify?.onFailure;

    if (!urls || urls.length === 0) return;

    const message = this.formatMessage(result);

    for (const url of urls) {
      try {
        await execAsync(`curl -X POST ${url} -d '${JSON.stringify(message)}'`);
        log.info(`[NightlyBuild] Notified: ${url}`);
      } catch (error) {
        log.error(`[NightlyBuild] Notification failed:`, error);
      }
    }
  }

  /**
   * Format notification message
   */
  private formatMessage(result: BuildResult): object {
    const status = result.status === 'success' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
    
    return {
      text: `${status} Nightly Build ${result.id}`,
      attachments: [{
        color: result.status === 'success' ? 'good' : result.status === 'partial' ? 'warning' : 'danger',
        fields: [
          { title: 'Status', value: result.status, short: true },
          { title: 'Duration', value: `${(result.duration / 1000).toFixed(1)}s`, short: true },
          { title: 'Coverage', value: `${result.coverage || 'N/A'}%`, short: true },
        ],
      }],
    };
  }

  /**
   * Save build result
   */
  private async saveResult(result: BuildResult): Promise<void> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join, dirname } = await import('path');
    
    const dir = join(this.config.projectPath, '.agentdev', 'builds');
    await mkdir(dir, { recursive: true });
    
    const file = join(dir, `${result.id}.json`);
    await writeFile(file, JSON.stringify(result, null, 2));
  }

  /**
   * Start nightly build scheduler
   */
  start(): void {
    if (this.timer) {
      log.warn('[NightlyBuild] Already running');
      return;
    }

    // Default: run at 2 AM daily
    const schedule = this.config.schedule || '0 2 * * *';
    log.info(`[NightlyBuild] Scheduled: ${schedule}`);
    
    // Simple interval-based for now (in production, use node-cron)
    this.timer = setInterval(() => {
      this.run().catch(error => {
        log.error('[NightlyBuild] Scheduled build failed:', error);
      });
    }, 24 * 60 * 60 * 1000); // Daily

    log.info('[NightlyBuild] Started nightly scheduler');
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      log.info('[NightlyBuild] Stopped scheduler');
    }
  }

  /**
   * Get nightly report
   */
  async getReport(days: number = 7): Promise<NightlyReport> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentBuilds = this.buildHistory.filter(b => b.timestamp > cutoff);

    const successCount = recentBuilds.filter(b => b.status === 'success').length;
    const avgDuration = recentBuilds.reduce((a, b) => a + b.duration, 0) / recentBuilds.length;
    const coverageTrend = recentBuilds.map(b => b.coverage || 0).filter(c => c > 0);

    // Aggregate issues
    const issues = new Set<string>();
    for (const build of recentBuilds) {
      for (const step of build.steps) {
        if (step.status === 'failed' && step.error) {
          issues.add(step.error.substring(0, 100));
        }
      }
    }

    return {
      date: new Date().toISOString().split('T')[0],
      totalBuilds: recentBuilds.length,
      successRate: recentBuilds.length > 0 ? successCount / recentBuilds.length : 0,
      avgDuration,
      coverageTrend,
      issues: Array.from(issues).slice(0, 10),
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): object {
    return {
      ...this.metrics.getSummary(),
      historySize: this.buildHistory.length,
    };
  }
}

// Default nightly build configuration
export const DEFAULT_BUILD_CONFIG: BuildConfig = {
  projectPath: '.',
  steps: [
    { name: 'install', command: 'npm ci', timeout: 300000 },
    { name: 'lint', command: 'npm run lint', timeout: 120000 },
    { name: 'type-check', command: 'npm run type-check', timeout: 120000 },
    { name: 'test', command: 'npm run test:run', timeout: 300000 },
    { name: 'build', command: 'npm run build', timeout: 300000 },
  ],
};
