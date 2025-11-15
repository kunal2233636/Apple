// AI Service Manager Type Definitions
// ===================================

import type { AIProvider } from '@/types/api-test';

// Query Types for intelligent routing
export type QueryType = 'time_sensitive' | 'app_data' | 'general';

// Chat Types for the app
export type ChatType = 'general' | 'study_assistant';

// Provider Tier Levels for fallback
export type ProviderTier = 1 | 2 | 3 | 4 | 5 | 6;

// AI Service Manager Request
export interface AIServiceManagerRequest {
  userId: string;
  message: string;
  conversationId: string;
  chatType: ChatType;
  includeAppData: boolean;
  teachingMode?: boolean;
  teachingPreferences?: {
    explanationDepth?: 'basic' | 'detailed' | 'comprehensive';
    exampleDensity?: 'low' | 'medium' | 'high';
    interactiveMode?: boolean;
    focusAreas?: string[];
    languageMode?: 'hinglish' | 'english';
  };
  provider?: string;
  model?: string;
  isPersonalQuery?: boolean;
  studyContext?: {
    subject: string;
    difficultyLevel: string;
    learningGoals: string[];
    topics: string[];
    timeSpent: number;
    lastActivity: Date | string;
  };
  profileData?: {
    profileText: string;
    strongSubjects: string[];
    weakSubjects: string[];
    studyProgress: {
      totalTopics: number;
      completedTopics: number;
      accuracy: number;
    };
    currentData: {
      streak: number;
      level: number;
      points: number;
      revisionQueue: number;
    };
    lastUpdated: string;
  } | null;
  relevantMemories?: string;
  conversationHistory?: Array<{
    role: string;
    content: string;
    timestamp?: Date | string;
  }>;
  webSearchResults?: any;
}

// AI Service Manager Response
export interface AIServiceManagerResponse {
  content: string;
  model_used: string;
  provider: string;
  provider_used?: string; // Alias for provider for backward compatibility
  query_type: string;
  tier_used: number;
  cached: boolean;
  tokens_used: {
    input: number;
    output: number;
  };
  latency_ms: number;
  web_search_enabled: boolean;
  fallback_used: boolean;
  limit_approaching: boolean;
}

// Rate Limit Configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  requestsPerMonth?: number;
  windowSize: number; // in milliseconds
}

// Rate Limit Status
export interface RateLimitStatus {
  provider: AIProvider;
  remaining: number;
  limit: number;
  resetTime: Date;
  windowStart: Date;
  usage: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical' | 'blocked';
}

// Cache Entry
export interface CacheEntry {
  key: string;
  response: AIServiceManagerResponse;
  timestamp: Date;
  expiresAt: Date;
  hits: number;
  queryType: QueryType;
  userId: string;
  chatType: ChatType;
}

// Cache Configuration
export interface CacheConfig {
  ttl: {
    general: number; // 6 hours in milliseconds
    study_assistant: number; // 1 hour in milliseconds
  };
  maxSize: number;
  cleanupInterval: number; // in milliseconds
}

// Provider Configuration
export interface ProviderConfig {
  name: string;
  provider: AIProvider;
  tier: ProviderTier;
  baseUrl: string;
  models: {
    chat: string;
    embedding?: string;
  };
  capabilities: {
    supportsWebSearch: boolean;
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    maxTokens: number;
  };
  rateLimitConfig: RateLimitConfig;
  priority: number;
  enabled: boolean;
}

// Query Detection Result
export interface QueryDetectionResult {
  type: QueryType;
  confidence: number;
  keywords: string[];
  reasons: string[];
}

// App Data Context
export interface AppDataContext {
  userId: string;
  studyProgress: {
    totalBlocks: number;
    completedBlocks: number;
    accuracy: number;
    subjectsStudied: string[];
    timeSpent: number;
  };
  recentActivity: {
    lastStudySession?: Date;
    questionsAnswered: number;
    correctAnswers: number;
    topicsStruggled: string[];
    topicsStrong: string[];
  };
  preferences: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    subjects: string[];
    studyGoals: string[];
  };
}

// API Usage Log Entry
export interface ApiUsageLog {
  id?: string;
  user_id: string;
  feature_name: string;
  provider_used: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  cached: boolean;
  success: boolean;
  error_message?: string;
  timestamp?: Date;
  query_type?: string;
  tier_used?: string;
  fallback_used?: boolean;
  endpoint?: string;
  cost_estimate?: number;
  created_at?: Date;
}

// Fallback Chain
export interface FallbackChain {
  queryType: QueryType;
  tiers: ProviderTier[];
  currentTier: ProviderTier;
  attempts: Map<ProviderTier, number>;
  lastError?: Error;
}

// Error Context
export interface ErrorContext {
  provider: AIProvider;
  tier: ProviderTier;
  queryType: QueryType;
  error: Error;
  timestamp: Date;
  retryable: boolean;
  context?: Record<string, any>;
}

// Health Check Result
export interface HealthCheckResult {
  provider: AIProvider;
  healthy: boolean;
  responseTime: number;
  lastCheck: Date;
  error?: string;
  rateLimitStatus: RateLimitStatus;
}

// Configuration for AI Service Manager
export interface AIServiceManagerConfig {
  providers: ProviderConfig[];
  cacheConfig: CacheConfig;
  fallbackConfig: {
    maxRetries: number;
    retryDelay: number;
    enableGracefulDegradation: boolean;
  };
  loggingConfig: {
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  rateLimitWarnings: {
    warning: number; // 80%
    critical: number; // 95%
    block: number; // 100%
  };
}