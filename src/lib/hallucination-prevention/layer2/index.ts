// Layer 2: Context & Memory Management System - Main Exports
// =========================================================

// Core component exports
export { EnhancedContextBuilder, enhancedContextBuilder } from './EnhancedContextBuilder';
export { KnowledgeBase, knowledgeBase } from './KnowledgeBase';
export { 
  ConversationMemoryManager, 
  conversationMemory as conversationMemoryManager,
  storeMemory,
  searchMemories,
  linkMemories,
  optimizeMemories,
  getMemoryAnalytics,
  updateMemoryQuality
} from './ConversationMemory';
export { 
  ContextOptimizer, 
  contextOptimizer,
  optimizeContext,
  allocateTokenBudget,
  calculateRelevanceScores,
  adjustContextDynamically
} from './ContextOptimizer';

// Unified Layer 2 Service
import { enhancedContextBuilder, type ContextLevel as EnhancedContextLevel } from './EnhancedContextBuilder';
import { knowledgeBase } from './KnowledgeBase';
import { conversationMemory as conversationMemoryManager } from './ConversationMemory';
import { 
  contextOptimizer, 
  type ContextLevel as OptimizerContextLevel,
  type OptimizationStrategy
} from './ContextOptimizer';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import type { AppDataContext } from '@/types/ai-service-manager';

// Type alias for unified context level
type ContextLevel = OptimizerContextLevel;

export interface Layer2ProcessingRequest {
  userId: string;
  sessionId?: string;
  conversationId?: string;
  message: string;
  chatType?: 'general' | 'study_assistant';
  targetContextLevel: ContextLevel;
  maxTokens: number;
  includeMemory?: boolean;
  includeKnowledge?: boolean;
  includeOptimization?: boolean;
  contextData?: Partial<AppDataContext>;
  options?: Layer2Options;
  metadata?: Record<string, any>;
}

export interface Layer2ProcessingResult {
  context: any;
  optimization: any;
  memory: any;
  knowledge: any;
  processingTime: number;
  recommendations: string[];
  warnings: string[];
  metadata: {
    requestId: string;
    timestamp: string;
    contextLevel: string;
    processingStages: Layer2ProcessingStage[];
  };
}

export interface Layer2Options {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  strictMode?: boolean;
  fallbackEnabled?: boolean;
}

export interface Layer2ProcessingStage {
  stage: 'context_building' | 'knowledge_integration' | 'memory_processing' | 'optimization';
  status: 'completed' | 'failed' | 'skipped';
  duration: number;
  details?: any;
  error?: string;
}

export interface Layer2Configuration {
  defaultContextLevel: ContextLevel;
  defaultTokenLimit: number;
  enableContextBuilding: boolean;
  enableKnowledgeBase: boolean;
  enableMemoryManagement: boolean;
  enableOptimization: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
  maxProcessingTime: number;
  strictMode: boolean;
  fallbackEnabled: boolean;
}

export interface Layer2Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  errorRate: number;
  stageDurations: {
    contextBuilding: number[];
    knowledgeIntegration: number[];
    memoryProcessing: number[];
    optimization: number[];
  };
}

export class Layer2Service {
  private configuration: Layer2Configuration;
  private metrics: Layer2Metrics;
  private requestIdCounter: number = 0;
  private cryptoKey: string;

  constructor(config?: Partial<Layer2Configuration>) {
    this.configuration = {
      defaultContextLevel: 'selective' as ContextLevel,
      defaultTokenLimit: 2000,
      enableContextBuilding: true,
      enableKnowledgeBase: true,
      enableMemoryManagement: true,
      enableOptimization: true,
      enableLogging: true,
      enableMetrics: true,
      maxProcessingTime: 10000,
      strictMode: false,
      fallbackEnabled: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.cryptoKey = process.env.LAYER2_ENCRYPTION_KEY || 'default-layer2-key';
  }

  /**
   * Main processing method - orchestrates all Layer 2 components
   */
  async processContext(request: Layer2ProcessingRequest): Promise<Layer2ProcessingResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const processingStages: Layer2ProcessingStage[] = [];
    
    try {
      logInfo('Layer 2 processing started', {
        componentName: 'Layer2Service',
        requestId,
        userId: request.userId,
        contextLevel: request.targetContextLevel,
        maxTokens: request.maxTokens
      });

      // Step 1: Context Building
      const contextStage = await this.executeStage('context_building', async () => {
        if (!this.configuration.enableContextBuilding) {
          return {
            level: 3 as EnhancedContextLevel,
            context: 'Basic context built',
            metadata: {},
            performanceMetrics: {}
          };
        }

        try {
          const contextRequest = {
            userId: request.userId,
            query: request.message,
            requiredLevel: this.mapStringToNumberLevel(request.targetContextLevel),
            includeMemories: true,
            includePreferences: true,
            priority: 'balance' as const
          };

          const result = await enhancedContextBuilder.buildEnhancedContext(contextRequest);
          return {
            level: result.level,
            context: result.context,
            metadata: result.metadata,
            performanceMetrics: { tokenCount: result.tokenCount, relevanceScore: result.relevanceScore }
          };
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            componentName: 'Layer2Service',
            operation: 'context_building',
            userId: request.userId
          });
          
          return {
            level: this.mapStringToNumberLevel(request.targetContextLevel) as EnhancedContextLevel,
            context: 'Fallback context',
            metadata: { error: 'Context building failed' },
            performanceMetrics: {}
          };
        }
      });

      processingStages.push(contextStage);

      // Step 2: Knowledge Integration
      const knowledgeStage = await this.executeStage('knowledge_integration', async () => {
        if (!this.configuration.enableKnowledgeBase) {
          return { sourcesFound: 0, factsVerified: 0, status: 'skipped' };
        }

        try {
          const searchRequest = {
            query: request.message,
            factTypes: [],
            minReliability: 0.7,
            includeCrossReferences: true,
            limit: 10
          };

          const results = await knowledgeBase.searchSources(searchRequest);
          
          return {
            sourcesFound: results.length,
            factsVerified: results.filter(r => (r.source as any)?.reliability > 0.8).length || 0,
            status: 'completed',
            sources: results
          };
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            componentName: 'Layer2Service',
            operation: 'knowledge_integration',
            userId: request.userId
          });
          
          return { sourcesFound: 0, factsVerified: 0, status: 'failed' };
        }
      });

      processingStages.push(knowledgeStage);

      // Step 3: Memory Processing
      const memoryStage = await this.executeStage('memory_processing', async () => {
        if (!this.configuration.enableMemoryManagement) {
          return { memoriesFound: 0, relevanceScore: 0, status: 'skipped' };
        }

        try {
          const memoryRequest = {
            userId: request.userId,
            conversationId: request.conversationId,
            maxResults: 20,
            minRelevanceScore: 0.5,
            includeExpired: false
          };

          const results = await conversationMemoryManager.searchMemories(memoryRequest);
          
          return {
            memoriesFound: results.length,
            relevanceScore: results.length > 0 ? 
              results.reduce((sum: number, r: any) => sum + (r.relevanceScore || 0), 0) / results.length : 0,
            status: 'completed',
            memories: results
          };
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            componentName: 'Layer2Service',
            operation: 'memory_processing',
            userId: request.userId
          });
          
          return { memoriesFound: 0, relevanceScore: 0, status: 'failed' };
        }
      });

      processingStages.push(memoryStage);

      // Step 4: Context Optimization
      const optimizationStage = await this.executeStage('optimization', async () => {
        if (!this.configuration.enableOptimization) {
          return { strategy: 'none', reduction: 0, status: 'skipped' };
        }

        try {
          const optimizationRequest = {
            userId: request.userId,
            conversationId: request.conversationId,
            originalContext: this.createOptimizableContext(contextStage.details?.context || 'Empty context'),
            targetLevel: request.targetContextLevel,
            maxTokens: request.maxTokens,
            optimizationStrategy: 'hierarchical' as OptimizationStrategy,
            tokenBudgetStrategy: 'adaptive' as const,
            preserveCritical: true,
            preserveRecent: true
          };

          const result = await contextOptimizer.optimizeContext(optimizationRequest);
          return {
            strategy: 'hierarchical',
            reduction: result.tokenReduction?.reductionRatio || 0,
            status: 'completed',
            optimizationResult: result
          };
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            componentName: 'Layer2Service',
            operation: 'optimization',
            userId: request.userId
          });
          
          return { strategy: 'failed', reduction: 0, status: 'failed' };
        }
      });

      processingStages.push(optimizationStage);

      // Generate recommendations and warnings
      const recommendations = this.generateRecommendations(contextStage, knowledgeStage, memoryStage, optimizationStage, request);
      const warnings = this.generateWarnings(contextStage, knowledgeStage, memoryStage, optimizationStage, request);

      const processingTime = Date.now() - startTime;
      
      const result: Layer2ProcessingResult = {
        context: {
          level: contextStage.details?.level || request.targetContextLevel,
          context: contextStage.details?.context || 'No context available',
          metadata: contextStage.details?.metadata || {}
        },
        optimization: {
          strategy: optimizationStage.details?.strategy || 'none',
          reduction: optimizationStage.details?.reduction || 0
        },
        memory: {
          memoriesFound: memoryStage.details?.memoriesFound || 0,
          relevanceScore: memoryStage.details?.relevanceScore || 0
        },
        knowledge: {
          sourcesFound: knowledgeStage.details?.sourcesFound || 0,
          factsVerified: knowledgeStage.details?.factsVerified || 0
        },
        processingTime,
        recommendations,
        warnings,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          contextLevel: request.targetContextLevel,
          processingStages
        }
      };

      // Update metrics
      this.updateMetrics(result, processingTime, true);

      logInfo('Layer 2 processing completed successfully', {
        componentName: 'Layer2Service',
        requestId,
        processingTime,
        contextLevel: result.context.level,
        success: true
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorResult = this.createErrorResult(request, {
        stage: 'context_building',
        status: 'failed',
        duration: processingTime,
        error: error instanceof Error ? error.message : String(error)
      }, requestId);

      this.updateMetrics(errorResult, processingTime, false);

      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer2Service',
        requestId,
        processingTime,
        userId: request.userId
      });

      return errorResult;
    }
  }

  /**
   * Quick context building - for fast responses
   */
  async buildContextOnly(
    userId: string,
    contextLevel: ContextLevel = 'light',
    maxTokens: number = 500,
    contextData?: Partial<AppDataContext>
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      if (!this.configuration.enableContextBuilding) {
        return {
          level: 3 as EnhancedContextLevel,
          context: 'Basic context',
          metadata: {}
        };
      }

      const contextRequest = {
        userId,
        query: 'Quick context build',
        requiredLevel: this.mapStringToNumberLevel(contextLevel) as EnhancedContextLevel,
        includeMemories: true,
        includePreferences: true,
        priority: contextLevel === 'light' ? 'speed' as const : 'balance' as const
      };

      const result = await enhancedContextBuilder.buildEnhancedContext(contextRequest);

      logInfo('Quick context build completed', {
        componentName: 'Layer2Service',
        requestId,
        userId,
        contextLevel,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer2Service',
        operation: 'build_context_only',
        requestId,
        userId
      });

      return {
        level: this.mapStringToNumberLevel(contextLevel) as EnhancedContextLevel,
        context: 'Fallback context',
        metadata: { error: 'Context building failed' }
      };
    }
  }

  /**
   * Knowledge search only - for fact checking and verification
   */
  async searchKnowledgeOnly(
    userId: string,
    query: string,
    options?: {
      limit?: number;
      minReliability?: number;
      includeVerification?: boolean;
    }
  ): Promise<any[]> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      if (!this.configuration.enableKnowledgeBase) {
        return [];
      }

      const searchRequest = {
        query,
        factTypes: [],
        minReliability: options?.minReliability || 0.7,
        includeCrossReferences: options?.includeVerification || true,
        limit: options?.limit || 10
      };

      const result = await knowledgeBase.searchSources(searchRequest);

      logInfo('Knowledge search completed', {
        componentName: 'Layer2Service',
        requestId,
        userId,
        query: query.substring(0, 50),
        resultCount: result.length,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer2Service',
        operation: 'search_knowledge_only',
        requestId,
        userId
      });

      return [];
    }
  }

  /**
   * Memory processing only - for conversation continuity
   */
  async processMemoryOnly(
    userId: string,
    conversationId?: string,
    options?: {
      maxResults?: number;
      minRelevanceScore?: number;
      includeOptimization?: boolean;
    }
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      if (!this.configuration.enableMemoryManagement) {
        return {
          memories: [],
          summary: {
            totalMemories: 0,
            averageRelevance: 0,
            crossConversationLinks: 0
          }
        };
      }

      const memoryRequest = {
        userId,
        conversationId,
        maxResults: options?.maxResults || 20,
        minRelevanceScore: options?.minRelevanceScore || 0.5,
        includeExpired: false
      };

      const searchResult = await conversationMemoryManager.searchMemories(memoryRequest);
      
      let optimizationResult = null;
      if (options?.includeOptimization && searchResult.length > 0) {
        try {
          const optimizationRequest = {
            userId,
            conversationId,
            optimizationType: 'linking' as const,
            preserveRecent: true
          };
          
          optimizationResult = await conversationMemoryManager.optimizeMemories(optimizationRequest);
        } catch (optError) {
          logWarning('Memory optimization failed', { error: optError });
        }
      }

      logInfo('Memory processing completed', {
        componentName: 'Layer2Service',
        requestId,
        userId,
        conversationId,
        memoriesFound: searchResult.length,
        processingTime: Date.now() - startTime
      });

      return {
        memories: searchResult,
        optimization: optimizationResult,
        summary: {
          totalMemories: searchResult.length,
          averageRelevance: searchResult.length > 0 ? 
            searchResult.reduce((sum: number, r: any) => sum + (r.relevanceScore || 0), 0) / searchResult.length : 0,
          crossConversationLinks: searchResult.filter((r: any) => r.memory?.metadata?.crossConversationLinked).length
        }
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer2Service',
        operation: 'process_memory_only',
        requestId,
        userId
      });

      return {
        memories: [],
        optimization: null,
        summary: {
          totalMemories: 0,
          averageRelevance: 0,
          crossConversationLinks: 0
        }
      };
    }
  }

  /**
   * Context optimization only - for token budget management
   */
  async optimizeContextOnly(
    context: any,
    userId: string,
    maxTokens: number,
    strategy: OptimizationStrategy = 'hierarchical'
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      if (!this.configuration.enableOptimization) {
        return {
          originalTokens: 0,
          optimizedTokens: 0,
          reduction: 0,
          strategy: 'disabled'
        };
      }

      const optimizationRequest = {
        userId,
        originalContext: this.createOptimizableContext(context),
        targetLevel: 'selective' as ContextLevel,
        maxTokens,
        optimizationStrategy: strategy,
        tokenBudgetStrategy: 'adaptive' as const,
        preserveCritical: true,
        preserveRecent: true
      };

      const result = await contextOptimizer.optimizeContext(optimizationRequest);

      logInfo('Context optimization completed', {
        componentName: 'Layer2Service',
        requestId,
        userId,
        originalTokens: result.tokenReduction?.original || 0,
        optimizedTokens: result.tokenReduction?.optimized || 0,
        reductionRatio: result.tokenReduction?.reductionRatio || 0,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer2Service',
        operation: 'optimize_context_only',
        requestId,
        userId
      });

      throw new Error(`Context optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Layer2Metrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<Layer2Configuration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): Layer2Configuration {
    return { ...this.configuration };
  }

  // Private helper methods

  private async executeStage<T>(
    stage: Layer2ProcessingStage['stage'],
    operation: () => Promise<T>
  ): Promise<Layer2ProcessingStage & { details?: T; error?: string }> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      return {
        stage,
        status: 'completed',
        duration,
        details: result as any
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        stage,
        status: 'failed',
        duration,
        error: errorMessage
      } as any;
    }
  }

  private createErrorResult(
    request: Layer2ProcessingRequest,
    failedStage: Layer2ProcessingStage,
    requestId: string
  ): Layer2ProcessingResult {
    return {
      context: {
        level: request.targetContextLevel,
        context: 'Error context',
        metadata: { error: failedStage.error }
      },
      optimization: {
        strategy: 'failed',
        reduction: 0
      },
      memory: {
        memoriesFound: 0,
        relevanceScore: 0
      },
      knowledge: {
        sourcesFound: 0,
        factsVerified: 0
      },
      processingTime: failedStage.duration,
      recommendations: ['Please try again or contact support if the issue persists.'],
      warnings: [`Processing failed at ${failedStage.stage} stage: ${failedStage.error}`],
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        contextLevel: request.targetContextLevel,
        processingStages: [failedStage]
      }
    };
  }

  private createOptimizableContext(context: any): any {
    // Convert string context to OptimizableContext format for ContextOptimizer
    return {
      userProfile: {
        id: 'user',
        academicLevel: 'high_school',
        subjects: [],
        strengths: [],
        weaknesses: [],
        studyGoals: [],
        learningStyle: { visual: 0.5, auditory: 0.5, kinesthetic: 0.5, reading: 0.5, preferredFormats: [] },
        preferences: { responseFormat: 'plain_text', detailLevel: 'detailed', languageStyle: 'formal', feedbackPreference: 'immediate' },
        progressData: { totalBlocksCompleted: 0, currentStreak: 0, totalStudyTime: 0, subjectProgress: {}, recentAchievements: [], learningVelocity: 0 },
        totalTokens: 0
      },
      conversationHistory: [],
      knowledgeBase: [],
      externalSources: [],
      systemContext: {
        sessionInfo: { sessionId: 'session', startTime: new Date(), duration: 0, interactionCount: 0, contextSwitches: 0 },
        systemStatus: { status: 'operational', activeServices: [], performance: { responseTime: 0, accuracy: 0, userSatisfaction: 0, contextRelevance: 0 }, alerts: [] },
        availableFeatures: [],
        currentTime: new Date(),
        tokenCount: 0
      },
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: 1,
        contextHash: '',
        optimizationHistory: [],
        accessPatterns: [],
        qualityMetrics: { averageRelevance: 0.5, averageQuality: 0.5, completeness: 1.0, freshness: 1.0, consistency: 1.0 }
      },
      totalTokens: 0
    };
  }

  private mapStringToNumberLevel(level: ContextLevel): EnhancedContextLevel {
    const mapping = {
      'light': 1,
      'recent': 2,
      'selective': 3,
      'full': 4
    } as const;
    
    return mapping[level] as EnhancedContextLevel;
  }

  private generateRecommendations(
    context: any,
    knowledge: any,
    memory: any,
    optimization: any,
    request: Layer2ProcessingRequest
  ): string[] {
    const recommendations: string[] = [];

    if (context?.status === 'failed') {
      recommendations.push('Context building failed - using fallback context');
    }

    if (knowledge?.sourcesFound < 3) {
      recommendations.push('Consider expanding knowledge base search for better fact coverage');
    }

    if (memory?.relevanceScore < 0.6) {
      recommendations.push('Improve memory relevance scoring for better conversation continuity');
    }

    if (optimization?.reduction > 0.5) {
      recommendations.push('High token reduction may impact context quality');
    }

    return recommendations;
  }

  private generateWarnings(
    context: any,
    knowledge: any,
    memory: any,
    optimization: any,
    request: Layer2ProcessingRequest
  ): string[] {
    const warnings: string[] = [];

    if (context?.status === 'failed') {
      warnings.push('Context building failed');
    }

    if (knowledge?.status === 'failed') {
      warnings.push('Knowledge integration failed');
    }

    if (memory?.status === 'failed') {
      warnings.push('Memory processing failed');
    }

    if (optimization?.status === 'failed') {
      warnings.push('Context optimization failed');
    }

    return warnings;
  }

  private updateMetrics(result: Layer2ProcessingResult, processingTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (!success) {
      this.metrics.errorRate++;
    }

    // Update average processing time
    this.metrics.averageProcessingTime = (
      (this.metrics.averageProcessingTime * (this.metrics.totalRequests - 1)) + processingTime
    ) / this.metrics.totalRequests;

    // Update stage durations
    for (const stage of result.metadata.processingStages) {
      const stageKey = stage.stage.replace('_', '') as keyof typeof this.metrics.stageDurations;
      if (this.metrics.stageDurations[stageKey]) {
        this.metrics.stageDurations[stageKey].push(stage.duration);
        
        // Keep only last 100 measurements
        if (this.metrics.stageDurations[stageKey].length > 100) {
          this.metrics.stageDurations[stageKey].shift();
        }
      }
    }
  }

  private initializeMetrics(): Layer2Metrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      stageDurations: {
        contextBuilding: [],
        knowledgeIntegration: [],
        memoryProcessing: [],
        optimization: []
      }
    };
  }

  private generateRequestId(): string {
    return `layer2_${Date.now()}_${++this.requestIdCounter}`;
  }
}

// Export singleton instance
export const layer2Service = new Layer2Service();

// Convenience functions
export const processContext = (request: Layer2ProcessingRequest) => 
  layer2Service.processContext(request);

export const buildContextOnly = (
  userId: string, 
  contextLevel?: ContextLevel, 
  maxTokens?: number, 
  contextData?: Partial<AppDataContext>
) => layer2Service.buildContextOnly(userId, contextLevel, maxTokens, contextData);

export const searchKnowledgeOnly = (
  userId: string, 
  query: string, 
  options?: { limit?: number; minReliability?: number; includeVerification?: boolean }
) => layer2Service.searchKnowledgeOnly(userId, query, options);

export const processMemoryOnly = (
  userId: string, 
  conversationId?: string, 
  options?: { maxResults?: number; minRelevanceScore?: number; includeOptimization?: boolean }
) => layer2Service.processMemoryOnly(userId, conversationId, options);

export const optimizeContextOnly = (
  context: any, 
  userId: string, 
  maxTokens: number, 
  strategy?: OptimizationStrategy
) => layer2Service.optimizeContextOnly(context, userId, maxTokens, strategy);