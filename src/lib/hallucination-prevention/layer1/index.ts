// Layer 1: Input Validation & Preprocessing System - Main Exports
// =================================================================

// Core component exports
export { InputValidator, inputValidator } from './InputValidator';
export { QueryClassifier, queryClassifier } from './QueryClassifier';
export { PromptEngineer, promptEngineer } from './PromptEngineer';

// Type exports
export type { ValidationLevel, ValidationResult, FilterResult, SafetyResult, InjectionRisk, ValidationMetadata } from './InputValidator';
export type { QueryType, ResponseStrategy, ComplexityLevel, ContextRequirementLevel, QueryClassification, FactualQuery, StudyQuery, ComplexityScore, ContextRequirementData, ResponseStrategyConfig, QualityCriteria } from './QueryClassifier';
export type { PromptType, ResponseFormat, OptimizedPrompt, PromptConstraint, Source, ValidationRequirement, SafetyGuideline, ContextIntegration, UserContextData, ConversationContextData, KnowledgeContextData, ExternalContextData, QualityMarker, PromptConstructionOptions } from './PromptEngineer';

// Unified Layer 1 Service
import { inputValidator, ValidationLevel, type ValidationResult } from './InputValidator';
import { queryClassifier, type QueryClassification } from './QueryClassifier';
import { promptEngineer, type OptimizedPrompt, type PromptConstructionOptions } from './PromptEngineer';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import type { AppDataContext } from '@/types/ai-service-manager';

export interface Layer1ProcessingRequest {
  userId: string;
  sessionId?: string;
  message: string;
  conversationId?: string;
  chatType?: 'general' | 'study_assistant';
  validationLevel?: ValidationLevel;
  includeAppData?: boolean;
  contextData?: Partial<AppDataContext>;
  options?: PromptConstructionOptions;
  metadata?: Record<string, any>;
}

export interface Layer1ProcessingResult {
  isValid: boolean;
  validationResult: ValidationResult;
  classification: QueryClassification;
  optimizedPrompt: OptimizedPrompt;
  processingTime: number;
  recommendations: string[];
  warnings: string[];
  metadata: {
    requestId: string;
    timestamp: string;
    validationLevel: ValidationLevel;
    processingStages: ProcessingStage[];
  };
}

export interface ProcessingStage {
  stage: 'validation' | 'classification' | 'prompt_construction';
  status: 'completed' | 'failed' | 'skipped';
  duration: number;
  details?: string;
  error?: string;
}

export interface Layer1Configuration {
  validationLevel: ValidationLevel;
  enablePromptEngineering: boolean;
  enableContextIntegration: boolean;
  enableLogging: boolean;
  enableMonitoring: boolean;
  maxProcessingTime: number; // in milliseconds
  strictMode: boolean;
  fallbackEnabled: boolean;
}

export interface Layer1Metrics {
  totalRequests: number;
  validRequests: number;
  invalidRequests: number;
  averageProcessingTime: number;
  validationFailures: number;
  classificationAccuracy: number;
  errorRate: number;
  stageDurations: {
    validation: number[];
    classification: number[];
    promptConstruction: number[];
  };
}

export class Layer1Service {
  private configuration: Layer1Configuration;
  private metrics: Layer1Metrics;
  private requestIdCounter: number = 0;
  private cryptoKey: string;

  constructor(config?: Partial<Layer1Configuration>) {
    this.configuration = {
      validationLevel: 'strict',
      enablePromptEngineering: true,
      enableContextIntegration: true,
      enableLogging: true,
      enableMonitoring: true,
      maxProcessingTime: 5000, // 5 seconds
      strictMode: false,
      fallbackEnabled: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.cryptoKey = process.env.LAYER1_ENCRYPTION_KEY || 'default-layer1-key';
  }

  /**
   * Main processing method - orchestrates all Layer 1 components
   */
  async processInput(request: Layer1ProcessingRequest): Promise<Layer1ProcessingResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const processingStages: ProcessingStage[] = [];
    
    try {
      logInfo('Layer 1 processing started', {
        componentName: 'Layer1Service',
        requestId,
        userId: request.userId,
        messageLength: request.message.length,
        validationLevel: request.validationLevel || this.configuration.validationLevel
      });

      // Step 1: Input Validation
      const validationStage = await this.executeStage('validation', async () => {
        const validationMetadata = {
          userId: request.userId,
          sessionId: request.sessionId,
          validationLevel: request.validationLevel || this.configuration.validationLevel,
          timestamp: new Date().toISOString(),
          sourceIp: request.metadata?.sourceIp,
          userAgent: request.metadata?.userAgent
        };

        return await inputValidator.validateInput(
          request.message,
          validationMetadata,
          request.validationLevel || this.configuration.validationLevel
        );
      });

      processingStages.push(validationStage);

      if (!validationStage.details && !validationStage.error) {
        // If validation failed, return early with error information
        const result = this.createErrorResult(request, validationStage, requestId);
        this.updateMetrics(result, Date.now() - startTime, false);
        return result;
      }

      // Step 2: Query Classification
      const classificationStage = await this.executeStage('classification', async () => {
        return await queryClassifier.classifyQuery(
          request.message,
          request.userId,
          request.metadata?.conversationHistory
        );
      });

      processingStages.push(classificationStage);

      if (!classificationStage.details && !classificationStage.error) {
        const result = this.createErrorResult(request, classificationStage, requestId);
        this.updateMetrics(result, Date.now() - startTime, false);
        return result;
      }

      // Step 3: Prompt Engineering
      let optimizedPrompt: OptimizedPrompt;
      const promptStage = await this.executeStage('prompt_construction', async () => {
        if (!this.configuration.enablePromptEngineering) {
          return this.createDefaultOptimizedPrompt(request.message, classificationStage.details!);
        }

        return await promptEngineer.constructPrompt(
          request.message,
          classificationStage.details!,
          request.contextData,
          request.options
        );
      });

      processingStages.push(promptStage);

      if (!promptStage.details && !promptStage.error) {
        const result = this.createErrorResult(request, promptStage, requestId);
        this.updateMetrics(result, Date.now() - startTime, false);
        return result;
      }

      optimizedPrompt = promptStage.details!;

      // Generate recommendations and warnings
      const recommendations = this.generateRecommendations(
        validationStage.details!,
        classificationStage.details!,
        optimizedPrompt
      );
      
      const warnings = this.generateWarnings(
        validationStage.details!,
        classificationStage.details!
      );

      const processingTime = Date.now() - startTime;
      
      const result: Layer1ProcessingResult = {
        isValid: validationStage.details!.isValid,
        validationResult: validationStage.details!,
        classification: classificationStage.details!,
        optimizedPrompt,
        processingTime,
        recommendations,
        warnings,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          validationLevel: request.validationLevel || this.configuration.validationLevel,
          processingStages
        }
      };

      // Update metrics
      this.updateMetrics(result, processingTime, true);

      logInfo('Layer 1 processing completed successfully', {
        componentName: 'Layer1Service',
        requestId,
        isValid: result.isValid,
        processingTime,
        classificationType: result.classification.type,
        complexity: result.classification.complexity
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorResult = this.createErrorResult(request, {
        stage: 'validation',
        status: 'failed',
        duration: processingTime,
        error: error instanceof Error ? error.message : String(error)
      }, requestId);

      this.updateMetrics(errorResult, processingTime, false);

      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer1Service',
        requestId,
        processingTime,
        userId: request.userId
      });

      return errorResult;
    }
  }

  /**
   * Quick validation only - for fast pre-checks
   */
  async validateInputOnly(
    message: string,
    userId: string,
    validationLevel: ValidationLevel = 'basic'
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const validationMetadata = {
        userId,
        validationLevel,
        timestamp: new Date().toISOString()
      };

      const result = await inputValidator.validateInput(message, validationMetadata, validationLevel);

      logInfo('Quick validation completed', {
        componentName: 'Layer1Service',
        requestId,
        userId,
        isValid: result.isValid,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer1Service',
        requestId,
        userId,
        processingTime: Date.now() - startTime
      });

      // Return safe default on error
      return {
        isValid: false,
        inputHash: this.generateInputHash(message),
        filteredInput: '',
        filterResult: {
          isClean: false,
          filteredText: '',
          reasons: ['Validation error occurred'],
          confidence: 0,
          actions: []
        },
        safetyResult: {
          isSafe: false,
          riskLevel: 'high',
          categories: [],
          action: 'block',
          confidence: 1.0
        },
        injectionRisk: {
          detected: true,
          riskLevel: 'critical',
          patterns: [],
          confidence: 1.0
        },
        processingTime: Date.now() - startTime,
        validationLevel,
        metadata: {
          userId,
          validationLevel,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Classify query only - for analysis and routing
   */
  async classifyQueryOnly(
    message: string,
    userId?: string
  ): Promise<QueryClassification> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await queryClassifier.classifyQuery(message, userId);

      logInfo('Query classification completed', {
        componentName: 'Layer1Service',
        requestId,
        userId,
        queryType: result.type,
        complexity: result.complexity,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer1Service',
        requestId,
        userId,
        processingTime: Date.now() - startTime
      });

      // Return safe default classification
      return {
        type: 'general',
        intent: 'general inquiry',
        confidence: 0.0,
        complexity: 3,
        requiresFacts: false,
        requiresContext: false,
        responseStrategy: 'direct',
        safetyLevel: 'safe',
        keywords: [],
        reasons: ['Classification error occurred'],
        contextRequirement: 'minimal',
        estimatedResponseLength: 100
      };
    }
  }

  /**
   * Construct prompt only - for advanced prompt engineering
   */
  async constructPromptOnly(
    message: string,
    classification: QueryClassification,
    contextData?: Partial<AppDataContext>,
    options?: PromptConstructionOptions
  ): Promise<OptimizedPrompt> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const result = await promptEngineer.constructPrompt(message, classification, contextData, options);

      logInfo('Prompt construction completed', {
        componentName: 'Layer1Service',
        requestId,
        queryType: classification.type,
        processingTime: Date.now() - startTime,
        constraintsCount: result.constraints.length
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer1Service',
        requestId,
        processingTime: Date.now() - startTime
      });

      // Return safe default prompt
      return {
        systemPrompt: 'You are a helpful AI assistant. Provide accurate, helpful responses.',
        userPrompt: `Question: ${message}`,
        constraints: [],
        sources: [],
        expectedFormat: 'plain_text',
        validationRequirements: [],
        safetyGuidelines: [],
        contextIntegration: {
          userContext: {
            profile: { id: 'default', academicLevel: 'high_school', subjects: [], strengths: [], weaknesses: [], studyGoals: [] },
            preferences: { responseFormat: 'plain_text', detailLevel: 'detailed', explanationStyle: 'simple', feedbackPreference: 'immediate' },
            history: { totalInteractions: 0, recentTopics: [], commonQuestions: [], performanceMetrics: {}, feedbackScores: [] },
            learningStyle: { visual: 0.5, auditory: 0.5, kinesthetic: 0.5, reading: 0.5 }
          },
          conversationContext: { currentTopic: '', previousMessages: [], conversationGoal: '', sessionDuration: 0, topicProgression: [] },
          knowledgeContext: { relevantFacts: [], concepts: [], sources: [], verified: true, lastUpdated: new Date() },
          externalContext: { currentTime: new Date(), systemStatus: 'operational', availableFeatures: ['chat'] }
        },
        qualityMarkers: []
      };
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Layer1Metrics {
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
  updateConfiguration(config: Partial<Layer1Configuration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): Layer1Configuration {
    return { ...this.configuration };
  }

  // Private helper methods

  private async executeStage<T>(
    stage: ProcessingStage['stage'],
    operation: () => Promise<T>
  ): Promise<ProcessingStage & { details?: T; error?: string }> {
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
    request: Layer1ProcessingRequest,
    failedStage: ProcessingStage,
    requestId: string
  ): Layer1ProcessingResult {
    return {
      isValid: false,
      validationResult: {
        isValid: false,
        inputHash: this.generateInputHash(request.message),
        filteredInput: '',
        filterResult: {
          isClean: false,
          filteredText: '',
          reasons: [failedStage.error || 'Processing failed'],
          confidence: 0,
          actions: []
        },
        safetyResult: {
          isSafe: false,
          riskLevel: 'high',
          categories: [],
          action: 'block',
          confidence: 1.0
        },
        injectionRisk: {
          detected: true,
          riskLevel: 'critical',
          patterns: [],
          confidence: 1.0
        },
        processingTime: failedStage.duration,
        validationLevel: request.validationLevel || this.configuration.validationLevel,
        metadata: {
          userId: request.userId,
          sessionId: request.sessionId,
          validationLevel: request.validationLevel || this.configuration.validationLevel,
          timestamp: new Date().toISOString()
        }
      },
      classification: {
        type: 'general',
        intent: 'general inquiry',
        confidence: 0.0,
        complexity: 3,
        requiresFacts: false,
        requiresContext: false,
        responseStrategy: 'direct',
        safetyLevel: 'safe',
        keywords: [],
        reasons: [failedStage.error || 'Classification failed'],
        contextRequirement: 'minimal',
        estimatedResponseLength: 100
      },
      optimizedPrompt: {
        systemPrompt: 'You are a helpful AI assistant. Provide accurate, helpful responses.',
        userPrompt: `Question: ${request.message}`,
        constraints: [],
        sources: [],
        expectedFormat: 'plain_text',
        validationRequirements: [],
        safetyGuidelines: [],
        contextIntegration: {
          userContext: {
            profile: { id: 'default', academicLevel: 'high_school', subjects: [], strengths: [], weaknesses: [], studyGoals: [] },
            preferences: { responseFormat: 'plain_text', detailLevel: 'detailed', explanationStyle: 'simple', feedbackPreference: 'immediate' },
            history: { totalInteractions: 0, recentTopics: [], commonQuestions: [], performanceMetrics: {}, feedbackScores: [] },
            learningStyle: { visual: 0.5, auditory: 0.5, kinesthetic: 0.5, reading: 0.5 }
          },
          conversationContext: { currentTopic: '', previousMessages: [], conversationGoal: '', sessionDuration: 0, topicProgression: [] },
          knowledgeContext: { relevantFacts: [], concepts: [], sources: [], verified: true, lastUpdated: new Date() },
          externalContext: { currentTime: new Date(), systemStatus: 'operational', availableFeatures: ['chat'] }
        },
        qualityMarkers: []
      },
      processingTime: failedStage.duration,
      recommendations: ['Please try again or contact support if the issue persists.'],
      warnings: [`Processing failed at ${failedStage.stage} stage: ${failedStage.error}`],
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        validationLevel: request.validationLevel || this.configuration.validationLevel,
        processingStages: [failedStage]
      }
    };
  }

  private generateRecommendations(
    validationResult: ValidationResult,
    classification: QueryClassification,
    optimizedPrompt: OptimizedPrompt
  ): string[] {
    const recommendations: string[] = [];

    // Validation-based recommendations
    if (validationResult.filterResult.confidence < 0.8) {
      recommendations.push('Consider providing more context for better understanding.');
    }

    // Classification-based recommendations
    if (classification.requiresFacts) {
      recommendations.push('This query requires factual accuracy. Sources will be verified.');
    }

    if (classification.complexity >= 4) {
      recommendations.push('This is a complex query that may require additional processing time.');
    }

    // Prompt-based recommendations
    if (optimizedPrompt.constraints.length > 3) {
      recommendations.push('Multiple constraints detected. Consider simplifying the query if responses are too constrained.');
    }

    return recommendations;
  }

  private generateWarnings(
    validationResult: ValidationResult,
    classification: QueryClassification
  ): string[] {
    const warnings: string[] = [];

    // Validation warnings
    if (!validationResult.safetyResult.isSafe) {
      warnings.push('Content safety concerns detected. Response may be limited.');
    }

    if (validationResult.injectionRisk.detected) {
      warnings.push('Potential prompt injection patterns detected. Extra validation applied.');
    }

    // Classification warnings
    if (classification.confidence < 0.6) {
      warnings.push('Query classification confidence is low. Results may be suboptimal.');
    }

    if (classification.safetyLevel === 'review') {
      warnings.push('This query requires additional safety review.');
    }

    return warnings;
  }

  private createDefaultOptimizedPrompt(message: string, classification: QueryClassification): OptimizedPrompt {
    return {
      systemPrompt: `You are a helpful AI assistant specializing in ${classification.type} queries. Provide accurate, helpful, and well-structured responses based on your expertise.`,
      userPrompt: `Question: ${message}`,
      constraints: [
        {
          type: 'response_length',
          description: 'Response length control',
          requirement: `Keep response between ${Math.floor(classification.estimatedResponseLength * 0.8)} and ${Math.ceil(classification.estimatedResponseLength * 1.2)} words`,
          enforcement: 'soft',
          priority: 1
        }
      ],
      sources: [],
      expectedFormat: 'plain_text',
      validationRequirements: [
        {
          type: 'relevance',
          description: 'Ensure response directly addresses the user query',
          threshold: 0.8,
          method: 'automated',
          severity: 'high'
        }
      ],
      safetyGuidelines: [
        {
          category: 'content_safety',
          rule: 'Do not provide harmful, illegal, or inappropriate content',
          description: 'Ensure all content is safe and appropriate',
          enforcement: 'block',
          confidence: 1.0
        }
      ],
      contextIntegration: {
        userContext: {
          profile: { id: 'default', academicLevel: 'high_school', subjects: [], strengths: [], weaknesses: [], studyGoals: [] },
          preferences: { responseFormat: 'plain_text', detailLevel: 'detailed', explanationStyle: 'simple', feedbackPreference: 'immediate' },
          history: { totalInteractions: 0, recentTopics: [], commonQuestions: [], performanceMetrics: {}, feedbackScores: [] },
          learningStyle: { visual: 0.5, auditory: 0.5, kinesthetic: 0.5, reading: 0.5 }
        },
        conversationContext: { currentTopic: '', previousMessages: [], conversationGoal: '', sessionDuration: 0, topicProgression: [] },
        knowledgeContext: { relevantFacts: [], concepts: [], sources: [], verified: true, lastUpdated: new Date() },
        externalContext: { currentTime: new Date(), systemStatus: 'operational', availableFeatures: ['chat'] }
      },
      qualityMarkers: [
        {
          type: 'relevance_check',
          description: 'Ensure response directly addresses the user query',
          checkMethod: 'Semantic similarity analysis',
          threshold: 0.8,
          importance: 'high'
        }
      ]
    };
  }

  private updateMetrics(result: Layer1ProcessingResult, processingTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    if (success && result.isValid) {
      this.metrics.validRequests++;
    } else {
      this.metrics.invalidRequests++;
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
      const stageKey = stage.stage === 'prompt_construction' ? 'promptConstruction' : stage.stage;
      const stageArray = this.metrics.stageDurations[stageKey as keyof typeof this.metrics.stageDurations];
      stageArray.push(stage.duration);
      
      // Keep only last 100 measurements
      if (stageArray.length > 100) {
        stageArray.shift();
      }
    }
  }

  private initializeMetrics(): Layer1Metrics {
    return {
      totalRequests: 0,
      validRequests: 0,
      invalidRequests: 0,
      averageProcessingTime: 0,
      validationFailures: 0,
      classificationAccuracy: 0,
      errorRate: 0,
      stageDurations: {
        validation: [],
        classification: [],
        promptConstruction: []
      }
    };
  }

  private generateRequestId(): string {
    return `layer1_${Date.now()}_${++this.requestIdCounter}`;
  }

  private generateInputHash(input: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(input + this.cryptoKey).digest('hex');
  }
}

// Export singleton instance
export const layer1Service = new Layer1Service();

// Convenience functions for direct usage
export const processInput = (request: Layer1ProcessingRequest) => {
  return layer1Service.processInput(request);
};

export const validateInput = (message: string, userId: string, level?: ValidationLevel) => {
  return layer1Service.validateInputOnly(message, userId, level);
};

export const classifyQuery = (message: string, userId?: string) => {
  return layer1Service.classifyQueryOnly(message, userId);
};

export const constructPrompt = (
  message: string,
  classification: QueryClassification,
  contextData?: Partial<AppDataContext>,
  options?: PromptConstructionOptions
) => {
  return layer1Service.constructPromptOnly(message, classification, contextData, options);
};