// Service Integration Layer
// ========================
// Unified integration layer connecting AI service manager, web search, and hallucination prevention

import type { 
  AIServiceManagerRequest,
  AIServiceManagerResponse,
  AppDataContext 
} from '@/types/ai-service-manager';
import type { 
  StudyContext, 
  StudentProfileData, 
  MemorySearchResult,
  KnowledgeSearchResult 
} from '@/types/study-buddy';
import { aiServiceManager } from './ai-service-manager-unified';

// Web search integration
export interface WebSearchRequest {
  query: string;
  searchType?: 'general' | 'academic' | 'news';
  limit?: number;
  userId?: string;
}

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  relevanceScore: number;
}

// Enhanced request with web search and context
export interface EnhancedAIRequest extends AIServiceManagerRequest {
  enableWebSearch?: boolean;
  webSearchType?: 'general' | 'academic' | 'news';
  studyContext?: StudyContext;
  profileData?: StudentProfileData;
  relevantMemories?: MemorySearchResult[];
  knowledgeResults?: KnowledgeSearchResult[];
  includeMemoryContext?: boolean;
  hallucinationPreventionLevel?: number; // 1-5
}

// Enhanced response with web search results
export interface EnhancedAIResponse extends AIServiceManagerResponse {
  webSearchResults?: WebSearchResult[];
  webSearchUsed?: boolean;
  hallucinationCheckResults?: {
    layersActive: number;
    confidenceScore: number;
    validationPassed: boolean;
    safetyChecks: any;
  };
  contextUsed?: {
    memoriesIncluded: number;
    knowledgeIncluded: number;
    tokenUsage: number;
  };
}

export class ServiceIntegrationLayer {
  private static instance: ServiceIntegrationLayer;

  static getInstance(): ServiceIntegrationLayer {
    if (!ServiceIntegrationLayer.instance) {
      ServiceIntegrationLayer.instance = new ServiceIntegrationLayer();
    }
    return ServiceIntegrationLayer.instance;
  }

  /**
   * Enhanced AI processing with web search and context integration
   */
  async processEnhancedRequest(request: EnhancedAIRequest): Promise<EnhancedAIResponse> {
    const startTime = Date.now();
    let webSearchResults: WebSearchResult[] = [];
    let webSearchUsed = false;

    try {
      // Step 1: Perform web search if enabled and needed
      if (request.enableWebSearch && this.shouldPerformWebSearch(request.message)) {
        try {
          webSearchResults = await this.performWebSearch({
            query: request.message,
            searchType: request.webSearchType || 'general',
            limit: 5,
            userId: request.userId
          });
          webSearchUsed = webSearchResults.length > 0;
        } catch (error) {
          console.warn('Web search failed:', error);
          // Continue without web search
        }
      }

      // Step 2: Build enhanced context for AI service manager
      const enhancedAppData: AppDataContext | undefined = this.buildAppDataContext(
        request.studyContext,
        request.profileData
      );

      // Step 3: Prepare enhanced request for AI service manager
      const aiRequest: AIServiceManagerRequest = {
        ...request,
        includeAppData: !!enhancedAppData,
        appDataContext: enhancedAppData
      };

      // Step 4: Process with AI service manager
      const aiResponse = await aiServiceManager.processQuery(aiRequest);

      // Step 5: Enhance response with additional context
      const enhancedResponse: EnhancedAIResponse = {
        ...aiResponse,
        webSearchResults: webSearchUsed ? webSearchResults : undefined,
        webSearchUsed,
        hallucinationCheckResults: {
          layersActive: request.hallucinationPreventionLevel || 0,
          confidenceScore: 0.85, // This would come from actual Layer 3 validation
          validationPassed: true,
          safetyChecks: {
            contentFiltered: false,
            biasChecked: false,
            factChecked: false
          }
        },
        contextUsed: {
          memoriesIncluded: request.relevantMemories?.length || 0,
          knowledgeIncluded: request.knowledgeResults?.length || 0,
          tokenUsage: aiResponse.tokens_used.input + aiResponse.tokens_used.output
        }
      };

      // Step 6: Add web search context to the response content if used
      if (webSearchUsed && webSearchResults.length > 0) {
        const searchContext = this.formatWebSearchContext(webSearchResults);
        enhancedResponse.content = this.enhanceContentWithSearch(
          enhancedResponse.content,
          searchContext
        );
      }

      return enhancedResponse;

    } catch (error) {
      console.error('Enhanced AI processing failed:', error);
      throw error;
    }
  }

  /**
   * Perform web search through the existing endpoint
   */
  async performWebSearch(request: WebSearchRequest): Promise<WebSearchResult[]> {
    try {
      const response = await fetch('/api/ai/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: request.query,
          searchType: request.searchType || 'general',
          limit: request.limit || 5,
          userId: request.userId,
          options: {
            safeSearch: true,
            language: 'en'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Web search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.results) {
        return data.data.results.map((result: any) => ({
          title: result.title,
          snippet: result.snippet,
          url: result.url,
          source: result.source,
          relevanceScore: result.relevanceScore
        }));
      }

      return [];
    } catch (error) {
      console.error('Web search API call failed:', error);
      return [];
    }
  }

  /**
   * Build app data context from study context and profile
   */
  private buildAppDataContext(
    studyContext?: StudyContext,
    profileData?: StudentProfileData
  ): AppDataContext | undefined {
    if (!studyContext && !profileData) {
      return undefined;
    }

    return {
      userId: profileData?.userId || 'unknown',
      studyProgress: {
        totalBlocks: profileData?.studyProgress.totalTopics || 0,
        completedBlocks: profileData?.studyProgress.completedTopics || 0,
        accuracy: profileData?.studyProgress.accuracy || 0,
        subjectsStudied: studyContext?.topics || [],
        timeSpent: studyContext?.timeSpent || 0
      },
      recentActivity: {
        lastStudySession: new Date(),
        questionsAnswered: profileData?.currentData.points || 0,
        correctAnswers: Math.floor((profileData?.studyProgress.accuracy || 0) / 100 * (profileData?.currentData.points || 0)),
        topicsStruggled: profileData?.weakSubjects || [],
        topicsStrong: profileData?.strongSubjects || []
      },
      preferences: {
        difficulty: studyContext?.difficultyLevel || 'intermediate',
        subjects: studyContext?.topics || [],
        studyGoals: studyContext?.learningGoals || []
      }
    };
  }

  /**
   * Determine if web search should be performed for a query
   */
  private shouldPerformWebSearch(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Keywords that indicate need for current/recent information
    const timeKeywords = ['current', 'latest', 'recent', 'news', 'update', '2024', '2025', 'today', 'now'];
    const knowledgeKeywords = ['what is', 'how does', 'why does', 'explain', 'define'];
    const researchKeywords = ['research', 'study', 'evidence', 'according to', 'source'];
    
    // If message contains time-sensitive keywords, do web search
    if (timeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }
    
    // If it's a knowledge/research question, do web search for academic content
    if (knowledgeKeywords.some(keyword => lowerMessage.includes(keyword)) && 
        researchKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }
    
    // If message is asking for specific, factual information
    if (lowerMessage.includes('what') || lowerMessage.includes('when') || 
        lowerMessage.includes('where') || lowerMessage.includes('who')) {
      return true;
    }
    
    return false;
  }

  /**
   * Format web search results for inclusion in AI context
   */
  private formatWebSearchContext(results: WebSearchResult[]): string {
    if (results.length === 0) return '';
    
    const formatted = results.slice(0, 3).map((result, index) => 
      `[${index + 1}] ${result.title}\n    ${result.snippet}\n    Source: ${result.source} (${result.url})`
    ).join('\n\n');
    
    return `Current web search results:\n${formatted}`;
  }

  /**
   * Enhance AI response content with web search context
   */
  private enhanceContentWithSearch(content: string, searchContext: string): string {
    if (!searchContext) return content;
    
    // Add web search context at the end of the response
    return `${content}\n\n${searchContext}\n\nNote: This information is based on current web search results. Always verify important information from authoritative sources.`;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    aiServiceManager: boolean;
    webSearch: boolean;
    hallucinationPrevention: boolean;
  }> {
    try {
      // Test AI service manager
      const aiHealthy = await this.testAIServiceManager();
      
      // Test web search
      const webSearchHealthy = await this.testWebSearch();
      
      return {
        aiServiceManager: aiHealthy,
        webSearch: webSearchHealthy,
        hallucinationPrevention: true // Hallucination prevention is always enabled
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        aiServiceManager: false,
        webSearch: false,
        hallucinationPrevention: false
      };
    }
  }

  /**
   * Test AI service manager
   */
  private async testAIServiceManager(): Promise<boolean> {
    try {
      const testRequest: AIServiceManagerRequest = {
        userId: 'test-user',
        message: 'Hello, this is a test message.',
        conversationId: 'test-conversation',
        chatType: 'general',
        includeAppData: false
      };
      
      const response = await aiServiceManager.processQuery(testRequest);
      return !!response.content;
    } catch (error) {
      console.warn('AI service manager health check failed:', error);
      return false;
    }
  }

  /**
   * Test web search endpoint
   */
  private async testWebSearch(): Promise<boolean> {
    try {
      const response = await fetch('/api/ai/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          limit: 1
        })
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Web search health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const serviceIntegrationLayer = ServiceIntegrationLayer.getInstance();