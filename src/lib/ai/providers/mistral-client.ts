// Enhanced Mistral Provider Client for AI Service Manager
// =====================================================

import type { AIServiceManagerResponse } from '@/types/ai-service-manager';

interface MistralChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MistralRequest {
  model: string;
  messages: MistralChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  top_k?: number;
  min_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MistralClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.mistral.ai/v1';
  private readonly timeout: number = 25000;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 2000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }
  }

  /**
   * Main chat completion method
   */
  async chat(params: {
    messages: MistralChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): Promise<AIServiceManagerResponse> {
    const startTime = Date.now();
    const timeout = params.timeout || this.timeout;

    const model = params.model || this.getDefaultModel();
    const request: MistralRequest = {
      model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2048,
      stream: false,
      top_p: 0.9
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(request, timeout);
        const latency = Date.now() - startTime;

        const tokensUsed = {
          input: response.usage.prompt_tokens,
          output: response.usage.completion_tokens
        };

        return {
          content: response.choices[0]?.message?.content || 'No response generated',
          model_used: response.model,
          provider: 'mistral',
          query_type: 'general',
          tier_used: 4,
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
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const testRequest: MistralRequest = {
        model: this.getDefaultModel(),
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      };

      await this.makeRequest(testRequest, 5000);
      
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
      'mistral-large-latest',
      'mistral-large-2',
      'mistral-medium-latest',
      'mistral-small-latest',
      'codestral-latest',
      'mixtral-8x7b-instruct-v0.1',
      'mixtral-8x22b-instruct-v0.1'
    ];
  }

  /**
   * Get rate limit information (monthly)
   */
  getRateLimitInfo(): { requestsPerMonth: number } {
    return { requestsPerMonth: 500 };
  }

  /**
   * Get model capabilities
   */
  getModelCapabilities(model: string): {
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    supportsJsonMode: boolean;
    maxTokens: number;
  } {
    const isCodestral = model.includes('codestral');
    const isMixtral = model.includes('mixtral');
    
    return {
      supportsStreaming: !isCodestral, // Codestral doesn't support streaming
      supportsFunctionCalling: !isCodestral && !isMixtral,
      supportsJsonMode: !isCodestral,
      maxTokens: isCodestral ? 16384 : 32768
    };
  }

  private async makeRequest(request: MistralRequest, timeout: number): Promise<MistralResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
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
      throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json() as Promise<MistralResponse>;
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
      return new Error(`Mistral request timeout after ${latency}ms (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('429')) {
      return new Error(`Mistral rate limit exceeded (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return new Error('Mistral authentication failed - check API key');
    }
    
    return new Error(`Mistral error: ${error.message} (attempt ${attempt}/${this.maxRetries})`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDefaultModel(): string {
    return 'mistral-large-latest';
  }

  getProviderInfo() {
    return {
      name: 'Mistral',
      tier: 4,
      models: this.getAvailableModels(),
      capabilities: {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsJsonMode: true,
        maxContextLength: 32768
      },
      rateLimits: this.getRateLimitInfo()
    };
  }
}

export function createMistralClient(apiKey?: string): MistralClient {
  return new MistralClient(apiKey);
}

export const mistralClient = new MistralClient();