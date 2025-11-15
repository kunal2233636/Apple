// Cohere Unified Provider with Chat Completion Support
// ===================================================

import { BaseUnifiedProvider } from '../chat/unified-provider';
import {
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ProviderStatus,
  UnifiedProviderConfig,
  ProviderCapabilities,
} from '@/types/chat';
import type { AIProvider } from '@/types/api-test';
import { validateEnvVar } from '../chat/unified-provider';

/**
 * Cohere Unified Provider Implementation
 * Supports both embeddings (existing) and chat completions (new)
 */
export class CohereUnifiedProvider extends BaseUnifiedProvider {
  public readonly provider: AIProvider = 'cohere';
  public readonly config: UnifiedProviderConfig;

  constructor(config: UnifiedProviderConfig) {
    super();
    this.config = config;
  }

  /**
   * Validate API key is present and properly formatted
   */
  protected async validateApiKey(): Promise<boolean> {
    const apiKey = validateEnvVar(this.config.apiKeyEnv);
    return this.isValidApiKeyFormat(apiKey || '');
  }

  /**
   * Make chat completion request using Cohere's chat API
   */
  protected async makeChatRequest(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = validateEnvVar(this.config.apiKeyEnv);
    if (!apiKey) {
      throw this.createError('MISSING_API_KEY', 'API key not found in environment', false);
    }

    const url = `${this.config.baseUrl}/v1/chat`;
    const messages = this.buildMessages(request);

    const body = {
      message: request.message,
      chat_history: messages,
      preamble: request.context?.systemPrompt || 'You are a helpful AI assistant for educational purposes.',
      max_tokens: request.preferences?.maxTokens || 2048,
      temperature: request.preferences?.temperature || 0.7,
      k: 0,
      p: 0.9,
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.getApiHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific Cohere errors
      if (response.status === 400) {
        throw this.createError(
          'INVALID_REQUEST',
          'Invalid request parameters',
          false,
          { details: errorData }
        );
      } else if (response.status === 401) {
        throw this.createError(
          'INVALID_API_KEY',
          'Invalid API key',
          false,
          { details: errorData }
        );
      } else if (response.status === 429) {
        throw this.createError(
          'RATE_LIMIT',
          'Rate limit exceeded',
          true,
          { details: errorData }
        );
      }
      
      throw this.createError(
        'REQUEST_FAILED',
        `Cohere API error: ${response.status} ${response.statusText}`,
        response.status >= 500,
        { status: response.status, details: errorData }
      );
    }

    const data = await response.json();
    return this.parseCohereResponse(data, request);
  }

  /**
   * Make streaming chat completion request
   */
  protected async *makeStreamingChatRequest(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const apiKey = validateEnvVar(this.config.apiKeyEnv);
    if (!apiKey) {
      throw this.createError('MISSING_API_KEY', 'API key not found in environment', false);
    }

    const url = `${this.config.baseUrl}/v1/chat`;
    const messages = this.buildMessages(request);

    const body = {
      message: request.message,
      chat_history: messages,
      preamble: request.context?.systemPrompt || 'You are a helpful AI assistant for educational purposes.',
      max_tokens: request.preferences?.maxTokens || 2048,
      temperature: request.preferences?.temperature || 0.7,
      k: 0,
      p: 0.9,
      stream: true,
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.getApiHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createError(
        'REQUEST_FAILED',
        `Cohere API error: ${response.status} ${response.statusText}`,
        response.status >= 500 || response.status === 429,
        { status: response.status, details: errorData }
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw this.createError('STREAM_ERROR', 'Failed to get response reader', false);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const chunk = this.parseCohereStreamingChunk(parsed);
              
              if (chunk && chunk.type === 'content') {
                fullContent += chunk.data as string;
                yield chunk;
              }
            } catch (parseError) {
              // Skip malformed JSON
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<ProviderStatus> {
    const startTime = Date.now();
    
    try {
      const isValidKey = await this.validateApiKey();
      
      if (!isValidKey) {
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

      // Make a simple test request
      const testRequest: ChatRequest = {
        message: 'Hello',
        preferences: { maxTokens: 10 },
      };

      const response = await this.makeChatRequest(testRequest);
      
      return {
        provider: this.provider,
        healthy: true,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorRate: 0,
        rateLimitStatus: {},
        capabilities: this.getCapabilities(),
      };
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

  /**
   * Get rate limit information
   */
  protected async getRateLimitInfo(): Promise<{
    remaining?: number;
    resetTime?: Date;
    limit?: number;
  }> {
    // Cohere provides rate limit info in response headers
    // This is a simplified implementation
    return {};
  }

  /**
   * Build messages array for Cohere format
   */
  private buildMessages(request: ChatRequest): any[] {
    const messages: any[] = [];

    // Add conversation history (excluding system messages)
    if (request.context?.messages) {
      for (const msg of request.context.messages) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
            message: msg.content,
          });
        }
      }
    }

    return messages;
  }

  /**
   * Parse Cohere chat response
   */
  private parseCohereResponse(data: any, request: ChatRequest): ChatResponse {
    if (!data.text) {
      throw this.createError('INVALID_RESPONSE', 'Invalid response format from Cohere API', false);
    }

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: data.text,
      provider: this.provider,
      model: this.config.models.chat,
      tokensUsed: data.meta?.billed_units?.input_tokens + data.meta?.billed_units?.output_tokens,
      timestamp: new Date(),
      metadata: {
        finishReason: data.finish_reason,
        confidence: 0.8, // Cohere doesn't provide confidence scores directly
      },
    };
  }

  /**
   * Parse Cohere streaming chunk
   */
  private parseCohereStreamingChunk(data: any): ChatStreamChunk | null {
    if (data.event_type === 'text-generation' && data.text) {
      return {
        id: `chunk-${Date.now()}`,
        type: 'content',
        data: data.text,
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Generate embeddings (existing functionality)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = validateEnvVar(this.config.apiKeyEnv);
    if (!apiKey) {
      throw this.createError('MISSING_API_KEY', 'API key not found in environment', false);
    }

    const url = `${this.config.baseUrl}/v1/embed`;
    
    const body = {
      model: this.config.models.embedding || 'embed-multilingual-v3.0',
      texts: [text],
      input_type: 'classification',
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.getApiHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw this.createError(
        'EMBEDDING_FAILED',
        `Cohere embedding API error: ${response.status}`,
        response.status >= 500
      );
    }

    const data = await response.json();
    
    if (!data.embeddings || !data.embeddings[0] || !Array.isArray(data.embeddings[0].vector)) {
      throw this.createError('INVALID_EMBEDDING_RESPONSE', 'Invalid embedding response format', false);
    }

    return data.embeddings[0].vector;
  }
}

/**
 * Factory function to create Cohere provider
 */
export function createCohereProvider(): CohereUnifiedProvider {
  const config: UnifiedProviderConfig = {
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
      supportedFormats: 'cohere', // Custom format
      rateLimits: {
        requestsPerMinute: 100,
        tokensPerMinute: 20000,
      },
    },
    timeout: 30000,
    priority: 5, // Medium priority
    enabled: true,
  };

  return new CohereUnifiedProvider(config);
}
