// Layer 4: User Feedback & Learning System
// ========================================
// FeedbackCollector - Advanced feedback collection system for implicit and explicit user feedback,
// feedback pattern analysis, and satisfaction tracking

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';

export type FeedbackType = 'rating' | 'correction' | 'clarification' | 'flag' | 'acceptance' | 'rejection' | 'follow_up' | 'abandonment';
export type FeedbackSource = 'explicit' | 'implicit' | 'automatic' | 'system';
export type FeedbackStatus = 'collected' | 'processed' | 'analyzed' | 'learned' | 'archived';
export type CorrectionType = 'factual_error' | 'incomplete_answer' | 'off_topic' | 'too_complex' | 'too_simple' | 'style_issue' | 'other';

export interface UserFeedback {
  id: string;
  interactionId: string;
  userId: string;
  sessionId: string;
  type: FeedbackType;
  source: FeedbackSource;
  status: FeedbackStatus;
  rating?: number; // 1-5 scale
  corrections?: Correction[];
  clarificationRequests?: ClarificationRequest[];
  flagReasons?: string[];
  content?: string; // For free-text feedback
  metadata: FeedbackMetadata;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface Correction {
  id: string;
  type: CorrectionType;
  originalContent: string;
  correctedContent: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAreas: string[];
  suggestedImprovements: string[];
}

export interface ClarificationRequest {
  id: string;
  question: string;
  context: string;
  response?: string;
  followUpType: 'explanation' | 'example' | 'definition' | 'alternative' | 'simplification';
  resolved: boolean;
  resolutionTime?: Date;
}

export interface FeedbackMetadata {
  deviceInfo?: DeviceInfo;
  userAgent?: string;
  sessionDuration: number;
  responseTime: number;
  pageViewTime: number;
  clicks: number;
  scrolls: number;
  copyActions: number;
  searchActions: number;
  userJourney: UserJourneyStep[];
  satisfactionIndicators: SatisfactionIndicator[];
  systemInfo: SystemInfo;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

export interface UserJourneyStep {
  step: string;
  timestamp: Date;
  duration: number;
  context: Record<string, any>;
  performance: {
    timeToFirstByte?: number;
    domContentLoaded?: number;
    pageLoaded?: number;
    interactionDelay?: number;
  };
}

export interface SatisfactionIndicator {
  type: 'engagement' | 'completion' | 'repetition' | 'abandonment' | 'correction' | 'follow_up';
  value: number;
  context: Record<string, any>;
  timestamp: Date;
}

export interface SystemInfo {
  responseQuality: number;
  responseAccuracy: number;
  systemPerformance: number;
  userSatisfaction: number;
  errorRate: number;
  uptime: number;
}

export interface ImplicitFeedback {
  userId: string;
  sessionId: string;
  interactionId: string;
  timeSpent: number; // reading/engagement time
  scrollDepth: number; // percentage of content viewed
  dwellTime: number; // time on response before moving on
  followUpQuestions: number;
  corrections: number;
  alternativeSearches: number;
  sessionAbandonment: boolean;
  abandonmentPoint?: string;
  engagementScore: number; // 0-1
  satisfactionScore: number; // 0-1
  interactionQuality: number; // 0-1
  metadata: ImplicitFeedbackMetadata;
}

export interface ImplicitFeedbackMetadata {
  pageLoadTime: number;
  timeToFirstResponse: number;
  responseProcessingTime: number;
  userAttentionScore: number;
  focusScore: number; // attention/focus during response reading
  comprehensionIndicators: ComprehensionIndicator[];
  usagePatterns: UsagePattern[];
  behavioralSignals: BehavioralSignal[];
}

export interface ComprehensionIndicator {
  type: 'fast_read' | 'slow_read' | 're_read' | 'skip_to_end' | 'revisit_sections';
  timestamp: Date;
  duration: number;
  context: Record<string, any>;
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  context: Record<string, any>;
  effectiveness: number;
}

export interface BehavioralSignal {
  type: 'satisfaction' | 'frustration' | 'confusion' | 'engagement' | 'abandonment';
  confidence: number; // 0-1
  context: Record<string, any>;
  timestamp: Date;
  indicators: string[];
}

export interface FeedbackPattern {
  id: string;
  userId: string;
  patternType: 'correction_frequency' | 'satisfaction_trend' | 'engagement_pattern' | 'abandonment_trigger' | 'learning_preference';
  pattern: Record<string, any>;
  confidence: number; // 0-1
  frequency: number;
  lastOccurrence: Date;
  firstOccurrence: Date;
  context: PatternContext;
  insights: PatternInsight[];
  recommendations: string[];
}

export interface PatternContext {
  timeOfDay: string[];
  deviceTypes: string[];
  sessionTypes: string[];
  queryTypes: string[];
  subjectAreas: string[];
  responseTypes: string[];
}

export interface PatternInsight {
  type: 'behavioral' | 'preferential' | 'contextual' | 'temporal' | 'quality';
  description: string;
  confidence: number;
  evidence: string[];
  implications: string[];
  actionableItems: string[];
}

export interface IssuePattern {
  id: string;
  type: 'factual_inaccuracy' | 'incompleteness' | 'style_issue' | 'clarity_problem' | 'relevance_issue' | 'complexity_mismatch';
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: number;
  firstReported: Date;
  lastReported: Date;
  status: 'investigating' | 'identified' | 'resolved' | 'monitoring';
  description: string;
  examples: IssueExample[];
  rootCauses: string[];
  solutions: string[];
  preventionMeasures: string[];
  impact: IssueImpact;
}

export interface IssueExample {
  interactionId: string;
  originalContent: string;
  userFeedback: string;
  corrections: Correction[];
  timestamp: Date;
  resolution: string;
}

export interface IssueImpact {
  userSatisfaction: number; // 0-1
  systemReliability: number; // 0-1
  correctionRate: number; // percentage
  abandonmentRate: number; // percentage
  costImpact: number; // additional processing costs
  reputationRisk: number; // 0-1
}

export interface CorrelationResult {
  id: string;
  type: 'feedback_quality' | 'satisfaction_factors' | 'user_behavior' | 'system_performance' | 'learning_effectiveness';
  correlationCoefficient: number; // -1 to 1
  pValue: number; // statistical significance
  confidence: number; // 0-1
  sampleSize: number;
  factors: CorrelatedFactor[];
  insights: CorrelationInsight[];
  recommendations: string[];
  timeFrame: {
    start: Date;
    end: Date;
  };
}

export interface CorrelatedFactor {
  name: string;
  type: 'independent' | 'dependent';
  values: number[];
  mean: number;
  standardDeviation: number;
  description: string;
}

export interface CorrelationInsight {
  type: 'strong_positive' | 'weak_positive' | 'neutral' | 'weak_negative' | 'strong_negative';
  description: string;
  confidence: number;
  implications: string[];
  actionableItems: string[];
}

export interface FeedbackCollectionRequest {
  userId: string;
  sessionId: string;
  interactionId: string;
  feedbackType: FeedbackType;
  source: FeedbackSource;
  rating?: number;
  corrections?: Omit<Correction, 'id'>[];
  clarifications?: Omit<ClarificationRequest, 'id' | 'resolved'>[];
  content?: string;
  flagReasons?: string[];
  metadata: Partial<FeedbackMetadata>;
}

export interface FeedbackAnalysisRequest {
  userId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  feedbackTypes: FeedbackType[];
  includeImplicit: boolean;
  includePatterns: boolean;
  includeCorrelations: boolean;
  minConfidence: number;
  maxResults: number;
}

export interface FeedbackSummary {
  totalFeedback: number;
  explicitFeedback: number;
  implicitFeedback: number;
  averageRating: number;
  satisfactionScore: number;
  correctionRate: number;
  abandonmentRate: number;
  topIssues: IssuePattern[];
  userPatterns: FeedbackPattern[];
  correlations: CorrelationResult[];
  trends: FeedbackTrend[];
  recommendations: string[];
}

export interface FeedbackTrend {
  metric: string;
  values: TrendValue[];
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  confidence: number; // 0-1
  insights: string[];
  predictions: TrendPrediction[];
}

export interface TrendValue {
  date: Date;
  value: number;
  confidence: number;
  context: Record<string, any>;
}

export interface TrendPrediction {
  date: Date;
  predictedValue: number;
  confidence: number;
  range: {
    min: number;
    max: number;
  };
  factors: string[];
}

export class FeedbackCollector {
  private static readonly FEEDBACK_RETENTION_DAYS = 365;
  private static readonly BATCH_SIZE = 100;
  private static readonly MIN_FEEDBACK_CONFIDENCE = 0.6;
  private static readonly MAX_CORRELATION_WINDOW_DAYS = 30;

  private cryptoKey: string;
  private batchBuffer: UserFeedback[] = [];
  private implicitBuffer: ImplicitFeedback[] = [];
  private patternCache: Map<string, FeedbackPattern> = new Map();

  constructor() {
    this.cryptoKey = process.env.FEEDBACK_COLLECTION_KEY || 'default-feedback-key';
  }

  /**
   * Main method for collecting explicit user feedback
   */
  async collectFeedback(request: FeedbackCollectionRequest): Promise<UserFeedback> {
    const startTime = Date.now();
    const feedbackId = this.generateFeedbackId();
    
    try {
      logInfo('Collecting explicit feedback', {
        componentName: 'FeedbackCollector',
        userId: request.userId,
        sessionId: request.sessionId,
        interactionId: request.interactionId,
        feedbackType: request.feedbackType,
        source: request.source
      });

      // Process corrections
      const processedCorrections = request.corrections?.map(correction => ({
        ...correction,
        id: this.generateCorrectionId(),
        severity: correction.severity || 'medium',
        affectedAreas: correction.affectedAreas || [],
        suggestedImprovements: correction.suggestedImprovements || []
      })) || [];

      // Process clarifications
      const processedClarifications = request.clarifications?.map(clarification => ({
        ...clarification,
        id: this.generateClarificationId(),
        resolved: false
      })) || [];

      // Create feedback record
      const feedback: UserFeedback = {
        id: feedbackId,
        interactionId: request.interactionId,
        userId: request.userId,
        sessionId: request.sessionId,
        type: request.feedbackType,
        source: request.source,
        status: 'collected',
        rating: request.rating,
        corrections: processedCorrections,
        clarificationRequests: processedClarifications,
        content: request.content,
        flagReasons: request.flagReasons,
        metadata: {
          sessionDuration: 0,
          responseTime: 0,
          pageViewTime: 0,
          clicks: 0,
          scrolls: 0,
          copyActions: 0,
          searchActions: 0,
          userJourney: [],
          satisfactionIndicators: [],
          systemInfo: {
            responseQuality: 0,
            responseAccuracy: 0,
            systemPerformance: 0,
            userSatisfaction: 0,
            errorRate: 0,
            uptime: 0
          },
          ...request.metadata
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database
      await this.storeFeedback(feedback);
      
      // Analyze pattern immediately for critical feedback
      if (this.isCriticalFeedback(feedback)) {
        await this.analyzeFeedbackPattern(feedback);
      }

      // Add to batch buffer for batch processing
      this.batchBuffer.push(feedback);

      // Process batch if buffer is full
      if (this.batchBuffer.length >= FeedbackCollector.BATCH_SIZE) {
        await this.processFeedbackBatch();
      }

      const processingTime = Date.now() - startTime;
      logInfo('Explicit feedback collected successfully', {
        componentName: 'FeedbackCollector',
        feedbackId,
        processingTime,
        isCritical: this.isCriticalFeedback(feedback)
      });

      return feedback;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FeedbackCollector',
        userId: request.userId,
        sessionId: request.sessionId,
        interactionId: request.interactionId,
        feedbackType: request.feedbackType
      });

      throw new Error(`Feedback collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect implicit feedback from user behavior
   */
  async collectImplicitFeedback(feedback: ImplicitFeedback): Promise<void> {
    const startTime = Date.now();
    
    try {
      logInfo('Collecting implicit feedback', {
        componentName: 'FeedbackCollector',
        userId: feedback.userId,
        sessionId: feedback.sessionId,
        interactionId: feedback.interactionId,
        engagementScore: feedback.engagementScore,
        satisfactionScore: feedback.satisfactionScore
      });

      // Analyze behavioral signals
      const behavioralAnalysis = this.analyzeBehavioralSignals(feedback);
      
      // Update feedback with analysis
      const enhancedFeedback: ImplicitFeedback = {
        ...feedback,
        metadata: {
          ...feedback.metadata,
          behavioralSignals: [...feedback.metadata.behavioralSignals, ...behavioralAnalysis]
        }
      };

      // Store in database
      await this.storeImplicitFeedback(enhancedFeedback);
      
      // Add to batch buffer
      this.implicitBuffer.push(enhancedFeedback);

      // Process batch if buffer is full
      if (this.implicitBuffer.length >= FeedbackCollector.BATCH_SIZE) {
        await this.processImplicitFeedbackBatch();
      }

      const processingTime = Date.now() - startTime;
      logInfo('Implicit feedback collected successfully', {
        componentName: 'FeedbackCollector',
        userId: feedback.userId,
        processingTime,
        signalsDetected: behavioralAnalysis.length
      });

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FeedbackCollector',
        userId: feedback.userId,
        sessionId: feedback.sessionId,
        interactionId: feedback.interactionId
      });
    }
  }

  /**
   * Analyze feedback patterns for a user or system-wide
   */
  async analyzeFeedbackPatterns(request: FeedbackAnalysisRequest): Promise<FeedbackSummary> {
    const startTime = Date.now();
    
    try {
      logInfo('Analyzing feedback patterns', {
        componentName: 'FeedbackCollector',
        userId: request.userId,
        timeRange: `${request.timeRange.start.toISOString()} to ${request.timeRange.end.toISOString()}`,
        feedbackTypes: request.feedbackTypes
      });

      // Collect feedback data
      const feedbackData = await this.getFeedbackData(request);
      
      // Analyze explicit feedback
      const explicitAnalysis = await this.analyzeExplicitFeedback(feedbackData.explicit);
      
      // Analyze implicit feedback if requested
      const implicitAnalysis = request.includeImplicit ? 
        await this.analyzeImplicitFeedback(feedbackData.implicit) : null;

      // Identify patterns if requested
      const patterns = request.includePatterns ? 
        await this.identifyFeedbackPatterns(feedbackData, request.minConfidence) : [];

      // Find correlations if requested
      const correlations = request.includeCorrelations ? 
        await this.findFeedbackCorrelations(feedbackData) : [];

      // Calculate trends
      const trends = await this.calculateFeedbackTrends(feedbackData);

      // Generate recommendations
      const recommendations = this.generateFeedbackRecommendations(
        explicitAnalysis, implicitAnalysis, patterns, correlations
      );

      const processingTime = Date.now() - startTime;
      logInfo('Feedback pattern analysis completed', {
        componentName: 'FeedbackCollector',
        processingTime,
        totalFeedback: feedbackData.explicit.length + feedbackData.implicit.length,
        patternsFound: patterns.length,
        correlationsFound: correlations.length
      });

      return {
        totalFeedback: feedbackData.explicit.length + feedbackData.implicit.length,
        explicitFeedback: feedbackData.explicit.length,
        implicitFeedback: feedbackData.implicit.length,
        averageRating: explicitAnalysis.averageRating,
        satisfactionScore: explicitAnalysis.satisfactionScore,
        correctionRate: explicitAnalysis.correctionRate,
        abandonmentRate: implicitAnalysis?.abandonmentRate || 0,
        topIssues: explicitAnalysis.topIssues,
        userPatterns: patterns,
        correlations,
        trends,
        recommendations
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FeedbackCollector',
        userId: request.userId,
        timeRange: `${request.timeRange.start.toISOString()} to ${request.timeRange.end.toISOString()}`
      });

      throw new Error(`Feedback pattern analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track user satisfaction over time
   */
  async trackUserSatisfaction(userId: string, timeRange: { start: Date; end: Date }): Promise<SatisfactionTrend> {
    try {
      const satisfactionData = await this.getSatisfactionData(userId, timeRange);
      
      return {
        userId,
        timeRange,
        scores: satisfactionData,
        trend: this.calculateSatisfactionTrend(satisfactionData),
        averageScore: satisfactionData.length > 0 ? satisfactionData.reduce((sum, data) => sum + data.score, 0) / satisfactionData.length : 0,
        confidence: this.calculateTrendConfidence(satisfactionData)
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FeedbackCollector',
        userId,
        operation: 'track_user_satisfaction'
      });

      throw error;
    }
  }

  /**
   * Identify common issues from feedback
   */
  async identifyCommonIssues(feedback: UserFeedback[]): Promise<IssuePattern[]> {
    const issueMap = new Map<string, IssuePattern>();
    
    for (const fb of feedback) {
      // Analyze corrections
      if (fb.corrections) {
        for (const correction of fb.corrections) {
          const issueKey = correction.type;
          
          if (issueMap.has(issueKey)) {
            const existing = issueMap.get(issueKey)!;
            existing.frequency++;
            existing.lastReported = new Date();
            existing.examples.push({
              interactionId: fb.interactionId,
              originalContent: correction.originalContent,
              userFeedback: fb.content || '',
              corrections: [correction],
              timestamp: fb.createdAt,
              resolution: ''
            });
          } else {
            issueMap.set(issueKey, {
              id: this.generateIssueId(),
              type: this.mapCorrectionType(correction.type) as any,
              frequency: 1,
              severity: correction.severity,
              affectedUsers: 1,
              firstReported: fb.createdAt,
              lastReported: fb.createdAt,
              status: 'investigating',
              description: `${this.mapCorrectionType(correction.type)} in user feedback`,
              examples: [{
                interactionId: fb.interactionId,
                originalContent: correction.originalContent,
                userFeedback: fb.content || '',
                corrections: [correction],
                timestamp: fb.createdAt,
                resolution: ''
              }],
              rootCauses: [],
              solutions: correction.suggestedImprovements,
              preventionMeasures: [],
              impact: {
                userSatisfaction: 0.5,
                systemReliability: 0.7,
                correctionRate: 0.1,
                abandonmentRate: 0.05,
                costImpact: 0.02,
                reputationRisk: 0.3
              }
            });
          }
        }
      }
    }

    return Array.from(issueMap.values()).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Correlate feedback with quality metrics
   */
  async correlateFeedbackWithQuality(
    feedback: UserFeedback[],
    qualityScores: { interactionId: string; quality: number; accuracy: number; satisfaction: number }[]
  ): Promise<CorrelationResult> {
    const correlationData = this.prepareCorrelationData(feedback, qualityScores);
    
    return {
      id: this.generateCorrelationId(),
      type: 'feedback_quality',
      correlationCoefficient: this.calculateCorrelationCoefficient(
        correlationData.feedbackScores,
        correlationData.qualityScores
      ),
      pValue: this.calculateStatisticalSignificance(correlationData),
      confidence: this.calculateCorrelationConfidence(correlationData),
      sampleSize: correlationData.pairs.length,
      factors: [
        { name: 'feedback_rating', type: 'independent', values: correlationData.feedbackScores, mean: 0, standardDeviation: 0, description: 'User feedback ratings' },
        { name: 'response_quality', type: 'dependent', values: correlationData.qualityScores, mean: 0, standardDeviation: 0, description: 'System response quality scores' }
      ],
      insights: this.generateCorrelationInsights(correlationData),
      recommendations: this.generateCorrelationRecommendations(correlationData),
      timeFrame: {
        start: new Date(),
        end: new Date()
      }
    };
  }

  // Private helper methods

  private async storeFeedback(feedback: UserFeedback): Promise<void> {
    try {
      const { error } = await (supabase
        .from('user_feedback') as any)
        .insert([{
          id: feedback.id,
          interaction_id: feedback.interactionId,
          user_id: feedback.userId,
          session_id: feedback.sessionId,
          type: feedback.type,
          source: feedback.source,
          status: feedback.status,
          rating: feedback.rating,
          corrections: feedback.corrections,
          clarification_requests: feedback.clarificationRequests,
          content: feedback.content,
          flag_reasons: feedback.flagReasons,
          metadata: feedback.metadata,
          created_at: feedback.createdAt.toISOString(),
          updated_at: feedback.updatedAt.toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logWarning('Failed to store feedback in database', { feedbackId: feedback.id, error });
    }
  }

  private async storeImplicitFeedback(feedback: ImplicitFeedback): Promise<void> {
    try {
      const { error } = await (supabase
        .from('implicit_feedback') as any)
        .insert([{
          user_id: feedback.userId,
          session_id: feedback.sessionId,
          interaction_id: feedback.interactionId,
          time_spent: feedback.timeSpent,
          scroll_depth: feedback.scrollDepth,
          dwell_time: feedback.dwellTime,
          follow_up_questions: feedback.followUpQuestions,
          corrections: feedback.corrections,
          alternative_searches: feedback.alternativeSearches,
          session_abandonment: feedback.sessionAbandonment,
          engagement_score: feedback.engagementScore,
          satisfaction_score: feedback.satisfactionScore,
          interaction_quality: feedback.interactionQuality,
          metadata: feedback.metadata,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logWarning('Failed to store implicit feedback in database', { 
        userId: feedback.userId, 
        interactionId: feedback.interactionId, 
        error 
      });
    }
  }

  private analyzeBehavioralSignals(feedback: ImplicitFeedback): BehavioralSignal[] {
    const signals: BehavioralSignal[] = [];

    // Analyze abandonment
    if (feedback.sessionAbandonment) {
      signals.push({
        type: 'abandonment',
        confidence: 0.8,
        context: { abandonmentPoint: feedback.abandonmentPoint },
        timestamp: new Date(),
        indicators: ['early_session_end', 'no_follow_up_questions']
      });
    }

    // Analyze engagement
    if (feedback.engagementScore > 0.7) {
      signals.push({
        type: 'engagement',
        confidence: feedback.engagementScore,
        context: { timeSpent: feedback.timeSpent, scrollDepth: feedback.scrollDepth },
        timestamp: new Date(),
        indicators: ['high_engagement_score', 'deep_content_interaction']
      });
    }

    // Analyze corrections
    if (feedback.corrections > 0) {
      signals.push({
        type: 'frustration',
        confidence: 0.6,
        context: { correctionCount: feedback.corrections },
        timestamp: new Date(),
        indicators: ['multiple_corrections', 'response_issues']
      });
    }

    return signals;
  }

  private isCriticalFeedback(feedback: UserFeedback): boolean {
    return (
      feedback.type === 'flag' ||
      feedback.rating === 1 ||
      feedback.corrections?.some(c => c.severity === 'critical') ||
      feedback.corrections?.some(c => c.type === 'factual_error')
    ) || false;
  }

  private async analyzeFeedbackPattern(feedback: UserFeedback): Promise<void> {
    // This would integrate with pattern recognition and learning engine
    // For now, just log the critical feedback
    logInfo('Critical feedback detected - pattern analysis triggered', {
      componentName: 'FeedbackCollector',
      feedbackId: feedback.id,
      type: feedback.type,
      rating: feedback.rating,
      correctionCount: feedback.corrections?.length || 0
    });
  }

  private async processFeedbackBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = this.batchBuffer.splice(0, FeedbackCollector.BATCH_SIZE);
    
    try {
      // Process batch for pattern analysis
      const patterns = await this.batchAnalyzePatterns(batch);
      
      // Update pattern cache
      for (const pattern of patterns) {
        this.patternCache.set(pattern.id, pattern);
      }

      logInfo('Processed feedback batch', {
        componentName: 'FeedbackCollector',
        batchSize: batch.length,
        patternsFound: patterns.length
      });

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FeedbackCollector',
        operation: 'process_feedback_batch',
        batchSize: batch.length
      });
    }
  }

  private async processImplicitFeedbackBatch(): Promise<void> {
    if (this.implicitBuffer.length === 0) return;

    const batch = this.implicitBuffer.splice(0, FeedbackCollector.BATCH_SIZE);
    
    try {
      // Process implicit feedback batch for behavioral analysis
      // This would integrate with behavioral pattern analysis
      
      logInfo('Processed implicit feedback batch', {
        componentName: 'FeedbackCollector',
        batchSize: batch.length
      });

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FeedbackCollector',
        operation: 'process_implicit_feedback_batch',
        batchSize: batch.length
      });
    }
  }

  private async batchAnalyzePatterns(feedback: UserFeedback[]): Promise<FeedbackPattern[]> {
    // Simplified pattern analysis
    const patterns: FeedbackPattern[] = [];
    
    // Group feedback by type
    const typeGroups = feedback.reduce((groups, fb) => {
      if (!groups[fb.type]) groups[fb.type] = [];
      groups[fb.type].push(fb);
      return groups;
    }, {} as Record<string, UserFeedback[]>);

    // Analyze each type group
    for (const [type, group] of Object.entries(typeGroups)) {
      if (group.length >= 3) { // Minimum threshold for pattern
        const pattern: FeedbackPattern = {
          id: this.generatePatternId(),
          userId: group[0].userId,
          patternType: this.mapFeedbackTypeToPattern(type),
          pattern: {
            frequency: group.length,
            averageRating: this.calculateAverageRating(group),
            commonCorrections: this.findCommonCorrections(group),
            timeDistribution: this.analyzeTimeDistribution(group)
          },
          confidence: Math.min(0.9, 0.5 + (group.length * 0.1)),
          frequency: group.length,
          lastOccurrence: new Date(Math.max(...group.map(fb => fb.createdAt.getTime()))),
          firstOccurrence: new Date(Math.min(...group.map(fb => fb.createdAt.getTime()))),
          context: {
            timeOfDay: this.extractTimeOfDay(group),
            deviceTypes: this.extractDeviceTypes(group),
            sessionTypes: ['chat', 'study_assistant'],
            queryTypes: ['factual', 'explanatory', 'creative'],
            subjectAreas: this.extractSubjectAreas(group),
            responseTypes: ['text', 'structured', 'step_by_step']
          },
          insights: [],
          recommendations: []
        };
        
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  // Database query methods
  private async getFeedbackData(request: FeedbackAnalysisRequest): Promise<{ explicit: UserFeedback[], implicit: ImplicitFeedback[] }> {
    // This would query the database for feedback data
    // For now, return empty arrays (would be implemented with actual database queries)
    return { explicit: [], implicit: [] };
  }

  private async getSatisfactionData(userId: string, timeRange: { start: Date; end: Date }): Promise<{ date: Date; score: number; confidence: number }[]> {
    // This would query satisfaction data from database
    return [];
  }

  // Analysis methods
  private async analyzeExplicitFeedback(feedback: UserFeedback[]): Promise<any> {
    return {
      averageRating: feedback.filter(fb => fb.rating).reduce((sum, fb) => sum + (fb.rating || 0), 0) / feedback.filter(fb => fb.rating).length,
      satisfactionScore: this.calculateSatisfactionScore(feedback),
      correctionRate: feedback.filter(fb => fb.corrections && fb.corrections.length > 0).length / feedback.length,
      topIssues: await this.identifyCommonIssues(feedback)
    };
  }

  private async analyzeImplicitFeedback(feedback: ImplicitFeedback[]): Promise<any> {
    return {
      abandonmentRate: feedback.filter(fb => fb.sessionAbandonment).length / feedback.length,
      averageEngagement: feedback.reduce((sum, fb) => sum + fb.engagementScore, 0) / feedback.length,
      averageSatisfaction: feedback.reduce((sum, fb) => sum + fb.satisfactionScore, 0) / feedback.length
    };
  }

  private async identifyFeedbackPatterns(feedback: { explicit: UserFeedback[], implicit: ImplicitFeedback[] }, minConfidence: number): Promise<FeedbackPattern[]> {
    // Combine explicit and implicit patterns
    const explicitPatterns = await this.batchAnalyzePatterns(feedback.explicit);
    return explicitPatterns.filter(p => p.confidence >= minConfidence);
  }

  private async findFeedbackCorrelations(feedback: { explicit: UserFeedback[], implicit: ImplicitFeedback[] }): Promise<CorrelationResult[]> {
    // This would perform correlation analysis
    return [];
  }

  private async calculateFeedbackTrends(feedback: { explicit: UserFeedback[], implicit: ImplicitFeedback[] }): Promise<FeedbackTrend[]> {
    return [];
  }

  // Utility methods
  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrectionId(): string {
    return `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateClarificationId(): string {
    return `clarification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePatternId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `correlation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapFeedbackTypeToPattern(type: string): any {
    const mapping: Record<string, any> = {
      'correction': 'correction_frequency',
      'rating': 'satisfaction_trend',
      'follow_up': 'engagement_pattern',
      'abandonment': 'abandonment_trigger'
    };
    return mapping[type] || 'satisfaction_trend';
  }

  private calculateAverageRating(feedback: UserFeedback[]): number {
    const rated = feedback.filter(fb => fb.rating);
    return rated.length > 0 ? rated.reduce((sum, fb) => sum + (fb.rating || 0), 0) / rated.length : 0;
  }

  private findCommonCorrections(feedback: UserFeedback[]): string[] {
    const correctionTypes = feedback.flatMap(fb => fb.corrections || []).map(c => c.type);
    const counts = correctionTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);
  }

  private analyzeTimeDistribution(feedback: UserFeedback[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    feedback.forEach(fb => {
      const hour = fb.createdAt.getHours();
      const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      distribution[timeSlot] = (distribution[timeSlot] || 0) + 1;
    });
    return distribution;
  }

  private extractTimeOfDay(feedback: UserFeedback[]): string[] {
    return Array.from(new Set(feedback.map(fb => {
      const hour = fb.createdAt.getHours();
      return hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    })));
  }

  private extractDeviceTypes(feedback: UserFeedback[]): string[] {
    return Array.from(new Set(feedback.map(fb => fb.metadata.deviceInfo?.type || 'unknown')));
  }

  private extractSubjectAreas(feedback: UserFeedback[]): string[] {
    // This would extract subject areas from interaction context
    return ['general', 'mathematics', 'science'];
  }

  private calculateSatisfactionScore(feedback: UserFeedback[]): number {
    // Weighted satisfaction calculation
    const rated = feedback.filter(fb => fb.rating);
    if (rated.length === 0) return 0.5; // neutral

    const averageRating = this.calculateAverageRating(rated);
    const correctionPenalty = feedback.filter(fb => fb.corrections && fb.corrections.length > 0).length / feedback.length;
    
    return Math.max(0, Math.min(1, (averageRating / 5) - (correctionPenalty * 0.3)));
  }

  private calculateSatisfactionTrend(data: { date: Date; score: number; confidence: number }[]): 'improving' | 'declining' | 'stable' | 'volatile' {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-5); // last 5 data points
    const trend = recent[recent.length - 1].score - recent[0].score;
    
    if (Math.abs(trend) < 0.1) return 'stable';
    return trend > 0 ? 'improving' : 'declining';
  }

  private calculateTrendConfidence(data: { date: Date; score: number; confidence: number }[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.confidence, 0) / data.length;
  }

  private prepareCorrelationData(feedback: UserFeedback[], qualityScores: any[]): any {
    return {
      pairs: feedback.map(fb => ({
        feedbackScore: fb.rating || 0,
        qualityScore: qualityScores.find(qs => qs.interactionId === fb.interactionId)?.quality || 0
      })),
      feedbackScores: feedback.map(fb => fb.rating || 0).filter(r => r > 0),
      qualityScores: qualityScores.map(qs => qs.quality)
    };
  }

  private calculateCorrelationCoefficient(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateStatisticalSignificance(data: any): number {
    // Simplified p-value calculation
    return 0.05; // placeholder
  }

  private calculateCorrelationConfidence(data: any): number {
    // Confidence based on sample size and correlation strength
    return Math.min(0.95, 0.5 + (data.pairs.length * 0.01));
  }

  private generateCorrelationInsights(data: any): CorrelationInsight[] {
    const coefficient = this.calculateCorrelationCoefficient(data.feedbackScores, data.qualityScores);
    const type = Math.abs(coefficient) > 0.7 ? (coefficient > 0 ? 'strong_positive' : 'strong_negative') :
                 Math.abs(coefficient) > 0.3 ? (coefficient > 0 ? 'weak_positive' : 'weak_negative') : 'neutral';
    
    return [{
      type,
      description: `Feedback ratings show ${type.replace('_', ' ')} correlation with response quality`,
      confidence: 0.8,
      implications: ['User feedback is a reliable indicator of response quality'],
      actionableItems: ['Use feedback ratings for quality monitoring', 'Implement early warning for low-quality responses']
    }];
  }

  private generateCorrelationRecommendations(data: any): string[] {
    return [
      'Monitor correlation between feedback and quality metrics',
      'Use feedback trends for proactive quality improvement',
      'Implement feedback-based quality gates'
    ];
  }

  private generateFeedbackRecommendations(explicit: any, implicit: any, patterns: FeedbackPattern[], correlations: CorrelationResult[]): string[] {
    const recommendations: string[] = [];
    
    if (explicit.correctionRate > 0.1) {
      recommendations.push('High correction rate detected - review response generation quality');
    }
    
    if (implicit && implicit.abandonmentRate > 0.15) {
      recommendations.push('High abandonment rate - improve response engagement and relevance');
    }
    
    if (patterns.length > 0) {
      recommendations.push('Multiple feedback patterns detected - implement targeted improvements');
    }
    
    return recommendations;
  }

  private mapCorrectionType(correctionType: string): string {
    const mapping: Record<string, string> = {
      'factual_error': 'factual_inaccuracy',
      'incomplete_answer': 'incompleteness',
      'off_topic': 'relevance_issue',
      'too_complex': 'complexity_mismatch',
      'too_simple': 'complexity_mismatch',
      'style_issue': 'style_issue',
      'other': 'clarity_problem'
    };
    return mapping[correctionType] || 'clarity_problem';
  }
}

// Export singleton instance
export const feedbackCollector = new FeedbackCollector();

// Convenience functions
export const collectFeedback = (request: FeedbackCollectionRequest) =>
  feedbackCollector.collectFeedback(request);

export const collectImplicitFeedback = (feedback: ImplicitFeedback) =>
  feedbackCollector.collectImplicitFeedback(feedback);

export const analyzeFeedbackPatterns = (request: FeedbackAnalysisRequest) =>
  feedbackCollector.analyzeFeedbackPatterns(request);

export const trackUserSatisfaction = (userId: string, timeRange: { start: Date; end: Date }) =>
  feedbackCollector.trackUserSatisfaction(userId, timeRange);

export const identifyCommonIssues = (feedback: UserFeedback[]) =>
  feedbackCollector.identifyCommonIssues(feedback);

export const correlateFeedbackWithQuality = (feedback: UserFeedback[], qualityScores: any[]) =>
  feedbackCollector.correlateFeedbackWithQuality(feedback, qualityScores);

export interface SatisfactionTrend {
  userId: string;
  timeRange: { start: Date; end: Date };
  scores: Array<{ date: Date; score: number; confidence: number }>;
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  averageScore: number;
  confidence: number;
}