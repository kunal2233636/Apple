// Provider Configuration Management System
// ======================================

import {
  UnifiedProviderConfig,
  ChatServiceConfig,
  ProviderStatus,
} from '@/types/chat';
import type { AIProvider } from '@/types/api-test';
import { UnifiedProviderRegistry } from './provider-registry';
import { createGroqProvider } from '../providers/groq-unified';
import { createCohereProvider } from '../providers/cohere-unified';

/**
 * Configuration Manager for AI Chat System
 * Handles dynamic provider configuration, API key management, and service settings
 */
export class ChatConfigurationManager {
  private registry: UnifiedProviderRegistry;
  private config: ChatServiceConfig;
  private providerConfigs: Map<AIProvider, UnifiedProviderConfig> = new Map();

  constructor(registry: UnifiedProviderRegistry, initialConfig?: Partial<ChatServiceConfig>) {
    this.registry = registry;
    
    // Initialize with default configuration
    this.config = {
      defaultProvider: initialConfig?.defaultProvider || 'groq',
      fallbackProviders: initialConfig?.fallbackProviders || ['cerebras', 'mistral', 'openrouter', 'gemini', 'cohere'],
      timeout: initialConfig?.timeout || 30000,
      maxRetries: initialConfig?.maxRetries || 3,
      retryDelay: initialConfig?.retryDelay || 1000,
      enableHealthChecks: initialConfig?.enableHealthChecks !== false,
      healthCheckInterval: initialConfig?.healthCheckInterval || 30000,
      enableRateLimitTracking: initialConfig?.enableRateLimitTracking !== false,
      streamChunkSize: initialConfig?.streamChunkSize || 1024,
      maxConcurrentRequests: initialConfig?.maxConcurrentRequests || 10,
    };

    // Initialize default provider configurations
    this.initializeDefaultConfigurations();
  }

  /**
   * Initialize default configurations for all supported providers
   */
  private initializeDefaultConfigurations(): void {
    // Groq configuration
    this.setProviderConfig('groq', {
      name: 'Groq',
      provider: 'groq',
      apiKeyEnv: 'GROQ_API_KEY',
      baseUrl: 'https://api.groq.com',
      models: {
        chat: 'llama-3.3-70b-versatile',
      },
      capabilities: {
        supportsStreaming: true,
        supportsSystemMessage: true,
        supportsFunctionCalling: false,
        supportsImageInput: false,
        supportedFormats: 'openai',
        rateLimits: {
          requestsPerMinute: 30,
          tokensPerMinute: 6000,
        },
      },
      timeout: 30000,
      priority: 10,
      enabled: true,
    });

    // Cerebras configuration
    this.setProviderConfig('cerebras', {
      name: 'Cerebras',
      provider: 'cerebras',
      apiKeyEnv: 'CEREBRAS_API_KEY',
      baseUrl: 'https://api.cerebras.ai',
      models: {
        chat: 'llm-3.3-70b',
      },
      capabilities: {
        supportsStreaming: true,
        supportsSystemMessage: true,
        supportsFunctionCalling: false,
        supportsImageInput: false,
        supportedFormats: 'openai',
        rateLimits: {
          requestsPerMinute: 60,
          tokensPerMinute: 12000,
        },
      },
      timeout: 25000,
      priority: 9,
      enabled: true,
    });

    // Mistral configuration
    this.setProviderConfig('mistral', {
      name: 'Mistral',
      provider: 'mistral',
      apiKeyEnv: 'MISTRAL_API_KEY',
      baseUrl: 'https://api.mistral.ai',
      models: {
        chat: 'mistral-small-latest',
      },
      capabilities: {
        supportsStreaming: true,
        supportsSystemMessage: true,
        supportsFunctionCalling: false,
        supportsImageInput: false,
        supportedFormats: 'openai',
        rateLimits: {
          requestsPerMinute: 60,
          tokensPerMinute: 10000,
        },
      },
      timeout: 30000,
      priority: 8,
      enabled: true,
    });

    // OpenRouter configuration
    this.setProviderConfig('openrouter', {
      name: 'OpenRouter',
      provider: 'openrouter',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      baseUrl: 'https://openrouter.ai/api/v1',
      models: {
        chat: 'gpt-3.5-turbo',
      },
      capabilities: {
        supportsStreaming: true,
        supportsSystemMessage: true,
        supportsFunctionCalling: true,
        supportsImageInput: false,
        supportedFormats: 'openai',
        rateLimits: {
          requestsPerMinute: 100,
          tokensPerMinute: 20000,
        },
      },
      timeout: 35000,
      priority: 7,
      enabled: true,
    });

    // Gemini configuration
    this.setProviderConfig('gemini', {
      name: 'Gemini',
      provider: 'gemini',
      apiKeyEnv: 'GEMINI_API_KEY',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      models: {
        chat: 'gemini-2.0-flash-lite',
      },
      capabilities: {
        supportsStreaming: true,
        supportsSystemMessage: true,
        supportsFunctionCalling: false,
        supportsImageInput: true,
        supportedFormats: 'google',
        rateLimits: {
          requestsPerMinute: 60,
          tokensPerMinute: 15000,
        },
      },
      timeout: 30000,
      priority: 6,
      enabled: true,
    });

    // Cohere configuration
    this.setProviderConfig('cohere', {
      name: 'Cohere',
      provider: 'cohere',
      apiKeyEnv: 'COHERE_API_KEY',
      baseUrl: 'https://api.cohere.ai',
      models: {
        chat: 'command',
        embedding: 'embed-multilingual-v3.0',
      },
      capabilities: {
        supportsStreaming: true,
        supportsSystemMessage: true,
        supportsFunctionCalling: false,
        supportsImageInput: false,
        supportedFormats: 'cohere',
        rateLimits: {
          requestsPerMinute: 100,
          tokensPerMinute: 20000,
        },
      },
      timeout: 30000,
      priority: 5,
      enabled: true,
    });

    // Register all providers with the registry
    this.registerAllProviders();
  }

  /**
   * Set or update a provider configuration
   */
  setProviderConfig(provider: AIProvider, config: UnifiedProviderConfig): void {
    // Validate configuration
    const validation = this.validateProviderConfiguration(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration for ${provider}: ${validation.errors.join(', ')}`);
    }

    this.providerConfigs.set(provider, config);
    
    // Update registry if provider is already registered
    try {
      this.registry.updateProviderConfig(provider, config);
    } catch (error) {
      console.warn(`Provider ${provider} not yet registered in registry:`, error);
    }
  }

  /**
   * Get a provider configuration
   */
  getProviderConfig(provider: AIProvider): UnifiedProviderConfig | null {
    return this.providerConfigs.get(provider) || null;
  }

  /**
   * Get all provider configurations
   */
  getAllProviderConfigs(): Map<AIProvider, UnifiedProviderConfig> {
    return new Map(this.providerConfigs);
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(provider: AIProvider, enabled: boolean): void {
    const config = this.providerConfigs.get(provider);
    if (config) {
      config.enabled = enabled;
      this.registry.setProviderEnabled(provider, enabled);
    }
  }

  /**
   * Set provider priority (higher numbers = higher priority)
   */
  setProviderPriority(provider: AIProvider, priority: number): void {
    const config = this.providerConfigs.get(provider);
    if (config) {
      config.priority = priority;
      this.registry.setProviderPriority(provider, priority);
    }
  }

  /**
   * Update service-level configuration
   */
  updateServiceConfig(configUpdate: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...configUpdate };
  }

  /**
   * Get current service configuration
   */
  getServiceConfig(): ChatServiceConfig {
    return { ...this.config };
  }

  /**
   * Get provider status information
   */
  getProviderStatuses(): Map<AIProvider, ProviderStatus> {
    return this.registry.getHealthStatus();
  }

  /**
   * Get provider statistics
   */
  getProviderStatistics(): {
    total: number;
    healthy: number;
    disabled: number;
    byProvider: Map<AIProvider, { healthy: boolean; enabled: boolean; priority: number }>;
  } {
    return this.registry.getProviderStatistics();
  }

  /**
   * Check API key availability for a provider
   */
  async checkApiKeyAvailability(provider: AIProvider): Promise<{
    available: boolean;
    environmentVar?: string;
    error?: string;
  }> {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      return {
        available: false,
        error: `Provider ${provider} not configured`,
      };
    }

    try {
      const { validateEnvVar } = await import('./unified-provider');
      const apiKey = validateEnvVar(config.apiKeyEnv);
      
      return {
        available: !!apiKey,
        environmentVar: config.apiKeyEnv,
      };
    } catch (error) {
      return {
        available: false,
        environmentVar: config.apiKeyEnv,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get environment variable status for all providers
   */
  async getEnvironmentStatus(): Promise<{
    providers: Map<AIProvider, { available: boolean; environmentVar: string; error?: string }>;
    missingKeys: string[];
    availableKeys: string[];
  }> {
    const providers = new Map();
    const missingKeys: string[] = [];
    const availableKeys: string[] = [];

    for (const [providerName, config] of this.providerConfigs) {
      const status = await this.checkApiKeyAvailability(providerName);
      providers.set(providerName, {
        available: status.available,
        environmentVar: config.apiKeyEnv,
        error: status.error,
      });

      if (status.available) {
        availableKeys.push(config.apiKeyEnv);
      } else {
        missingKeys.push(config.apiKeyEnv);
      }
    }

    return {
      providers,
      missingKeys,
      availableKeys,
    };
  }

  /**
   * Reset provider to default configuration
   */
  resetProviderConfig(provider: AIProvider): void {
    // Remove current configuration
    this.providerConfigs.delete(provider);
    
    // Re-initialize with defaults
    this.initializeDefaultConfigurations();
    
    // Re-register in registry
    this.registerProvider(provider);
  }

  /**
   * Register a provider with the registry
   */
  private registerProvider(provider: AIProvider): void {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      throw new Error(`No configuration found for provider ${provider}`);
    }

    try {
      switch (provider) {
        case 'groq':
          this.registry.registerProvider(createGroqProvider());
          break;
        case 'cohere':
          this.registry.registerProvider(createCohereProvider());
          break;
        // Add other providers as they become available
        default:
          console.warn(`Provider ${provider} not yet implemented in registry`);
      }
    } catch (error) {
      console.error(`Failed to register provider ${provider}:`, error);
    }
  }

  /**
   * Register all providers with the registry
   */
  private registerAllProviders(): void {
    for (const provider of this.providerConfigs.keys()) {
      try {
        this.registerProvider(provider);
      } catch (error) {
        console.error(`Failed to register ${provider}:`, error);
      }
    }
  }

  /**
   * Validate provider configuration
   */
  private validateProviderConfiguration(config: UnifiedProviderConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Provider name is required');
    }

    if (!config.apiKeyEnv || config.apiKeyEnv.trim() === '') {
      errors.push('API key environment variable name is required');
    }

    if (!config.baseUrl || config.baseUrl.trim() === '') {
      errors.push('Base URL is required');
    }

    if (!config.models.chat || config.models.chat.trim() === '') {
      errors.push('Chat model is required');
    }

    if (!config.capabilities) {
      errors.push('Capabilities configuration is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Configuration Manager Factory
 */
export class ConfigurationManagerFactory {
  private static instance?: ChatConfigurationManager;
  private static registry?: UnifiedProviderRegistry;

  static createManager(config?: Partial<ChatServiceConfig>): ChatConfigurationManager {
    if (!this.registry) {
      throw new Error('Registry not initialized. Call initialize() first.');
    }

    this.instance = new ChatConfigurationManager(this.registry, config);
    return this.instance;
  }

  static getManager(): ChatConfigurationManager {
    if (!this.instance) {
      throw new Error('Configuration manager not initialized. Call createManager() first.');
    }
    return this.instance;
  }

  static setRegistry(registry: UnifiedProviderRegistry): void {
    this.registry = registry;
  }

  static reset(): void {
    this.instance = undefined;
    this.registry = undefined;
  }
}

// Export convenience functions
export function getConfigurationManager(): ChatConfigurationManager {
  return ConfigurationManagerFactory.getManager();
}

export function createConfigurationManager(config?: Partial<ChatServiceConfig>): ChatConfigurationManager {
  return ConfigurationManagerFactory.createManager(config);
}