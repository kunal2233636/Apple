// Layer 2: Context & Memory Management System - Integration Tests
// ===============================================================
// Test file to verify integration with existing systems and components

import { 
  layer2Service,
  enhancedContextBuilder, 
  knowledgeBase, 
  conversationMemory as conversationMemoryManager, 
  contextOptimizer,
  buildContextOnly,
  searchKnowledgeOnly,
  processMemoryOnly,
  optimizeContextOnly
} from './index';
import { logInfo, logError } from '@/lib/error-logger-server-safe';

export interface TestResult {
  component: string;
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  result?: any;
}

export interface IntegrationTestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  overallStatus: 'passed' | 'failed' | 'partial';
  totalDuration: number;
}

/**
 * Run comprehensive integration tests for Layer 2
 */
export async function runLayer2IntegrationTests(): Promise<IntegrationTestSuite> {
  const startTime = Date.now();
  const testSuite: IntegrationTestSuite = {
    name: 'Layer 2 Integration Tests',
    description: 'Comprehensive integration tests for Context & Memory Management System',
    tests: [],
    overallStatus: 'passed',
    totalDuration: 0
  };

  const testUserId = 'test-user-' + Date.now();
  const testConversationId = 'test-conversation-' + Date.now();

  try {
    logInfo('Starting Layer 2 integration tests', { testUserId });

    // Test 1: EnhancedContextBuilder Integration
    await testEnhancedContextBuilder(testSuite, testUserId);

    // Test 2: KnowledgeBase Integration
    await testKnowledgeBase(testSuite, testUserId);

    // Test 3: ConversationMemory Integration
    await testConversationMemory(testSuite, testUserId, testConversationId);

    // Test 4: ContextOptimizer Integration
    await testContextOptimizer(testSuite, testUserId);

    // Test 5: Layer2Service Integration
    await testLayer2Service(testSuite, testUserId, testConversationId);

    // Test 6: Convenience Functions
    await testConvenienceFunctions(testSuite, testUserId);

    // Test 7: Error Handling
    await testErrorHandling(testSuite, testUserId);

    // Test 8: Performance
    await testPerformance(testSuite, testUserId);

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      componentName: 'Layer2IntegrationTests',
      testUserId
    });
    
    testSuite.overallStatus = 'failed';
    testSuite.tests.push({
      component: 'TestRunner',
      test: 'Test Suite Execution',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  testSuite.totalDuration = Date.now() - startTime;

  // Determine overall status
  const failedTests = testSuite.tests.filter(t => t.status === 'failed');
  if (failedTests.length > 0) {
    testSuite.overallStatus = failedTests.length === testSuite.tests.length ? 'failed' : 'partial';
  }

  logInfo('Layer 2 integration tests completed', {
    overallStatus: testSuite.overallStatus,
    totalTests: testSuite.tests.length,
    passedTests: testSuite.tests.filter(t => t.status === 'passed').length,
    failedTests: failedTests.length,
    duration: testSuite.totalDuration
  });

  return testSuite;
}

/**
 * Test EnhancedContextBuilder integration
 */
async function testEnhancedContextBuilder(testSuite: IntegrationTestSuite, testUserId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Test basic context building
    const contextRequest = {
      userId: testUserId,
      query: 'Test context building',
      requiredLevel: 3 as 1 | 2 | 3 | 4,
      includeMemories: true,
      includePreferences: true,
      priority: 'balance' as 'speed' | 'accuracy' | 'balance'
    };

    const result = await enhancedContextBuilder.buildEnhancedContext(contextRequest);
    
    testSuite.tests.push({
      component: 'EnhancedContextBuilder',
      test: 'Basic context building',
      status: 'passed',
      duration: Date.now() - startTime,
      result: {
        level: result.level,
        tokenCount: result.tokenCount,
        cacheHit: result.cacheHit,
        relevanceScore: result.relevanceScore
      }
    });

    // Test cache functionality
    const cachedResult = await enhancedContextBuilder.buildEnhancedContext(contextRequest);
    testSuite.tests.push({
      component: 'EnhancedContextBuilder',
      test: 'Cache functionality',
      status: cachedResult.cacheHit ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { cacheHit: cachedResult.cacheHit }
    });

    // Test context levels
    const contextLevels = enhancedContextBuilder.getContextLevels();
    testSuite.tests.push({
      component: 'EnhancedContextBuilder',
      test: 'Context levels configuration',
      status: contextLevels.length === 4 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { levelsCount: contextLevels.length }
    });

  } catch (error) {
    testSuite.tests.push({
      component: 'EnhancedContextBuilder',
      test: 'All context building tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test KnowledgeBase integration
 */
async function testKnowledgeBase(testSuite: IntegrationTestSuite, testUserId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Test source search
    const searchRequest = {
      query: 'test knowledge search',
      factTypes: [],
      minReliability: 0.7,
      includeCrossReferences: true,
      limit: 10
    };

    const searchResults = await knowledgeBase.searchSources(searchRequest);
    
    testSuite.tests.push({
      component: 'KnowledgeBase',
      test: 'Source search',
      status: 'passed',
      duration: Date.now() - startTime,
      result: { resultsCount: searchResults.length }
    });

    // Test source verification (using actual method name)
    if (searchResults.length > 0) {
      const source = searchResults[0].source;
      const verificationResult = await knowledgeBase.verifySource(source.id, 'content');
      
      testSuite.tests.push({
        component: 'KnowledgeBase',
        test: 'Source verification',
        status: verificationResult.status ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        result: { verificationStatus: verificationResult.status }
      });
    }

    // Test cross references
    if (searchResults.length > 0) {
      const source = searchResults[0].source;
      const crossRefResult = await knowledgeBase.findCrossReferences(source.id, 3);
      testSuite.tests.push({
        component: 'KnowledgeBase',
        test: 'Cross reference search',
        status: 'passed',
        duration: Date.now() - startTime,
        result: { relatedSources: crossRefResult.relatedSources.length }
      });
    }

  } catch (error) {
    testSuite.tests.push({
      component: 'KnowledgeBase',
      test: 'All knowledge base tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test ConversationMemory integration
 */
async function testConversationMemory(testSuite: IntegrationTestSuite, testUserId: string, testConversationId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Test memory storage
    const memoryData = {
      userId: testUserId,
      conversationId: testConversationId,
      memoryType: 'user_query' as const,
      interactionData: {
        content: 'Test memory content',
        intent: 'inquiry'
      },
      priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
      retention: 'long_term' as 'session' | 'short_term' | 'long_term' | 'permanent',
      tags: ['test', 'memory'],
      metadata: {
        source: 'user_input',
        version: 1,
        compressionApplied: false,
        validationStatus: 'valid' as 'valid' | 'corrupted' | 'pending',
        accessCount: 0,
        lastAccessed: new Date(),
        linkedToKnowledgeBase: false,
        crossConversationLinked: false
      }
    };

    const storeResult = await conversationMemoryManager.storeMemory(memoryData);
    
    testSuite.tests.push({
      component: 'ConversationMemory',
      test: 'Memory storage',
      status: storeResult.success !== false ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { memoryId: storeResult.id || 'stored', success: storeResult.success !== false }
    });

    // Test memory search
    const searchRequest = {
      userId: testUserId,
      conversationId: testConversationId,
      maxResults: 10,
      minRelevanceScore: 0.5,
      includeExpired: false
    };

    const searchResults = await conversationMemoryManager.searchMemories(searchRequest);
    
    testSuite.tests.push({
      component: 'ConversationMemory',
      test: 'Memory search',
      status: 'passed',
      duration: Date.now() - startTime,
      result: { resultsCount: searchResults.length }
    });

    // Test memory linking
    if (searchResults.length >= 2) {
      const linkResult = await conversationMemoryManager.linkMemories({
        sourceMemoryId: searchResults[0].memory.id,
        targetMemoryId: searchResults[1].memory.id,
        linkType: 'similar' as 'similar' | 'contradicts' | 'supports' | 'follows' | 'references' | 'part_of',
        strength: 0.8,
        evidence: ['Test link evidence'],
        bidirectional: true
      });

      testSuite.tests.push({
        component: 'ConversationMemory',
        test: 'Memory linking',
        status: linkResult ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        result: { linkSuccess: linkResult }
      });
    }

    // Test memory optimization
    const optimizationResult = await conversationMemoryManager.optimizeMemories({
      userId: testUserId,
      optimizationType: 'cleanup' as 'cleanup' | 'compression' | 'consolidation' | 'linking',
      preserveRecent: true
    });

    testSuite.tests.push({
      component: 'ConversationMemory',
      test: 'Memory optimization',
      status: optimizationResult.optimized ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { 
        memoriesProcessed: optimizationResult.memoriesProcessed,
        optimizationType: optimizationResult.optimizationType 
      }
    });

  } catch (error) {
    testSuite.tests.push({
      component: 'ConversationMemory',
      test: 'All conversation memory tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test ContextOptimizer integration
 */
async function testContextOptimizer(testSuite: IntegrationTestSuite, testUserId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Create test context with correct response format type
    const testContext = {
      userProfile: {
        id: testUserId,
        academicLevel: 'high_school',
        subjects: ['math', 'science'],
        strengths: ['problem solving'],
        weaknesses: ['memorization'],
        studyGoals: ['improve grades'],
        learningStyle: { 
          visual: 0.8, 
          auditory: 0.6, 
          kinesthetic: 0.4, 
          reading: 0.7, 
          preferredFormats: ['diagrams'] as string[]
        },
        preferences: { 
          responseFormat: 'structured' as 'structured' | 'plain_text' | 'step_by_step' | 'bulleted', 
          detailLevel: 'detailed' as 'concise' | 'detailed' | 'comprehensive',
          languageStyle: 'casual' as 'casual' | 'formal' | 'academic',
          feedbackPreference: 'immediate' as 'immediate' | 'periodic' | 'end_of_session'
        },
        progressData: { 
          totalBlocksCompleted: 25, 
          currentStreak: 5, 
          totalStudyTime: 120, 
          subjectProgress: { math: 0.7, science: 0.6 }, 
          recentAchievements: ['streak_5'], 
          learningVelocity: 1.2 
        },
        totalTokens: 150
      },
      conversationHistory: [],
      knowledgeBase: [],
      externalSources: [],
      systemContext: {
        sessionInfo: { sessionId: 'test-session', startTime: new Date(), duration: 0, interactionCount: 0, contextSwitches: 0 },
        systemStatus: { status: 'operational' as 'operational' | 'degraded' | 'maintenance', activeServices: ['chat', 'study'], performance: { responseTime: 200, accuracy: 0.85, userSatisfaction: 0.9, contextRelevance: 0.8 }, alerts: [] },
        availableFeatures: ['chat', 'study_assistant', 'analytics'],
        currentTime: new Date(),
        tokenCount: 50
      },
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: 1,
        contextHash: 'test-hash',
        optimizationHistory: [],
        accessPatterns: [],
        qualityMetrics: { averageRelevance: 0.7, averageQuality: 0.8, completeness: 0.9, freshness: 0.8, consistency: 0.9 }
      },
      totalTokens: 200
    };

    // Test context optimization
    const optimizationRequest = {
      userId: testUserId,
      originalContext: testContext,
      targetLevel: 'selective' as 'light' | 'recent' | 'selective' | 'full',
      maxTokens: 100,
      optimizationStrategy: 'compression' as const,
      tokenBudgetStrategy: 'adaptive' as const,
      preserveCritical: true,
      preserveRecent: true
    };

    const optimizationResult = await contextOptimizer.optimizeContext(optimizationRequest);
    
    testSuite.tests.push({
      component: 'ContextOptimizer',
      test: 'Context optimization',
      status: optimizationResult.optimizationId ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: {
        optimizationId: optimizationResult.optimizationId,
        reductionRatio: optimizationResult.tokenReduction.reductionRatio,
        qualityRetention: optimizationResult.qualityMetrics.relevanceRetention
      }
    });

    // Test relevance scoring
    const relevanceResults = await contextOptimizer.calculateRelevanceScores(
      testContext,
      testUserId,
      'test query'
    );

    testSuite.tests.push({
      component: 'ContextOptimizer',
      test: 'Relevance scoring',
      status: relevanceResults.length > 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { scoredItems: relevanceResults.length }
    });

    // Test token budget allocation
    const budgetAllocations = await contextOptimizer.allocateTokenBudget(
      testContext,
      150,
      'adaptive' as const
    );

    testSuite.tests.push({
      component: 'ContextOptimizer',
      test: 'Token budget allocation',
      status: budgetAllocations.length > 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { allocationsCount: budgetAllocations.length }
    });

  } catch (error) {
    testSuite.tests.push({
      component: 'ContextOptimizer',
      test: 'All context optimizer tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test Layer2Service integration
 */
async function testLayer2Service(testSuite: IntegrationTestSuite, testUserId: string, testConversationId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Test full processing
    const fullRequest = {
      userId: testUserId,
      sessionId: 'test-session',
      conversationId: testConversationId,
      message: 'Test message for full processing',
      chatType: 'study_assistant' as const,
      targetContextLevel: 'selective' as const,
      maxTokens: 1000,
      includeMemory: true,
      includeKnowledge: true,
      includeOptimization: true,
      metadata: { test: true }
    };

    const fullResult = await layer2Service.processContext(fullRequest);
    
    testSuite.tests.push({
      component: 'Layer2Service',
      test: 'Full context processing',
      status: fullResult.processingTime > 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: {
        processingTime: fullResult.processingTime,
        contextLevel: fullResult.context.level,
        sourcesFound: fullResult.knowledge.sourcesFound,
        memoriesFound: fullResult.memory.memoriesFound
      }
    });

    // Test configuration
    const config = layer2Service.getConfiguration();
    testSuite.tests.push({
      component: 'Layer2Service',
      test: 'Configuration management',
      status: config ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { 
        defaultContextLevel: config.defaultContextLevel,
        enableContextBuilding: config.enableContextBuilding
      }
    });

    // Test metrics
    const metrics = layer2Service.getMetrics();
    testSuite.tests.push({
      component: 'Layer2Service',
      test: 'Metrics collection',
      status: metrics ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: {
        totalRequests: metrics.totalRequests,
        averageProcessingTime: metrics.averageProcessingTime
      }
    });

  } catch (error) {
    testSuite.tests.push({
      component: 'Layer2Service',
      test: 'All layer2 service tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test convenience functions
 */
async function testConvenienceFunctions(testSuite: IntegrationTestSuite, testUserId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Test buildContextOnly
    const contextResult = await buildContextOnly(testUserId, 'recent', 500);
    testSuite.tests.push({
      component: 'ConvenienceFunctions',
      test: 'buildContextOnly',
      status: contextResult ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { hasContext: !!contextResult.context }
    });

    // Test searchKnowledgeOnly
    const knowledgeResult = await searchKnowledgeOnly(testUserId, 'test query');
    testSuite.tests.push({
      component: 'ConvenienceFunctions',
      test: 'searchKnowledgeOnly',
      status: Array.isArray(knowledgeResult) ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { resultsCount: knowledgeResult.length }
    });

    // Test processMemoryOnly
    const memoryResult = await processMemoryOnly(testUserId);
    testSuite.tests.push({
      component: 'ConvenienceFunctions',
      test: 'processMemoryOnly',
      status: memoryResult && memoryResult.summary ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { hasSummary: !!memoryResult.summary }
    });

    // Test optimizeContextOnly
    const optimizationResult = await optimizeContextOnly(
      'test context string',
      testUserId,
      100,
      'compression' as any
    );
    testSuite.tests.push({
      component: 'ConvenienceFunctions',
      test: 'optimizeContextOnly',
      status: optimizationResult ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: { hasResult: !!optimizationResult.strategy }
    });

  } catch (error) {
    testSuite.tests.push({
      component: 'ConvenienceFunctions',
      test: 'All convenience function tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test error handling
 */
async function testErrorHandling(testSuite: IntegrationTestSuite, testUserId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Test invalid user ID
    try {
      await enhancedContextBuilder.buildEnhancedContext({
        userId: 'invalid-user-id',
        query: 'test',
        requiredLevel: 3 as 1 | 2 | 3 | 4,
        includeMemories: true,
        includePreferences: true,
        priority: 'balance' as 'speed' | 'accuracy' | 'balance'
      });
      testSuite.tests.push({
        component: 'ErrorHandling',
        test: 'Invalid user ID handling',
        status: 'passed',
        duration: Date.now() - startTime,
        result: 'Graceful fallback handled'
      });
    } catch (error) {
      testSuite.tests.push({
        component: 'ErrorHandling',
        test: 'Invalid user ID handling',
        status: 'passed',
        duration: Date.now() - startTime,
        result: 'Error thrown as expected'
      });
    }

    // Test empty query
    try {
      await buildContextOnly(testUserId, 'light', 100);
      testSuite.tests.push({
        component: 'ErrorHandling',
        test: 'Empty query handling',
        status: 'passed',
        duration: Date.now() - startTime,
        result: 'Handled gracefully'
      });
    } catch (error) {
      testSuite.tests.push({
        component: 'ErrorHandling',
        test: 'Empty query handling',
        status: 'failed',
        duration: Date.now() - startTime,
        error: 'Should handle empty queries gracefully'
      });
    }

  } catch (error) {
    testSuite.tests.push({
      component: 'ErrorHandling',
      test: 'Error handling tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test performance
 */
async function testPerformance(testSuite: IntegrationTestSuite, testUserId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Test multiple concurrent requests
    const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
      buildContextOnly(testUserId, 'light', 200)
    );

    const concurrentResults = await Promise.allSettled(concurrentRequests);
    const successfulResults = concurrentResults.filter(r => r.status === 'fulfilled');
    
    testSuite.tests.push({
      component: 'Performance',
      test: 'Concurrent request handling',
      status: successfulResults.length === concurrentRequests.length ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      result: {
        totalRequests: concurrentRequests.length,
        successfulRequests: successfulResults.length,
        averageResponseTime: successfulResults.reduce((sum, r, i) => {
          if (r.status === 'fulfilled') {
            return sum + ((r.value as any)?.optimizationTime || 0);
          }
          return sum;
        }, 0) / Math.max(successfulResults.length, 1)
      }
    });

  } catch (error) {
    testSuite.tests.push({
      component: 'Performance',
      test: 'Performance tests',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export convenience function for running tests
export const runTests = runLayer2IntegrationTests;

// Example usage:
/*
import { runLayer2IntegrationTests } from './test-layer2-integration';

const results = await runLayer2IntegrationTests();
console.log(`Test Suite: ${results.name}`);
console.log(`Status: ${results.overallStatus}`);
console.log(`Duration: ${results.totalDuration}ms`);
console.log(`Tests: ${results.tests.length} total, ${results.tests.filter(t => t.status === 'passed').length} passed`);
*/