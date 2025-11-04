// Chat-related types for the General Chat system

export interface GeneralChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
  isLoading?: boolean;
  isError?: boolean;
  isTimeSensitive?: boolean;
  webSearchUsed?: boolean;
  cached?: boolean;
  language?: 'hinglish' | 'english';
  contextIncluded?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  chatType: 'general' | 'study_assistant';
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  messageCount?: number;
}

export interface CreateConversationRequest {
  userId: string;
  chatType: 'general' | 'study_assistant';
}

export interface SendMessageRequest {
  userId: string;
  conversationId: string;
  message: string;
  chatType: 'general' | 'study_assistant';
}

export interface SendMessageResponse {
  success: boolean;
  data: {
    response: {
      content: string;
      model_used: string;
      provider_used: string;
      tokens_used: {
        input: number;
        output: number;
      };
      latency_ms: number;
      query_type: 'general' | 'time_sensitive' | 'app_data';
      web_search_enabled: boolean;
      fallback_used: boolean;
      cached: boolean;
      isTimeSensitive: boolean;
      language: 'hinglish';
    };
    conversationId: string;
    timestamp: string;
  };
  error?: string;
}

export interface ChatError {
  code: string;
  message: string;
  details?: any;
  retryAfter?: number;
}

export interface MessageMetadata {
  provider: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  webSearchUsed: boolean;
  cached: boolean;
  isTimeSensitive: boolean;
  language: 'hinglish' | 'english';
}

// API Response Types
export interface CreateConversationResponse {
  success: boolean;
  data: {
    conversationId: string;
    title: string;
    chatType: string;
    created_at: string;
  };
  error?: string;
}

export interface GetConversationsResponse {
  success: boolean;
  data: Conversation[];
  error?: string;
}

export interface GetMessagesResponse {
  success: boolean;
  data: {
    conversation: {
      id: string;
      title: string;
      chatType: string;
      createdAt: string;
      updatedAt: string;
      messageCount: number;
    };
    messages: GeneralChatMessage[];
  };
  error?: string;
}

export interface DeleteConversationResponse {
  success: boolean;
  data: {
    message: string;
    deletedConversationId: string;
    deletedTitle: string;
  };
  error?: string;
}

// Hinglish validation types
export interface HinglishValidationResult {
  isValid: boolean;
  message: string;
  needsRetry?: boolean;
}

// Error handling types
export interface ChatErrorContext {
  error: Error;
  conversationId?: string;
  userMessage?: string;
  retryCount?: number;
  canRetry?: boolean;
}

// Loading states
export interface ChatLoadingState {
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  isCreatingConversation: boolean;
  isDeletingConversation: boolean;
}

// UI State types
export interface ChatUIState {
  selectedConversation: Conversation | null;
  inputValue: string;
  isSidebarOpen: boolean;
  retryCountdown: number;
  isFirstMessage: boolean;
}

// Provider information types
export interface ProviderInfo {
  name: string;
  displayName: string;
  model: string;
  isTimeSensitive: boolean;
  supportsWebSearch: boolean;
}

// Web search types
export interface WebSearchInfo {
  enabled: boolean;
  query: string;
  timestamp: string;
  sources?: string[];
}

// Cache types
export interface CacheInfo {
  isCached: boolean;
  cacheAge?: number; // in seconds
  cacheHit: boolean;
}

// Rate limiting types
export interface RateLimitInfo {
  isLimited: boolean;
  retryAfter?: number; // in seconds
  limitType: 'user' | 'provider' | 'global';
}

// Analytics types
export interface ChatAnalytics {
  totalMessages: number;
  totalTokens: number;
  averageResponseTime: number;
  webSearchUsage: number;
  cacheHitRate: number;
  userSatisfaction?: number;
}