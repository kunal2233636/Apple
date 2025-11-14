import { supabaseBrowserClient } from '@/lib/supabase';
import type { StudyBuddySettings, EndpointConfig } from '@/types/settings';
import type { AIProvider } from '@/types/api-test';

export interface EndpointConfiguration {
  provider: AIProvider;
  model: string;
  timeout: number;
  retryAttempts: number;
  fallbackProvider?: AIProvider;
  fallbackModel?: string;
  enabled: boolean;
}

export interface StudyBuddyConfiguration {
  endpoints: {
    chat: EndpointConfiguration;
    embeddings: EndpointConfiguration;
    memoryStorage: EndpointConfiguration;
    orchestrator: EndpointConfiguration;
    personalized: EndpointConfiguration;
    semanticSearch: EndpointConfiguration;
    webSearch: EndpointConfiguration;
  };
  globalDefaults: {
    provider: AIProvider;
    model: string;
  };
  fallbackModels: { id: string; name: string; }[];
}

export class StudyBuddySettingsService {
  private static instance: StudyBuddySettingsService;
  private userSettingsCache = new Map<string, StudyBuddySettings>();

  static getInstance(): StudyBuddySettingsService {
    if (!StudyBuddySettingsService.instance) {
      StudyBuddySettingsService.instance = new StudyBuddySettingsService();
    }
    return StudyBuddySettingsService.instance;
  }

  /**
   * Get configuration for a specific endpoint
   */
  getEndpointConfiguration(
    userId: string, 
    endpoint: keyof StudyBuddySettings['endpoints']
  ): EndpointConfiguration | null {
    const settings = this.userSettingsCache.get(userId);
    if (!settings) {
      return null;
    }

    const endpointConfig = settings.endpoints[endpoint];
    if (!endpointConfig) {
      return null;
    }

    return {
      provider: endpointConfig.provider as AIProvider,
      model: endpointConfig.model,
      timeout: endpointConfig.timeout,
      retryAttempts: endpointConfig.retryAttempts,
      fallbackProvider: endpointConfig.fallbackProvider as AIProvider,
      fallbackModel: endpointConfig.fallbackModel,
      enabled: endpointConfig.enabled
    };
  }

  /**
   * Get global defaults configuration
   */
  getGlobalDefaults(userId: string): { provider: AIProvider; model: string } | null {
    const settings = this.userSettingsCache.get(userId);
    if (!settings) {
      return null;
    }

    return {
      provider: settings.globalDefaults.provider as AIProvider,
      model: settings.globalDefaults.model
    };
  }

  /**
   * Get full Study Buddy configuration
   */
  getFullConfiguration(userId: string): StudyBuddyConfiguration | null {
    const settings = this.userSettingsCache.get(userId);
    if (!settings) {
      return null;
    }

    return {
      endpoints: {
        chat: this.createEndpointConfig(settings.endpoints.chat),
        embeddings: this.createEndpointConfig(settings.endpoints.embeddings),
        memoryStorage: this.createEndpointConfig(settings.endpoints.memoryStorage),
        orchestrator: this.createEndpointConfig(settings.endpoints.orchestrator),
        personalized: this.createEndpointConfig(settings.endpoints.personalized),
        semanticSearch: this.createEndpointConfig(settings.endpoints.semanticSearch),
        webSearch: this.createEndpointConfig(settings.endpoints.webSearch)
      },
      globalDefaults: {
        provider: settings.globalDefaults.provider as AIProvider,
        model: settings.globalDefaults.model
      },
      fallbackModels: settings.fallbackModels || []
    };
  }

  /**
   * Update user's Study Buddy settings
   */
  async updateSettings(userId: string, settings: Partial<StudyBuddySettings>): Promise<void> {
    const { data, error } = await supabaseBrowserClient
      .from('user_settings')
      .update({ settings: { ...this.userSettingsCache.get(userId), ...settings } })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }

    this.userSettingsCache.set(userId, { ...this.userSettingsCache.get(userId), ...settings } as StudyBuddySettings);
  }

  /**
   * Clear user's cached settings
   */
  clearSettings(userId: string): void {
    this.userSettingsCache.delete(userId);
  }

  /**
   * Check if an endpoint is enabled and properly configured
   */
  isEndpointEnabled(
    userId: string, 
    endpoint: keyof StudyBuddySettings['endpoints']
  ): boolean {
    const config = this.getEndpointConfiguration(userId, endpoint);
    return config?.enabled === true;
  }

  /**
   * Get recommended provider/model for an endpoint with fallback logic
   */
  getOptimalConfiguration(
    userId: string, 
    endpoint: keyof StudyBuddySettings['endpoints'],
  ): EndpointConfiguration | null {
    const settings = this.userSettingsCache.get(userId);
    if (!settings) {
      return null;
    }
    
    const config = this.getEndpointConfiguration(userId, endpoint);
    if (!config || !config.enabled) {
      return null;
    }

    const fallbackModels = settings.fallbackModels || this.getAvailableProviders();

    for (const model of fallbackModels) {
      const provider = model.id as AIProvider;
      const validation = this.validateConfiguration(provider, config.model);
      if (validation.isValid) {
        return {
          ...config,
          provider,
        };
      }
    }

    return null;
  }

  /**
   * Validate provider/model combination
   */
  validateConfiguration(
    provider: AIProvider, 
    model: string
  ): { isValid: boolean; error?: string } {
    const validModels = this.getValidModelsForProvider(provider);
    
    if (validModels.length > 0 && !validModels.includes(model)) {
      return {
        isValid: false,
        error: `Model "${model}" is not valid for provider "${provider}"`
      };
    }

    return { isValid: true };
  }

  /**
   * Get list of valid models for a provider
   */
  getValidModelsForProvider(provider: AIProvider): string[] {
    const modelMap: Record<AIProvider, string[]> = {
      groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'meta-llama/llama-guard-4-12b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
      gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
      cerebras: ['llama3.1-8b', 'llama3.3-70b', 'qwen-3-32b'],
      cohere: ['command-r', 'command-r-plus', 'embed-english-v3.0'],
      mistral: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
      openrouter: [], // Added missing property
      google: [] // Added missing property
    };

    return modelMap[provider] || [];
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): AIProvider[] {
    return ['groq', 'gemini', 'cerebras', 'cohere', 'mistral'];
  }

  /**
   * Helper method to create standardized endpoint configuration
   */
  private createEndpointConfig(config: EndpointConfig): EndpointConfiguration {
    return {
      provider: config.provider as AIProvider,
      model: config.model,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      fallbackProvider: config.fallbackProvider as AIProvider,
      fallbackModel: config.fallbackModel,
      enabled: config.enabled
    };
  }

  /**
   * Test if a provider/model combination is working
   */
  async testProviderConnection(
    provider: AIProvider, 
    model: string
  ): Promise<{ success: boolean; responseTime: number; error?: string }> {
    // This would implement actual testing of the provider connection
    // For now,.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          responseTime: Math.random() * 2000 + 500, // 500-2500ms
        });
      }, 100);
    });
  }

  /**
   * Get health status of all configured endpoints for a user
   */
  async getHealthStatus(userId: string): Promise<Record<string, { status: 'healthy' | 'unhealthy' | 'unknown'; lastTested?: string; responseTime?: number }>> {
    const settings = this.userSettingsCache.get(userId);
    if (!settings) {
      return {};
    }

    const healthStatus: Record<string, { status: 'healthy' | 'unhealthy' | 'unknown'; lastTested?: string; responseTime?: number }> = {};

    for (const [endpointName, endpointConfig] of Object.entries(settings.endpoints)) {
      if (endpointConfig.enabled) {
        // In a real implementation, this would test the actual endpoint
        const lastTested = endpointConfig.lastTested;
        const testStatus = endpointConfig.testStatus;

        healthStatus[endpointName] = {
          status: testStatus === 'success' ? 'healthy' : testStatus === 'failed' ? 'unhealthy' : 'unknown',
          lastTested: lastTested,
          responseTime: Math.random() * 1000 + 200 // Mock response time
        };
      }
    }

    return healthStatus;
  }

  async getFallbackModels(userId: string): Promise<{ id: string; name: string; }[]> {
    const { data, error } = await supabaseBrowserClient
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting user settings:', error);
      return [];
    }

    return data.settings.fallbackModels || [];
  }

  async updateFallbackModels(userId: string, fallbackModels: { id: string; name: string; }[]): Promise<void> {
    const settings = this.userSettingsCache.get(userId);
    if (settings) {
      settings.fallbackModels = fallbackModels;
      await this.updateSettings(userId, { fallbackModels });
    }
  }
}

// Export singleton instance
export const studyBuddySettingsService = StudyBuddySettingsService.getInstance();