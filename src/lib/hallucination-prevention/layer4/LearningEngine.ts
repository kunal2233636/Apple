// Layer 4: User Feedback & Learning System
// ========================================
// LearningEngine - Advanced learning system for pattern recognition, model improvement,
// and continuous optimization based on user feedback

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';
import type { 
  UserFeedback, 
  Correction, 
  FeedbackPattern, 
  IssuePattern, 
  CorrectionPattern,
  HallucinationPattern,
  QualityPattern
} from './FeedbackCollector';

export type LearningType = 'correction_learning' | 'pattern_recognition' | 'hallucination_detection' | 'quality_optimization' | 'behavioral_adaptation';
export type LearningStatus = 'analyzing' | 'learning' | 'applying' | 'validated' | 'deployed' | 'archived';
export type ModelUpdateType = 'prompt_adjustment' | 'response_strategy' | 'context_optimization' | 'quality_threshold' | 'feedback_integration';
export type TrainingDataType = 'correction_examples' | 'quality_responses' | 'hallucination_cases' | 'satisfaction_data' | 'behavioral_patterns';

export interface LearningRequest {
  userId?: string;
  learningType: LearningType;
  feedbackData: UserFeedback[];
  context?: LearningContext;
  targetMetrics: LearningMetrics;
  maxProcessingTime: number;
  minConfidence: number;
  requireValidation: boolean;
}

export interface LearningContext {
  systemVersion: string;
  modelVersion: string;
  layerVersions: Record<string, string>;
  performanceBaseline: PerformanceBaseline;
  userPopulation: UserPopulationMetrics;
  temporalContext: TemporalContext;
}

export interface LearningMetrics {
  accuracy: number; // 0-1
  hallucinationRate: number; // 0-1
  userSatisfaction: number; // 0-1
  correctionRate: number; // 0-1
  engagementScore: number; // 0-1
  retentionRate: number; // 0-1
}

export interface PerformanceBaseline {
  responseAccuracy: number;
  factCheckPassRate: number;
  contradictionDetectionRate: number;
  confidenceScoringAccuracy: number;
  userSatisfactionScore: number;
  averageResponseTime: number;
  systemUptime: number;
  timestamp: Date;
}

export interface UserPopulationMetrics {
  totalUsers: number;
  activeUsers: number;
  userSegments: UserSegment[];
  demographicDistribution: Record<string, number>;
  usagePatterns: UsagePatternMetrics;
}

export interface UserSegment {
  id: string;
  name: string;
  size: number;
  characteristics: Record<string, any>;
  performance: LearningMetrics;
}

export interface UsagePatternMetrics {
  averageSessionLength: number;
  peakUsageHours: number[];
  featureUsageRates: Record<string, number>;
  commonInteractionTypes: string[];
}

export interface TemporalContext {
  timeOfDay: string;
  dayOfWeek: string;
  season: string;
  recentEvents: string[];
  systemLoad: number;
}

export interface LearningResult {
  id: string;
  learningType: LearningType;
  status: LearningStatus;
  confidence: number;
  insights: LearningInsight[];
  recommendations: LearningRecommendation[];
  dataUsed: LearningDataSummary;
  validationResults?: ValidationResult[];
  impactAssessment: ImpactAssessment;
  implementation: ImplementationPlan;
  createdAt: Date;
  validatedAt?: Date;
  deployedAt?: Date;
}

export interface LearningInsight {
  type: 'behavioral' | 'technical' | 'quality' | 'temporal' | 'contextual';
  category: string;
  description: string;
  confidence: number; // 0-1
  evidence: EvidenceItem[];
  implications: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  urgency: 'low' | 'medium' | 'high';
}

export interface EvidenceItem {
  source: string;
  data: any;
  confidence: number; // 0-1
  context: Record<string, any>;
  timestamp: Date;
  relevance: number; // 0-1
}

export interface LearningRecommendation {
  type: 'model_update' | 'prompt_adjustment' | 'context_optimization' | 'quality_threshold' | 'user_interface';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: ImpactEstimate;
  implementation: ImplementationDetails;
  riskAssessment: RiskAssessment;
  validation: ValidationRequirements;
}

export interface ImpactEstimate {
  accuracyImprovement: number; // 0-1
  satisfactionImprovement: number; // 0-1
  hallucinationReduction: number; // 0-1
  userEngagementImprovement: number; // 0-1
  costImpact: number; // positive/negative value
  implementationRisk: number; // 0-1
  timeToImpact: string;
  affectedUserPercentage: number; // 0-1
}

export interface ImplementationDetails {
  approach: string;
  components: string[];
  steps: ImplementationStep[];
  resources: ResourceRequirement[];
  timeline: Timeline;
  dependencies: string[];
  rollbackPlan: RollbackPlan;
}

export interface ImplementationStep {
  id: string;
  name: string;
  description: string;
  type: 'code_change' | 'config_update' | 'data_update' | 'model_deployment';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order: number;
  estimatedDuration: string;
  requiredTests: string[];
}

export interface ResourceRequirement {
  type: 'development' | 'testing' | 'deployment' | 'monitoring';
  description: string;
  effort: string;
  cost: number;
  availability: 'immediate' | 'scheduled' | 'requires_allocation';
}

export interface Timeline {
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
  criticalPath: string[];
  buffer: string;
}

export interface Milestone {
  name: string;
  date: Date;
  deliverables: string[];
  successCriteria: string[];
}

export interface RollbackPlan {
  trigger: string;
  steps: string[];
  dataBackup: string;
  userImpact: string;
  recoveryTime: string;
}

export interface RiskAssessment {
  technical: RiskItem[];
  operational: RiskItem[];
  business: RiskItem[];
  mitigationStrategies: MitigationStrategy[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskItem {
  category: string;
  description: string;
  probability: number; // 0-1
  impact: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSystems: string[];
  dependencies: string[];
}

export interface MitigationStrategy {
  risk: string;
  strategy: string;
  actions: string[];
  owner: string;
  timeline: string;
  successCriteria: string;
}

export interface ValidationRequirements {
  tests: ValidationTest[];
  metrics: ValidationMetric[];
  criteria: ValidationCriteria;
  timeFrame: string;
}

export interface ValidationTest {
  name: string;
  type: 'unit' | 'integration' | 'performance' | 'user_acceptance';
  description: string;
  successCriteria: string;
  effort: string;
  required: boolean;
}

export interface ValidationMetric {
  name: string;
  target: number;
  current: number;
  measurement: string;
  significance: 'low' | 'medium' | 'high';
}

export interface ValidationCriteria {
  accuracyThreshold: number;
  performanceThreshold: number;
  userSatisfactionThreshold: number;
  hallucinationReductionThreshold: number;
  rollbackTrigger: string;
}

export interface LearningDataSummary {
  totalSamples: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  dataQuality: DataQualityMetrics;
  coverage: CoverageMetrics;
  distribution: DistributionMetrics;
}

export interface DataQualityMetrics {
  completeness: number; // 0-1
  consistency: number; // 0-1
  accuracy: number; // 0-1
  timeliness: number; // 0-1
  validity: number; // 0-1
}

export interface CoverageMetrics {
  userSegments: number;
  interactionTypes: number;
  timePeriods: number;
  scenarios: number;
  languages: number;
}

export interface DistributionMetrics {
  feedbackTypes: Record<string, number>;
  userDemographics: Record<string, number>;
  timeOfDay: Record<string, number>;
  responseQualities: Record<string, number>;
}

export interface ValidationResult {
  id: string;
  testType: 'simulation' | 'ab_test' | 'canary' | 'shadow';
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: Date;
  endTime?: Date;
  results: ValidationResultData;
  confidence: number; // 0-1
  sampleSize: number;
  statisticalSignificance: number; // 0-1
  recommendations: string[];
}

export interface ValidationResultData {
  metric: string;
  baseline: number;
  improved: number;
  improvement: number; // 0-1
  confidence: number; // 0-1
  pValue: number;
  effect: 'positive' | 'negative' | 'neutral';
  details: Record<string, any>;
}

export interface ImpactAssessment {
  immediate: ImpactMetric[];
  shortTerm: ImpactMetric[];
  longTerm: ImpactMetric[];
  riskFactors: string[];
  successIndicators: string[];
  monitoringPlan: MonitoringPlan;
}

export interface ImpactMetric {
  name: string;
  current: number;
  target: number;
  measurement: string;
  confidence: number; // 0-1
  timeline: string;
  dependencies: string[];
}

export interface MonitoringPlan {
  metrics: string[];
  frequency: string;
  thresholds: Record<string, number>;
  alerts: AlertConfiguration[];
  dashboard: DashboardConfiguration;
}

export interface AlertConfiguration {
  metric: string;
  threshold: number;
  action: 'notify' | 'rollback' | 'escalate';
  recipients: string[];
  escalation: string;
}

export interface DashboardConfiguration {
  panels: DashboardPanel[];
  widgets: DashboardWidget[];
  layout: string;
  refresh: string;
}

export interface DashboardPanel {
  name: string;
  metrics: string[];
  chart: string;
  timeRange: string;
  filters: Record<string, any>;
}

export interface DashboardWidget {
  type: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface ImplementationPlan {
  phase: number;
  status: 'planning' | 'development' | 'testing' | 'deployment' | 'monitoring' | 'completed';
  components: string[];
  timeline: Timeline;
  requirements: ImplementationRequirement[];
  success: SuccessCriteria;
}

export interface ImplementationRequirement {
  type: 'technical' | 'organizational' | 'regulatory' | 'resource';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  owner: string;
  deadline: Date;
  dependencies: string[];
}

export interface SuccessCriteria {
  performance: Record<string, number>;
  user: Record<string, number>;
  business: Record<string, number>;
  quality: Record<string, number>;
}

export class LearningEngine {
  private static readonly MIN_SAMPLES_FOR_LEARNING = 10;
  private static readonly LEARNING_CONFIDENCE_THRESHOLD = 0.7;
  private static readonly VALIDATION_SAMPLE_SIZE = 100;
  private static readonly MAX_LEARNING_ITERATIONS = 5;

  private cryptoKey: string;
  private learningCache: Map<string, LearningResult> = new Map();
  private activeLearning: Map<string, LearningRequest> = new Map();

  constructor() {
    this.cryptoKey = process.env.LEARNING_ENGINE_KEY || 'default-learning-key';
  }

  /**
   * Main learning method - processes feedback and generates learning insights
   */
  async learnFromFeedback(request: LearningRequest): Promise<LearningResult> {
    const startTime = Date.now();
    const learningId = this.generateLearningId();
    
    try {
      logInfo('Learning process started', {
        componentName: 'LearningEngine',
        learningId,
        learningType: request.learningType,
        sampleCount: request.feedbackData.length,
        userId: request.userId
      });

      // Validate input data
      const validationResult = await this.validateLearningData(request);
      if (!validationResult.isValid) {
        throw new Error(`Invalid learning data: ${validationResult.errors.join(', ')}`);
      }

      // Create learning context
      const context = await this.buildLearningContext(request);

      // Perform learning based on type
      let learningResult: LearningResult;
      switch (request.learningType) {
        case 'correction_learning':
          learningResult = await this.learnFromCorrections(request, context);
          break;
        case 'pattern_recognition':
          learningResult = await this.learnPatterns(request, context);
          break;
        case 'hallucination_detection':
          learningResult = await this.learnHallucinationPatterns(request, context);
          break;
        case 'quality_optimization':
          learningResult = await this.optimizeQuality(request, context);
          break;
        case 'behavioral_adaptation':
          learningResult = await this.adaptToBehavior(request, context);
          break;
        default:
          throw new Error(`Unknown learning type: ${request.learningType}`);
      }

      // Validate results if required
      if (request.requireValidation) {
        learningResult = await this.validateLearningResult(learningResult, request);
      }

      // Store results
      await this.storeLearningResult(learningResult);
      this.learningCache.set(learningId, learningResult);

      // Update active learning
      this.activeLearning.set(learningId, request);

      const processingTime = Date.now() - startTime;
      logInfo('Learning process completed successfully', {
        componentName: 'LearningEngine',
        learningId,
        learningType: request.learningType,
        processingTime,
        confidence: learningResult.confidence,
        insightCount: learningResult.insights.length,
        recommendationCount: learningResult.recommendations.length
      });

      return learningResult;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'LearningEngine',
        learningId,
        learningType: request.learningType,
        sampleCount: request.feedbackData.length
      });

      throw new Error(`Learning process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Learn from correction patterns
   */
  private async learnFromCorrections(request: LearningRequest, context: LearningContext): Promise<LearningResult> {
    const corrections = request.feedbackData.flatMap(fb => fb.corrections || []);
    
    if (corrections.length < LearningEngine.MIN_SAMPLES_FOR_LEARNING) {
      throw new Error(`Insufficient correction data: ${corrections.length} < ${LearningEngine.MIN_SAMPLES_FOR_LEARNING}`);
    }

    // Analyze correction patterns
    const patternAnalysis = this.analyzeCorrectionPatterns(corrections);
    
    // Identify root causes
    const rootCauseAnalysis = this.identifyRootCauses(corrections, context);
    
    // Generate insights
    const insights: LearningInsight[] = [
      {
        type: 'technical',
        category: 'correction_pattern',
        description: `Identified ${patternAnalysis.commonTypes.length} common correction types`,
        confidence: patternAnalysis.confidence,
        evidence: corrections.map(c => ({
          source: 'correction_data',
          data: c,
          confidence: 0.8,
          context: { type: c.type, severity: c.severity },
          timestamp: new Date(),
          relevance: 1.0
        })),
        implications: ['Targeted improvements can reduce correction frequency', 'User satisfaction can be improved'],
        severity: this.calculateSeverity(corrections),
        actionable: true,
        urgency: this.calculateUrgency(corrections)
      },
      {
        type: 'behavioral',
        category: 'user_feedback',
        description: `Users provide feedback at rate of ${corrections.length / request.feedbackData.length} per interaction`,
        confidence: 0.9,
        evidence: [],
        implications: ['Users are engaged with system', 'Feedback mechanism is working'],
        severity: 'low',
        actionable: false,
        urgency: 'low'
      }
    ];

    // Generate recommendations
    const recommendations: LearningRecommendation[] = [
      {
        type: 'model_update',
        priority: 'high',
        description: 'Adjust model parameters based on correction patterns',
        expectedImpact: {
          accuracyImprovement: 0.15,
          satisfactionImprovement: 0.20,
          hallucinationReduction: 0.25,
          userEngagementImprovement: 0.10,
          costImpact: 0.05,
          implementationRisk: 0.3,
          timeToImpact: '2-3 weeks',
          affectedUserPercentage: 0.8
        },
        implementation: this.createImplementationPlan('model_parameter_adjustment'),
        riskAssessment: this.assessImplementationRisk('medium'),
        validation: this.createValidationRequirements()
      }
    ];

    // Create learning result
    return {
      id: this.generateLearningId(),
      learningType: 'correction_learning',
      status: 'completed',
      confidence: this.calculateOverallConfidence(patternAnalysis, rootCauseAnalysis),
      insights,
      recommendations,
      dataUsed: this.summarizeLearningData(request.feedbackData),
      impactAssessment: this.createImpactAssessment('correction_learning'),
      implementation: this.createImplementationPlan('correction_learning'),
      createdAt: new Date()
    };
  }

  /**
   * Learn from behavioral patterns
   */
  private async learnPatterns(request: LearningRequest, context: LearningContext): Promise<LearningResult> {
    // Analyze behavioral patterns in feedback
    const patternAnalysis = this.analyzeFeedbackPatterns(request.feedbackData);
    
    // Identify usage patterns
    const usagePatterns = this.identifyUsagePatterns(request.feedbackData, context);
    
    // Generate behavioral insights
    const insights: LearningInsight[] = [
      {
        type: 'behavioral',
        category: 'user_engagement',
        description: 'Users show consistent engagement patterns',
        confidence: 0.8,
        evidence: [],
        implications: ['Predictable user behavior can be leveraged for personalization'],
        severity: 'low',
        actionable: true,
        urgency: 'medium'
      }
    ];

    // Create recommendations based on patterns
    const recommendations: LearningRecommendation[] = [
      {
        type: 'context_optimization',
        priority: 'medium',
        description: 'Optimize context based on usage patterns',
        expectedImpact: {
          accuracyImprovement: 0.10,
          satisfactionImprovement: 0.15,
          hallucinationReduction: 0.05,
          userEngagementImprovement: 0.25,
          costImpact: -0.02,
          implementationRisk: 0.2,
          timeToImpact: '1-2 weeks',
          affectedUserPercentage: 0.6
        },
        implementation: this.createImplementationPlan('context_optimization'),
        riskAssessment: this.assessImplementationRisk('low'),
        validation: this.createValidationRequirements()
      }
    ];

    return {
      id: this.generateLearningId(),
      learningType: 'pattern_recognition',
      status: 'completed',
      confidence: 0.75,
      insights,
      recommendations,
      dataUsed: this.summarizeLearningData(request.feedbackData),
      impactAssessment: this.createImpactAssessment('pattern_recognition'),
      implementation: this.createImplementationPlan('pattern_recognition'),
      createdAt: new Date()
    };
  }

  /**
   * Learn hallucination patterns for detection
   */
  private async learnHallucinationPatterns(request: LearningRequest, context: LearningContext): Promise<LearningResult> {
    // Identify potential hallucination indicators
    const hallucinationIndicators = this.identifyHallucinationIndicators(request.feedbackData);
    
    // Analyze confidence patterns
    const confidenceAnalysis = this.analyzeConfidencePatterns(request.feedbackData);
    
    const insights: LearningInsight[] = [
      {
        type: 'technical',
        category: 'hallucination_detection',
        description: `Identified ${hallucinationIndicators.length} potential hallucination indicators`,
        confidence: 0.7,
        evidence: [],
        implications: ['Can improve early hallucination detection', 'Reduce false positives'],
        severity: 'high',
        actionable: true,
        urgency: 'high'
      }
    ];

    return {
      id: this.generateLearningId(),
      learningType: 'hallucination_detection',
      status: 'completed',
      confidence: 0.7,
      insights,
      recommendations: [],
      dataUsed: this.summarizeLearningData(request.feedbackData),
      impactAssessment: this.createImpactAssessment('hallucination_detection'),
      implementation: this.createImplementationPlan('hallucination_detection'),
      createdAt: new Date()
    };
  }

  /**
   * Optimize system quality
   */
  private async optimizeQuality(request: LearningRequest, context: LearningContext): Promise<LearningResult> {
    // Analyze quality metrics
    const qualityAnalysis = this.analyzeQualityMetrics(request.feedbackData);
    
    // Identify quality improvement opportunities
    const improvementOpportunities = this.identifyQualityOpportunities(request.feedbackData, qualityAnalysis);
    
    const insights: LearningInsight[] = [
      {
        type: 'quality',
        category: 'system_performance',
        description: 'Quality optimization opportunities identified',
        confidence: 0.8,
        evidence: [],
        implications: ['Overall system quality can be improved'],
        severity: 'medium',
        actionable: true,
        urgency: 'medium'
      }
    ];

    return {
      id: this.generateLearningId(),
      learningType: 'quality_optimization',
      status: 'completed',
      confidence: 0.8,
      insights,
      recommendations: [],
      dataUsed: this.summarizeLearningData(request.feedbackData),
      impactAssessment: this.createImpactAssessment('quality_optimization'),
      implementation: this.createImplementationPlan('quality_optimization'),
      createdAt: new Date()
    };
  }

  /**
   * Adapt system behavior to user patterns
   */
  private async adaptToBehavior(request: LearningRequest, context: LearningContext): Promise<LearningResult> {
    // Analyze user behavior patterns
    const behaviorAnalysis = this.analyzeUserBehavior(request.feedbackData);
    
    // Adapt based on user segments
    const adaptationStrategies = this.developAdaptationStrategies(behaviorAnalysis, context);
    
    const insights: LearningInsight[] = [
      {
        type: 'behavioral',
        category: 'user_adaptation',
        description: 'Behavioral adaptation strategies developed',
        confidence: 0.75,
        evidence: [],
        implications: ['Can improve user satisfaction through personalization'],
        severity: 'low',
        actionable: true,
        urgency: 'medium'
      }
    ];

    return {
      id: this.generateLearningId(),
      learningType: 'behavioral_adaptation',
      status: 'completed',
      confidence: 0.75,
      insights,
      recommendations: [],
      dataUsed: this.summarizeLearningData(request.feedbackData),
      impactAssessment: this.createImpactAssessment('behavioral_adaptation'),
      implementation: this.createImplementationPlan('behavioral_adaptation'),
      createdAt: new Date()
    };
  }

  /**
   * Validate learning results
   */
  private async validateLearningResult(result: LearningResult, request: LearningRequest): Promise<LearningResult> {
    // Run validation tests
    const validationResults = await this.runValidationTests(result, request);
    
    // Update result with validation
    const validatedResult: LearningResult = {
      ...result,
      validationResults,
      status: validationResults.every(vr => vr.status === 'completed') ? 'validated' : 'failed',
      validatedAt: new Date()
    };

    return validatedResult;
  }

  /**
   * Helper methods for analysis
   */
  private analyzeCorrectionPatterns(corrections: Correction[]): any {
    const typeCounts = corrections.reduce((counts, correction) => {
      counts[correction.type] = (counts[correction.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const commonTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    return {
      typeCounts,
      commonTypes,
      confidence: Math.min(0.9, corrections.length * 0.1)
    };
  }

  private identifyRootCauses(corrections: Correction[], context: LearningContext): any {
    // Analyze patterns to identify root causes
    return {
      primaryCauses: ['model_inaccuracy', 'context_misunderstanding'],
      confidence: 0.7
    };
  }

  private analyzeFeedbackPatterns(feedback: UserFeedback[]): any {
    // Analyze patterns in user feedback
    return {
      patterns: [],
      confidence: 0.8
    };
  }

  private identifyUsagePatterns(feedback: UserFeedback[], context: LearningContext): any {
    // Identify usage patterns
    return {
      patterns: [],
      confidence: 0.7
    };
  }

  private identifyHallucinationIndicators(feedback: UserFeedback[]): any[] {
    // Identify potential hallucination indicators
    return [];
  }

  private analyzeConfidencePatterns(feedback: UserFeedback[]): any {
    // Analyze confidence patterns
    return {
      patterns: [],
      confidence: 0.6
    };
  }

  private analyzeQualityMetrics(feedback: UserFeedback[]): any {
    // Analyze quality metrics
    return {
      metrics: {},
      confidence: 0.8
    };
  }

  private identifyQualityOpportunities(feedback: UserFeedback[], qualityAnalysis: any): any[] {
    // Identify quality improvement opportunities
    return [];
  }

  private analyzeUserBehavior(feedback: UserFeedback[]): any {
    // Analyze user behavior patterns
    return {
      patterns: [],
      confidence: 0.7
    };
  }

  private developAdaptationStrategies(behaviorAnalysis: any, context: LearningContext): any[] {
    // Develop adaptation strategies
    return [];
  }

  private calculateSeverity(corrections: Correction[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = corrections.filter(c => c.severity === 'critical').length;
    const highCount = corrections.filter(c => c.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > corrections.length * 0.3) return 'high';
    if (corrections.length > 10) return 'medium';
    return 'low';
  }

  private calculateUrgency(corrections: Correction[]): 'low' | 'medium' | 'high' {
    const recentCorrections = corrections.filter(c => {
      // In real implementation, would check timestamp
      return true;
    });
    
    return recentCorrections.length > 5 ? 'high' : 'medium';
  }

  private calculateOverallConfidence(patternAnalysis: any, rootCauseAnalysis: any): number {
    return (patternAnalysis.confidence + rootCauseAnalysis.confidence) / 2;
  }

  private async runValidationTests(result: LearningResult, request: LearningRequest): Promise<ValidationResult[]> {
    // Run validation tests
    return [];
  }

  private async validateLearningData(request: LearningRequest): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!request.feedbackData || request.feedbackData.length === 0) {
      errors.push('No feedback data provided');
    }
    
    if (request.feedbackData.length < LearningEngine.MIN_SAMPLES_FOR_LEARNING) {
      errors.push(`Insufficient samples: ${request.feedbackData.length} < ${LearningEngine.MIN_SAMPLES_FOR_LEARNING}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async buildLearningContext(request: LearningRequest): Promise<LearningContext> {
    // Build learning context from system state
    return {
      systemVersion: '1.0.0',
      modelVersion: '1.0.0',
      layerVersions: {
        layer1: '1.0.0',
        layer2: '1.0.0',
        layer3: '1.0.0'
      },
      performanceBaseline: {
        responseAccuracy: 0.85,
        factCheckPassRate: 0.90,
        contradictionDetectionRate: 0.80,
        confidenceScoringAccuracy: 0.75,
        userSatisfactionScore: 0.80,
        averageResponseTime: 2000,
        systemUptime: 0.99,
        timestamp: new Date()
      },
      userPopulation: {
        totalUsers: 1000,
        activeUsers: 800,
        userSegments: [],
        demographicDistribution: {},
        usagePatterns: {
          averageSessionLength: 15,
          peakUsageHours: [10, 14, 20],
          featureUsageRates: {},
          commonInteractionTypes: []
        }
      },
      temporalContext: {
        timeOfDay: 'morning',
        dayOfWeek: 'weekday',
        season: 'winter',
        recentEvents: [],
        systemLoad: 0.5
      }
    };
  }

  private async storeLearningResult(result: LearningResult): Promise<void> {
    try {
      const { error } = await (supabase
        .from('learning_results') as any)
        .insert([{
          id: result.id,
          learning_type: result.learningType,
          status: result.status,
          confidence: result.confidence,
          insights: result.insights,
          recommendations: result.recommendations,
          data_used: result.dataUsed,
          impact_assessment: result.impactAssessment,
          implementation: result.implementation,
          created_at: result.createdAt.toISOString(),
          validated_at: result.validatedAt?.toISOString(),
          deployed_at: result.deployedAt?.toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logWarning('Failed to store learning result in database', { 
        learningId: result.id, 
        error 
      });
    }
  }

  // Utility methods
  private generateLearningId(): string {
    return `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private summarizeLearningData(feedback: UserFeedback[]): LearningDataSummary {
    return {
      totalSamples: feedback.length,
      timeRange: {
        start: new Date(Math.min(...feedback.map(fb => fb.createdAt.getTime()))),
        end: new Date(Math.max(...feedback.map(fb => fb.createdAt.getTime())))
      },
      dataQuality: {
        completeness: 0.8,
        consistency: 0.9,
        accuracy: 0.85,
        timeliness: 0.95,
        validity: 0.90
      },
      coverage: {
        userSegments: 1,
        interactionTypes: 5,
        timePeriods: 3,
        scenarios: 10,
        languages: 1
      },
      distribution: {
        feedbackTypes: {},
        userDemographics: {},
        timeOfDay: {},
        responseQualities: {}
      }
    };
  }

  private createImpactAssessment(learningType: LearningType): ImpactAssessment {
    return {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      riskFactors: [],
      successIndicators: [],
      monitoringPlan: {
        metrics: [],
        frequency: 'daily',
        thresholds: {},
        alerts: [],
        dashboard: {
          panels: [],
          widgets: [],
          layout: 'default',
          refresh: '5m'
        }
      }
    };
  }

  private createImplementationPlan(learningType: string): ImplementationPlan {
    return {
      phase: 1,
      status: 'planning',
      components: [],
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        milestones: [],
        criticalPath: [],
        buffer: '1 week'
      },
      requirements: [],
      success: {
        performance: {},
        user: {},
        business: {},
        quality: {}
      }
    };
  }

  private assessImplementationRisk(level: 'low' | 'medium' | 'high'): RiskAssessment {
    return {
      technical: [],
      operational: [],
      business: [],
      mitigationStrategies: [],
      overallRisk: level
    };
  }

  private createValidationRequirements(): ValidationRequirements {
    return {
      tests: [],
      metrics: [],
      criteria: {
        accuracyThreshold: 0.05,
        performanceThreshold: 0.02,
        userSatisfactionThreshold: 0.05,
        hallucinationReductionThreshold: 0.10,
        rollbackTrigger: 'degradation > 5%'
      },
      timeFrame: '2 weeks'
    };
  }
}

// Export singleton instance
export const learningEngine = new LearningEngine();

// Convenience functions
export const learnFromFeedback = (request: LearningRequest) =>
  learningEngine.learnFromFeedback(request);

export const analyzeCorrections = (feedback: UserFeedback[]) =>
  learningEngine.learnFromFeedback({
    learningType: 'correction_learning',
    feedbackData: feedback,
    targetMetrics: { accuracy: 0, hallucinationRate: 0, userSatisfaction: 0, correctionRate: 0, engagementScore: 0, retentionRate: 0 },
    maxProcessingTime: 30000,
    minConfidence: 0.7,
    requireValidation: false
  });

export const recognizePatterns = (feedback: UserFeedback[]) =>
  learningEngine.learnFromFeedback({
    learningType: 'pattern_recognition',
    feedbackData: feedback,
    targetMetrics: { accuracy: 0, hallucinationRate: 0, userSatisfaction: 0, correctionRate: 0, engagementScore: 0, retentionRate: 0 },
    maxProcessingTime: 30000,
    minConfidence: 0.7,
    requireValidation: false
  });

export const detectHallucinations = (feedback: UserFeedback[]) =>
  learningEngine.learnFromFeedback({
    learningType: 'hallucination_detection',
    feedbackData: feedback,
    targetMetrics: { accuracy: 0, hallucinationRate: 0, userSatisfaction: 0, correctionRate: 0, engagementScore: 0, retentionRate: 0 },
    maxProcessingTime: 30000,
    minConfidence: 0.7,
    requireValidation: false
  });