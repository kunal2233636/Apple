// API Test Types for BlockWise AI Providers
// =========================================

export type AIProvider = 
  | 'groq' 
  | 'gemini' 
  | 'cerebras' 
  | 'cohere' 
  | 'mistral' 
  | 'openrouter';

export interface ProviderConfig {
  name: string;
  apiKeyEnv: string;
  endpoint: string;
  model: string;
  timeout: number;
  testType: 'completion' | 'embedding';
  expectedDimensions?: number;
}

export interface TestRequest {
  apiKey: string;
  config: ProviderConfig;
  timeout?: number;
}

export interface TestResponse {
  provider: AIProvider;
  success: boolean;
  responseTime: number;
  status?: number;
  error?: {
    type: 'network' | 'authentication' | 'rate_limit' | 'timeout' | 'validation' | 'unknown';
    message: string;
    details?: string;
  };
  data?: {
    text?: string;
    embedding?: number[];
    dimensions?: number;
  };
}

export interface EnvironmentCheck {
  allPresent: boolean;
  missing: string[];
  present: string[];
}

export interface TestSummary {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  timestamp: string;
  duration: number;
  results: TestResponse[];
}

export interface LoggingConfig {
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  logDirectory: string;
  maxLogFiles: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface TestResult {
  provider: AIProvider;
  success: boolean;
  responseTime: number;
  status?: number;
  error?: {
    type: 'network' | 'authentication' | 'rate_limit' | 'timeout' | 'validation' | 'unknown';
    message: string;
    fixSuggestion: string;
    apiEndpoint: string;
  };
}

export interface TestHistoryEntry {
  id: string;
  timestamp: string;
  summary: TestSummary;
  results: TestResponse[];
}

export interface APIKeyTesterOptions {
  timeout: number;
  logResults: boolean;
  stopOnFailure: boolean;
  parallel: boolean;
}

export interface ProviderTestResult {
  provider: AIProvider;
  status: 'success' | 'failed' | 'timeout';
  message: string;
  responseTime: number;
  fixSuggestion?: string;
  apiEndpoint?: string;
}

// Provider-specific interfaces
export interface GroqCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface GeminiCompletionResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface CerebrasCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface CohereEmbeddingResponse {
  embeddings: Array<{
    vector: number[];
  }>;
}

export interface MistralCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface OpenRouterCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}