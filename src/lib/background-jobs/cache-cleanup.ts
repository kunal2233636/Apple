// Cache Cleanup Job
// ==================

import { responseCache } from '../ai/response-cache';
import type { JobResult } from './scheduler';

interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  memoryUsage: number;
  hitRate: number;
}

interface CacheEntry {
  key: string;
  size: number;
  createdAt: Date;
  expiresAt: Date | null;
  hitCount: number;
}

/**
 * Cache Cleanup Job
 * Purpose: Clean expired cache entries to save space
 * Schedule: Every 6 hours
 */
export async function executeCacheCleanup(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('🧹 Starting cache cleanup job...');

  try {
    // Get cache statistics before cleanup
    const cacheStatsBefore = responseCache.getStatistics();
    console.log(`📊 Cache stats before cleanup:`, cacheStatsBefore);

    // Get all cache entries (this would be implemented based on your cache system)
    const cacheEntries = await getAllCacheEntries();
    const totalEntries = cacheEntries.length;
    
    console.log(`🔍 Found ${totalEntries} cache entries`);

    if (totalEntries === 0) {
      return {
        success: true,
        message: 'Cache cleanup completed - no entries found',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          totalEntries: 0,
          expiredEntries: 0,
          spaceSaved: 0,
          hitRate: cacheStatsBefore.hitRate || 0
        }
      };
    }

    // Find expired entries
    const now = new Date();
    const expiredEntries = cacheEntries.filter(entry => 
      entry.expiresAt && entry.expiresAt < now
    );

    const expiredCount = expiredEntries.length;
    const spaceSaved = expiredEntries.reduce((acc, entry) => acc + entry.size, 0);

    console.log(`⏰ Found ${expiredCount} expired entries (${Math.round(spaceSaved / 1024 / 1024)}MB)`);

    // Clean up expired entries in batches
    const batchSize = 1000;
    let cleanedCount = 0;
    let errors = 0;

    for (let i = 0; i < expiredEntries.length; i += batchSize) {
      const batch = expiredEntries.slice(i, i + batchSize);
      const keys = batch.map(entry => entry.key);

      try {
        // Remove batch from cache (implementation depends on your cache system)
        await removeCacheEntries(keys);
        cleanedCount += batch.length;
        console.log(`✅ Cleaned batch ${Math.floor(i / batchSize) + 1} (${batch.length} entries)`);
      } catch (error) {
        errors++;
        console.error(`❌ Error cleaning batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }

    // Calculate memory usage after cleanup
    const remainingEntries = await getAllCacheEntries();
    const memoryUsageAfter = remainingEntries.reduce((acc, entry) => acc + entry.size, 0);
    const memoryUsageBefore = cacheEntries.reduce((acc, entry) => acc + entry.size, 0);

    // Log cleanup activity
    await logCacheCleanupActivity({
      totalEntries,
      expiredEntries: expiredCount,
      cleanedEntries: cleanedCount,
      errors,
      spaceSaved,
      memoryUsageBefore,
      memoryUsageAfter,
      hitRate: cacheStatsBefore.hitRate || 0
    });

    // Get updated cache statistics
    const cacheStatsAfter = responseCache.getStatistics();

    const executionTime = Date.now() - startTime;
    const successMessage = `Cleared ${cleanedCount} expired cache entries. Cache size reduced from ${Math.round(memoryUsageBefore / 1024 / 1024)}MB to ${Math.round(memoryUsageAfter / 1024 / 1024)}MB`;

    console.log(`✅ ${successMessage}`);

    return {
      success: errors === 0,
      message: successMessage,
      executionTime,
      timestamp: new Date(),
      data: {
        totalEntries,
        expiredEntries: expiredCount,
        cleanedEntries: cleanedCount,
        errors,
        spaceSaved: Math.round(spaceSaved / 1024 / 1024 * 100) / 100, // MB
        memoryUsageBefore: Math.round(memoryUsageBefore / 1024 / 1024 * 100) / 100, // MB
        memoryUsageAfter: Math.round(memoryUsageAfter / 1024 / 1024 * 100) / 100, // MB
        hitRate: cacheStatsAfter.hitRate || 0,
        reductionPercentage: Math.round((spaceSaved / memoryUsageBefore) * 100)
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Cache cleanup failed:', error);

    await logCacheCleanupActivity({
      totalEntries: 0,
      expiredEntries: 0,
      cleanedEntries: 0,
      errors: 1,
      spaceSaved: 0,
      memoryUsageBefore: 0,
      memoryUsageAfter: 0,
      hitRate: 0,
      errorMessage
    });

    return {
      success: false,
      message: `Cache cleanup failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Get all cache entries (implementation depends on your cache system)
 * This is a placeholder implementation - adapt for your specific cache
 */
async function getAllCacheEntries(): Promise<CacheEntry[]> {
  try {
    // This would depend on your cache implementation
    // For example, if using Redis, you would use redis.keys('*') and redis.get(key)
    // For in-memory cache, you would access the internal cache structure
    
    // Placeholder implementation - return empty array
    // In real implementation, you would:
    // const cacheKeys = await redis.keys('*');
    // const entries = await Promise.all(cacheKeys.map(async key => {
    //   const data = await redis.get(key);
    //   return parseCacheEntry(key, data);
    // }));
    
    return [];

  } catch (error) {
    console.error('Failed to get cache entries:', error);
    return [];
  }
}

/**
 * Remove cache entries (implementation depends on your cache system)
 */
async function removeCacheEntries(keys: string[]): Promise<void> {
  try {
    // This would depend on your cache implementation
    // For Redis: await redis.del(...keys)
    // For in-memory cache: keys.forEach(key => cache.delete(key))
    
    // Placeholder implementation
    console.log(`Removing ${keys.length} cache entries:`, keys.slice(0, 5).join(', '), keys.length > 5 ? '...' : '');
    
    // In real implementation:
    // await redis.del(...keys);
    
  } catch (error) {
    throw new Error(`Failed to remove cache entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse cache entry from raw data (helper function)
 */
function parseCacheEntry(key: string, data: any): CacheEntry | null {
  try {
    if (!data) return null;
    
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    
    return {
      key,
      size: Buffer.byteLength(JSON.stringify(parsed), 'utf8'),
      createdAt: new Date(parsed.createdAt || Date.now()),
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      hitCount: parsed.hitCount || 0
    };
    
  } catch (error) {
    console.warn(`Failed to parse cache entry for key ${key}:`, error);
    return {
      key,
      size: Buffer.byteLength(data || '', 'utf8'),
      createdAt: new Date(),
      expiresAt: null,
      hitCount: 0
    };
  }
}

/**
 * Log cache cleanup activity
 */
async function logCacheCleanupActivity(params: {
  totalEntries: number;
  expiredEntries: number;
  cleanedEntries: number;
  errors: number;
  spaceSaved: number;
  memoryUsageBefore: number;
  memoryUsageAfter: number;
  hitRate: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { totalEntries, expiredEntries, cleanedEntries, errors, spaceSaved, memoryUsageBefore, memoryUsageAfter, hitRate, errorMessage } = params;
    
    const activitySummary = errorMessage
      ? `Cache cleanup failed: ${errorMessage}`
      : `Cache cleanup completed: ${cleanedEntries}/${expiredEntries} expired entries removed, ${Math.round(spaceSaved / 1024 / 1024)}MB freed`;

    const details = {
      totalEntries,
      expiredEntries,
      cleanedEntries,
      errors,
      spaceSaved: Math.round(spaceSaved / 1024 / 1024 * 100) / 100, // MB
      memoryUsageBefore: Math.round(memoryUsageBefore / 1024 / 1024 * 100) / 100, // MB
      memoryUsageAfter: Math.round(memoryUsageAfter / 1024 / 1024 * 100) / 100, // MB
      hitRate,
      reductionPercentage: memoryUsageBefore > 0 ? Math.round((spaceSaved / memoryUsageBefore) * 100) : 0,
      successRate: expiredEntries > 0 ? Math.round((cleanedEntries / expiredEntries) * 100) : 100,
      jobType: 'cache-cleanup',
      executionTime: new Date().toISOString()
    };

    // Note: This would need to be called from a context with access to supabase
    console.log('Cache cleanup activity logged:', activitySummary, details);

  } catch (error) {
    console.error('Failed to log cache cleanup activity:', error);
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStatistics() {
  try {
    const cacheStats = responseCache.getStatistics();
    
    return {
      ...cacheStats,
      lastCleanup: new Date().toISOString(),
      nextCleanup: getNextCleanupTime(),
      recommendations: generateCleanupRecommendations(cacheStats)
    };
  } catch (error) {
    console.error('Failed to get cache statistics:', error);
    return null;
  }
}

/**
 * Generate cleanup recommendations based on cache state
 */
function generateCleanupRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  try {
    if (stats.hitRate && stats.hitRate < 50) {
      recommendations.push('Low cache hit rate - consider increasing TTL or reviewing cache keys');
    }
    
    if (stats.memoryUsage && stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage - consider more frequent cleanup or reducing cache size');
    }
    
    if (stats.entryCount && stats.entryCount > 10000) {
      recommendations.push('Large number of entries - consider increasing cleanup frequency');
    }
    
    return recommendations;
  } catch (error) {
    return ['Unable to generate recommendations'];
  }
}

/**
 * Get next scheduled cleanup time
 */
function getNextCleanupTime(): string {
  const now = new Date();
  const next = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // 6 hours from now
  next.setMinutes(0, 0, 0); // Round to nearest hour
  return next.toISOString();
}

/**
 * Manually trigger cache optimization
 */
export async function optimizeCache(): Promise<{
  success: boolean;
  message: string;
  improvements: any;
}> {
  try {
    console.log('🔧 Starting manual cache optimization...');
    
    const statsBefore = responseCache.getStatistics();
    const entriesBefore = await getAllCacheEntries();
    
    // Remove low-value entries (low hit count, old)
    const lowValueEntries = entriesBefore.filter(entry => 
      entry.hitCount < 2 && (Date.now() - entry.createdAt.getTime()) > (24 * 60 * 60 * 1000) // 24 hours
    );
    
    if (lowValueEntries.length > 0) {
      await removeCacheEntries(lowValueEntries.map(e => e.key));
      console.log(`🗑️ Removed ${lowValueEntries.length} low-value cache entries`);
    }
    
    const statsAfter = responseCache.getStatistics();
    
    return {
      success: true,
      message: `Cache optimized: removed ${lowValueEntries.length} low-value entries`,
      improvements: {
        entriesRemoved: lowValueEntries.length,
        statsBefore,
        statsAfter
      }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Cache optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      improvements: null
    };
  }
}