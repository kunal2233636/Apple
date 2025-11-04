// Main Chat Service Controller for Unified AI Chat System
// =====================================================

import {
  IChatService,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatSession,
  ChatMetrics,
  ProviderPerformanceMetrics,
  ChatServiceConfig,
  ChatContext,
  UserPreferences,
  ChatError,
  IUnifiedProvider,
  StreamingMetadata,
} from '@/types/chat';
import type { AIProvider } from '@/types/api-test';
import { UnifiedProviderRegistry } from './provider-registry';
import { generateId } from './unified-provider';

/**
 * Unified Chat Service
 * Main controller that handles chat requests, manages sessions, and coordinates providers
 */
export class UnifiedChatService implements IChatService {
  public readonly registry: UnifiedProviderRegistry;
  public readonly config: ChatServiceConfig;
  
  private sessions: Map<string, ChatSession> = new Map();
  private metrics: ChatMetrics[] = [];
  private providerMetrics: Map<AIProvider, ProviderPerformanceMetrics> = new Map();
  private sessionCleanupInterval?: number;
  private readonly SESSION_CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly DEFAULT_SESSION_TIMEOUT = 3600000; // 1 hour

  constructor(registry: UnifiedProviderRegistry, config: ChatServiceConfig) {
    this.registry = registry;
    this.config = {
      defaultProvider: config.defaultProvider || 'groq',
      fallbackProviders: config.fallbackProviders || ['cerebras', 'mistral', 'openrouter', 'gemini', 'cohere'],
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      enableHealthChecks: config.enableHealthChecks !== false,
      healthCheckInterval: config.healthCheckInterval || 30000,
      enableRateLimitTracking: config.enableRateLimitTracking !== false,
      streamChunkSize: config.streamChunkSize || 1024,
      maxConcurrentRequests: config.maxConcurrentRequests || 10,
    };

    // Start session cleanup
    this.startSessionCleanup();
    
    // Initialize provider metrics
    this.initializeProviderMetrics();
  }

  /**
   * Send a chat message with automatic fallback handling
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const requestId = generateId('req');
    
    try {
      // Get or create session
      const session = this.getOrCreateSession(request);
      
      // Prepare request with session context
      const enhancedRequest = this.enhanceRequestWithContext(request, session);
      
      // Get best available provider
      const provider = this.selectBestProvider(request.provider);
      
      // Make the request with fallback
      const response = await this.makeRequestWithFallback(enhancedRequest, provider);
      
      // Update session with new message
      this.updateSessionWithMessage(session, request.message, response);
      
      // Record metrics
      this.recordMetrics({
        sessionId: session.id,
        provider: response.provider,
        responseTime: Date.now() - startTime,
        tokensUsed: response.tokensUsed || 0,
        timestamp: new Date(),
        success: true,
      });
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Record error metrics
      const session = this.getOrCreateSession(request);
      this.recordMetrics({
        sessionId: session.id,
        provider: request.provider || this.config.defaultProvider,
        responseTime,
        tokensUsed: 0,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? {
          code: 'UNKNOWN_ERROR',
          message: error.message,
          provider: request.provider || this.config.defaultProvider,
          retryable: true,
        } : undefined,
      });
      
      throw error;
    }
  }

  /**
   * Stream a chat message with automatic fallback handling
   */
  async *streamMessage(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const startTime = Date.now();
    const requestId = generateId('req');
    
    try {
      // Get or create session
      const session = this.getOrCreateSession(request);
      
      // Prepare request with session context
      const enhancedRequest = this.enhanceRequestWithContext(request, session);
      
      // Get best available provider
      const provider = this.selectBestProvider(request.provider) as IUnifiedProvider;
      
      // Stream the response with fallback
      const stream = await this.makeStreamingRequestWithFallback(enhancedRequest, provider);
      
      let hasContent = false;
      let finalResponse: ChatResponse | null = null;
      
      for await (const chunk of stream) {
        yield chunk;
        
        if (chunk.type === 'content') {
          hasContent = true;
        } else if (chunk.type === 'metadata' && typeof chunk.data === 'object') {
          const metadata = chunk.data as StreamingMetadata;
          finalResponse = {
            id: `msg-${Date.now()}`,
            content: hasContent ? 'Stream completed' : 'No content received',
            provider: provider.provider,
            model: metadata.model || provider.config.models.chat,
            tokensUsed: metadata.tokensUsed,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }
      }
      
      // Update session with new message if we got content
      if (hasContent && finalResponse) {
        this.updateSessionWithMessage(session, request.message, finalResponse);
        
        // Record metrics
        this.recordMetrics({
          sessionId: session.id,
          provider: finalResponse.provider,
          responseTime: Date.now() - startTime,
          tokensUsed: finalResponse.tokensUsed || 0,
          timestamp: new Date(),
          success: true,
        });
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Yield error chunk
      const errorData = this.isChatError(error) ? error : this.createError('STREAMING_ERROR', 'Streaming request failed', true);
      const errorChunk: ChatStreamChunk = {
        id: `error-${Date.now()}`,
        type: 'error',
        data: errorData,
        timestamp: new Date(),
      };
      
      yield errorChunk;
      
      // Record error metrics
      const session = this.getOrCreateSession(request);
      this.recordMetrics({
        sessionId: session.id,
        provider: request.provider || this.config.defaultProvider,
        responseTime,
        tokensUsed: 0,
        timestamp: new Date(),
        success: false,
        error: this.isChatError(error) ? error : undefined,
      });
    }
  }

  /**
   * Create a new chat session
   */
  createSession(userId?: string, preferences?: Partial<UserPreferences>): string {
    const sessionId = generateId('session');
    const now = new Date();
    
    const session: ChatSession = {
      id: sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      context: {
        messages: [],
        ...preferences?.studyContext,
      },
      preferences: {
        temperature: preferences?.temperature || 0.7,
        maxTokens: preferences?.maxTokens || 2048,
        streamResponses: preferences?.streamResponses || false,
        timeoutMs: preferences?.timeoutMs || this.config.timeout,
        enableContextHistory: preferences?.enableContextHistory !== false,
        maxContextLength: preferences?.maxContextLength || 10,
        ...preferences,
      },
      providerPreference: preferences?.preferredProvider,
      metadata: {
        totalMessages: 0,
        totalTokens: 0,
        averageResponseTime: 0,
      },
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Check if an error is a ChatError
   */
  private isChatError(error: any): error is ChatError {
    return error &&
           typeof error.code === 'string' &&
           typeof error.message === 'string' &&
           typeof error.retryable === 'boolean' &&
           error.provider;
  }

  /**
   * Create a standardized ChatError
   */
  private createError(
    code: string,
    message: string,
    retryable: boolean,
    metadata?: Record<string, any>
  ): ChatError {
    return {
      code,
      message,
      provider: request.provider || this.config.defaultProvider,
      retryable,
      metadata,
    };
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): ChatSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  /**
   * Update a session
   */
  updateSession(sessionId: string, updates: Partial<ChatSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.lastActivity = new Date();
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get metrics for a session or all sessions
   */
  getMetrics(sessionId?: string): ChatMetrics[] {
    if (sessionId) {
      return this.metrics.filter(m => m.sessionId === sessionId);
    }
    return [...this.metrics];
  }

  /**
   * Get provider performance metrics
   */
  getProviderMetrics(): ProviderPerformanceMetrics[] {
    return Array.from(this.providerMetrics.values());
  }

  /**
   * Update service configuration
   */
  updateConfig(configUpdate: Partial<ChatServiceConfig>): void {
    // Note: In a real implementation, you might want to make config mutable
    // or create a new service instance with updated config
    console.warn('Config updates require service restart to take effect');
  }

  /**
   * Get current configuration
   */
  getConfig(): ChatServiceConfig {
    return { ...this.config };
  }

  /**
   * Clean up expired sessions and metrics
   */
  cleanup(): void {
    this.cleanupExpiredSessions();
    this.cleanupOldMetrics();
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = undefined;
    }
    
    this.sessions.clear();
    this.metrics = [];
    this.providerMetrics.clear();
  }

  // Private helper methods

  private getOrCreateSession(request: ChatRequest): ChatSession {
    let session: ChatSession | undefined;
    
    if (request.sessionId) {
      session = this.getSession(request.sessionId);
    }
    
    if (!session) {
      // Create a new session
      const sessionId = this.createSession(undefined, request.preferences);
      session = this.getSession(sessionId)!;
    }
    
    return session;
  }

  private enhanceRequestWithContext(request: ChatRequest, session: ChatSession): ChatRequest {
    return {
      ...request,
      context: {
        ...session.context,
        ...request.context,
        sessionId: session.id,
      },
    };
  }

  private selectBestProvider(requestedProvider?: AIProvider): IUnifiedProvider {
    try {
      return this.registry.getBestAvailableProvider(requestedProvider, true);
    } catch (error) {
      // If no provider is available, throw a descriptive error
      throw new Error(`No AI providers available. Please check provider configuration.`);
    }
  }

  private async makeRequestWithFallback(request: ChatRequest, primaryProvider: IUnifiedProvider): Promise<ChatResponse> {
    const providers = [primaryProvider, ...this.getFallbackProviders(primaryProvider.provider)];
    let lastError: ChatError | null = null;
    
    for (const provider of providers) {
      try {
        const response = await provider.chat(request);
        this.updateProviderMetrics(provider.provider, true);
        return response;
      } catch (error) {
        lastError = error as ChatError;
        this.updateProviderMetrics(provider.provider, false, error as ChatError);
        
        // Only retry on retryable errors
        if (!this.isChatError(error) || !error.retryable) {
          break;
        }
        
        // Add delay before next attempt
        await this.delay(this.config.retryDelay);
      }
    }
    
    throw lastError || new Error('All providers failed');
  }

  private async *makeStreamingRequestWithFallback(request: ChatRequest, primaryProvider: IUnifiedProvider): AsyncIterable<ChatStreamChunk> {
    const providers = [primaryProvider, ...this.getFallbackProviders(primaryProvider.provider)];
    let lastError: ChatError | null = null;
    
    for (const provider of providers) {
      try {
        const stream = provider.streamChat(request);
        this.updateProviderMetrics(provider.provider, true);
        
        for await (const chunk of stream) {
          yield chunk;
        }
        return;
      } catch (error) {
        lastError = error as ChatError;
        this.updateProviderMetrics(provider.provider, false, error as ChatError);
        
        // For streaming, we yield error and try next provider
        const errorChunk: ChatStreamChunk = {
          id: `error-${Date.now()}`,
          type: 'error',
          data: error as Error,
          timestamp: new Date(),
        };
        
        yield errorChunk;
        
        // Add delay before next attempt
        await this.delay(this.config.retryDelay);
      }
    }
    
    throw lastError || new Error('All providers failed for streaming');
  }

  private getFallbackProviders(excludedProvider: AIProvider): IUnifiedProvider[] {
    const allProviders = this.registry.getAllProviders();
    const fallbackOrder = [excludedProvider, ...this.config.fallbackProviders];
    
    return fallbackOrder
      .map(providerName => allProviders.find(p => p.provider === providerName))
      .filter((provider): provider is IUnifiedProvider => provider !== undefined);
  }

  private updateSessionWithMessage(session: ChatSession, userMessage: string, response: ChatResponse): void {
    // Add user message
    session.context.messages.push({
      id: generateId('msg'),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });
    
    // Add assistant response
    session.context.messages.push({
      id: response.id,
      role: 'assistant',
      content: response.content,
      timestamp: response.timestamp,
      metadata: {
        tokens: response.tokensUsed,
        model: response.model,
        provider: response.provider,
      },
    });
    
    // Update session metadata
    session.metadata.totalMessages += 2;
    session.metadata.totalTokens += response.tokensUsed || 0;
    session.metadata.lastProvider = response.provider;
    
    // Trim context if too long
    this.trimContextIfNeeded(session);
  }

  private trimContextIfNeeded(session: ChatSession): void {
    const maxLength = session.preferences.maxContextLength || 10;
    const messages = session.context.messages;
    
    if (messages.length > maxLength * 2) { // Multiply by 2 because we have user+assistant pairs
      // Keep system message if present, then take the most recent messages
      const systemMessage = messages.find(m => m.role === 'system');
      const recentMessages = messages.slice(-maxLength * 2);
      
      session.context.messages = systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
    }
  }

  private recordMetrics(metrics: ChatMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics (last 1000 entries)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  private updateProviderMetrics(provider: AIProvider, success: boolean, error?: ChatError): void {
    let metrics = this.providerMetrics.get(provider);
    
    if (!metrics) {
      metrics = {
        provider,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        averageTokensUsed: 0,
        errorTypes: {},
        rateLimitCount: 0,
        lastRequest: new Date(),
      };
      this.providerMetrics.set(provider, metrics);
    }
    
    metrics.totalRequests++;
    
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      
      if (error) {
        metrics.errorTypes[error.code] = (metrics.errorTypes[error.code] || 0) + 1;
        
        if (error.code === 'RATE_LIMIT' || error.code === 'QUOTA_EXCEEDED') {
          metrics.rateLimitCount++;
        }
      }
    }
    
    metrics.lastRequest = new Date();
  }

  private initializeProviderMetrics(): void {
    const providers = this.registry.getAllProviders();
    
    for (const provider of providers) {
      this.providerMetrics.set(provider.provider, {
        provider: provider.provider,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        averageTokensUsed: 0,
        errorTypes: {},
        rateLimitCount: 0,
        lastRequest: new Date(),
      });
    }
  }

  private startSessionCleanup(): void {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.SESSION_CLEANUP_INTERVAL);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessionIds: string[] = [];
    
    for (const [sessionId, session] of this.sessions) {
      const age = now - session.lastActivity.getTime();
      if (age > this.DEFAULT_SESSION_TIMEOUT) {
        expiredSessionIds.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessionIds) {
      this.sessions.delete(sessionId);
    }
  }

  private cleanupOldMetrics(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > oneDayAgo);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Chat Service Factory
 */
export class ChatServiceFactory {
  private static instance?: UnifiedChatService;
  private static registry?: UnifiedProviderRegistry;

  static createService(config: ChatServiceConfig): UnifiedChatService {
    // Create registry if not exists
    if (!this.registry) {
      this.registry = new UnifiedProviderRegistry(config);
    }
    
    // Create service
    this.instance = new UnifiedChatService(this.registry, config);
    
    return this.instance;
  }

  static getService(): UnifiedChatService {
    if (!this.instance) {
      throw new Error('Chat service not initialized. Call createService() first.');
    }
    return this.instance;
  }

  static setRegistry(registry: UnifiedProviderRegistry): void {
    this.registry = registry;
  }

  static reset(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = undefined;
    }
    if (this.registry) {
      this.registry.destroy();
      this.registry = undefined;
    }
  }
}

// Export singleton instance getter
export function getChatService(): UnifiedChatService {
  return ChatServiceFactory.getService();
}