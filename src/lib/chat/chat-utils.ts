// Chat utility functions for the General Chat system

import { formatDistanceToNow, format } from 'date-fns';

// Generate a unique conversation ID
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a unique message ID
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format timestamp for display
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  
  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${Math.floor(diffInMinutes)}m ago`;
  } else if (diffInMinutes < 1440) { // 24 hours
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else if (diffInMinutes < 10080) { // 7 days
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  } else {
    return format(date, 'MMM dd, yyyy');
  }
}

// Format conversation date
export function formatConversationDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  
  if (diffInMinutes < 60) {
    return `${Math.floor(diffInMinutes)} minutes ago`;
  } else if (diffInMinutes < 1440) { // 24 hours
    return `${Math.floor(diffInMinutes / 60)} hours ago`;
  } else if (diffInMinutes < 10080) { // 7 days
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  } else {
    return format(date, 'MMM dd, yyyy');
  }
}

// Truncate text for conversation titles
export function truncateTitle(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Get provider display name
export function getProviderDisplayName(model: string): string {
  const providerMap: Record<string, string> = {
    'llama-3.3-70b-versatile': 'Groq Llama 3.3 70B',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'llama-3.3-70b': 'Cerebras Llama 3.3 70B',
    'llama-3.1-8b': 'Cerebras Llama 3.1 8B',
    'command': 'Cohere Command',
    'command-light': 'Cohere Command Light',
    'mistral-large-latest': 'Mistral Large',
    'mistral-medium-latest': 'Mistral Medium',
    'mistral-small-latest': 'Mistral Small',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'error_handler': 'System',
    'graceful_degradation': 'System'
  };
  
  return providerMap[model] || model || 'AI Model';
}

// Format tokens display
export function formatTokens(input: number, output: number): string {
  const total = input + output;
  if (total === 0) return '0 tokens';
  if (total < 1000) return `${total} tokens`;
  return `${(total / 1000).toFixed(1)}K tokens`;
}

// Format latency display
export function formatLatency(latencyMs: number): string {
  if (latencyMs < 1000) {
    return `${latencyMs}ms`;
  } else {
    return `${(latencyMs / 1000).toFixed(1)}s`;
  }
}

// Check if text contains Devanagari script
export function containsDevanagari(text: string): boolean {
  // Devanagari Unicode range: \u0900-\u097F
  const devanagariRegex = /[\u0900-\u097F]/;
  return devanagariRegex.test(text);
}

// Check if response contains only Devanagari (indicating it failed the Hinglish requirement)
export function isDevanagariOnly(text: string): boolean {
  const devanagariRegex = /[\u0900-\u097F]/;
  const containsDevanagari = devanagariRegex.test(text);
  const containsLatin = /[a-zA-Z]/.test(text);
  const containsNumbers = /\d/.test(text);
  const containsBasicPunctuation = /[.,!?;:"'()[\]{}\s]/.test(text);
  
  return containsDevanagari && !containsLatin && !containsNumbers && !containsBasicPunctuation;
}

// Validate Hinglish response
export function validateHinglishResponse(response: string): {
  isValid: boolean;
  needsRetry: boolean;
  message: string;
} {
  if (isDevanagariOnly(response)) {
    return {
      isValid: false,
      needsRetry: true,
      message: 'Response contains only Devanagari script. Please respond only in Hinglish (Roman script).'
    };
  }
  
  // Check if it has substantial content in Roman script
  const romanScriptRatio = (response.replace(/[^a-zA-Z\s.,!?;:"'()[\]{}]/g, '').length) / response.length;
  
  if (romanScriptRatio < 0.3 && response.length > 20) {
    return {
      isValid: false,
      needsRetry: false,
      message: 'Response should be in Hinglish using Roman script.'
    };
  }
  
  return {
    isValid: true,
    needsRetry: false,
    message: ''
  };
}

// Get time-sensitive query indicators
export function isTimeSensitiveQuery(message: string): boolean {
  const timeSensitiveKeywords = [
    'when', 'date', 'time', 'schedule', 'registration', 'deadline',
    'exam', 'result', 'admission', 'cutoff', 'latest', 'current',
    '2024', '2025', '2026', 'today', 'tomorrow', 'this year',
    'nta', 'official', 'announcement', 'notice', 'update'
  ];
  
  const lowerMessage = message.toLowerCase();
  return timeSensitiveKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Check if message suggests web search is needed
export function shouldEnableWebSearch(message: string, isTimeSensitive: boolean): boolean {
  // Always enable web search for time-sensitive queries
  if (isTimeSensitive) return true;
  
  // Enable web search for queries asking for current information
  const webSearchKeywords = [
    'latest', 'current', 'recent', 'new', 'update', 'news',
    'what is the', 'when is the', 'where can i', 'how to find',
    'official website', 'check online', 'search for'
  ];
  
  const lowerMessage = message.toLowerCase();
  return webSearchKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Generate conversation title from first message
export function generateConversationTitle(firstMessage: string): string {
  // Clean up the message
  let title = firstMessage.trim();
  
  // Remove common prefixes
  title = title.replace(/^(hey|hi|hello|please|tell me|can you|help me)\s*/i, '');
  
  // Truncate if too long
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  // Ensure it doesn't end with partial words
  if (title.length === 47) {
    const lastSpace = title.lastIndexOf(' ');
    if (lastSpace > 30) {
      title = title.substring(0, lastSpace) + '...';
    }
  }
  
  return title || 'New Conversation';
}

// Format error messages for user display
export function formatErrorMessage(error: string): string {
  const errorMappings: Record<string, string> = {
    'rate limit': 'High traffic! Please wait a moment before sending another message.',
    'service unavailable': 'Sorry, AI service is temporarily unavailable. Please try again later.',
    'validation failed': 'Apologies, response generation error. Please try again.',
    'network error': 'Connection lost. Please check your internet connection.',
    'timeout': 'Request timed out. Please try again.',
    'quota exceeded': 'Usage limit reached. Please try again later.',
    'invalid request': 'Invalid request. Please check your message.',
    'unauthorized': 'Authentication error. Please try again.',
    'internal server error': 'Server error. Please try again in a moment.'
  };
  
  const lowerError = error.toLowerCase();
  for (const [key, message] of Object.entries(errorMappings)) {
    if (lowerError.includes(key)) {
      return message;
    }
  }
  
  // Return original error if no mapping found
  return error.length > 100 ? `${error.substring(0, 97)}...` : error;
}

// Calculate retry countdown
export function calculateRetryCountdown(error: string): number {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('rate limit')) {
    // Try to extract number from rate limit message
    const matches = error.match(/(\d+)/);
    if (matches) {
      const seconds = parseInt(matches[1]);
      return Math.min(Math.max(seconds, 30), 300); // Between 30 seconds and 5 minutes
    }
    return 60; // Default 60 seconds
  }
  
  if (lowerError.includes('quota exceeded')) {
    return 300; // 5 minutes for quota issues
  }
  
  if (lowerError.includes('timeout')) {
    return 30; // 30 seconds for timeout
  }
  
  return 60; // Default 60 seconds
}

// Get message metadata for display
export function getMessageMetadata(message: any) {
  return {
    provider: message.provider,
    model: getProviderDisplayName(message.model),
    tokens: message.tokensUsed ? formatTokens(0, message.tokensUsed) : null,
    latency: message.latencyMs ? formatLatency(message.latencyMs) : null,
    webSearch: message.webSearchUsed,
    cached: message.cached,
    timeSensitive: message.isTimeSensitive,
    language: message.language
  };
}

// Check if cache is fresh (less than 5 minutes old)
export function isCacheFresh(cacheAgeMs: number): boolean {
  return cacheAgeMs < 5 * 60 * 1000; // 5 minutes
}

// Validate message length
export function validateMessageLength(message: string): {
  isValid: boolean;
  error?: string;
} {
  if (!message.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > 500) {
    return { isValid: false, error: 'Message is too long (max 500 characters)' };
  }
  
  if (message.length < 2) {
    return { isValid: false, error: 'Message is too short (min 2 characters)' };
  }
  
  return { isValid: true };
}

// Sanitize message content
export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .substring(0, 500); // Limit to 500 characters
}

// Generate cache key for message
export function generateCacheKey(userId: string, message: string, chatType: string): string {
  const content = `${userId}:${chatType}:${message.toLowerCase().trim()}`;
  return `chat_cache_${Buffer.from(content).toString('base64').substring(0, 50)}`;
}

// Export all utilities
export const chatUtils = {
  generateConversationId,
  generateMessageId,
  formatTimestamp,
  formatConversationDate,
  truncateTitle,
  getProviderDisplayName,
  formatTokens,
  formatLatency,
  containsDevanagari,
  isDevanagariOnly,
  validateHinglishResponse,
  isTimeSensitiveQuery,
  shouldEnableWebSearch,
  generateConversationTitle,
  formatErrorMessage,
  calculateRetryCountdown,
  getMessageMetadata,
  isCacheFresh,
  validateMessageLength,
  sanitizeMessage,
  generateCacheKey
};