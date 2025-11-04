// Unified AI Chat Service Initialization
// =====================================

import { getChatService, ChatServiceFactory } from './chat-service';
import { getConfigurationManager, createConfigurationManager, ConfigurationManagerFactory } from './configuration-manager';
import { registryManager } from './provider-registry';
import type { AIProvider } from '@/types/api-test';

/**
 * Initialize the Unified AI Chat System
 * This should be called once when the application starts
 */
export async function initializeChatSystem(config?: {
  defaultProvider?: AIProvider;
  timeout?: number;
  maxRetries?: number;
}) {
  try {
    console.log('🚀 Initializing Unified AI Chat System...');

    // Create registry with default configuration
    const registryConfig = {
      defaultProvider: config?.defaultProvider || 'groq',
      fallbackProviders: ['cerebras', 'mistral', 'openrouter', 'gemini', 'cohere'] as AIProvider[],
      timeout: config?.timeout || 30000,
      maxRetries: config?.maxRetries || 3,
      retryDelay: 1000,
      enableHealthChecks: true,
      healthCheckInterval: 30000,
      enableRateLimitTracking: true,
      streamChunkSize: 1024,
      maxConcurrentRequests: 10,
    };

    // Initialize registry first
    const registry = registryManager.initialize(registryConfig);
    
    // Initialize configuration manager with the registry
    ConfigurationManagerFactory.setRegistry(registry);
    const configManager = createConfigurationManager(registryConfig);
    
    // Create chat service with the registry
    ChatServiceFactory.setRegistry(registry);
    const chatService = ChatServiceFactory.createService(registryConfig);
    
    console.log('✅ Chat system initialized successfully!');
    
    return {
      registry,
      configManager,
      chatService,
    };
  } catch (error) {
    console.error('❌ Failed to initialize chat system:', error);
    throw error;
  }
}

/**
 * Get initialized chat service (creates if not exists)
 */
export async function getInitializedChatService() {
  try {
    return getChatService();
  } catch (error) {
    console.log('Chat service not initialized, initializing now...');
    // Auto-initialize if not done
    await initializeChatSystem();
    return getChatService();
  }
}

/**
 * Reset the entire chat system (useful for testing)
 */
export function resetChatSystem() {
  registryManager.reset();
  console.log('🔄 Chat system reset');
}

// Auto-initialize when imported in development
if (process.env.NODE_ENV === 'development') {
  // Only auto-initialize if not already initialized
  try {
    getChatService();
  } catch (error) {
    console.log('Auto-initializing chat system for development...');
    initializeChatSystem().catch(console.error);
  }
}