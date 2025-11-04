// Rate Limit Tracking System for AI Service Manager
// ================================================

import type { AIProvider } from '@/types/api-test';
import type { RateLimitConfig, RateLimitStatus } from '@/types/ai-service-manager';

interface RateLimitWindow {
  start: Date;
  requests: Date[];
  tokens: number;
}

export class RateLimitTracker {
  private windows: Map<AIProvider, RateLimitWindow> = new Map();
  private configs: Map<AIProvider, RateLimitConfig> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private readonly DEFAULT_CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    this.initializeConfigs();
    this.startCleanup();
  }

  /**
   * Initialize rate limit configurations for all providers
   */
  private initializeConfigs(): void {
    const configs: Array<[AIProvider, RateLimitConfig]> = [
      ['groq', {
        requestsPerMinute: 500,
        windowSize: 60000, // 1 minute
      }],
      ['gemini', {
        requestsPerMinute: 60,
        requestsPerDay: 1500,
        windowSize: 60000, // 1 minute
      }],
      ['cerebras', {
        requestsPerMinute: 500,
        windowSize: 60000,
      }],
      ['mistral', {
        requestsPerMonth: 500,
        windowSize: 30 * 24 * 60 * 60 * 1000, // 30 days
      }],
      ['openrouter', {
        requestsPerHour: 100,
        windowSize: 60 * 60 * 1000, // 1 hour
      }],
      ['cohere', {
        requestsPerMonth: 1000,
        windowSize: 30 * 24 * 60 * 60 * 1000, // 30 days
      }]
    ];

    for (const [provider, config] of configs) {
      this.configs.set(provider, config);
    }
  }

  /**
   * Check if a request would exceed rate limits
   */
  checkRateLimit(provider: AIProvider, estimatedTokens: number = 0): RateLimitStatus {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`No rate limit config found for provider: ${provider}`);
    }

    const window = this.getOrCreateWindow(provider, config);
    const now = new Date();

    // Clean up old requests
    this.cleanupWindow(window, now);

    // Calculate usage for different timeframes
    const minuteRequests = this.countRequestsInWindow(window, now.getTime() - 60000);
    const hourRequests = this.countRequestsInWindow(window, now.getTime() - 3600000);
    const dayRequests = this.countRequestsInWindow(window, now.getTime() - 86400000);
    const monthRequests = this.countRequestsInWindow(window, now.getTime() - 2592000000);

    // Calculate limits and remaining requests
    let limit: number;
    let windowStart: Date;

    if (config.requestsPerMonth) {
      limit = config.requestsPerMonth;
      windowStart = new Date(now.getTime() - 2592000000); // 30 days
    } else if (config.requestsPerDay) {
      limit = config.requestsPerDay;
      windowStart = new Date(now.getTime() - 86400000); // 24 hours
    } else if (config.requestsPerHour) {
      limit = config.requestsPerHour;
      windowStart = new Date(now.getTime() - 3600000); // 1 hour
    } else {
      limit = config.requestsPerMinute;
      windowStart = new Date(now.getTime() - 60000); // 1 minute
    }

    const usage = this.countRequestsInWindow(window, windowStart.getTime());
    const remaining = Math.max(0, limit - usage);

    // Determine status based on usage percentage
    const percentage = (usage / limit) * 100;
    let status: 'healthy' | 'warning' | 'critical' | 'blocked';

    if (percentage >= 100) {
      status = 'blocked';
    } else if (percentage >= 95) {
      status = 'critical';
    } else if (percentage >= 80) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    const resetTime = new Date(windowStart.getTime() + config.windowSize);

    return {
      provider,
      remaining,
      limit,
      resetTime,
      windowStart,
      usage,
      percentage,
      status
    };
  }

  /**
   * Record a request (call this after successful API call)
   */
  recordRequest(provider: AIProvider, tokens: number = 0): void {
    const config = this.configs.get(provider);
    if (!config) return;

    const window = this.getOrCreateWindow(provider, config);
    const now = new Date();

    // Clean up old requests
    this.cleanupWindow(window, now);

    // Add new request
    window.requests.push(now);
    window.tokens += tokens;

    // Log rate limit warnings
    const status = this.checkRateLimit(provider, tokens);
    if (status.status === 'warning') {
      console.warn(`Rate limit warning for ${provider}: ${status.percentage.toFixed(1)}% used`);
    } else if (status.status === 'critical') {
      console.warn(`Rate limit critical for ${provider}: ${status.percentage.toFixed(1)}% used`);
    } else if (status.status === 'blocked') {
      console.error(`Rate limit exceeded for ${provider}: ${status.percentage.toFixed(1)}% used`);
    }
  }

  /**
   * Get rate limit status for all providers
   */
  getAllStatuses(): Map<AIProvider, RateLimitStatus> {
    const statuses = new Map<AIProvider, RateLimitStatus>();
    
    for (const provider of this.configs.keys()) {
      try {
        statuses.set(provider, this.checkRateLimit(provider));
      } catch (error) {
        console.warn(`Failed to get rate limit status for ${provider}:`, error);
      }
    }

    return statuses;
  }

  /**
   * Get providers that are within rate limits
   */
  getAvailableProviders(exclude: AIProvider[] = []): AIProvider[] {
    const available: AIProvider[] = [];

    for (const [provider, config] of this.configs) {
      if (exclude.includes(provider)) continue;

      const status = this.checkRateLimit(provider);
      if (status.status !== 'blocked') {
        available.push(provider);
      }
    }

    return available.sort((a, b) => {
      const statusA = this.checkRateLimit(a);
      const statusB = this.checkRateLimit(b);
      return statusA.percentage - statusB.percentage; // Sort by least usage
    });
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(provider: AIProvider, config: Partial<RateLimitConfig>): void {
    const existing = this.configs.get(provider);
    if (!existing) {
      throw new Error(`No existing config for provider: ${provider}`);
    }

    this.configs.set(provider, { ...existing, ...config });
  }

  /**
   * Reset rate limit tracking for a provider
   */
  resetProvider(provider: AIProvider): void {
    this.windows.delete(provider);
  }

  /**
   * Get or create rate limit window for a provider
   */
  private getOrCreateWindow(provider: AIProvider, config: RateLimitConfig): RateLimitWindow {
    let window = this.windows.get(provider);
    
    if (!window) {
      window = {
        start: new Date(),
        requests: [],
        tokens: 0
      };
      this.windows.set(provider, window);
    }

    return window;
  }

  /**
   * Clean up old requests from a time window
   */
  private cleanupWindow(window: RateLimitWindow, now: Date): void {
    const cutoff = now.getTime() - 2592000000; // 30 days ago

    window.requests = window.requests.filter(req => req.getTime() > cutoff);

    // Recalculate tokens for remaining requests
    window.tokens = 0;
    // Note: We can't recalculate exact tokens without storing them per request
    // This is a simplified implementation
  }

  /**
   * Count requests within a time window
   */
  private countRequestsInWindow(window: RateLimitWindow, cutoffTime: number): number {
    return window.requests.filter(req => req.getTime() > cutoffTime).length;
  }

  /**
   * Start cleanup interval for old windows
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      
      for (const [provider, window] of this.windows) {
        this.cleanupWindow(window, now);
        
        // Remove empty windows older than 24 hours
        if (window.requests.length === 0 && 
            now.getTime() - window.start.getTime() > 86400000) {
          this.windows.delete(provider);
        }
      }
    }, this.DEFAULT_CLEANUP_INTERVAL);
  }

  /**
   * Get rate limit statistics for monitoring
   */
  getStatistics(): {
    totalProviders: number;
    healthyProviders: number;
    warningProviders: number;
    criticalProviders: number;
    blockedProviders: number;
    providerStatuses: Array<{
      provider: AIProvider;
      status: string;
      percentage: number;
      remaining: number;
      limit: number;
    }>;
  } {
    const allStatuses = this.getAllStatuses();
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    let blocked = 0;
    const providerStatuses: Array<{
      provider: AIProvider;
      status: string;
      percentage: number;
      remaining: number;
      limit: number;
    }> = [];

    for (const [provider, status] of allStatuses) {
      providerStatuses.push({
        provider,
        status: status.status,
        percentage: status.percentage,
        remaining: status.remaining,
        limit: status.limit
      });

      switch (status.status) {
        case 'healthy':
          healthy++;
          break;
        case 'warning':
          warning++;
          break;
        case 'critical':
          critical++;
          break;
        case 'blocked':
          blocked++;
          break;
      }
    }

    return {
      totalProviders: allStatuses.size,
      healthyProviders: healthy,
      warningProviders: warning,
      criticalProviders: critical,
      blockedProviders: blocked,
      providerStatuses
    };
  }

  /**
   * Stop cleanup and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.windows.clear();
  }
}

// Export singleton instance
export const rateLimitTracker = new RateLimitTracker();