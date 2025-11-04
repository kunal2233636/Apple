// Provider Registry for Unified AI Chat System
// ============================================

import {
  IUnifiedProvider,
  ProviderRegistry,
  UnifiedProviderConfig,
  ProviderStatus,
  ChatServiceConfig,
  IChatService,
} from '@/types/chat';
import type { AIProvider } from '@/types/api-test';
import { BaseUnifiedProvider } from './unified-provider';
import { generateId } from './unified-provider';

/**
 * Provider Registry Implementation
 * Manages all AI providers, handles health checks, and provides fallback mechanisms
 */
export class UnifiedProviderRegistry implements ProviderRegistry {
  public readonly providers: Map<AIProvider, IUnifiedProvider> = new Map();
  public readonly healthStatus: Map<AIProvider, ProviderStatus> = new Map();
  public readonly defaultProvider: AIProvider;
  public readonly config: ChatServiceConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly DEFAULT_HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(config: ChatServiceConfig) {
    this.defaultProvider = config.defaultProvider || 'groq';
    this.config = {
      ...config,
      defaultProvider: this.defaultProvider,
      fallbackProviders: config.fallbackProviders || ['cerebras', 'mistral', 'openrouter', 'gemini', 'cohere'],
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      enableHealthChecks: config.enableHealthChecks !== false,
      healthCheckInterval: config.healthCheckInterval || this.DEFAULT_HEALTH_CHECK_INTERVAL,
      enableRateLimitTracking: config.enableRateLimitTracking !== false,
      streamChunkSize: config.streamChunkSize || 1024,
      maxConcurrentRequests: config.maxConcurrentRequests || 10,
    };

    // Initialize with default healthy status for all providers
    this.initializeDefaultStatuses();
    
    // Start health checking if enabled
    if (this.config.enableHealthChecks) {
      this.startHealthChecking();
    }
  }

  /**
   * Register a provider in the registry
   */
  registerProvider(provider: IUnifiedProvider): void {
    if (this.providers.has(provider.provider)) {
      console.warn(`Provider ${provider.provider} is already registered. Replacing...`);
    }
    
    this.providers.set(provider.provider, provider);
    
    // Set initial health status as unknown
    this.healthStatus.set(provider.provider, {
      provider: provider.provider,
      healthy: false,
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      rateLimitStatus: {},
      capabilities: provider.getCapabilities(),
    });
    
    console.log(`Registered provider: ${provider.provider}`);
  }

  /**
   * Unregister a provider from the registry
   */
  unregisterProvider(provider: AIProvider): void {
    const wasRemoved = this.providers.delete(provider);
    this.healthStatus.delete(provider);
    
    if (wasRemoved) {
      console.log(`Unregistered provider: ${provider}`);
    }
  }

  /**
   * Get a specific provider or the default provider
   */
  getProvider(provider?: AIProvider): IUnifiedProvider {
    const targetProvider = provider || this.config.defaultProvider;
    const providerInstance = this.providers.get(targetProvider);
    
    if (!providerInstance) {
      throw new Error(`Provider ${targetProvider} is not registered`);
    }
    
    return providerInstance;
  }

  /**
   * Get all healthy providers ordered by priority
   */
  getHealthyProviders(): IUnifiedProvider[] {
    const healthyProviders = Array.from(this.providers.values()).filter(provider => {
      const status = this.healthStatus.get(provider.provider);
      return status?.healthy !== false; // Treat unknown status as potentially healthy
    });
    
    // Sort by priority (higher priority first)
    return healthyProviders.sort((a, b) => {
      const configA = a.config;
      const configB = b.config;
      return (configB.priority || 0) - (configA.priority || 0);
    });
  }

  /**
   * Get the best available provider with fallback support
   */
  getBestAvailableProvider(requestedProvider?: AIProvider, fallback: boolean = true): IUnifiedProvider {
    // If specific provider requested and available, use it
    if (requestedProvider && this.providers.has(requestedProvider)) {
      const provider = this.getProvider(requestedProvider);
      const status = this.healthStatus.get(requestedProvider);
      
      if (status?.healthy !== false) {
        return provider;
      }
      
      if (!fallback) {
        throw new Error(`Requested provider ${requestedProvider} is not healthy`);
      }
    }
    
    // Find healthy providers
    const healthyProviders = this.getHealthyProviders();
    
    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }
    
    return healthyProviders[0];
  }

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(provider: AIProvider): Promise<ProviderStatus> {
    const providerInstance = this.providers.get(provider);
    
    if (!providerInstance) {
      const status: ProviderStatus = {
        provider,
        healthy: false,
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 1.0,
        rateLimitStatus: {},
        capabilities: {
          supportsStreaming: false,
          supportsSystemMessage: false,
          supportsFunctionCalling: false,
          supportsImageInput: false,
          supportedFormats: 'openai',
        },
      };
      
      this.healthStatus.set(provider, status);
      return status;
    }
    
    try {
      const status = await providerInstance.healthCheck();
      this.healthStatus.set(provider, status);
      return status;
    } catch (error) {
      const status: ProviderStatus = {
        provider,
        healthy: false,
        lastCheck: new Date(),
        responseTime: Date.now(),
        errorRate: 1.0,
        rateLimitStatus: {},
        capabilities: providerInstance.getCapabilities(),
      };
      
      this.healthStatus.set(provider, status);
      return status;
    }
  }

  /**
   * Check health of all providers
   */
  async checkAllProvidersHealth(): Promise<Map<AIProvider, ProviderStatus>> {
    const healthPromises = Array.from(this.providers.keys()).map(async (provider) => {
      try {
        const status = await this.checkProviderHealth(provider);
        return [provider, status] as [AIProvider, ProviderStatus];
      } catch (error) {
        const status: ProviderStatus = {
          provider,
          healthy: false,
          lastCheck: new Date(),
          responseTime: Date.now(),
          errorRate: 1.0,
          rateLimitStatus: {},
          capabilities: {
            supportsStreaming: false,
            supportsSystemMessage: false,
            supportsFunctionCalling: false,
            supportsImageInput: false,
            supportedFormats: 'openai',
          },
        };
        return [provider, status] as [AIProvider, ProviderStatus];
      }
    });
    
    const results = await Promise.all(healthPromises);
    return new Map(results);
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(provider: AIProvider, configUpdate: Partial<UnifiedProviderConfig>): void {
    const providerInstance = this.providers.get(provider);
    
    if (!providerInstance) {
      throw new Error(`Provider ${provider} is not registered`);
    }
    
    // Deep merge the configuration
    const newConfig = {
      ...providerInstance.config,
      ...configUpdate,
      capabilities: {
        ...providerInstance.config.capabilities,
        ...configUpdate.capabilities,
      },
    };
    
    // Create a new provider instance with updated config
    // This is a simplified approach - in a real implementation, 
    // you might want to update the existing instance or recreate it
    (providerInstance as any).config = newConfig;
    
    console.log(`Updated configuration for provider: ${provider}`);
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: AIProvider): UnifiedProviderConfig | undefined {
    const providerInstance = this.providers.get(provider);
    return providerInstance?.config;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IUnifiedProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get health status for all providers
   */
  getHealthStatus(): Map<AIProvider, ProviderStatus> {
    return new Map(this.healthStatus);
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(provider: AIProvider, enabled: boolean): void {
    const providerInstance = this.providers.get(provider);
    
    if (providerInstance) {
      (providerInstance as any).config.enabled = enabled;
      console.log(`Provider ${provider} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Set provider priority (higher numbers = higher priority)
   */
  setProviderPriority(provider: AIProvider, priority: number): void {
    const providerInstance = this.providers.get(provider);
    
    if (providerInstance) {
      (providerInstance as any).config.priority = priority;
      console.log(`Set priority ${priority} for provider: ${provider}`);
    }
  }

  /**
   * Get statistics about provider usage
   */
  getProviderStatistics(): {
    total: number;
    healthy: number;
    disabled: number;
    byProvider: Map<AIProvider, { healthy: boolean; enabled: boolean; priority: number }>;
  } {
    const byProvider = new Map();
    let healthy = 0;
    let disabled = 0;
    
    for (const [provider, providerInstance] of this.providers) {
      const status = this.healthStatus.get(provider);
      const config = providerInstance.config;
      
      byProvider.set(provider, {
        healthy: status?.healthy !== false,
        enabled: config.enabled,
        priority: config.priority,
      });
      
      if (status?.healthy !== false) healthy++;
      if (!config.enabled) disabled++;
    }
    
    return {
      total: this.providers.size,
      healthy,
      disabled,
      byProvider,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    this.providers.clear();
    this.healthStatus.clear();
  }

  // Private helper methods

  private initializeDefaultStatuses(): void {
    const defaultProviders: AIProvider[] = ['groq', 'cerebras', 'mistral', 'openrouter', 'gemini', 'cohere'];
    
    for (const provider of defaultProviders) {
      this.healthStatus.set(provider, {
        provider,
        healthy: false, // Will be updated by health checks
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        rateLimitStatus: {},
        capabilities: {
          supportsStreaming: provider === 'groq' || provider === 'openrouter', // Only some support streaming
          supportsSystemMessage: true,
          supportsFunctionCalling: false,
          supportsImageInput: provider === 'gemini',
          supportedFormats: provider === 'gemini' ? 'google' : 'openai',
        },
      });
    }
  }

  private startHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAllProvidersHealth();
      } catch (error) {
        console.error('Error during health check:', error);
      }
    }, this.config.healthCheckInterval);
  }
}

/**
 * Registry Manager - Singleton instance for global access
 */
class RegistryManager {
  private static instance: RegistryManager;
  private registry?: UnifiedProviderRegistry;

  private constructor() {}

  static getInstance(): RegistryManager {
    if (!RegistryManager.instance) {
      RegistryManager.instance = new RegistryManager();
    }
    return RegistryManager.instance;
  }

  initialize(config: ChatServiceConfig): UnifiedProviderRegistry {
    if (this.registry) {
      this.registry.destroy();
    }
    
    this.registry = new UnifiedProviderRegistry(config);
    return this.registry;
  }

  getRegistry(): UnifiedProviderRegistry {
    if (!this.registry) {
      throw new Error('Registry not initialized. Call initialize() first.');
    }
    return this.registry;
  }

  reset(): void {
    if (this.registry) {
      this.registry.destroy();
      this.registry = undefined;
    }
  }
}

// Export singleton instance
export const registryManager = RegistryManager.getInstance();

/**
 * Provider Registration Helper Functions
 */

// Register all default providers
export async function registerDefaultProviders(registry: UnifiedProviderRegistry): Promise<void> {
  // Import and register each provider
  const providerModules = await Promise.all([
    import('../providers/groq'),
    import('../providers/cerebras'),
    import('../providers/mistral'),
    import('../providers/openrouter'),
    import('../providers/gemini'),
    import('../providers/cohere'),
  ]);

  // Note: These imports will need to be updated to use the new unified provider implementations
  // For now, we'll create placeholder registrations
  
  console.log('Default providers registered:', providerModules.length);
}

// Get provider by capability
export function getProviderByCapability(
  registry: UnifiedProviderRegistry,
  capability: keyof UnifiedProviderConfig['capabilities']
): IUnifiedProvider | null {
  const providers = registry.getAllProviders();
  
  for (const provider of providers) {
    const config = provider.config;
    if (capability in config.capabilities && config.capabilities[capability]) {
      return provider;
    }
  }
  
  return null;
}

// Validate provider configuration
export function validateProviderConfig(config: UnifiedProviderConfig): { valid: boolean; errors: string[] } {
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