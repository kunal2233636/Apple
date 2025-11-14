// Layer 2: Context & Memory Management System
// ============================================
// ConversationMemory - Memory management system with interaction storage,
// retrieval, relevance scoring, filtering, and cross-conversation knowledge linking

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';

export type MemoryType = 'user_query' | 'ai_response' | 'learning_interaction' | 'feedback' | 'correction' | 'insight';
export type MemoryPriority = 'low' | 'medium' | 'high' | 'critical';
export type MemoryRetention = 'session' | 'short_term' | 'long_term' | 'permanent';
export type LinkType = 'similar' | 'contradicts' | 'supports' | 'follows' | 'references' | 'part_of';

export interface ConversationMemory {
  id: string;
  userId: string;
  conversationId: string;
  memoryType: MemoryType;
  interactionData: InteractionData;
  qualityScore: number;
  userSatisfaction?: number;
  feedbackCollected: boolean;
  memoryRelevanceScore: number;
  priority: MemoryPriority;
  retention: MemoryRetention;
  tags: string[];
  metadata: MemoryMetadata;
  linkedMemories: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface InteractionData {
  content: string;
  intent?: string;
  context?: Record<string, any>;
  response?: string;
  qualityIndicators?: QualityIndicator[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  complexity?: 'simple' | 'moderate' | 'complex';
  subject?: string;
  topic?: string;
  learningObjective?: string;
  sessionId?: string;
  timestamp?: Date;
  modelUsed?: string;
  provider?: string;
  processingTime?: number;
  tokensUsed?: number;
  confidenceScore?: number;
}

export interface QualityIndicator {
  type: 'accuracy' | 'completeness' | 'relevance' | 'clarity' | 'helpfulness';
  score: number;
  weight: number;
  evidence: string[];
}

export interface MemoryMetadata {
  source: 'user_input' | 'ai_response' | 'system' | 'feedback' | 'external';
  version: number;
  compressionApplied: boolean;
  originalSize?: number;
  compressedSize?: number;
  checksum?: string;
  validationStatus: 'valid' | 'corrupted' | 'pending';
  accessCount: number;
  lastAccessed: Date;
  linkedToKnowledgeBase: boolean;
  crossConversationLinked: boolean;
  similarityCluster?: string;
}

export interface MemorySearchRequest {
  userId: string;
  query?: string;
  conversationId?: string;
  memoryType?: MemoryType;
  priority?: MemoryPriority;
  retention?: MemoryRetention;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  minRelevanceScore?: number;
  maxResults?: number;
  includeExpired?: boolean;
  includeLinked?: boolean;
  similarityThreshold?: number;
  sortBy?: 'relevance' | 'date' | 'quality' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface MemorySearchResult {
  memory: ConversationMemory;
  relevanceScore: number;
  matchReasons: string[];
  snippets: SearchSnippet[];
  context: string;
}

export interface SearchSnippet {
  field: string;
  snippet: string;
  highlight: string;
  position: number;
}

export interface MemoryLinkingRequest {
  sourceMemoryId: string;
  targetMemoryId: string;
  linkType: LinkType;
  strength: number;
  evidence: string[];
  metadata?: Record<string, any>;
  bidirectional?: boolean;
}

export interface MemoryOptimizationRequest {
  userId: string;
  conversationId?: string;
  optimizationType: 'cleanup' | 'compression' | 'consolidation' | 'linking';
  targetSize?: number;
  qualityThreshold?: number;
  retentionPolicy?: MemoryRetention;
  preserveRecent?: boolean;
  preserveHighPriority?: boolean;
  maxAge?: number;
}

export interface MemoryOptimizationResult {
  optimizationId: string;
  optimizationType: string;
  memoriesProcessed: number;
  memoriesRemoved: number;
  memoriesCompressed: number;
  memoriesLinked: number;
  storageSaved: number;
  qualityImprovement: number;
  processingTime: number;
  recommendations: string[];
}

export interface CrossConversationLink {
  memoryId: string;
  relatedMemoryId: string;
  relationshipType: 'knowledge_transfer' | 'pattern_repeat' | 'progression' | 'reference' | 'contrast';
  strength: number;
  context: string;
  firstSeen: Date;
  lastReferenced: Date;
  referenceCount: number;
}

export interface MemoryAnalytics {
  userId: string;
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  memoriesByPriority: Record<MemoryPriority, number>;
  averageQualityScore: number;
  averageRelevanceScore: number;
  retentionDistribution: Record<MemoryRetention, number>;
  topTopics: Array<{ topic: string; count: number; quality: number }>;
  learningProgress: Array<{ date: Date; quality: number; topics: string[] }>;
  memoryGrowthRate: number;
  crossConversationLinks: number;
  knowledgeBaseIntegrations: number;
}

export class ConversationMemoryManager {
  private static readonly MAX_SEARCH_RESULTS = 100;
  private static readonly MIN_QUALITY_THRESHOLD = 0.3;
  private static readonly DEFAULT_RETENTION_DAYS = 30;
  private static readonly CLEANUP_INTERVAL_HOURS = 24;
  private static readonly MAX_MEMORY_LINKS = 10;
  private static readonly SIMILARITY_THRESHOLD = 0.7;

  private memoryCache: Map<string, { memory: ConversationMemory; timestamp: Date; expiresAt: Date }> = new Map();
  private cryptoKey: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cryptoKey = process.env.CONVERSATION_MEMORY_KEY || 'default-memory-key';
    this.startCleanupSchedule();
  }

  /**
   * Store new conversation memory
   */
  async storeMemory(memoryData: Omit<ConversationMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversationMemory> {
    const startTime = Date.now();
    
    try {
      logInfo('Storing conversation memory', {
        componentName: 'ConversationMemory',
        userId: memoryData.userId,
        conversationId: memoryData.conversationId,
        memoryType: memoryData.memoryType,
        priority: memoryData.priority
      });

      const qualityScore = this.calculateQualityScore(memoryData.interactionData);
      const relevanceScore = this.calculateRelevanceScore(memoryData);
      
      const memory: ConversationMemory = {
        ...memoryData,
        id: this.generateMemoryId(),
        qualityScore,
        memoryRelevanceScore: relevanceScore,
        metadata: {
          ...memoryData.metadata,
          accessCount: 0,
          lastAccessed: new Date(),
          checksum: this.generateChecksum(memoryData.interactionData.content)
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: this.calculateExpirationDate(memoryData.retention)
      };

      const insertPayload: any = {
          user_id: memory.userId,
          interaction_data: {
            ...memory.interactionData,
            memoryType: memory.memoryType,
            priority: memory.priority,
            retention: memory.retention
          },
          quality_score: memory.qualityScore,
          user_satisfaction: memory.userSatisfaction,
          feedback_collected: memory.feedbackCollected,
          memory_relevance_score: memory.memoryRelevanceScore,
          created_at: memory.createdAt.toISOString(),
          updated_at: memory.updatedAt.toISOString(),
          expires_at: memory.expiresAt?.toISOString?.() ?? null,
        };
        if (memory.conversationId) {
          (insertPayload as any).conversation_id = memory.conversationId;
        }
        const { data, error } = await (supabase
          .from('conversation_memory') as any)
          .insert([insertPayload])
          .select()
          .single();

      if (error) throw new Error(`Failed to store memory: ${error.message}`);

      const storedMemory = this.mapDatabaseToMemory(data);
      await this.postStoreProcessing(storedMemory);
      this.updateMemoryCache(storedMemory);
      
      const processingTime = Date.now() - startTime;
      logInfo('Memory stored successfully', {
        componentName: 'ConversationMemory',
        memoryId: storedMemory.id,
        qualityScore,
        relevanceScore,
        processingTime
      });

      return storedMemory;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConversationMemory',
        operation: 'store_memory',
        userId: memoryData.userId
      });

      throw new Error(`Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search and retrieve memories
   */
  async searchMemories(request: MemorySearchRequest): Promise<MemorySearchResult[]> {
    const startTime = Date.now();
    
    try {
      logInfo('Memory search started', {
        componentName: 'ConversationMemory',
        userId: request.userId,
        query: request.query?.substring(0, 100),
        memoryType: request.memoryType,
        maxResults: request.maxResults
      });

      const searchQuery = this.buildSearchQuery(request);
      
      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', request.userId)
        .or(searchQuery.orClause)
        .order('memory_relevance_score', { ascending: false })
        .limit(request.maxResults || ConversationMemoryManager.MAX_SEARCH_RESULTS);

      if (error) throw new Error(`Memory search failed: ${error.message}`);

      const rawResults = data || [];
      const results: MemorySearchResult[] = [];

      for (const raw of rawResults) {
        try {
          const memory = this.mapDatabaseToMemory(raw);
          
          if (request.minRelevanceScore && memory.memoryRelevanceScore < request.minRelevanceScore) {
            continue;
          }
          
          if (!request.includeExpired && memory.expiresAt && memory.expiresAt < new Date()) {
            continue;
          }

          const relevanceScore = this.calculateSearchRelevance(memory, request);
          if (relevanceScore < 0.1) continue;

          const matchReasons = this.findMatchReasons(memory, request);
          const snippets = this.generateSearchSnippets(memory, request.query || '');
          const context = this.createMemoryContext(memory);

          results.push({
            memory,
            relevanceScore,
            matchReasons,
            snippets,
            context
          });

        } catch (error) {
          logWarning('Failed to process search result', {
            componentName: 'ConversationMemory',
            memoryId: (raw as any)?.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.sortSearchResults(results, request.sortBy, request.sortOrder);
      const finalResults = results.slice(0, request.maxResults || ConversationMemoryManager.MAX_SEARCH_RESULTS);
      
      const processingTime = Date.now() - startTime;
      logInfo('Memory search completed', {
        componentName: 'ConversationMemory',
        userId: request.userId,
        resultCount: finalResults.length,
        processingTime
      });

      return finalResults;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConversationMemory',
        operation: 'search_memories',
        userId: request.userId
      });

      return [];
    }
  }

  /**
   * Link memories for cross-conversation knowledge
   */
  async linkMemories(request: MemoryLinkingRequest): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      logInfo('Memory linking started', {
        componentName: 'ConversationMemory',
        sourceMemoryId: request.sourceMemoryId,
        targetMemoryId: request.targetMemoryId,
        linkType: request.linkType
      });

      const [sourceMemory, targetMemory] = await Promise.all([
        this.getMemoryById(request.sourceMemoryId),
        this.getMemoryById(request.targetMemoryId)
      ]);

      if (!sourceMemory || !targetMemory) {
        throw new Error('One or both memories not found');
      }

      const linkPromises = [
        this.createMemoryLink(request)
      ];

      if (request.bidirectional) {
        const reverseRequest: MemoryLinkingRequest = {
          sourceMemoryId: request.targetMemoryId,
          targetMemoryId: request.sourceMemoryId,
          linkType: this.getReverseLinkType(request.linkType),
          strength: request.strength,
          evidence: request.evidence,
          metadata: request.metadata,
          bidirectional: false
        };
        linkPromises.push(this.createMemoryLink(reverseRequest));
      }

      await Promise.all(linkPromises);
      await this.updateMemoryLinkingMetadata(sourceMemory.id, targetMemory.id, request);

      const processingTime = Date.now() - startTime;
      logInfo('Memory linking completed', {
        componentName: 'ConversationMemory',
        sourceMemoryId: request.sourceMemoryId,
        targetMemoryId: request.targetMemoryId,
        linkType: request.linkType,
        processingTime
      });

      return true;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConversationMemory',
        operation: 'link_memories',
        sourceMemoryId: request.sourceMemoryId,
        targetMemoryId: request.targetMemoryId
      });

      return false;
    }
  }

  /**
   * Optimize memory storage and retrieval
   */
  async optimizeMemories(request: MemoryOptimizationRequest): Promise<MemoryOptimizationResult> {
    const startTime = Date.now();
    
    try {
      logInfo('Memory optimization started', {
        componentName: 'ConversationMemory',
        userId: request.userId,
        optimizationType: request.optimizationType,
        targetSize: request.targetSize
      });

      const optimizationId = this.generateOptimizationId();
      let memoriesProcessed = 0;
      let memoriesRemoved = 0;
      let memoriesCompressed = 0;
      let memoriesLinked = 0;
      let storageSaved = 0;
      let qualityImprovement = 0;
      const recommendations: string[] = [];

      const memories = await this.getMemoriesForOptimization(request);
      
      switch (request.optimizationType) {
        case 'cleanup':
          const cleanupResult = await this.performMemoryCleanup(memories, request);
          memoriesRemoved = cleanupResult.removed;
          storageSaved = cleanupResult.storageSaved;
          recommendations.push(...cleanupResult.recommendations);
          break;
          
        case 'compression':
          const compressionResult = await this.performMemoryCompression(memories, request);
          memoriesCompressed = compressionResult.compressed;
          storageSaved = compressionResult.storageSaved;
          recommendations.push(...compressionResult.recommendations);
          break;
          
        case 'consolidation':
          const consolidationResult = await this.performMemoryConsolidation(memories, request);
          memoriesRemoved = consolidationResult.removed;
          memoriesCompressed = consolidationResult.compressed;
          storageSaved = consolidationResult.storageSaved;
          qualityImprovement = consolidationResult.qualityImprovement;
          recommendations.push(...consolidationResult.recommendations);
          break;
          
        case 'linking':
          const linkingResult = await this.performMemoryLinking(memories, request);
          memoriesLinked = linkingResult.linksCreated;
          qualityImprovement = linkingResult.qualityImprovement;
          recommendations.push(...linkingResult.recommendations);
          break;
      }

      memoriesProcessed = memories.length;

      const result: MemoryOptimizationResult = {
        optimizationId,
        optimizationType: request.optimizationType,
        memoriesProcessed,
        memoriesRemoved,
        memoriesCompressed,
        memoriesLinked,
        storageSaved,
        qualityImprovement,
        processingTime: Date.now() - startTime,
        recommendations
      };

      await this.logOptimizationResult(request, result);

      logInfo('Memory optimization completed', {
        componentName: 'ConversationMemory',
        optimizationId,
        optimizationType: request.optimizationType,
        memoriesProcessed,
        memoriesRemoved,
        memoriesCompressed,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConversationMemory',
        operation: 'optimize_memories',
        userId: request.userId
      });

      throw new Error(`Memory optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get memory analytics
   */
  async getMemoryAnalytics(userId: string, timeRange?: { start: Date; end: Date }): Promise<MemoryAnalytics> {
    try {
      logInfo('Getting memory analytics', {
        componentName: 'ConversationMemory',
        userId,
        timeRange: timeRange ? `${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}` : 'all time'
      });

      let query = supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', userId);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw new Error(`Failed to get memory analytics: ${error.message}`);

      const memories = (data || []).map(item => this.mapDatabaseToMemory(item));
      const analytics = this.calculateMemoryAnalytics(memories, timeRange);
      
      logInfo('Memory analytics calculated', {
        componentName: 'ConversationMemory',
        userId,
        totalMemories: analytics.totalMemories,
        averageQualityScore: analytics.averageQualityScore
      });

      return analytics;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConversationMemory',
        operation: 'get_memory_analytics',
        userId
      });

      return this.createEmptyAnalytics(userId);
    }
  }

  /**
   * Update memory quality based on feedback
   */
  async updateMemoryQuality(memoryId: string, qualityData: {
    userSatisfaction?: number;
    qualityScore?: number;
    feedback?: string;
    corrections?: string[];
  }): Promise<boolean> {
    try {
      logInfo('Updating memory quality', {
        componentName: 'ConversationMemory',
        memoryId,
        userSatisfaction: qualityData.userSatisfaction,
        qualityScore: qualityData.qualityScore
      });

      const memory = await this.getMemoryById(memoryId);
      if (!memory) {
        throw new Error('Memory not found');
      }

      const newQualityScore = qualityData.qualityScore || this.recalculateQualityScore(memory, qualityData);
      
      const { error } = await (supabase
        .from('conversation_memory') as any)
        .update({
          quality_score: newQualityScore,
          user_satisfaction: qualityData.userSatisfaction || memory.userSatisfaction,
          feedback_collected: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', memoryId);

      if (error) throw new Error(`Failed to update memory quality: ${error.message}`);

      this.invalidateMemoryCache(memoryId);

      logInfo('Memory quality updated', {
        componentName: 'ConversationMemory',
        memoryId,
        newQualityScore
      });

      return true;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConversationMemory',
        operation: 'update_memory_quality',
        memoryId
      });

      return false;
    }
  }

  /**
   * Private helper methods
   */

  private calculateQualityScore(interactionData: InteractionData): number {
    let score = 0.5;

    if (interactionData.content && interactionData.content.length > 10) score += 0.1;
    if (interactionData.complexity === 'complex') score += 0.1;
    if (interactionData.sentiment === 'positive') score += 0.1;
    
    if (interactionData.response) {
      score += 0.2;
      if (interactionData.confidenceScore && interactionData.confidenceScore > 0.8) {
        score += 0.1;
      }
    }

    if (interactionData.learningObjective) score += 0.1;
    if (interactionData.topic) score += 0.05;

    if (interactionData.processingTime && interactionData.processingTime < 5000) score += 0.05;
    if (interactionData.tokensUsed && interactionData.tokensUsed < 1000) score += 0.05;

    return Math.min(1.0, Math.max(0.0, score));
  }

  private calculateRelevanceScore(memory: Omit<ConversationMemory, 'id' | 'createdAt' | 'updatedAt'>): number {
    let score = 0.3;

    const priorityScores = { low: 0.1, medium: 0.2, high: 0.3, critical: 0.4 };
    score += priorityScores[memory.priority] || 0.2;

    if (memory.interactionData.content) score += 0.2;
    if (memory.interactionData.topic) score += 0.1;
    if (memory.tags.length > 0) score += 0.1;

    const typeScores: Record<MemoryType, number> = {
      user_query: 0.2,
      ai_response: 0.15,
      learning_interaction: 0.25,
      feedback: 0.2,
      correction: 0.3,
      insight: 0.35
    };
    score += typeScores[memory.memoryType] || 0.1;

    return Math.min(1.0, score);
  }

  private calculateExpirationDate(retention: MemoryRetention): Date {
    const now = new Date();
    
    switch (retention) {
      case 'session':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'short_term':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'long_term':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'permanent':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + ConversationMemoryManager.DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    }
  }

  private generateMemoryId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChecksum(content: string): string {
    return createHash('sha256').update(content + this.cryptoKey).digest('hex');
  }

  private mapDatabaseToMemory(data: any): ConversationMemory {
    const interactionData = data.interaction_data || {};
    
    return {
      id: data.id,
      userId: data.user_id,
      conversationId: data.conversation_id,
      memoryType: interactionData.memoryType || 'user_query',
      interactionData: {
        content: interactionData.content || '',
        intent: interactionData.intent,
        context: interactionData.context,
        response: interactionData.response,
        qualityIndicators: interactionData.qualityIndicators,
        sentiment: interactionData.sentiment,
        complexity: interactionData.complexity,
        subject: interactionData.subject,
        topic: interactionData.topic,
        learningObjective: interactionData.learningObjective,
        sessionId: interactionData.sessionId,
        timestamp: interactionData.timestamp ? new Date(interactionData.timestamp) : undefined,
        modelUsed: interactionData.modelUsed,
        provider: interactionData.provider,
        processingTime: interactionData.processingTime,
        tokensUsed: interactionData.tokensUsed,
        confidenceScore: interactionData.confidenceScore
      },
      qualityScore: data.quality_score || 0,
      userSatisfaction: data.user_satisfaction,
      feedbackCollected: data.feedback_collected || false,
      memoryRelevanceScore: data.memory_relevance_score || 0,
      priority: interactionData.priority || 'medium',
      retention: interactionData.retention || 'long_term',
      tags: interactionData.tags || [],
      metadata: {
        source: 'user_input',
        version: 1,
        compressionApplied: false,
        validationStatus: 'valid',
        accessCount: 0,
        lastAccessed: new Date(),
        linkedToKnowledgeBase: false,
        crossConversationLinked: false,
        ...interactionData.metadata
      },
      linkedMemories: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
    };
  }

  private buildSearchQuery(request: MemorySearchRequest): { orClause: string } {
    const conditions: string[] = [];

    if (request.conversationId) {
      conditions.push(`conversation_id.eq.${request.conversationId}`);
    }

    if (request.memoryType) {
      conditions.push(`interaction_data->>memoryType.eq.${request.memoryType}`);
    }

    if (request.priority) {
      conditions.push(`interaction_data->>priority.eq.${request.priority}`);
    }

    if (request.retention) {
      conditions.push(`interaction_data->>retention.eq.${request.retention}`);
    }

    if (request.tags && request.tags.length > 0) {
      const tagConditions = request.tags.map(tag => `interaction_data->tags.cs.{${tag}}`).join(',');
      conditions.push(`or(${tagConditions})`);
    }

    if (request.dateRange?.start) {
      conditions.push(`created_at.gte.${request.dateRange.start.toISOString()}`);
    }

    if (request.dateRange?.end) {
      conditions.push(`created_at.lte.${request.dateRange.end.toISOString()}`);
    }

    if (request.minRelevanceScore) {
      conditions.push(`memory_relevance_score.gte.${request.minRelevanceScore}`);
    }

    const orClause = conditions.length > 0 ? conditions.join(',') : 'id.not.is.null';
    
    return { orClause };
  }

  private calculateSearchRelevance(memory: ConversationMemory, request: MemorySearchRequest): number {
    if (!request.query) return memory.memoryRelevanceScore;

    const query = request.query.toLowerCase();
    const content = memory.interactionData.content.toLowerCase();
    const topic = memory.interactionData.topic?.toLowerCase() || '';
    const subject = memory.interactionData.subject?.toLowerCase() || '';
    
    let relevance = 0;
    const queryWords = query.split(/\s+/);

    for (const word of queryWords) {
      if (content.includes(word)) relevance += 0.3;
      if (topic.includes(word)) relevance += 0.4;
      if (subject.includes(word)) relevance += 0.2;
    }

    for (const tag of memory.tags) {
      for (const word of queryWords) {
        if (tag.toLowerCase().includes(word)) relevance += 0.25;
      }
    }

    relevance += memory.qualityScore * 0.2;
    return Math.min(1.0, relevance);
  }

  private findMatchReasons(memory: ConversationMemory, request: MemorySearchRequest): string[] {
    const reasons: string[] = [];

    if (request.query) {
      const query = request.query.toLowerCase();
      const content = memory.interactionData.content.toLowerCase();
      
      if (content.includes(query)) {
        reasons.push('Direct content match');
      }
      
      if (memory.interactionData.topic?.toLowerCase().includes(query)) {
        reasons.push('Topic match');
      }
    }

    if (request.memoryType && memory.memoryType === request.memoryType) {
      reasons.push(`Memory type: ${memory.memoryType}`);
    }

    if (request.priority && memory.priority === request.priority) {
      reasons.push(`Priority: ${memory.priority}`);
    }

    if (memory.qualityScore > 0.8) {
      reasons.push('High quality score');
    }

    return reasons;
  }

  private generateSearchSnippets(memory: ConversationMemory, query: string): SearchSnippet[] {
    const snippets: SearchSnippet[] = [];
    
    if (query) {
      const content = memory.interactionData.content;
      const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
      
      if (queryIndex !== -1) {
        const snippet = content.substring(
          Math.max(0, queryIndex - 30),
          Math.min(content.length, queryIndex + query.length + 30)
        );
        
        snippets.push({
          field: 'content',
          snippet,
          highlight: this.createHighlight(snippet, query),
          position: queryIndex
        });
      }
    }

    return snippets.slice(0, 3);
  }

  private createHighlight(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '**$1**');
  }

  private createMemoryContext(memory: ConversationMemory): string {
    const contextParts: string[] = [];
    
    if (memory.interactionData.topic) {
      contextParts.push(`Topic: ${memory.interactionData.topic}`);
    }
    
    if (memory.interactionData.subject) {
      contextParts.push(`Subject: ${memory.interactionData.subject}`);
    }
    
    if (memory.memoryType) {
      contextParts.push(`Type: ${memory.memoryType}`);
    }
    
    if (memory.priority !== 'medium') {
      contextParts.push(`Priority: ${memory.priority}`);
    }
    
    if (memory.qualityScore > 0.8) {
      contextParts.push('High quality');
    }
    
    return contextParts.join(' • ');
  }

  private sortSearchResults(results: MemorySearchResult[], sortBy?: string, sortOrder?: string): void {
    const order = sortOrder === 'desc' ? -1 : 1;
    
    results.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return order * (a.memory.createdAt.getTime() - b.memory.createdAt.getTime());
        case 'quality':
          return order * (a.memory.qualityScore - b.memory.qualityScore);
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          return order * ((priorityOrder[a.memory.priority] || 2) - (priorityOrder[b.memory.priority] || 2));
        case 'relevance':
        default:
          return order * (b.relevanceScore - a.relevanceScore);
      }
    });
  }

  private async postStoreProcessing(memory: ConversationMemory): Promise<void> {
    const similarMemories = await this.findSimilarMemories(memory, 3);
    
    for (const similar of similarMemories) {
      await this.linkMemories({
        sourceMemoryId: memory.id,
        targetMemoryId: similar.id,
        linkType: 'similar',
        strength: similar.similarity,
        evidence: ['Content similarity detected'],
        bidirectional: true
      });
    }

    if (memory.qualityScore > 0.8 && memory.memoryType === 'insight') {
      await this.integrateWithKnowledgeBase(memory);
    }
  }

  private async findSimilarMemories(memory: ConversationMemory, maxResults: number): Promise<Array<{id: string, similarity: number}>> {
    const { data } = await supabase
      .from('conversation_memory')
      .select('id, interaction_data')
      .eq('user_id', memory.userId)
      .neq('id', memory.id)
      .limit(50);

    const similarities: Array<{id: string, similarity: number}> = [];
    
    if (data) {
      for (const item of data) {
        const otherMemory = this.mapDatabaseToMemory(item);
        const similarity = this.calculateMemorySimilarity(memory, otherMemory);
        
        if (similarity > ConversationMemoryManager.SIMILARITY_THRESHOLD) {
          similarities.push({ id: otherMemory.id, similarity });
        }
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  private calculateMemorySimilarity(memory1: ConversationMemory, memory2: ConversationMemory): number {
    let similarity = 0;
    
    if (memory1.interactionData.topic && memory2.interactionData.topic) {
      if (memory1.interactionData.topic === memory2.interactionData.topic) {
        similarity += 0.4;
      }
    }
    
    const words1 = new Set(memory1.interactionData.content.toLowerCase().split(/\s+/));
    const words2 = new Set(memory2.interactionData.content.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    if (union.size > 0) {
      similarity += (intersection.size / union.size) * 0.4;
    }
    
    if (memory1.memoryType === memory2.memoryType) {
      similarity += 0.2;
    }
    
    return Math.min(1.0, similarity);
  }

  private async integrateWithKnowledgeBase(memory: ConversationMemory): Promise<void> {
    logInfo('High quality memory ready for knowledge base integration', {
      componentName: 'ConversationMemory',
      memoryId: memory.id,
      memoryType: memory.memoryType,
      qualityScore: memory.qualityScore
    });
  }

  // Memory management methods
  private async getMemoryById(memoryId: string): Promise<ConversationMemory | null> {
    const cached = this.memoryCache.get(memoryId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.memory;
    }

    try {
      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('id', memoryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapDatabaseToMemory(data) : null;
    } catch (error) {
      logWarning('Failed to get memory by ID', { memoryId, error });
      return null;
    }
  }

  private updateMemoryCache(memory: ConversationMemory): void {
    this.memoryCache.set(memory.id, {
      memory,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });
  }

  private invalidateMemoryCache(memoryId: string): void {
    this.memoryCache.delete(memoryId);
  }

  private async createMemoryLink(request: MemoryLinkingRequest): Promise<void> {
    const sourceMemory = await this.getMemoryById(request.sourceMemoryId);
    if (sourceMemory && !sourceMemory.linkedMemories.includes(request.targetMemoryId)) {
      const updatedLinks = [...sourceMemory.linkedMemories, request.targetMemoryId];
      
      await (supabase
        .from('conversation_memory') as any)
        .update({
          interaction_data: {
            ...sourceMemory.interactionData,
            linkedMemories: updatedLinks
          }
        })
        .eq('id', request.sourceMemoryId);

      this.invalidateMemoryCache(request.sourceMemoryId);
    }
  }

  private getReverseLinkType(linkType: LinkType): LinkType {
    const reverseMap: Record<LinkType, LinkType> = {
      'similar': 'similar',
      'contradicts': 'contradicts',
      'supports': 'supports',
      'follows': 'follows',
      'references': 'references',
      'part_of': 'part_of'
    };
    
    return reverseMap[linkType] || 'similar';
  }

  private async updateMemoryLinkingMetadata(sourceId: string, targetId: string, request: MemoryLinkingRequest): Promise<void> {
    await Promise.all([
      (supabase
        .from('conversation_memory') as any)
        .update({
          interaction_data: {
            crossConversationLinked: true
          }
        })
        .eq('id', sourceId),
      (supabase
        .from('conversation_memory') as any)
        .update({
          interaction_data: {
            crossConversationLinked: true
          }
        })
        .eq('id', targetId)
    ]);
  }

  // Optimization methods
  private async getMemoriesForOptimization(request: MemoryOptimizationRequest): Promise<ConversationMemory[]> {
    let query = supabase
      .from('conversation_memory')
      .select('*')
      .eq('user_id', request.userId);

    if (request.conversationId) {
      query = query.eq('conversation_id', request.conversationId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get memories for optimization: ${error.message}`);

    return (data || []).map(item => this.mapDatabaseToMemory(item));
  }

  private async performMemoryCleanup(memories: ConversationMemory[], request: MemoryOptimizationRequest): Promise<{removed: number, storageSaved: number, recommendations: string[]}> {
    let removed = 0;
    let storageSaved = 0;
    const recommendations: string[] = [];

    const toRemove = memories.filter(memory => {
      if (memory.expiresAt && memory.expiresAt < new Date()) return true;
      
      if (request.qualityThreshold && memory.qualityScore < request.qualityThreshold) {
        if (!request.preserveRecent || memory.priority !== 'high') {
          return true;
        }
      }
      
      if (request.maxAge) {
        const ageInDays = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > request.maxAge && !request.preserveHighPriority) {
          return true;
        }
      }
      
      return false;
    });

    for (const memory of toRemove) {
      const { error } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('id', memory.id);

      if (!error) {
        removed++;
        storageSaved += memory.interactionData.content.length;
        this.invalidateMemoryCache(memory.id);
      }
    }

    if (removed > 0) {
      recommendations.push(`Removed ${removed} low-quality or expired memories`);
      recommendations.push(`Saved approximately ${storageSaved} bytes of storage`);
    }

    return { removed, storageSaved, recommendations };
  }

  private async performMemoryCompression(memories: ConversationMemory[], request: MemoryOptimizationRequest): Promise<{compressed: number, storageSaved: number, recommendations: string[]}> {
    let compressed = 0;
    let storageSaved = 0;
    const recommendations: string[] = [];

    for (const memory of memories) {
      if (!memory.metadata.compressionApplied && memory.interactionData.content.length > 500) {
        const compressedContent = this.compressContent(memory.interactionData.content);
        const originalSize = memory.interactionData.content.length;
        const newSize = compressedContent.length;
        
        if (newSize < originalSize) {
          await (supabase
            .from('conversation_memory') as any)
            .update({
              interaction_data: {
                ...memory.interactionData,
                content: compressedContent
              },
              metadata: {
                ...memory.metadata,
                compressionApplied: true,
                originalSize,
                compressedSize: newSize
              }
            })
            .eq('id', memory.id);

          compressed++;
          storageSaved += (originalSize - newSize);
          this.invalidateMemoryCache(memory.id);
        }
      }
    }

    if (compressed > 0) {
      recommendations.push(`Compressed ${compressed} memories`);
      recommendations.push(`Saved ${storageSaved} bytes through compression`);
    }

    return { compressed, storageSaved, recommendations };
  }

  private compressContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\b(very|really|quite|pretty)\s+/gi, '')
      .replace(/\b(okay|ok|alright)\b/gi, 'ok')
      .trim();
  }

  private async performMemoryConsolidation(memories: ConversationMemory[], request: MemoryOptimizationRequest): Promise<{removed: number, compressed: number, storageSaved: number, qualityImprovement: number, recommendations: string[]}> {
    const result = await this.performMemoryCompression(memories, request);
    const cleanupResult = await this.performMemoryCleanup(memories, request);
    
    return {
      removed: cleanupResult.removed,
      compressed: result.compressed,
      storageSaved: cleanupResult.storageSaved + result.storageSaved,
      qualityImprovement: 0.1,
      recommendations: [...cleanupResult.recommendations, ...result.recommendations, 'Memory consolidation completed']
    };
  }

  private async performMemoryLinking(memories: ConversationMemory[], request: MemoryOptimizationRequest): Promise<{linksCreated: number, qualityImprovement: number, recommendations: string[]}> {
    let linksCreated = 0;
    const recommendations: string[] = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memory1 = memories[i];
        const memory2 = memories[j];
        
        const similarity = this.calculateMemorySimilarity(memory1, memory2);
        
        if (similarity > ConversationMemoryManager.SIMILARITY_THRESHOLD) {
          const success = await this.linkMemories({
            sourceMemoryId: memory1.id,
            targetMemoryId: memory2.id,
            linkType: 'similar',
            strength: similarity,
            evidence: ['Content similarity detected during optimization'],
            bidirectional: true
          });
          
          if (success) linksCreated++;
        }
      }
    }

    const qualityImprovement = linksCreated * 0.05;
    
    if (linksCreated > 0) {
      recommendations.push(`Created ${linksCreated} memory links`);
      recommendations.push('Cross-conversation knowledge links established');
    } else {
      recommendations.push('No similar memories found for linking');
    }

    return { linksCreated, qualityImprovement, recommendations };
  }

  private recalculateQualityScore(memory: ConversationMemory, qualityData: any): number {
    let score = memory.qualityScore;
    
    if (qualityData.userSatisfaction) {
      score = (score + qualityData.userSatisfaction) / 2;
    }
    
    if (qualityData.corrections && qualityData.corrections.length > 0) {
      score *= 0.8;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private async logOptimizationResult(request: MemoryOptimizationRequest, result: MemoryOptimizationResult): Promise<void> {
    try {
      await (supabase
        .from('context_optimization_logs') as any)
        .insert([{
          user_id: request.userId,
          query_hash: this.generateOptimizationHash(request),
          original_context: { optimization_request: request },
          optimized_context: { optimization_result: result },
          size_reduction: result.storageSaved,
          relevance_score: result.qualityImprovement,
          optimization_strategy: result.optimizationType
        }]);
    } catch (error) {
      logWarning('Failed to log optimization result', { error });
    }
  }

  private generateOptimizationHash(request: MemoryOptimizationRequest): string {
    return createHash('md5').update(JSON.stringify(request) + this.cryptoKey).digest('hex');
  }

  private calculateMemoryAnalytics(memories: ConversationMemory[], timeRange?: { start: Date; end: Date }): MemoryAnalytics {
    const analytics: MemoryAnalytics = {
      userId: memories[0]?.userId || '',
      totalMemories: memories.length,
      memoriesByType: {} as Record<MemoryType, number>,
      memoriesByPriority: {} as Record<MemoryPriority, number>,
      averageQualityScore: 0,
      averageRelevanceScore: 0,
      retentionDistribution: {} as Record<MemoryRetention, number>,
      topTopics: [],
      learningProgress: [],
      memoryGrowthRate: 0,
      crossConversationLinks: 0,
      knowledgeBaseIntegrations: 0
    };

    if (memories.length === 0) return analytics;

    let totalQuality = 0;
    let totalRelevance = 0;
    let crossLinks = 0;
    let knowledgeIntegrations = 0;
    const topicCounts: Record<string, { count: number, quality: number }> = {};

    for (const memory of memories) {
      analytics.memoriesByType[memory.memoryType] = (analytics.memoriesByType[memory.memoryType] || 0) + 1;
      analytics.memoriesByPriority[memory.priority] = (analytics.memoriesByPriority[memory.priority] || 0) + 1;
      analytics.retentionDistribution[memory.retention] = (analytics.retentionDistribution[memory.retention] || 0) + 1;
      
      totalQuality += memory.qualityScore;
      totalRelevance += memory.memoryRelevanceScore;
      
      if (memory.metadata.crossConversationLinked) crossLinks++;
      if (memory.metadata.linkedToKnowledgeBase) knowledgeIntegrations++;
      
      if (memory.interactionData.topic) {
        if (!topicCounts[memory.interactionData.topic]) {
          topicCounts[memory.interactionData.topic] = { count: 0, quality: 0 };
        }
        topicCounts[memory.interactionData.topic].count++;
        topicCounts[memory.interactionData.topic].quality += memory.qualityScore;
      }
    }

    analytics.averageQualityScore = totalQuality / memories.length;
    analytics.averageRelevanceScore = totalRelevance / memories.length;
    analytics.crossConversationLinks = crossLinks;
    analytics.knowledgeBaseIntegrations = knowledgeIntegrations;

    analytics.topTopics = Object.entries(topicCounts)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        quality: data.quality / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const sortedMemories = memories.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const progressPoints: Array<{ date: Date, quality: number, topics: string[] }> = [];
    
    for (let i = 0; i < Math.min(sortedMemories.length, 10); i++) {
      const memory = sortedMemories[i];
      progressPoints.push({
        date: memory.createdAt,
        quality: memory.qualityScore,
        topics: memory.interactionData.topic ? [memory.interactionData.topic] : []
      });
    }
    
    analytics.learningProgress = progressPoints;

    if (timeRange) {
      const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
      analytics.memoryGrowthRate = daysDiff > 0 ? memories.length / daysDiff : 0;
    }

    return analytics;
  }

  private createEmptyAnalytics(userId: string): MemoryAnalytics {
    return {
      userId,
      totalMemories: 0,
      memoriesByType: {
        user_query: 0,
        ai_response: 0,
        learning_interaction: 0,
        feedback: 0,
        correction: 0,
        insight: 0
      },
      memoriesByPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      averageQualityScore: 0,
      averageRelevanceScore: 0,
      retentionDistribution: {
        session: 0,
        short_term: 0,
        long_term: 0,
        permanent: 0
      },
      topTopics: [],
      learningProgress: [],
      memoryGrowthRate: 0,
      crossConversationLinks: 0,
      knowledgeBaseIntegrations: 0
    };
  }

  private startCleanupSchedule(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performScheduledCleanup();
      } catch (error) {
        logWarning('Scheduled memory cleanup failed', { error });
      }
    }, ConversationMemoryManager.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);
  }

  private async performScheduledCleanup(): Promise<void> {
    logInfo('Starting scheduled memory cleanup', {
      componentName: 'ConversationMemory'
    });

    const { error } = await supabase
      .from('conversation_memory')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      logWarning('Failed to clean up expired memories', { error });
    } else {
      logInfo('Scheduled memory cleanup completed', {
        componentName: 'ConversationMemory'
      });
    }
  }

  /**
   * Cleanup on instance destruction
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryCache.clear();
  }
}

// Export singleton instance
export const conversationMemory = new ConversationMemoryManager();

// Convenience functions
export const storeMemory = (memoryData: Omit<ConversationMemory, 'id' | 'createdAt' | 'updatedAt'>) => 
  conversationMemory.storeMemory(memoryData);

export const searchMemories = (request: MemorySearchRequest) => 
  conversationMemory.searchMemories(request);

export const linkMemories = (request: MemoryLinkingRequest) => 
  conversationMemory.linkMemories(request);

export const optimizeMemories = (request: MemoryOptimizationRequest) => 
  conversationMemory.optimizeMemories(request);

export const getMemoryAnalytics = (userId: string, timeRange?: { start: Date; end: Date }) => 
  conversationMemory.getMemoryAnalytics(userId, timeRange);

export const updateMemoryQuality = (memoryId: string, qualityData: any) => 
  conversationMemory.updateMemoryQuality(memoryId, qualityData);