// Enhanced Gemini Provider Client for AI Service Manager
// =====================================================

import type { AIServiceManagerResponse } from '@/types/ai-service-manager';

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
  role?: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
  tools?: Array<{
    functionDeclarations?: Array<{
      name: string;
      description: string;
      parameters?: any;
    }>;
  }>;
  toolConfig?: {
    functionCallingConfig: {
      mode: string;
      allowedFunctionNames?: string[];
    };
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: any;
  };
}

export class GeminiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly timeout: number = 25000; // 25 seconds as specified
  private readonly maxRetries: number = 2;
  private readonly retryDelay: number = 2000; // 2 seconds as specified

  constructor(apiKey?: string) {
    const envKey = process.env.GEMINI_API_KEY || '';
    this.apiKey = (apiKey && apiKey.trim()) ? apiKey : envKey;
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  /**
   * Main chat completion method with web search support
   */
  async chat(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    webSearchEnabled?: boolean;
    timeout?: number;
  }): Promise<AIServiceManagerResponse> {
    const startTime = Date.now();
    const timeout = params.timeout || this.timeout;

    const model = params.model || this.getDefaultModel();
    
    // Convert OpenAI format to Gemini format
    const contents = this.convertMessagesToGeminiFormat(params.messages);
    
    const request: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: params.temperature || 0.7,
        maxOutputTokens: params.maxTokens || 2048,
        topP: 0.8,
        topK: 40
      }
    };

    // Add web search tools if enabled
    if (params.webSearchEnabled) {
      request.tools = [
        {
          functionDeclarations: [
            {
              name: 'web_search',
              description: 'Search the web for current information',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query'
                  }
                },
                required: ['query']
              }
            }
          ]
        }
      ];
      
      request.toolConfig = {
        functionCallingConfig: {
          mode: 'ANY'
        }
      };
    }

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(model, request, timeout);
        const latency = Date.now() - startTime;

        // Calculate tokens used
        const tokensUsed = {
          input: response.usageMetadata?.promptTokenCount || 0,
          output: response.usageMetadata?.candidatesTokenCount || 0
        };

        const content = response.candidates[0]?.content?.parts[0]?.text || 'No response generated';

        return {
          content,
          model_used: model,
          provider: 'gemini',
          query_type: 'time_sensitive', // Gemini primarily for time-sensitive queries
          tier_used: 1,
          cached: false,
          tokens_used: tokensUsed,
          latency_ms: latency,
          web_search_enabled: params.webSearchEnabled || false,
          fallback_used: false,
          limit_approaching: false
        };

      } catch (error) {
        if (attempt === this.maxRetries) {
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
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): AsyncIterable<string> {
    const timeout = params.timeout || this.timeout;
    const model = params.model || this.getDefaultModel();

    const contents = this.convertMessagesToGeminiFormat(params.messages);
    
    const request: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: params.temperature || 0.7,
        maxOutputTokens: params.maxTokens || 2048,
        topP: 0.8,
        topK: 40
      }
    };

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
      timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as GeminiError;
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
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
          if (line.trim() && line.startsWith('{')) {
            try {
              const parsed = JSON.parse(line);
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
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
      const testRequest: GeminiRequest = {
        contents: [
          {
            parts: [{ text: 'Hello' }]
          }
        ]
      };

      await this.makeRequest(this.getDefaultModel(), testRequest, 5000);
      
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
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash'
    ];
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): {
    requestsPerMinute: number;
    requestsPerDay: number;
  } {
    return {
      requestsPerMinute: 60,
      requestsPerDay: 1500
    };
  }

  /**
   * Check if model supports specific features
   */
  getModelCapabilities(model: string): {
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    supportsWebSearch: boolean;
    supportsImageInput: boolean;
    maxTokens: number;
  } {
    const modelCapabilities: Record<string, {
      supportsStreaming: boolean;
      supportsFunctionCalling: boolean;
      supportsWebSearch: boolean;
      supportsImageInput: boolean;
      maxTokens: number;
    }> = {
      "gemini-2.0-flash": {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsWebSearch: true,
        supportsImageInput: true,
        maxTokens: 1048576
      },
      "gemini-2.0-flash-lite": {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsWebSearch: true,
        supportsImageInput: false,
        maxTokens: 8192
      },
      "gemini-2.5-flash": {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsWebSearch: false,
        supportsImageInput: true,
        maxTokens: 1048576
      }
    };

    if (model in modelCapabilities) {
      return modelCapabilities[model];
    }

    return {
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsWebSearch: false,
      supportsImageInput: true,
      maxTokens: 32768
    };
  }

  /**
   * Convert OpenAI message format to Gemini format
   */
  private convertMessagesToGeminiFormat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): GeminiContent[] {
    const contents: GeminiContent[] = [];

    for (const message of messages) {
      if (message.role === 'user') {
        contents.push({
          parts: [{ text: message.content }]
        });
      } else if (message.role === 'assistant') {
        contents.push({
          parts: [{ text: message.content }]
        });
      }
      // Note: Gemini handles system messages differently, typically as part of user content
    }

    return contents;
  }

  /**
   * Make HTTP request with proper error handling
   */
  private async makeRequest(model: string, request: GeminiRequest, timeout: number): Promise<GeminiResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
      timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as GeminiError;
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json() as Promise<GeminiResponse>;
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
      return new Error(`Gemini request timeout after ${latency}ms (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('429')) {
      return new Error(`Gemini rate limit exceeded (attempt ${attempt}/${this.maxRetries})`);
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return new Error('Gemini authentication failed - check API key');
    }
    
    return new Error(`Gemini error: ${error.message} (attempt ${attempt}/${this.maxRetries})`);
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
    return 'gemini-2.0-flash-lite'; // Default for time-sensitive queries
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    return apiKey && apiKey.length > 20;
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
      supportsWebSearch: boolean;
      supportsImageInput: boolean;
      maxContextLength: number;
    };
    rateLimits: {
      requestsPerMinute: number;
      requestsPerDay: number;
    };
  } {
    return {
      name: 'Gemini',
      tier: 1,
      models: this.getAvailableModels(),
      capabilities: {
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsWebSearch: true,
        supportsImageInput: true,
        maxContextLength: 1048576
      },
      rateLimits: this.getRateLimitInfo()
    };
  }
}

// Export factory function
export function createGeminiClient(apiKey?: string): GeminiClient {
  return new GeminiClient(apiKey);
}

// Export singleton instance
export const geminiClient = new GeminiClient();