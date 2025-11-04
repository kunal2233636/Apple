// ============================================================================
// AI DATABASE INTEGRATION - Complete System Integration
// ============================================================================

import { ChatQueries, MemoryQueries, ProfileQueries, APIUsageQueries, PromptQueries, MaintenanceQueries } from './queries';
import { getCurrentUser, supabase } from '../supabase';
import type {
  ChatConversation,
  StudyChatMemory,
  StudentAIProfile,
  VectorSearchOptions,
  APIUsageStats
} from '@/types/database-ai';

/**
 * AI Database Integration Service
 * Handles integration between AI providers and the database system
 */
export class AIDatabaseIntegration {
  private userId: string | null = null;

  constructor() {
    // Initialize with current user if available
    this.initializeUser();
  }

  /**
   * Initialize with current authenticated user
   */
  private async initializeUser() {
    try {
      const user = await getCurrentUser();
      this.userId = user?.id || null;
    } catch (error) {
      console.warn('Could not initialize user for AI database integration:', error);
    }
  }

  /**
   * Set user ID for operations (when user is authenticated)
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Create a new chat conversation with AI
   */
  async createAIChat(title: string, type: 'general' | 'study_assistant' = 'general'): Promise<ChatConversation> {
    if (!this.userId) {
      throw new Error('User must be authenticated to create chat');
    }

    return await ChatQueries.createConversation(this.userId, title, type);
  }

  /**
   * Process AI chat message with database integration
   */
  async processChatMessage(
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    aiMetadata: {
      model: string;
      provider: string;
      tokensUsed: number;
      latencyMs: number;
      contextIncluded?: boolean;
    }
  ) {
    try {
      // Add user message
      await ChatQueries.addMessage(conversationId, 'user', userMessage);
      
      // Add AI response with metadata
      const aiMessage = await ChatQueries.addMessage(
        conversationId,
        'assistant',
        aiResponse,
        {
          model_used: aiMetadata.model,
          provider_used: aiMetadata.provider,
          tokens_used: aiMetadata.tokensUsed,
          latency_ms: aiMetadata.latencyMs,
          context_included: aiMetadata.contextIncluded || false
        }
      );

      // Log API usage
      await APIUsageQueries.logUsage(
        this.userId,
        'ai_chat',
        aiMetadata.provider,
        aiMetadata.model,
        {
          tokens_input: Math.floor(aiMetadata.tokensUsed * 0.3), // Estimate input
          tokens_output: Math.floor(aiMetadata.tokensUsed * 0.7), // Estimate output
          latency_ms: aiMetadata.latencyMs,
          success: true
        }
      );

      return aiMessage;
    } catch (error) {
      // Log failed API usage
      await APIUsageQueries.logUsage(
        this.userId,
        'ai_chat',
        aiMetadata.provider,
        aiMetadata.model,
        {
          tokens_input: 0,
          tokens_output: 0,
          latency_ms: aiMetadata.latencyMs,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Store study insight with vector embedding
   */
  async storeStudyInsight(
    content: string,
    embedding: number[],
    importance: 1 | 2 | 3 | 4 | 5,
    options: {
      tags?: string[];
      sourceConversationId?: string;
    } = {}
  ): Promise<StudyChatMemory> {
    if (!this.userId) {
      throw new Error('User must be authenticated to store study insights');
    }

    return await MemoryQueries.addMemory(
      this.userId,
      content,
      embedding,
      importance,
      options
    );
  }

  /**
   * Find relevant study memories for AI context
   */
  async findRelevantMemories(
    queryEmbedding: number[],
    options: Partial<VectorSearchOptions> = {}
  ): Promise<StudyChatMemory[]> {
    if (!this.userId) {
      throw new Error('User must be authenticated to search memories');
    }

    const searchOptions = {
      ...options,
      user_id: this.userId,
      embedding: queryEmbedding
    } as VectorSearchOptions;

    return await MemoryQueries.findSimilarMemories(
      this.userId,
      queryEmbedding,
      searchOptions
    );
  }

  /**
   * Get AI system prompt for specific use case
   */
  async getSystemPrompt(promptName: string): Promise<string> {
    const prompt = await PromptQueries.getPromptByName(promptName);
    
    if (!prompt) {
      throw new Error(`System prompt '${promptName}' not found`);
    }

    return prompt.system_prompt;
  }

  /**
   * Update student AI profile with new insights
   */
  async updateStudentProfile(
    profileData: {
      profile_text: string;
      strong_subjects?: string[];
      weak_subjects?: string[];
      learning_style?: string;
      exam_target?: string;
    }
  ): Promise<StudentAIProfile> {
    if (!this.userId) {
      throw new Error('User must be authenticated to update profile');
    }

    return await ProfileQueries.upsertProfile(this.userId, profileData);
  }

  /**
   * Get student profile for AI context
   */
  async getStudentProfile(): Promise<StudentAIProfile | null> {
    if (!this.userId) {
      throw new Error('User must be authenticated to get profile');
    }

    return await ProfileQueries.getProfile(this.userId);
  }

  /**
   * Generate comprehensive AI chat context
   */
  async generateAIContext(userMessage: string, provider: string, model: string) {
    const context = {
      systemPrompt: '',
      recentMemories: [] as StudyChatMemory[],
      studentProfile: null as StudentAIProfile | null,
      relevantInsights: [] as StudyChatMemory[]
    };

    try {
      // Get system prompt based on available data
      const hasProfile = !!(await this.getStudentProfile());
      const promptName = hasProfile ? 'hinglish_chat_with_data' : 'hinglish_chat_general';
      context.systemPrompt = await this.getSystemPrompt(promptName);

      // Get student profile if available
      context.studentProfile = await this.getStudentProfile();

      // For study assistant chats, include relevant memories
      // This would require embedding the user message (simplified here)
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
      
      // Type assertion to fix the TypeScript error
      const searchOptions: VectorSearchOptions = {
        user_id: this.userId!,
        embedding: mockEmbedding,
        limit: 3,
        min_similarity: 0.6
      };
      
      context.recentMemories = await this.findRelevantMemories(mockEmbedding, searchOptions);

      return context;
    } catch (error) {
      console.warn('Error generating AI context:', error);
      // Return basic context even if some parts fail
      context.systemPrompt = await this.getSystemPrompt('hinglish_chat_general');
      return context;
    }
  }

  /**
   * Run maintenance tasks (cleanup, summaries)
   */
  async runMaintenance() {
    try {
      const results = await MaintenanceQueries.runMaintenanceTasks();
      console.log('Maintenance completed:', results);
      return results;
    } catch (error) {
      console.error('Maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Get API usage statistics for the user
   */
  async getUsageStats(days: number = 30): Promise<APIUsageStats> {
    if (!this.userId) {
      throw new Error('User must be authenticated to get usage stats');
    }

    return await getUsageStats(this.userId, { days });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get API usage statistics for a user
 */
async function getUsageStats(userId: string, options: { days?: number } = {}): Promise<APIUsageStats> {
  try {
    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - (options.days || 30) * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const logs = data || [];
    
    const total_calls = logs.length;
    const total_tokens = logs.reduce((sum: number, log: any) => sum + log.tokens_input + log.tokens_output, 0);
    const total_cost = logs.reduce((sum: number, log: any) => sum + parseFloat(log.cost_estimate.toString()), 0);
    const successful_calls = logs.filter((log: any) => log.success).length;
    const success_rate = total_calls > 0 ? successful_calls / total_calls : 0;
    const average_latency = logs.length > 0 ? logs.reduce((sum: number, log: any) => sum + (log.latency_ms || 0), 0) / logs.length : 0;

    const provider_breakdown: Record<string, { calls: number; tokens: number; cost: number }> = {};
    logs.forEach((log: any) => {
      if (!provider_breakdown[log.provider_used]) {
        provider_breakdown[log.provider_used] = { calls: 0, tokens: 0, cost: 0 };
      }
      provider_breakdown[log.provider_used].calls++;
      provider_breakdown[log.provider_used].tokens += log.tokens_input + log.tokens_output;
      provider_breakdown[log.provider_used].cost += parseFloat(log.cost_estimate.toString());
    });

    return {
      total_calls,
      total_tokens,
      total_cost,
      average_latency,
      success_rate,
      provider_breakdown
    };
  } catch (error) {
    throw new Error(`Failed to get usage stats: ${error}`);
  }
}

// ============================================================================
// EXPORT INTEGRATION SERVICE
// ============================================================================

export default AIDatabaseIntegration;