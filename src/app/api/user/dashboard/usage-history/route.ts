import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';
import { apiUsageLogger } from '@/lib/ai/api-logger';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';

// GET /api/user/dashboard/usage-history
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
    const provider = searchParams.get('provider'); // Optional filter

    // Get time range in milliseconds
    const timeRangeMs = getTimeRangeMs(timeRange);
    const startDate = new Date(Date.now() - timeRangeMs);
    const endDate = new Date();

    // Mock time series data for charts
    const apiCallsData = generateTimeSeriesData(timeRange, 'calls');
    const tokenUsageData = generateTimeSeriesData(timeRange, 'tokens');
    const responseTimesData = generateTimeSeriesData(timeRange, 'responseTime');

    // Provider breakdown data
    const providers = ['groq', 'gemini', 'cerebras', 'mistral', 'openrouter', 'cohere'];
    const providerBreakdown = providers.reduce((acc, prov) => {
      acc[prov] = generateTimeSeriesData(timeRange, 'calls', prov);
      return acc;
    }, {} as Record<string, any[]>);

    const usageHistory = {
      timeRange: {
        label: getTimeRangeLabel(timeRange),
        value: timeRange,
        startDate,
        endDate
      },
      data: {
        apiCalls: apiCallsData,
        tokenUsage: tokenUsageData,
        responseTimes: responseTimesData,
        providerBreakdown
      }
    };

    return NextResponse.json(usageHistory);

  } catch (error) {
    console.error('Usage history error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch usage history' },
      { status: 500 }
    );
  }
}

function getTimeRangeMs(timeRange: string): number {
  const ranges = {
    '1h': 3600000,
    '6h': 21600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000
  };
  return ranges[timeRange as keyof typeof ranges] || 3600000;
}

function getTimeRangeLabel(timeRange: string): string {
  const labels = {
    '1h': 'Last 1 hour',
    '6h': 'Last 6 hours',
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days'
  };
  return labels[timeRange as keyof typeof labels] || 'Last 1 hour';
}

function generateTimeSeriesData(timeRange: string, metric: 'calls' | 'tokens' | 'responseTime', provider?: string) {
  const interval = getDataInterval(timeRange);
  const totalPoints = getTotalPoints(timeRange);
  
  return Array.from({ length: totalPoints }, (_, i) => {
    const timestamp = new Date(Date.now() - (totalPoints - i) * interval);
    
    let value: number;
    switch (metric) {
      case 'calls':
        value = Math.floor(Math.random() * 50) + 10;
        break;
      case 'tokens':
        value = Math.floor(Math.random() * 1000) + 500;
        break;
      case 'responseTime':
        value = Math.floor(Math.random() * 800) + 600;
        break;
      default:
        value = Math.floor(Math.random() * 50) + 10;
    }
    
    return {
      timestamp,
      value,
      label: timestamp.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  });
}

function getDataInterval(timeRange: string): number {
  switch (timeRange) {
    case '1h':
      return 300000; // 5 minutes
    case '6h':
      return 1800000; // 30 minutes
    case '24h':
      return 3600000; // 1 hour
    case '7d':
      return 86400000; // 1 day
    case '30d':
      return 86400000; // 1 day
    default:
      return 300000;
  }
}

function getTotalPoints(timeRange: string): number {
  switch (timeRange) {
    case '1h':
      return 12; // 12 points
    case '6h':
      return 12; // 12 points
    case '24h':
      return 24; // 24 points
    case '7d':
      return 7; // 7 points
    case '30d':
      return 30; // 30 points
    default:
      return 12;
  }
}