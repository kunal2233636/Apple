// Study Buddy Specific Caching System
// ==================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface StudyBuddyCacheStats {
  totalEntries: number;
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  memoryUsage: string;
  oldestEntry: number;
  newestEntry: number;
}

interface StudyBuddyCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  namespace?: string; // Cache namespace for isolation
}

/**
 * Study Buddy Specific Caching System
 * Shorter TTL (1 hour) compared to general chat (6 hours)
 * because student data changes frequently
 */
export class StudyBuddyCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    totalEntries: 0
  };
  
  private readonly defaultTTL = 60 * 60 * 1000; // 1 hour
  private readonly maxSize = 500; // Maximum entries
  private readonly namespace = 'study_buddy';
  private readonly minSimilarityThreshold = 0.7;

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++;
    
    const cacheKey = this.getCacheKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.stats.totalEntries = this.cache.size;
      return null;
    }

    this.stats.cacheHits++;
    return entry.data;
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, options?: StudyBuddyCacheOptions): void {
    const cacheKey = this.getCacheKey(key);
    const ttl = options?.ttl || this.defaultTTL;
    
    // Remove oldest entry if at max size
    if (this.cache.size >= (options?.maxSize || this.maxSize)) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
      key: cacheKey
    });

    this.stats.totalEntries = this.cache.size;
  }

  /**
   * Check if data is cached (without accessing it)
   */
  has(key: string): boolean {
    const cacheKey = this.getCacheKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.stats.totalEntries = this.cache.size;
      return false;
    }

    return true;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const cacheKey = this.getCacheKey(key);
    const deleted = this.cache.delete(cacheKey);
    this.stats.totalEntries = this.cache.size;
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalEntries = 0;
  }

  /**
   * Generate cache key for Study Buddy requests
   */
  generateCacheKey(params: {
    userId: string;
    message: string;
    contextLevel?: 1 | 2 | 3 | 4;
    isPersonalQuery?: boolean;
    includeMemories?: boolean;
  }): string {
    const { userId, message, contextLevel = 1, isPersonalQuery = true, includeMemories = false } = params;
    
    // Use first 50 characters of message for cache key
    const messageHash = this.hashString(message.substring(0, 50));
    
    const keyComponents = [
      this.namespace,
      userId,
      messageHash,
      contextLevel.toString(),
      isPersonalQuery ? 'personal' : 'general',
      includeMemories ? 'with_memories' : 'no_memories'
    ];

    return keyComponents.join(':');
  }

  /**
   * Cache student context data
   */
  cacheStudentContext(userId: string, contextLevel: 1 | 2 | 3 | 4, contextData: any): void {
    const key = `context:${userId}:level:${contextLevel}`;
    this.set(key, contextData, { ttl: this.defaultTTL });
  }

  /**
   * Get cached student context
   */
  getCachedStudentContext(userId: string, contextLevel: 1 | 2 | 3 | 4): any | null {
    const key = `context:${userId}:level:${contextLevel}`;
    return this.get(key);
  }

  /**
   * Cache semantic search results
   */
  cacheSearchResults(queryHash: string, userId: string, searchResults: any): void {
    const key = `search:${userId}:${queryHash}`;
    this.set(key, searchResults, { ttl: this.defaultTTL });
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults(queryHash: string, userId: string): any | null {
    const key = `search:${userId}:${queryHash}`;
    return this.get(key);
  }

  /**
   * Cache AI response for Study Buddy
   */
  cacheAIResponse(cacheKey: string, response: any): void {
    this.set(cacheKey, response, { ttl: this.defaultTTL });
  }

  /**
   * Get cached AI response
   */
  getCachedAIResponse(cacheKey: string): any | null {
    return this.get(cacheKey);
  }

  /**
   * Cache memory extraction results
   */
  cacheMemoryExtraction(conversationId: string, extractionResults: any): void {
    const key = `memory_extraction:${conversationId}`;
    this.set(key, extractionResults, { ttl: this.defaultTTL });
  }

  /**
   * Get cached memory extraction
   */
  getCachedMemoryExtraction(conversationId: string): any | null {
    const key = `memory_extraction:${conversationId}`;
    return this.get(key);
  }

  /**
   * Check if cache key exists and is valid
   */
  isValid(cacheKey: string): boolean {
    return this.has(cacheKey);
  }

  /**
   * Get cache statistics
   */
  getStatistics(): StudyBuddyCacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(entry => entry.timestamp);
    
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      memoryUsage += JSON.stringify(entry).length;
    }
    
    return {
      totalEntries: this.cache.size,
      hitRate: this.stats.totalRequests > 0 ? (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0,
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits,
      memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    this.stats.totalEntries = this.cache.size;
    return cleanedCount;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if cache is near capacity
   */
  isNearCapacity(): boolean {
    return this.cache.size >= (this.maxSize * 0.9); // 90% capacity
  }

  /**
   * Pre-warm cache with common queries
   */
  preWarmCache(userId: string): void {
    const commonQueries = [
      'How am I doing?',
      'What should I focus on?',
      'My weak areas?',
      'Study schedule?',
      'Performance analysis?'
    ];

    commonQueries.forEach(query => {
      const cacheKey = this.generateCacheKey({
        userId,
        message: query,
        contextLevel: 2,
        isPersonalQuery: true
      });
      
      // Only cache if not already cached
      if (!this.has(cacheKey)) {
        this.set(cacheKey, { placeholder: true }, { ttl: this.defaultTTL });
      }
    });
  }

  /**
   * Invalidate cache when major activity completes
   */
  invalidateUserCache(userId: string): number {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      if (this.cache.delete(key)) {
        invalidatedCount++;
      }
    });
    
    this.stats.totalEntries = this.cache.size;
    return invalidatedCount;
  }

  /**
   * Get cache entries for debugging
   */
  getDebugInfo(): Array<{
    key: string;
    age: number;
    ttl: number;
    size: number;
    expired: boolean;
  }> {
    const now = Date.now();
    const debugInfo: Array<{
      key: string;
      age: number;
      ttl: number;
      size: number;
      expired: boolean;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      debugInfo.push({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl,
        size: JSON.stringify(entry.data).length,
        expired: now - entry.timestamp > entry.ttl
      });
    }

    return debugInfo.sort((a, b) => b.age - a.age);
  }

  private getCacheKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Export singleton instance
export const studyBuddyCache = new StudyBuddyCache();

// Convenience functions
export const cacheStudyBuddyResponse = (key: string, response: any) => 
  studyBuddyCache.cacheAIResponse(key, response);

export const getCachedStudyBuddyResponse = (key: string) => 
  studyBuddyCache.getCachedAIResponse(key);

export const generateStudyBuddyCacheKey = (params: {
  userId: string;
  message: string;
  contextLevel?: 1 | 2 | 3 | 4;
  isPersonalQuery?: boolean;
}) => studyBuddyCache.generateCacheKey(params);

export const getStudyBuddyCacheStats = () => 
  studyBuddyCache.getStatistics();

export const invalidateStudyBuddyCache = (userId: string) => 
  studyBuddyCache.invalidateUserCache(userId);

// Export for testing
export const StudyBuddyCacheTTL = 60 * 60 * 1000; // 1 hour
export const StudyBuddyCacheMaxSize = 500;