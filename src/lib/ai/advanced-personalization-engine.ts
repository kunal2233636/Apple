// Advanced Personalization Engine with Web Search Integration
// ==========================================================
// Intelligent system that knows when to be personalized vs general
// and automatically decides when web search is needed

import { queryClassifier } from '@/lib/hallucination-prevention/layer1/QueryClassifier';
import { serviceIntegrationLayer } from '@/lib/ai/service-integration-layer';
import { conversationMemory } from '@/lib/hallucination-prevention/layer2/ConversationMemory';
import { personalizationEngine } from '@/lib/hallucination-prevention/layer4/PersonalizationEngine';
import { logError, logInfo, logWarning } from '@/lib/error-logger-server-safe';

export interface PersonalizationQuery {
  query: string;
  userId: string;
  conversationId?: string;
  sessionContext?: {
    topic?: string;
    subject?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    previousQueries?: string[];
    userPerformance?: {
      accuracy: number;
      speed: number;
      engagement: number;
    };
  };
  webSearchPreference?: 'auto' | 'always' | 'never';
}

export interface PersonalizationDecision {
  type: 'personalized' | 'general' | 'hybrid';
  webSearchNeeded: boolean;
  webSearchType: 'academic' | 'general' | 'news' | 'current';
  confidence: number;
  reasoning: string[];
  personalizationLevel: number; // 0-1
  explanationDepth: 'basic' | 'intermediate' | 'advanced';
  teachingStyle: 'socratic' | 'direct' | 'interactive' | 'collaborative';
  memoryRelevance: number;
  contextWeight: number;
}

export interface PersonalizedResponse {
  content: string;
  personalizationApplied: boolean;
  webSearchUsed: boolean;
  webSearchResults?: any[];
  memoryReferences?: any[];
  confidence: number;
  teachingAdaptation?: {
    level: string;
    examplesAdded: boolean;
    complexity: number;
    feedbackLoops: string[];
  };
}

export interface StudyPattern {
  userId: string;
  patterns: {
    questionTypes: Record<string, number>;
    difficultyProgression: number[];
    subjectPreferences: Record<string, number>;
    timePatterns: {
      peakHours: number[];
      sessionLength: number;
      breakFrequency: number;
    };
    webSearchUsage: {
      frequency: number;
      topics: string[];
      types: string[];
    };
    learningVelocity: number;
    retentionRate: number;
  };
  lastUpdated: Date;
}

export class AdvancedPersonalizationEngine {
  private studyPatterns: Map<string, StudyPattern> = new Map();
  private webSearchPatterns: Map<string, {
    topics: Set<string>;
    frequency: number;
    successRate: number;
    lastUsed: Date;
  }> = new Map();

  constructor() {
    this.initializePatterns();
  }

  /**
   * Main method to classify query and make personalization decisions
   */
  async classifyAndPersonalize(request: PersonalizationQuery): Promise<PersonalizationDecision> {
    const startTime = Date.now();
    
    try {
      logInfo('Starting advanced personalization classification', {
        componentName: 'AdvancedPersonalizationEngine',
        userId: request.userId,
        query: request.query.substring(0, 100)
      });

      // Step 1: Analyze query type and complexity
      const queryAnalysis = await queryClassifier.classifyQuery(
        request.query,
        request.userId,
        request.sessionContext?.previousQueries
      );

      // Step 2: Get user study patterns
      const userPatterns = await this.getUserStudyPatterns(request.userId);

      // Step 3: Determine if web search is needed
      const webSearchDecision = await this.decideWebSearchNeed(
        request.query,
        queryAnalysis,
        userPatterns,
        request.webSearchPreference || 'auto'
      );

      // Step 4: Analyze personalization needs
      const personalizationAnalysis = await this.analyzePersonalizationNeeds(
        request.query,
        request.sessionContext,
        userPatterns,
        queryAnalysis
      );

      // Step 5: Determine teaching style and depth
      const teachingAdaptation = await this.determineTeachingAdaptation(
        request.query,
        request.sessionContext,
        userPatterns,
        personalizationAnalysis
      );

      // Step 6: Calculate final decision
      const decision: PersonalizationDecision = {
        type: personalizationAnalysis.type,
        webSearchNeeded: webSearchDecision.needed,
        webSearchType: webSearchDecision.type,
        confidence: this.calculateOverallConfidence(queryAnalysis, personalizationAnalysis, webSearchDecision),
        reasoning: this.generateReasoning(queryAnalysis, personalizationAnalysis, webSearchDecision),
        personalizationLevel: personalizationAnalysis.level,
        explanationDepth: teachingAdaptation.depth,
        teachingStyle: teachingAdaptation.style,
        memoryRelevance: personalizationAnalysis.memoryRelevance,
        contextWeight: personalizationAnalysis.contextWeight
      };

      const processingTime = Date.now() - startTime;
      logInfo('Personalization classification completed', {
        componentName: 'AdvancedPersonalizationEngine',
        userId: request.userId,
        type: decision.type,
        webSearchNeeded: decision.webSearchNeeded,
        confidence: decision.confidence,
        processingTime
      });

      return decision;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'AdvancedPersonalizationEngine',
        userId: request.userId,
        operation: 'classifyAndPersonalize'
      });

      // Return safe default decision
      return {
        type: 'general',
        webSearchNeeded: false,
        webSearchType: 'general',
        confidence: 0.0,
        reasoning: ['Classification error occurred'],
        personalizationLevel: 0.0,
        explanationDepth: 'intermediate',
        teachingStyle: 'direct',
        memoryRelevance: 0.0,
        contextWeight: 0.0
      };
    }
  }

  /**
   * Generate personalized response based on decision
   */
  async generatePersonalizedResponse(
    request: PersonalizationQuery,
    decision: PersonalizationDecision,
    baseResponse?: string
  ): Promise<PersonalizedResponse> {
    const startTime = Date.now();
    
    try {
      let webSearchResults: any[] = [];
      let memoryReferences: any[] = [];
      let enhancedContent = baseResponse || '';

      // Step 1: Perform web search if needed
      if (decision.webSearchNeeded) {
        try {
          const searchResults = await serviceIntegrationLayer.processEnhancedRequest({
            userId: request.userId,
            message: request.query,
            conversationId: request.conversationId,
            chatType: 'study_assistant',
            includeAppData: true,
            enableWebSearch: true,
            webSearchType: decision.webSearchType,
            hallucinationPreventionLevel: 5
          });

          if (searchResults.webSearchUsed && searchResults.webSearchResults) {
            webSearchResults = searchResults.webSearchResults;
            // Integrate web search results into response
            if (searchResults.content) {
              enhancedContent = searchResults.content;
            }
          }
        } catch (error) {
          logWarning('Web search failed, continuing without it', { error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Step 2: Get relevant memories for personalization
      if (decision.type !== 'general' && decision.memoryRelevance > 0.3) {
        try {
          const memoryResults = await conversationMemory.searchMemories({
            userId: request.userId,
            query: request.query,
            maxResults: 5,
            minRelevanceScore: decision.memoryRelevance,
            sortBy: 'relevance'
          });
          memoryReferences = memoryResults;
        } catch (error) {
          logWarning('Memory search failed, continuing without it', { error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Step 3: Apply personalization if needed
      if (decision.type !== 'general' && decision.personalizationLevel > 0.5) {
        try {
          // Apply teaching style adaptation
          enhancedContent = await this.adaptTeachingStyle(
            enhancedContent,
            decision.teachingStyle,
            decision.explanationDepth,
            request.sessionContext
          );
        } catch (error) {
          logWarning('Teaching adaptation failed, using base content', { error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Step 4: Add teaching adaptation metadata
      const teachingAdaptation = {
        level: decision.explanationDepth,
        examplesAdded: enhancedContent.includes('example') || enhancedContent.includes('For instance'),
        complexity: this.calculateContentComplexity(enhancedContent),
        feedbackLoops: this.identifyFeedbackLoops(enhancedContent)
      };

      const processingTime = Date.now() - startTime;
      logInfo('Personalized response generated', {
        componentName: 'AdvancedPersonalizationEngine',
        userId: request.userId,
        webSearchUsed: webSearchResults.length > 0,
        personalizationApplied: decision.type !== 'general',
        memoryReferences: memoryReferences.length,
        processingTime
      });

      return {
        content: enhancedContent,
        personalizationApplied: decision.type !== 'general',
        webSearchUsed: webSearchResults.length > 0,
        webSearchResults: webSearchResults.length > 0 ? webSearchResults : undefined,
        memoryReferences: memoryReferences.length > 0 ? memoryReferences : undefined,
        confidence: decision.confidence,
        teachingAdaptation
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'AdvancedPersonalizationEngine',
        userId: request.userId,
        operation: 'generatePersonalizedResponse'
      });

      // Return safe fallback response
      return {
        content: baseResponse || 'I apologize, but I encountered an issue personalizing your response. Let me try to help you with your study question.',
        personalizationApplied: false,
        webSearchUsed: false,
        confidence: 0.0
      };
    }
  }

  /**
   * Get user study patterns for personalization
   */
  private async getUserStudyPatterns(userId: string): Promise<StudyPattern> {
    if (this.studyPatterns.has(userId)) {
      return this.studyPatterns.get(userId)!;
    }

    // Create default patterns for new users
    const defaultPatterns: StudyPattern = {
      userId,
      patterns: {
        questionTypes: {
          factual: 0.3,
          procedural: 0.25,
          conceptual: 0.2,
          analytical: 0.15,
          creative: 0.1
        },
        difficultyProgression: [0.5],
        subjectPreferences: {},
        timePatterns: {
          peakHours: [14, 15, 16, 19, 20], // 2-4pm, 7-8pm
          sessionLength: 20, // minutes
          breakFrequency: 0.3
        },
        webSearchUsage: {
          frequency: 0.2,
          topics: [],
          types: ['general']
        },
        learningVelocity: 1.0,
        retentionRate: 0.7
      },
      lastUpdated: new Date()
    };

    this.studyPatterns.set(userId, defaultPatterns);
    return defaultPatterns;
  }

  /**
   * Decide if web search is needed
   */
  private async decideWebSearchNeed(
    query: string,
    queryAnalysis: any,
    userPatterns: StudyPattern,
    preference: 'auto' | 'always' | 'never'
  ): Promise<{ needed: boolean; type: 'academic' | 'general' | 'news' | 'current' }> {
    
    if (preference === 'always') {
      return { needed: true, type: this.determineSearchType(query, queryAnalysis) };
    }
    
    if (preference === 'never') {
      return { needed: false, type: 'general' };
    }

    // Auto mode - intelligent decision making
    const reasons: string[] = [];
    
    // Check for current/recent information needs
    const timeKeywords = ['current', 'latest', 'recent', '2024', '2025', 'today', 'now'];
    const lowerQuery = query.toLowerCase();
    
    if (timeKeywords.some(keyword => lowerQuery.includes(keyword))) {
      reasons.push('Time-sensitive information requested');
      return { needed: true, type: 'current' };
    }

    // Check for academic/scientific queries
    if (queryAnalysis.requiresFacts || queryAnalysis.type === 'study') {
      reasons.push('Academic information needed');
      return { needed: true, type: 'academic' };
    }

    // Check user's web search patterns
    const userWebSearchPattern = this.webSearchPatterns.get(userPatterns.userId);
    if (userWebSearchPattern) {
      const queryTopic = this.extractTopic(query);
      if (userWebSearchPattern.topics.has(queryTopic)) {
        reasons.push('User frequently uses web search for this topic');
        return { needed: true, type: 'general' };
      }
    }

    // Check for complex queries that benefit from web search
    if (queryAnalysis.complexity >= 4 || queryAnalysis.estimatedResponseLength > 300) {
      reasons.push('Complex query benefits from web search');
      return { needed: true, type: 'general' };
    }

    return { needed: false, type: 'general' };
  }

  /**
   * Analyze personalization needs
   */
  private async analyzePersonalizationNeeds(
    query: string,
    sessionContext: PersonalizationQuery['sessionContext'],
    userPatterns: StudyPattern,
    queryAnalysis: any
  ): Promise<{
    type: 'personalized' | 'general' | 'hybrid';
    level: number;
    memoryRelevance: number;
    contextWeight: number;
  }> {
    
    const reasons: string[] = [];
    let personalizationScore = 0.0;
    let contextWeight = 0.0;

    // Check for personal pronouns
    if (/\b(my|our|me|I|my|our)\b/i.test(query)) {
      personalizationScore += 0.4;
      reasons.push('Personal reference detected');
    }

    // Check for performance/progress questions
    if (/\b(performance|progress|grade|score|improvement|weak|strong)\b/i.test(query)) {
      personalizationScore += 0.5;
      reasons.push('Performance-related question');
    }

    // Check session context
    if (sessionContext) {
      contextWeight = 0.3;
      if (sessionContext.topic && query.toLowerCase().includes(sessionContext.topic.toLowerCase())) {
        personalizationScore += 0.3;
        reasons.push('Topic continuation detected');
      }
      
      if (sessionContext.userPerformance) {
        personalizationScore += 0.2 * sessionContext.userPerformance.accuracy;
        reasons.push('User performance data available');
      }
    }

    // Check user's historical patterns
    if (userPatterns.patterns.questionTypes[queryAnalysis.type] > 0.3) {
      personalizationScore += 0.2;
      reasons.push('Frequent question type for user');
    }

    // Determine final type
    let type: 'personalized' | 'general' | 'hybrid';
    if (personalizationScore >= 0.6) {
      type = 'personalized';
    } else if (personalizationScore >= 0.3) {
      type = 'hybrid';
    } else {
      type = 'general';
    }

    return {
      type,
      level: Math.min(1.0, personalizationScore),
      memoryRelevance: Math.min(0.9, personalizationScore + 0.2),
      contextWeight
    };
  }

  /**
   * Determine teaching adaptation
   */
  private async determineTeachingAdaptation(
    query: string,
    sessionContext: PersonalizationQuery['sessionContext'],
    userPatterns: StudyPattern,
    personalizationAnalysis: any
  ): Promise<{
    depth: 'basic' | 'intermediate' | 'advanced';
    style: 'socratic' | 'direct' | 'interactive' | 'collaborative';
  }> {
    
    let depth: 'basic' | 'intermediate' | 'advanced' = 'intermediate';
    let style: 'socratic' | 'direct' | 'interactive' | 'collaborative' = 'collaborative';

    // Determine depth based on user performance
    if (sessionContext?.userPerformance) {
      const accuracy = sessionContext.userPerformance.accuracy;
      if (accuracy < 0.6) {
        depth = 'basic';
        style = 'direct';
      } else if (accuracy > 0.8) {
        depth = 'advanced';
        style = 'socratic';
      }
    }

    // Adjust based on user patterns
    if (userPatterns.patterns.learningVelocity > 1.2) {
      depth = 'advanced';
      style = 'socratic';
    } else if (userPatterns.patterns.learningVelocity < 0.8) {
      depth = 'basic';
      style = 'interactive';
    }

    // Check for learning objective indicators
    if (/\b(understand|grasp|comprehend)\b/i.test(query)) {
      style = 'socratic';
    } else if (/\b(how to|steps|procedure)\b/i.test(query)) {
      style = 'direct';
    }

    return { depth, style };
  }

  /**
   * Adapt teaching style to content
   */
  private async adaptTeachingStyle(
    content: string,
    style: 'socratic' | 'direct' | 'interactive' | 'collaborative',
    depth: 'basic' | 'intermediate' | 'advanced',
    sessionContext?: PersonalizationQuery['sessionContext']
  ): Promise<string> {
    
    let adaptedContent = content;

    // Add style-specific modifications
    switch (style) {
      case 'socratic':
        adaptedContent = this.addSocraticElements(adaptedContent);
        break;
      case 'interactive':
        adaptedContent = this.addInteractiveElements(adaptedContent);
        break;
      case 'collaborative':
        adaptedContent = this.addCollaborativeElements(adaptedContent);
        break;
    }

    // Adjust depth
    if (depth === 'basic') {
      adaptedContent = this.simplifyContent(adaptedContent);
    } else if (depth === 'advanced') {
      adaptedContent = this.addAdvancedElements(adaptedContent);
    }

    return adaptedContent;
  }

  /**
   * Initialize user patterns
   */
  private async initializePatterns(): Promise<void> {
    // This would typically load patterns from database
    // For now, we'll start with empty patterns
    logInfo('Personalization patterns initialized', {
      componentName: 'AdvancedPersonalizationEngine'
    });
  }

  // Helper methods
  private calculateOverallConfidence(queryAnalysis: any, personalizationAnalysis: any, webSearchDecision: any): number {
    const weights = {
      query: 0.4,
      personalization: 0.3,
      webSearch: 0.3
    };

    return (
      queryAnalysis.confidence * weights.query +
      personalizationAnalysis.level * weights.personalization +
      (webSearchDecision.needed ? 0.8 : 0.6) * weights.webSearch
    );
  }

  private generateReasoning(queryAnalysis: any, personalizationAnalysis: any, webSearchDecision: any): string[] {
    const reasons: string[] = [];
    
    reasons.push(`Query type: ${queryAnalysis.type} (confidence: ${Math.round(queryAnalysis.confidence * 100)}%)`);
    reasons.push(`Personalization level: ${Math.round(personalizationAnalysis.level * 100)}%`);
    
    if (webSearchDecision.needed) {
      reasons.push(`Web search needed: ${webSearchDecision.type}`);
    }
    
    reasons.push(`Teaching style: ${personalizationAnalysis.type}`);
    
    return reasons;
  }

  private determineSearchType(query: string, queryAnalysis: any): 'academic' | 'general' | 'news' | 'current' {
    if (queryAnalysis.type === 'study' || queryAnalysis.requiresFacts) {
      return 'academic';
    }
    
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('news') || lowerQuery.includes('current') || lowerQuery.includes('recent')) {
      return 'news';
    }
    
    return 'general';
  }

  private extractTopic(query: string): string {
    // Simple topic extraction - in a real implementation, this would be more sophisticated
    const topics = ['mathematics', 'physics', 'chemistry', 'biology', 'history', 'literature', 'programming'];
    const lowerQuery = query.toLowerCase();
    
    for (const topic of topics) {
      if (lowerQuery.includes(topic)) {
        return topic;
      }
    }
    
    return 'general';
  }

  private calculateContentComplexity(content: string): number {
    // Simple complexity calculation based on length, technical terms, etc.
    const words = content.split(' ').length;
    const technicalTerms = (content.match(/\b[A-Z]{2,}\b/g) || []).length;
    const sentences = content.split(/[.!?]+/).length;
    
    return Math.min(1.0, (words / 100 + technicalTerms / 10 + sentences / 5) / 3);
  }

  private identifyFeedbackLoops(content: string): string[] {
    const feedbackIndicators = [
      'Does this make sense?',
      'Can you try this?',
      'What do you think?',
      'Let me know if you\'d like more examples',
      'Would you like me to explain this differently?'
    ];
    
    return feedbackIndicators.filter(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase().split('?')[0])
    );
  }

  private addSocraticElements(content: string): string {
    return content.replace(/^(.*?)\./, '$1. What do you think about this?');
  }

  private addInteractiveElements(content: string): string {
    return content + '\n\nTry applying this concept to a problem you\'re working on!';
  }

  private addCollaborativeElements(content: string): string {
    return content + '\n\nLet\'s work through this together step by step.';
  }

  private simplifyContent(content: string): string {
    return content
      .replace(/\b(however|furthermore|moreover|consequently)\b/gi, 'but')
      .replace(/\b(demonstrate|illustrate|elucidate)\b/gi, 'show')
      .replace(/\b(sophisticated|complex|intricate)\b/gi, 'detailed');
  }

  private addAdvancedElements(content: string): string {
    return content.replace(/\b(show|explain|describe)\b/gi, 'analyze and $1 in detail');
  }
}

// Export singleton instance
export const advancedPersonalizationEngine = new AdvancedPersonalizationEngine();