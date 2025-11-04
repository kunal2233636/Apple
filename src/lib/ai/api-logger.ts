// API Usage Logging Service for AI Service Manager
// ===============================================

import type { ApiUsageLog, AIServiceManagerResponse } from '@/types/ai-service-manager';
import type { AIProvider } from '@/types/api-test';
import { supabase } from '@/lib/supabase';

export class ApiUsageLogger {
  private batch: ApiUsageLog[] = [];
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout;
  private enableLogging: boolean = true;

  constructor(options?: {
    batchSize?: number;
    flushInterval?: number;
    enableLogging?: boolean;
  }) {
    this.batchSize = options?.batchSize || 10;
    this.flushInterval = options?.flushInterval || 30000;
    this.enableLogging = options?.enableLogging !== false;

    if (this.enableLogging) {
      this.startBatchFlush();
    }
  }

  /**
   * Log an API usage entry
   */
  async logEntry(params: {
    userId: string;
    featureName: string;
    provider: string;
    modelUsed: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    cached: boolean;
    success: boolean;
    errorMessage?: string;
    queryType?: string;
    tierUsed?: number;
    fallbackUsed?: boolean;
    response?: AIServiceManagerResponse;
  }): Promise<void> {
    const logEntry: ApiUsageLog = {
      user_id: params.userId,
      feature_name: params.featureName,
      provider_used: params.provider,
      model_used: params.modelUsed,
      tokens_input: params.tokensInput,
      tokens_output: params.tokensOutput,
      latency_ms: params.latencyMs,
      cached: params.cached,
      success: params.success,
      error_message: params.errorMessage,
      query_type: params.queryType,
      tier_used: params.tierUsed,
      fallback_used: params.fallbackUsed,
      timestamp: new Date()
    };

    if (!this.enableLogging) {
      return;
    }

    // Add to batch for efficient database insertion
    this.batch.push(logEntry);

    // Flush batch if it's full
    if (this.batch.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  /**
   * Log a successful API call
   */
  async logSuccess(params: {
    userId: string;
    featureName: string;
    provider: AIProvider;
    modelUsed: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    cached: boolean;
    queryType?: string;
    tierUsed?: number;
    fallbackUsed?: boolean;
    response?: AIServiceManagerResponse;
  }): Promise<void> {
    await this.logEntry({
      ...params,
      success: true
    });
  }

  /**
   * Log a failed API call
   */
  async logFailure(params: {
    userId: string;
    featureName: string;
    provider: AIProvider;
    modelUsed: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    cached: boolean;
    errorMessage: string;
    queryType?: string;
    tierUsed?: number;
    fallbackUsed?: boolean;
  }): Promise<void> {
    await this.logEntry({
      ...params,
      success: false
    });
  }

  /**
   * Log a fallback chain attempt
   */
  async logFallbackAttempt(params: {
    userId: string;
    featureName: string;
    originalProvider: AIProvider;
    fallbackProvider: AIProvider;
    tierUsed: number;
    errorMessage?: string;
    latencyMs: number;
    tokensInput: number;
    tokensOutput: number;
  }): Promise<void> {
    await this.logEntry({
      userId: params.userId,
      featureName: params.featureName,
      provider: `${params.originalProvider}->${params.fallbackProvider}`,
      modelUsed: params.fallbackProvider, // Use fallback provider name
      tokensInput: params.tokensInput,
      tokensOutput: params.tokensOutput,
      latencyMs: params.latencyMs,
      cached: false,
      success: !params.errorMessage,
      errorMessage: params.errorMessage,
      tierUsed: params.tierUsed,
      fallbackUsed: true
    });
  }

  /**
   * Flush current batch to database
   */
  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) {
      return;
    }

    const entriesToFlush = [...this.batch];
    this.batch = [];

    try {
      // Insert batch into database
      const { error } = await supabase
        .from('api_usage_logs')
        .insert(entriesToFlush);

      if (error) {
        console.error('Failed to insert API usage logs:', error);
        
        // Re-add failed entries to batch for retry (but avoid infinite growth)
        if (this.batch.length < 50) {
          this.batch.push(...entriesToFlush);
        }
      } else {
        console.debug(`Successfully logged ${entriesToFlush.length} API usage entries`);
      }
    } catch (error) {
      console.error('Error flushing API usage logs batch:', error);
      
      // Re-add failed entries to batch for retry
      if (this.batch.length < 50) {
        this.batch.push(...entriesToFlush);
      }
    }
  }

  /**
   * Start batch flush timer
   */
  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch();
    }, this.flushInterval);
  }

  /**
   * Manually flush any pending logs
   */
  async flushNow(): Promise<void> {
    await this.flushBatch();
  }

  /**
   * Get API usage statistics for a user
   */
  async getUserStats(userId: string, timeRange: 'day' | 'week' | 'month' = 'week') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const { data, error } = await supabase
      .from('api_usage_logs')
      .select(`
        provider_used,
        model_used,
        tokens_input,
        tokens_output,
        latency_ms,
        cached,
        success,
        query_type,
        tier_used,
        fallback_used,
        timestamp
      `)
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API usage stats: ${error.message}`);
    }

    // Aggregate statistics
    const stats = {
      totalRequests: data.length,
      successfulRequests: data.filter(entry => entry.success).length,
      failedRequests: data.filter(entry => !entry.success).length,
      cachedRequests: data.filter(entry => entry.cached).length,
      fallbackRequests: data.filter(entry => entry.fallback_used).length,
      totalTokens: data.reduce((sum, entry) => sum + entry.tokens_input + entry.tokens_output, 0),
      averageLatency: data.length > 0 
        ? data.reduce((sum, entry) => sum + entry.latency_ms, 0) / data.length 
        : 0,
      byProvider: {} as Record<string, {
        requests: number;
        tokens: number;
        averageLatency: number;
        successRate: number;
      }>,
      byQueryType: {} as Record<string, number>,
      byTier: {} as Record<number, number>
    };

    // Group by provider
    const providerStats: Record<string, any[]> = {};
    for (const entry of data) {
      if (!providerStats[entry.provider_used]) {
        providerStats[entry.provider_used] = [];
      }
      providerStats[entry.provider_used].push(entry);
    }

    for (const [provider, entries] of Object.entries(providerStats)) {
      stats.byProvider[provider] = {
        requests: entries.length,
        tokens: entries.reduce((sum, entry) => sum + entry.tokens_input + entry.tokens_output, 0),
        averageLatency: entries.reduce((sum, entry) => sum + entry.latency_ms, 0) / entries.length,
        successRate: entries.filter(entry => entry.success).length / entries.length * 100
      };
    }

    // Group by query type
    for (const entry of data) {
      if (entry.query_type) {
        stats.byQueryType[entry.query_type] = (stats.byQueryType[entry.query_type] || 0) + 1;
      }
    }

    // Group by tier
    for (const entry of data) {
      if (entry.tier_used) {
        stats.byTier[entry.tier_used] = (stats.byTier[entry.tier_used] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Get system-wide API usage statistics
   */
  async getSystemStats(timeRange: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const { data, error } = await supabase
      .from('api_usage_logs')
      .select(`
        user_id,
        provider_used,
        model_used,
        tokens_input,
        tokens_output,
        latency_ms,
        cached,
        success,
        query_type,
        tier_used,
        fallback_used,
        timestamp
      `)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10000); // Limit to prevent memory issues

    if (error) {
      throw new Error(`Failed to fetch system API usage stats: ${error.message}`);
    }

    // Aggregate system statistics
    const stats = {
      totalRequests: data.length,
      uniqueUsers: new Set(data.map(entry => entry.user_id)).size,
      successfulRequests: data.filter(entry => entry.success).length,
      failedRequests: data.filter(entry => !entry.success).length,
      cachedRequests: data.filter(entry => entry.cached).length,
      fallbackRequests: data.filter(entry => entry.fallback_used).length,
      totalTokens: data.reduce((sum, entry) => sum + entry.tokens_input + entry.tokens_output, 0),
      averageLatency: data.length > 0 
        ? data.reduce((sum, entry) => sum + entry.latency_ms, 0) / data.length 
        : 0,
      requestsPerHour: timeRange === 'day' ? data.length / 24 : 0,
      byProvider: {} as Record<string, number>,
      byQueryType: {} as Record<string, number>,
      hourlyDistribution: {} as Record<string, number>
    };

    // Group by provider
    for (const entry of data) {
      stats.byProvider[entry.provider_used] = (stats.byProvider[entry.provider_used] || 0) + 1;
    }

    // Group by query type
    for (const entry of data) {
      if (entry.query_type) {
        stats.byQueryType[entry.query_type] = (stats.byQueryType[entry.query_type] || 0) + 1;
      }
    }

    // Group by hour for time range analysis
    for (const entry of data) {
      const hour = new Date(entry.timestamp).getHours();
      const hourKey = `${hour}:00`;
      stats.hourlyDistribution[hourKey] = (stats.hourlyDistribution[hourKey] || 0) + 1;
    }

    return stats;
  }

  /**
   * Enable or disable logging
   */
  setLoggingEnabled(enabled: boolean): void {
    this.enableLogging = enabled;
    
    if (enabled && !this.flushTimer) {
      this.startBatchFlush();
    } else if (!enabled && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Update batch configuration
   */
  updateConfig(options: {
    batchSize?: number;
    flushInterval?: number;
  }): void {
    if (options.batchSize) {
      this.batchSize = options.batchSize;
    }
    
    if (options.flushInterval) {
      this.flushInterval = options.flushInterval;
      
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.startBatchFlush();
      }
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush any remaining entries
    await this.flushBatch();
  }
}

// Export singleton instance
export const apiUsageLogger = new ApiUsageLogger();