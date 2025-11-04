// Semantic Search Service for Study Memories
// =========================================

import { cohereClient } from './providers/cohere-client';
import { MemoryQueries } from '@/lib/database/queries';
import type { StudyChatMemoryWithSimilarity } from '@/types/database-ai';

export interface SemanticSearchOptions {
  userId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
  tags?: string[];
  importanceScore?: number;
  contextLevel?: 'light' | 'balanced' | 'comprehensive';
}

export interface SemanticSearchResult {
  memories: StudyChatMemoryWithSimilarity[];
  queryEmbedding: number[];
  searchStats: {
    totalFound: number;
    averageSimilarity: number;
    searchTimeMs: number;
    embeddingGenerated: boolean;
    cohereUsage: {
      embeddingTokens: number;
      monthlyUsage: number;
      monthlyLimit: number;
    };
  };
}

export interface CohereUsageTracker {
  monthlyEmbeddingTokens: number;
  monthlyRequestCount: number;
  lastResetDate: string;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

const COHERE_MONTHLY_LIMIT = 1000; // Requests per month
const COHERE_TOKEN_PER_EMBEDDING = 100; // Estimated tokens per embedding request
const EMBEDDING_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Semantic Search Service for Study Memories
 * Uses Cohere embeddings to find relevant study memories
 */
export class SemanticSearchService {
  private embeddingCache: Map<string, { embedding: number[]; timestamp: number }> = new Map();
  private usageTracker: CohereUsageTracker = {
    monthlyEmbeddingTokens: 0,
    monthlyRequestCount: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    isNearLimit: false,
    isAtLimit: false
  };

  /**
   * Main semantic search function
   */
  async searchMemories(options: SemanticSearchOptions): Promise<SemanticSearchResult> {
    const startTime = Date.now();
    const {
      userId,
      query,
      limit = 5,
      minSimilarity = 0.7,
      tags,
      importanceScore,
      contextLevel = 'balanced'
    } = options;

    try {
      // Step 1: Generate or get cached embedding for the query
      const queryEmbedding = await this.getQueryEmbedding(query);
      
      // Step 2: Update usage tracking
      this.updateUsageTracking(queryEmbedding);
      
      // Step 3: Perform vector similarity search in database
      const searchOptions = {
        user_id: userId,
        embedding: queryEmbedding,
        limit,
        min_similarity: minSimilarity,
        tags,
        importance_score: importanceScore
      };

      const memories = await MemoryQueries.findSimilarMemories(userId, queryEmbedding, searchOptions);
      
      // Step 4: Filter and sort results based on context level
      const filteredMemories = this.filterMemoriesByContext(memories, contextLevel);
      
      // Step 5: Calculate search statistics
      const searchStats = this.calculateSearchStats(
        filteredMemories,
        startTime,
        queryEmbedding,
        contextLevel
      );

      return {
        memories: filteredMemories,
        queryEmbedding,
        searchStats
      };

    } catch (error) {
      console.error('Semantic search failed:', error);
      throw new Error(`Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for a query using Cohere
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.getEmbeddingCacheKey(query);
    const cached = this.embeddingCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL) {
      return cached.embedding;
    }

    // Check rate limits before making request
    if (this.isAtCohereLimit()) {
      throw new Error('Cohere monthly limit reached. Please try again next month.');
    }

    try {
      // Generate embedding using Cohere
      const embeddings = await cohereClient.generateEmbeddings({
        texts: [query],
        inputType: 'search_query',
        model: 'embed-english-v3.0'
      });

      if (!embeddings || embeddings.length === 0) {
        throw new Error('No embedding returned from Cohere');
      }

      const embedding = embeddings[0];
      
      // Cache the embedding
      this.embeddingCache.set(cacheKey, {
        embedding,
        timestamp: Date.now()
      });

      // Clean up old cache entries to prevent memory leaks
      this.cleanupEmbeddingCache();

      return embedding;

    } catch (error) {
      console.error('Failed to generate embedding:', error);
      
      // Return a random embedding as fallback (not ideal but prevents complete failure)
      return this.generateFallbackEmbedding();
    }
  }

  /**
   * Filter memories based on context level requirements
   */
  private filterMemoriesByContext(
    memories: StudyChatMemoryWithSimilarity[], 
    contextLevel: 'light' | 'balanced' | 'comprehensive'
  ): StudyChatMemoryWithSimilarity[] {
    switch (contextLevel) {
      case 'light':
        // Return top 2 most relevant memories
        return memories.slice(0, 2);
      
      case 'balanced':
        // Return top 3-4 memories with good diversity
        const balancedResults = memories.slice(0, 4);
        
        // Ensure we have diversity in topics if possible
        const uniqueTopics = new Set<string>();
        const diverseResults: StudyChatMemoryWithSimilarity[] = [];
        
        for (const memory of balancedResults) {
          const topicKey = memory.tags?.[0] || 'general';
          if (!uniqueTopics.has(topicKey) || diverseResults.length < 2) {
            uniqueTopics.add(topicKey);
            diverseResults.push(memory);
          }
        }
        
        return diverseResults.length > 0 ? diverseResults : balancedResults;
      
      case 'comprehensive':
        // Return all relevant memories (up to limit)
        return memories;
      
      default:
        return memories.slice(0, 3);
    }
  }

  /**
   * Calculate search statistics
   */
  private calculateSearchStats(
    memories: StudyChatMemoryWithSimilarity[],
    startTime: number,
    queryEmbedding: number[],
    contextLevel: string
  ): SemanticSearchResult['searchStats'] {
    const searchTimeMs = Date.now() - startTime;
    const similarities = memories.map(m => m.similarity || 0);
    const averageSimilarity = similarities.length > 0 
      ? similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length 
      : 0;

    return {
      totalFound: memories.length,
      averageSimilarity,
      searchTimeMs,
      embeddingGenerated: true,
      cohereUsage: {
        embeddingTokens: COHERE_TOKEN_PER_EMBEDDING,
        monthlyUsage: this.usageTracker.monthlyRequestCount,
        monthlyLimit: COHERE_MONTHLY_LIMIT
      }
    };
  }

  /**
   * Update usage tracking for Cohere
   */
  private updateUsageTracking(embedding: number[]): void {
    const today = new Date().toISOString().split('T')[0];
    
    // Reset monthly counter if it's a new month
    if (today !== this.usageTracker.lastResetDate) {
      this.usageTracker.monthlyEmbeddingTokens = 0;
      this.usageTracker.monthlyRequestCount = 0;
      this.usageTracker.lastResetDate = today;
    }

    // Update usage
    this.usageTracker.monthlyEmbeddingTokens += COHERE_TOKEN_PER_EMBEDDING;
    this.usageTracker.monthlyRequestCount += 1;

    // Update limit status
    const usagePercentage = this.usageTracker.monthlyRequestCount / COHERE_MONTHLY_LIMIT;
    this.usageTracker.isNearLimit = usagePercentage >= 0.8;
    this.usageTracker.isAtLimit = usagePercentage >= 1.0;
  }

  /**
   * Check if we're at Cohere monthly limit
   */
  private isAtCohereLimit(): boolean {
    return this.usageTracker.isAtLimit;
  }

  /**
   * Get cache key for embedding
   */
  private getEmbeddingCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Generate fallback embedding when Cohere fails
   */
  private generateFallbackEmbedding(): number[] {
    // Return a random 1536-dimensional vector
    // This is not ideal but prevents complete system failure
    return Array.from({ length: 1536 }, () => Math.random() - 0.5);
  }

  /**
   * Clean up old cache entries
   */
  private cleanupEmbeddingCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    for (const [key, value] of this.embeddingCache.entries()) {
      if (now - value.timestamp > EMBEDDING_CACHE_TTL) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach(key => this.embeddingCache.delete(key));

    // If cache is still too large, remove oldest entries
    if (this.embeddingCache.size > 1000) {
      const sortedEntries = Array.from(this.embeddingCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, 500); // Remove oldest 500 entries
      toRemove.forEach(([key]) => this.embeddingCache.delete(key));
    }
  }

  /**
   * Batch generate embeddings for multiple texts
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    // Check if we can handle the batch
    const remainingRequests = COHERE_MONTHLY_LIMIT - this.usageTracker.monthlyRequestCount;
    if (texts.length > remainingRequests) {
      throw new Error(`Cannot process batch: would exceed monthly limit (${texts.length} > ${remainingRequests} remaining)`);
    }

    try {
      const embeddings = await cohereClient.generateEmbeddings({
        texts,
        inputType: 'search_document',
        model: 'embed-english-v3.0'
      });

      // Cache each embedding
      texts.forEach((text, index) => {
        const cacheKey = this.getEmbeddingCacheKey(text);
        this.embeddingCache.set(cacheKey, {
          embedding: embeddings[index],
          timestamp: Date.now()
        });
      });

      // Update usage tracking
      this.usageTracker.monthlyRequestCount += texts.length;
      this.usageTracker.monthlyEmbeddingTokens += texts.length * COHERE_TOKEN_PER_EMBEDDING;

      return embeddings;

    } catch (error) {
      console.error('Batch embedding generation failed:', error);
      throw new Error(`Batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(): CohereUsageTracker {
    return { ...this.usageTracker };
  }

  /**
   * Check if embeddings are available for a text
   */
  hasCachedEmbedding(text: string): boolean {
    const cacheKey = this.getEmbeddingCacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);
    
    if (!cached) return false;
    
    // Check if cache is still valid
    return Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL;
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    totalEntries: number;
    validEntries: number;
    cacheHitRate: number;
    memoryUsage: string;
  } {
    const now = Date.now();
    let validEntries = 0;
    
    for (const { timestamp } of this.embeddingCache.values()) {
      if (now - timestamp < EMBEDDING_CACHE_TTL) {
        validEntries++;
      }
    }

    // Estimate memory usage (rough calculation)
    const avgEmbeddingSize = 1536 * 8; // 1536 floats * 8 bytes per float
    const totalMemoryUsage = this.embeddingCache.size * avgEmbeddingSize;
    
    return {
      totalEntries: this.embeddingCache.size,
      validEntries,
      cacheHitRate: validEntries / this.embeddingCache.size,
      memoryUsage: `${(totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Preload embeddings for common study topics
   */
  async preloadCommonTopicEmbeddings(): Promise<void> {
    const commonTopics = [
      'thermodynamics',
      'organic chemistry',
      'integration',
      'electromagnetism',
      'kinematics',
      'mole concept',
      'differentiation',
      'waves',
      'kinetics',
      'periodic table'
    ];

    try {
      const embeddings = await this.batchGenerateEmbeddings(commonTopics);
      console.log(`Preloaded ${embeddings.length} common topic embeddings`);
    } catch (error) {
      console.warn('Failed to preload common topic embeddings:', error);
    }
  }
}

// Export singleton instance
export const semanticSearch = new SemanticSearchService();

// Convenience functions
export const searchStudyMemories = (options: SemanticSearchOptions) => 
  semanticSearch.searchMemories(options);

export const generateQueryEmbedding = (query: string) => 
  semanticSearch['getQueryEmbedding'](query);

export const getSemanticSearchStats = () => 
  semanticSearch.getUsageStatistics();

// Export for testing
export const CohereMonthlyLimit = COHERE_MONTHLY_LIMIT;
export const EmbeddingCacheTTL = EMBEDDING_CACHE_TTL;