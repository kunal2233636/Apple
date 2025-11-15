// R2 File Cache Implementation
// =============================
// In-memory cache for R2 file contents with TTL and size limits

interface FileCacheEntry {
  content: string;
  metadata: {
    size: number;
    lastModified: string;
  };
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface FileCacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  totalBytes: number;
  maxBytes: number;
  hitRate: number;
}

export class R2FileCache {
  private cache: Map<string, FileCacheEntry> = new Map();
  private maxSize: number;
  private maxBytes: number;
  private ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;
  private totalBytes: number = 0;

  constructor(
    maxSize: number = 500,
    maxMegabytes: number = 50,
    ttlMinutes: number = 30
  ) {
    this.maxSize = maxSize;
    this.maxBytes = maxMegabytes * 1024 * 1024; // Convert MB to bytes
    this.ttlMs = ttlMinutes * 60 * 1000;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get file content from cache
   */
  get(path: string): { content: string; metadata: any } | null {
    const entry = this.cache.get(path);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.removeEntry(path);
      this.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hits++;

    return {
      content: entry.content,
      metadata: entry.metadata
    };
  }

  /**
   * Store file content in cache
   */
  set(
    path: string,
    content: string,
    metadata: { size: number; lastModified: string }
  ): void {
    const contentSize = Buffer.byteLength(content, 'utf8');

    // Check if content is too large for cache
    if (contentSize > this.maxBytes * 0.5) {
      // Don't cache files larger than 50% of max cache size
      return;
    }

    // Evict entries if needed to make space
    while (
      (this.cache.size >= this.maxSize || 
       this.totalBytes + contentSize > this.maxBytes) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    const now = Date.now();

    // Remove old entry if exists
    if (this.cache.has(path)) {
      this.removeEntry(path);
    }

    this.cache.set(path, {
      content,
      metadata,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now
    });

    this.totalBytes += contentSize;
  }

  /**
   * Remove entry and update byte count
   */
  private removeEntry(path: string): void {
    const entry = this.cache.get(path);
    if (entry) {
      const contentSize = Buffer.byteLength(entry.content, 'utf8');
      this.totalBytes -= contentSize;
      this.cache.delete(path);
    }
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
      this.removeEntry(oldestKey);
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

    keysToDelete.forEach(key => this.removeEntry(key));
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    // Run cleanup every 10 minutes
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * Get cache statistics
   */
  getStats(): FileCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      totalBytes: this.totalBytes,
      maxBytes: this.maxBytes,
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
    this.totalBytes = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Invalidate specific file
   */
  invalidate(path: string): void {
    this.removeEntry(path);
  }

  /**
   * Invalidate files matching pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.removeEntry(key));
  }
}

// Export singleton instance
export const r2FileCache = new R2FileCache(500, 50, 30);
