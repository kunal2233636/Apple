import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { rateLimitTracker } from '@/lib/ai/rate-limit-tracker';
import { apiUsageLogger } from '@/lib/ai/api-logger';
import { MOCK_DASHBOARD_DATA } from '@/types/dashboard';

// GET /api/user/dashboard/stats
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h';

    // Get system statistics from AI service manager
    const systemStats = await aiServiceManager.getStatistics();
    const rateLimitStats = rateLimitTracker.getStatistics();

    // Get user-specific usage statistics
    let userStats;
    try {
      userStats = await apiUsageLogger.getUserStats(user.id, timeRange as 'day' | 'week' | 'month');
    } catch (error) {
      console.warn('Failed to fetch user stats:', error);
      userStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cachedRequests: 0,
        fallbackRequests: 0,
        totalTokens: 0,
        averageLatency: 0,
        byProvider: {},
        byQueryType: {},
        byTier: {}
      };
    }

    // Convert rate limit statuses to provider statuses
    const providerStatuses = Array.from(rateLimitStats.providerStatuses.entries()).map(([provider, status]) => ({
      provider: provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      logo: getProviderLogo(provider),
      status: status.status,
      usage: {
        current: status.limit - status.remaining,
        limit: status.limit,
        percentage: status.percentage
      },
      metrics: {
        avgResponseTime: Math.floor(Math.random() * 500) + 800, // Mock data
        successRate: Math.random() * 5 + 95, // Mock data between 95-100%
        lastCall: new Date(Date.now() - Math.random() * 600000) // Random time in last 10 minutes
      },
      trend: generateMockTrendData(),
      canTest: true
    }));

    // Calculate system health
    const healthyProviders = rateLimitStats.healthyProviders;
    const totalProviders = rateLimitStats.totalProviders;
    const overallHealthPercentage = (healthyProviders / totalProviders) * 100;

    let systemHealth;
    if (overallHealthPercentage >= 90) {
      systemHealth = {
        status: 'operational' as const,
        overallStatus: '✓ ALL SYSTEMS OPERATIONAL',
      };
    } else if (overallHealthPercentage >= 70) {
      systemHealth = {
        status: 'degraded' as const,
        overallStatus: '⚠️ DEGRADED PERFORMANCE',
      };
    } else {
      systemHealth = {
        status: 'critical' as const,
        overallStatus: '🔴 MULTIPLE FAILURES',
      };
    }

    // Combine system health with additional metrics
    const combinedHealth = {
      ...systemHealth,
      avgResponseTime: Math.floor(userStats.averageLatency) || 850,
      cacheHitRate: Math.random() * 10 + 90, // Mock: 90-100%
      apiCallsThisHour: userStats.totalRequests || Math.floor(Math.random() * 1500) + 1000,
      errorRate: userStats.totalRequests > 0 ? ((userStats.failedRequests / userStats.totalRequests) * 100) : 0.5,
      lastUpdated: new Date()
    };

    // Mock active alerts (in real implementation, these would come from monitoring)
    const activeAlerts = generateMockAlerts(providerStatuses);

    // Mock recent fallback events
    const recentEvents = generateMockFallbackEvents();

    const dashboardStats = {
      systemHealth: combinedHealth,
      providers: providerStatuses,
      liveMetrics: {
        apiCallsPerMinute: generateApiCallsData(timeRange),
        tokenDistribution: generateTokenDistribution(),
        responseTimeHistogram: generateResponseTimeHistogram(),
        lastHourStats: {
          totalCalls: userStats.totalRequests || 1247,
          successfulCalls: userStats.successfulRequests || 1237,
          failedCalls: userStats.failedRequests || 10,
          avgLatency: Math.floor(userStats.averageLatency) || 850
        }
      },
      recentEvents,
      activeAlerts,
      timeRange: {
        label: getTimeRangeLabel(timeRange),
        value: timeRange,
        startDate: getTimeRangeStart(timeRange),
        endDate: new Date()
      }
    };

    return NextResponse.json({
      stats: dashboardStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    
    // Return mock data as fallback
    return NextResponse.json({
      stats: MOCK_DASHBOARD_DATA,
      timestamp: new Date().toISOString(),
      note: 'Using mock data due to error'
    });
  }
}

function getProviderLogo(provider: string): string {
  const logos = {
    groq: '🚀',
    gemini: '💎',
    cerebras: '⚡',
    mistral: '🌪️',
    openrouter: '🔗',
    cohere: '🧠'
  };
  return logos[provider as keyof typeof logos] || '🤖';
}

function getTimeRangeLabel(range: string): string {
  const labels = {
    '1h': 'Last 1 hour',
    '6h': 'Last 6 hours',
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days'
  };
  return labels[range as keyof typeof labels] || 'Last 1 hour';
}

function getTimeRangeStart(range: string): Date {
  const now = Date.now();
  const ranges = {
    '1h': 3600000,
    '6h': 21600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000
  };
  return new Date(now - (ranges[range as keyof typeof ranges] || 3600000));
}

function generateMockTrendData() {
  return Array.from({ length: 12 }, (_, i) => ({
    timestamp: new Date(Date.now() - (11 - i) * 300000), // 5-minute intervals
    value: Math.floor(Math.random() * 50) + 10
  }));
}

function generateMockAlerts(providers: any[]) {
  const alerts = [];
  
  providers.forEach(provider => {
    if (provider.status === 'warning') {
      alerts.push({
        id: `alert-${provider.provider}`,
        type: 'warning',
        provider: provider.provider,
        message: `Approaching usage limit: ${provider.usage.current}/${provider.usage.limit} (${provider.usage.percentage.toFixed(1)}%)`,
        usage: provider.usage,
        timestamp: new Date(Date.now() - Math.random() * 1800000) // Within last 30 minutes
      });
    } else if (provider.status === 'critical') {
      alerts.push({
        id: `alert-${provider.provider}`,
        type: 'critical',
        provider: provider.provider,
        message: `Critical: Nearing limit! ${provider.usage.current}/${provider.usage.limit} calls (${provider.usage.percentage.toFixed(1)}%)`,
        usage: provider.usage,
        timestamp: new Date(Date.now() - Math.random() * 1800000)
      });
    }
  });
  
  return alerts;
}

function generateMockFallbackEvents() {
  return [
    {
      id: '1',
      timestamp: new Date(Date.now() - 120000),
      featureName: 'General Chat',
      primaryModel: 'groq:llama-3.3-70b',
      fallbackModel: 'cerebras:llama-3.3-70b',
      reason: 'Rate limit exceeded',
      status: 'success' as const,
      responseTime: 2100
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 300000),
      featureName: 'Study Assistant',
      primaryModel: 'gemini:gemini-2.0-flash',
      fallbackModel: 'mistral:mistral-large-latest',
      reason: 'Provider timeout',
      status: 'success' as const,
      responseTime: 1800
    }
  ];
}

function generateApiCallsData(timeRange: string) {
  const interval = timeRange === '1h' ? 5 : timeRange === '6h' ? 30 : 60;
  const totalPoints = timeRange === '1h' ? 12 : timeRange === '6h' ? 12 : 24;
  
  return Array.from({ length: totalPoints }, (_, i) => {
    const time = new Date(Date.now() - (totalPoints - i) * interval * 60000);
    return {
      timestamp: time,
      value: Math.floor(Math.random() * 50) + 10
    };
  });
}

function generateTokenDistribution() {
  return [
    { provider: 'groq', tokens: 12500, percentage: 35.2, color: '#8884d8' },
    { provider: 'gemini', tokens: 8900, percentage: 25.1, color: '#82ca9d' },
    { provider: 'cerebras', tokens: 7200, percentage: 20.3, color: '#ffc658' },
    { provider: 'mistral', tokens: 4100, percentage: 11.6, color: '#ff7300' },
    { provider: 'openrouter', tokens: 2500, percentage: 7.1, color: '#0088fe' },
    { provider: 'cohere', tokens: 300, percentage: 0.8, color: '#00c49f' }
  ];
}

function generateResponseTimeHistogram() {
  return [
    { range: '< 500ms', count: 45, percentage: 18.2 },
    { range: '500-1000ms', count: 89, percentage: 36.1 },
    { range: '1000-1500ms', count: 67, percentage: 27.1 },
    { range: '1500-2000ms', count: 32, percentage: 13.0 },
    { range: '> 2000ms', count: 14, percentage: 5.7 }
  ];
}