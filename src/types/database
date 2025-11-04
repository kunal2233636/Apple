// ============================================================================
// AI STUDY ASSISTANT DATABASE TYPES - TypeScript Definitions
// ============================================================================

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  chat_type: 'general' | 'study_assistant';
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  provider_used?: string;
  tokens_used: number;
  latency_ms?: number;
  context_included: boolean;
  timestamp: string;
}

export interface StudyChatMemory {
  id: string;
  user_id: string;
  content: string;
  embedding?: number[]; // vector(1536) as number array
  importance_score: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  source_conversation_id?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface MemorySummary {
  id: string;
  user_id: string;
  summary_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  summary_text: string;
  token_count: number;
  created_at: string;
  expires_at?: string;
}

export interface StudentAIProfile {
  user_id: string;
  profile_text: string;
  strong_subjects?: string[];
  weak_subjects?: string[];
  learning_style?: string;
  exam_target?: string;
  last_updated: string;
}

export interface APIUsageLog {
  id: string;
  user_id?: string;
  feature_name: string;
  provider_used: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms?: number;
  cached: boolean;
  cost_estimate: number;
  timestamp: string;
  success: boolean;
  error_message?: string;
}

export interface AISystemPrompt {
  id: string;
  name: string;
  system_prompt: string;
  language: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// Insert types (for creating records)
export type ChatConversationInsert = Omit<ChatConversation, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'timestamp'> & {
  timestamp?: string;
};

export type StudyChatMemoryInsert = Omit<StudyChatMemory, 'id' | 'created_at' | 'expires_at'> & {
  created_at?: string;
  expires_at?: string;
};

export type MemorySummaryInsert = Omit<MemorySummary, 'id' | 'created_at'> & {
  created_at?: string;
};

export type StudentAIProfileInsert = Omit<StudentAIProfile, 'last_updated'> & {
  last_updated?: string;
};

export type APIUsageLogInsert = Omit<APIUsageLog, 'id' | 'timestamp'> & {
  timestamp?: string;
};

export type AISystemPromptInsert = Omit<AISystemPrompt, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

// Update types (for modifying records)
export type ChatConversationUpdate = Partial<ChatConversationInsert>;
export type ChatMessageUpdate = Partial<ChatMessageInsert>;
export type StudyChatMemoryUpdate = Partial<StudyChatMemoryInsert>;
export type MemorySummaryUpdate = Partial<MemorySummaryInsert>;
export type StudentAIProfileUpdate = Partial<StudentAIProfileInsert>;
export type APIUsageLogUpdate = Partial<APIUsageLogInsert>;
export type AISystemPromptUpdate = Partial<AISystemPromptInsert>;

// Query result types with joins
export interface ChatMessageWithConversation extends ChatMessage {
  chat_conversations?: ChatConversation;
}

export interface StudyChatMemoryWithSimilarity extends StudyChatMemory {
  similarity?: number; // For vector search results
}

// Database query options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, any>;
}

// Vector search options
export interface VectorSearchOptions {
  embedding: number[];
  user_id: string;
  limit?: number;
  min_similarity?: number;
  tags?: string[];
  importance_score?: number;
}

// API usage statistics
export interface APIUsageStats {
  total_calls: number;
  total_tokens: number;
  total_cost: number;
  average_latency: number;
  success_rate: number;
  provider_breakdown: Record<string, {
    calls: number;
    tokens: number;
    cost: number;
  }>;
}

// Chat statistics
export interface ChatStats {
  total_conversations: number;
  total_messages: number;
  average_conversation_length: number;
  most_used_models: Record<string, number>;
  most_used_providers: Record<string, number>;
}

// Memory statistics
export interface MemoryStats {
  total_memories: number;
  active_memories: number;
  average_importance: number;
  top_tags: string[];
  memories_by_importance: Record<number, number>;
}

// Error types
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

// Supabase types extension
export interface Database {
  public: {
    Tables: {
      chat_conversations: {
        Row: ChatConversation;
        Insert: ChatConversationInsert;
        Update: ChatConversationUpdate;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: ChatMessageInsert;
        Update: ChatMessageUpdate;
      };
      study_chat_memory: {
        Row: StudyChatMemory;
        Insert: StudyChatMemoryInsert;
        Update: StudyChatMemoryUpdate;
      };
      memory_summaries: {
        Row: MemorySummary;
        Insert: MemorySummaryInsert;
        Update: MemorySummaryUpdate;
      };
      student_ai_profile: {
        Row: StudentAIProfile;
        Insert: StudentAIProfileInsert;
        Update: StudentAIProfileUpdate;
      };
      api_usage_logs: {
        Row: APIUsageLog;
        Insert: APIUsageLogInsert;
        Update: APIUsageLogUpdate;
      };
      ai_system_prompts: {
        Row: AISystemPrompt;
        Insert: AISystemPromptInsert;
        Update: AISystemPromptUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      clean_expired_memory: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      generate_memory_summaries: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      log_api_usage: {
        Args: {
          p_user_id: string;
          p_feature_name: string;
          p_provider_used: string;
          p_model_used: string;
          p_tokens_input?: number;
          p_tokens_output?: number;
          p_latency_ms?: number;
          p_success?: boolean;
          p_error_message?: string;
        };
        Returns: string;
      };
      create_chat_conversation: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_chat_type?: string;
        };
        Returns: string;
      };
      add_chat_message: {
        Args: {
          p_conversation_id: string;
          p_role: string;
          p_content: string;
          p_model_used?: string;
          p_provider_used?: string;
          p_tokens_used?: number;
          p_latency_ms?: number;
          p_context_included?: boolean;
        };
        Returns: string;
      };
      add_study_memory: {
        Args: {
          p_user_id: string;
          p_content: string;
          p_embedding: number[];
          p_importance_score: number;
          p_tags?: string[];
          p_source_conversation_id?: string;
        };
        Returns: string;
      };
      find_similar_memories: {
        Args: {
          p_user_id: string;
          p_embedding: number[];
          p_limit?: number;
          p_min_similarity?: number;
        };
        Returns: StudyChatMemoryWithSimilarity[];
      };
      run_maintenance_tasks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          task_name: string;
          records_affected: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}