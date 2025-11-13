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
      endpoint: this.inferEndpointFromFeature(params.featureName),
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
   * Convert user ID to proper UUID using database function
   */
  private async convertUserIdToUUID(userId: string): Promise<string> {
    try {
      // First try the enhanced function
      const { data, error } = await supabase
        .rpc('get_user_uuid', { p_user_id_input: userId });

      if (error) {
        console.warn('Failed to convert user ID to UUID, using fallback mapping:', error);
        return this.getFallbackUUIDMapping(userId);
      }

      return data;
    } catch (error) {
      console.warn('Exception converting user ID to UUID:', error);
      return this.getFallbackUUIDMapping(userId);
    }
  }

  /**
   * Fallback UUID mapping for system users
   */
  private getFallbackUUIDMapping(userId: string): string {
    const mappings: Record<string, string> = {
      'test-user': '550e8400-e29b-41d4-a716-446655440000',
      'anonymous-user': '550e8400-e29b-41d4-a716-446655440001',
      'system-background-jobs': '550e8400-e29b-41d4-a716-446655440002',
      'diagnostic-test-user': '550e8400-e29b-41d4-a716-446655440003'
    };

    if (mappings[userId]) {
      return mappings[userId];
    }

    // Check if it's already a valid UUID
    if (userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return userId;
    }

    // Generate a deterministic UUID for unknown user IDs
    return '550e8400-e29b-41d4-a716-44665544' + this.padWithZeros(Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)).toString(16), 4);
  }

  /**
   * Helper function to pad with zeros
   */
  private padWithZeros(str: string, length: number): string {
    return str.padStart(length, '0');
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
      // Convert user IDs to UUIDs and add endpoint information
      const processedEntries = [];
      for (const entry of entriesToFlush) {
        const processedEntry = {
          ...entry,
          user_id: await this.convertUserIdToUUID(entry.user_id),
          endpoint: entry.endpoint || this.inferEndpointFromFeature(entry.feature_name)
        };
        processedEntries.push(processedEntry);
      }

      // Try to use the enhanced logging function for individual entries
      let success = true;
      for (const entry of processedEntries) {
        try {
          const { error } = await supabase
            .rpc('log_api_usage_enhanced', {
              p_user_id_input: entry.user_id,
              p_feature_name: entry.feature_name,
              p_provider_used: entry.provider_used,
              p_model_used: entry.model_used,
              p_tokens_input: entry.tokens_input,
              p_tokens_output: entry.tokens_output,
              p_latency_ms: entry.latency_ms,
              p_success: entry.success,
              p_error_message: entry.error_message,
              p_query_type: entry.query_type,
              p_endpoint: entry.endpoint,
              p_tier_used: entry.tier_used,
              p_fallback_used: entry.fallback_used
            });

          if (error) {
            console.warn('Failed to log individual entry, trying batch insert:', error);
            success = false;
            break;
          }
        } catch (error) {
          console.warn('Error logging individual entry:', error);
          success = false;
          break;
        }
      }

      // If individual logging failed, try batch insert
      if (!success) {
        const { error } = await supabase
          .from('api_usage_logs')
          .insert(processedEntries);

        if (error) {
          console.error('Failed to insert API usage logs (batch):', error);
          
          // Re-add failed entries to batch for retry (but avoid infinite growth)
          if (this.batch.length < 50) {
            this.batch.push(...entriesToFlush);
          }
        } else {
          console.debug(`Successfully logged ${processedEntries.length} API usage entries (batch)`);
        }
      } else {
        console.debug(`Successfully logged ${processedEntries.length} API usage entries (individual)`);
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
   * Infer endpoint from feature name
   */
  private inferEndpointFromFeature(featureName: string): string {
    const featureToEndpoint: Record<string, string> = {
      'chat': '/api/chat/general',
      'ai_chat': '/api/chat/general',
      'study_buddy': '/api/ai/chat',
      'semantic_search': '/api/ai/semantic-search',
      'memory_storage': '/api/ai/memory-storage',
      'embeddings': '/api/ai/embeddings',
      'suggestions': '/api/suggestions',
      'user_settings': '/api/user/settings',
      'google_drive': '/api/google-drive',
      'diagnostic': '/api/test-debug'
    };

    return featureToEndpoint[featureName] || '/api/chat/general';
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