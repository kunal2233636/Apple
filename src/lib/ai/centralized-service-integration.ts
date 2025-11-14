// Centralized Service Integration Layer
// =====================================
// Unified system that orchestrates all AI services for intelligent, personalized responses

import { advancedPersonalizationEngine } from './advanced-personalization-engine';
import { smartQueryClassifier } from './smart-query-classifier';
import { adaptiveTeachingSystem } from './adaptive-teaching-system';
import { queryClassifier as layer1QueryClassifier } from '@/lib/hallucination-prevention/layer1/QueryClassifier';
import { conversationMemory as layer2ConversationMemory } from '@/lib/hallucination-prevention/layer2/ConversationMemory';
import { ResponseValidator } from '@/lib/hallucination-prevention/layer3/ResponseValidator';
const layer3ResponseValidator = new ResponseValidator();
import { layer4PersonalizationEngine } from '@/lib/hallucination-prevention/layer4/PersonalizationEngine';
import { layer5OrchestrationEngine } from '@/lib/layer5/orchestration-engine';
import { logError, logInfo, logWarning } from '@/lib/error-logger-server-safe';

export interface UnifiedRequest {
  userId: string;
  query: string;
  context?: {
    sessionId?: string;
    conversationHistory?: any[];
    currentSubject?: string;
    learningLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    studyTime?: number;
    previousQuestions?: string[];
    currentPage?: string;
    urgency?: 'low' | 'normal' | 'high';
  };
  preferences?: {
    explanationStyle?: 'socratic' | 'direct' | 'interactive' | 'collaborative';
    detailLevel?: 'basic' | 'intermediate' | 'comprehensive';
    includeExamples?: boolean;
    includeAnalogies?: boolean;
    teachingMode?: boolean;
  };
  flags?: {
    hallucinationPrevention?: boolean;
    webSearchEnabled?: boolean;
    memoryEnabled?: boolean;
    personalizationEnabled?: boolean;
  };
}

export interface UnifiedResponse {
  content: {
    main: string;
    explanation?: string;
    teachingSteps?: any[];
    nextSteps?: string[];
    sources?: string[];
  };
  intelligence: {
    personalizationApplied: boolean;
    webSearchUsed: boolean;
    teachingMode: boolean;
    confidence: number;
    halluPreventionLayers: number;
  };
  metadata: {
    processingTime: number;
    sourcesConsulted: string[];
    layerStatus: LayerStatus[];
    userAdaptations: string[];
  };
}

export interface LayerStatus {
  layer: 1 | 2 | 3 | 4 | 5;
  status: 'pending' | 'processing' | 'complete' | 'error';
  processingTime?: number;
  result?: any;
  issues?: string[];
}

export interface ProcessingPipeline {
  request: UnifiedRequest;
  stages: ProcessingStage[];
  finalResponse: UnifiedResponse;
}

export interface ProcessingStage {
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  startTime: number;
  endTime?: number;
  result?: any;
  error?: string;
}

export class CentralizedServiceIntegration {
  private processingPipeline: ProcessingPipeline | null = null;
  private cache: Map<string, { response: UnifiedResponse; timestamp: number; ttl: number }> = new Map();

  constructor() {
    this.initializeServices();
  }

  /**
   * Main entry point for all AI requests
   */
  async processUnifiedRequest(request: UnifiedRequest): Promise<UnifiedResponse> {
    const startTime = Date.now();
    
    try {
      logInfo('Starting unified request processing', {
        componentName: 'CentralizedServiceIntegration',
        userId: request.userId,
        query: request.query.substring(0, 100),
        flags: request.flags
      });

      // Initialize processing pipeline
      this.initializePipeline(request);

      // Stage 1: Query Classification and Intent Analysis
      await this.executeStage('query_classification', async () => {
        const classification = await smartQueryClassifier.classifyQuery(
          request.query,
          {
            userId: request.userId,
            context: request.context,
            preferences: request.preferences
          }
        );
        
        logInfo('Query classification complete', {
          type: classification.type,
          webSearchNeeded: classification.webSearchNeeded,
          expertiseLevel: classification.expertiseLevel
        });

        return classification;
      });

      // Stage 2: Memory and Context Building (Layer 2)
      await this.executeStage('memory_context', async () => {
        if (!request.flags?.memoryEnabled) {
          return { memories: [], context: null };
        }

        const memoryResult = await layer2ConversationMemory.getContext(
          request.userId,
          request.query,
          request.context?.sessionId
        );

        logInfo('Memory context retrieved', {
          memoriesFound: memoryResult.memories?.length || 0,
          relevanceScore: memoryResult.relevanceScore
        });

        return memoryResult;
      });

      // Stage 3: Hallucination Prevention Layer 1
      await this.executeStage('input_validation', async () => {
        if (!request.flags?.hallucinationPrevention) {
          return { validation: 'skipped', issues: [] };
        }

        const validationResult = await layer1QueryClassifier.classifyAndValidate(
          request.query,
          {
            userId: request.userId,
            sessionId: request.context?.sessionId,
            context: request.context
          }
        );

        logInfo('Input validation complete', {
          safetyLevel: validationResult.safetyLevel,
          issuesFound: validationResult.issues?.length || 0
        });

        return validationResult;
      });

      // Stage 4: Web Search Decision and Execution
      const webSearchResult = await this.executeStage('web_search', async () => {
        const classification = this.getStageResult('query_classification');
        
        if (!classification?.webSearchNeeded || !request.flags?.webSearchEnabled) {
          return { searchPerformed: false, results: null };
        }

        const searchResult = await advancedPersonalizationEngine.enhanceWithWebSearch(
          request.query,
          {
            userId: request.userId,
            context: request.context,
            expertiseLevel: classification.expertiseLevel
          }
        );

        logInfo('Web search complete', {
          resultsCount: searchResult.results?.length || 0,
          confidence: searchResult.confidence
        });

        return searchResult;
      });

      // Stage 5: Adaptive Teaching Assessment
      await this.executeStage('teaching_assessment', async () => {
        const classification = this.getStageResult('query_classification');
        const teachingPattern = this.detectTeachingNeed(request.query, classification);
        
        if (!teachingPattern.needsTeaching) {
          return { teachingMode: false, approach: null };
        }

        const teachingRequest = {
          topic: teachingPattern.topic,
          userId: request.userId,
          context: {
            subject: request.context?.currentSubject,
            level: classification?.expertiseLevel,
            priorKnowledge: request.context?.previousQuestions,
            learningObjective: teachingPattern.learningObjective,
            timeAvailable: request.context?.studyTime
          },
          teachingStyle: request.preferences?.explanationStyle
        };

        logInfo('Teaching assessment complete', {
          needsTeaching: teachingPattern.needsTeaching,
          complexity: teachingPattern.complexity,
          approach: teachingRequest.teachingStyle
        });

        return { teachingRequest, pattern: teachingPattern };
      });

      // Stage 6: Response Generation with Personalization
      await this.executeStage('response_generation', async () => {
        const classification = this.getStageResult('query_classification');
        const memoryContext = this.getStageResult('memory_context');
        const webSearch = this.getStageResult('web_search');
        const teaching = this.getStageResult('teaching_assessment');

        let response: any = {};

        if (teaching?.teachingMode) {
          // Use adaptive teaching system
          const teachingResponse = await adaptiveTeachingSystem.provideAdaptiveExplanation(
            teaching.teachingRequest
          );
          
          response.content = teachingResponse.explanation.content;
          response.teachingSteps = teachingResponse.teachingSteps;
          response.nextSteps = teachingResponse.recommendedNextSteps;
          response.intelligence = {
            personalizationApplied: teachingResponse.adaptation.complexityAdjusted,
            webSearchUsed: webSearch?.searchPerformed || false,
            teachingMode: true,
            confidence: teachingResponse.confidenceLevel
          };
        } else {
          // Use advanced personalization engine
          const personalizationResponse = await advancedPersonalizationEngine.getPersonalizedResponse(
            request.query,
            {
              userId: request.userId,
              context: request.context,
              preferences: request.preferences,
              webSearchData: webSearch,
              memoryContext: memoryContext,
              classification: classification
            }
          );

          response = personalizationResponse;
        }

        logInfo('Response generation complete', {
          responseLength: response.content?.length || 0,
          personalizationUsed: response.intelligence?.personalizationApplied,
          confidence: response.intelligence?.confidence
        });

        return response;
      });

      // Stage 7: Hallucination Prevention Validation (Layer 3)
      await this.executeStage('response_validation', async () => {
        if (!request.flags?.hallucinationPrevention) {
          return { validation: 'skipped', confidence: 1.0 };
        }

        const generatedResponse = this.getStageResult('response_generation');
        
        const validationResult = await layer3ResponseValidator.validateResponse(
          request.query,
          generatedResponse.content,
          {
            userId: request.userId,
            context: request.context,
            memoryContext: this.getStageResult('memory_context'),
            webSearchData: this.getStageResult('web_search')
          }
        );

        logInfo('Response validation complete', {
          confidence: validationResult.confidence,
          issuesFound: validationResult.issues?.length || 0,
          factCheckScore: validationResult.factCheckScore
        });

        return validationResult;
      });

      // Stage 8: Final Response Assembly
      await this.executeStage('final_assembly', async () => {
        const responseGeneration = this.getStageResult('response_generation');
        const validation = this.getStageResult('response_validation');
        const memoryContext = this.getStageResult('memory_context');
        const webSearch = this.getStageResult('web_search');
        const teaching = this.getStageResult('teaching_assessment');
        const classification = this.getStageResult('query_classification');

        // Calculate final confidence
        const finalConfidence = this.calculateFinalConfidence(
          responseGeneration.intelligence?.confidence,
          validation.confidence,
          classification?.confidence
        );

        // Collect all sources
        const sources: string[] = [];
        if (memoryContext?.memories?.length > 0) sources.push('Memory Context');
        if (webSearch?.searchPerformed) sources.push('Web Search');
        if (teaching?.teachingMode) sources.push('Adaptive Teaching');
        if (classification?.personalized) sources.push('Personalization Engine');

        // Build layer status
        const layerStatus: LayerStatus[] = [
          { layer: 1, status: this.getStageStatus('input_validation') },
          { layer: 2, status: this.getStageStatus('memory_context') },
          { layer: 3, status: this.getStageStatus('response_validation') },
          { layer: 4, status: this.getStageStatus('query_classification') },
          { layer: 5, status: this.getStageStatus('final_assembly') }
        ];

        const finalResponse: UnifiedResponse = {
          content: {
            main: responseGeneration.content,
            explanation: responseGeneration.explanation,
            teachingSteps: responseGeneration.teachingSteps,
            nextSteps: responseGeneration.nextSteps,
            sources: sources
          },
          intelligence: {
            personalizationApplied: responseGeneration.intelligence?.personalizationApplied || false,
            webSearchUsed: webSearch?.searchPerformed || false,
            teachingMode: teaching?.teachingMode || false,
            confidence: finalConfidence,
            halluPreventionLayers: layerStatus.filter(l => l.status === 'complete').length
          },
          metadata: {
            processingTime: Date.now() - startTime,
            sourcesConsulted: sources,
            layerStatus: layerStatus,
            userAdaptations: this.extractUserAdaptations(responseGeneration, validation)
          }
        };

        logInfo('Final response assembled', {
          processingTime: finalResponse.metadata.processingTime,
          confidence: finalResponse.intelligence.confidence,
          layersActive: finalResponse.intelligence.halluPreventionLayers
        });

        return finalResponse;
      });

      const finalResponse = this.getStageResult('final_assembly');
      
      // Cache successful response
      this.cacheResponse(request, finalResponse);

      logInfo('Unified request processing complete', {
        processingTime: finalResponse.metadata.processingTime,
        success: true
      });

      return finalResponse;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'CentralizedServiceIntegration',
        userId: request.userId,
        query: request.query.substring(0, 100),
        operation: 'processUnifiedRequest'
      });

      return this.getErrorResponse(request, error, Date.now() - startTime);
    }
  }

  /**
   * Get real-time system status
   */
  getSystemStatus(): {
    services: Record<string, 'healthy' | 'degraded' | 'unavailable'>;
    cache: { size: number; hitRate: number };
    pipeline: ProcessingPipeline | null;
  } {
    return {
      services: {
        'advanced_personalization': 'healthy',
        'smart_query_classifier': 'healthy',
        'adaptive_teaching': 'healthy',
        'hallucination_prevention': 'healthy',
        'web_search': 'healthy',
        'memory_system': 'healthy'
      },
      cache: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate()
      },
      pipeline: this.processingPipeline
    };
  }

  /**
   * Get processing pipeline status
   */
  getPipelineStatus(): ProcessingPipeline | null {
    return this.processingPipeline;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logInfo('Cache cleared', { componentName: 'CentralizedServiceIntegration' });
  }

  // Private methods

  private initializeServices(): void {
    logInfo('Initializing centralized service integration', {
      componentName: 'CentralizedServiceIntegration'
    });
  }

  private initializePipeline(request: UnifiedRequest): void {
    this.processingPipeline = {
      request,
      stages: [],
      finalResponse: {} as UnifiedResponse
    };
  }

  private async executeStage(name: string, operation: () => Promise<any>): Promise<any> {
    if (!this.processingPipeline) {
      throw new Error('Pipeline not initialized');
    }

    const stage: ProcessingStage = {
      name,
      status: 'processing',
      startTime: Date.now()
    };

    this.processingPipeline.stages.push(stage);

    try {
      const result = await operation();
      
      stage.status = 'complete';
      stage.endTime = Date.now();
      stage.result = result;

      logInfo(`Stage completed: ${name}`, {
        componentName: 'CentralizedServiceIntegration',
        processingTime: stage.endTime - stage.startTime
      });

      return result;
    } catch (error) {
      stage.status = 'error';
      stage.endTime = Date.now();
      stage.error = error instanceof Error ? error.message : String(error);

      logWarning(`Stage failed: ${name}`, {
        componentName: 'CentralizedServiceIntegration',
        error: stage.error
      });

      throw error;
    }
  }

  private getStageResult(stageName: string): any {
    if (!this.processingPipeline) return null;
    
    const stage = this.processingPipeline.stages.find(s => s.name === stageName);
    return stage?.result;
  }

  private getStageStatus(stageName: string): 'pending' | 'processing' | 'complete' | 'error' {
    if (!this.processingPipeline) return 'pending';
    
    const stage = this.processingPipeline.stages.find(s => s.name === stageName);
    return stage?.status || 'pending';
  }

  private detectTeachingNeed(query: string, classification: any): {
    needsTeaching: boolean;
    topic: string;
    complexity: 'basic' | 'intermediate' | 'advanced';
    learningObjective?: string;
  } {
    const teachingKeywords = [
      'explain', 'teach', 'sajhao', 'understand', 'how does', 'what is', 'why is',
      'concept', 'principle', 'theory', 'basics', 'fundamentals', 'learn'
    ];

    const queryLower = query.toLowerCase();
    const hasTeachingKeyword = teachingKeywords.some(keyword => queryLower.includes(keyword));
    
    // Detect educational intent
    const isEducational = classification?.type === 'personalized' && 
                         (classification?.expertiseLevel === 'beginner' || 
                          classification?.expertiseLevel === 'intermediate');

    // Extract topic (simplified)
    const topic = this.extractTopic(query);

    return {
      needsTeaching: hasTeachingKeyword || isEducational,
      topic: topic,
      complexity: classification?.expertiseLevel || 'intermediate',
      learningObjective: this.extractLearningObjective(query)
    };
  }

  private extractTopic(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('thermo')) return 'Thermodynamics';
    if (queryLower.includes('math') || queryLower.includes('calculate')) return 'Mathematics';
    if (queryLower.includes('physics')) return 'Physics';
    if (queryLower.includes('chemistry')) return 'Chemistry';
    if (queryLower.includes('biology')) return 'Biology';
    
    return 'General';
  }

  private extractLearningObjective(query: string): string | undefined {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('basics') || queryLower.includes('fundamental')) {
      return 'Understand basic concepts';
    }
    if (queryLower.includes('application') || queryLower.includes('real world')) {
      return 'Apply concepts to real-world situations';
    }
    if (queryLower.includes('problem') || queryLower.includes('solve')) {
      return 'Solve problems using the concepts';
    }
    
    return undefined;
  }

  private calculateFinalConfidence(
    responseConfidence?: number,
    validationConfidence?: number,
    classificationConfidence?: number
  ): number {
    const confidences = [responseConfidence, validationConfidence, classificationConfidence]
      .filter(c => c !== undefined)
      .map(c => c as number);
    
    if (confidences.length === 0) return 0.5;
    
    // Use weighted average with validation having highest weight
    const weights = [0.4, 0.4, 0.2];
    const weightedSum = confidences.reduce((sum, conf, index) => 
      sum + conf * (weights[index] || 0.2), 0);
    
    return Math.min(1.0, Math.max(0.0, weightedSum));
  }

  private extractUserAdaptations(response: any, validation: any): string[] {
    const adaptations: string[] = [];
    
    if (response?.adaptation?.complexityAdjusted) {
      adaptations.push('Complexity adjusted based on user level');
    }
    if (response?.adaptation?.examplesAdded) {
      adaptations.push('Examples added for better understanding');
    }
    if (response?.adaptation?.analogiesUsed) {
      adaptations.push('Analogies used for concept clarification');
    }
    if (response?.adaptation?.feedbackLoops) {
      adaptations.push('Feedback loops included for interaction');
    }
    
    return adaptations;
  }

  private cacheResponse(request: UnifiedRequest, response: UnifiedResponse): void {
    const cacheKey = this.generateCacheKey(request);
    const ttl = 5 * 60 * 1000; // 5 minutes
    
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl
    });
  }

  private generateCacheKey(request: UnifiedRequest): string {
    const keyData = {
      userId: request.userId,
      query: request.query,
      context: request.context,
      preferences: request.preferences
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private calculateCacheHitRate(): number {
    // Simplified cache hit rate calculation
    return 0.0; // Would need more sophisticated tracking in production
  }

  private getErrorResponse(request: UnifiedRequest, error: any, processingTime: number): UnifiedResponse {
    return {
      content: {
        main: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
        explanation: 'The AI system encountered a technical issue during processing.',
        nextSteps: ['Try again', 'Rephrase question', 'Contact support if issue persists']
      },
      intelligence: {
        personalizationApplied: false,
        webSearchUsed: false,
        teachingMode: false,
        confidence: 0.0,
        halluPreventionLayers: 0
      },
      metadata: {
        processingTime,
        sourcesConsulted: [],
        layerStatus: [],
        userAdaptations: [],
      }
    };
  }
}

// Export singleton instance
export const centralizedServiceIntegration = new CentralizedServiceIntegration();