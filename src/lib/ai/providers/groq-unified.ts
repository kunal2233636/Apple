// Groq Unified Provider Implementation
// ===================================

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
 * Groq Unified Provider Implementation
 * Uses OpenAI-compatible chat completions API
 */
export class GroqUnifiedProvider extends BaseUnifiedProvider {
  public readonly provider: AIProvider = 'groq';
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
   * Make chat completion request
   */
  protected async makeChatRequest(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = validateEnvVar(this.config.apiKeyEnv);
    if (!apiKey) {
      throw this.createError('MISSING_API_KEY', 'API key not found in environment', false);
    }

    const url = `${this.config.baseUrl}/openai/v1/chat/completions`;
    const messages = this.buildMessages(request);

    const body = {
      model: this.config.models.chat,
      messages,
      max_tokens: request.preferences?.maxTokens || 2048,
      temperature: request.preferences?.temperature || 0.7,
      stream: false,
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
        `Groq API error: ${response.status} ${response.statusText}`,
        response.status >= 500 || response.status === 429,
        { status: response.status, details: errorData }
      );
    }

    const data = await response.json();
    return this.parseOpenAIResponse(data, request);
  }

  /**
   * Make streaming chat completion request
   */
  protected async *makeStreamingChatRequest(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const apiKey = validateEnvVar(this.config.apiKeyEnv);
    if (!apiKey) {
      throw this.createError('MISSING_API_KEY', 'API key not found in environment', false);
    }

    const url = `${this.config.baseUrl}/openai/v1/chat/completions`;
    const messages = this.buildMessages(request);

    const body = {
      model: this.config.models.chat,
      messages,
      max_tokens: request.preferences?.maxTokens || 2048,
      temperature: request.preferences?.temperature || 0.7,
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
        `Groq API error: ${response.status} ${response.statusText}`,
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
              const chunk = this.parseStreamingChunk(parsed);
              if (chunk) {
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
    // Groq doesn't provide explicit rate limit headers in the same way
    // This is a placeholder for future implementation
    return {};
  }

  /**
   * Build messages array from request
   */
  private buildMessages(request: ChatRequest): any[] {
    const messages: any[] = [];

    // Add system context if present
    if (request.context?.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.context.systemPrompt,
      });
    }

    // Add study context if present
    if (request.context?.studyContext) {
      const studyContext = this.buildStudyContext(request.context.studyContext);
      if (studyContext) {
        messages.push({
          role: 'system',
          content: `Study Context: ${studyContext}`,
        });
      }
    }

    // Add conversation history
    if (request.context?.messages) {
      for (const msg of request.context.messages) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: request.message,
    });

    return messages;
  }

  /**
   * Build study context string
   */
  private buildStudyContext(studyContext: any): string {
    const parts: string[] = [];
    
    if (studyContext.currentSubject) {
      parts.push(`Current Subject: ${studyContext.currentSubject}`);
    }
    
    if (studyContext.topic) {
      parts.push(`Topic: ${studyContext.topic}`);
    }
    
    if (studyContext.difficulty) {
      parts.push(`Difficulty Level: ${studyContext.difficulty}`);
    }
    
    if (studyContext.learningGoals && studyContext.learningGoals.length > 0) {
      parts.push(`Learning Goals: ${studyContext.learningGoals.join(', ')}`);
    }
    
    if (studyContext.previousPerformance) {
      const perf = studyContext.previousPerformance;
      parts.push(`Previous Performance: ${perf.accuracy}% accuracy on ${perf.totalQuestions} questions`);
    }
    
    if (studyContext.notesContext) {
      parts.push(`Relevant Notes: ${studyContext.notesContext}`);
    }

    return parts.join('. ');
  }

  /**
   * Parse streaming chunk from SSE response
   */
  private parseStreamingChunk(data: any): ChatStreamChunk | null {
    if (!data.choices || !data.choices[0]) {
      return null;
    }

    const choice = data.choices[0];
    
    if (choice.delta && choice.delta.content) {
      return {
        id: `chunk-${Date.now()}`,
        type: 'content',
        data: choice.delta.content,
        timestamp: new Date(),
      };
    }

    return null;
  }
}

/**
 * Factory function to create Groq provider
 */
export function createGroqProvider(): GroqUnifiedProvider {
  const config: UnifiedProviderConfig = {
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
    priority: 10, // High priority for fallbacks
    enabled: true,
  };

  return new GroqUnifiedProvider(config);
}