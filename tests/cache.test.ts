import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache } from '../src/cache.js';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({ maxSize: 3, ttl: 1000 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should delete values', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should clear cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should expire entries after TTL', () => {
    cache.set('key1', 'value1', 500);
    
    expect(cache.get('key1')).toBe('value1');
    
    vi.advanceTimersByTime(600);
    
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should evict LRU when full', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Access key1 to increase hits
    cache.get('key1');
    cache.get('key1');
    
    // Add new key, should evict key2 (least hits)
    cache.set('key4', 'value4');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should track stats', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key1');
    
    const stats = cache.getStats();
    
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(2);
  });

  it('should clean expired entries', () => {
    cache.set('key1', 'value1', 200);
    cache.set('key2', 'value2', 1000);
    
    vi.advanceTimersByTime(500);
    
    const cleaned = cache.clean();
    
    expect(cleaned).toBe(1);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should use custom TTL', () => {
    const customCache = new Cache<string>({ ttl: 500 });
    customCache.set('key1', 'value1');
    
    vi.advanceTimersByTime(600);
    
    expect(customCache.get('key1')).toBeUndefined();
  });
});
