// Layer 3: Response Validation & Fact-Checking System - Main Exports
// ====================================================================

// Core component exports
export { ResponseValidator, responseValidator, validateResponse, assessResponseQuality, validateResponseConsistency } from './ResponseValidator';
export { FactChecker, factChecker, checkFacts, crossReference, detectContradictoryClaims, verifySource, findAlternativeSources } from './FactChecker';
export { ConfidenceScorer, confidenceScorer, calculateConfidence, assessSourceReliability, evaluateCoherence, identifyUncertainAreas, suggestFollowUpQuestions } from './ConfidenceScorer';
export { ContradictionDetector, contradictionDetector, detectContradictions, analyzeCrossContradictions, checkTemporalConsistency, generateResolutionStrategies } from './ContradictionDetector';

// Type exports
export type { 
  ValidationResult, 
  ValidationLevel, 
  ContentQuality, 
  ResponseIssue, 
  ValidationMetrics,
  AIResponse,
  ContextData,
  ValidationRequest,
  ValidationSummary
} from './ResponseValidator';

export type {
  Claim, 
  FactCheckResult, 
  VerificationEvidence, 
  SourceVerification, 
  CrossReferenceResult, 
  ContradictionDetection,
  Contradiction,
  FactCheckRequest,
  FactCheckSummary,
  VerificationStatus,
  VerificationType,
  FactType
} from './FactChecker';

export type {
  ConfidenceScore,
  UncertaintyFactor,
  ConfidenceEvidence,
  SourceQualityAssessment,
  ClaimVerificationData,
  FollowUpQuestion,
  ConfidenceRequest,
  CoherenceScore,
  CoherenceIssue,
  ConfidenceLevel,
  ConfidenceType,
  RecommendationAction,
  UncertaintyType
} from './ConfidenceScorer';

export type {
  Contradiction,
  ContradictoryClaim,
  ContradictionEvidence,
  ContradictionContext,
  ContradictionResolution,
  ContradictionDetectionRequest,
  ContradictionAnalysisResult,
  CrossContradictionAnalysis,
  ConsensusAnalysis,
  ReliabilityAnalysis,
  TemporalConsistencyAnalysis,
  ContradictionType,
  ContradictionSeverity,
  ContradictionStatus,
  ResolutionType
} from './ContradictionDetector';

// Unified Layer 3 Service
import { responseValidator, type ValidationRequest, type ValidationSummary } from './ResponseValidator';
import { factChecker, type FactCheckRequest, type FactCheckSummary } from './FactChecker';
import { confidenceScorer, type ConfidenceRequest, type ConfidenceScore } from './ConfidenceScorer';
import { contradictionDetector, type ContradictionDetectionRequest, type ContradictionAnalysisResult } from './ContradictionDetector';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';

export interface Layer3ProcessingRequest {
  response: AIResponse;
  context: ContextData;
  validationLevel: 'basic' | 'standard' | 'enhanced';
  includeFactChecking: boolean;
  includeContradictionDetection: boolean;
  includeConfidenceScoring: boolean;
  factCheckLevel?: 'basic' | 'standard' | 'comprehensive';
  contradictionThreshold?: number;
  maxProcessingTime?: number;
  metadata?: Record<string, any>;
}

export interface Layer3ProcessingResult {
  isValid: boolean;
  validationSummary: ValidationSummary;
  factCheckSummary?: FactCheckSummary;
  confidenceScore?: ConfidenceScore;
  contradictionAnalysis?: ContradictionAnalysisResult;
  overallQuality: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  criticalIssues: string[];
  processingTime: number;
  processingStages: ProcessingStage[];
  metadata: {
    requestId: string;
    timestamp: string;
    validationLevel: string;
    componentsUsed: string[];
  };
}

export interface ProcessingStage {
  stage: 'validation' | 'fact_check' | 'confidence_scoring' | 'contradiction_detection';
  status: 'completed' | 'failed' | 'skipped';
  duration: number;
  details?: any;
  error?: string;
}

export interface Layer3Configuration {
  validationLevel: 'basic' | 'standard' | 'enhanced';
  enableFactChecking: boolean;
  enableContradictionDetection: boolean;
  enableConfidenceScoring: boolean;
  factCheckLevel: 'basic' | 'standard' | 'comprehensive';
  contradictionThreshold: number;
  maxProcessingTime: number;
  strictMode: boolean;
  fallbackEnabled: boolean;
  enableLogging: boolean;
  enableMonitoring: boolean;
}

export interface Layer3Metrics {
  totalRequests: number;
  validResponses: number;
  invalidResponses: number;
  averageProcessingTime: number;
  factCheckAccuracy: number;
  contradictionDetectionRate: number;
  confidenceScoringAccuracy: number;
  errorRate: number;
  stageDurations: {
    validation: number[];
    factCheck: number[];
    confidenceScoring: number[];
    contradictionDetection: number[];
  };
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
    critical: number;
  };
}

export class Layer3Service {
  private configuration: Layer3Configuration;
  private metrics: Layer3Metrics;
  private requestIdCounter: number = 0;
  private cryptoKey: string;

  constructor(config?: Partial<Layer3Configuration>) {
    this.configuration = {
      validationLevel: 'standard',
      enableFactChecking: true,
      enableContradictionDetection: true,
      enableConfidenceScoring: true,
      factCheckLevel: 'standard',
      contradictionThreshold: 0.5,
      maxProcessingTime: 30000, // 30 seconds
      strictMode: false,
      fallbackEnabled: true,
      enableLogging: true,
      enableMonitoring: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.cryptoKey = process.env.LAYER3_ENCRYPTION_KEY || 'default-layer3-key';
  }

  /**
   * Main processing method - orchestrates all Layer 3 components
   */
  async processResponse(request: Layer3ProcessingRequest): Promise<Layer3ProcessingResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const processingStages: ProcessingStage[] = [];
    const componentsUsed: string[] = [];
    
    try {
      logInfo('Layer 3 processing started', {
        componentName: 'Layer3Service',
        requestId,
        responseId: request.response.id,
        validationLevel: request.validationLevel,
        includeFactCheck: request.includeFactChecking,
        includeContradiction: request.includeContradictionDetection,
        includeConfidence: request.includeConfidenceScoring
      });

      // Step 1: Response Validation
      const validationStage = await this.executeStage('validation', async () => {
        const validationRequest: ValidationRequest = {
          response: request.response,
          context: request.context,
          validationLevel: request.validationLevel,
          includeContentAnalysis: true,
          includeStructureAnalysis: true,
          includeReadabilityAnalysis: true,
          includeSafetyAnalysis: true,
          maxProcessingTime: request.maxProcessingTime
        };

        const summary = await responseValidator.validateResponse(validationRequest);
        componentsUsed.push('ResponseValidator');
        return summary;
      });

      processingStages.push(validationStage);

      // If validation failed critically, return early
      if (!validationStage.details?.isValid && this.configuration.strictMode) {
        const result = this.createFailedResult(request, validationStage, requestId, processingStages);
        this.updateMetrics(result, Date.now() - startTime, false);
        return result;
      }

      // Step 2: Fact Checking (if enabled)
      let factCheckSummary: FactCheckSummary | undefined;
      if (request.includeFactChecking && this.configuration.enableFactChecking) {
        const factCheckStage = await this.executeStage('fact_check', async () => {
          const factCheckRequest: FactCheckRequest = {
            response: request.response,
            context: request.context,
            verificationLevel: request.factCheckLevel || this.configuration.factCheckLevel,
            maxProcessingTime: Math.min(request.maxProcessingTime || 15000, 15000),
            requiredVerifications: ['content', 'source', 'cross_reference'],
            minConfidence: 0.6,
            sourcesToCheck: [],
            excludeSources: []
          };

          const summary = await factChecker.checkFacts(factCheckRequest);
          componentsUsed.push('FactChecker');
          return summary;
        });

        processingStages.push(factCheckStage);
        factCheckSummary = factCheckStage.details;
      }

      // Step 3: Confidence Scoring (if enabled)
      let confidenceScore: ConfidenceScore | undefined;
      if (request.includeConfidenceScoring && this.configuration.enableConfidenceScoring) {
        const confidenceStage = await this.executeStage('confidence_scoring', async () => {
          const confidenceRequest: ConfidenceRequest = {
            response: request.response,
            context: request.context,
            factCheckSummary,
            validationLevel: request.validationLevel,
            includeFollowUp: true,
            includeUncertaintyAnalysis: true,
            considerTemporalFactors: request.validationLevel === 'enhanced',
            assessSourceReliability: request.factCheckLevel !== 'basic'
          };

          const score = await confidenceScorer.calculateConfidence(confidenceRequest);
          componentsUsed.push('ConfidenceScorer');
          return score;
        });

        processingStages.push(confidenceStage);
        confidenceScore = confidenceStage.details;
      }

      // Step 4: Contradiction Detection (if enabled)
      let contradictionAnalysis: ContradictionAnalysisResult | undefined;
      if (request.includeContradictionDetection && this.configuration.enableContradictionDetection) {
        const contradictionStage = await this.executeStage('contradiction_detection', async () => {
          const contradictionRequest: ContradictionDetectionRequest = {
            response: request.response,
            context: request.context,
            factCheckResults: [], // Would integrate with fact checker results
            detectionLevel: request.validationLevel,
            includeTemporalAnalysis: request.validationLevel === 'enhanced',
            includeLogicalAnalysis: true,
            includeCrossReference: request.factCheckLevel === 'comprehensive',
            maxProcessingTime: Math.min(request.maxProcessingTime || 15000, 15000),
            threshold: request.contradictionThreshold || this.configuration.contradictionThreshold
          };

          const analysis = await contradictionDetector.detectContradictions(contradictionRequest);
          componentsUsed.push('ContradictionDetector');
          return analysis;
        });

        processingStages.push(contradictionStage);
        contradictionAnalysis = contradictionStage.details;
      }

      // Calculate overall quality and risk
      const overallQuality = this.calculateOverallQuality(validationStage.details, factCheckSummary, confidenceScore, contradictionAnalysis);
      const riskLevel = this.determineRiskLevel(validationStage.details, factCheckSummary, confidenceScore, contradictionAnalysis);
      
      // Generate recommendations and issues
      const recommendations = this.generateRecommendations(validationStage.details, factCheckSummary, confidenceScore, contradictionAnalysis);
      const criticalIssues = this.identifyCriticalIssues(validationStage.details, factCheckSummary, confidenceScore, contradictionAnalysis);

      const processingTime = Date.now() - startTime;
      
      const result: Layer3ProcessingResult = {
        isValid: validationStage.details?.isValid || false,
        validationSummary: validationStage.details!,
        factCheckSummary,
        confidenceScore,
        contradictionAnalysis,
        overallQuality,
        riskLevel,
        recommendations,
        criticalIssues,
        processingTime,
        processingStages,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          validationLevel: request.validationLevel,
          componentsUsed
        }
      };

      // Update metrics
      this.updateMetrics(result, processingTime, true);

      logInfo('Layer 3 processing completed successfully', {
        componentName: 'Layer3Service',
        requestId,
        isValid: result.isValid,
        overallQuality,
        riskLevel,
        processingTime,
        componentsUsed: componentsUsed.join(', ')
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorResult = this.createFailedResult(request, {
        stage: 'validation',
        status: 'failed',
        duration: processingTime,
        error: error instanceof Error ? error.message : String(error)
      }, requestId, processingStages);

      this.updateMetrics(errorResult, processingTime, false);

      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer3Service',
        requestId,
        responseId: request.response.id,
        processingTime
      });

      return errorResult;
    }
  }

  /**
   * Quick validation only - for fast pre-checks
   */
  async validateResponseOnly(
    response: AIResponse,
    context: ContextData,
    level: 'basic' | 'standard' | 'enhanced' = 'basic'
  ): Promise<ValidationSummary> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const validationRequest: ValidationRequest = {
        response,
        context,
        validationLevel: level,
        includeContentAnalysis: false,
        includeStructureAnalysis: false,
        includeReadabilityAnalysis: false,
        includeSafetyAnalysis: true,
        maxProcessingTime: 5000
      };

      const result = await responseValidator.validateResponse(validationRequest);

      logInfo('Quick validation completed', {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        isValid: result.isValid,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        processingTime: Date.now() - startTime
      });

      // Return safe default on error
      return {
        isValid: false,
        overallScore: 0,
        qualityLevel: 'critical',
        issues: [{
          type: 'system_error',
          severity: 'critical',
          description: 'Validation system error',
          suggestion: 'Please try again or contact support'
        }],
        metrics: {
          readabilityScore: 0,
          clarityScore: 0,
          structureScore: 0,
          safetyScore: 0,
          contentScore: 0
        },
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check facts only - for targeted fact verification
   */
  async checkFactsOnly(
    response: AIResponse,
    context: ContextData,
    level: 'basic' | 'standard' | 'comprehensive' = 'standard'
  ): Promise<FactCheckSummary> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const factCheckRequest: FactCheckRequest = {
        response,
        context,
        verificationLevel: level,
        maxProcessingTime: 15000,
        requiredVerifications: ['content', 'source'],
        minConfidence: 0.6,
        sourcesToCheck: [],
        excludeSources: []
      };

      const result = await factChecker.checkFacts(factCheckRequest);

      logInfo('Fact checking completed', {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        totalClaims: result.totalClaims,
        verifiedClaims: result.verifiedClaims,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        processingTime: Date.now() - startTime
      });

      // Return safe default on error
      return {
        totalClaims: 0,
        verifiedClaims: 0,
        disputedClaims: 0,
        unverifiedClaims: 0,
        contradictoryClaims: 0,
        overallConfidence: 0,
        qualityScore: 0,
        verificationMethod: 'failed',
        processingTime: Date.now() - startTime,
        recommendations: ['Fact checking failed - manual verification required'],
        criticalIssues: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Calculate confidence only - for confidence assessment
   */
  async calculateConfidenceOnly(
    response: AIResponse,
    context: ContextData,
    factCheckSummary?: FactCheckSummary
  ): Promise<ConfidenceScore> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const confidenceRequest: ConfidenceRequest = {
        response,
        context,
        factCheckSummary,
        validationLevel: 'standard',
        includeFollowUp: true,
        includeUncertaintyAnalysis: true,
        considerTemporalFactors: false,
        assessSourceReliability: true
      };

      const result = await confidenceScorer.calculateConfidence(confidenceRequest);

      logInfo('Confidence calculation completed', {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        overallConfidence: result.overall,
        recommendation: result.recommendation,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        processingTime: Date.now() - startTime
      });

      // Return safe default on error
      return {
        overall: 0,
        byType: {
          overall: 0,
          factual: 0,
          contextual: 0,
          methodological: 0,
          temporal: 0,
          source_reliability: 0
        },
        byClaim: new Map(),
        uncertaintyFactors: [{
          type: 'knowledge_gap',
          description: 'Confidence calculation failed',
          impact: 1.0,
          evidence: [error instanceof Error ? error.message : 'Unknown error'],
          affectedClaims: [],
          mitigation: ['Manual confidence assessment required']
        }],
        recommendation: 'reject',
        confidenceLevel: 'low',
        evidence: {
          supportingEvidence: [],
          contradictingEvidence: [],
          sourceQuality: {
            totalSources: 0,
            highQualitySources: 0,
            reliableSources: 0,
            verifiedSources: 0,
            averageReliability: 0,
            sourceDiversity: 0
          },
          claimVerification: {
            totalClaims: 0,
            verifiedClaims: 0,
            disputedClaims: 0,
            unverifiedClaims: 0,
            verificationMethods: {
              verified: 0,
              disputed: 0,
              inconclusive: 0,
              unverified: 0
            }
          },
          contextualFactors: []
        },
        processingTime: Date.now() - startTime,
        calculatedAt: new Date(),
        scoreId: `failed_${requestId}`
      };
    }
  }

  /**
   * Detect contradictions only - for contradiction analysis
   */
  async detectContradictionsOnly(
    response: AIResponse,
    context: ContextData,
    threshold: number = 0.5
  ): Promise<ContradictionAnalysisResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const contradictionRequest: ContradictionDetectionRequest = {
        response,
        context,
        detectionLevel: 'standard',
        includeTemporalAnalysis: false,
        includeLogicalAnalysis: true,
        includeCrossReference: false,
        maxProcessingTime: 15000,
        threshold
      };

      const result = await contradictionDetector.detectContradictions(contradictionRequest);

      logInfo('Contradiction detection completed', {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        totalContradictions: result.totalContradictions,
        overallScore: result.overallContradictionScore,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'Layer3Service',
        requestId,
        responseId: response.id,
        processingTime: Date.now() - startTime
      });

      // Return safe default on error
      return {
        totalContradictions: 0,
        contradictions: [],
        severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        typeDistribution: {
          self_contradiction: 0,
          cross_contradiction: 0,
          temporal_contradiction: 0,
          logical_contradiction: 0,
          contextual_contradiction: 0,
          factual_contradiction: 0
        },
        overallContradictionScore: 0,
        resolutionRecommendations: ['Contradiction detection failed - manual review required'],
        criticalIssues: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processingTime: Date.now() - startTime,
        analysisId: `failed_${requestId}`
      };
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Layer3Metrics {
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
  updateConfiguration(config: Partial<Layer3Configuration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): Layer3Configuration {
    return { ...this.configuration };
  }

  /**
   * Private helper methods
   */

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

  private calculateOverallQuality(
    validationSummary: ValidationSummary,
    factCheckSummary?: FactCheckSummary,
    confidenceScore?: ConfidenceScore,
    contradictionAnalysis?: ContradictionAnalysisResult
  ): number {
    let quality = validationSummary.overallScore;
    
    // Factor in fact checking
    if (factCheckSummary) {
      const factQuality = factCheckSummary.qualityScore;
      quality = (quality + factQuality) / 2;
    }
    
    // Factor in confidence scoring
    if (confidenceScore) {
      const confidenceQuality = confidenceScore.overall;
      quality = (quality + confidenceQuality) / 2;
    }
    
    // Factor in contradiction detection
    if (contradictionAnalysis) {
      const contradictionQuality = 1 - contradictionAnalysis.overallContradictionScore;
      quality = (quality + contradictionQuality) / 2;
    }
    
    return Math.max(0, Math.min(1, quality));
  }

  private determineRiskLevel(
    validationSummary: ValidationSummary,
    factCheckSummary?: FactCheckSummary,
    confidenceScore?: ConfidenceScore,
    contradictionAnalysis?: ContradictionAnalysisResult
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;
    
    // Validation-based risk
    if (validationSummary.qualityLevel === 'critical') {
      riskScore += 0.4;
    } else if (validationSummary.qualityLevel === 'low') {
      riskScore += 0.3;
    } else if (validationSummary.qualityLevel === 'medium') {
      riskScore += 0.1;
    }
    
    // Fact checking risk
    if (factCheckSummary) {
      if (factCheckSummary.unverifiedClaims > factCheckSummary.verifiedClaims) {
        riskScore += 0.3;
      }
      if (factCheckSummary.contradictoryClaims > 0) {
        riskScore += 0.2;
      }
    }
    
    // Confidence risk
    if (confidenceScore) {
      if (confidenceScore.confidenceLevel === 'low') {
        riskScore += 0.3;
      } else if (confidenceScore.confidenceLevel === 'medium') {
        riskScore += 0.1;
      }
      
      if (confidenceScore.recommendation === 'reject' || confidenceScore.recommendation === 'request_human') {
        riskScore += 0.2;
      }
    }
    
    // Contradiction risk
    if (contradictionAnalysis) {
      if (contradictionAnalysis.severityDistribution.critical > 0) {
        riskScore += 0.4;
      } else if (contradictionAnalysis.severityDistribution.high > 0) {
        riskScore += 0.3;
      } else if (contradictionAnalysis.severityDistribution.medium > 0) {
        riskScore += 0.1;
      }
    }
    
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.3) return 'medium';
    return 'low';
  }

  private generateRecommendations(
    validationSummary: ValidationSummary,
    factCheckSummary?: FactCheckSummary,
    confidenceScore?: ConfidenceScore,
    contradictionAnalysis?: ContradictionAnalysisResult
  ): string[] {
    const recommendations: string[] = [];
    
    // Validation-based recommendations
    if (validationSummary.issues.length > 0) {
      const criticalIssues = validationSummary.issues.filter(issue => issue.severity === 'critical');
      if (criticalIssues.length > 0) {
        recommendations.push('Address critical validation issues immediately');
      }
    }
    
    // Fact checking recommendations
    if (factCheckSummary) {
      if (factCheckSummary.unverifiedClaims > 0) {
        recommendations.push('Verify unverified claims with reliable sources');
      }
      if (factCheckSummary.contradictoryClaims > 0) {
        recommendations.push('Resolve contradictory claims through verification');
      }
    }
    
    // Confidence recommendations
    if (confidenceScore) {
      if (confidenceScore.recommendation === 'verify') {
        recommendations.push('Additional verification needed before accepting response');
      } else if (confidenceScore.recommendation === 'request_human') {
        recommendations.push('Human review required for this response');
      } else if (confidenceScore.recommendation === 'reject') {
        recommendations.push('Response quality is insufficient - consider regeneration');
      }
      
      if (confidenceScore.uncertaintyFactors.length > 0) {
        recommendations.push('Address uncertainty factors to improve response quality');
      }
    }
    
    // Contradiction recommendations
    if (contradictionAnalysis) {
      if (contradictionAnalysis.totalContradictions > 0) {
        recommendations.push('Resolve detected contradictions to improve response consistency');
      }
      
      if (contradictionAnalysis.criticalIssues.length > 0) {
        recommendations.push('Address critical contradiction issues immediately');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Response meets quality standards');
    }
    
    return recommendations;
  }

  private identifyCriticalIssues(
    validationSummary: ValidationSummary,
    factCheckSummary?: FactCheckSummary,
    confidenceScore?: ConfidenceScore,
    contradictionAnalysis?: ContradictionAnalysisResult
  ): string[] {
    const criticalIssues: string[] = [];
    
    // Validation critical issues
    const validationCritical = validationSummary.issues
      .filter(issue => issue.severity === 'critical')
      .map(issue => `Validation: ${issue.description}`);
    criticalIssues.push(...validationCritical);
    
    // Fact checking critical issues
    if (factCheckSummary) {
      if (factCheckSummary.contradictoryClaims > 0) {
        criticalIssues.push(`Fact checking: ${factCheckSummary.contradictoryClaims} contradictory claims detected`);
      }
    }
    
    // Confidence critical issues
    if (confidenceScore) {
      if (confidenceScore.recommendation === 'reject') {
        criticalIssues.push('Confidence: Response quality too low - rejection recommended');
      }
      
      const criticalUncertainties = confidenceScore.uncertaintyFactors
        .filter(factor => factor.impact > 0.7)
        .map(factor => `Confidence: ${factor.description}`);
      criticalIssues.push(...criticalUncertainties);
    }
    
    // Contradiction critical issues
    if (contradictionAnalysis) {
      if (contradictionAnalysis.severityDistribution.critical > 0) {
        criticalIssues.push(`Contradictions: ${contradictionAnalysis.severityDistribution.critical} critical contradictions detected`);
      }
    }
    
    return criticalIssues;
  }

  private createFailedResult(
    request: Layer3ProcessingRequest,
    failedStage: ProcessingStage,
    requestId: string,
    existingStages: ProcessingStage[]
  ): Layer3ProcessingResult {
    return {
      isValid: false,
      validationSummary: {
        isValid: false,
        overallScore: 0,
        qualityLevel: 'critical',
        issues: [{
          type: 'system_error',
          severity: 'critical',
          description: `Processing failed at ${failedStage.stage} stage: ${failedStage.error}`,
          suggestion: 'Please try again or contact support'
        }],
        metrics: {
          readabilityScore: 0,
          clarityScore: 0,
          structureScore: 0,
          safetyScore: 0,
          contentScore: 0
        },
        processingTime: failedStage.duration,
        timestamp: new Date().toISOString()
      },
      overallQuality: 0,
      riskLevel: 'critical',
      recommendations: ['Processing failed - manual review required'],
      criticalIssues: [`System failure: ${failedStage.error}`],
      processingTime: failedStage.duration,
      processingStages: [...existingStages, failedStage],
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        validationLevel: request.validationLevel,
        componentsUsed: []
      }
    };
  }

  private updateMetrics(result: Layer3ProcessingResult, processingTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    if (success && result.isValid) {
      this.metrics.validResponses++;
    } else {
      this.metrics.invalidResponses++;
    }

    if (!success) {
      this.metrics.errorRate++;
    }

    // Update average processing time
    this.metrics.averageProcessingTime = (
      (this.metrics.averageProcessingTime * (this.metrics.totalRequests - 1)) + processingTime
    ) / this.metrics.totalRequests;

    // Update quality distribution
    switch (result.riskLevel) {
      case 'low':
        this.metrics.qualityDistribution.high++;
        break;
      case 'medium':
        this.metrics.qualityDistribution.medium++;
        break;
      case 'high':
        this.metrics.qualityDistribution.low++;
        break;
      case 'critical':
        this.metrics.qualityDistribution.critical++;
        break;
    }

    // Update stage durations
    for (const stage of result.processingStages) {
      const stageKey = stage.stage as keyof typeof this.metrics.stageDurations;
      const stageArray = this.metrics.stageDurations[stageKey];
      stageArray.push(stage.duration);
      
      // Keep only last 100 measurements
      if (stageArray.length > 100) {
        stageArray.shift();
      }
    }
  }

  private initializeMetrics(): Layer3Metrics {
    return {
      totalRequests: 0,
      validResponses: 0,
      invalidResponses: 0,
      averageProcessingTime: 0,
      factCheckAccuracy: 0,
      contradictionDetectionRate: 0,
      confidenceScoringAccuracy: 0,
      errorRate: 0,
      stageDurations: {
        validation: [],
        factCheck: [],
        confidenceScoring: [],
        contradictionDetection: []
      },
      qualityDistribution: {
        high: 0,
        medium: 0,
        low: 0,
        critical: 0
      }
    };
  }

  private generateRequestId(): string {
    return `layer3_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clean up any managed resources
    this.metrics = this.initializeMetrics();
  }
}

// Export singleton instance
export const layer3Service = new Layer3Service();

// Convenience functions for direct usage
export const processResponse = (request: Layer3ProcessingRequest) => 
  layer3Service.processResponse(request);

export const validateResponseOnly = (response: AIResponse, context: ContextData, level?: 'basic' | 'standard' | 'enhanced') => 
  layer3Service.validateResponseOnly(response, context, level);

export const checkFactsOnly = (response: AIResponse, context: ContextData, level?: 'basic' | 'standard' | 'comprehensive') => 
  layer3Service.checkFactsOnly(response, context, level);

export const calculateConfidenceOnly = (response: AIResponse, context: ContextData, factCheckSummary?: FactCheckSummary) => 
  layer3Service.calculateConfidenceOnly(response, context, factCheckSummary);

export const detectContradictionsOnly = (response: AIResponse, context: ContextData, threshold?: number) => 
  layer3Service.detectContradictionsOnly(response, context, threshold);

// Get service instances for advanced usage
export const getLayer3Service = () => layer3Service;
export const getResponseValidator = () => responseValidator;
export const getFactChecker = () => factChecker;
export const getConfidenceScorer = () => confidenceScorer;
export const getContradictionDetector = () => contradictionDetector;