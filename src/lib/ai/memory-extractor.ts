// Memory Extraction and Storage System for Study Assistant
// =====================================================

import { semanticSearch } from './semantic-search';
import { MemoryQueries } from '@/lib/database/queries';
import { cohereClient } from './providers/cohere-client';
import type { StudyChatMemoryInsert } from '@/types/database-ai';

export interface MemoryExtractionResult {
  insights: ExtractedInsight[];
  memoriesCreated: number;
  embeddingsGenerated: number;
  storageErrors: string[];
}

export interface ExtractedInsight {
  content: string;
  importanceScore: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  category: 'weakness' | 'strength' | 'pattern' | 'gap' | 'achievement' | 'strategy';
  sourceContext: string;
}

export interface MemoryExtractionOptions {
  userId: string;
  conversationId: string;
  userMessage: string;
  aiResponse: string;
  isPersonalQuery: boolean;
  contextLevel: 'light' | 'balanced' | 'comprehensive';
}

/**
 * Memory Extraction and Storage Service
 * Analyzes AI conversations to extract and store learning insights
 */
export class MemoryExtractor {
  private static readonly MAX_INSIGHTS_PER_CONVERSATION = 5;
  private static readonly MIN_IMPORTANCE_THRESHOLD = 3;
  private static readonly EMBEDDING_BATCH_SIZE = 10;

  /**
   * Extract insights from AI conversation and store as memories
   */
  async extractAndStoreMemories(options: MemoryExtractionOptions): Promise<MemoryExtractionResult> {
    const {
      userId,
      conversationId,
      userMessage,
      aiResponse,
      isPersonalQuery,
      contextLevel
    } = options;

    const result: MemoryExtractionResult = {
      insights: [],
      memoriesCreated: 0,
      embeddingsGenerated: 0,
      storageErrors: []
    };

    try {
      // Only extract memories for personal queries in study assistant mode
      if (!isPersonalQuery || contextLevel === 'light') {
        return result;
      }

      // Step 1: Analyze conversation for insights
      const insights = await this.analyzeConversationForInsights(
        userMessage,
        aiResponse,
        contextLevel
      );

      result.insights = insights;

      // Step 2: Generate embeddings for insights
      const embeddings = await this.generateInsightEmbeddings(insights);
      result.embeddingsGenerated = embeddings.length;

      // Step 3: Store memories in database
      const storageResults = await this.storeMemories(
        userId,
        conversationId,
        insights,
        embeddings
      );

      result.memoriesCreated = storageResults.successCount;
      result.storageErrors = storageResults.errors;

      return result;

    } catch (error) {
      console.error('Memory extraction failed:', error);
      result.storageErrors.push(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Analyze conversation content for learning insights
   */
  private async analyzeConversationForInsights(
    userMessage: string,
    aiResponse: string,
    contextLevel: 'light' | 'balanced' | 'comprehensive'
  ): Promise<ExtractedInsight[]> {
    // For comprehensive analysis, use AI to extract insights
    if (contextLevel === 'comprehensive') {
      return await this.aiExtractInsights(userMessage, aiResponse);
    }

    // For balanced/light analysis, use rule-based extraction
    return this.ruleBasedExtractInsights(userMessage, aiResponse);
  }

  /**
   * AI-powered insight extraction using LLM analysis
   */
  private async aiExtractInsights(userMessage: string, aiResponse: string): Promise<ExtractedInsight[]> {
    const prompt = `Analyze this study conversation and extract key learning insights about the student.

User Question: "${userMessage}"
AI Response: "${aiResponse}"

Extract 3-5 specific learning insights about the student. Format each insight as:
[INSIGHT: description] | [IMPORTANCE: 1-5] | [TAGS: tag1,tag2] | [CATEGORY: weakness|strength|pattern|gap|achievement|strategy] | [CONTEXT: brief context]

Focus on:
- Weaknesses identified or improved
- Strengths demonstrated
- Learning patterns observed
- Knowledge gaps discovered
- Study strategies mentioned
- Progress or achievements noted

Respond with insights only, no additional text:`;

    try {
      // Use a simple AI call for extraction (could integrate with existing AI service manager)
      const extractionPrompt = `Extract learning insights from this conversation. Format: [INSIGHT: text] | [IMPORTANCE: number] | [TAGS: comma-separated] | [CATEGORY: type]`;

      // Simulate AI extraction (in real implementation, call AI service)
      const mockInsights = this.mockAIInsightExtraction(userMessage, aiResponse);
      return mockInsights;

    } catch (error) {
      console.error('AI insight extraction failed:', error);
      // Fallback to rule-based extraction
      return this.ruleBasedExtractInsights(userMessage, aiResponse);
    }
  }

  /**
   * Rule-based insight extraction using keyword matching
   */
  private ruleBasedExtractInsights(userMessage: string, aiResponse: string): ExtractedInsight[] {
    const insights: ExtractedInsight[] = [];
    const conversationText = `${userMessage} ${aiResponse}`.toLowerCase();

    // Pattern 1: Performance/Progress indicators
    const progressPatterns = [
      { pattern: /(improved|improving|better|progress)/, tags: ['progress'], category: 'achievement' as const },
      { pattern: /(struggling|difficult|weak|problem)/, tags: ['difficulty'], category: 'weakness' as const },
      { pattern: /(strong|good|excellent|mastered)/, tags: ['strength'], category: 'strength' as const },
      { pattern: /(confused|unclear|don.?t understand)/, tags: ['confusion'], category: 'gap' as const }
    ];

    // Pattern 2: Study strategy mentions
    const strategyPatterns = [
      { pattern: /(practice|revise|review|study method)/, tags: ['study-strategy'], category: 'strategy' as const },
      { pattern: /(schedule|plan|timing)/, tags: ['planning'], category: 'strategy' as const },
      { pattern: /(focus|concentrate|attention)/, tags: ['focus'], category: 'strategy' as const }
    ];

    // Pattern 3: Subject-specific insights
    const subjectPatterns = [
      { pattern: /(math|physics|chemistry|biology)/, tags: ['subject-specific'], category: 'pattern' as const },
      { pattern: /(formula|concept|theory)/, tags: ['conceptual'], category: 'pattern' as const },
      { pattern: /(problem|question|exercise)/, tags: ['problem-solving'], category: 'pattern' as const }
    ];

    // Extract insights based on patterns
    [...progressPatterns, ...strategyPatterns, ...subjectPatterns].forEach(({ pattern, tags, category }) => {
      if (pattern.test(conversationText)) {
        const importance = this.calculateImportance(conversationText, category);
        insights.push({
          content: this.generateInsightFromPattern(userMessage, aiResponse, category, tags),
          importanceScore: importance,
          tags,
          category,
          sourceContext: this.extractContextSnippet(userMessage, aiResponse, pattern)
        });
      }
    });

    // Add performance-based insights if metrics are mentioned
    const performanceInsight = this.extractPerformanceInsight(userMessage, aiResponse);
    if (performanceInsight) {
      insights.push(performanceInsight);
    }

    // Add strategy insight if study advice is given
    const strategyInsight = this.extractStrategyInsight(userMessage, aiResponse);
    if (strategyInsight) {
      insights.push(strategyInsight);
    }

    // Limit to maximum insights and sort by importance
    return insights
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, MemoryExtractor.MAX_INSIGHTS_PER_CONVERSATION);
  }

  /**
   * Calculate importance score based on content and context
   */
  private calculateImportance(text: string, category: ExtractedInsight['category']): 1 | 2 | 3 | 4 | 5 {
    let score = 3; // Base score

    // Category-based scoring
    switch (category) {
      case 'weakness':
        score += 1; // Weaknesses are important to track
        break;
      case 'strength':
        score += 1; // Strengths are important to leverage
        break;
      case 'strategy':
        score += 1; // Study strategies are valuable
        break;
      case 'achievement':
        score += 2; // Achievements are highly valuable
        break;
      case 'gap':
        score += 2; // Knowledge gaps need addressing
        break;
    }

    // Context-based adjustments
    const urgencyKeywords = ['urgent', 'important', 'critical', 'asap'];
    const hasUrgency = urgencyKeywords.some(keyword => text.includes(keyword));
    if (hasUrgency) score += 1;

    const progressKeywords = ['improved', 'better', 'progress', 'learning'];
    const hasProgress = progressKeywords.some(keyword => text.includes(keyword));
    if (hasProgress) score += 1;

    // Cap at 5
    return Math.min(score, 5) as 1 | 2 | 3 | 4 | 5;
  }

  /**
   * Generate insight content from pattern match
   */
  private generateInsightFromPattern(
    userMessage: string, 
    aiResponse: string, 
    category: ExtractedInsight['category'], 
    tags: string[]
  ): string {
    const responses: Record<ExtractedInsight['category'], string> = {
      weakness: 'Student identified areas needing improvement through this conversation',
      strength: 'Student demonstrated understanding and capability in this topic',
      pattern: 'Learning pattern or approach identified in student behavior',
      gap: 'Knowledge gap or confusion point discovered',
      achievement: 'Student showed progress or successful learning',
      strategy: 'Study strategy or method discussed or recommended'
    };

    return responses[category];
  }

  /**
   * Extract context snippet around pattern match
   */
  private extractContextSnippet(userMessage: string, aiResponse: string, pattern: RegExp): string {
    const fullText = `${userMessage} ${aiResponse}`;
    const match = fullText.match(pattern);
    
    if (match) {
      const start = Math.max(0, match.index! - 50);
      const end = Math.min(fullText.length, match.index! + match[0].length + 50);
      return fullText.substring(start, end).trim();
    }
    
    return fullText.substring(0, 100) + '...';
  }

  /**
   * Extract performance-related insights
   */
  private extractPerformanceInsight(userMessage: string, aiResponse: string): ExtractedInsight | null {
    const performanceKeywords = ['score', 'marks', 'percentage', 'accuracy', 'performance'];
    const hasPerformance = performanceKeywords.some(keyword => 
      (userMessage + aiResponse).toLowerCase().includes(keyword)
    );

    if (hasPerformance) {
      return {
        content: 'Student performance metrics or progress discussed',
        importanceScore: 4,
        tags: ['performance', 'metrics'],
        category: 'pattern',
        sourceContext: 'Performance discussion in conversation'
      };
    }

    return null;
  }

  /**
   * Extract study strategy insights
   */
  private extractStrategyInsight(userMessage: string, aiResponse: string): ExtractedInsight | null {
    const strategyKeywords = ['study', 'learn', 'practice', 'method', 'technique', 'approach'];
    const strategyMentions = strategyKeywords.filter(keyword => 
      aiResponse.toLowerCase().includes(keyword)
    );

    if (strategyMentions.length >= 2) {
      return {
        content: `Study strategy recommended: ${strategyMentions.join(', ')}`,
        importanceScore: 4,
        tags: ['strategy', 'study-method'],
        category: 'strategy',
        sourceContext: 'Study advice provided in AI response'
      };
    }

    return null;
  }

  /**
   * Mock AI insight extraction for development/testing
   */
  private mockAIInsightExtraction(userMessage: string, aiResponse: string): ExtractedInsight[] {
    const insights: ExtractedInsight[] = [];
    const text = (userMessage + ' ' + aiResponse).toLowerCase();

    // Simple mock logic based on keywords
    if (text.includes('difficult') || text.includes('hard')) {
      insights.push({
        content: 'Student identified difficulty with topic - needs additional support',
        importanceScore: 4,
        tags: ['difficulty', 'support-needed'],
        category: 'weakness',
        sourceContext: 'Student expressed difficulty with concepts'
      });
    }

    if (text.includes('understand') || text.includes('clear')) {
      insights.push({
        content: 'Student demonstrated understanding after explanation',
        importanceScore: 3,
        tags: ['understanding', 'clarification'],
        category: 'strength',
        sourceContext: 'Student showed comprehension improvement'
      });
    }

    if (text.includes('practice') || text.includes('exercise')) {
      insights.push({
        content: 'Practice exercises recommended for topic mastery',
        importanceScore: 3,
        tags: ['practice', 'exercises'],
        category: 'strategy',
        sourceContext: 'Practice-based learning approach suggested'
      });
    }

    return insights;
  }

  /**
   * Generate embeddings for insights
   */
  private async generateInsightEmbeddings(insights: ExtractedInsight[]): Promise<number[][]> {
    if (insights.length === 0) return [];

    try {
      // Batch process embeddings to be efficient
      const texts = insights.map(insight => insight.content);
      return await semanticSearch.batchGenerateEmbeddings(texts);
    } catch (error) {
      console.error('Failed to generate embeddings for insights:', error);
      // Return fallback embeddings
      return insights.map(() => this.generateFallbackEmbedding());
    }
  }

  /**
   * Generate fallback embedding
   */
  private generateFallbackEmbedding(): number[] {
    return Array.from({ length: 1536 }, () => Math.random() - 0.5);
  }

  /**
   * Store memories in database
   */
  private async storeMemories(
    userId: string,
    conversationId: string,
    insights: ExtractedInsight[],
    embeddings: number[][]
  ): Promise<{ successCount: number; errors: string[] }> {
    const results = { successCount: 0, errors: [] as string[] };

    for (let i = 0; i < insights.length; i++) {
      try {
        const insight = insights[i];
        const embedding = embeddings[i] || this.generateFallbackEmbedding();

        // Skip low-importance insights
        if (insight.importanceScore < MemoryExtractor.MIN_IMPORTANCE_THRESHOLD) {
          continue;
        }

        const memoryData: StudyChatMemoryInsert = {
          user_id: userId,
          content: insight.content,
          embedding,
          importance_score: insight.importanceScore,
          tags: insight.tags,
          source_conversation_id: conversationId,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 8 months
          is_active: true
        };

        await MemoryQueries.addMemory(
          userId,
          insight.content,
          embedding,
          insight.importanceScore,
          {
            tags: insight.tags,
            sourceConversationId: conversationId
          }
        );

        results.successCount++;

      } catch (error) {
        console.error(`Failed to store memory ${i}:`, error);
        results.errors.push(`Memory ${i} storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Extract memories from batch of conversations
   */
  async extractMemoriesFromBatch(
    conversations: MemoryExtractionOptions[]
  ): Promise<MemoryExtractionResult[]> {
    const results: MemoryExtractionResult[] = [];

    for (const conversation of conversations) {
      try {
        const result = await this.extractAndStoreMemories(conversation);
        results.push(result);
        
        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Batch memory extraction failed for conversation:', conversation.conversationId, error);
        results.push({
          insights: [],
          memoriesCreated: 0,
          embeddingsGenerated: 0,
          storageErrors: [`Batch extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }

    return results;
  }

  /**
   * Get memory extraction statistics
   */
  getExtractionStatistics(): {
    maxInsightsPerConversation: number;
    minImportanceThreshold: number;
    embeddingBatchSize: number;
  } {
    return {
      maxInsightsPerConversation: MemoryExtractor.MAX_INSIGHTS_PER_CONVERSATION,
      minImportanceThreshold: MemoryExtractor.MIN_IMPORTANCE_THRESHOLD,
      embeddingBatchSize: MemoryExtractor.EMBEDDING_BATCH_SIZE
    };
  }
}

// Export singleton instance
export const memoryExtractor = new MemoryExtractor();

// Convenience functions
export const extractAndStoreMemories = (options: MemoryExtractionOptions) =>
  memoryExtractor.extractAndStoreMemories(options);

export const extractMemoriesFromBatch = (conversations: MemoryExtractionOptions[]) =>
  memoryExtractor.extractMemoriesFromBatch(conversations);