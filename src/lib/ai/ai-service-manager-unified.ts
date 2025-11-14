import { studyBuddySettingsService } from './study-buddy-settings-service';
// AI Service Manager - Unified Stable Version
// ==========================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import type { 
  AIServiceManagerRequest,
  AIServiceManagerResponse,
  QueryType,
  ProviderTier,
  AppDataContext
} from '@/types/ai-service-manager';
import type { AIProvider } from '@/types/api-test';

// Import working provider clients
import { createGroqClient } from './providers/groq-client';
import { createGeminiClient } from './providers/gemini-client';
import { createCerebrasClient } from './providers/cerebras-client';
import { createCohereClient } from './providers/cohere-client';
import { createMistralClient } from './providers/mistral-client';
import { createOpenRouterClient } from './providers/openrouter-client';

// Import supporting services (optional)
import { responseCache } from './response-cache';
import { apiUsageLogger } from './api-logger';
import { rateLimitTracker } from './rate-limit-tracker';

// Dynamic Provider Configuration
interface ProviderConfig {
  client: any;
  healthy: boolean;
  lastCheck: number;
  responseTime: number;
  tier: number;
}

// Working providers only (to avoid missing implementations)
const ALL_PROVIDERS: Record<AIProvider, ProviderConfig> = {
  groq: { client: null, healthy: true, lastCheck: 0, responseTime: 0, tier: 1 },
  gemini: { client: null, healthy: true, lastCheck: 0, responseTime: 0, tier: 2 },
  cerebras: { client: null, healthy: true, lastCheck: 0, responseTime: 0, tier: 3 },
  cohere: { client: null, healthy: true, lastCheck: 0, responseTime: 0, tier: 4 },
  mistral: { client: null, healthy: true, lastCheck: 0, responseTime: 0, tier: 5 },
  openrouter: { client: null, healthy: true, lastCheck: 0, responseTime: 0, tier: 6 },
  google: { client: null, healthy: false, lastCheck: 0, responseTime: 0, tier: 7 }
};

// Fallback Chain Configuration (working providers only)
let DYNAMIC_FALLBACK_CHAINS: Record<QueryType, AIProvider[]> = {
  time_sensitive: ['gemini', 'groq', 'cerebras', 'mistral', 'openrouter', 'cohere'],
  app_data: ['groq', 'cerebras', 'mistral', 'gemini', 'openrouter', 'cohere'],
  general: ['groq', 'openrouter', 'cerebras', 'mistral', 'gemini', 'cohere']
};

export class AIServiceManager {
  private async createClientForProvider(providerName: AIProvider, userId: string | null) {
    const config = (ALL_PROVIDERS as any)[providerName];
    if (config?.client) return config.client;

    try {
      let apiKey: string | undefined;
      switch (providerName) {
        case 'groq':
          apiKey = process.env.GROQ_API_KEY;
          if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
          config.client = createGroqClient(apiKey);
          break;
        case 'gemini':
          apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
          config.client = createGeminiClient(apiKey);
          break;
        case 'cerebras':
          apiKey = process.env.CEREBRAS_API_KEY;
          if (!apiKey) throw new Error('CEREBRAS_API_KEY is not configured');
          config.client = createCerebrasClient(apiKey);
          break;
        case 'cohere':
          apiKey = process.env.COHERE_API_KEY;
          if (!apiKey) throw new Error('COHERE_API_KEY is not configured');
          config.client = createCohereClient(apiKey);
          break;
        case 'mistral':
          apiKey = process.env.MISTRAL_API_KEY;
          if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured');
          config.client = createMistralClient(apiKey);
          break;
        case 'openrouter':
          apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
          config.client = createOpenRouterClient(apiKey);
          break;
        default:
          throw new Error(`Unsupported provider: ${providerName}`);
      }
      console.log(`✅ Successfully created client for provider: ${providerName}`);
      return config.client;
    } catch (err) {
      // Mark provider as unhealthy when instantiation fails (likely missing API key)
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed to create client for provider ${providerName}: ${errorMessage}`);
      if (config) {
        config.healthy = false;
        config.lastCheck = Date.now();
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
  private healthCheckInterval: number = 300000; // 5 minutes
  private lastHealthCheck: number = 0;
  private isCheckingHealth: boolean = false;

  /**
   * Main entry point - Process query through intelligent routing
   */
  async processQuery(request: AIServiceManagerRequest): Promise<AIServiceManagerResponse> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`[${requestId}] Processing query for user ${request.userId}, conversation ${request.conversationId}`);
      
      // Step 1: Check cache first
      if (responseCache && typeof responseCache.get === 'function') {
        const cachedResponse = responseCache.get(request);
        if (cachedResponse) {
          console.log(`[${requestId}] Cache hit for user ${request.userId}`);
          return cachedResponse.response;
        }
      }

      // Step 2: Update provider health if needed
      await this.updateProviderHealthIfNeeded();

      // Step 3: Detect query type (simplified for now)
      const queryDetection = {
        type: this.detectQueryType(request.message) as QueryType,
        confidence: 0.8
      };
      console.log(`[${requestId}] Query detected as: ${queryDetection.type}`);

      // Step 4: Get available providers for this query type
      let availableProviders = this.getAvailableProviders(queryDetection.type);
      // If a preferred provider is specified, try it first
      const preferred = (request as any).preferredProvider as AIProvider | undefined;
      if (preferred && !availableProviders.includes(preferred)) {
        availableProviders = [preferred, ...availableProviders];
      } else if (preferred) {
        // Move to front
        availableProviders = [preferred, ...availableProviders.filter(p => p !== preferred)];
      }
      console.log(`[${requestId}] Available providers: ${availableProviders.join(', ')}${preferred ? ` (preferred: ${preferred})` : ''}`);

      // Step 5: Get app data context if needed
      let appDataContext: AppDataContext | undefined;
      if (request.includeAppData) {
        appDataContext = await this.getAppDataContext(request.userId);
      }

      // Step 6: Try providers in order
      let lastError: Error | null = null;
      let fallbackUsed = false;
      let providerUsed = 'none';
      const maxRetries = 3;
      const initialBackoff = 250; // ms

      for (const providerName of availableProviders) {
        try {
          console.log(`[${requestId}] Trying provider: ${providerName}`);
          
          // Check if provider is healthy
          const providerConfig = ALL_PROVIDERS[providerName];
          if (!providerConfig.healthy) {
            console.log(`[${requestId}] Skipping unhealthy provider: ${providerName}`);
            continue;
          }

          // Check rate limits (if tracker available)
          if (rateLimitTracker && typeof rateLimitTracker.checkRateLimit === 'function') {
            const rateLimitStatus = rateLimitTracker.checkRateLimit(providerName);
            if (rateLimitStatus.status === 'blocked') {
              console.log(`[${requestId}] Skipping ${providerName} - rate limit blocked`);
              continue;
            }
          }

          let attempt = 0;
          let currentError: Error | null = null;
          while(attempt < maxRetries) {
            try {
              // Make request to provider
              const response = await this.callProvider({
                providerName,
                request,
                queryDetection,
                appDataContext,
                tier: providerConfig.tier,
                requestId,
                preferredModel: (request as any).model
              });

              // Record successful request (if logger available)
              if (apiUsageLogger && typeof apiUsageLogger.logSuccess === 'function') {
                try {
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
                    tierUsed: providerConfig.tier,
                    fallbackUsed
                  });
                } catch (logError) {
                  console.warn('Failed to log success:', logError);
                }
              }

              // Cache the response (if cache available)
              if (responseCache && typeof responseCache.set === 'function') {
                responseCache.set(request, response);
              }

              console.log(`[${requestId}] Success with provider: ${providerName}`);
              return response;
            } catch (error) {
              currentError = error as Error;
              const errorMessage = currentError.message.toLowerCase();
              const isPermanentError = 
                errorMessage.includes('authentication') || 
                errorMessage.includes('401') || 
                errorMessage.includes('403') || 
                errorMessage.includes('invalid api') ||
                errorMessage.includes('unauthorized');

              if (isPermanentError) {
                console.warn(`[${requestId}] Provider ${providerName} failed with permanent error:`, currentError);
                this.markProviderUnhealthy(providerName);
                break; // Do not retry on permanent errors
              }

              attempt++;
              if (attempt < maxRetries) {
                const backoffTime = initialBackoff * Math.pow(2, attempt - 1);
                console.log(`[${requestId}] ⚠️  Provider ${providerName} failed (attempt ${attempt}/${maxRetries}). Error: ${currentError.message}`);
                console.log(`[${requestId}] Retrying in ${backoffTime}ms...`);
                await delay(backoffTime);
              } else {
                console.error(`[${requestId}] ❌ Provider ${providerName} failed after ${maxRetries} attempts`);
                console.error(`[${requestId}] Final error: ${currentError.message}`);
              }
            }
          }
          lastError = currentError;
          providerUsed = providerName;
          
          // If we've exhausted retries for a provider, it's considered a failure for that provider.
          // The outer loop will then proceed to the next provider in the fallback chain.
          if (lastError) {
            // Record failed attempt (if logger available)
            if (apiUsageLogger && typeof apiUsageLogger.logFailure === 'function') {
              try {
                await apiUsageLogger.logFailure({
                  userId: request.userId,
                  featureName: 'ai_chat',
                  provider: providerName,
                  modelUsed: 'unknown',
                  tokensInput: 0,
                  tokensOutput: 0,
                  latencyMs: Date.now() - startTime,
                  cached: false,
                  errorMessage: lastError.message,
                  queryType: queryDetection.type,
                  tierUsed: ALL_PROVIDERS[providerName].tier,
                  fallbackUsed
                });
              } catch (logError) {
                console.warn('Failed to log failure:', logError);
              }
            }
          }

          // If this is not the first provider, mark as fallback used
          if (fallbackUsed === false) {
            fallbackUsed = true;
          }
        } catch (error) {
          // This catch block is for errors in the retry logic itself, not provider calls.
          lastError = error as Error;
          providerUsed = providerName;
          console.error(`[${requestId}] Critical error in provider loop for ${providerName}:`, error);
        }
      }


      // Step 7: All providers failed, return graceful degradation
      const latency = Date.now() - startTime;
      
      // Log detailed failure information
      console.error(`\n========================================`);
      console.error(`[${requestId}] ❌ ALL PROVIDERS FAILED`);
      console.error(`========================================`);
      console.error(`Query Type: ${queryDetection.type}`);
      console.error(`User ID: ${request.userId}`);
      console.error(`Message: ${request.message.substring(0, 100)}...`);
      console.error(`Attempted providers: ${availableProviders.join(', ')}`);
      console.error(`Last error: ${lastError?.message || 'Unknown error'}`);
      console.error(`Total processing time: ${latency}ms`);
      console.error(`========================================\n`);
      
      // Check if any providers are configured
      const healthyProviders = Object.entries(ALL_PROVIDERS)
        .filter(([_, config]) => config.healthy)
        .map(([name]) => name);
      
      let errorMessage = this.getGracefulDegradationMessage(queryDetection.type);
      
      // If no healthy providers, provide more specific guidance
      if (healthyProviders.length === 0) {
        console.error(`[${requestId}] No healthy providers available. This usually means API keys are not configured.`);
        errorMessage = 'AI service is currently unavailable. Please check your API keys configuration. Visit the admin panel to configure your AI providers.';
      } else if (lastError?.message.includes('not configured')) {
        console.error(`[${requestId}] API key configuration issue detected.`);
        errorMessage = `AI service configuration error: ${lastError.message}. Please configure your AI provider API keys in the admin panel.`;
      }
      
      const gracefulResponse: AIServiceManagerResponse = {
        content: errorMessage,
        model_used: 'graceful_degradation',
        provider: 'system' as any,
        query_type: queryDetection.type,
        tier_used: 6,
        cached: false,
        tokens_used: { input: 0, output: 0 },
        latency_ms: latency,
        web_search_enabled: false,
        fallback_used: fallbackUsed,
        limit_approaching: false
      };

      // Log graceful degradation (if logger available)
      if (apiUsageLogger && typeof apiUsageLogger.logFailure === 'function') {
        try {
          await apiUsageLogger.logFailure({
            userId: request.userId,
            featureName: 'ai_chat',
            provider: 'system' as any,
            modelUsed: 'graceful_degradation',
            tokensInput: 0,
            tokensOutput: 0,
            latencyMs: latency,
            cached: false,
            errorMessage: `All providers failed - ${lastError?.message || 'Unknown error'}`,
            queryType: queryDetection.type,
            tierUsed: 6,
            fallbackUsed
          });
        } catch (logError) {
          console.warn('Failed to log graceful degradation:', logError);
        }
      }

      console.log(`[${requestId}] All providers failed, returning graceful degradation`);
      return gracefulResponse;

    } catch (error) {
      // Critical error handling
      const latency = Date.now() - startTime;
      console.error(`[${requestId}] AI Service Manager critical error:`, error);

      return {
        content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
        model_used: 'error_handler',
        provider: 'system' as any,
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
   * Detect query type from message content
   */
  private detectQueryType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Time-sensitive keywords
    const timeKeywords = ['current', 'latest', 'today', 'now', 'recent', 'news', 'update'];
    if (timeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'time_sensitive';
    }
    
    // App data keywords
    const appKeywords = ['progress', 'score', 'performance', 'study', 'grade', 'accuracy', 'completed'];
    if (appKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'app_data';
    }
    
    return 'general';
  }

  /**
   * Get available (healthy) providers for a query type
   */
  private getAvailableProviders(queryType: QueryType): AIProvider[] {
    const chain = DYNAMIC_FALLBACK_CHAINS[queryType] || ['groq', 'gemini'];
    return chain.filter(provider => {
      const config = ALL_PROVIDERS[provider];
      return config.healthy; // client instance is created on demand
    });
  }

  /**
   * Update provider health if needed
   */
  private async updateProviderHealthIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval || this.isCheckingHealth) {
      return;
    }

    this.isCheckingHealth = true;
    try {
      await this.performHealthCheck();
      this.lastHealthCheck = now;
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      this.isCheckingHealth = false;
    }
  }

  /**
   * Perform health check on all providers
   */
  private async performHealthCheck(): Promise<void> {
    console.log('Performing health check on all providers...');
    
    for (const [providerName, _config] of Object.entries(ALL_PROVIDERS)) {
      try {
        const startTime = Date.now();
        const tempClient = await this.createClientForProvider(providerName as any, null);
        await tempClient.healthCheck();
        const responseTime = Date.now() - startTime;
        
        const config = ALL_PROVIDERS[providerName as any];
        config.healthy = true;
        config.responseTime = responseTime;
        config.lastCheck = Date.now();
        
        console.log(`✅ ${providerName}: healthy (${responseTime}ms)`);
      } catch (error) {
        const config = ALL_PROVIDERS[providerName as any];
        config.healthy = false;
        config.lastCheck = Date.now();
        console.warn(`❌ ${providerName}: unhealthy - ${error}`);
      }
    }
    
    // Update fallback chains based on health
    this.updateFallbackChains();
  }

  /**
   * Update fallback chains to only include healthy providers
   */
  private updateFallbackChains(): void {
    const healthyProviders = Object.entries(ALL_PROVIDERS)
      .filter(([_, config]) => config.healthy && config.client !== null)
      .sort(([__, a], [___, b]) => a.tier - b.tier)
      .map(([provider]) => provider as AIProvider);
    
    console.log('Healthy providers:', healthyProviders.join(', '));
    
    // Update all chains to use only healthy providers
    for (const queryType of Object.keys(DYNAMIC_FALLBACK_CHAINS) as QueryType[]) {
      DYNAMIC_FALLBACK_CHAINS[queryType] = healthyProviders;
    }
  }

  /**
   * Mark provider as unhealthy
   */
  private markProviderUnhealthy(providerName: AIProvider): void {
    const config = ALL_PROVIDERS[providerName];
    if (config && config.client) {
      config.healthy = false;
      config.lastCheck = Date.now();
    }
  }

  /**
   * Call a specific provider
   */
  private async callProvider(params: {
    providerName: AIProvider;
    request: AIServiceManagerRequest;
    queryDetection: any;
    appDataContext?: AppDataContext;
    tier: number;
    requestId: string;
    preferredModel?: string;
  }): Promise<AIServiceManagerResponse> {
    const { providerName, request, queryDetection, appDataContext, tier, requestId, preferredModel } = params;
    
    // Resolve per-user api key and construct client
    const client = await this.createClientForProvider(providerName, request.userId);

    // Prepare messages
    const messages = this.prepareMessages(request, queryDetection, appDataContext);

    // Get the model to use (user preferred or default for query type)
    const modelToUse = this.getModelForQuery(queryDetection.type, providerName, preferredModel);
    
    console.log(`[${requestId}] Model selection: provider=${providerName}, userPreferred=${preferredModel}, finalModel=${modelToUse}`);

    // Make the API call
    let response: AIServiceManagerResponse;
    
    switch (providerName) {
      case 'groq':
        response = await client.chat({
          messages,
          model: modelToUse,
          webSearchEnabled: false
        });
        break;
        
      case 'gemini':
        response = await client.chat({
          messages,
          model: modelToUse,
          webSearchEnabled: false
        });
        break;
        
      case 'cerebras':
        response = await client.chat({
          messages,
          model: modelToUse
        });
        break;
        
      case 'cohere':
        response = await client.chat({
          message: request.message,
          chatHistory: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          model: modelToUse
        });
        break;
        
      case 'mistral':
        response = await client.chat({
          messages,
          model: modelToUse
        });
        break;
        
      case 'openrouter':
        response = await client.chat({
          messages,
          model: modelToUse
        });
        break;
        
      default:
        throw new Error(`Provider ${providerName} not implemented`);
    }

    // Update response with correct metadata
    response.tier_used = tier;
    response.query_type = queryDetection.type;
    response.web_search_enabled = false;
    response.model_used = modelToUse; // Ensure the actual model used is recorded

    // Record rate limit usage (if tracker available)
    if (rateLimitTracker && typeof rateLimitTracker.recordRequest === 'function') {
      rateLimitTracker.recordRequest(providerName, response.tokens_used.input + response.tokens_used.output);
    }

    return response;
  }

  /**
   * Prepare messages with context
   */
  private prepareMessages(
    request: AIServiceManagerRequest,
    queryDetection: any,
    appDataContext?: AppDataContext
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // System message
    let systemMessage = this.getSystemMessage(queryDetection.type, request.chatType, request.teachingMode, request.studyContext, request.profileData);

    // Add app data context if available
    if (appDataContext) {
      systemMessage += `\n\nStudent Context:\n- Progress: ${appDataContext.studyProgress.completedBlocks}/${appDataContext.studyProgress.totalBlocks} blocks completed\n- Accuracy: ${appDataContext.studyProgress.accuracy}%`;
    }

    // Add teaching mode instructions if enabled
    if (request.teachingMode) {
      systemMessage += `\n\nTeaching Instructions: You are in teaching mode. Please explain concepts clearly, use examples, break down complex topics, and encourage further learning. Use an educational tone and provide follow-up questions when appropriate.`;
    }

    messages.push({
      role: 'system',
      content: systemMessage
    });

    // Add conversation history (limit to last 4 messages to prevent irrelevant context)
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      // Only include the most recent conversation turns to stay focused on current topic
      const recentHistory = request.conversationHistory.slice(-4);
      recentHistory.forEach(historyItem => {
        messages.push({
          role: historyItem.role as 'user' | 'assistant',
          content: historyItem.content
        });
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: request.message
    });

    return messages;
  }

  /**
   * Get appropriate model for query type and provider
   * Updated with comprehensive free models from all providers
   */
  private getModelForQuery(queryType: QueryType, provider: AIProvider, preferredModel?: string): string {
    // If user has selected a specific model, use that
    if (preferredModel) {
      return preferredModel;
    }

    // Define the correct free models for each provider
    const modelMappings: Record<QueryType, Record<AIProvider, string>> = {
      time_sensitive: {
        groq: 'llama-3.3-70b-versatile', // Fast, powerful free model
        gemini: 'gemini-2.0-flash-lite', // Working free model
        cerebras: 'llama-3.3-70b', // Free model
        cohere: 'command-r', // Free model
        mistral: 'mistral-small-latest', // Free model
        openrouter: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
        google: 'gemini-2.0-flash-lite' // Working free model
      },
      app_data: {
        groq: 'llama-3.3-70b-versatile', // Free model
        gemini: 'gemini-2.0-flash-lite', // Working free model
        cerebras: 'llama-3.3-70b', // Free model
        cohere: 'command-r', // Free model
        mistral: 'mistral-small-latest', // Free model
        openrouter: 'meta-llama/llama-3.1-70b-instruct:free', // Free model
        google: 'gemini-2.0-flash-lite' // Working free model
      },
      general: {
        groq: 'llama-3.1-8b-instant', // Faster free model for quick responses
        gemini: 'gemini-2.0-flash-lite', // Working free model
        cerebras: 'llama-3.3-70b', // Free model
        cohere: 'command-r', // Free model
        mistral: 'mistral-small-latest', // Free model
        openrouter: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
        google: 'gemini-2.0-flash-lite' // Working free model
      }
    };

    // Default models for each provider
    const defaultModels: Record<AIProvider, string> = {
      groq: 'llama-3.1-8b-instant',
      gemini: 'gemini-2.0-flash-lite',
      cerebras: 'llama-3.3-70b',
      cohere: 'command-r',
      mistral: 'mistral-small-latest',
      openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
      google: 'gemini-2.0-flash-lite'
    };

    return modelMappings[queryType]?.[provider] || defaultModels[provider] || 'gpt-3.5-turbo';
  }

  /**
   * Get system message based on query type
   */
  private getSystemMessage(queryType: QueryType, chatType: string, teachingMode?: boolean, studyContext?: AIServiceManagerRequest['studyContext'], profileData?: AIServiceManagerRequest['profileData']): string {
    let baseMessage = chatType === 'study_assistant' 
      ? 'You are a helpful study assistant for BlockWise, an educational platform.'
      : 'You are a helpful AI assistant for BlockWise users.';

    // Enhance base message if in teaching mode
    if (teachingMode) {
      baseMessage = 'You are an educational tutor focused on helping students learn. Explain concepts clearly, provide examples, and use an encouraging tone.';
    }

    // Add study context
    if (studyContext) {
      baseMessage += `\n\nYour current study context is:\nSubject: ${studyContext.subject || 'N/A'}\nDifficulty: ${studyContext.difficultyLevel || 'N/A'}\nLearning Goals: ${studyContext.learningGoals.join(', ') || 'N/A'}\nTopics: ${studyContext.topics.join(', ') || 'N/A'}`;
    }

    // Add profile data
    if (profileData) {
      baseMessage += `\n\nYour student profile indicates:\nStrong Subjects: ${profileData.strongSubjects.join(', ') || 'N/A'}\nWeak Subjects: ${profileData.weakSubjects.join(', ') || 'N/A'}\nStudy Progress: ${profileData.studyProgress.completedTopics}/${profileData.studyProgress.totalTopics} topics completed with ${profileData.studyProgress.accuracy}% accuracy.`;
    }

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
   * Get system statistics
   */
  async getStatistics() {
    const healthyProviders = Object.entries(ALL_PROVIDERS)
      .filter(([_, config]) => config.healthy && config.client !== null)
      .map(([name, config]) => ({
        name,
        healthy: config.healthy,
        responseTime: config.responseTime,
        lastCheck: config.lastCheck
      }));

    return {
      providers: healthyProviders,
      fallbackChains: DYNAMIC_FALLBACK_CHAINS,
      totalProviders: Object.keys(ALL_PROVIDERS).length,
      healthyCount: healthyProviders.length
    };
  }

  /**
   * Manual health check trigger
   */
  async healthCheck(): Promise<Record<AIProvider, { healthy: boolean; responseTime: number; error?: string }>> {
    const results: Record<AIProvider, { healthy: boolean; responseTime: number; error?: string }> = {} as any;

    for (const [providerName, config] of Object.entries(ALL_PROVIDERS)) {
      // Skip providers without clients
      if (!config.client) {
        results[providerName as AIProvider] = {
          healthy: false,
          responseTime: 0,
          error: 'No client implementation'
        };
        continue;
      }

      try {
        const startTime = Date.now();
        await config.client.healthCheck();
        const responseTime = Date.now() - startTime;
        results[providerName as AIProvider] = {
          healthy: true,
          responseTime
        };
      } catch (error) {
        results[providerName as AIProvider] = {
          healthy: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Route requests based on keywords to appropriate endpoints
   */
  private routeBasedOnKeywords(message: string): { route: string; triggeredEndpoints: string[] } {
    const lowerMessage = message.toLowerCase();
    const triggeredEndpoints: string[] = [];

    // Web search keywords
    const webSearchKeywords = [
      'latest', 'recent', 'current', 'recently', 'news', 'today', 
      'what is happening', 'what happened', 'how recent', 'update', 'now',
      'current events', 'latest news', 'recent developments', 'recent news',
      'what\'s new', 'breaking news', 'trending', 'most recent'
    ];
    
    // Semantic search keywords (memory-based queries)
    const semanticSearchKeywords = [
      'my progress', 'my performance', 'my study', 'my learning', 
      'what did I learn', 'tell me about', 'remind me', 'memory',
      'past conversations', 'previous', 'previous learning', 'my history',
      'remember', 'recall', 'my past', 'my previous', 'my experiences'
    ];
    
    // Memory store keywords
    const memoryStoreKeywords = [
      'save this', 'remember this', 'store this', 'keep this', 
      'note this down', 'save for later', 'remember for me',
      'store in memory', 'keep track of', 'save to memory'
    ];

    // Check for keywords in the message
    if (webSearchKeywords.some(keyword => lowerMessage.includes(keyword))) {
      triggeredEndpoints.push('web_search');
    }
    
    if (semanticSearchKeywords.some(keyword => lowerMessage.includes(keyword))) {
      triggeredEndpoints.push('semantic_search');
    }
    
    if (memoryStoreKeywords.some(keyword => lowerMessage.includes(keyword))) {
      triggeredEndpoints.push('memory_store');
    }

    // If multiple keywords match, return 'multi-endpoint' route
    if (triggeredEndpoints.length > 1) {
      return { route: 'multi-endpoint', triggeredEndpoints };
    }
    
    // If single endpoint is triggered
    if (triggeredEndpoints.length === 1) {
      return { route: triggeredEndpoints[0], triggeredEndpoints };
    }
    
    // Default to provider-based routing
    return { route: 'provider-routing', triggeredEndpoints: [] };
  }

  /**
   * Handle multi-endpoint orchestration based on keyword triggers
   */
  private async handleMultiEndpointOrchestration(
    request: AIServiceManagerRequest, 
    routingResult: { route: string; triggeredEndpoints: string[] }, 
    startTime: number,
    requestId: string
  ): Promise<AIServiceManagerResponse> {
    console.log(`[${requestId}] Handling multi-endpoint orchestration for: [${routingResult.triggeredEndpoints.join(', ')}]`);

    // This would typically coordinate multiple endpoints and combine their responses
    // For now, we'll call each endpoint and combine results
    const responses: string[] = [];
    let tokensUsed = { input: 0, output: 0 };
    let combinedLatency = 0;
    
    for (const endpoint of routingResult.triggeredEndpoints) {
      let endpointResponse: AIServiceManagerResponse;
      
      switch (endpoint) {
        case 'web_search':
          endpointResponse = await this.callWebSearchEndpoint(request, startTime);
          break;
        case 'semantic_search':
          endpointResponse = await this.callSemanticSearchEndpoint(request, startTime);
          break;
        case 'memory_store':
          endpointResponse = await this.callMemoryStoreEndpoint(request, startTime);
          break;
        default:
          // Fallback to provider routing
          const queryDetection = {
            type: this.detectQueryType(request.message) as QueryType,
            confidence: 0.8
          };
          const availableProviders = this.getAvailableProviders(queryDetection.type);
          
          if (availableProviders.length > 0) {
            const providerName = availableProviders[0];
            const providerConfig = ALL_PROVIDERS[providerName];
            
            const appDataContext = request.includeAppData ? await this.getAppDataContext(request.userId) : undefined;
            
            endpointResponse = await this.callProvider({
              providerName,
              request,
              queryDetection,
              appDataContext,
              tier: providerConfig.tier,
              requestId,
              preferredModel: (request as any).model
            });
          } else {
            endpointResponse = {
              content: 'No available providers for this request',
              model_used: 'none',
              provider: 'system' as any,
              query_type: 'general',
              tier_used: 6,
              cached: false,
              tokens_used: { input: 0, output: 0 },
              latency_ms: 0,
              web_search_enabled: false,
              fallback_used: false,
              limit_approaching: false
            };
          }
          break;
      }
      
      responses.push(endpointResponse.content);
      tokensUsed.input += endpointResponse.tokens_used.input;
      tokensUsed.output += endpointResponse.tokens_used.output;
      combinedLatency += endpointResponse.latency_ms;
    }
    
    // Combine responses into a single response
    const combinedContent = responses.join('\n\n---\n\n');
    const totalLatency = Date.now() - startTime;
    
    return {
      content: combinedContent,
      model_used: 'multi-endpoint-combination',
      provider: 'multi-endpoint',
      query_type: 'general',
      tier_used: 0,
      cached: false,
      tokens_used: tokensUsed,
      latency_ms: totalLatency,
      web_search_enabled: true,
      fallback_used: false,
      limit_approaching: false
    };
  }

  /**
   * Call web search endpoint directly
   */
  private async callWebSearchEndpoint(
    request: AIServiceManagerRequest, 
    startTime: number
  ): Promise<AIServiceManagerResponse> {
    console.log('Calling web search endpoint for:', request.message);
    
    try {
      // In a real implementation, this would call the actual web search endpoint
      // For now, we'll return a mock response for demonstration
      const mockResults = [
        { title: 'Web Search Result', snippet: `Results for: ${request.message}`, url: 'https://example.com' }
      ];
      
      const latency = Date.now() - startTime;
      
      return {
        content: `Web search results for "${request.message}":\n\n${mockResults.map(r => `• ${r.title}: ${r.snippet}`).join('\n')}`,
        model_used: 'web-search',
        provider: 'web-search',
        query_type: 'time_sensitive',
        tier_used: 0,
        cached: false,
        tokens_used: { input: 10, output: 50 },
        latency_ms: latency,
        web_search_enabled: true,
        fallback_used: false,
        limit_approaching: false
      };
    } catch (error) {
      console.error('Web search endpoint call failed:', error);
      return {
        content: `Web search temporarily unavailable. Query: ${request.message}`,
        model_used: 'web-search-fallback',
        provider: 'system',
        query_type: 'time_sensitive',
        tier_used: 6,
        cached: false,
        tokens_used: { input: 0, output: 0 },
        latency_ms: Date.now() - startTime,
        web_search_enabled: false,
        fallback_used: true,
        limit_approaching: false
      };
    }
  }

  /**
   * Call semantic search endpoint directly
   */
  private async callSemanticSearchEndpoint(
    request: AIServiceManagerRequest, 
    startTime: number
  ): Promise<AIServiceManagerResponse> {
    console.log('Calling semantic search endpoint for:', request.message);
    
    try {
      // In a real implementation, this would call the actual semantic search endpoint
      // For now, we'll return a mock response for demonstration
      const mockMemories = [
        { content: 'User asked about study progress', similarity: 0.8, metadata: { topic: 'study' } }
      ];
      
      const latency = Date.now() - startTime;
      
      return {
        content: `Semantic search results for "${request.message}":\n\n${mockMemories.map(m => `• ${m.content} (similarity: ${(m.similarity * 100).toFixed(0)}%)`).join('\n')}`,
        model_used: 'semantic-search',
        provider: 'semantic-search',
        query_type: 'general',
        tier_used: 0,
        cached: false,
        tokens_used: { input: 10, output: 50 },
        latency_ms: latency,
        web_search_enabled: false,
        fallback_used: false,
        limit_approaching: false
      };
    } catch (error) {
      console.error('Semantic search endpoint call failed:', error);
      return {
        content: `Semantic search temporarily unavailable. Query: ${request.message}`,
        model_used: 'semantic-search-fallback',
        provider: 'system',
        query_type: 'general',
        tier_used: 6,
        cached: false,
        tokens_used: { input: 0, output: 0 },
        latency_ms: Date.now() - startTime,
        web_search_enabled: false,
        fallback_used: true,
        limit_approaching: false
      };
    }
  }

  /**
   * Call memory store endpoint directly
   */
  private async callMemoryStoreEndpoint(
    request: AIServiceManagerRequest, 
    startTime: number
  ): Promise<AIServiceManagerResponse> {
    console.log('Calling memory store endpoint for:', request.message);
    
    try {
      // In a real implementation, this would call the actual memory store endpoint
      // For now, we'll return a mock response for demonstration
      const latency = Date.now() - startTime;
      
      return {
        content: `Message "${request.message}" has been stored in memory for user ${request.userId}`,
        model_used: 'memory-store',
        provider: 'memory-store',
        query_type: 'general',
        tier_used: 0,
        cached: false,
        tokens_used: { input: 10, output: 20 },
        latency_ms: latency,
        web_search_enabled: false,
        fallback_used: false,
        limit_approaching: false
      };
    } catch (error) {
      console.error('Memory store endpoint call failed:', error);
      return {
        content: `Memory store temporarily unavailable. Could not store: ${request.message}`,
        model_used: 'memory-store-fallback',
        provider: 'system',
        query_type: 'general',
        tier_used: 6,
        cached: false,
        tokens_used: { input: 0, output: 0 },
        latency_ms: Date.now() - startTime,
        web_search_enabled: false,
        fallback_used: true,
        limit_approaching: false
      };
    }
  }
}

// Export singleton instance
export const aiServiceManager = new AIServiceManager();

// Export the main processQuery function
export const processQuery = (request: AIServiceManagerRequest): Promise<AIServiceManagerResponse> => {
  return aiServiceManager.processQuery(request);
};