// Enhanced OpenRouter Provider Client for AI Service Manager
// ========================================================

import type { AIServiceManagerResponse } from '@/types/ai-service-manager';

interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenRouterResponse {
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

export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://openrouter.ai/api/v1';
  private readonly timeout: number = 25000;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 2000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  /**
   * Main chat completion method
   */
  async chat(params: {
    messages: OpenRouterChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): Promise<AIServiceManagerResponse> {
    const startTime = Date.now();
    const timeout = params.timeout || this.timeout;

    const model = params.model || this.getDefaultModel();
    const request: OpenRouterRequest = {
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
          provider: 'openrouter',
          query_type: 'general',
          tier_used: 5,
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
      const testRequest: OpenRouterRequest = {
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
      'openai/gpt-3.5-turbo',
      'openai/gpt-4o',
      'openai/gpt-4-turbo',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-haiku',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-70b-instruct',
      'mistralai/mistral-7b-instruct',
      'qwen/qwen-2-72b-instruct'
    ];
  }

  /**
   * Get rate limit information (hourly)
   */
  getRateLimitInfo(): { requestsPerHour: number } {
    return { requestsPerHour: 100 };
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
    // Most OpenRouter models support streaming and function calling
    const isGPT = model.includes('gpt');
    const isClaude = model.includes('claude');
    const isGemini = model.includes('gemini');
    
    return {
      supportsStreaming: true,
      supportsFunctionCalling: isGPT || isClaude,
      supportsJsonMode: isGPT || isClaude,
      maxTokens: isGPT ? 32768 : 8192
    };
  }

  private async makeRequest(request: OpenRouterRequest, timeout: number): Promise<OpenRouterResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://blockwise.app',
          'X-Title': 'BlockWise AI Assistant',
        },
        body: JSON.stringify(request),
      },
      timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json() as Promise<OpenRouterResponse>;
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
      return new Error(`OpenRouter request timeout after ${latency}ms (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('429')) {
      return new Error(`OpenRouter rate limit exceeded (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return new Error('OpenRouter authentication failed - check API key');
    }
    
    return new Error(`OpenRouter error: ${error.message} (attempt ${attempt}/${this.maxRetries})`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDefaultModel(): string {
    return 'openai/gpt-3.5-turbo';
  }

  getProviderInfo() {
    return {
      name: 'OpenRouter',
      tier: 5,
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

export function createOpenRouterClient(apiKey?: string): OpenRouterClient {
  return new OpenRouterClient(apiKey);
}

export const openRouterClient = new OpenRouterClient();