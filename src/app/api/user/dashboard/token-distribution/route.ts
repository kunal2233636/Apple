import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';
import { apiUsageLogger } from '@/lib/ai/api-logger';
import type { TokenDistributionData } from '@/types/dashboard';

// GET /api/user/dashboard/token-distribution
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
    const timeRange = searchParams.get('timeRange') || '1d';

    // Generate token distribution data
    const tokenDistribution = generateTokenDistributionData(timeRange);

    return NextResponse.json({
      timeRange,
      data: tokenDistribution,
      totalTokens: tokenDistribution.reduce((sum, item) => sum + item.tokens, 0),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token distribution error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch token distribution' },
      { status: 500 }
    );
  }
}

function generateTokenDistributionData(timeRange: string): TokenDistributionData[] {
  // Mock token distribution data - in real implementation, this would query the database
  const baseTokens = {
    groq: 12500,
    gemini: 8900,
    cerebras: 7200,
    mistral: 4100,
    openrouter: 2500,
    cohere: 300
  };

  // Add some randomization based on time range
  const multiplier = getTimeRangeMultiplier(timeRange);
  const totalTokens = Object.values(baseTokens).reduce((sum, tokens) => sum + tokens, 0) * multiplier;

  return [
    {
      provider: 'groq',
      tokens: Math.floor(baseTokens.groq * multiplier * (0.8 + Math.random() * 0.4)),
      percentage: 35.2,
      color: '#8884d8'
    },
    {
      provider: 'gemini',
      tokens: Math.floor(baseTokens.gemini * multiplier * (0.8 + Math.random() * 0.4)),
      percentage: 25.1,
      color: '#82ca9d'
    },
    {
      provider: 'cerebras',
      tokens: Math.floor(baseTokens.cerebras * multiplier * (0.8 + Math.random() * 0.4)),
      percentage: 20.3,
      color: '#ffc658'
    },
    {
      provider: 'mistral',
      tokens: Math.floor(baseTokens.mistral * multiplier * (0.8 + Math.random() * 0.4)),
      percentage: 11.6,
      color: '#ff7300'
    },
    {
      provider: 'openrouter',
      tokens: Math.floor(baseTokens.openrouter * multiplier * (0.8 + Math.random() * 0.4)),
      percentage: 7.1,
      color: '#0088fe'
    },
    {
      provider: 'cohere',
      tokens: Math.floor(baseTokens.cohere * multiplier * (0.8 + Math.random() * 0.4)),
      percentage: 0.8,
      color: '#00c49f'
    }
  ].map(item => ({
    ...item,
    percentage: (item.tokens / totalTokens) * 100
  }));
}

function getTimeRangeMultiplier(timeRange: string): number {
  switch (timeRange) {
    case '1h':
      return 0.1;
    case '6h':
      return 0.3;
    case '24h':
    case '1d':
      return 1;
    case '7d':
    case '1w':
      return 5;
    case '30d':
    case '1m':
      return 20;
    default:
      return 1;
  }
}