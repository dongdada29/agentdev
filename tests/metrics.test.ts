import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Metrics, metrics } from '../src/metrics.js';

describe('Metrics', () => {
  let m: Metrics;

  beforeEach(() => {
    m = new Metrics();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should increment counters', () => {
    m.increment('requests');
    m.increment('requests', 5);
    
    expect(m.getCounter('requests')).toBe(6);
  });

  it('should decrement counters', () => {
    m.increment('count', 10);
    m.decrement('count', 3);
    
    expect(m.getCounter('count')).toBe(7);
  });

  it('should not go below zero', () => {
    m.decrement('count', 5);
    
    expect(m.getCounter('count')).toBe(0);
  });

  it('should track timers', () => {
    m.startTimer('operation');
    
    vi.advanceTimersByTime(100);
    
    const duration = m.endTimer('operation');
    
    expect(duration).toBe(100);
  });

  it('should return 0 for unknown timer', () => {
    const duration = m.endTimer('unknown');
    expect(duration).toBe(0);
  });

  it('should record samples', () => {
    m.record('latency', 50);
    m.record('latency', 100);
    m.record('latency', 150);
    
    expect(m.getAverage('latency')).toBe(100);
    expect(m.getLatest('latency')).toBe(150);
  });

  it('should return 0 for empty samples', () => {
    expect(m.getAverage('unknown')).toBe(0);
    expect(m.getLatest('unknown')).toBe(0);
  });

  it('should generate summary', () => {
    m.increment('requests', 10);
    m.increment('completed', 8);
    m.increment('failed', 2);
    m.record('responseTime', 100);
    m.record('responseTime', 200);
    
    const summary = m.getSummary();
    
    expect(summary.requests).toBe(10);
    expect(summary.completed).toBe(8);
    expect(summary.failed).toBe(2);
    expect(summary.avgResponseTime).toBe(150);
  });

  it('should reset metrics', () => {
    m.increment('requests', 10);
    m.record('latency', 100);
    
    m.reset();
    
    expect(m.getCounter('requests')).toBe(0);
    expect(m.getAverage('latency')).toBe(0);
  });

  it('should export metrics as JSON', () => {
    m.increment('requests', 5);
    
    const exported = m.export();
    const parsed = JSON.parse(exported);
    
    expect(parsed.counters.requests).toBe(5);
    expect(parsed.timestamp).toBeDefined();
  });

  it('should limit samples', () => {
    const smallMetrics = new Metrics();
    // Default maxSamples is 1000
    for (let i = 0; i < 1100; i++) {
      smallMetrics.record('test', i);
    }
    
    // Should have trimmed to maxSamples
    const samples = (smallMetrics as any).samples.get('test');
    expect(samples.length).toBeLessThanOrEqual(1000);
  });
});

describe('default metrics instance', () => {
  it('should be usable', () => {
    metrics.increment('test');
    expect(metrics.getCounter('test')).toBeGreaterThanOrEqual(1);
    metrics.reset();
  });
});
