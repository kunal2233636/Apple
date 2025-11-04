// Unified Provider Interface for AI Chat System
// ============================================

import {
  IUnifiedProvider,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ProviderStatus,
  ProviderCapabilities,
  UnifiedProviderConfig,
  ChatError,
  StreamingMetadata,
} from '@/types/chat';
import type { AIProvider } from '@/types/api-test';

// Base implementation for unified provider
export abstract class BaseUnifiedProvider implements IUnifiedProvider {
  public abstract readonly provider: AIProvider;
  public abstract readonly config: UnifiedProviderConfig;

  // Abstract methods to be implemented by each provider
  protected abstract validateApiKey(): Promise<boolean>;
  protected abstract makeChatRequest(request: ChatRequest): Promise<ChatResponse>;
  protected abstract makeStreamingChatRequest(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
  protected abstract performHealthCheck(): Promise<ProviderStatus>;
  protected abstract getRateLimitInfo(): Promise<{
    remaining?: number;
    resetTime?: Date;
    limit?: number;
  }>;

  // Helper method to check if error is ChatError
  protected isChatError(error: any): error is ChatError {
    return error && 
           typeof error.code === 'string' && 
           typeof error.message === 'string' && 
           typeof error.retryable === 'boolean' &&
           error.provider === this.provider;
  }

  // Core chat completion implementation
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // Validate provider is enabled and healthy
      if (!this.config.enabled) {
        throw this.createError('PROVIDER_DISABLED', 'Provider is disabled', false);
      }

      // Validate API key
      const isValidKey = await this.validateApiKey();
      if (!isValidKey) {
        throw this.createError('INVALID_API_KEY', 'API key validation failed', false);
      }

      // Make the actual chat request
      const response = await this.makeChatRequest(request);
      
      // Add metadata
      response.responseTime = Date.now() - startTime;
      response.provider = this.provider;
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (this.isChatError(error)) {
        throw error;
      }
      
      // Convert unknown errors to ChatError
      throw this.createError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        true,
        { originalError: String(error), responseTime }
      );
    }
  }

  // Streaming chat implementation
  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    try {
      // Validate provider supports streaming
      const capabilities = this.getCapabilities();
      if (!capabilities.supportsStreaming) {
        throw this.createError('STREAMING_NOT_SUPPORTED', 'Provider does not support streaming', false);
      }

      // Validate provider is enabled
      if (!this.config.enabled) {
        throw this.createError('PROVIDER_DISABLED', 'Provider is disabled', false);
      }

      // Validate API key
      const isValidKey = await this.validateApiKey();
      if (!isValidKey) {
        throw this.createError('INVALID_API_KEY', 'API key validation failed', false);
      }

      // Stream the response
      let tokenCount = 0;
      const startTime = Date.now();
      
      for await (const chunk of this.makeStreamingChatRequest(request)) {
        if (chunk.type === 'content') {
          tokenCount++;
        }
        
        yield chunk;
      }
      
      // Yield final metadata
      yield {
        id: `metadata-${Date.now()}`,
        type: 'metadata',
        data: {
          tokensUsed: tokenCount,
          provider: this.provider,
          model: this.config.models.chat,
          responseTime: Date.now() - startTime,
          finishReason: 'stop',
        } as StreamingMetadata,
        timestamp: new Date(),
      };
      
    } catch (error) {
      const errorData = this.isChatError(error) ? error : this.createError('STREAMING_ERROR', 'Streaming failed', true);
      const errorChunk: ChatStreamChunk = {
        id: `error-${Date.now()}`,
        type: 'error',
        data: errorData,
        timestamp: new Date(),
      };
      
      yield errorChunk;
    }
  }

  // Health check implementation
  async healthCheck(): Promise<ProviderStatus> {
    const startTime = Date.now();
    
    try {
      const status = await this.performHealthCheck();
      status.responseTime = Date.now() - startTime;
      status.lastCheck = new Date();
      return status;
    } catch (error) {
      return {
        provider: this.provider,
        healthy: false,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorRate: 1.0,
        rateLimitStatus: {},
        capabilities: this.getCapabilities(),
      };
    }
  }

  // Capabilities getter
  getCapabilities(): ProviderCapabilities {
    return this.config.capabilities;
  }

  // Rate limit status implementation
  async getRateLimitStatus() {
    try {
      return await this.getRateLimitInfo();
    } catch (error) {
      return {};
    }
  }

  // Connection validation
  async validateConnection(): Promise<boolean> {
    try {
      const isValidKey = await this.validateApiKey();
      const status = await this.performHealthCheck();
      return isValidKey && status.healthy;
    } catch (error) {
      return false;
    }
  }

  // Utility method to create standardized ChatError
  protected createError(
    code: string,
    message: string,
    retryable: boolean,
    metadata?: Record<string, any>
  ): ChatError {
    return {
      code,
      message,
      provider: this.provider,
      retryable,
      metadata,
    };
  }

  // Utility method to validate API key format
  protected isValidApiKeyFormat(apiKey: string): boolean {
    return !!(apiKey && apiKey.trim().length > 0);
  }

  // Utility method to handle fetch with timeout and retry logic
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // If successful, return response
        if (response.ok || attempt === maxRetries) {
          return response;
        }
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
          const delay = Math.min(retryAfter * 1000, baseDelay * Math.pow(2, attempt));
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // For other errors, don't retry
        if (response.status >= 400 && response.status < 500) {
          return response;
        }
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  // Utility method to parse OpenAI-style responses
  protected parseOpenAIResponse(data: any, request: ChatRequest): ChatResponse {
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw this.createError('INVALID_RESPONSE', 'Invalid response format from provider', false);
    }
    
    const choice = data.choices[0];
    const content = choice.message.content;
    
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content || '',
      provider: this.provider,
      model: this.config.models.chat,
      tokensUsed: data.usage?.total_tokens,
      timestamp: new Date(),
      metadata: {
        finishReason: choice.finish_reason,
        confidence: choice.message.role === 'assistant' ? 0.9 : undefined,
      },
    };
  }

  // Utility method to parse Google-style responses
  protected parseGoogleResponse(data: any, request: ChatRequest): ChatResponse {
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw this.createError('INVALID_RESPONSE', 'Invalid response format from Google API', false);
    }
    
    const candidate = data.candidates[0];
    const content = candidate.content.parts?.[0]?.text || '';
    
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      provider: this.provider,
      model: this.config.models.chat,
      timestamp: new Date(),
      metadata: {
        finishReason: candidate.finishReason,
        confidence: candidate.confidence || 0.8,
      },
    };
  }

  // Utility method to convert messages to provider-specific format
  protected convertMessages(messages: any[], provider: AIProvider): any {
    switch (provider) {
      case 'gemini':
        return this.convertToGoogleFormat(messages);
      default:
        return this.convertToOpenAIFormat(messages);
    }
  }

  // Convert to Google format
  protected convertToGoogleFormat(messages: any[]): any {
    const contents = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
    
    return { contents };
  }

  // Convert to OpenAI format
  protected convertToOpenAIFormat(messages: any[]): any {
    return { messages };
  }

  // Generate headers for API requests
  protected getApiHeaders(apiKey: string, additionalHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...additionalHeaders,
    };
  }
}

// Provider factory function type
export type ProviderFactory = (config: UnifiedProviderConfig) => IUnifiedProvider;

// Registry of provider factories
export const ProviderFactories: Map<AIProvider, ProviderFactory> = new Map();

// Utility function to create unique IDs
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to validate required environment variables (Node.js/Next.js safe)
export function validateEnvVar(name: string): string | null {
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
      return null;
    }
    return value;
  }
  
  // Browser fallback - could check localStorage or other storage
  if (typeof window !== 'undefined' && window.localStorage) {
    const value = window.localStorage.getItem(name);
    return value && value.trim() !== '' ? value : null;
  }
  
  return null;
}

// Utility function to create default provider configuration
export function createDefaultProviderConfig(
  provider: AIProvider,
  model: string,
  baseUrl: string,
  apiKeyEnv: string,
  capabilities: Partial<ProviderCapabilities> = {}
): UnifiedProviderConfig {
  const defaultCapabilities: ProviderCapabilities = {
    supportsStreaming: false,
    supportsSystemMessage: true,
    supportsFunctionCalling: false,
    supportsImageInput: false,
    supportedFormats: 'openai',
    rateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 60000,
    },
    ...capabilities,
  };

  return {
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    provider,
    apiKeyEnv,
    baseUrl,
    models: {
      chat: model,
    },
    capabilities: defaultCapabilities,
    timeout: 30000,
    priority: 1,
    enabled: true,
  };
}