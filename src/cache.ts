/**
 * Cache
 * LRU cache with TTL support
 */

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in ms
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

/**
 * Cache - LRU cache with TTL support
 */
export class Cache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.ttl = options.ttl ?? 30000; // 30s default
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hits
    entry.hits++;
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict if full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.ttl),
      hits: 0,
    });
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; hits: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      hits: totalHits,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  /**
   * Clean expired entries
   */
  clean(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }
}
