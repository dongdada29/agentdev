/**
 * Metrics
 * Monitoring and metrics collection
 */

export interface MetricsData {
  requests: number;
  completed: number;
  failed: number;
  avgResponseTime: number;
  avgWaitTime: number;
  cacheHitRate: number;
  concurrency: number;
}

export interface MetricSample {
  timestamp: number;
  value: number;
}

/**
 * Metrics - Monitoring and metrics collection
 */
export class Metrics {
  private samples: Map<string, MetricSample[]> = new Map();
  private counters: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private maxSamples: number = 1000;

  /**
   * Increment counter
   */
  increment(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Decrement counter
   */
  decrement(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, Math.max(0, current - value));
  }

  /**
   * Start timer
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * End timer and record duration
   */
  endTimer(name: string): number {
    const start = this.timers.get(name);
    if (!start) return 0;

    const duration = Date.now() - start;
    this.timers.delete(name);

    // Record sample
    this.record(name, duration);

    return duration;
  }

  /**
   * Record a sample
   */
  record(name: string, value: number): void {
    const samples = this.samples.get(name) || [];
    samples.push({ timestamp: Date.now(), value });

    // Trim if needed
    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    this.samples.set(name, samples);
  }

  /**
   * Get current counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get average value
   */
  getAverage(name: string): number {
    const samples = this.samples.get(name);
    if (!samples || samples.length === 0) return 0;

    const sum = samples.reduce((acc, s) => acc + s.value, 0);
    return sum / samples.length;
  }

  /**
   * Get latest value
   */
  getLatest(name: string): number {
    const samples = this.samples.get(name);
    if (!samples || samples.length === 0) return 0;

    return samples[samples.length - 1].value;
  }

  /**
   * Get metrics summary
   */
  getSummary(): MetricsData {
    const requests = this.getCounter('requests');
    const completed = this.getCounter('completed');
    const failed = this.getCounter('failed');
    const avgResponseTime = this.getAverage('responseTime');
    const avgWaitTime = this.getAverage('waitTime');
    const cacheHitRate = this.getCounter('cacheHits') / Math.max(1, requests);
    const concurrency = this.getLatest('concurrency');

    return {
      requests,
      completed,
      failed,
      avgResponseTime,
      avgWaitTime,
      cacheHitRate,
      concurrency,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.samples.clear();
    this.counters.clear();
    this.timers.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      counters: Object.fromEntries(this.counters),
      summary: this.getSummary(),
      timestamp: Date.now(),
    }, null, 2);
  }
}

// Default instance
export const metrics = new Metrics();
