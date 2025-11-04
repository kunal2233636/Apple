// Unified AI Chat Integration Example
// ==================================

import { getChatService } from '@/lib/ai/chat/chat-service';
import { getConfigurationManager } from '@/lib/ai/chat/configuration-manager';
import { ChatApiRequest } from '@/types/chat';
import type { AIProvider } from '@/types/api-test';

/**
 * Example usage of the Unified AI Chat Interface
 * Demonstrates all key features and integration patterns
 */
export class ChatIntegrationExample {
  private chatService = getChatService();
  private configManager = getConfigurationManager();

  /**
   * Initialize the chat system with optimal configuration
   */
  async initialize() {
    console.log('🚀 Initializing Unified AI Chat System...');

    // Configure service with optimal settings
    this.configManager.updateServiceConfig({
      defaultProvider: 'groq',  // Fastest provider
      fallbackProviders: ['cerebras', 'mistral', 'openrouter', 'gemini', 'cohere'],
      timeout: 30000,
      maxRetries: 3,
      enableHealthChecks: true,
      healthCheckInterval: 30000,
      maxConcurrentRequests: 10,
    });

    // Check API key availability
    const envStatus = await this.configManager.getEnvironmentStatus();
    console.log('📋 Environment Status:');
    console.log(`   ✅ Available keys: ${envStatus.availableKeys.length}`);
    console.log(`   ❌ Missing keys: ${envStatus.missingKeys.length}`);

    if (envStatus.missingKeys.length > 0) {
      console.warn('⚠️  Missing API keys:', envStatus.missingKeys);
    }

    // Check provider health
    const healthStatus = await this.chatService.registry.checkAllProvidersHealth();
    console.log('🏥 Provider Health:');
    for (const [provider, status] of healthStatus) {
      console.log(`   ${status.healthy ? '✅' : '❌'} ${provider}: ${status.healthy ? 'Healthy' : 'Unhealthy'} (${status.responseTime}ms)`);
    }

    console.log('✅ Chat system initialized successfully!\n');
  }

  /**
   * Example 1: Basic chat with automatic fallback
   */
  async basicChatExample() {
    console.log('💬 Basic Chat Example');
    console.log('----------------------');

    try {
      const response = await this.chatService.sendMessage({
        message: "Explain the concept of machine learning in simple terms.",
        preferences: {
          temperature: 0.7,
          maxTokens: 500
        }
      });

      console.log(`🤖 Provider: ${response.provider}`);
      console.log(`📝 Response: ${response.content.substring(0, 100)}...`);
      console.log(`⏱️  Response time: ${response.responseTime}ms`);
      console.log(`🔢 Tokens used: ${response.tokensUsed || 'N/A'}\n`);

    } catch (error) {
      console.error('❌ Chat failed:', error);
    }
  }

  /**
   * Example 2: Streaming chat with real-time response
   */
  async streamingChatExample() {
    console.log('🌊 Streaming Chat Example');
    console.log('--------------------------');

    try {
      const stream = this.chatService.streamMessage({
        message: "Write a short story about a robot learning to paint.",
        preferences: {
          streamResponses: true,
          temperature: 0.8
        }
      });

      console.log('🤖 Streaming response: ');
      
      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          process.stdout.write(chunk.data as string);
        } else if (chunk.type === 'metadata') {
          console.log(`\n\n📊 Metadata:`, chunk.data);
        }
      }
      
      console.log('\n');

    } catch (error) {
      console.error('❌ Streaming failed:', error);
    }
  }

  /**
   * Example 3: Study context integration
   */
  async studyContextExample() {
    console.log('📚 Study Context Example');
    console.log('------------------------');

    const sessionId = this.chatService.createSession(undefined, {
      preferredProvider: 'groq',
      temperature: 0.3, // Lower temperature for study content
      maxContextLength: 20
    });

    const studyMessages = [
      "I'm studying calculus and struggling with derivatives.",
      "Can you explain the power rule?",
      "What about the chain rule?",
      "Give me a practice problem."
    ];

    for (const message of studyMessages) {
      const response = await this.chatService.sendMessage({
        message,
        sessionId,
        context: {
          systemPrompt: "You are a helpful math tutor. Provide clear explanations and examples.",
          studyContext: {
            currentSubject: "Mathematics",
            topic: "Calculus - Derivatives",
            difficulty: "intermediate",
            learningGoals: ["Understand derivative rules", "Solve practice problems"],
            previousPerformance: {
              accuracy: 75,
              totalQuestions: 20,
              topics: ["Limits", "Continuity"]
            }
          }
        }
      });

      console.log(`❓ ${message}`);
      console.log(`✅ ${response.content.substring(0, 150)}...\n`);
    }

    // Clean up session
    this.chatService.deleteSession(sessionId);
  }

  /**
   * Example 4: Provider selection and performance monitoring
   */
  async providerSelectionExample() {
    console.log('🎯 Provider Selection Example');
    console.log('------------------------------');

    const providers: AIProvider[] = ['groq', 'cerebras', 'mistral', 'gemini'];
    const results = [];

    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const response = await this.chatService.sendMessage({
          message: "What is artificial intelligence?",
          provider,
          preferences: {
            maxTokens: 200,
            temperature: 0.5
          }
        });

        results.push({
          provider,
          success: true,
          responseTime: Date.now() - startTime,
          content: response.content.substring(0, 100) + '...'
        });

      } catch (error) {
        results.push({
          provider,
          success: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('📊 Provider Performance:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.provider}: ${result.responseTime}ms - ${result.content}`);
      } else {
        console.log(`❌ ${result.provider}: Failed - ${result.error}`);
      }
    });
    console.log();
  }

  /**
   * Example 5: Error handling and fallback
   */
  async errorHandlingExample() {
    console.log('🛡️  Error Handling Example');
    console.log('---------------------------');

    // Test with intentionally long timeout to trigger fallback
    const response = await this.chatService.sendMessage({
      message: "Explain quantum computing in detail.",
      preferences: {
        maxTokens: 2000,
        temperature: 0.6
      },
      // Force a specific provider that might be slow
      provider: 'gemini'
    });

    console.log(`✅ Successful response from: ${response.provider}`);
    console.log(`📝 Content preview: ${response.content.substring(0, 100)}...`);
    console.log(`⏱️  Total time: ${response.responseTime}ms\n`);
  }

  /**
   * Example 6: Metrics and monitoring
   */
  async metricsExample() {
    console.log('📈 Metrics and Monitoring Example');
    console.log('----------------------------------');

    // Generate some activity
    await this.chatService.sendMessage({ message: "Test message 1" });
    await this.chatService.sendMessage({ message: "Test message 2" });

    // Get service metrics
    const metrics = this.chatService.getMetrics();
    console.log(`📊 Total requests: ${metrics.length}`);
    
    const successfulRequests = metrics.filter(m => m.success);
    console.log(`✅ Successful requests: ${successfulRequests.length}`);
    console.log(`❌ Failed requests: ${metrics.length - successfulRequests.length}`);

    // Get provider metrics
    const providerMetrics = this.chatService.getProviderMetrics();
    console.log('\n🏆 Provider Performance Summary:');
    providerMetrics.forEach(pm => {
      const successRate = pm.totalRequests > 0 
        ? ((pm.successfulRequests / pm.totalRequests) * 100).toFixed(1) 
        : '0';
      console.log(`   ${pm.provider}: ${successRate}% success (${pm.successfulRequests}/${pm.totalRequests})`);
    });
    console.log();
  }

  /**
   * Example 7: Configuration management
   */
  async configurationExample() {
    console.log('⚙️  Configuration Management Example');
    console.log('------------------------------------');

    // Update provider configuration
    this.configManager.setProviderEnabled('gemini', true);
    this.configManager.setProviderPriority('groq', 15);

    // Get current configuration
    const config = this.configManager.getServiceConfig();
    console.log('🔧 Service Configuration:');
    console.log(`   Default provider: ${config.defaultProvider}`);
    console.log(`   Fallback providers: ${config.fallbackProviders.join(', ')}`);
    console.log(`   Timeout: ${config.timeout}ms`);
    console.log(`   Max retries: ${config.maxRetries}`);

    // Check provider configurations
    const providerConfigs = this.configManager.getAllProviderConfigs();
    console.log('\n🏢 Provider Configurations:');
    for (const [provider, providerConfig] of providerConfigs) {
      console.log(`   ${provider}: ${providerConfig.enabled ? 'Enabled' : 'Disabled'} (Priority: ${providerConfig.priority})`);
      console.log(`      Model: ${providerConfig.models.chat}`);
      console.log(`      Streaming: ${providerConfig.capabilities.supportsStreaming ? 'Yes' : 'No'}`);
    }
    console.log();
  }

  /**
   * Example 8: Real-world integration pattern
   */
  async realWorldIntegrationExample() {
    console.log('🌍 Real-World Integration Example');
    console.log('----------------------------------');

    // Simulate a study session
    const sessionId = this.chatService.createSession('user-123', {
      preferredProvider: 'groq',
      temperature: 0.6,
      streamResponses: true
    });

    console.log(`🔑 Created session: ${sessionId}`);

    // Simulate study conversation
    const studyFlow = [
      {
        message: "I need help understanding photosynthesis",
        expectedProvider: 'groq'
      },
      {
        message: "Can you break down the light-dependent reactions?",
        expectedProvider: 'cerebras' // Simulate fallback
      },
      {
        message: "What are the main products of photosynthesis?",
        expectedProvider: 'groq'
      }
    ];

    for (const step of studyFlow) {
      console.log(`\n📚 Study Step: ${step.message}`);
      
      try {
        const stream = this.chatService.streamMessage({
          message: step.message,
          sessionId,
          context: {
            systemPrompt: "You are an expert biology tutor. Provide clear, educational explanations.",
            studyContext: {
              currentSubject: "Biology",
              topic: "Photosynthesis",
              difficulty: "intermediate",
              learningGoals: ["Understand photosynthesis process", "Identify reactants and products"]
            }
          }
        });

        let fullResponse = '';
        for await (const chunk of stream) {
          if (chunk.type === 'content') {
            fullResponse += chunk.data as string;
          }
        }

        console.log(`✅ Response from ${step.expectedProvider}: ${fullResponse.substring(0, 120)}...`);

      } catch (error) {
        console.error(`❌ Failed: ${error}`);
      }
    }

    // Cleanup
    this.chatService.deleteSession(sessionId);
    console.log('\n🧹 Session cleaned up\n');
  }

  /**
   * Run all examples
   */
  async runAllExamples() {
    console.log('🎯 Running Unified AI Chat Interface Examples');
    console.log('==============================================\n');

    try {
      await this.initialize();
      
      await this.basicChatExample();
      await this.studyContextExample();
      await this.providerSelectionExample();
      await this.errorHandlingExample();
      await this.metricsExample();
      await this.configurationExample();
      
      console.log('🌊 Starting streaming example...');
      await this.streamingChatExample();
      
      console.log('🌍 Starting real-world integration example...');
      await this.realWorldIntegrationExample();

      console.log('✅ All examples completed successfully!');
      
    } catch (error) {
      console.error('❌ Example execution failed:', error);
    }
  }
}

// Export for use in other parts of the application
export { ChatIntegrationExample };

// Convenience function for quick testing
export async function runChatExamples() {
  const example = new ChatIntegrationExample();
  await example.runAllExamples();
}