// Layer 3: Response Validation & Fact-Checking System
// ====================================================
// ConfidenceScorer - Confidence calculation, uncertainty quantification, and follow-up recommendations

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';
import type { AIResponse, ContextData } from './ResponseValidator';
import type { FactCheckSummary, VerificationStatus } from './FactChecker';

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high';
export type ConfidenceType = 'overall' | 'factual' | 'contextual' | 'methodological' | 'temporal' | 'source_reliability';
export type RecommendationAction = 'accept' | 'review' | 'verify' | 'reject' | 'request_human';
export type UncertaintyType = 'knowledge_gap' | 'conflicting_evidence' | 'outdated_information' | 'ambiguous_claim' | 'incomplete_context';

export interface ConfidenceScore {
  overall: number; // 0-1
  byType: Record<ConfidenceType, number>;
  byClaim: Map<string, number>;
  uncertaintyFactors: UncertaintyFactor[];
  recommendation: RecommendationAction;
  confidenceLevel: ConfidenceLevel;
  evidence: ConfidenceEvidence;
  processingTime: number;
  calculatedAt: Date;
  scoreId: string;
}

export interface UncertaintyFactor {
  type: UncertaintyType;
  description: string;
  impact: number; // 0-1, how much it reduces confidence
  evidence: string[];
  affectedClaims: string[];
  mitigation: string[];
}

export interface ConfidenceEvidence {
  supportingEvidence: string[];
  contradictingEvidence: string[];
  sourceQuality: SourceQualityAssessment;
  claimVerification: ClaimVerificationData;
  contextualFactors: ContextualFactor[];
}

export interface SourceQualityAssessment {
  totalSources: number;
  highQualitySources: number;
  reliableSources: number;
  verifiedSources: number;
  averageReliability: number;
  sourceDiversity: number;
}

export interface ClaimVerificationData {
  totalClaims: number;
  verifiedClaims: number;
  disputedClaims: number;
  unverifiedClaims: number;
  verificationMethods: Record<VerificationStatus, number>;
}

export interface ContextualFactor {
  factor: string;
  impact: number; // 0-1
  description: string;
  evidence: string[];
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  purpose: 'clarification' | 'verification' | 'expansion' | 'fact_check' | 'context';
  priority: 'low' | 'medium' | 'high' | 'critical';
  priorityValue: number; // 0-1, calculated from priority
  estimatedValue: number; // 0-1, how much it would improve confidence
  relatedClaims: string[];
  suggestedSources: string[];
}

export interface ConfidenceRequest {
  response: AIResponse;
  context: ContextData;
  factCheckSummary?: FactCheckSummary;
  validationLevel: 'basic' | 'standard' | 'enhanced';
  includeFollowUp: boolean;
  includeUncertaintyAnalysis: boolean;
  considerTemporalFactors: boolean;
  assessSourceReliability: boolean;
  metadata?: Record<string, any>;
}

export interface CoherenceScore {
  overall: number; // 0-1
  logical: number; // 0-1
  structural: number; // 0-1
  consistency: number; // 0-1
  flow: number; // 0-1
  evidence: string[];
  issues: CoherenceIssue[];
}

export interface CoherenceIssue {
  type: 'logical_gap' | 'inconsistency' | 'contradiction' | 'ambiguity' | 'missing_evidence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  impact: number; // 0-1
  suggestion: string;
}

export class ConfidenceScorer {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly LOW_CONFIDENCE_THRESHOLD = 0.4;
  private static readonly CRITICAL_UNCERTAINTY_THRESHOLD = 0.7;

  private cryptoKey: string;
  private confidenceCache: Map<string, ConfidenceScore> = new Map();
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cryptoKey = process.env.CONFIDENCE_SCORER_KEY || 'default-confidence-key';
    this.startCacheCleanup();
  }

  /**
   * Main confidence calculation method
   */
  async calculateConfidence(request: ConfidenceRequest): Promise<ConfidenceScore> {
    const startTime = Date.now();
    const scoreId = this.generateScoreId(request.response.id, request.validationLevel);
    
    try {
      logInfo('Confidence scoring started', {
        componentName: 'ConfidenceScorer',
        scoreId,
        responseId: request.response.id,
        validationLevel: request.validationLevel,
        includeFollowUp: request.includeFollowUp
      });

      // Check cache first
      const cached = this.getCachedConfidence(scoreId);
      if (cached) {
        logInfo('Confidence cache hit', {
          componentName: 'ConfidenceScorer',
          scoreId,
          cachedAt: cached.calculatedAt
        });
        return cached;
      }

      // Calculate confidence by type
      const confidenceByType = await this.calculateConfidenceByType(request);
      
      // Calculate confidence by individual claims
      const confidenceByClaim = await this.calculateClaimConfidence(request);
      
      // Identify uncertainty factors
      const uncertaintyFactors = request.includeUncertaintyAnalysis ? 
        await this.identifyUncertaintyFactors(request) : [];
      
      // Build evidence structure
      const evidence = await this.buildConfidenceEvidence(request);
      
      // Determine overall confidence
      const overall = this.calculateOverallConfidence(confidenceByType, confidenceByClaim, uncertaintyFactors);
      
      // Determine recommendation
      const recommendation = this.determineRecommendation(overall, uncertaintyFactors, request);
      
      // Determine confidence level
      const confidenceLevel = this.determineConfidenceLevel(overall);
      
      const confidenceScore: ConfidenceScore = {
        overall,
        byType: confidenceByType,
        byClaim: confidenceByClaim,
        uncertaintyFactors,
        recommendation,
        confidenceLevel,
        evidence,
        processingTime: Date.now() - startTime,
        calculatedAt: new Date(),
        scoreId
      };

      // Cache result
      this.cacheConfidence(scoreId, confidenceScore);
      
      // Log results
      logInfo('Confidence scoring completed', {
        componentName: 'ConfidenceScorer',
        scoreId,
        overallConfidence: overall,
        recommendation,
        uncertaintyFactorsCount: uncertaintyFactors.length,
        processingTime: confidenceScore.processingTime
      });

      // Store confidence score in database
      await this.storeConfidenceRecord(confidenceScore, request);

      return confidenceScore;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConfidenceScorer',
        scoreId,
        responseId: request.response.id,
        processingTime
      });

      return this.createFailedConfidenceResult(scoreId, processingTime, error);
    }
  }

  /**
   * Assess source reliability and quality
   */
  async assessSourceReliability(sources: any[], context: ContextData): Promise<SourceQualityAssessment> {
    try {
      const assessment: SourceQualityAssessment = {
        totalSources: sources.length,
        highQualitySources: 0,
        reliableSources: 0,
        verifiedSources: 0,
        averageReliability: 0,
        sourceDiversity: 0
      };

      if (sources.length === 0) return assessment;

      let totalReliability = 0;
      const sourceTypes = new Set<string>();
      const sourceAuthors = new Set<string>();

      for (const source of sources) {
        const reliability = source.reliability_score || 0.5;
        totalReliability += reliability;
        
        if (reliability >= 0.8) {
          assessment.highQualitySources++;
        }
        
        if (reliability >= 0.7) {
          assessment.reliableSources++;
        }
        
        if (source.verification_status === 'verified') {
          assessment.verifiedSources++;
        }
        
        if (source.source_type) {
          sourceTypes.add(source.source_type);
        }
        
        if (source.author) {
          sourceAuthors.add(source.author);
        }
      }

      assessment.averageReliability = totalReliability / sources.length;
      assessment.sourceDiversity = (sourceTypes.size * 0.6) + (sourceAuthors.size > 1 ? 0.4 : 0);

      return assessment;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConfidenceScorer',
        operation: 'assess_source_reliability',
        sourceCount: sources.length
      });

      return {
        totalSources: sources.length,
        highQualitySources: 0,
        reliableSources: 0,
        verifiedSources: 0,
        averageReliability: 0,
        sourceDiversity: 0
      };
    }
  }

  /**
   * Evaluate response coherence
   */
  async evaluateResponseCoherence(response: AIResponse, context: ContextData): Promise<CoherenceScore> {
    try {
      logInfo('Response coherence evaluation started', {
        componentName: 'ConfidenceScorer',
        responseId: response.id,
        contentLength: response.content.length
      });

      const content = response.content;
      const sentences = this.splitIntoSentences(content);
      const paragraphs = this.splitIntoParagraphs(content);
      
      // Assess logical coherence
      const logical = this.assessLogicalCoherence(sentences, context);
      
      // Assess structural coherence
      const structural = this.assessStructuralCoherence(content, paragraphs);
      
      // Assess consistency
      const consistency = this.assessConsistency(sentences);
      
      // Assess flow
      const flow = this.assessFlow(sentences, paragraphs);
      
      const overall = (logical + structural + consistency + flow) / 4;
      
      // Identify coherence issues
      const issues = this.identifyCoherenceIssues(logical, structural, consistency, flow, sentences);
      
      return {
        overall,
        logical,
        structural,
        consistency,
        flow,
        evidence: this.generateCoherenceEvidence(logical, structural, consistency, flow),
        issues
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConfidenceScorer',
        responseId: response.id,
        operation: 'evaluate_coherence'
      });

      return {
        overall: 0,
        logical: 0,
        structural: 0,
        consistency: 0,
        flow: 0,
        evidence: ['Coherence evaluation failed'],
        issues: [{
          type: 'logical_gap',
          severity: 'critical',
          description: 'Coherence evaluation failed',
          location: 'entire response',
          impact: 1.0,
          suggestion: 'Manual review required'
        }]
      };
    }
  }

  /**
   * Identify uncertain areas in the response
   */
  async identifyUncertainAreas(response: AIResponse, context: ContextData): Promise<UncertaintyFactor[]> {
    try {
      const uncertainAreas: UncertaintyFactor[] = [];
      
      // Analyze content for uncertainty indicators
      const uncertaintyIndicators = this.detectUncertaintyIndicators(response.content);
      
      // Check for knowledge gaps
      const knowledgeGaps = await this.identifyKnowledgeGaps(response, context);
      uncertainAreas.push(...knowledgeGaps);
      
      // Check for conflicting evidence
      const conflictingEvidence = await this.identifyConflictingEvidence(response, context);
      uncertainAreas.push(...conflictingEvidence);
      
      // Check for outdated information
      const outdatedInfo = await this.identifyOutdatedInformation(response, context);
      uncertainAreas.push(...outdatedInfo);
      
      // Check for ambiguous claims
      const ambiguousClaims = this.identifyAmbiguousClaims(response.content);
      uncertainAreas.push(...ambiguousClaims);
      
      // Check for incomplete context
      const incompleteContext = this.identifyIncompleteContext(response, context);
      uncertainAreas.push(...incompleteContext);
      
      return uncertainAreas;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConfidenceScorer',
        responseId: response.id,
        operation: 'identify_uncertain_areas'
      });

      return [{
        type: 'knowledge_gap',
        description: 'Uncertainty analysis failed',
        impact: 0.5,
        evidence: ['System error in uncertainty analysis'],
        affectedClaims: [],
        mitigation: ['Manual review recommended']
      }];
    }
  }

  /**
   * Suggest follow-up questions to improve confidence
   */
  async suggestFollowUpQuestions(response: AIResponse, context: ContextData, maxQuestions: number = 5): Promise<FollowUpQuestion[]> {
    try {
      const questions: FollowUpQuestion[] = [];
      
      // Analyze response for areas needing clarification
      const clarityIssues = this.identifyClarityIssues(response.content);
      
      // Generate verification questions
      const verificationQuestions = await this.generateVerificationQuestions(response, context);
      questions.push(...verificationQuestions);
      
      // Generate expansion questions
      const expansionQuestions = await this.generateExpansionQuestions(response, context);
      questions.push(...expansionQuestions);
      
      // Generate fact-checking questions
      const factCheckQuestions = await this.generateFactCheckQuestions(response, context);
      questions.push(...factCheckQuestions);
      
      // Generate context questions
      const contextQuestions = await this.generateContextQuestions(response, context);
      questions.push(...contextQuestions);
      
      // Sort by priority and estimated value
      const sortedQuestions = questions
        .sort((a, b) => (b.priorityValue * b.estimatedValue) - (a.priorityValue * a.estimatedValue))
        .slice(0, maxQuestions);
      
      return sortedQuestions;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ConfidenceScorer',
        responseId: response.id,
        operation: 'suggest_follow_ups'
      });

      return [{
        id: 'fallback_question',
        question: 'Could you clarify or provide more specific information about your response?',
        purpose: 'clarification',
        priority: 'high',
        priorityValue: 0.8,
        estimatedValue: 0.3,
        relatedClaims: [],
        suggestedSources: []
      }];
    }
  }

  /**
   * Private implementation methods
   */

  private async calculateConfidenceByType(request: ConfidenceRequest): Promise<Record<ConfidenceType, number>> {
    const { response, context, factCheckSummary } = request;
    
    // Factual confidence
    const factual = factCheckSummary ? 
      (factCheckSummary.verifiedClaims * 1.0 + factCheckSummary.disputedClaims * 0.5) / Math.max(1, factCheckSummary.totalClaims) :
      0.7;
    
    // Contextual confidence
    const contextual = this.assessContextualConfidence(response, context);
    
    // Methodological confidence
    const methodological = this.assessMethodologicalConfidence(response);
    
    // Temporal confidence
    const temporal = request.considerTemporalFactors ? 
      this.assessTemporalConfidence(response, context) : 0.8;
    
    // Source reliability confidence
    const sourceReliability = request.assessSourceReliability ?
      await this.assessSourceReliabilityConfidence(response, context) : 0.7;
    
    return {
      overall: 0, // Will be calculated separately
      factual,
      contextual,
      methodological,
      temporal,
      source_reliability: sourceReliability
    };
  }

  private async calculateClaimConfidence(request: ConfidenceRequest): Promise<Map<string, number>> {
    const claimConfidence = new Map<string, number>();
    
    try {
      // Extract claims from response
      const claims = await this.extractClaims(request.response.content);
      
      for (const claim of claims) {
        // Calculate confidence for each claim
        const confidence = await this.calculateSingleClaimConfidence(claim, request);
        claimConfidence.set(claim.id, confidence);
      }
      
      return claimConfidence;
      
    } catch (error) {
      logWarning('Failed to calculate claim confidence', { error });
      return new Map();
    }
  }

  private async calculateSingleClaimConfidence(claim: any, request: ConfidenceRequest): Promise<number> {
    let confidence = 0.5; // Base confidence
    
    try {
      // Adjust based on claim clarity
      const clarity = this.assessClaimClarity(claim.text);
      confidence = (confidence + clarity) / 2;
      
      // Adjust based on evidence availability
      const evidenceScore = await this.assessClaimEvidence(claim, request.context);
      confidence = (confidence + evidenceScore) / 2;
      
      // Adjust based on source quality
      const sourceScore = this.assessClaimSourceQuality(claim, request.context);
      confidence = (confidence + sourceScore) / 2;
      
      return Math.max(0.1, Math.min(1.0, confidence));
      
    } catch (error) {
      return 0.3; // Low confidence on error
    }
  }

  private async identifyUncertaintyFactors(request: ConfidenceRequest): Promise<UncertaintyFactor[]> {
    const factors: UncertaintyFactor[] = [];
    
    try {
      // Check for knowledge gaps
      const knowledgeGaps = await this.identifyKnowledgeGaps(request.response, request.context);
      factors.push(...knowledgeGaps);
      
      // Check for conflicting evidence
      const conflictingEvidence = await this.identifyConflictingEvidence(request.response, request.context);
      factors.push(...conflictingEvidence);
      
      // Check for outdated information
      const outdatedInfo = await this.identifyOutdatedInformation(request.response, request.context);
      factors.push(...outdatedInfo);
      
      // Check for ambiguous claims
      const ambiguousClaims = this.identifyAmbiguousClaims(request.response.content);
      factors.push(...ambiguousClaims);
      
      // Check for incomplete context
      const incompleteContext = this.identifyIncompleteContext(request.response, request.context);
      factors.push(...incompleteContext);
      
      return factors;
      
    } catch (error) {
      logWarning('Failed to identify uncertainty factors', { error });
      return [];
    }
  }

  private async buildConfidenceEvidence(request: ConfidenceRequest): Promise<ConfidenceEvidence> {
    const evidence: ConfidenceEvidence = {
      supportingEvidence: [],
      contradictingEvidence: [],
      sourceQuality: await this.assessSourceReliability(request.context.externalSources || [], request.context),
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
    };
    
    if (request.factCheckSummary) {
      evidence.claimVerification = {
        totalClaims: request.factCheckSummary.totalClaims,
        verifiedClaims: request.factCheckSummary.verifiedClaims,
        disputedClaims: request.factCheckSummary.disputedClaims,
        unverifiedClaims: request.factCheckSummary.unverifiedClaims,
        verificationMethods: {
          verified: request.factCheckSummary.verifiedClaims,
          disputed: request.factCheckSummary.disputedClaims,
          inconclusive: 0,
          unverified: request.factCheckSummary.unverifiedClaims
        }
      };
    }
    
    return evidence;
  }

  private calculateOverallConfidence(
    confidenceByType: Record<ConfidenceType, number>,
    confidenceByClaim: Map<string, number>,
    uncertaintyFactors: UncertaintyFactor[]
  ): number {
    // Weighted average of different confidence types
    const weights: Record<ConfidenceType, number> = {
      overall: 0,
      factual: 0.3,
      contextual: 0.25,
      methodological: 0.2,
      temporal: 0.15,
      source_reliability: 0.1
    };
    
    const weightedSum = Object.entries(confidenceByType).reduce((sum, [type, confidence]) => {
      if (type === 'overall') return sum;
      const weight = weights[type as ConfidenceType] || 0.1;
      return sum + (confidence * weight);
    }, 0);
    
    // Adjust for uncertainty factors
    const uncertaintyPenalty = uncertaintyFactors.reduce((penalty, factor) => 
      penalty + (factor.impact * 0.1), 0);
    
    return Math.max(0, Math.min(1, weightedSum - uncertaintyPenalty));
  }

  private determineRecommendation(
    overall: number,
    uncertaintyFactors: UncertaintyFactor[],
    request: ConfidenceRequest
  ): RecommendationAction {
    const criticalUncertainties = uncertaintyFactors.filter(f => f.impact > 0.7);
    
    if (overall >= 0.8 && criticalUncertainties.length === 0) {
      return 'accept';
    } else if (overall >= 0.6 && criticalUncertainties.length < 2) {
      return 'review';
    } else if (overall >= 0.4) {
      return 'verify';
    } else if (overall >= 0.2) {
      return 'request_human';
    } else {
      return 'reject';
    }
  }

  private determineConfidenceLevel(overall: number): ConfidenceLevel {
    if (overall >= 0.8) return 'very_high';
    if (overall >= 0.65) return 'high';
    if (overall >= 0.5) return 'medium';
    return 'low';
  }

  // Assessment helper methods
  private assessContextualConfidence(response: AIResponse, context: ContextData): number {
    let confidence = 0.5;
    
    // Check if response relates to user profile
    if (context.userProfile?.academicLevel) {
      confidence += 0.1;
    }
    
    // Check conversation history relevance
    if (context.conversationHistory?.length > 0) {
      confidence += 0.1;
    }
    
    // Check knowledge base relevance
    if (context.knowledgeBase?.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  private assessMethodologicalConfidence(response: AIResponse): number {
    let confidence = 0.6;
    
    // Check for structured approach
    if (response.content.includes('step') || response.content.includes('first') || response.content.includes('second')) {
      confidence += 0.1;
    }
    
    // Check for evidence references
    if (response.content.includes('according to') || response.content.includes('research shows')) {
      confidence += 0.1;
    }
    
    // Check for uncertainty indicators
    if (response.content.includes('might') || response.content.includes('could be') || response.content.includes('possibly')) {
      confidence -= 0.1;
    }
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  private assessTemporalConfidence(response: AIResponse, context: ContextData): number {
    // Check if response contains time-sensitive information
    const timeSensitive = /\b(2020|2021|2022|2023|2024|2025)\b/.test(response.content);
    if (timeSensitive) {
      // If response is old, confidence might be lower
      return 0.6;
    }
    
    return 0.8; // Non-time-sensitive content has higher temporal confidence
  }

  private async assessSourceReliabilityConfidence(response: AIResponse, context: ContextData): Promise<number> {
    if (!context.externalSources || context.externalSources.length === 0) {
      return 0.5; // Neutral if no sources
    }
    
    const totalReliability = context.externalSources.reduce((sum, source) => 
      sum + (source.reliability_score || 0.5), 0);
    
    return totalReliability / context.externalSources.length;
  }

  // Claim and content analysis methods
  private async extractClaims(content: string): Promise<any[]> {
    const sentences = this.splitIntoSentences(content);
    return sentences
      .filter(sentence => this.isFactualClaim(sentence))
      .map((sentence, index) => ({
        id: `claim_${index}`,
        text: sentence,
        type: 'factual',
        confidence: 0.7
      }));
  }

  private isFactualClaim(sentence: string): boolean {
    // Simple heuristic for factual claims
    return sentence.includes('is') || sentence.includes('are') || sentence.includes('was') || 
           sentence.includes('were') || sentence.includes('has') || sentence.includes('have') ||
           /\d+/.test(sentence);
  }

  private assessClaimClarity(claimText: string): number {
    let clarity = 0.5;
    
    // Check for specific vs. vague language
    if (/\b(might|could|possibly|perhaps)\b/i.test(claimText)) {
      clarity -= 0.2;
    }
    
    if (/\d+/.test(claimText)) {
      clarity += 0.1; // Numbers increase clarity
    }
    
    if (claimText.length < 10) {
      clarity -= 0.1; // Very short claims might be too vague
    }
    
    if (claimText.length > 200) {
      clarity -= 0.1; // Very long claims might be confusing
    }
    
    return Math.max(0.1, Math.min(1.0, clarity));
  }

  private async assessClaimEvidence(claim: any, context: ContextData): Promise<number> {
    // Check if claim is supported by context
    const contextTexts = [
      ...(context.knowledgeBase || []).map((item: any) => item.content),
      ...(context.externalSources || []).map((item: any) => item.content)
    ];
    
    const relevantContexts = contextTexts.filter(text => 
      this.calculateSimilarity(claim.text, text) > 0.3
    );
    
    return Math.min(1.0, relevantContexts.length * 0.2);
  }

  private assessClaimSourceQuality(claim: any, context: ContextData): number {
    if (!context.externalSources || context.externalSources.length === 0) {
      return 0.5;
    }
    
    const avgReliability = context.externalSources.reduce((sum, source: any) => 
      sum + (source.reliability_score || 0.5), 0) / context.externalSources.length;
    
    return avgReliability;
  }

  // Uncertainty identification methods
  private async identifyKnowledgeGaps(response: AIResponse, context: ContextData): Promise<UncertaintyFactor[]> {
    const gaps: UncertaintyFactor[] = [];
    
    // Check if response acknowledges limitations
    if (!response.content.includes('not sure') && !response.content.includes('don\'t know')) {
      // If no acknowledgment of limitations, might be overconfident
      gaps.push({
        type: 'knowledge_gap',
        description: 'No explicit acknowledgment of knowledge limitations',
        impact: 0.3,
        evidence: ['Response appears overly confident without qualification'],
        affectedClaims: [],
        mitigation: ['Consider adding uncertainty qualifiers where appropriate']
      });
    }
    
    return gaps;
  }

  private async identifyConflictingEvidence(response: AIResponse, context: ContextData): Promise<UncertaintyFactor[]> {
    // This would integrate with fact-checker results
    // For now, return empty array
    return [];
  }

  private async identifyOutdatedInformation(response: AIResponse, context: ContextData): Promise<UncertaintyFactor[]> {
    const outdated: UncertaintyFactor[] = [];
    
    // Check for dates that might be outdated
    const oldDates = response.content.match(/\b(19\d{2}|200\d|201[0-4])\b/g);
    if (oldDates && oldDates.length > 0) {
      outdated.push({
        type: 'outdated_information',
        description: 'Response contains potentially outdated information',
        impact: 0.4,
        evidence: [`Found dates: ${oldDates.join(', ')}`],
        affectedClaims: [],
        mitigation: ['Verify information is current and up-to-date']
      });
    }
    
    return outdated;
  }

  private identifyAmbiguousClaims(content: string): UncertaintyFactor[] {
    const ambiguous: UncertaintyFactor[] = [];
    
    // Check for ambiguous language
    const ambiguousPatterns = [
      /\b(some|many|often|sometimes|frequently)\b/gi,
      /\b(various|different|several)\b/gi,
      /\b(etc|and so on)\b/gi
    ];
    
    let ambiguityCount = 0;
    for (const pattern of ambiguousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        ambiguityCount += matches.length;
      }
    }
    
    if (ambiguityCount > 2) {
      ambiguous.push({
        type: 'ambiguous_claim',
        description: 'Response contains ambiguous or vague language',
        impact: 0.3,
        evidence: [`Found ${ambiguityCount} potentially ambiguous terms`],
        affectedClaims: [],
        mitigation: ['Provide more specific and quantifiable information']
      });
    }
    
    return ambiguous;
  }

  private identifyIncompleteContext(response: AIResponse, context: ContextData): UncertaintyFactor[] {
    const incomplete: UncertaintyFactor[] = [];
    
    // Check if response seems to lack necessary context
    if (context.conversationHistory?.length === 0) {
      incomplete.push({
        type: 'incomplete_context',
        description: 'Limited conversation history available for context',
        impact: 0.2,
        evidence: ['No previous conversation context'],
        affectedClaims: [],
        mitigation: ['Consider asking for clarification or additional context']
      });
    }
    
    return incomplete;
  }

  // Coherence assessment methods
  private assessLogicalCoherence(sentences: string[], context: ContextData): number {
    let coherence = 0.7; // Base coherence
    
    // Check for logical connectors
    const logicalConnectors = ['therefore', 'thus', 'hence', 'because', 'since', 'so'];
    const connectorCount = sentences.reduce((count, sentence) => {
      return count + logicalConnectors.filter(connector => 
        sentence.toLowerCase().includes(connector)
      ).length;
    }, 0);
    
    if (connectorCount > 0) {
      coherence += 0.1;
    }
    
    return Math.min(1.0, coherence);
  }

  private assessStructuralCoherence(content: string, paragraphs: string[]): number {
    let structure = 0.6; // Base structure
    
    if (paragraphs.length > 1) {
      structure += 0.1; // Multiple paragraphs suggest good structure
    }
    
    // Check for headings or clear sections
    if (content.includes(':') || content.includes('\n\n')) {
      structure += 0.1;
    }
    
    return Math.min(1.0, structure);
  }

  private assessConsistency(sentences: string[]): number {
    let consistency = 0.8; // Base consistency
    
    // Check for contradictory statements
    const negativeWords = ['not', 'never', 'no', 'none'];
    const positiveStatements = sentences.filter(s => 
      !negativeWords.some(neg => s.toLowerCase().includes(neg))
    );
    const negativeStatements = sentences.filter(s => 
      negativeWords.some(neg => s.toLowerCase().includes(neg))
    );
    
    // If there are both positive and negative statements about similar topics, consistency might be low
    if (positiveStatements.length > 0 && negativeStatements.length > 0) {
      consistency -= 0.2;
    }
    
    return Math.max(0.3, consistency);
  }

  private assessFlow(sentences: string[], paragraphs: string[]): number {
    let flow = 0.7; // Base flow
    
    // Check sentence length variation (good flow has some variation)
    const lengths = sentences.map(s => s.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const lengthVariance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    if (lengthVariance > avgLength * 0.5) {
      flow += 0.1; // Good variation in sentence length
    }
    
    return Math.min(1.0, flow);
  }

  private identifyCoherenceIssues(
    logical: number, 
    structural: number, 
    consistency: number, 
    flow: number, 
    sentences: string[]
  ): CoherenceIssue[] {
    const issues: CoherenceIssue[] = [];
    
    if (logical < 0.6) {
      issues.push({
        type: 'logical_gap',
        severity: 'medium',
        description: 'Logical connections between ideas could be improved',
        location: 'throughout response',
        impact: 1 - logical,
        suggestion: 'Add more logical connectors and reasoning steps'
      });
    }
    
    if (structural < 0.6) {
      issues.push({
        type: 'inconsistency',
        severity: 'medium',
        description: 'Response structure could be clearer',
        location: 'overall organization',
        impact: 1 - structural,
        suggestion: 'Use headings, bullet points, or numbered lists'
      });
    }
    
    if (consistency < 0.6) {
      issues.push({
        type: 'contradiction',
        severity: 'high',
        description: 'Potential contradictions detected in the response',
        location: 'specific statements',
        impact: 1 - consistency,
        suggestion: 'Review and resolve any contradictory statements'
      });
    }
    
    return issues;
  }

  private generateCoherenceEvidence(logical: number, structural: number, consistency: number, flow: number): string[] {
    return [
      `Logical coherence: ${(logical * 100).toFixed(0)}%`,
      `Structural coherence: ${(structural * 100).toFixed(0)}%`,
      `Consistency: ${(consistency * 100).toFixed(0)}%`,
      `Flow: ${(flow * 100).toFixed(0)}%`
    ];
  }

  // Follow-up question generation methods
  private identifyClarityIssues(content: string): string[] {
    const issues: string[] = [];
    
    if (content.includes('etc.')) {
      issues.push('Response contains incomplete information (etc.)');
    }
    
    if (content.split(' ').some((word: string) => word.length > 15)) {
      issues.push('Response contains very long words that might be unclear');
    }
    
    return issues;
  }

  private async generateVerificationQuestions(response: AIResponse, context: ContextData): Promise<FollowUpQuestion[]> {
    return [
      {
        id: 'verification_1',
        question: 'Could you provide sources or references to support this information?',
        purpose: 'verification',
        priority: 'high',
        priorityValue: 0.8,
        estimatedValue: 0.4,
        relatedClaims: [],
        suggestedSources: []
      }
    ];
  }

  private async generateExpansionQuestions(response: AIResponse, context: ContextData): Promise<FollowUpQuestion[]> {
    return [
      {
        id: 'expansion_1',
        question: 'Could you provide more details or examples to expand on this point?',
        purpose: 'expansion',
        priority: 'medium',
        priorityValue: 0.6,
        estimatedValue: 0.3,
        relatedClaims: [],
        suggestedSources: []
      }
    ];
  }

  private async generateFactCheckQuestions(response: AIResponse, context: ContextData): Promise<FollowUpQuestion[]> {
    return [
      {
        id: 'factcheck_1',
        question: 'Can you verify this factual information with reliable sources?',
        purpose: 'fact_check',
        priority: 'high',
        priorityValue: 0.8,
        estimatedValue: 0.5,
        relatedClaims: [],
        suggestedSources: []
      }
    ];
  }

  private async generateContextQuestions(response: AIResponse, context: ContextData): Promise<FollowUpQuestion[]> {
    return [
      {
        id: 'context_1',
        question: 'How does this information relate to your specific situation or needs?',
        purpose: 'context',
        priority: 'medium',
        priorityValue: 0.6,
        estimatedValue: 0.3,
        relatedClaims: [],
        suggestedSources: []
      }
    ];
  }

  // Utility methods
  private splitIntoSentences(content: string): string[] {
    return content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private splitIntoParagraphs(content: string): string[] {
    return content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private detectUncertaintyIndicators(content: string): number {
    const uncertaintyWords = ['might', 'could', 'possibly', 'perhaps', 'maybe', 'unclear', 'uncertain'];
    const matches = uncertaintyWords.filter(word => 
      content.toLowerCase().includes(word)
    );
    return matches.length / uncertaintyWords.length;
  }

  // Database and cache management
  private async storeConfidenceRecord(score: ConfidenceScore, request: ConfidenceRequest): Promise<void> {
    try {
      await (supabase
        .from('confidence_scores') as any)
        .insert([{
          response_id: request.response.id,
          overall_confidence: score.overall,
          fact_confidence: score.byType.factual,
          context_confidence: score.byType.contextual,
          consistency_confidence: 0.8, // Simplified
          methodology_confidence: score.byType.methodological,
          scoring_factors: {
            uncertainty_factors: score.uncertaintyFactors.length,
            recommendation: score.recommendation,
            confidence_level: score.confidenceLevel
          }
        }]);

    } catch (error) {
      logWarning('Failed to store confidence record', { scoreId: score.scoreId, error });
    }
  }

  private getCachedConfidence(scoreId: string): ConfidenceScore | null {
    const cached = this.confidenceCache.get(scoreId);
    if (!cached) return null;

    // Check if cache is still valid (10 minutes)
    if (cached.calculatedAt.getTime() + 10 * 60 * 1000 < new Date().getTime()) {
      this.confidenceCache.delete(scoreId);
      return null;
    }

    return cached;
  }

  private cacheConfidence(scoreId: string, score: ConfidenceScore): void {
    this.confidenceCache.set(scoreId, score);
  }

  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      const now = new Date();
      let cleaned = 0;

      for (const [key, score] of this.confidenceCache.entries()) {
        if (score.calculatedAt.getTime() + 10 * 60 * 1000 < now.getTime()) {
          this.confidenceCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logInfo('Confidence cache cleanup completed', {
          componentName: 'ConfidenceScorer',
          entriesRemoved: cleaned,
          remainingEntries: this.confidenceCache.size
        });
      }
    }, 10 * 60 * 1000); // Clean every 10 minutes
  }

  private createFailedConfidenceResult(scoreId: string, processingTime: number, error: any): ConfidenceScore {
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
        description: 'Confidence scoring failed',
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
      processingTime,
      calculatedAt: new Date(),
      scoreId
    };
  }

  private generateScoreId(responseId: string, level: string): string {
    return `confidence_${responseId}_${level}_${Date.now()}`;
  }

  /**
   * Cleanup on instance destruction
   */
  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    this.confidenceCache.clear();
  }
}

// Export singleton instance
export const confidenceScorer = new ConfidenceScorer();

// Export convenience functions
export const calculateConfidence = (request: ConfidenceRequest) => confidenceScorer.calculateConfidence(request);
export const assessSourceReliability = (sources: any[], context: ContextData) => 
  confidenceScorer.assessSourceReliability(sources, context);
export const evaluateCoherence = (response: AIResponse, context: ContextData) => 
  confidenceScorer.evaluateResponseCoherence(response, context);
export const identifyUncertainAreas = (response: AIResponse, context: ContextData) => 
  confidenceScorer.identifyUncertainAreas(response, context);
export const suggestFollowUpQuestions = (response: AIResponse, context: ContextData, maxQuestions?: number) => 
  confidenceScorer.suggestFollowUpQuestions(response, context, maxQuestions);