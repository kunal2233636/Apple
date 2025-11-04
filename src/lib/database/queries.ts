// ============================================================================
// AI DATABASE QUERY UTILITIES - Basic Implementation
// ============================================================================

import { supabase } from '../supabase';

// Basic error classes
export class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class VectorSearchError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'VECTOR_SEARCH_ERROR', details);
    this.name = 'VectorSearchError';
  }
}

export class SecurityError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'SECURITY_ERROR', details);
    this.name = 'SecurityError';
  }
}

// Chat conversation operations
export class ChatQueries {
  static async createConversation(userId: string, title: string, chatType: 'general' | 'study_assistant' = 'general') {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title,
          chat_type: chatType
        })
        .select()
        .single();

      if (error) throw new DatabaseError(`Failed to create conversation: ${error.message}`, error.code, error);
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create conversation', 'UNKNOWN_ERROR', error);
    }
  }

  static async getUserConversations(userId: string, options: { limit?: number; includeArchived?: boolean } = {}) {
    try {
      let query = supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!options.includeArchived) {
        query = query.eq('is_archived', false);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw new DatabaseError(`Failed to fetch conversations: ${error.message}`, error.code, error);
      return data || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch conversations', 'UNKNOWN_ERROR', error);
    }
  }

  static async addMessage(conversationId: string, role: 'user' | 'assistant', content: string, metadata: any = {}) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          model_used: metadata.model_used,
          provider_used: metadata.provider_used,
          tokens_used: metadata.tokens_used || 0,
          latency_ms: metadata.latency_ms,
          context_included: metadata.context_included || false
        })
        .select()
        .single();

      if (error) throw new DatabaseError(`Failed to add message: ${error.message}`, error.code, error);
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to add message', 'UNKNOWN_ERROR', error);
    }
  }
}

// Memory and vector search operations
export class MemoryQueries {
  static async addMemory(userId: string, content: string, embedding: number[], importanceScore: number, options: any = {}) {
    try {
      if (embedding.length !== 1536) {
        throw new VectorSearchError(`Invalid embedding dimension: expected 1536, got ${embedding.length}`);
      }

      const { data, error } = await supabase
        .from('study_chat_memory')
        .insert({
          user_id: userId,
          content,
          embedding,
          importance_score: importanceScore,
          tags: options.tags,
          source_conversation_id: options.sourceConversationId
        })
        .select()
        .single();

      if (error) throw new DatabaseError(`Failed to add memory: ${error.message}`, error.code, error);
      return data;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof VectorSearchError) throw error;
      throw new DatabaseError('Failed to add memory', 'UNKNOWN_ERROR', error);
    }
  }

  static async findSimilarMemories(userId: string, embedding: number[], options: any = {}) {
    try {
      if (embedding.length !== 1536) {
        throw new VectorSearchError(`Invalid embedding dimension: expected 1536, got ${embedding.length}`);
      }

      const { data, error } = await supabase.rpc('find_similar_memories', {
        p_user_id: userId,
        p_embedding: embedding,
        p_limit: options.limit || 5,
        p_min_similarity: options.min_similarity || 0.7
      });

      if (error) throw new VectorSearchError(`Vector search failed: ${error.message}`, error);

      let results = data || [];
      
      if (options.tags && options.tags.length > 0) {
        results = results.filter((memory: any) => 
          memory.tags && memory.tags.some((tag: string) => options.tags.includes(tag))
        );
      }

      if (options.importance_score) {
        results = results.filter((memory: any) => memory.importance_score >= options.importance_score);
      }

      return results;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof VectorSearchError) throw error;
      throw new VectorSearchError('Failed to search memories', 'UNKNOWN_ERROR', error);
    }
  }
}

// Profile operations
export class ProfileQueries {
  static async upsertProfile(userId: string, profileData: any) {
    try {
      const { data, error } = await supabase
        .from('student_ai_profile')
        .upsert({
          user_id: userId,
          ...profileData,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new DatabaseError(`Failed to upsert profile: ${error.message}`, error.code, error);
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to upsert profile', 'UNKNOWN_ERROR', error);
    }
  }

  static async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('student_ai_profile')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Failed to fetch profile: ${error.message}`, error.code, error);
      }
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch profile', 'UNKNOWN_ERROR', error);
    }
  }
}

// API usage tracking
export class APIUsageQueries {
  static async logUsage(userId: string | null, featureName: string, providerUsed: string, modelUsed: string, metadata: any = {}) {
    try {
      const { data, error } = await supabase.rpc('log_api_usage', {
        p_user_id: userId,
        p_feature_name: featureName,
        p_provider_used: providerUsed,
        p_model_used: modelUsed,
        p_tokens_input: metadata.tokens_input || 0,
        p_tokens_output: metadata.tokens_output || 0,
        p_latency_ms: metadata.latency_ms || 0,
        p_success: metadata.success !== false,
        p_error_message: metadata.error_message
      });

      if (error) throw new DatabaseError(`Failed to log API usage: ${error.message}`, error.code, error);
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to log API usage', 'UNKNOWN_ERROR', error);
    }
  }
}

// System prompts
export class PromptQueries {
  static async getActivePrompts() {
    try {
      const { data, error } = await supabase
        .from('ai_system_prompts')
        .select('*')
        .eq('is_active', true)
        .order('version', { ascending: false });

      if (error) throw new DatabaseError(`Failed to fetch prompts: ${error.message}`, error.code, error);
      return data || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch prompts', 'UNKNOWN_ERROR', error);
    }
  }

  static async getPromptByName(name: string) {
    try {
      const { data, error } = await supabase
        .from('ai_system_prompts')
        .select('*')
        .eq('name', name)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Failed to fetch prompt: ${error.message}`, error.code, error);
      }
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to fetch prompt', 'UNKNOWN_ERROR', error);
    }
  }
}

// Maintenance operations
export class MaintenanceQueries {
  static async runMaintenanceTasks() {
    try {
      const { data, error } = await supabase.rpc('run_maintenance_tasks');
      if (error) throw new DatabaseError(`Failed to run maintenance tasks: ${error.message}`, error.code, error);
      return data || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to run maintenance tasks', 'UNKNOWN_ERROR', error);
    }
  }
}