// Study Buddy Settings Service
// Provides configured provider/model settings for AI endpoints

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
      }
    };
  }

  /**
   * Update user's Study Buddy settings
   */
  updateSettings(userId: string, settings: StudyBuddySettings): void {
    this.userSettingsCache.set(userId, settings);
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
    preferredProviders?: AIProvider[]
  ): EndpointConfiguration | null {
    const config = this.getEndpointConfiguration(userId, endpoint);
    if (!config || !config.enabled) {
      return null;
    }

    // If preferred providers are specified, check if the configured provider is in the list
    if (preferredProviders && !preferredProviders.includes(config.provider as AIProvider)) {
      // Try fallback provider if available and in preferred list
      if (config.fallbackProvider && preferredProviders.includes(config.fallbackProvider)) {
        return {
          ...config,
          provider: config.fallbackProvider,
          model: config.fallbackModel || config.model
        };
      }
      return null; // No suitable provider found
    }

    return config;
  }

  /**
   * Validate provider/model combination
   */
  validateConfiguration(
    provider: AIProvider, 
    model: string
  ): { isValid: boolean; error?: string } {
    const validModels = this.getValidModelsForProvider(provider);
    
    if (!validModels.includes(model)) {
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
      groq: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
      gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'],
      cerebras: ['llama3-8b', 'llama3-70b'],
      cohere: ['command-r', 'command-r-plus', 'embed-english-v3.0'],
      mistral: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest']
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
    // For now, return a mock result
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
}

// Export singleton instance
export const studyBuddySettingsService = StudyBuddySettingsService.getInstance();