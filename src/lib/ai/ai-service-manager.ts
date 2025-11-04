// AI Service Manager - The Brain of BlockWise AI System
// ===================================================

import type { 
  AIServiceManagerRequest,
  AIServiceManagerResponse,
  QueryType,
  ProviderTier,
  AppDataContext
} from '@/types/ai-service-manager';
import type { AIProvider } from '@/types/api-test';

// Import all core components
import { queryTypeDetector } from './query-type-detector';
import { rateLimitTracker } from './rate-limit-tracker';
import { responseCache } from './response-cache';
import { apiUsageLogger } from './api-logger';

// Import all provider clients
import { groqClient } from './providers/groq-client';
import { geminiClient } from './providers/gemini-client';
import { cerebrasClient } from './providers/cerebras-client';
import { cohereClient } from './providers/cohere-client';
import { mistralClient } from './providers/mistral-client';
import { openRouterClient } from './providers/openrouter-client';

// Fallback Chain Configuration
const FALLBACK_CHAINS: Record<QueryType, Array<{ provider: AIProvider; tier: ProviderTier }>> = {
  time_sensitive: [
    { provider: 'gemini', tier: 1 },
    { provider: 'groq', tier: 2 },
    { provider: 'cerebras', tier: 3 },
    { provider: 'mistral', tier: 4 },
    { provider: 'openrouter', tier: 5 },
    { provider: 'cohere', tier: 6 }
  ],
  app_data: [
    { provider: 'groq', tier: 1 },
    { provider: 'cerebras', tier: 2 },
    { provider: 'mistral', tier: 3 },
    { provider: 'gemini', tier: 4 },
    { provider: 'openrouter', tier: 5 },
    { provider: 'cohere', tier: 6 }
  ],
  general: [
    { provider: 'groq', tier: 1 },
    { provider: 'openrouter', tier: 2 },
    { provider: 'cerebras', tier: 3 },
    { provider: 'mistral', tier: 4 },
    { provider: 'gemini', tier: 5 },
    { provider: 'cohere', tier: 6 }
  ]
};

// Provider client registry
const PROVIDER_CLIENTS = {
  groq: groqClient,
  gemini: geminiClient,
  cerebras: cerebrasClient,
  cohere: cohereClient,
  mistral: mistralClient,
  openrouter: openRouterClient
} as const;

export class AIServiceManager {
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // 2 seconds

  /**
   * Main entry point - Process query through intelligent routing
   */
  async processQuery(request: AIServiceManagerRequest): Promise<AIServiceManagerResponse> {
    const startTime = Date.now();
    
    try {
      // Step 1: Check cache first
      const cachedResponse = responseCache.get(request);
      if (cachedResponse) {
        console.log(`Cache hit for user ${request.userId}, conversation ${request.conversationId}`);
        return cachedResponse.response;
      }

      // Step 2: Detect query type
      const queryDetection = queryTypeDetector.detectQueryType(request.message, request.chatType);
      console.log(`Query detected as: ${queryDetection.type} (confidence: ${queryDetection.confidence.toFixed(2)})`);

      // Step 3: Get app data context if needed
      let appDataContext: AppDataContext | undefined;
      if (request.includeAppData && queryDetection.type === 'app_data') {
        appDataContext = await this.getAppDataContext(request.userId);
      }

      // Step 4: Get fallback chain for this query type
      const fallbackChain = FALLBACK_CHAINS[queryDetection.type];

      // Step 5: Try providers in order with fallback
      let lastError: Error | null = null;
      let fallbackUsed = false;
      let tierUsed = 1;

      for (const { provider: providerName, tier } of fallbackChain) {
        try {
          // Check rate limits before attempting
          const rateLimitStatus = rateLimitTracker.checkRateLimit(providerName);
          if (rateLimitStatus.status === 'blocked') {
            console.log(`Skipping ${providerName} - rate limit blocked`);
            continue;
          }

          // Make request to provider
          const response = await this.callProvider({
            providerName,
            request,
            queryDetection,
            appDataContext,
            webSearchEnabled: queryTypeDetector.shouldEnableWebSearch(queryDetection.type, queryDetection.confidence),
            tier
          });

          // Record successful request
          await apiUsageLogger.logSuccess({
            userId: request.userId,
            featureName: 'ai_chat',
            provider: providerName,
            modelUsed: response.model_used,
            tokensInput: response.tokens_used.input,
            tokensOutput: response.tokens_used.output,
            latencyMs: response.latency_ms,
            cached: response.cached,
            queryType: queryDetection.type,
            tierUsed: tier,
            fallbackUsed
          });

          // Cache the response
          responseCache.set(request, response);

          return response;

        } catch (error) {
          lastError = error as Error;
          tierUsed = tier;
          
          // Record failed attempt
          await apiUsageLogger.logFailure({
            userId: request.userId,
            featureName: 'ai_chat',
            provider: providerName,
            modelUsed: 'unknown',
            tokensInput: 0,
            tokensOutput: 0,
            latencyMs: Date.now() - startTime,
            cached: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            queryType: queryDetection.type,
            tierUsed: tier,
            fallbackUsed
          });

          console.warn(`Provider ${providerName} (tier ${tier}) failed:`, error);
          
          // If this is not the first provider, mark as fallback used
          if (tier > 1) {
            fallbackUsed = true;
          }

          // If max retries reached or non-retryable error, continue to next provider
          if (tier >= fallbackChain.length) {
            break;
          }
        }
      }

      // Step 6: All providers failed, return graceful degradation
      const latency = Date.now() - startTime;
      const gracefulResponse: AIServiceManagerResponse = {
        content: this.getGracefulDegradationMessage(queryDetection.type),
        model_used: 'graceful_degradation',
        provider: 'system',
        query_type: queryDetection.type,
        tier_used: tierUsed,
        cached: false,
        tokens_used: { input: 0, output: 0 },
        latency_ms: latency,
        web_search_enabled: false,
        fallback_used: fallbackUsed,
        limit_approaching: false
      };

      // Log graceful degradation
      await apiUsageLogger.logFailure({
        userId: request.userId,
        featureName: 'ai_chat',
        provider: 'system',
        modelUsed: 'graceful_degradation',
        tokensInput: 0,
        tokensOutput: 0,
        latencyMs: latency,
        cached: false,
        errorMessage: 'All providers failed - graceful degradation',
        queryType: queryDetection.type,
        tierUsed: tierUsed,
        fallbackUsed
      });

      return gracefulResponse;

    } catch (error) {
      // Critical error handling
      const latency = Date.now() - startTime;
      console.error('AI Service Manager critical error:', error);

      return {
        content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
        model_used: 'error_handler',
        provider: 'system',
        query_type: 'general',
        tier_used: 6,
        cached: false,
        tokens_used: { input: 0, output: 0 },
        latency_ms: latency,
        web_search_enabled: false,
        fallback_used: false,
        limit_approaching: false
      };
    }
  }

  /**
   * Call a specific provider with error handling and retry logic
   */
  private async callProvider(params: {
    providerName: AIProvider;
    request: AIServiceManagerRequest;
    queryDetection: any;
    appDataContext?: AppDataContext;
    webSearchEnabled: boolean;
    tier: number;
  }): Promise<AIServiceManagerResponse> {
    const { providerName, request, queryDetection, appDataContext, webSearchEnabled, tier } = params;
    
    const client = PROVIDER_CLIENTS[providerName];
    if (!client) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    // Prepare messages
    const messages = this.prepareMessages(request, queryDetection, appDataContext);

    // Make the API call
    let response: AIServiceManagerResponse;
    
    switch (providerName) {
      case 'groq':
        response = await client.chat({
          messages,
          model: this.getModelForQuery(queryDetection.type, 'groq'),
          webSearchEnabled
        });
        break;
        
      case 'gemini':
        response = await client.chat({
          messages,
          model: this.getModelForQuery(queryDetection.type, 'gemini'),
          webSearchEnabled
        });
        break;
        
      case 'cerebras':
        response = await client.chat({
          messages,
          model: this.getModelForQuery(queryDetection.type, 'cerebras')
        });
        break;
        
      case 'cohere':
        response = await client.chat({
          message: request.message,
          chatHistory: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          model: this.getModelForQuery(queryDetection.type, 'cohere')
        });
        break;
        
      case 'mistral':
        response = await client.chat({
          messages,
          model: this.getModelForQuery(queryDetection.type, 'mistral')
        });
        break;
        
      case 'openrouter':
        response = await client.chat({
          messages,
          model: this.getModelForQuery(queryDetection.type, 'openrouter')
        });
        break;
        
      default:
        throw new Error(`Provider ${providerName} not implemented`);
    }

    // Update response with correct metadata
    response.tier_used = tier;
    response.query_type = queryDetection.type;
    response.web_search_enabled = webSearchEnabled;

    // Record rate limit usage
    rateLimitTracker.recordRequest(providerName, response.tokens_used.input + response.tokens_used.output);

    return response;
  }

  /**
   * Prepare messages with context and app data
   */
  private prepareMessages(
    request: AIServiceManagerRequest,
    queryDetection: any,
    appDataContext?: AppDataContext
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // System message based on query type
    let systemMessage = this.getSystemMessage(queryDetection.type, request.chatType);
    
    // Add app data context if available
    if (appDataContext) {
      systemMessage += `\n\nStudent Context:\n- Progress: ${appDataContext.studyProgress.completedBlocks}/${appDataContext.studyProgress.totalBlocks} blocks completed\n- Accuracy: ${appDataContext.studyProgress.accuracy}%\n- Strong subjects: ${appDataContext.recentActivity.topicsStrong.join(', ')}\n- Areas needing work: ${appDataContext.recentActivity.topicsStruggled.join(', ')}`;
    }

    messages.push({
      role: 'system',
      content: systemMessage
    });

    // Add user message
    messages.push({
      role: 'user',
      content: request.message
    });

    return messages;
  }

  /**
   * Get appropriate model for query type and provider
   */
  private getModelForQuery(queryType: QueryType, provider: AIProvider): string {
    const modelMappings: Record<QueryType, Record<AIProvider, string>> = {
      time_sensitive: {
        groq: 'llama-3.3-70b-versatile',
        gemini: 'gemini-2.0-flash-lite',
        cerebras: 'llama-3.3-70b',
        cohere: 'command',
        mistral: 'mistral-large-latest',
        openrouter: 'openai/gpt-3.5-turbo'
      },
      app_data: {
        groq: 'llama-3.3-70b-versatile',
        gemini: 'gemini-1.5-flash',
        cerebras: 'llama-3.3-70b',
        cohere: 'command',
        mistral: 'mistral-medium-latest',
        openrouter: 'openai/gpt-3.5-turbo'
      },
      general: {
        groq: 'llama-3.3-70b-versatile',
        gemini: 'gemini-1.5-flash',
        cerebras: 'llama-3.1-8b',
        cohere: 'command-light',
        mistral: 'mistral-small-latest',
        openrouter: 'openai/gpt-3.5-turbo'
      }
    };

    return modelMappings[queryType]?.[provider] || 'default';
  }

  /**
   * Get system message based on query type
   */
  private getSystemMessage(queryType: QueryType, chatType: string): string {
    const baseMessage = chatType === 'study_assistant' 
      ? 'You are a helpful study assistant for BlockWise, an educational platform.'
      : 'You are a helpful AI assistant for BlockWise users.';

    switch (queryType) {
      case 'time_sensitive':
        return `${baseMessage} You excel at providing current, time-sensitive information and answers. Be concise and accurate.`;

      case 'app_data':
        return `${baseMessage} You help students analyze their study progress and performance data. Provide insights based on their activity and achievements.`;

      case 'general':
      default:
        return `${baseMessage} Provide helpful, accurate, and engaging responses to student questions.`;
    }
  }

  /**
   * Get app data context for a user
   */
  private async getAppDataContext(userId: string): Promise<AppDataContext> {
    // This would integrate with the actual app data
    // For now, return mock data - in production, fetch from Supabase
    return {
      userId,
      studyProgress: {
        totalBlocks: 50,
        completedBlocks: 35,
        accuracy: 78,
        subjectsStudied: ['Mathematics', 'Physics', 'Chemistry'],
        timeSpent: 120 // hours
      },
      recentActivity: {
        lastStudySession: new Date(),
        questionsAnswered: 245,
        correctAnswers: 191,
        topicsStruggled: ['Integration', 'Electromagnetism'],
        topicsStrong: ['Algebra', 'Mechanics']
      },
      preferences: {
        difficulty: 'intermediate',
        subjects: ['Mathematics', 'Physics'],
        studyGoals: ['Exam preparation', 'Concept clarity']
      }
    };
  }

  /**
   * Get graceful degradation message
   */
  private getGracefulDegradationMessage(queryType: QueryType): string {
    switch (queryType) {
      case 'time_sensitive':
        return 'I apologize, but I\'m unable to access current information right now. Please try again later or check official sources for the latest updates.';
      
      case 'app_data':
        return 'I\'m having trouble accessing your study data right now. Please try again in a moment, or check your dashboard for the latest progress updates.';
      
      case 'general':
      default:
        return 'I\'m experiencing high demand right now. Please try again in a few moments, and I\'ll be happy to help!';
    }
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<Record<AIProvider, { healthy: boolean; responseTime: number; error?: string }>> {
    const results: Record<AIProvider, { healthy: boolean; responseTime: number; error?: string }> = {} as any;

    for (const providerName of Object.keys(PROVIDER_CLIENTS) as AIProvider[]) {
      try {
        const client = PROVIDER_CLIENTS[providerName];
        const health = await client.healthCheck();
        results[providerName] = health;
      } catch (error) {
        results[providerName] = {
          healthy: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Get system statistics
   */
  async getStatistics() {
    const rateLimitStats = rateLimitTracker.getStatistics();
    const cacheStats = responseCache.getStatistics();
    const healthStatus = await this.healthCheck();

    return {
      rateLimits: rateLimitStats,
      cache: cacheStats,
      providers: healthStatus,
      fallbackChains: FALLBACK_CHAINS
    };
  }
}

// Export singleton instance
export const aiServiceManager = new AIServiceManager();

// Export the main processQuery function
export const processQuery = (request: AIServiceManagerRequest): Promise<AIServiceManagerResponse> => {
  return aiServiceManager.processQuery(request);
};