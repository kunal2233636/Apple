// Caching Layer for AI Service Manager
// ====================================

import type { 
  CacheEntry, 
  CacheConfig, 
  ChatType, 
  AIServiceManagerResponse,
  QueryType,
  AIServiceManagerRequest
} from '@/types/ai-service-manager';
import crypto from 'crypto';

export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout;
  private readonly DEFAULT_CLEANUP_INTERVAL = 300000; // 5 minutes

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      ttl: {
        general: 6 * 60 * 60 * 1000, // 6 hours
        study_assistant: 60 * 60 * 1000, // 1 hour
      },
      maxSize: 1000,
      cleanupInterval: this.DEFAULT_CLEANUP_INTERVAL,
      ...config
    };

    this.startCleanup();
  }

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(request: AIServiceManagerRequest): string {
    const { userId, message, conversationId, chatType } = request;
    
    // Create a hash of the first 50 characters of the message to avoid extremely long keys
    const messageHash = crypto
      .createHash('md5')
      .update(message.substring(0, 50))
      .digest('hex');

    // Create a normalized string for the key
    const keyString = `${userId}:${conversationId}:${chatType}:${messageHash}`;
    
    return crypto
      .createHash('sha256')
      .update(keyString)
      .digest('hex');
  }

  /**
   * Get cached response if available and not expired
   */
  get(request: AIServiceManagerRequest): CacheEntry | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    const now = new Date();
    if (now >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    return entry;
  }

  /**
   * Store response in cache
   */
  set(
    request: AIServiceManagerRequest, 
    response: AIServiceManagerResponse
  ): void {
    const key = this.generateCacheKey(request);
    const now = new Date();
    
    // Determine TTL based on chat type
    const ttl = this.config.ttl[request.chatType];
    const expiresAt = new Date(now.getTime() + ttl);

    // Detect query type from the request (simplified)
    const queryType = this.detectQueryType(request.message);

    const entry: CacheEntry = {
      key,
      response: { ...response, cached: true }, // Mark as cached
      timestamp: now,
      expiresAt,
      hits: 0,
      queryType,
      userId: request.userId,
      chatType: request.chatType
    };

    // Check if cache is full and we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldestEntries(10); // Evict 10% of oldest entries
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if a request would result in a cache hit
   */
  has(request: AIServiceManagerRequest): boolean {
    const entry = this.get(request);
    return entry !== null;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    totalEntries: number;
    hitRate: number;
    size: number;
    maxSize: number;
    memoryUsage: number;
    entriesByQueryType: Record<QueryType, number>;
    entriesByChatType: Record<ChatType, number>;
    expiredEntries: number;
  } {
    let totalHits = 0;
    let totalEntries = 0;
    const entriesByQueryType: Record<QueryType, number> = {
      time_sensitive: 0,
      app_data: 0,
      general: 0
    };
    const entriesByChatType: Record<ChatType, number> = {
      general: 0,
      study_assistant: 0
    };
    let expiredCount = 0;

    const now = new Date();
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalEntries++;
      entriesByQueryType[entry.queryType]++;
      entriesByChatType[entry.chatType]++;
      
      if (now >= entry.expiresAt) {
        expiredCount++;
      }
    }

    // Estimate memory usage (simplified)
    const memoryUsage = JSON.stringify(Array.from(this.cache.values())).length * 2; // Rough estimate

    return {
      totalEntries,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage,
      entriesByQueryType,
      entriesByChatType,
      expiredEntries: expiredCount
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific user
   */
  clearUser(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.userId === userId) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear cache for a specific conversation
   */
  clearConversation(conversationId: string): void {
    // Since we can't directly filter by conversationId without storing it,
    // we'll need to find entries that might belong to this conversation
    const keysToDelete: string[] = [];
    
    // Note: This is a limitation - we don't store conversationId in the entry
    // In a production system, you might want to store additional metadata
    for (const [key, entry] of this.cache) {
      // For now, we'll just log that this method needs conversationId to be stored
      if (process.env.NODE_ENV === 'development') {
        console.warn('clearConversation called but conversationId not stored in cache entries');
      }
    }

    return keysToDelete.length;
  }

  /**
   * Invalidate cache entries by query type
   */
  invalidateByQueryType(queryType: QueryType): number {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.queryType === queryType) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Warm up cache with common queries
   */
  async warmup(commonQueries: Array<{
    request: AIServiceManagerRequest;
    response: AIServiceManagerResponse;
  }>): Promise<void> {
    for (const { request, response } of commonQueries) {
      this.set(request, response);
    }
  }

  /**
   * Preload cache for a user (e.g., when they login)
   */
  async preloadUserCache(userId: string, queries: Array<{
    message: string;
    conversationId: string;
    chatType: ChatType;
    response: AIServiceManagerResponse;
  }>): Promise<void> {
    for (const { message, conversationId, chatType, response } of queries) {
      const request: AIServiceManagerRequest = {
        userId,
        message,
        conversationId,
        chatType,
        includeAppData: true
      };
      
      this.set(request, response);
    }
  }

  /**
   * Get cache entries that will expire soon
   */
  getExpiringEntries(minutesAhead: number = 30): CacheEntry[] {
    const cutoffTime = new Date(Date.now() + minutesAhead * 60 * 1000);
    const expiringEntries: CacheEntry[] = [];

    for (const entry of this.cache.values()) {
      if (entry.expiresAt <= cutoffTime) {
        expiringEntries.push(entry);
      }
    }

    return expiringEntries.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }

  /**
   * Remove expired entries manually
   */
  removeExpiredEntries(): number {
    const now = new Date();
    let removedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Evict oldest entries to make space
   */
  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp (oldest first) and hits (lowest first)
    entries.sort((a, b) => {
      const aScore = a[1].timestamp.getTime() + a[1].hits;
      const bScore = b[1].timestamp.getTime() + b[1].hits;
      return aScore - bScore;
    });

    // Remove the oldest entries
    const toRemove = entries.slice(0, count);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Start automatic cleanup process
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Simple query type detection for caching
   */
  private detectQueryType(message: string): QueryType {
    const normalizedMessage = message.toLowerCase();
    
    // Time-sensitive keywords
    const timeKeywords = ['exam date', 'form', 'registration', 'admit card', 'result', 'aaya kya', 'when', 'kab'];
    if (timeKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return 'time_sensitive';
    }
    
    // App data keywords
    const appDataKeywords = ['mera', 'my', 'performance', 'progress', 'weak', 'strong', 'score', 'kaise chal raha'];
    if (appDataKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return 'app_data';
    }
    
    return 'general';
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Stop cleanup and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance with default configuration
export const responseCache = new ResponseCache();

// Export factory function for creating custom cache instances
export function createCustomCache(config: Partial<CacheConfig>): ResponseCache {
  return new ResponseCache(config);
}