'use client';

import type { ProviderConfig, RateLimitStatus } from '@/types/ai-service-manager';
import type { AIProvider } from '@/types/api-test';

// API base URL
const API_BASE = '/api/admin';

// Fetch current provider configurations
export async function fetchProviderConfigs(): Promise<ProviderConfig[]> {
  try {
    const response = await fetch(`${API_BASE}/providers`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch provider configurations');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching provider configs:', error);
    throw error;
  }
}

// Update provider configuration
export async function updateProviderConfig(providerId: string, config: Partial<ProviderConfig>): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/providers/${providerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update provider configuration');
    }
  } catch (error) {
    console.error('Error updating provider config:', error);
    throw error;
  }
}

// Test provider connection
export async function testProviderConnection(providerId: string): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string;
  lastChecked: Date;
}> {
  try {
    const response = await fetch(`${API_BASE}/providers/${providerId}/test`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to test provider connection');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error testing provider connection:', error);
    throw error;
  }
}

// Test all provider connections
export async function testAllProviderConnections(): Promise<Record<string, {
  connected: boolean;
  responseTime: number;
  error?: string;
}>> {
  try {
    const response = await fetch(`${API_BASE}/providers/test-all`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to test provider connections');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error testing all provider connections:', error);
    throw error;
  }
}

// Fetch rate limit status for all providers
export async function fetchRateLimitStatus(): Promise<Record<AIProvider, RateLimitStatus>> {
  try {
    const response = await fetch(`${API_BASE}/rate-limits`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch rate limit status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
    throw error;
  }
}

// Save model overrides
export async function saveModelOverrides(overrides: Record<string, string>): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/model-overrides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ overrides })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save model overrides');
    }
  } catch (error) {
    console.error('Error saving model overrides:', error);
    throw error;
  }
}

// Fetch current model overrides
export async function fetchModelOverrides(): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE}/model-overrides`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch model overrides');
    }
    
    const data = await response.json();
    return data.overrides || {};
  } catch (error) {
    console.error('Error fetching model overrides:', error);
    throw error;
  }
}

// Save fallback chain configuration
export async function saveFallbackChain(fallbackChain: Array<{
  provider: AIProvider;
  tier: number;
  enabled: boolean;
}>): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/fallback-chain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ fallbackChain })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save fallback chain');
    }
  } catch (error) {
    console.error('Error saving fallback chain:', error);
    throw error;
  }
}

// Fetch current fallback chain configuration
export async function fetchFallbackChain(): Promise<Array<{
  provider: AIProvider;
  tier: number;
  enabled: boolean;
}>> {
  try {
    const response = await fetch(`${API_BASE}/fallback-chain`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch fallback chain');
    }
    
    const data = await response.json();
    return data.fallbackChain || [];
  } catch (error) {
    console.error('Error fetching fallback chain:', error);
    throw error;
  }
}

// Save chat settings
export async function saveChatSettings(settings: {
  general: {
    webSearchEnabled: boolean;
    showModelName: boolean;
    showResponseTime: boolean;
    cacheTTL: number;
  };
  studyAssistant: {
    memorySystemEnabled: boolean;
    contextInclusionEnabled: boolean;
    memoryRetentionDays: number;
    cacheTTL: number;
  };
  language: {
    responseLanguage: string;
    hinglishEnforcement: boolean;
  };
}): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/chat-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save chat settings');
    }
  } catch (error) {
    console.error('Error saving chat settings:', error);
    throw error;
  }
}

// Fetch current chat settings
export async function fetchChatSettings() {
  try {
    const response = await fetch(`${API_BASE}/chat-settings`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch chat settings');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching chat settings:', error);
    throw error;
  }
}

// Fetch usage statistics
export async function fetchUsageStatistics(): Promise<{
  totalCalls: number;
  tokensUsed: number;
  avgResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  providerStats: Record<string, {
    calls: number;
    tokens: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
}> {
  try {
    const response = await fetch(`${API_BASE}/usage-statistics`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch usage statistics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    throw error;
  }
}

// Fetch recent fallback events
export async function fetchFallbackEvents(limit: number = 50): Promise<Array<{
  id: string;
  timestamp: Date;
  provider: string;
  reason: string;
  tier: number;
  resolved: boolean;
  duration: number;
}>> {
  try {
    const response = await fetch(`${API_BASE}/fallback-events?limit=${limit}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch fallback events');
    }
    
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Error fetching fallback events:', error);
    throw error;
  }
}

// Refresh monitoring data
export async function refreshMonitoringData(): Promise<{
  providers: Array<{
    status: 'healthy' | 'warning' | 'critical' | 'offline';
    responseTime: number;
    successRate: number;
    callsToday: number;
    errors: number;
  }>;
  usageStats: {
    totalCalls: number;
    tokensUsed: number;
    avgResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
  };
}> {
  try {
    const response = await fetch(`${API_BASE}/monitoring/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh monitoring data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error refreshing monitoring data:', error);
    throw error;
  }
}

// Export monitoring data
export async function exportMonitoringData(): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE}/monitoring/export`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to export monitoring data');
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error exporting monitoring data:', error);
    throw error;
  }
}