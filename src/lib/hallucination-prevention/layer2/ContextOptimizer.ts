// Layer 2: Context Optimizer for Token Budget Management
// ========================================================
// ContextOptimizer - Intelligent context optimization for study sessions
// with token budget management, quality preservation, and adaptive compression

import { EnhancedContext, ContextLevel } from './EnhancedContextBuilder';
import { KnowledgeSearchResult } from './KnowledgeBase';
import { MemorySearchResult } from './ConversationMemory';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';

export type OptimizationStrategy = 'quality_preserving' | 'size_reducing' | 'balanced' | 'performance_oriented';
export type ContextComponent = 'profile' | 'knowledge' | 'memory' | 'sources' | 'history';

export interface OptimizationRequest {
  context: EnhancedContext;
  tokenLimit: number;
  strategy: OptimizationStrategy;
  preserveComponents?: ContextComponent[];
  minimumQuality?: number;
  educationalPriority?: boolean;
  queryContext?: string;
}

export interface OptimizationResult {
  optimizedContext: EnhancedContext;
  tokenReduction: number;
  qualityScore: number;
  compressionRatio: number;
  preservedInformation: PreservedInformation;
  optimizationDetails: OptimizationDetails;
  recommendations: string[];
}

export interface PreservedInformation {
  criticalFacts: string[];
  learningObjectives: string[];
  studentPreferences: Partial<{
    learningStyle: string;
    difficulty: number;
    subjects: string[];
  }>;
  recentProgress: string;
  knowledgeGaps: string[];
}

export interface OptimizationDetails {
  originalTokenCount: number;
  optimizedTokenCount: number;
  componentsOptimized: ContextComponent[];
  compressionTechniques: string[];
  tradeoffs: OptimizationTradeoff[];
  performanceImpact: number;
}

export interface OptimizationTradeoff {
  component: ContextComponent;
  originalSize: number;
  optimizedSize: number;
  informationLoss: number;
  qualityImpact: number;
  reason: string;
}

export interface TokenBudget {
  total: number;
  allocated: Record<ContextComponent, number>;
  remaining: number;
  efficiency: number;
}

export interface CompressionProfile {
  component: ContextComponent;
  baseCompression: number;
  qualityWeight: number;
  educationalWeight: number;
  priority: number;
  maxCompression: number;
}

export class ContextOptimizer {
  private static readonly DEFAULT_TOKEN_LIMIT = 2048;
  private static readonly MIN_QUALITY_THRESHOLD = 0.6;
  private static readonly OPTIMIZATION_CACHE_SIZE = 100;

  private compressionProfiles: Map<ContextComponent, CompressionProfile> = new Map();
  private optimizationCache: Map<string, { result: OptimizationResult; timestamp: Date; expiresAt: Date }> = new Map();

  constructor() {
    this.initializeCompressionProfiles();
    this.startCacheCleanup();
  }

  /**
   * Optimize context for token budget
   */
  async optimizeContext(request: OptimizationRequest): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      logInfo('Context optimization started', {
        componentName: 'ContextOptimizer',
        tokenLimit: request.tokenLimit,
        strategy: request.strategy,
        originalTokens: request.context.tokenUsage.total
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.optimizationCache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        logInfo('Returning cached optimization result', {
          componentName: 'ContextOptimizer',
          originalTokens: request.context.tokenUsage.total,
          cachedTokens: cached.result.optimizedContext.tokenUsage.total
        });
        return cached.result;
      }

      // Validate input
      const validation = this.validateOptimizationRequest(request);
      if (!validation.isValid) {
        throw new Error(`Invalid optimization request: ${validation.errors.join(', ')}`);
      }

      // Calculate token budget allocation
      const tokenBudget = this.calculateTokenBudget(request);
      
      // Apply optimization strategy
      let optimizedContext = { ...request.context };
      const optimizationDetails: OptimizationDetails = {
        originalTokenCount: request.context.tokenUsage.total,
        optimizedTokenCount: request.context.tokenUsage.total,
        componentsOptimized: [],
        compressionTechniques: [],
        tradeoffs: [],
        performanceImpact: 0
      };

      switch (request.strategy) {
        case 'quality_preserving':
          const qualityResult = await this.applyQualityPreservingOptimization(optimizedContext, tokenBudget, request);
          optimizedContext = qualityResult.context;
          optimizationDetails.tradeoffs = qualityResult.tradeoffs;
          optimizationDetails.compressionTechniques = qualityResult.techniques;
          break;

        case 'size_reducing':
          const sizeResult = await this.applySizeReducingOptimization(optimizedContext, tokenBudget, request);
          optimizedContext = sizeResult.context;
          optimizationDetails.tradeoffs = sizeResult.tradeoffs;
          optimizationDetails.compressionTechniques = sizeResult.techniques;
          break;

        case 'balanced':
          const balancedResult = await this.applyBalancedOptimization(optimizedContext, tokenBudget, request);
          optimizedContext = balancedResult.context;
          optimizationDetails.tradeoffs = balancedResult.tradeoffs;
          optimizationDetails.compressionTechniques = balancedResult.techniques;
          break;

        case 'performance_oriented':
          const performanceResult = await this.applyPerformanceOptimization(optimizedContext, tokenBudget, request);
          optimizedContext = performanceResult.context;
          optimizationDetails.tradeoffs = performanceResult.tradeoffs;
          optimizationDetails.compressionTechniques = performanceResult.techniques;
          break;
      }

      // Calculate final metrics
      const finalTokenUsage = this.calculateTokenUsage(optimizedContext);
      optimizedContext.tokenUsage = finalTokenUsage;
      optimizationDetails.optimizedTokenCount = finalTokenUsage.total;

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(optimizedContext, request);
      
      // Create preserved information summary
      const preservedInformation = this.extractPreservedInformation(optimizedContext, request);
      
      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(optimizedContext, request, optimizationDetails);

      const result: OptimizationResult = {
        optimizedContext,
        tokenReduction: request.context.tokenUsage.total - finalTokenUsage.total,
        qualityScore,
        compressionRatio: finalTokenUsage.total / request.context.tokenUsage.total,
        preservedInformation,
        optimizationDetails: {
          ...optimizationDetails,
          componentsOptimized: this.identifyOptimizedComponents(request.context, optimizedContext)
        },
        recommendations
      };

      // Cache the result
      this.optimizationCache.set(cacheKey, {
        result,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      });

      const processingTime = Date.now() - startTime;
      logInfo('Context optimization completed', {
        componentName: 'ContextOptimizer',
        originalTokens: request.context.tokenUsage.total,
        optimizedTokens: finalTokenUsage.total,
        qualityScore,
        processingTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ContextOptimizer',
        operation: 'optimize_context',
        tokenLimit: request.tokenLimit
      });

      // Return original context if optimization fails
      return {
        optimizedContext: request.context,
        tokenReduction: 0,
        qualityScore: 1.0,
        compressionRatio: 1.0,
        preservedInformation: this.extractPreservedInformation(request.context, request),
        optimizationDetails: {
          originalTokenCount: request.context.tokenUsage.total,
          optimizedTokenCount: request.context.tokenUsage.total,
          componentsOptimized: [],
          compressionTechniques: [],
          tradeoffs: [],
          performanceImpact: 0
        },
        recommendations: ['Optimization failed, using original context']
      };
    }
  }

  /**
   * Apply quality-preserving optimization
   */
  private async applyQualityPreservingOptimization(
    context: EnhancedContext, 
    budget: TokenBudget, 
    request: OptimizationRequest
  ): Promise<{ context: EnhancedContext; tradeoffs: OptimizationTradeoff[]; techniques: string[] }> {
    
    const tradeoffs: OptimizationTradeoff[] = [];
    const techniques: string[] = [];
    let optimizedContext = { ...context };

    // Always preserve student profile
    if (budget.allocated.profile < context.tokenUsage.profile) {
      const profileOptimization = this.compressProfile(optimizedContext.studentProfile, budget.allocated.profile);
      optimizedContext.studentProfile = profileOptimization.compressed;
      tradeoffs.push({
        component: 'profile',
        originalSize: context.tokenUsage.profile,
        optimizedSize: profileOptimization.tokenCount,
        informationLoss: profileOptimization.informationLoss,
        qualityImpact: profileOptimization.qualityImpact,
        reason: 'Token budget constraint'
      });
      techniques.push('Profile compression');
    }

    // Optimize knowledge base (high priority for educational content)
    if (budget.allocated.knowledge < context.tokenUsage.knowledge && request.educationalPriority) {
      const knowledgeOptimization = await this.compressKnowledgeBase(
        optimizedContext.knowledgeBase, 
        budget.allocated.knowledge,
        'quality_preserving'
      );
      optimizedContext.knowledgeBase = knowledgeOptimization.compressed;
      tradeoffs.push({
        component: 'knowledge',
        originalSize: context.tokenUsage.knowledge,
        optimizedSize: knowledgeOptimization.tokenCount,
        informationLoss: knowledgeOptimization.informationLoss,
        qualityImpact: knowledgeOptimization.qualityImpact,
        reason: 'Educational content compression'
      });
      techniques.push('Knowledge base optimization');
    }

    // Optimize conversation history
    if (budget.allocated.history < context.tokenUsage.history) {
      const historyOptimization = this.compressConversationHistory(
        optimizedContext.conversationHistory, 
        budget.allocated.history
      );
      optimizedContext.conversationHistory = historyOptimization.compressed;
      tradeoffs.push({
        component: 'history',
        originalSize: context.tokenUsage.history,
        optimizedSize: historyOptimization.tokenCount,
        informationLoss: historyOptimization.informationLoss,
        qualityImpact: historyOptimization.qualityImpact,
        reason: 'History compression'
      });
      techniques.push('Conversation history compression');
    }

    return { context: optimizedContext, tradeoffs, techniques };
  }

  /**
   * Apply size-reducing optimization
   */
  private async applySizeReducingOptimization(
    context: EnhancedContext, 
    budget: TokenBudget, 
    request: OptimizationRequest
  ): Promise<{ context: EnhancedContext; tradeoffs: OptimizationTradeoff[]; techniques: string[] }> {
    
    const tradeoffs: OptimizationTradeoff[] = [];
    const techniques: string[] = [];
    let optimizedContext = { ...context };

    // Aggressive compression of all components
    const compressionTargets = [
      { component: 'knowledge' as ContextComponent, currentSize: context.tokenUsage.knowledge, allocator: () => budget.allocated.knowledge },
      { component: 'history' as ContextComponent, currentSize: context.tokenUsage.history, allocator: () => budget.allocated.history },
      { component: 'sources' as ContextComponent, currentSize: context.tokenUsage.sources, allocator: () => budget.allocated.sources }
    ];

    for (const target of compressionTargets) {
      const allocated = target.allocator();
      if (allocated < target.currentSize) {
        switch (target.component) {
          case 'knowledge':
            const knowledgeOptimization = await this.compressKnowledgeBase(
              optimizedContext.knowledgeBase, 
              allocated,
              'size_reducing'
            );
            optimizedContext.knowledgeBase = knowledgeOptimization.compressed;
            break;
          case 'history':
            const historyOptimization = this.compressConversationHistory(
              optimizedContext.conversationHistory, 
              allocated
            );
            optimizedContext.conversationHistory = historyOptimization.compressed;
            break;
          case 'sources':
            const sourcesOptimization = this.compressSources(
              optimizedContext.externalSources, 
              allocated
            );
            optimizedContext.externalSources = sourcesOptimization.compressed;
            break;
        }

        tradeoffs.push({
          component: target.component,
          originalSize: target.currentSize,
          optimizedSize: allocated,
          informationLoss: 0.3, // Aggressive compression
          qualityImpact: 0.2,
          reason: 'Aggressive size reduction'
        });
        techniques.push(`${target.component} aggressive compression`);
      }
    }

    return { context: optimizedContext, tradeoffs, techniques };
  }

  /**
   * Apply balanced optimization
   */
  private async applyBalancedOptimization(
    context: EnhancedContext, 
    budget: TokenBudget, 
    request: OptimizationRequest
  ): Promise<{ context: EnhancedContext; tradeoffs: OptimizationTradeoff[]; techniques: string[] }> {
    
    const tradeoffs: OptimizationTradeoff[] = [];
    const techniques: string[] = [];
    let optimizedContext = { ...context };

    // Balanced compression across all components
    const compressionFactors = {
      profile: 0.1,    // Minimal compression for profile
      knowledge: 0.4,  // Moderate compression for knowledge
      memory: 0.3,     // Moderate compression for memory
      sources: 0.5,    // Higher compression for sources
      history: 0.4     // Moderate compression for history
    };

    for (const [component, factor] of Object.entries(compressionFactors)) {
      const componentKey = component as ContextComponent;
      const currentSize = this.getComponentTokenSize(context, componentKey);
      const allocated = budget.allocated[componentKey] || 0;
      const targetSize = currentSize * (1 - factor);

      if (targetSize < allocated) {
        switch (componentKey) {
          case 'profile':
            const profileOptimization = this.compressProfile(optimizedContext.studentProfile, targetSize);
            optimizedContext.studentProfile = profileOptimization.compressed;
            break;
          case 'knowledge':
            const knowledgeOptimization = await this.compressKnowledgeBase(
              optimizedContext.knowledgeBase, 
              targetSize,
              'balanced'
            );
            optimizedContext.knowledgeBase = knowledgeOptimization.compressed;
            break;
          case 'history':
            const historyOptimization = this.compressConversationHistory(
              optimizedContext.conversationHistory, 
              targetSize
            );
            optimizedContext.conversationHistory = historyOptimization.compressed;
            break;
          case 'sources':
            const sourcesOptimization = this.compressSources(
              optimizedContext.externalSources, 
              targetSize
            );
            optimizedContext.externalSources = sourcesOptimization.compressed;
            break;
        }

        tradeoffs.push({
          component: componentKey,
          originalSize: currentSize,
          optimizedSize: targetSize,
          informationLoss: factor * 0.5,
          qualityImpact: factor * 0.3,
          reason: 'Balanced compression'
        });
        techniques.push(`${component} balanced compression`);
      }
    }

    return { context: optimizedContext, tradeoffs, techniques };
  }

  /**
   * Apply performance-oriented optimization
   */
  private async applyPerformanceOptimization(
    context: EnhancedContext, 
    budget: TokenBudget, 
    request: OptimizationRequest
  ): Promise<{ context: EnhancedContext; tradeoffs: OptimizationTradeoff[]; techniques: string[] }> {
    
    const tradeoffs: OptimizationTradeoff[] = [];
    const techniques: string[] = [];
    let optimizedContext = { ...context };

    // Optimize for fastest processing - prioritize cacheable, indexed content
    if (budget.allocated.knowledge < context.tokenUsage.knowledge) {
      const knowledgeOptimization = await this.compressKnowledgeBase(
        optimizedContext.knowledgeBase, 
        budget.allocated.knowledge,
        'performance_oriented'
      );
      optimizedContext.knowledgeBase = knowledgeOptimization.compressed;
      tradeoffs.push({
        component: 'knowledge',
        originalSize: context.tokenUsage.knowledge,
        optimizedSize: knowledgeOptimization.tokenCount,
        informationLoss: knowledgeOptimization.informationLoss,
        qualityImpact: knowledgeOptimization.qualityImpact,
        reason: 'Performance optimization'
      });
      techniques.push('Knowledge base performance optimization');
    }

    return { context: optimizedContext, tradeoffs, techniques };
  }

  /**
   * Private helper methods
   */
  private validateOptimizationRequest(request: OptimizationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.context) {
      errors.push('Context is required');
    }

    if (!request.tokenLimit || request.tokenLimit < 100) {
      errors.push('Token limit must be at least 100');
    }

    if (!request.strategy) {
      errors.push('Optimization strategy is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private calculateTokenBudget(request: OptimizationRequest): TokenBudget {
    const total = request.tokenLimit;
    const components: ContextComponent[] = ['profile', 'knowledge', 'memory', 'sources', 'history'];
    const allocated: Record<ContextComponent, number> = {} as any;
    
    // Default allocation based on importance for study sessions
    const defaultAllocation = {
      profile: 0.15,    // 15% - Critical for personalization
      knowledge: 0.40,  // 40% - Most important for learning
      memory: 0.20,     // 20% - Important for continuity
      sources: 0.15,    // 15% - Supporting information
      history: 0.10     // 10% - Contextual information
    };

    // Adjust allocation based on strategy
    let strategyAdjustment = 1.0;
    if (request.strategy === 'size_reducing') {
      strategyAdjustment = 0.8; // Reduce overall allocation
    } else if (request.strategy === 'quality_preserving') {
      strategyAdjustment = 1.1; // Increase overall allocation
    }

    for (const component of components) {
      const baseAllocation = (defaultAllocation as any)[component] * total * strategyAdjustment;
      allocated[component] = Math.floor(baseAllocation);
    }

    const allocatedSum = Object.values(allocated).reduce((sum, val) => sum + val, 0);
    const remaining = total - allocatedSum;

    return {
      total,
      allocated,
      remaining: Math.max(0, remaining),
      efficiency: allocatedSum / total
    };
  }

  private compressProfile(profile: any, targetTokens: number): { compressed: any; tokenCount: number; informationLoss: number; qualityImpact: number } {
    const originalTokens = this.estimateTokens(JSON.stringify(profile));
    
    if (originalTokens <= targetTokens) {
      return { compressed: profile, tokenCount: originalTokens, informationLoss: 0, qualityImpact: 0 };
    }

    // Compress by removing less important fields
    const compressed = {
      ...profile,
      compressedMetadata: profile.compressedMetadata ? {
        totalSessions: profile.compressedMetadata.totalSessions,
        mostStudiedSubject: profile.compressedMetadata.mostStudiedSubject,
        learningVelocity: profile.compressedMetadata.learningVelocity
      } : {},
      recentTopics: profile.recentTopics?.slice(0, 5) || []
    };

    const newTokens = this.estimateTokens(JSON.stringify(compressed));
    const informationLoss = (originalTokens - newTokens) / originalTokens;
    
    return {
      compressed,
      tokenCount: newTokens,
      informationLoss,
      qualityImpact: informationLoss * 0.2 // Profile compression has low quality impact
    };
  }

  private async compressKnowledgeBase(knowledge: any[], targetTokens: number, strategy: string): Promise<{ compressed: any[]; tokenCount: number; informationLoss: number; qualityImpact: number }> {
    const originalTokens = knowledge.reduce((sum, entry) => sum + this.estimateTokens(entry.content), 0);
    
    if (originalTokens <= targetTokens) {
      return { compressed: knowledge, tokenCount: originalTokens, informationLoss: 0, qualityImpact: 0 };
    }

    // Sort by educational value and confidence
    const sorted = [...knowledge].sort((a, b) => {
      const scoreA = (a.educationalValue || 0) * 0.6 + (a.confidence || 0) * 0.4;
      const scoreB = (b.educationalValue || 0) * 0.6 + (b.confidence || 0) * 0.4;
      return scoreB - scoreA;
    });

    const compressionRatios = {
      quality_preserving: 0.3,
      size_reducing: 0.7,
      balanced: 0.5,
      performance_oriented: 0.4
    };

    const targetCount = Math.max(1, Math.floor(sorted.length * (1 - (compressionRatios as any)[strategy] || 0.5)));
    const compressed = sorted.slice(0, targetCount).map(entry => ({
      ...entry,
      content: this.compressText(entry.content, 0.7),
      relatedConcepts: entry.relatedConcepts?.slice(0, 3) || []
    }));

    const newTokens = compressed.reduce((sum, entry) => sum + this.estimateTokens(entry.content), 0);
    const informationLoss = Math.max(0, (originalTokens - newTokens) / originalTokens);
    
    return {
      compressed,
      tokenCount: newTokens,
      informationLoss,
      qualityImpact: informationLoss * 0.5 // Knowledge compression has moderate quality impact
    };
  }

  private compressConversationHistory(history: any[], targetTokens: number): { compressed: any[]; tokenCount: number; informationLoss: number; qualityImpact: number } {
    const originalTokens = history.reduce((sum, summary) => sum + this.estimateTokens(summary.summary), 0);
    
    if (originalTokens <= targetTokens) {
      return { compressed: history, tokenCount: originalTokens, informationLoss: 0, qualityImpact: 0 };
    }

    // Sort by quality score and recency
    const sorted = [...history].sort((a, b) => {
      const scoreA = (a.qualityScore || 0) * 0.7 + (1 / (Date.now() - new Date(a.createdAt).getTime())) * 0.3;
      const scoreB = (b.qualityScore || 0) * 0.7 + (1 / (Date.now() - new Date(b.createdAt).getTime())) * 0.3;
      return scoreB - scoreA;
    });

    const targetCount = Math.max(1, Math.floor(sorted.length * 0.6)); // Keep 60% of history
    const compressed = sorted.slice(0, targetCount).map(summary => ({
      ...summary,
      summary: this.compressText(summary.summary, 0.6),
      keyTopics: summary.keyTopics?.slice(0, 3) || []
    }));

    const newTokens = compressed.reduce((sum, summary) => sum + this.estimateTokens(summary.summary), 0);
    const informationLoss = Math.max(0, (originalTokens - newTokens) / originalTokens);
    
    return {
      compressed,
      tokenCount: newTokens,
      informationLoss,
      qualityImpact: informationLoss * 0.4 // History compression has moderate quality impact
    };
  }

  private compressSources(sources: any[], targetTokens: number): { compressed: any[]; tokenCount: number; informationLoss: number; qualityImpact: number } {
    const originalTokens = sources.reduce((sum, source) => sum + this.estimateTokens(source.content), 0);
    
    if (originalTokens <= targetTokens) {
      return { compressed: sources, tokenCount: originalTokens, informationLoss: 0, qualityImpact: 0 };
    }

    // Sort by educational relevance and reliability
    const sorted = [...sources].sort((a, b) => {
      const scoreA = (a.educationalRelevance || 0) * 0.6 + (a.reliability || 0) * 0.4;
      const scoreB = (b.educationalRelevance || 0) * 0.6 + (b.reliability || 0) * 0.4;
      return scoreB - scoreA;
    });

    const targetCount = Math.max(1, Math.floor(sorted.length * 0.5)); // Keep 50% of sources
    const compressed = sorted.slice(0, targetCount).map(source => ({
      ...source,
      content: this.compressText(source.content, 0.8),
      topics: source.topics?.slice(0, 2) || []
    }));

    const newTokens = compressed.reduce((sum, source) => sum + this.estimateTokens(source.content), 0);
    const informationLoss = Math.max(0, (originalTokens - newTokens) / originalTokens);
    
    return {
      compressed,
      tokenCount: newTokens,
      informationLoss,
      qualityImpact: informationLoss * 0.3 // Sources compression has low quality impact
    };
  }

  private calculateTokenUsage(context: EnhancedContext): any {
    const profileTokens = this.estimateTokens(JSON.stringify(context.studentProfile));
    const knowledgeTokens = context.knowledgeBase.reduce((sum, entry) => sum + this.estimateTokens(entry.content), 0);
    const historyTokens = context.conversationHistory.reduce((sum, summary) => sum + this.estimateTokens(summary.summary), 0);
    const sourcesTokens = context.externalSources.reduce((sum, source) => sum + this.estimateTokens(source.content), 0);
    
    const total = profileTokens + knowledgeTokens + historyTokens + sourcesTokens;
    
    return {
      total,
      profile: profileTokens,
      knowledge: knowledgeTokens,
      history: historyTokens,
      sources: sourcesTokens,
      remaining: Math.max(0, ContextOptimizer.DEFAULT_TOKEN_LIMIT - total)
    };
  }

  private calculateQualityScore(context: EnhancedContext, request: OptimizationRequest): number {
    let score = 1.0;

    // Penalize based on token reduction ratio
    const reductionRatio = 1 - (context.tokenUsage.total / request.context.tokenUsage.total);
    score -= reductionRatio * 0.3;

    // Adjust based on strategy
    if (request.strategy === 'quality_preserving') {
      score = Math.max(score, 0.8);
    } else if (request.strategy === 'size_reducing') {
      score = Math.max(score, 0.6);
    }

    return Math.max(0, Math.min(1, score));
  }

  private extractPreservedInformation(context: EnhancedContext, request: OptimizationRequest): PreservedInformation {
    return {
      criticalFacts: context.knowledgeBase
        .filter(entry => entry.educationalValue > 0.8)
        .map(entry => entry.content.substring(0, 100) + '...'),
      learningObjectives: context.studentProfile.learningObjectives || [],
      studentPreferences: {
        learningStyle: context.studentProfile.learningStyle?.type,
        difficulty: context.studentProfile.preferredComplexity?.current,
        subjects: context.studentProfile.strongSubjects
      },
      recentProgress: context.studentProfile.lastSessionSummary,
      knowledgeGaps: this.identifyKnowledgeGaps(context)
    };
  }

  private identifyKnowledgeGaps(context: EnhancedContext): string[] {
    // Simple heuristic to identify potential knowledge gaps
    const gaps: string[] = [];
    
    if (context.knowledgeBase.length < 5) {
      gaps.push('Limited knowledge base coverage');
    }
    
    if (context.studentProfile.weakSubjects?.length > 0) {
      gaps.push(`Weak subjects: ${context.studentProfile.weakSubjects.join(', ')}`);
    }
    
    return gaps;
  }

  private generateOptimizationRecommendations(context: EnhancedContext, request: OptimizationRequest, details: OptimizationDetails): string[] {
    const recommendations: string[] = [];

    if (details.optimizedTokenCount > request.tokenLimit * 0.9) {
      recommendations.push('Consider further optimization to leave buffer space');
    }

    if (details.tradeoffs.length > 2) {
      recommendations.push('Multiple components were optimized - consider reviewing quality impact');
    }

    if (request.strategy === 'size_reducing' && details.optimizationDetails.qualityImpact < 0.7) {
      recommendations.push('Quality may have been significantly impacted - consider quality-preserving strategy');
    }

    if (context.knowledgeBase.length === 0) {
      recommendations.push('No educational content available - consider expanding knowledge base');
    }

    return recommendations;
  }

  private identifyOptimizedComponents(original: EnhancedContext, optimized: EnhancedContext): ContextComponent[] {
    const components: ContextComponent[] = [];
    
    if (original.knowledgeBase.length !== optimized.knowledgeBase.length) {
      components.push('knowledge');
    }
    
    if (original.conversationHistory.length !== optimized.conversationHistory.length) {
      components.push('history');
    }
    
    if (original.externalSources.length !== optimized.externalSources.length) {
      components.push('sources');
    }
    
    return components;
  }

  private getComponentTokenSize(context: EnhancedContext, component: ContextComponent): number {
    switch (component) {
      case 'profile': return context.tokenUsage.profile;
      case 'knowledge': return context.tokenUsage.knowledge;
      case 'memory': return 0; // Not implemented yet
      case 'sources': return context.tokenUsage.sources;
      case 'history': return context.tokenUsage.history;
      default: return 0;
    }
  }

  private compressText(text: string, ratio: number): string {
    if (ratio >= 1.0) return text;
    
    const sentences = text.split(/[.!?]+/);
    const targetSentences = Math.max(1, Math.floor(sentences.length * ratio));
    
    return sentences
      .slice(0, targetSentences)
      .join('. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private generateCacheKey(request: OptimizationRequest): string {
    const keyData = {
      contextHash: this.calculateContextHash(request.context),
      tokenLimit: request.tokenLimit,
      strategy: request.strategy,
      preserveComponents: request.preserveComponents?.sort(),
      minimumQuality: request.minimumQuality,
      educationalPriority: request.educationalPriority
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  private calculateContextHash(context: EnhancedContext): string {
    const hashData = {
      profileSize: JSON.stringify(context.studentProfile).length,
      knowledgeCount: context.knowledgeBase.length,
      historyCount: context.conversationHistory.length,
      sourcesCount: context.externalSources.length,
      compressionLevel: context.compressionLevel
    };
    
    return btoa(JSON.stringify(hashData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  private initializeCompressionProfiles(): void {
    this.compressionProfiles.set('profile', {
      component: 'profile',
      baseCompression: 0.1,
      qualityWeight: 0.9,
      educationalWeight: 0.8,
      priority: 1,
      maxCompression: 0.3
    });

    this.compressionProfiles.set('knowledge', {
      component: 'knowledge',
      baseCompression: 0.4,
      qualityWeight: 0.7,
      educationalWeight: 0.9,
      priority: 2,
      maxCompression: 0.7
    });

    this.compressionProfiles.set('memory', {
      component: 'memory',
      baseCompression: 0.3,
      qualityWeight: 0.6,
      educationalWeight: 0.7,
      priority: 3,
      maxCompression: 0.6
    });

    this.compressionProfiles.set('sources', {
      component: 'sources',
      baseCompression: 0.5,
      qualityWeight: 0.4,
      educationalWeight: 0.6,
      priority: 4,
      maxCompression: 0.8
    });

    this.compressionProfiles.set('history', {
      component: 'history',
      baseCompression: 0.4,
      qualityWeight: 0.5,
      educationalWeight: 0.5,
      priority: 5,
      maxCompression: 0.7
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, cached] of this.optimizationCache.entries()) {
        if (cached.expiresAt <= now) {
          this.optimizationCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.optimizationCache.clear();
  }
}

// Export singleton instance
export const contextOptimizer = new ContextOptimizer();

// Convenience functions
export const optimizeContext = (request: OptimizationRequest) => 
  contextOptimizer.optimizeContext(request);

export const getTokenBudget = (context: EnhancedContext, tokenLimit: number) => 
  contextOptimizer.calculateTokenBudget({
    context,
    tokenLimit,
    strategy: 'balanced'
  });