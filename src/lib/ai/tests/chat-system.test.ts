// Chat System Integration Tests
// =============================

import { describe, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ChatService } from '../chat/chat-service';
import { UnifiedProviderRegistry } from '../chat/provider-registry';
import { ConfigurationManager } from '../chat/configuration-manager';
import { aiServiceManager } from '../ai-service-manager-unified';
import type { ChatMessage, ChatRequest, ProviderHealthStatus } from '@/types/chat';
import type { AIProvider } from '@/types/api-test';

// Mock the provider registry and service manager
vi.mock('../chat/provider-registry');
vi.mock('../ai-service-manager');
vi.mock('@/lib/supabase');

describe('Chat System Integration Tests', () => {
  let chatService: ChatService;
  let providerRegistry: UnifiedProviderRegistry;
  let configManager: ConfigurationManager;
  
  const mockUserId = 'test-user-123';
  const mockConversationId = 'test-conv-456';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize services
    providerRegistry = new UnifiedProviderRegistry();
    configManager = new ConfigurationManager();
    chatService = new ChatService(providerRegistry, configManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Chat Service Core Functionality', () => {
    test('should process chat messages through AI service manager', async () => {
      const mockRequest: ChatRequest = {
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Hello, how can you help me study?',
        chatType: 'study_assistant',
        includeAppData: false
      };

      const mockResponse = {
        content: 'I can help you with your studies by analyzing your progress and providing personalized recommendations.',
        model_used: 'llama-3.3-70b-versatile',
        provider: 'groq',
        query_type: 'general',
        tier_used: 1,
        cached: false,
        tokens_used: { input: 25, output: 45 },
        latency_ms: 1200,
        web_search_enabled: false,
        fallback_used: false,
        limit_approaching: false
      };

      // Mock AI service manager response
      vi.mocked(aiServiceManager.processQuery).mockResolvedValueOnce(mockResponse);

      const result = await chatService.processMessage(mockRequest);

      expect(result.content).toBe(mockResponse.content);
      expect(result.model_used).toBe(mockResponse.model_used);
      expect(result.provider).toBe(mockResponse.provider);
      expect(aiServiceManager.processQuery).toHaveBeenCalledWith(mockRequest);
    });

    test('should handle conversation context correctly', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          conversation_id: mockConversationId,
          role: 'user',
          content: 'I need help with Physics',
          timestamp: new Date().toISOString(),
          tokens_used: 10
        },
        {
          id: '2',
          conversation_id: mockConversationId,
          role: 'assistant',
          content: 'I can help you with Physics. What specific topic are you struggling with?',
          timestamp: new Date().toISOString(),
          tokens_used: 25,
          model_used: 'llama-3.3-70b-versatile',
          provider_used: 'groq'
        }
      ];

      // Mock conversation history fetch
      const mockSupabase = await import('@/lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await chatService.getConversationHistory(mockConversationId);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('I need help with Physics');
      expect(result[1].content).toBe('I can help you with Physics. What specific topic are you struggling with?');
    });

    test('should create new conversations correctly', async () => {
      const newConversationData = {
        userId: mockUserId,
        title: 'Physics Study Session',
        chatType: 'study_assistant' as const
      };

      // Mock conversation creation
      const mockSupabase = await import('@/lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new-conv-789',
                user_id: mockUserId,
                title: newConversationData.title,
                chat_type: newConversationData.chatType,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_archived: false
              },
              error: null
            }),
          }),
        }),
      } as any);

      const result = await chatService.createConversation(newConversationData);

      expect(result.id).toBe('new-conv-789');
      expect(result.title).toBe(newConversationData.title);
      expect(result.chat_type).toBe(newConversationData.chatType);
    });

    test('should handle message persistence correctly', async () => {
      const messageData = {
        conversationId: mockConversationId,
        role: 'user' as const,
        content: 'What is thermodynamics?',
        tokensUsed: 15
      };

      // Mock message persistence
      const mockSupabase = await import('@/lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'msg-123',
                conversation_id: mockConversationId,
                role: 'user',
                content: 'What is thermodynamics?',
                timestamp: new Date().toISOString(),
                tokens_used: 15
              },
              error: null
            }),
          }),
        }),
      } as any);

      const result = await chatService.saveMessage(messageData);

      expect(result.id).toBe('msg-123');
      expect(result.content).toBe(messageData.content);
      expect(result.tokens_used).toBe(messageData.tokensUsed);
    });
  });

  describe('Provider Registry Integration', () => {
    test('should register and unregister providers correctly', async () => {
      const mockProvider = {
        name: 'test-provider' as AIProvider,
        chat: vi.fn().mockResolvedValue({
          content: 'Test response',
          model_used: 'test-model',
          provider: 'test-provider'
        }),
        healthCheck: vi.fn().mockResolvedValue({
          healthy: true,
          responseTime: 500
        })
      };

      await providerRegistry.registerProvider(mockProvider);
      expect(providerRegistry.getProvider('test-provider')).toBeDefined();

      await providerRegistry.unregisterProvider('test-provider');
      expect(providerRegistry.getProvider('test-provider')).toBeUndefined();
    });

    test('should route requests to appropriate providers', async () => {
      const mockProviders = [
        {
          name: 'groq' as AIProvider,
          chat: vi.fn().mockResolvedValue({
            content: 'Groq response',
            model_used: 'llama-3.3-70b-versatile',
            provider: 'groq'
          }),
          healthCheck: vi.fn().mockResolvedValue({ healthy: true, responseTime: 500 })
        },
        {
          name: 'gemini' as AIProvider,
          chat: vi.fn().mockResolvedValue({
            content: 'Gemini response',
            model_used: 'gemini-2.5-flash',
            provider: 'gemini'
          }),
          healthCheck: vi.fn().mockResolvedValue({ healthy: true, responseTime: 600 })
        }
      ];

      for (const provider of mockProviders) {
        await providerRegistry.registerProvider(provider);
      }

      const request = {
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Test message',
        chatType: 'general' as const
      };

      // Test Groq routing
      const groqResult = await chatService.processMessage({
        ...request,
        preferredProvider: 'groq'
      });
      expect(groqResult.content).toBe('Groq response');

      // Test Gemini routing
      const geminiResult = await chatService.processMessage({
        ...request,
        preferredProvider: 'gemini'
      });
      expect(geminiResult.content).toBe('Gemini response');
    });

    test('should handle provider failures with fallback', async () => {
      const failingProvider = {
        name: 'failing-provider' as AIProvider,
        chat: vi.fn().mockRejectedValue(new Error('Provider failed')),
        healthCheck: vi.fn().mockResolvedValue({ healthy: false, responseTime: 0, error: 'Provider failed' })
      };

      const workingProvider = {
        name: 'working-provider' as AIProvider,
        chat: vi.fn().mockResolvedValue({
          content: 'Fallback response',
          model_used: 'fallback-model',
          provider: 'working-provider'
        }),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true, responseTime: 500 })
      };

      await providerRegistry.registerProvider(failingProvider);
      await providerRegistry.registerProvider(workingProvider);

      const request = {
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Test message',
        chatType: 'general' as const,
        fallbackEnabled: true
      };

      // Should fallback to working provider
      const result = await chatService.processMessage(request);
      expect(result.content).toBe('Fallback response');
      expect(result.provider).toBe('working-provider');
    });
  });

  describe('Configuration Management', () => {
    test('should update service configuration', async () => {
      const newConfig = {
        defaultProvider: 'gemini' as AIProvider,
        fallbackProviders: ['groq', 'cerebras', 'mistral'] as AIProvider[],
        timeout: 30000,
        retryAttempts: 3
      };

      await configManager.updateServiceConfig(newConfig);

      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig.defaultProvider).toBe('gemini');
      expect(currentConfig.fallbackProviders).toHaveLength(3);
      expect(currentConfig.timeout).toBe(30000);
    });

    test('should validate configuration changes', async () => {
      const invalidConfig = {
        defaultProvider: 'invalid-provider' as AIProvider,
        fallbackProviders: [] as AIProvider[],
        timeout: -1000,
        retryAttempts: 0
      };

      await expect(configManager.updateServiceConfig(invalidConfig)).rejects.toThrow();
    });

    test('should persist configuration changes', async () => {
      const newConfig = {
        defaultProvider: 'cohere' as AIProvider,
        fallbackProviders: ['groq'] as AIProvider[],
        timeout: 20000,
        retryAttempts: 2
      };

      // Mock configuration persistence
      const mockSupabase = await import('@/lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: { ...newConfig, id: 'config-1' }, error: null }),
        }),
      } as any);

      await configManager.updateServiceConfig(newConfig);
      
      expect(mockSupabase.supabase.from).toHaveBeenCalledWith('chat_service_config');
    });
  });

  describe('Study Buddy Teaching Mode', () => {
    test('Study Mode responses should end with a question and avoid fake progress stats', async () => {
      const mockRequest: ChatRequest = {
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Explain entropy',
        chatType: 'study_assistant',
        includeAppData: true,
        teachingMode: true,
        teachingPreferences: {
          explanationDepth: 'detailed',
          exampleDensity: 'high',
          interactiveMode: true,
          focusAreas: [],
        },
      } as any;

      const mockResponse = {
        content: 'Entropy is a measure of disorder. What part of this would you like to explore or practice next?',
        model_used: 'adaptive_teaching_system',
        provider: 'centralized_integration',
        query_type: 'general',
        tier_used: 1,
        cached: false,
        tokens_used: { input: 0, output: 0 },
        latency_ms: 1000,
        web_search_enabled: false,
        fallback_used: false,
        limit_approaching: false,
      };

      vi.mocked(aiServiceManager.processQuery).mockResolvedValueOnce(mockResponse as any);

      const result = await chatService.processMessage(mockRequest);

      expect(result.content.trim().endsWith('?')).toBe(true);
      expect(result.content).not.toContain('35/50');
      expect(result.content).not.toContain('78%');
    });
  });

  describe('Real-time Chat Functionality', () => {
    test('should handle streaming responses', async () => {
      const streamChunks = ['Hello', ' from', ' the', ' AI'];
      
      const mockStreamingProvider = {
        name: 'streaming-provider' as AIProvider,
        streamChat: vi.fn().mockImplementation(function* () {
          for (const chunk of streamChunks) {
            yield chunk;
          }
        }),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true, responseTime: 500 })
      };

      await providerRegistry.registerProvider(mockStreamingProvider);

      const request = {
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Stream a response',
        chatType: 'general' as const,
        streaming: true
      };

      const chunks = [];
      for await (const chunk of chatService.streamMessage(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(streamChunks);
    });

    test('should handle chat session state', async () => {
      const sessionData = {
        userId: mockUserId,
        conversationId: mockConversationId,
        state: {
          context: { previousTopic: 'physics' },
          preferences: { language: 'hindi' },
          lastActivity: new Date().toISOString()
        }
      };

      // Mock session persistence
      const mockSupabase = await import('@/lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: sessionData.state, error: null }),
        }),
      } as any);

      await chatService.updateSessionState(sessionData.conversationId, sessionData.state);
      
      const retrievedState = await chatService.getSessionState(sessionData.conversationId);
      expect(retrievedState.context.previousTopic).toBe('physics');
      expect(retrievedState.preferences.language).toBe('hindi');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection failures gracefully', async () => {
      // Mock database connection failure
      const mockSupabase = await import('@/lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(chatService.getConversationHistory(mockConversationId))
        .rejects.toThrow('Database connection failed');
    });

    test('should handle AI provider rate limits', async () => {
      const rateLimitedProvider = {
        name: 'rate-limited' as AIProvider,
        chat: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        healthCheck: vi.fn().mockResolvedValue({ 
          healthy: false, 
          responseTime: 0, 
          error: 'Rate limit exceeded' 
        })
      };

      await providerRegistry.registerProvider(rateLimitedProvider);

      const request = {
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Test message',
        chatType: 'general' as const,
        fallbackEnabled: true
      };

      // Should gracefully handle rate limit and return appropriate response
      const result = await chatService.processMessage(request);
      expect(result.content).toContain('experiencing high demand');
      expect(result.provider).toBe('system');
    });

    test('should maintain chat history during errors', async () => {
      const messagesBeforeError = [
        {
          id: '1',
          conversation_id: mockConversationId,
          role: 'user',
          content: 'First message',
          timestamp: new Date().toISOString(),
          tokens_used: 10
        }
      ];

      // Mock successful message save before error
      const mockSupabase = await import('@/lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: messagesBeforeError, error: null }),
            }),
          }),
        }),
      } as any);

      // Mock AI service failure
      vi.mocked(aiServiceManager.processQuery).mockRejectedValueOnce(new Error('AI service unavailable'));

      await expect(chatService.processMessage({
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Second message',
        chatType: 'general' as const
      })).rejects.toThrow('AI service unavailable');

      // History should still be retrievable
      const history = await chatService.getConversationHistory(mockConversationId);
      expect(history).toHaveLength(1);
    });
  });

  describe('Performance and Monitoring', () => {
    test('should measure response times accurately', async () => {
      const slowProvider = {
        name: 'slow-provider' as AIProvider,
        chat: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            content: 'Slow response',
            model_used: 'slow-model',
            provider: 'slow-provider'
          };
        }),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true, responseTime: 1000 })
      };

      await providerRegistry.registerProvider(slowProvider);

      const startTime = Date.now();
      const result = await chatService.processMessage({
        userId: mockUserId,
        conversationId: mockConversationId,
        message: 'Test message',
        chatType: 'general' as const,
        preferredProvider: 'slow-provider'
      });
      const endTime = Date.now();

      expect(result.latency_ms).toBeGreaterThan(90);
      expect(result.latency_ms).toBeLessThanOrEqual(endTime - startTime + 10);
    });

    test('should track provider health status', async () => {
      const healthyProvider = {
        name: 'healthy' as AIProvider,
        chat: vi.fn().mockResolvedValue({
          content: 'Healthy response',
          model_used: 'healthy-model',
          provider: 'healthy'
        }),
        healthCheck: vi.fn().mockResolvedValue({ 
          healthy: true, 
          responseTime: 200,
          lastCheck: new Date().toISOString()
        })
      };

      const unhealthyProvider = {
        name: 'unhealthy' as AIProvider,
        chat: vi.fn().mockRejectedValue(new Error('Service unavailable')),
        healthCheck: vi.fn().mockResolvedValue({ 
          healthy: false, 
          responseTime: 0,
          error: 'Service unavailable',
          lastCheck: new Date().toISOString()
        })
      };

      await providerRegistry.registerProvider(healthyProvider);
      await providerRegistry.registerProvider(unhealthyProvider);

      const healthStatus = await chatService.getAllProvidersHealth();
      
      expect(healthStatus.healthy).toBeDefined();
      expect(healthStatus.unhealthy).toBeDefined();
      expect(healthStatus.healthy.length).toBeGreaterThan(0);
      expect(healthStatus.unhealthy.length).toBeGreaterThan(0);
    });
  });
});