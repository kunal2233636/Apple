// Embedding Cache Implementation
// ================================
// In-memory cache for embedding generation with TTL and LRU eviction

interface CacheEntry {
  embeddings: number[][];
  provider: string;
  model: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 1000, ttlMinutes: number = 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Generate cache key from texts
   */
  private generateKey(texts: string[], provider?: string): string {
    const textKey = texts.join('||');
    const providerKey = provider || 'default';
    return `${providerKey}:${this.hashString(textKey)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get embeddings from cache
   */
  get(texts: string[], provider?: string): number[][] | null {
    const key = this.generateKey(texts, provider);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hits++;

    return entry.embeddings;
  }

  /**
   * Store embeddings in cache
   */
  set(
    texts: string[],
    embeddings: number[][],
    provider: string,
    model: string
  ): void {
    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const key = this.generateKey(texts, provider);
    const now = Date.now();

    this.cache.set(key, {
      embeddings,
      provider,
      model,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const embeddingCache = new EmbeddingCache(1000, 60);
