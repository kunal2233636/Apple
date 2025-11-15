// Enhanced Cohere Provider Client for AI Service Manager
// ====================================================

import type { AIServiceManagerResponse } from '@/types/ai-service-manager';

interface CohereChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CohereRequest {
  message: string;
  chat_history?: CohereChatMessage[];
  conversation_id?: string;
  temperature?: number;
  max_tokens?: number;
  k?: number;
  p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface CohereResponse {
  conversation_id: string;
  text: string;
  generation_id: string;
  meta: {
    api_version: {
      version: string;
    };
    billed_units: {
      input_tokens: number;
      output_tokens: number;
    };
    tokens: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

interface CohereEmbedRequest {
  texts: string[];
  model: string;
  input_type?: 'search_document' | 'search_query' | 'classification';
  truncate?: 'NONE' | 'START' | 'END';
}

interface CohereEmbedResponse {
  embeddings: number[][];
  id: string;
  meta: {
    billed_units: {
      input_tokens: number;
    };
  };
}

export class CohereClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.cohere.ai/v1';
  private readonly timeout: number = 25000;
  private readonly maxRetries: number = 2;
  private readonly retryDelay: number = 2000;

  constructor(apiKey?: string) {
    const envKey = process.env.COHERE_API_KEY || '';
    this.apiKey = (apiKey && apiKey.trim()) ? apiKey : envKey;
    if (!this.apiKey) {
      throw new Error('Cohere API key is required');
    }
  }

  /**
   * Main chat completion method
   */
  async chat(params: {
    message: string;
    chatHistory?: CohereChatMessage[];
    conversationId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): Promise<AIServiceManagerResponse> {
    const startTime = Date.now();
    const timeout = params.timeout || this.timeout;

    const request: CohereRequest = {
      message: params.message,
      chat_history: params.chatHistory,
      conversation_id: params.conversationId,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2048
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeChatRequest(request, timeout);
        const latency = Date.now() - startTime;

        const tokensUsed = {
          input: response.meta.tokens.input_tokens,
          output: response.meta.tokens.output_tokens
        };

        return {
          content: response.text,
          model_used: params.model || this.getDefaultModel(),
          provider: 'cohere',
          query_type: 'general',
          tier_used: 6,
          cached: false,
          tokens_used: tokensUsed,
          latency_ms: latency,
          web_search_enabled: false,
          fallback_used: false,
          limit_approaching: false
        };

      } catch (error) {
        if (attempt === this.maxRetries) {
          throw this.handleError(error, attempt, startTime);
        }
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(params: {
    texts: string[];
    model?: string;
    inputType?: 'search_document' | 'search_query' | 'classification';
    timeout?: number;
  }): Promise<number[][]> {
    const timeout = params.timeout || this.timeout;

    const request: CohereEmbedRequest = {
      texts: params.texts,
      model: params.model || this.getDefaultEmbeddingModel(),
      input_type: params.inputType || 'search_document',
      truncate: 'END'
    };

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/embed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
      timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Cohere embed API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json() as CohereEmbedResponse;
    return data.embeddings;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const testRequest = {
        message: 'Hello',
        max_tokens: 5
      };

      await this.makeChatRequest(testRequest, 5000);
      
      return {
        healthy: true,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'command',
      'command-light',
      'command-nightly',
      'command-light-nightly'
    ];
  }

  /**
   * Get embedding models
   */
  getEmbeddingModels(): string[] {
    return [
      'embed-multilingual-v3.0',  // Default multilingual model
      'embed-english-v3.0',
      'embed-english-light-v3.0',
      'embed-multilingual-light-v3.0'
    ];
  }

  /**
   * Get rate limit information (monthly)
   */
  getRateLimitInfo(): { requestsPerMonth: number } {
    return { requestsPerMonth: 1000 };
  }

  /**
   * Get model capabilities
   */
  getModelCapabilities(model: string): {
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    supportsEmbeddings: boolean;
    maxTokens: number;
  } {
    const isCommand = model.startsWith('command');
    return {
      supportsStreaming: false,
      supportsFunctionCalling: false,
      supportsEmbeddings: model.startsWith('embed-'),
      maxTokens: isCommand ? 4096 : 8192
    };
  }

  private async makeChatRequest(request: CohereRequest, timeout: number): Promise<CohereResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
      timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Cohere API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json() as Promise<CohereResponse>;
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  private handleError(error: any, attempt: number, startTime: number): Error {
    const latency = Date.now() - startTime;
    
    if (error.message?.includes('timeout')) {
      return new Error(`Cohere request timeout after ${latency}ms (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('429')) {
      return new Error(`Cohere rate limit exceeded (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return new Error('Cohere authentication failed - check API key');
    }
    
    return new Error(`Cohere error: ${error.message} (attempt ${attempt}/${this.maxRetries})`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDefaultModel(): string {
    return 'command';
  }

  private getDefaultEmbeddingModel(): string {
    return 'embed-multilingual-v3.0';
  }

  getProviderInfo() {
    return {
      name: 'Cohere',
      tier: 6,
      models: this.getAvailableModels(),
      capabilities: {
        supportsStreaming: false,
        supportsFunctionCalling: false,
        supportsEmbeddings: true,
        maxContextLength: 4096
      },
      rateLimits: this.getRateLimitInfo()
    };
  }
}

export function createCohereClient(apiKey?: string): CohereClient {
  return new CohereClient(apiKey);
}

export const cohereClient = new CohereClient();