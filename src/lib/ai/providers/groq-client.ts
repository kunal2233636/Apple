// Enhanced Groq Provider Client for AI Service Manager
// ===================================================

import type { AIProvider } from '@/types/api-test';
import type { AIServiceManagerResponse } from '@/types/ai-service-manager';

interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqRequest {
  model: string;
  messages: GroqChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface GroqResponse {
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

interface GroqError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export class GroqClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.groq.com/openai/v1';
  private readonly timeout: number = 25000; // 25 seconds as specified
  private readonly maxRetries: number = 2;
  private readonly retryDelay: number = 2000; // 2 seconds as specified

  constructor(apiKey?: string) {
    const envKey = process.env.GROQ_API_KEY || '';
    this.apiKey = (apiKey && apiKey.trim()) ? apiKey : envKey;
    if (!this.apiKey) {
      throw new Error('Groq API key is required');
    }
  }

  /**
   * Main chat completion method with standardized response format
   */
  async chat(params: {
    messages: GroqChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    webSearchEnabled?: boolean;
    timeout?: number;
  }): Promise<AIServiceManagerResponse> {
    const startTime = Date.now();
    const timeout = params.timeout || this.timeout;

    const model = params.model || this.getDefaultModel();
    const request: GroqRequest = {
      model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2048,
      stream: false
    };

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(request, timeout);
        const latency = Date.now() - startTime;

        // Calculate tokens used
        const tokensUsed = {
          input: response.usage.prompt_tokens,
          output: response.usage.completion_tokens
        };

        return {
          content: response.choices[0]?.message?.content || 'No response generated',
          model_used: response.model,
          provider: 'groq',
          query_type: 'general', // This will be set by the service manager
          tier_used: 1, // This will be set by the service manager
          cached: false,
          tokens_used: tokensUsed,
          latency_ms: latency,
          web_search_enabled: params.webSearchEnabled || false,
          fallback_used: false,
          limit_approaching: false
        };

      } catch (error) {
        if (attempt === this.maxRetries) {
          // Final attempt failed
          throw this.handleError(error, attempt, startTime);
        }

        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Streaming chat completion
   */
  async *streamChat(params: {
    messages: GroqChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): AsyncIterable<string> {
    const timeout = params.timeout || this.timeout;
    const model = params.model || this.getDefaultModel();

    const request: GroqRequest = {
      model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2048,
      stream: true
    };

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
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignore parsing errors for partial data
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Health check for the provider
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const testRequest: GroqRequest = {
        model: this.getDefaultModel(),
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      };

      await this.makeRequest(testRequest, 5000); // 5 second timeout for health check
      
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
      'llama-3.3-70b-versatile',
      'llama-3.3-70b-instruct',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'openai/gpt-oss-20b'
    ];
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): {
    requestsPerMinute: number;
    tokensPerMinute: number;
  } {
    return {
      requestsPerMinute: 500,
      tokensPerMinute: 30000
    };
  }

  /**
   * Check if model supports specific features
   */
  getModelCapabilities(model: string): {
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    supportsJsonMode: boolean;
    maxTokens: number;
  } {
    const modelCapabilities: Record<string, any> = {
      'llama-3.3-70b-versatile': {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsJsonMode: true,
        maxTokens: 32768
      },
      'llama-3.1-70b-versatile': {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsJsonMode: true,
        maxTokens: 32768
      },
      'llama-3.1-8b-instant': {
        supportsStreaming: true,
        supportsFunctionCalling: false,
        supportsJsonMode: true,
        maxTokens: 32768
      },
      'mixtral-8x7b-32768': {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsJsonMode: true,
        maxTokens: 32768
      },
      'gemma2-9b-it': {
        supportsStreaming: true,
        supportsFunctionCalling: false,
        supportsJsonMode: false,
        maxTokens: 8192
      }
    };

    return modelCapabilities[model] || {
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsJsonMode: false,
      maxTokens: 8192
    };
  }

  /**
   * Make HTTP request with proper error handling
   */
  private async makeRequest(request: GroqRequest, timeout: number): Promise<GroqResponse> {
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
      const errorData = await response.json().catch(() => ({})) as GroqError;
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json() as Promise<GroqResponse>;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
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

  /**
   * Handle and standardize errors
   */
  private handleError(error: any, attempt: number, startTime: number): Error {
    const latency = Date.now() - startTime;
    
    if (error.message?.includes('timeout')) {
      return new Error(`Groq request timeout after ${latency}ms (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('429')) {
      return new Error(`Groq rate limit exceeded (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return new Error('Groq authentication failed - check API key');
    }
    
    return new Error(`Groq error: ${error.message} (attempt ${attempt}/${this.maxRetries})`);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get default model based on use case
   */
  private getDefaultModel(): string {
    return 'llama-3.3-70b-versatile'; // Default model - updated
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    return apiKey && apiKey.startsWith('gsk_') && apiKey.length > 20;
  }

  /**
   * Get provider information
   */
  getProviderInfo(): {
    name: string;
    tier: number;
    models: string[];
    capabilities: {
      supportsStreaming: boolean;
      supportsFunctionCalling: boolean;
      supportsJsonMode: boolean;
      maxContextLength: number;
    };
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  } {
    return {
      name: 'Groq',
      tier: 1,
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

// Export factory function
export function createGroqClient(apiKey?: string): GroqClient {
  return new GroqClient(apiKey);
}

// Export singleton instance
export const groqClient = new GroqClient();