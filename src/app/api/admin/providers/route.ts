import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { rateLimitTracker } from '@/lib/ai/rate-limit-tracker';
import { responseCache } from '@/lib/ai/response-cache';
import type { AIProvider } from '@/types/api-test';
import type { ProviderConfig } from '@/types/ai-service-manager';

// Helper function to check admin access
async function checkAdminAccess(request: NextRequest): Promise<{authorized: boolean; message?: string}> {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return { authorized: false, message: 'Not authenticated' };
  }

  // All authenticated users are admins
  return { authorized: true };
}

// GET /api/admin/providers - Fetch all provider configurations
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminAccess(request);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.message }, { status: 403 });
    }

    const stats = await aiServiceManager.getStatistics();
    
    // Transform provider stats to admin format
    const providerConfigs: ProviderConfig[] = Object.entries(stats.providers).map(([provider, health]) => {
      const rateLimitStats = stats.rateLimits[provider as AIProvider];
      const usage = rateLimitStats?.usage || 0;
      const limit = rateLimitStats?.limit || 1000;
      
      return {
        name: provider.charAt(0).toUpperCase() + provider.slice(1),
        provider: provider as AIProvider,
        tier: getProviderTier(provider as AIProvider),
        baseUrl: getProviderBaseUrl(provider as AIProvider),
        models: getProviderModels(provider as AIProvider),
        capabilities: getProviderCapabilities(provider as AIProvider),
        rateLimitConfig: rateLimitStats || {
          requestsPerMinute: 100,
          windowSize: 60000
        },
        priority: getProviderTier(provider as AIProvider),
        enabled: health.healthy
      };
    });

    return NextResponse.json(providerConfigs);
  } catch (error) {
    console.error('Error fetching provider configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider configurations' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/providers/:providerId - Update provider configuration
export async function PATCH(request: NextRequest, { params }: { params: { providerId: string } }) {
  try {
    const authCheck = await checkAdminAccess(request);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.message }, { status: 403 });
    }

    const providerId = params.providerId;
    const updates = await request.json();

    // In a real implementation, this would update the provider configuration
    // For now, we'll just return success
    console.log(`Updating provider ${providerId} with:`, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating provider config:', error);
    return NextResponse.json(
      { error: 'Failed to update provider configuration' },
      { status: 500 }
    );
  }
}

// Helper functions
function getProviderTier(provider: AIProvider): number {
  const tierMap = {
    groq: 1,
    cerebras: 2,
    mistral: 3,
    openrouter: 4,
    gemini: 5,
    cohere: 6
  };
  return tierMap[provider] || 6;
}

function getProviderBaseUrl(provider: AIProvider): string {
  const baseUrlMap = {
    groq: 'https://api.groq.com/openai/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1',
    cerebras: 'https://api.cerebras.ai/v1',
    cohere: 'https://api.cohere.ai/v1',
    mistral: 'https://api.mistral.ai/v1',
    openrouter: 'https://openrouter.ai/api/v1'
  };
  return baseUrlMap[provider] || '';
}

function getProviderModels(provider: AIProvider) {
  const modelMap = {
    groq: { chat: 'llama-3.3-70b-versatile' },
    gemini: { chat: 'gemini-1.5-flash' },
    cerebras: { chat: 'llama-3.3-70b' },
    cohere: { chat: 'command' },
    mistral: { chat: 'mistral-medium-latest' },
    openrouter: { chat: 'openai/gpt-3.5-turbo' }
  };
  return modelMap[provider] || { chat: 'default' };
}

function getProviderCapabilities(provider: AIProvider) {
  return {
    supportsWebSearch: provider === 'gemini',
    supportsStreaming: true,
    supportsFunctionCalling: true,
    maxTokens: getMaxTokensForProvider(provider)
  };
}

function getMaxTokensForProvider(provider: AIProvider): number {
  const maxTokensMap = {
    groq: 32768,
    gemini: 1000000,
    cerebras: 128000,
    cohere: 4096,
    mistral: 128000,
    openrouter: 16385
  };
  return maxTokensMap[provider] || 8192;
}