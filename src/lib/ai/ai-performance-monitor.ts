'use server';

import { aiDataService } from './ai-data-centralization';

interface PerformanceMetric {
  queryType: string;
  duration: number;
  timestamp: number;
  success: boolean;
  cacheHit: boolean;
  dataSize?: number;
}

interface OptimizationSuggestion {
  type: 'cache' | 'query' | 'data_structure' | 'frequency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  impact: string;
}

export class AIPerformanceMonitor {
  private static instance: AIPerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly ALERT_THRESHOLDS = {
    slowQuery: 2000, // 2 seconds
    highErrorRate: 10, // 10% error rate
    lowCacheHit: 70, // 70% cache hit rate
    frequentQueries: 10 // queries per minute
  };

  static getInstance(): AIPerformanceMonitor {
    if (!AIPerformanceMonitor.instance) {
      AIPerformanceMonitor.instance = new AIPerformanceMonitor();
    }
    return AIPerformanceMonitor.instance;
  }

  /**
   * Record performance metric for AI data operations
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Check for alerts
    this.checkForAlerts(fullMetric);
  }

  /**
   * Monitor AI data service operations with automatic timing
   */
  async monitorOperation<T>(
    operation: () => Promise<T>,
    queryType: string,
    cacheKey?: string
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    let cacheHit = false;
    let dataSize = 0;

    try {
      // Check if result is cached (if cacheKey provided)
      if (cacheKey) {
        const cacheCheck = aiDataService.checkCache?.(cacheKey);
        cacheHit = cacheCheck?.exists && !cacheCheck.expired;
      }

      const result = await operation();
      success = true;

      // Estimate data size
      if (result && typeof result === 'object') {
        dataSize = JSON.stringify(result).length;
      }

      return result;
    } finally {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        queryType,
        duration,
        success,
        cacheHit,
        dataSize
      });
    }
  }

  /**
   * Get performance analytics for the last 24 hours
   */
  getPerformanceAnalytics(timeRange: '1h' | '24h' | '7d' = '24h'): {
    totalQueries: number;
    averageDuration: number;
    cacheHitRate: number;
    errorRate: number;
    slowQueries: number;
    topQueryTypes: { type: string; count: number; avgDuration: number }[];
    recommendations: OptimizationSuggestion[];
  } {
    const cutoffTime = this.getCutoffTime(timeRange);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        errorRate: 0,
        slowQueries: 0,
        topQueryTypes: [],
        recommendations: []
      };
    }

    const totalQueries = recentMetrics.length;
    const successfulQueries = recentMetrics.filter(m => m.success);
    const cacheHits = recentMetrics.filter(m => m.cacheHit);
    const slowQueries = recentMetrics.filter(m => m.duration > this.ALERT_THRESHOLDS.slowQuery);

    const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const cacheHitRate = (cacheHits.length / totalQueries) * 100;
    const errorRate = ((totalQueries - successfulQueries.length) / totalQueries) * 100;

    // Top query types analysis
    const queryTypeStats = new Map<string, { count: number; totalDuration: number }>();
    recentMetrics.forEach(m => {
      const existing = queryTypeStats.get(m.queryType) || { count: 0, totalDuration: 0 };
      queryTypeStats.set(m.queryType, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + m.duration
      });
    });

    const topQueryTypes = Array.from(queryTypeStats.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration),
      cacheHitRate: Math.round(cacheHitRate),
      errorRate: Math.round(errorRate),
      slowQueries: slowQueries.length,
      topQueryTypes,
      recommendations: this.generateRecommendations(recentMetrics)
    };
  }

  /**
   * Get query performance trends
   */
  getQueryTrends(timeRange: '1h' | '24h' | '7d' = '24h'): {
    timestamps: number[];
    durations: number[];
    cacheHitRates: number[];
    errorRates: number[];
  } {
    const cutoffTime = this.getCutoffTime(timeRange);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    // Group by 15-minute intervals
    const intervals = new Map<number, PerformanceMetric[]>();
    recentMetrics.forEach(m => {
      const interval = Math.floor(m.timestamp / (15 * 60 * 1000)) * (15 * 60 * 1000);
      const existing = intervals.get(interval) || [];
      existing.push(m);
      intervals.set(interval, existing);
    });

    const sortedIntervals = Array.from(intervals.keys()).sort();
    
    return {
      timestamps: sortedIntervals,
      durations: sortedIntervals.map(ts => {
        const metrics = intervals.get(ts) || [];
        return metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length : 0;
      }),
      cacheHitRates: sortedIntervals.map(ts => {
        const metrics = intervals.get(ts) || [];
        const cacheHits = metrics.filter(m => m.cacheHit).length;
        return metrics.length > 0 ? (cacheHits / metrics.length) * 100 : 0;
      }),
      errorRates: sortedIntervals.map(ts => {
        const metrics = intervals.get(ts) || [];
        const errors = metrics.filter(m => !m.success).length;
        return metrics.length > 0 ? (errors / metrics.length) * 100 : 0;
      })
    };
  }

  /**
   * Generate optimization suggestions based on metrics
   */
  private generateRecommendations(metrics: PerformanceMetric[]): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = [];

    if (metrics.length === 0) return recommendations;

    const cacheHitRate = (metrics.filter(m => m.cacheHit).length / metrics.length) * 100;
    const errorRate = ((metrics.length - metrics.filter(m => m.success).length) / metrics.length) * 100;
    const averageDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const slowQueries = metrics.filter(m => m.duration > this.ALERT_THRESHOLDS.slowQuery);

    // Cache optimization
    if (cacheHitRate < this.ALERT_THRESHOLDS.lowCacheHit) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        description: `Low cache hit rate: ${cacheHitRate.toFixed(1)}%`,
        suggestion: 'Increase cache TTL or implement cache warming strategies',
        impact: 'Could improve response times by 40-60%'
      });
    }

    // Query optimization
    if (averageDuration > 1000) {
      recommendations.push({
        type: 'query',
        priority: 'high',
        description: `Slow average query time: ${averageDuration.toFixed(0)}ms`,
        suggestion: 'Optimize database queries and implement database views',
        impact: 'Could reduce query time by 30-50%'
      });
    }

    // Error rate optimization
    if (errorRate > this.ALERT_THRESHOLDS.highErrorRate) {
      recommendations.push({
        type: 'query',
        priority: 'critical',
        description: `High error rate: ${errorRate.toFixed(1)}%`,
        suggestion: 'Review error handling and implement better fallback mechanisms',
        impact: 'Will improve system reliability significantly'
      });
    }

    // Data structure optimization
    if (slowQueries.length > metrics.length * 0.1) {
      recommendations.push({
        type: 'data_structure',
        priority: 'medium',
        description: `${slowQueries.length} slow queries detected`,
        suggestion: 'Consider denormalizing frequently accessed data or using materialized views',
        impact: 'Could improve performance for complex queries'
      });
    }

    // Query frequency optimization
    const recentQueries = metrics.filter(m => Date.now() - m.timestamp < 60000); // Last minute
    if (recentQueries.length > this.ALERT_THRESHOLDS.frequentQueries) {
      recommendations.push({
        type: 'frequency',
        priority: 'medium',
        description: `High query frequency: ${recentQueries.length} queries/minute`,
        suggestion: 'Implement request batching or reduce unnecessary queries',
        impact: 'Could reduce database load and improve scalability'
      });
    }

    return recommendations;
  }

  /**
   * Check for real-time alerts
   */
  private checkForAlerts(metric: PerformanceMetric): void {
    const alerts: string[] = [];

    if (metric.duration > this.ALERT_THRESHOLDS.slowQuery) {
      alerts.push(`SLOW_QUERY: ${metric.queryType} took ${metric.duration.toFixed(0)}ms`);
    }

    if (!metric.success) {
      alerts.push(`QUERY_ERROR: ${metric.queryType} failed`);
    }

    // Check recent error rate
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 300000); // Last 5 minutes
    if (recentMetrics.length >= 5) {
      const recentErrorRate = ((recentMetrics.length - recentMetrics.filter(m => m.success).length) / recentMetrics.length) * 100;
      if (recentErrorRate > this.ALERT_THRESHOLDS.highErrorRate) {
        alerts.push(`HIGH_ERROR_RATE: ${recentErrorRate.toFixed(1)}% in last 5 minutes`);
      }
    }

    if (alerts.length > 0) {
      console.warn('[AIPerformanceMonitor] Performance Alerts:', alerts);
      // In production, you might want to send these to monitoring service
    }
  }

  /**
   * Get cutoff timestamp for time range
   */
  private getCutoffTime(timeRange: '1h' | '24h' | '7d'): number {
    const now = Date.now();
    switch (timeRange) {
      case '1h': return now - (60 * 60 * 1000);
      case '24h': return now - (24 * 60 * 60 * 1000);
      case '7d': return now - (7 * 24 * 60 * 60 * 1000);
      default: return now - (24 * 60 * 60 * 1000);
    }
  }

  /**
   * Clear old metrics to prevent memory buildup
   */
  cleanupOldMetrics(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneWeekAgo);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Export singleton instance
export const aiPerformanceMonitor = AIPerformanceMonitor.getInstance();