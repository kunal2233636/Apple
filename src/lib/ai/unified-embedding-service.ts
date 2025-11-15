// Unified Embedding Service - Multi-Provider Embeddings Management
// ================================================================

import type { AIProvider } from '@/types/api-test';
import { cohereClient } from './providers/cohere-client';
import { MistralEmbeddingProvider } from './providers/mistral-embeddings';
import { GoogleEmbeddingProvider } from './providers/google-embeddings';
import { VoyageEmbeddingProvider } from './providers/voyage-embeddings';
import { embeddingCache } from '@/lib/cache/embedding-cache';

export interface EmbeddingRequest {
  texts: string[];
  provider?: AIProvider;
  model?: string;
  timeout?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  provider: AIProvider;
  model: string;
  dimensions: number;
  usage: {
    requestCount: number;
    totalTokens: number;
    cost: number;
  };
  timestamp: string;
}

export interface ProviderHealthStatus {
  provider: AIProvider;
  healthy: boolean;
  responseTime: number;
  lastCheck: string;
  error?: string;
  usage: {
    requests: number;
    cost: number;
    limits: {
      daily?: number;
      monthly?: number;
    };
  };
}

export interface EmbeddingConfig {
  defaultProvider: AIProvider;
  fallbackProviders: AIProvider[];
  models: Record<AIProvider, string>;
  usage: {
    dailyLimit: number;
    monthlyLimit: number;
    costBudget: number;
  };
  monitoring: {
    enableHealthChecks: boolean;
    checkInterval: number; // minutes
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      costLimit: number;
    };
  };
}

export interface AdminSettings {
  providers: {
    [key in AIProvider]?: {
      enabled: boolean;
      apiKey?: string;
      model: string;
      priority: number;
      rateLimits: {
        requestsPerMinute: number;
        requestsPerDay: number;
        requestsPerMonth: number;
      };
      cost: {
        pricePerToken: number;
        dailyBudget: number;
        monthlyBudget: number;
      };
    };
  };
  defaultProvider: AIProvider;
  fallbackProviders: AIProvider[];
  models: Record<AIProvider, string>;
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      costLimit: number;
    };
  };
}

export class UnifiedEmbeddingService {
  private config: EmbeddingConfig;
  private healthStatus: Map<AIProvider, ProviderHealthStatus> = new Map();
  private usageTracker: Map<AIProvider, { requests: number; cost: number; dailyRequests: number; monthlyRequests: number }> = new Map();
  private mistralProvider?: MistralEmbeddingProvider;
  private googleProvider?: GoogleEmbeddingProvider;
  private voyageProvider?: VoyageEmbeddingProvider;

  constructor(initialConfig?: Partial<EmbeddingConfig>) {
    // Default configuration
    this.config = {
      defaultProvider: 'cohere',
      fallbackProviders: ['voyage', 'mistral', 'google', 'cohere'],
      models: {
        cohere: 'embed-multilingual-v3.0',
        mistral: 'mistral-embed',
        google: 'gemini-embedding-001',
        voyage: 'voyage-multilingual-2',
        groq: 'groq-embed',
        gemini: 'gemini-embedding-001',
        cerebras: 'cerebras-embed',
        openrouter: 'openrouter-embed'
      },
      usage: {
        dailyLimit: 10000,
        monthlyLimit: 100000,
        costBudget: 50 // USD
      },
      monitoring: {
        enableHealthChecks: true,
        checkInterval: 5, // minutes
        alertThresholds: {
          errorRate: 0.1, // 10%
          responseTime: 5000, // 5 seconds
          costLimit: 0.8 // 80% of budget
        }
      },
      ...initialConfig
    };

    // Initialize providers
    this.initializeProviders();
    this.initializeUsageTracking();
    this.startHealthMonitoring();
  }

  /**
   * Generate embeddings using the best available provider
   */
  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const { texts, provider, model, timeout = 30000 } = request;

    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Check cache first
    const cachedEmbeddings = embeddingCache.get(texts, provider);
    if (cachedEmbeddings) {
      console.log('Embedding cache hit');
      return {
        embeddings: cachedEmbeddings,
        provider: provider || this.config.defaultProvider,
        model: model || this.config.models[provider || this.config.defaultProvider],
        dimensions: cachedEmbeddings[0]?.length || 1024,
        usage: {
          requestCount: 0, // Cached, no actual request
          totalTokens: 0,
          cost: 0
        },
        timestamp: new Date().toISOString()
      };
    }

    // Try specified provider first, then fall back to configured order
    const providersToTry = provider ? [provider] : this.getProviderPriorityOrder();

    let lastError: Error | null = null;

    for (const providerToTry of providersToTry) {
      try {
        // Check if provider is healthy and within limits
        const health = this.healthStatus.get(providerToTry);
        if (health && !health.healthy) {
          console.warn(`Provider ${providerToTry} is unhealthy, skipping`);
          continue;
        }

        // Check usage limits
        if (!this.checkUsageLimits(providerToTry)) {
          console.warn(`Provider ${providerToTry} exceeded usage limits, skipping`);
          continue;
        }

        // Generate embeddings
        const result = await this.generateWithProvider(providerToTry, texts, model, timeout);
        
        // Cache the result
        embeddingCache.set(texts, result.embeddings, result.provider, result.model);
        
        // Update usage tracking
        this.updateUsageTracking(providerToTry, result.usage.cost);

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Provider ${providerToTry} failed:`, lastError.message);
        continue;
      }
    }

    // If all providers failed, throw the last error
    throw new Error(`All embedding providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate embeddings with a specific provider
   */
  private async generateWithProvider(
    provider: AIProvider,
    texts: string[],
    model?: string,
    timeout?: number
  ): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const finalModel = model || this.config.models[provider];

    let embeddings: number[][];
    let dimensions: number;
    let cost = 0;

    switch (provider) {
      case 'cohere':
        const cohereResult = await cohereClient.generateEmbeddings({
          texts,
          model: finalModel,
          timeout
        });
        embeddings = cohereResult;
        dimensions = cohereResult[0]?.length || 1024;
        cost = this.calculateCost(provider, texts);
        break;

      case 'mistral':
        const mistralResult = await this.getMistralProvider().generateEmbeddings({
          texts,
          model: finalModel,
          timeout
        });
        embeddings = mistralResult;
        dimensions = mistralResult[0]?.length || 1024;
        cost = this.calculateCost(provider, texts);
        break;

      case 'google':
        const googleResult = await this.getGoogleProvider().generateEmbeddings({
          texts,
          model: finalModel,
          timeout
        });
        embeddings = googleResult;
        dimensions = googleResult[0]?.length || 768;
        cost = this.calculateCost(provider, texts);
        break;

      case 'voyage':
        const voyageResult = await this.getVoyageProvider().generateEmbeddings({
          texts,
          model: finalModel,
          timeout
        });
        embeddings = voyageResult;
        dimensions = voyageResult[0]?.length || 1024;
        cost = this.calculateCost(provider, texts);
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    return {
      embeddings,
      provider,
      model: finalModel,
      dimensions,
      usage: {
        requestCount: 1,
        totalTokens: texts.reduce((sum, text) => sum + text.length, 0),
        cost
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for all providers
   */
  async performHealthCheck(): Promise<Record<AIProvider, ProviderHealthStatus>> {
    const healthResults: Record<AIProvider, ProviderHealthStatus> = {} as any;

    // Check Cohere
    try {
      const cohereHealth = await this.checkCohereHealth();
      healthResults.cohere = cohereHealth;
      this.healthStatus.set('cohere', cohereHealth);
    } catch (error) {
      healthResults.cohere = this.createFailedHealthStatus('cohere', error);
    }

    // Check Mistral
    try {
      const mistralHealth = await this.checkMistralHealth();
      healthResults.mistral = mistralHealth;
      this.healthStatus.set('mistral', mistralHealth);
    } catch (error) {
      healthResults.mistral = this.createFailedHealthStatus('mistral', error);
    }

    // Check Google
    try {
      const googleHealth = await this.checkGoogleHealth();
      healthResults.google = googleHealth;
      this.healthStatus.set('google', googleHealth);
    } catch (error) {
      healthResults.google = this.createFailedHealthStatus('google', error);
    }

    // Check Voyage
    try {
      const voyageHealth = await this.checkVoyageHealth();
      healthResults.voyage = voyageHealth;
      this.healthStatus.set('voyage', voyageHealth);
    } catch (error) {
      healthResults.voyage = this.createFailedHealthStatus('voyage', error);
    }

    return healthResults;
  }

  /**
   * Get provider configuration for admin interface
   */
  getAdminSettings(): AdminSettings {
    const settings: AdminSettings = {
      providers: {
        cohere: {
          enabled: true,
          model: this.config.models.cohere,
          priority: 1,
          rateLimits: {
            requestsPerMinute: 100,
            requestsPerDay: 10000,
            requestsPerMonth: 100000
          },
          cost: {
            pricePerToken: 0.0001,
            dailyBudget: 10,
            monthlyBudget: 100
          }
        },
        mistral: {
          enabled: process.env.MISTRAL_API_KEY ? true : false,
          model: this.config.models.mistral,
          priority: 2,
          rateLimits: {
            requestsPerMinute: 60,
            requestsPerDay: 5000,
            requestsPerMonth: 50000
          },
          cost: {
            pricePerToken: 0.00005,
            dailyBudget: 5,
            monthlyBudget: 50
          }
        },
        google: {
          enabled: (process.env.GOOGLE_API_KEY || process.env.GOOGLE_CLOUD_PROJECT_ID) ? true : false,
          model: this.config.models.google,
          priority: 3,
          rateLimits: {
            requestsPerMinute: 300,
            requestsPerDay: 20000,
            requestsPerMonth: 200000
          },
          cost: {
            pricePerToken: 0.00001,
            dailyBudget: 2,
            monthlyBudget: 20
          }
        },
        voyage: {
          enabled: process.env.VOYAGE_API_KEY ? true : false,
          model: this.config.models.voyage,
          priority: 4,
          rateLimits: {
            requestsPerMinute: 100,
            requestsPerDay: 10000,
            requestsPerMonth: 100000
          },
          cost: {
            pricePerToken: 0.00012,
            dailyBudget: 10,
            monthlyBudget: 100
          }
        }
      },
      defaultProvider: this.config.defaultProvider,
      fallbackProviders: this.config.fallbackProviders,
      models: this.config.models,
      monitoring: {
        enabled: this.config.monitoring.enableHealthChecks,
        healthCheckInterval: this.config.monitoring.checkInterval,
        alertThresholds: this.config.monitoring.alertThresholds
      }
    };

    return settings;
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(
    provider: AIProvider,
    config: Partial<AdminSettings['providers'][AIProvider]>
  ): Promise<void> {
    const currentConfig = this.getAdminSettings();
    
    if (currentConfig.providers[provider]) {
      const existingConfig = currentConfig.providers[provider];
      if (existingConfig) {
        currentConfig.providers[provider] = {
          ...existingConfig,
          ...config
        };
      }
    }

    // Update internal config
    if (config && config.model) {
      this.config.models[provider] = config.model;
    }

    console.log(`Updated configuration for provider: ${provider}`);
  }

  /**
   * Update default provider
   */
  async setDefaultProvider(provider: AIProvider): Promise<void> {
    this.config.defaultProvider = provider;
    console.log(`Default provider set to: ${provider}`);
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(): {
    total: { requests: number; cost: number };
    byProvider: Record<AIProvider, { requests: number; cost: number; health: boolean }>;
  } {
    const total = { requests: 0, cost: 0 };
    const byProvider: Record<AIProvider, { requests: number; cost: number; health: boolean }> = {} as any;

    for (const [provider, usage] of this.usageTracker.entries()) {
      total.requests += usage.requests;
      total.cost += usage.cost;

      const health = this.healthStatus.get(provider);
      byProvider[provider] = {
        requests: usage.requests,
        cost: usage.cost,
        health: health?.healthy ?? false
      };
    }

    return { total, byProvider };
  }

  /**
   * Reset usage tracking
   */
  resetUsageTracking(): void {
    this.usageTracker.clear();
    console.log('Usage tracking reset');
  }

  // Private helper methods

  private getProviderPriorityOrder(): AIProvider[] {
    const providers: AIProvider[] = [this.config.defaultProvider];
    
    // Add fallbacks, excluding the default provider
    for (const fallback of this.config.fallbackProviders) {
      if (fallback !== this.config.defaultProvider) {
        providers.push(fallback);
      }
    }

    return providers;
  }

  private checkUsageLimits(provider: AIProvider): boolean {
    const usage = this.usageTracker.get(provider);
    if (!usage) return true;

    const providerConfig = this.getAdminSettings().providers[provider];
    if (!providerConfig) return false;

    return usage.dailyRequests < providerConfig.rateLimits.requestsPerDay;
  }

  private calculateCost(provider: AIProvider, texts: string[]): number {
    const tokens = texts.reduce((sum, text) => sum + text.length, 0);
    const providerSettings = this.getAdminSettings().providers[provider];
    
    if (providerSettings?.cost.pricePerToken) {
      return tokens * providerSettings.cost.pricePerToken;
    }

    // Default costs
    const defaultCosts: Partial<Record<AIProvider, number>> = {
      cohere: 0.0001,
      mistral: 0.00005,
      google: 0.00001,
      voyage: 0.00012
    };

    return tokens * (defaultCosts[provider] || 0.0001);
  }

  private async checkCohereHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      const health = await cohereClient.healthCheck();
      const usage = this.usageTracker.get('cohere') || { requests: 0, cost: 0, dailyRequests: 0, monthlyRequests: 0 };
      return {
        provider: 'cohere',
        healthy: health.healthy,
        responseTime: health.responseTime,
        lastCheck: new Date().toISOString(),
        usage: {
          requests: usage.requests,
          cost: usage.cost,
          limits: {
            daily: usage.dailyRequests,
            monthly: usage.monthlyRequests
          }
        }
      };
    } catch (error) {
      return this.createFailedHealthStatus('cohere', error);
    }
  }

  private async checkMistralHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      const health = await this.getMistralProvider().healthCheck();
      const usage = this.usageTracker.get('mistral') || { requests: 0, cost: 0, dailyRequests: 0, monthlyRequests: 0 };
      return {
        provider: 'mistral',
        healthy: health.healthy,
        responseTime: health.responseTime,
        lastCheck: new Date().toISOString(),
        error: health.error,
        usage: {
          requests: usage.requests,
          cost: usage.cost,
          limits: {
            daily: usage.dailyRequests,
            monthly: usage.monthlyRequests
          }
        }
      };
    } catch (error) {
      return this.createFailedHealthStatus('mistral', error);
    }
  }

  private async checkGoogleHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      const health = await this.getGoogleProvider().healthCheck();
      const usage = this.usageTracker.get('google') || { requests: 0, cost: 0, dailyRequests: 0, monthlyRequests: 0 };
      return {
        provider: 'google',
        healthy: health.healthy,
        responseTime: health.responseTime,
        lastCheck: new Date().toISOString(),
        error: health.error,
        usage: {
          requests: usage.requests,
          cost: usage.cost,
          limits: {
            daily: usage.dailyRequests,
            monthly: usage.monthlyRequests
          }
        }
      };
    } catch (error) {
      return this.createFailedHealthStatus('google', error);
    }
  }

  private async checkVoyageHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      const health = await this.getVoyageProvider().healthCheck();
      const usage = this.usageTracker.get('voyage') || { requests: 0, cost: 0, dailyRequests: 0, monthlyRequests: 0 };
      return {
        provider: 'voyage',
        healthy: health.healthy,
        responseTime: health.responseTime,
        lastCheck: new Date().toISOString(),
        error: health.error,
        usage: {
          requests: usage.requests,
          cost: usage.cost,
          limits: {
            daily: usage.dailyRequests,
            monthly: usage.monthlyRequests
          }
        }
      };
    } catch (error) {
      return this.createFailedHealthStatus('voyage', error);
    }
  }

  private createFailedHealthStatus(provider: AIProvider, error: any): ProviderHealthStatus {
    const usage = this.usageTracker.get(provider) || { requests: 0, cost: 0, dailyRequests: 0, monthlyRequests: 0 };
    return {
      provider,
      healthy: false,
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      usage: {
        requests: usage.requests,
        cost: usage.cost,
        limits: {
          daily: usage.dailyRequests,
          monthly: usage.monthlyRequests
        }
      }
    };
  }

  private updateUsageTracking(provider: AIProvider, cost: number): void {
    const current = this.usageTracker.get(provider) || { requests: 0, cost: 0, dailyRequests: 0, monthlyRequests: 0 };
    
    this.usageTracker.set(provider, {
      requests: current.requests + 1,
      cost: current.cost + cost,
      dailyRequests: current.dailyRequests + 1,
      monthlyRequests: current.monthlyRequests + 1
    });
  }

  private initializeProviders(): void {
    try {
      if (process.env.MISTRAL_API_KEY) {
        this.mistralProvider = new MistralEmbeddingProvider(process.env.MISTRAL_API_KEY);
      }
    } catch (error) {
      console.warn('Failed to initialize Mistral provider:', error);
    }

    try {
      this.googleProvider = new GoogleEmbeddingProvider(
        process.env.GOOGLE_API_KEY,
        process.env.GOOGLE_CLOUD_PROJECT_ID,
        process.env.GOOGLE_CLOUD_LOCATION
      );
    } catch (error) {
      console.warn('Failed to initialize Google provider:', error);
    }

    try {
      if (process.env.VOYAGE_API_KEY) {
        this.voyageProvider = new VoyageEmbeddingProvider(process.env.VOYAGE_API_KEY);
      }
    } catch (error) {
      console.warn('Failed to initialize Voyage provider:', error);
    }
  }

  private getMistralProvider(): MistralEmbeddingProvider {
    if (!this.mistralProvider) {
      throw new Error('Mistral provider not initialized. Set MISTRAL_API_KEY.');
    }
    return this.mistralProvider;
  }

  private getGoogleProvider(): GoogleEmbeddingProvider {
    if (!this.googleProvider) {
      throw new Error('Google provider not initialized. Set GOOGLE_API_KEY or GOOGLE_CLOUD_PROJECT_ID.');
    }
    return this.googleProvider;
  }

  private getVoyageProvider(): VoyageEmbeddingProvider {
    if (!this.voyageProvider) {
      throw new Error('Voyage provider not initialized. Set VOYAGE_API_KEY.');
    }
    return this.voyageProvider;
  }

  private initializeUsageTracking(): void {
    // Initialize usage tracking for all providers
    const providers: AIProvider[] = ['cohere', 'mistral', 'google', 'voyage'];
    providers.forEach(provider => {
      this.usageTracker.set(provider, { requests: 0, cost: 0, dailyRequests: 0, monthlyRequests: 0 });
    });
  }

  private startHealthMonitoring(): void {
    if (!this.config.monitoring.enableHealthChecks) {
      return;
    }

    // Perform initial health check
    this.performHealthCheck();

    // Set up periodic health checks
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.warn('Health check failed:', error);
      }
    }, this.config.monitoring.checkInterval * 60 * 1000);
  }
}

// Export singleton instance
export const unifiedEmbeddingService = new UnifiedEmbeddingService();

// Convenience functions
export const generateEmbeddings = (request: EmbeddingRequest) => 
  unifiedEmbeddingService.generateEmbeddings(request);

export const getEmbeddingHealth = () => 
  unifiedEmbeddingService.getUsageStatistics();

export const getAdminSettings = () => 
  unifiedEmbeddingService.getAdminSettings();
