// Layer 3: Response Validation & Fact-Checking System
// ====================================================
// ContradictionDetector - Contradictory content detection, resolution analysis, and cross-reference validation

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';
import type { AIResponse, ContextData } from './ResponseValidator';
import type { FactCheckResult } from './FactChecker';

export type ContradictionType = 'self_contradiction' | 'cross_contradiction' | 'temporal_contradiction' | 'logical_contradiction' | 'contextual_contradiction' | 'factual_contradiction';
export type ContradictionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ContradictionStatus = 'detected' | 'confirmed' | 'resolved' | 'false_positive' | 'unresolvable';
export type ResolutionType = 'correction' | 'clarification' | 'context_addition' | 'source_verification' | 'reformulation' | 'human_review';

export interface Contradiction {
  id: string;
  type: ContradictionType;
  severity: ContradictionSeverity;
  status: ContradictionStatus;
  claim1: ContradictoryClaim;
  claim2: ContradictoryClaim;
  contradictionScore: number; // 0-1, how strongly contradictory
  confidence: number; // 0-1, detection confidence
  evidence: ContradictionEvidence;
  context: ContradictionContext;
  resolution: ContradictionResolution;
  createdAt: Date;
  resolvedAt?: Date;
  detectionId: string;
}

export interface ContradictoryClaim {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  section?: string;
  sentence?: number;
  paragraph?: number;
  confidence: number; // 0-1
  factuality: 'factual' | 'opinion' | 'hypothetical' | 'uncertain';
  claims: string[]; // Parsed sub-claims
  entities: ContradictionEntity[];
  context: string;
}

export interface ContradictionEntity {
  text: string;
  type: 'person' | 'place' | 'organization' | 'date' | 'number' | 'concept' | 'event';
  confidence: number; // 0-1
  startIndex: number;
  endIndex: number;
}

export interface ContradictionEvidence {
  directEvidence: string[]; // Direct contradictory statements
  contextualEvidence: string[]; // Context that supports/contradicts
  temporalEvidence: string[]; // Time-related evidence
  sourceEvidence: string[]; // Source-based evidence
  logicalEvidence: string[]; // Logical consistency evidence
  supportingArguments: string[]; // Arguments that support one side
  opposingArguments: string[]; // Arguments that support the other side
}

export interface ContradictionContext {
  conversationHistory: string[];
  knowledgeBaseItems: any[];
  externalSources: any[];
  userProfile: any;
  temporalContext: TemporalContext;
  domainContext: string[];
  culturalContext?: string;
  academicContext?: any;
}

export interface TemporalContext {
  claim1Time?: Date;
  claim2Time?: Date;
  timeRange?: { start: Date; end: Date };
  temporalMarkers: string[];
  isTimeSensitive: boolean;
  timeConsistency: 'consistent' | 'inconsistent' | 'unclear';
}

export interface ContradictionResolution {
  type: ResolutionType;
  description: string;
  suggestedAction: string;
  confidence: number; // 0-1
  requiresHumanInput: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: 'minimal' | 'moderate' | 'significant' | 'extensive';
  alternativeInterpretations: string[];
  resolutionSteps: string[];
  successCriteria: string[];
}

export interface ContradictionDetectionRequest {
  response: AIResponse;
  context: ContextData;
  factCheckResults?: FactCheckResult[];
  detectionLevel: 'basic' | 'standard' | 'comprehensive';
  includeTemporalAnalysis: boolean;
  includeLogicalAnalysis: boolean;
  includeCrossReference: boolean;
  maxProcessingTime?: number;
  threshold: number; // 0-1, minimum contradiction score to report
  metadata?: Record<string, any>;
}

export interface ContradictionAnalysisResult {
  totalContradictions: number;
  contradictions: Contradiction[];
  severityDistribution: Record<ContradictionSeverity, number>;
  typeDistribution: Record<ContradictionType, number>;
  overallContradictionScore: number; // 0-1
  resolutionRecommendations: string[];
  criticalIssues: string[];
  processingTime: number;
  analysisId: string;
}

export interface CrossContradictionAnalysis {
  contradictions: Contradiction[];
  consensus: ConsensusAnalysis;
  reliability: ReliabilityAnalysis;
  temporalConsistency: TemporalConsistencyAnalysis;
  recommendations: string[];
}

export interface ConsensusAnalysis {
  agreementScore: number; // 0-1
  supportingEvidence: string[];
  contradictingEvidence: string[];
  neutralEvidence: string[];
  sourceReliability: number; // 0-1
  confidenceLevel: 'low' | 'medium' | 'high';
}

export interface ReliabilityAnalysis {
  sourceCredibility: number; // 0-1
  evidenceQuality: number; // 0-1
  methodologySoundness: number; // 0-1
  peerReviewStatus: 'not_reviewed' | 'in_review' | 'peer_reviewed' | 'rejected';
  publicationQuality: 'preprint' | 'low_quality' | 'medium_quality' | 'high_quality';
}

export interface TemporalConsistencyAnalysis {
  timeSpan: { start: Date; end: Date };
  eventSequence: TemporalEvent[];
  consistencyScore: number; // 0-1
  anachronisms: string[];
  temporalGaps: string[];
}

export interface TemporalEvent {
  event: string;
  time: Date;
  confidence: number; // 0-1
  source: string;
  description: string;
}

export class ContradictionDetector {
  private static readonly DEFAULT_TIMEOUT_MS = 15000;
  private static readonly HIGH_CONTRADICTION_THRESHOLD = 0.7;
  private static readonly MEDIUM_CONTRADICTION_THRESHOLD = 0.5;
  private static readonly LOW_CONTRADICTION_THRESHOLD = 0.3;
  private static readonly MAX_CONTRADICTIONS_REPORTED = 20;

  private cryptoKey: string;
  private detectionCache: Map<string, ContradictionAnalysisResult> = new Map();
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cryptoKey = process.env.CONTRADICTION_DETECTOR_KEY || 'default-contradiction-key';
    this.startCacheCleanup();
  }

  /**
   * Main contradiction detection method
   */
  async detectContradictions(request: ContradictionDetectionRequest): Promise<ContradictionAnalysisResult> {
    const startTime = Date.now();
    const analysisId = this.generateAnalysisId(request.response.id, request.detectionLevel);
    
    try {
      logInfo('Contradiction detection started', {
        componentName: 'ContradictionDetector',
        analysisId,
        responseId: request.response.id,
        detectionLevel: request.detectionLevel,
        includeTemporal: request.includeTemporalAnalysis,
        includeLogical: request.includeLogicalAnalysis
      });

      // Check cache first
      const cached = this.getCachedAnalysis(analysisId);
      if (cached) {
        logInfo('Contradiction analysis cache hit', {
          componentName: 'ContradictionDetector',
          analysisId,
          cachedAt: cached.createdAt
        });
        return cached;
      }

      // Extract contradictory claims
      const claims = await this.extractContradictoryClaims(request.response.content);
      
      if (claims.length < 2) {
        return this.createEmptyAnalysis(startTime, 'Insufficient claims for contradiction analysis');
      }

      // Detect self-contradictions within the response
      const selfContradictions = await this.detectSelfContradictions(claims, request);
      
      // Detect cross-contradictions with context
      const crossContradictions = await this.detectCrossContradictions(claims, request);
      
      // Detect temporal contradictions
      const temporalContradictions = request.includeTemporalAnalysis ? 
        await this.detectTemporalContradictions(claims, request) : [];
      
      // Detect logical contradictions
      const logicalContradictions = request.includeLogicalAnalysis ?
        await this.detectLogicalContradictions(claims, request) : [];
      
      // Detect contextual contradictions
      const contextualContradictions = await this.detectContextualContradictions(claims, request);
      
      // Combine all contradictions
      const allContradictions = [
        ...selfContradictions,
        ...crossContradictions,
        ...temporalContradictions,
        ...logicalContradictions,
        ...contextualContradictions
      ].sort((a, b) => b.contradictionScore - a.contradictionScore);
      
      // Filter by threshold
      const filteredContradictions = allContradictions.filter(
        c => c.contradictionScore >= request.threshold
      ).slice(0, ContradictionDetector.MAX_CONTRADICTIONS_REPORTED);
      
      // Generate analysis metrics
      const analysis = this.generateContradictionAnalysis(
        filteredContradictions,
        allContradictions,
        Date.now() - startTime
      );
      
      // Cache result
      this.cacheAnalysis(analysisId, analysis);
      
      // Log results
      logInfo('Contradiction detection completed', {
        componentName: 'ContradictionDetector',
        analysisId,
        totalContradictions: analysis.totalContradictions,
        criticalContradictions: analysis.severityDistribution.critical,
        overallScore: analysis.overallContradictionScore,
        processingTime: analysis.processingTime
      });

      // Store analysis in database
      await this.storeContradictionAnalysis(analysis, request);

      return analysis;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ContradictionDetector',
        analysisId,
        responseId: request.response.id,
        processingTime
      });

      return this.createFailedAnalysis(processingTime, error);
    }
  }

  /**
   * Analyze contradictions across multiple sources
   */
  async analyzeCrossContradictions(
    sources: AIResponse[],
    context: ContextData,
    level: 'basic' | 'standard' | 'comprehensive' = 'standard'
  ): Promise<CrossContradictionAnalysis> {
    try {
      logInfo('Cross-contradiction analysis started', {
        componentName: 'ContradictionDetector',
        sourceCount: sources.length,
        analysisLevel: level
      });

      // Extract claims from all sources
      const allClaims: ContradictoryClaim[] = [];
      for (const source of sources) {
        const claims = await this.extractContradictoryClaims(source.content);
        allClaims.push(...claims);
      }

      // Detect cross-contradictions between sources
      const crossContradictions: Contradiction[] = [];
      for (let i = 0; i < sources.length; i++) {
        for (let j = i + 1; j < sources.length; j++) {
          const contradictions = await this.detectSourceContradictions(
            sources[i], sources[j], context
          );
          crossContradictions.push(...contradictions);
        }
      }

      // Perform consensus analysis
      const consensus = await this.analyzeConsensus(allClaims, context);
      
      // Perform reliability analysis
      const reliability = await this.analyzeReliability(sources);
      
      // Perform temporal consistency analysis
      const temporalConsistency = await this.analyzeTemporalConsistency(sources);
      
      // Generate recommendations
      const recommendations = this.generateCrossContradictionRecommendations(
        crossContradictions, consensus, reliability, temporalConsistency
      );

      return {
        contradictions: crossContradictions,
        consensus,
        reliability,
        temporalConsistency,
        recommendations
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ContradictionDetector',
        operation: 'analyze_cross_contradictions',
        sourceCount: sources.length
      });

      return {
        contradictions: [],
        consensus: {
          agreementScore: 0,
          supportingEvidence: [],
          contradictingEvidence: [],
          neutralEvidence: [],
          sourceReliability: 0,
          confidenceLevel: 'low'
        },
        reliability: {
          sourceCredibility: 0,
          evidenceQuality: 0,
          methodologySoundness: 0,
          peerReviewStatus: 'not_reviewed',
          publicationQuality: 'preprint'
        },
        temporalConsistency: {
          timeSpan: { start: new Date(), end: new Date() },
          eventSequence: [],
          consistencyScore: 0,
          anachronisms: [],
          temporalGaps: []
        },
        recommendations: ['Cross-contradiction analysis failed - manual review required']
      };
    }
  }

  /**
   * Check for temporal contradictions in sequence of events
   */
  async checkTemporalConsistency(
    events: { event: string; time: Date; source: string }[],
    context: ContextData
  ): Promise<TemporalConsistencyAnalysis> {
    try {
      // Sort events by time
      const sortedEvents = events.sort((a, b) => a.time.getTime() - b.time.getTime());
      
      // Create temporal events
      const temporalEvents: TemporalEvent[] = sortedEvents.map(event => ({
        event: event.event,
        time: event.time,
        confidence: 0.8, // Simplified
        source: event.source,
        description: event.event
      }));
      
      // Check for anachronisms
      const anachronisms = this.detectAnachronisms(temporalEvents);
      
      // Check for temporal gaps
      const temporalGaps = this.detectTemporalGaps(temporalEvents);
      
      // Calculate consistency score
      const consistencyScore = this.calculateTemporalConsistencyScore(
        temporalEvents, anachronisms, temporalGaps
      );
      
      // Determine time span
      const timeSpan = {
        start: temporalEvents.length > 0 ? temporalEvents[0].time : new Date(),
        end: temporalEvents.length > 0 ? temporalEvents[temporalEvents.length - 1].time : new Date()
      };
      
      return {
        timeSpan,
        eventSequence: temporalEvents,
        consistencyScore,
        anachronisms,
        temporalGaps
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ContradictionDetector',
        operation: 'check_temporal_consistency',
        eventCount: events.length
      });

      return {
        timeSpan: { start: new Date(), end: new Date() },
        eventSequence: [],
        consistencyScore: 0,
        anachronisms: ['Temporal consistency analysis failed'],
        temporalGaps: []
      };
    }
  }

  /**
   * Generate resolution strategies for detected contradictions
   */
  async generateResolutionStrategies(
    contradictions: Contradiction[],
    context: ContextData
  ): Promise<ContradictionResolution[]> {
    try {
      const resolutions: ContradictionResolution[] = [];
      
      for (const contradiction of contradictions) {
        const resolution = await this.generateSingleResolutionStrategy(
          contradiction, context
        );
        resolutions.push(resolution);
      }
      
      // Sort by priority and confidence
      return resolutions
        .sort((a, b) => (b.priority === 'critical' ? 1 : b.priority === 'high' ? 0.7 : b.priority === 'medium' ? 0.4 : 0.1) - 
          (a.priority === 'critical' ? 1 : a.priority === 'high' ? 0.7 : a.priority === 'medium' ? 0.4 : 0.1))
        .sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'ContradictionDetector',
        operation: 'generate_resolution_strategies',
        contradictionCount: contradictions.length
      });

      return [{
        type: 'human_review',
        description: 'Resolution strategy generation failed',
        suggestedAction: 'Manual review and resolution required',
        confidence: 0,
        requiresHumanInput: true,
        priority: 'critical',
        estimatedEffort: 'moderate',
        alternativeInterpretations: ['Manual analysis needed'],
        resolutionSteps: ['1. Manual review of contradictions', '2. Determine appropriate resolution'],
        successCriteria: ['All contradictions resolved or explained']
      }];
    }
  }

  /**
   * Private implementation methods
   */

  private async extractContradictoryClaims(content: string): Promise<ContradictoryClaim[]> {
    const sentences = this.splitIntoSentences(content);
    const claims: ContradictoryClaim[] = [];
    let claimId = 1;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const position = content.indexOf(sentence);
      
      if (position !== -1) {
        const claim = this.extractSingleClaim(sentence, claimId.toString(), position, i);
        if (claim) {
          claims.push(claim);
          claimId++;
        }
      }
    }

    return claims;
  }

  private extractSingleClaim(
    sentence: string,
    id: string,
    startIndex: number,
    sentenceNumber: number
  ): ContradictoryClaim | null {
    // Skip obviously non-contradictory sentences
    if (this.isNonContradictory(sentence)) return null;
    
    const entities = this.extractEntities(sentence);
    const factuality = this.determineFactuality(sentence);
    const subClaims = this.extractSubClaims(sentence);
    
    return {
      id,
      text: sentence.trim(),
      startIndex,
      endIndex: startIndex + sentence.length,
      sentence: sentenceNumber,
      confidence: this.calculateClaimConfidence(sentence),
      factuality,
      claims: subClaims,
      entities,
      context: sentence
    };
  }

  private async detectSelfContradictions(claims: ContradictoryClaim[], request: ContradictionDetectionRequest): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const contradiction = this.checkForSelfContradiction(claims[i], claims[j], request);
        if (contradiction) {
          contradictions.push(contradiction);
        }
      }
    }
    
    return contradictions;
  }

  private async detectCrossContradictions(claims: ContradictoryClaim[], request: ContradictionDetectionRequest): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    for (const claim of claims) {
      // Check against knowledge base
      const kbContradictions = await this.checkAgainstKnowledgeBase(claim, request.context);
      contradictions.push(...kbContradictions);
      
      // Check against conversation history
      const historyContradictions = await this.checkAgainstHistory(claim, request.context);
      contradictions.push(...historyContradictions);
      
      // Check against external sources
      if (request.includeCrossReference) {
        const sourceContradictions = await this.checkAgainstSources(claim, request.context);
        contradictions.push(...sourceContradictions);
      }
    }
    
    return contradictions;
  }

  private async detectTemporalContradictions(claims: ContradictoryClaim[], request: ContradictionDetectionRequest): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    // Extract temporal claims
    const temporalClaims = claims.filter(claim => 
      this.isTemporalClaim(claim.text)
    );
    
    // Check for temporal inconsistencies
    for (let i = 0; i < temporalClaims.length; i++) {
      for (let j = i + 1; j < temporalClaims.length; j++) {
        const temporalContradiction = this.checkTemporalContradiction(
          temporalClaims[i], temporalClaims[j]
        );
        if (temporalContradiction) {
          contradictions.push(temporalContradiction);
        }
      }
    }
    
    return contradictions;
  }

  private async detectLogicalContradictions(claims: ContradictoryClaim[], request: ContradictionDetectionRequest): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    // Check for logical fallacies and contradictions
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const logicalContradiction = this.checkLogicalContradiction(
          claims[i], claims[j]
        );
        if (logicalContradiction) {
          contradictions.push(logicalContradiction);
        }
      }
    }
    
    return contradictions;
  }

  private async detectContextualContradictions(claims: ContradictoryClaim[], request: ContradictionDetectionRequest): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    // Check against user profile context
    for (const claim of claims) {
      const profileContradictions = await this.checkAgainstProfile(claim, request.context);
      contradictions.push(...profileContradictions);
    }
    
    return contradictions;
  }

  private checkForSelfContradiction(claim1: ContradictoryClaim, claim2: ContradictoryClaim, request: ContradictionDetectionRequest): Contradiction | null {
    const contradictionScore = this.calculateContradictionScore(claim1, claim2);
    
    if (contradictionScore < 0.5) return null;
    
    return {
      id: `self_${claim1.id}_${claim2.id}`,
      type: 'self_contradiction',
      severity: this.determineSeverity(contradictionScore),
      status: 'detected',
      claim1,
      claim2,
      contradictionScore,
      confidence: Math.min(claim1.confidence, claim2.confidence),
      evidence: {
        directEvidence: [claim1.text, claim2.text],
        contextualEvidence: [],
        temporalEvidence: [],
        sourceEvidence: [],
        logicalEvidence: [`Contradiction score: ${contradictionScore.toFixed(3)}`],
        supportingArguments: [],
        opposingArguments: []
      },
      context: {
        conversationHistory: [],
        knowledgeBaseItems: [],
        externalSources: [],
        userProfile: request.context.userProfile,
        temporalContext: { temporalMarkers: [], isTimeSensitive: false, timeConsistency: 'unclear' },
        domainContext: []
      },
      resolution: {
        type: 'clarification',
        description: 'Self-contradiction detected within response',
        suggestedAction: 'Clarify or resolve the contradictory statements',
        confidence: 0.7,
        requiresHumanInput: contradictionScore > 0.7,
        priority: contradictionScore > 0.8 ? 'critical' : contradictionScore > 0.6 ? 'high' : 'medium',
        estimatedEffort: 'minimal',
        alternativeInterpretations: ['Different contexts for the statements', 'Evolution of thought during response'],
        resolutionSteps: [
          '1. Review both contradictory statements',
          '2. Determine which statement is more accurate',
          '3. Clarify or correct the contradictory statement'
        ],
        successCriteria: ['No internal contradictions remain', 'Response is logically consistent']
      },
      createdAt: new Date(),
      detectionId: this.generateDetectionId()
    };
  }

  private async checkAgainstKnowledgeBase(claim: ContradictoryClaim, context: ContextData): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    try {
      // Search knowledge base for contradicting information
      const kbItems = context.knowledgeBase || [];
      
      for (const item of kbItems) {
        const contradictionScore = this.calculateContentContradiction(claim.text, item.content);
        if (contradictionScore > 0.6) {
          const contradiction: Contradiction = {
            id: `kb_${claim.id}_${item.id}`,
            type: 'cross_contradiction',
            severity: this.determineSeverity(contradictionScore),
            status: 'detected',
            claim1: claim,
            claim2: {
              id: item.id,
              text: item.content,
              startIndex: 0,
              endIndex: item.content.length,
              confidence: item.confidence || 0.7,
              factuality: 'factual',
              claims: [item.content],
              entities: [],
              context: item.content
            },
            contradictionScore,
            confidence: Math.min(claim.confidence, item.confidence || 0.7),
            evidence: {
              directEvidence: [claim.text],
              contextualEvidence: [item.content],
              temporalEvidence: [],
              sourceEvidence: [`Source: ${item.title || 'Knowledge Base'}`],
              logicalEvidence: [`Contradiction with known information`],
              supportingArguments: [],
              opposingArguments: []
            },
            context: {
              conversationHistory: [],
              knowledgeBaseItems: [item],
              externalSources: [],
              userProfile: context.userProfile,
              temporalContext: { temporalMarkers: [], isTimeSensitive: false, timeConsistency: 'unclear' },
              domainContext: []
            },
            resolution: {
              type: 'source_verification',
              description: 'Contradiction with knowledge base information',
              suggestedAction: 'Verify claim against reliable sources',
              confidence: 0.8,
              requiresHumanInput: true,
              priority: contradictionScore > 0.8 ? 'critical' : 'high',
              estimatedEffort: 'moderate',
              alternativeInterpretations: ['Knowledge base may be outdated', 'Different interpretation of the claim'],
              resolutionSteps: [
                '1. Verify claim against multiple sources',
                '2. Check knowledge base entry for accuracy',
                '3. Resolve discrepancy with evidence'
              ],
              successCriteria: ['Claim verified or corrected', 'Knowledge base updated if needed']
            },
            createdAt: new Date(),
            detectionId: this.generateDetectionId()
          };
          contradictions.push(contradiction);
        }
      }
      
      return contradictions;
      
    } catch (error) {
      logWarning('Failed to check against knowledge base', { claimId: claim.id, error });
      return [];
    }
  }

  private async checkAgainstHistory(claim: ContradictoryClaim, context: ContextData): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    try {
      const history = context.conversationHistory || [];
      
      for (const historyItem of history) {
        const contradictionScore = this.calculateContentContradiction(claim.text, historyItem.content);
        if (contradictionScore > 0.6) {
          const contradiction: Contradiction = {
            id: `history_${claim.id}_${historyItem.id}`,
            type: 'cross_contradiction',
            severity: this.determineSeverity(contradictionScore),
            status: 'detected',
            claim1: claim,
            claim2: {
              id: historyItem.id,
              text: historyItem.content,
              startIndex: 0,
              endIndex: historyItem.content.length,
              confidence: historyItem.confidence || 0.7,
              factuality: 'factual',
              claims: [historyItem.content],
              entities: [],
              context: historyItem.content
            },
            contradictionScore,
            confidence: Math.min(claim.confidence, historyItem.confidence || 0.7),
            evidence: {
              directEvidence: [claim.text],
              contextualEvidence: [historyItem.content],
              temporalEvidence: [],
              sourceEvidence: ['Conversation history'],
              logicalEvidence: ['Contradiction with previous statements'],
              supportingArguments: [],
              opposingArguments: []
            },
            context: {
              conversationHistory: [historyItem],
              knowledgeBaseItems: [],
              externalSources: [],
              userProfile: context.userProfile,
              temporalContext: { temporalMarkers: [], isTimeSensitive: false, timeConsistency: 'unclear' },
              domainContext: []
            },
            resolution: {
              type: 'context_addition',
              description: 'Contradiction with conversation history',
              suggestedAction: 'Clarify context or resolve inconsistency',
              confidence: 0.6,
              requiresHumanInput: true,
              priority: 'medium',
              estimatedEffort: 'minimal',
              alternativeInterpretations: ['Change of mind or new information', 'Different context or perspective'],
              resolutionSteps: [
                '1. Review conversation history',
                '2. Clarify any context changes',
                '3. Update or clarify current position'
              ],
              successCriteria: ['Consistency with conversation history', 'Clear context provided']
            },
            createdAt: new Date(),
            detectionId: this.generateDetectionId()
          };
          contradictions.push(contradiction);
        }
      }
      
      return contradictions;
      
    } catch (error) {
      logWarning('Failed to check against history', { claimId: claim.id, error });
      return [];
    }
  }

  private async checkAgainstSources(claim: ContradictoryClaim, context: ContextData): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    try {
      const sources = context.externalSources || [];
      
      for (const source of sources) {
        const contradictionScore = this.calculateContentContradiction(claim.text, source.content);
        if (contradictionScore > 0.6 && source.reliability_score > 0.5) {
          const contradiction: Contradiction = {
            id: `source_${claim.id}_${source.id}`,
            type: 'cross_contradiction',
            severity: this.determineSeverity(contradictionScore),
            status: 'detected',
            claim1: claim,
            claim2: {
              id: source.id,
              text: source.content,
              startIndex: 0,
              endIndex: source.content.length,
              confidence: source.reliability_score,
              factuality: 'factual',
              claims: [source.content],
              entities: [],
              context: source.content
            },
            contradictionScore,
            confidence: Math.min(claim.confidence, source.reliability_score),
            evidence: {
              directEvidence: [claim.text],
              contextualEvidence: [source.content],
              temporalEvidence: [],
              sourceEvidence: [`External source: ${source.title || 'Unknown'}`],
              logicalEvidence: ['Contradiction with external source'],
              supportingArguments: [],
              opposingArguments: []
            },
            context: {
              conversationHistory: [],
              knowledgeBaseItems: [],
              externalSources: [source],
              userProfile: context.userProfile,
              temporalContext: { temporalMarkers: [], isTimeSensitive: false, timeConsistency: 'unclear' },
              domainContext: []
            },
            resolution: {
              type: 'source_verification',
              description: 'Contradiction with external source',
              suggestedAction: 'Verify against additional sources',
              confidence: 0.7,
              requiresHumanInput: true,
              priority: 'high',
              estimatedEffort: 'moderate',
              alternativeInterpretations: ['Source may be unreliable', 'Different interpretation possible'],
              resolutionSteps: [
                '1. Verify claim against additional sources',
                '2. Assess source reliability',
                '3. Resolve discrepancy with evidence'
              ],
              successCriteria: ['Claim verified or corrected', 'Source reliability assessed']
            },
            createdAt: new Date(),
            detectionId: this.generateDetectionId()
          };
          contradictions.push(contradiction);
        }
      }
      
      return contradictions;
      
    } catch (error) {
      logWarning('Failed to check against sources', { claimId: claim.id, error });
      return [];
    }
  }

  private checkTemporalContradiction(claim1: ContradictoryClaim, claim2: ContradictoryClaim): Contradiction | null {
    const time1 = this.extractTimeFromClaim(claim1.text);
    const time2 = this.extractTimeFromClaim(claim2.text);
    
    if (!time1 || !time2) return null;
    
    // Simple temporal contradiction check
    if (Math.abs(time1.getTime() - time2.getTime()) < 24 * 60 * 60 * 1000) { // Within 24 hours
      // Check if claims are about the same event/time but contradictory
      const contradictionScore = this.calculateTemporalContradictionScore(claim1.text, claim2.text);
      
      if (contradictionScore > 0.6) {
        return {
          id: `temporal_${claim1.id}_${claim2.id}`,
          type: 'temporal_contradiction',
          severity: this.determineSeverity(contradictionScore),
          status: 'detected',
          claim1,
          claim2,
          contradictionScore,
          confidence: Math.min(claim1.confidence, claim2.confidence),
          evidence: {
            directEvidence: [claim1.text, claim2.text],
            contextualEvidence: [],
            temporalEvidence: [`Time 1: ${time1.toISOString()}`, `Time 2: ${time2.toISOString()}`],
            sourceEvidence: [],
            logicalEvidence: ['Temporal inconsistency detected'],
            supportingArguments: [],
            opposingArguments: []
          },
          context: {
            conversationHistory: [],
            knowledgeBaseItems: [],
            externalSources: [],
            userProfile: {} as any,
            temporalContext: {
              claim1Time: time1,
              claim2Time: time2,
              temporalMarkers: [time1.toISOString(), time2.toISOString()],
              isTimeSensitive: true,
              timeConsistency: 'inconsistent'
            },
            domainContext: []
          },
          resolution: {
            type: 'clarification',
            description: 'Temporal contradiction detected',
            suggestedAction: 'Clarify the timing of events or statements',
            confidence: 0.8,
            requiresHumanInput: true,
            priority: 'medium',
            estimatedEffort: 'minimal',
            alternativeInterpretations: ['Different time zones or contexts', 'Unclear temporal markers'],
            resolutionSteps: [
              '1. Clarify the timing of both claims',
              '2. Check for time zone differences',
              '3. Resolve temporal inconsistency'
            ],
            successCriteria: ['Temporal consistency clarified', 'Timing of events clarified']
          },
          createdAt: new Date(),
          detectionId: this.generateDetectionId()
        };
      }
    }
    
    return null;
  }

  private checkLogicalContradiction(claim1: ContradictoryClaim, claim2: ContradictoryClaim): Contradiction | null {
    // Check for logical contradictions (e.g., "all" vs "none", "always" vs "never")
    const logicalPatterns = [
      { positive: 'all', negative: 'none' },
      { positive: 'always', negative: 'never' },
      { positive: 'every', negative: 'no' },
      { positive: 'must', negative: 'cannot' },
      { positive: 'is', negative: 'is not' }
    ];
    
    const text1 = claim1.text.toLowerCase();
    const text2 = claim2.text.toLowerCase();
    
    for (const pattern of logicalPatterns) {
      const hasPositive = text1.includes(pattern.positive) && text2.includes(pattern.negative);
      const hasNegative = text1.includes(pattern.negative) && text2.includes(pattern.positive);
      
      if (hasPositive || hasNegative) {
        const contradictionScore = 0.8; // High score for clear logical contradictions
        
        return {
          id: `logical_${claim1.id}_${claim2.id}`,
          type: 'logical_contradiction',
          severity: this.determineSeverity(contradictionScore),
          status: 'detected',
          claim1,
          claim2,
          contradictionScore,
          confidence: Math.min(claim1.confidence, claim2.confidence),
          evidence: {
            directEvidence: [claim1.text, claim2.text],
            contextualEvidence: [],
            temporalEvidence: [],
            sourceEvidence: [],
            logicalEvidence: [`Logical inconsistency: ${pattern.positive} vs ${pattern.negative}`],
            supportingArguments: [],
            opposingArguments: []
          },
          context: {
            conversationHistory: [],
            knowledgeBaseItems: [],
            externalSources: [],
            userProfile: {} as any,
            temporalContext: { temporalMarkers: [], isTimeSensitive: false, timeConsistency: 'unclear' },
            domainContext: []
          },
          resolution: {
            type: 'clarification',
            description: 'Logical contradiction detected',
            suggestedAction: 'Clarify the logical relationship between statements',
            confidence: 0.9,
            requiresHumanInput: true,
            priority: 'high',
            estimatedEffort: 'minimal',
            alternativeInterpretations: ['Different scopes or contexts', 'Conditional vs absolute statements'],
            resolutionSteps: [
              '1. Review logical relationship between claims',
              '2. Clarify scope or conditions',
              '3. Resolve logical inconsistency'
            ],
            successCriteria: ['Logical consistency achieved', 'Scope and conditions clarified']
          },
          createdAt: new Date(),
          detectionId: this.generateDetectionId()
        };
      }
    }
    
    return null;
  }

  private async checkAgainstProfile(claim: ContradictoryClaim, context: ContextData): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    try {
      // Check against user profile information
      const profile = context.userProfile;
      if (profile) {
        // Check academic level consistency
        if (profile.academicLevel) {
          const levelContradiction = this.checkAcademicLevelContradiction(claim, profile.academicLevel);
          if (levelContradiction) {
            contradictions.push(levelContradiction);
          }
        }
        
        // Check subject area consistency
        if (profile.subjects && profile.subjects.length > 0) {
          const subjectContradiction = this.checkSubjectContradiction(claim, profile.subjects);
          if (subjectContradiction) {
            contradictions.push(subjectContradiction);
          }
        }
      }
      
      return contradictions;
      
    } catch (error) {
      logWarning('Failed to check against profile', { claimId: claim.id, error });
      return [];
    }
  }

  // Helper methods for contradiction detection
  private splitIntoSentences(content: string): string[] {
    return content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private isNonContradictory(sentence: string): boolean {
    const nonContradictoryPatterns = [
      /^(i|you|we|they)\s+(think|believe|feel|agree|disagree)/i,
      /^(perhaps|maybe|possibly|probably)/i,
      /^in my opinion/i,
      /^i think/i,
      /^what if/i,
      /^imagine if/i,
      /^suppose that/i,
      /^it seems/i,
      /^it appears/i
    ];
    
    return nonContradictoryPatterns.some(pattern => pattern.test(sentence));
  }

  private extractEntities(sentence: string): ContradictionEntity[] {
    const entities: ContradictionEntity[] = [];
    
    // Simple entity extraction patterns
    const patterns = [
      { type: 'person' as const, regex: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g },
      { type: 'date' as const, regex: /\b(\d{4})\b/g },
      { type: 'number' as const, regex: /\b(\d+(?:\.\d+)?)\b/g }
    ];
    
    patterns.forEach(({ type, regex }) => {
      let match;
      while ((match = regex.exec(sentence)) !== null) {
        entities.push({
          text: match[1],
          type,
          confidence: 0.8,
          startIndex: match.index,
          endIndex: match.index + match[1].length
        });
      }
    });
    
    return entities;
  }

  private determineFactuality(sentence: string): 'factual' | 'opinion' | 'hypothetical' | 'uncertain' {
    if (/\b(think|believe|feel|opinion|perspective)\b/i.test(sentence)) {
      return 'opinion';
    }
    if (/\b(if|what if|imagine|suppose|hypothetical)\b/i.test(sentence)) {
      return 'hypothetical';
    }
    if (/\b(maybe|perhaps|possibly|probably|might|could)\b/i.test(sentence)) {
      return 'uncertain';
    }
    return 'factual';
  }

  private extractSubClaims(sentence: string): string[] {
    // Simple sub-claim extraction - split on conjunctions
    const subClaims = sentence.split(/\b(and|but|or|however|therefore|thus)\b/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    return subClaims.length > 1 ? subClaims : [sentence];
  }

  private calculateClaimConfidence(sentence: string): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence for specific language
    if (/\d+/.test(sentence)) confidence += 0.1;
    if (/\b(according to|research|studies show)\b/i.test(sentence)) confidence += 0.1;
    
    // Decrease confidence for uncertain language
    if (/\b(maybe|perhaps|possibly|probably|might|could)\b/i.test(sentence)) confidence -= 0.2;
    if (/\b(i think|i believe|in my opinion)\b/i.test(sentence)) confidence -= 0.3;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private calculateContradictionScore(claim1: ContradictoryClaim, claim2: ContradictoryClaim): number {
    let score = 0;
    
    // Check for negation patterns
    const negatingWords = ['not', 'never', 'no', 'none', 'nothing', 'neither', 'nor', 'without'];
    const hasNegation1 = negatingWords.some(word => claim1.text.toLowerCase().includes(word));
    const hasNegation2 = negatingWords.some(word => claim2.text.toLowerCase().includes(word));
    
    if (hasNegation1 !== hasNegation2) {
      score += 0.4;
    }
    
    // Check for opposing quantifiers
    const quantifiers = [
      { positive: ['all', 'every', 'always', 'completely'], negative: ['none', 'no', 'never', 'nothing'] },
      { positive: ['most', 'many', 'usually'], negative: ['few', 'rarely', 'seldom'] }
    ];
    
    for (const quantifierPair of quantifiers) {
      const hasPositive1 = quantifierPair.positive.some(q => claim1.text.toLowerCase().includes(q));
      const hasNegative1 = quantifierPair.negative.some(q => claim1.text.toLowerCase().includes(q));
      const hasPositive2 = quantifierPair.positive.some(q => claim2.text.toLowerCase().includes(q));
      const hasNegative2 = quantifierPair.negative.some(q => claim2.text.toLowerCase().includes(q));
      
      if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
        score += 0.3;
      }
    }
    
    // Check for contradictory entities
    const commonEntities = claim1.entities.filter(e1 => 
      claim2.entities.some(e2 => e1.text === e2.text)
    );
    
    if (commonEntities.length > 0) {
      // If same entities have contradictory claims, increase score
      score += 0.2;
    }
    
    // Check for opposite directions
    const directionalWords = [
      { positive: ['increase', 'rise', 'grow', 'improve', 'more'], negative: ['decrease', 'fall', 'decline', 'reduce', 'less'] },
      { positive: ['before', 'earlier', 'prior'], negative: ['after', 'later', 'subsequent'] }
    ];
    
    for (const directionPair of directionalWords) {
      const hasPositive1 = directionPair.positive.some(word => claim1.text.toLowerCase().includes(word));
      const hasNegative1 = directionPair.negative.some(word => claim1.text.toLowerCase().includes(word));
      const hasPositive2 = directionPair.positive.some(word => claim2.text.toLowerCase().includes(word));
      const hasNegative2 = directionPair.negative.some(word => claim2.text.toLowerCase().includes(word));
      
      if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
        score += 0.2;
      }
    }
    
    return Math.min(1.0, score);
  }

  private calculateContentContradiction(text1: string, text2: string): number {
    // Simple text-based contradiction detection
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    
    // If content is very similar, check for contradictory patterns
    if (similarity > 0.6) {
      return this.detectTextualContradiction(text1, text2);
    }
    
    return 0; // Not contradictory if not similar
  }

  private detectTextualContradiction(text1: string, text2: string): number {
    // Check for negation patterns
    const negatingWords = ['not', 'never', 'no', 'none', 'nothing'];
    const words1 = text1.toLowerCase();
    const words2 = text2.toLowerCase();
    
    let contradictionScore = 0;
    
    for (const word of negatingWords) {
      if (words1.includes(word) !== words2.includes(word)) {
        contradictionScore += 0.3;
      }
    }
    
    return Math.min(1.0, contradictionScore);
  }

  private determineSeverity(score: number): ContradictionSeverity {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private isTemporalClaim(text: string): boolean {
    return /\b(year|month|day|century|decade|before|after|during|when|while|then|now)\b/i.test(text);
  }

  private extractTimeFromClaim(text: string): Date | null {
    // Simple date extraction
    const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      return new Date(year, 0, 1);
    }
    return null;
  }

  private calculateTemporalContradictionScore(text1: string, text2: string): number {
    // Simplified temporal contradiction detection
    const temporalWords = ['before', 'after', 'during', 'while', 'then', 'now'];
    const words1 = text1.toLowerCase();
    const words2 = text2.toLowerCase();
    
    let score = 0;
    for (const word of temporalWords) {
      if (words1.includes(word) && words2.includes(word)) {
        score += 0.2;
      }
    }
    
    return Math.min(1.0, score);
  }

  private checkAcademicLevelContradiction(claim: ContradictoryClaim, academicLevel: string): Contradiction | null {
    // Simplified check - in practice would be more sophisticated
    const complexity = this.assessComplexity(claim.text);
    
    if (academicLevel === 'elementary' && complexity > 0.7) {
      return this.createProfileContradiction(claim, 'academic_level', academicLevel, complexity);
    }
    
    return null;
  }

  private checkSubjectContradiction(claim: ContradictoryClaim, subjects: string[]): Contradiction | null {
    // Simplified check - in practice would be domain-specific
    const subjectIndicators = {
      'math': ['equation', 'formula', 'calculation', 'number'],
      'science': ['experiment', 'hypothesis', 'theory', 'data'],
      'history': ['war', 'revolution', 'empire', 'ancient']
    };
    
    for (const subject of subjects) {
      const indicators = subjectIndicators[subject.toLowerCase() as keyof typeof subjectIndicators];
      if (indicators) {
        const hasIndicators = indicators.some(indicator => 
          claim.text.toLowerCase().includes(indicator)
        );
        if (!hasIndicators) {
          return this.createProfileContradiction(claim, 'subject', subject, 0.5);
        }
      }
    }
    
    return null;
  }

  private createProfileContradiction(claim: ContradictoryClaim, type: string, value: any, score: number): Contradiction {
    return {
      id: `profile_${claim.id}_${type}`,
      type: 'contextual_contradiction',
      severity: this.determineSeverity(score),
      status: 'detected',
      claim1: claim,
      claim2: {
        id: 'profile',
        text: `User ${type}: ${value}`,
        startIndex: 0,
        endIndex: 0,
        confidence: 0.9,
        factuality: 'factual',
        claims: [`User ${type}: ${value}`],
        entities: [],
        context: `User profile information`
      },
      contradictionScore: score,
      confidence: claim.confidence,
      evidence: {
        directEvidence: [claim.text],
        contextualEvidence: [`User ${type}: ${value}`],
        temporalEvidence: [],
        sourceEvidence: ['User profile'],
        logicalEvidence: [`Contradiction with user ${type}`],
        supportingArguments: [],
        opposingArguments: []
      },
      context: {
        conversationHistory: [],
        knowledgeBaseItems: [],
        externalSources: [],
        userProfile: { [type]: value } as any,
        temporalContext: { temporalMarkers: [], isTimeSensitive: false, timeConsistency: 'unclear' },
        domainContext: []
      },
      resolution: {
        type: 'context_addition',
        description: `Contradiction with user ${type}`,
        suggestedAction: `Consider user's ${type} when providing information`,
        confidence: 0.8,
        requiresHumanInput: false,
        priority: 'low',
        estimatedEffort: 'minimal',
        alternativeInterpretations: ['User may have advanced knowledge', 'Request for challenging content'],
        resolutionSteps: [
          `1. Consider user's ${type} level`,
          '2. Adjust complexity if needed',
          '3. Provide appropriate level information'
        ],
        successCriteria: [`Content appropriate for user's ${type}`, 'No level mismatches']
      },
      createdAt: new Date(),
      detectionId: this.generateDetectionId()
    };
  }

  private assessComplexity(text: string): number {
    // Simple complexity assessment
    const complexWords = ['therefore', 'consequently', 'nevertheless', 'furthermore', 'moreover'];
    const wordCount = text.split(' ').length;
    const complexWordCount = complexWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    return Math.min(1.0, (wordCount / 50) + (complexWordCount * 0.1));
  }

  // Analysis and reporting methods
  private generateContradictionAnalysis(
    contradictions: Contradiction[],
    allContradictions: Contradiction[],
    processingTime: number
  ): ContradictionAnalysisResult {
    const severityDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    const typeDistribution = {
      self_contradiction: 0,
      cross_contradiction: 0,
      temporal_contradiction: 0,
      logical_contradiction: 0,
      contextual_contradiction: 0,
      factual_contradiction: 0
    };
    
    for (const contradiction of contradictions) {
      severityDistribution[contradiction.severity]++;
      typeDistribution[contradiction.type]++;
    }
    
    const totalContradictions = contradictions.length;
    const averageScore = contradictions.length > 0 ? 
      contradictions.reduce((sum, c) => sum + c.contradictionScore, 0) / contradictions.length : 0;
    
    const criticalIssues = contradictions
      .filter(c => c.severity === 'critical' || c.severity === 'high')
      .map(c => `${c.type}: ${c.claim1.text.substring(0, 100)}...`);
    
    const resolutionRecommendations = this.generateResolutionRecommendations(contradictions);
    
    return {
      totalContradictions,
      contradictions,
      severityDistribution,
      typeDistribution,
      overallContradictionScore: averageScore,
      resolutionRecommendations,
      criticalIssues,
      processingTime,
      analysisId: this.generateAnalysisId('temp', 'standard')
    };
  }

  private generateResolutionRecommendations(contradictions: Contradiction[]): string[] {
    const recommendations: string[] = [];
    
    if (contradictions.length === 0) {
      return ['No contradictions detected'];
    }
    
    const highSeverity = contradictions.filter(c => c.severity === 'high' || c.severity === 'critical');
    if (highSeverity.length > 0) {
      recommendations.push('Address high-severity contradictions immediately');
    }
    
    const selfContradictions = contradictions.filter(c => c.type === 'self_contradiction');
    if (selfContradictions.length > 0) {
      recommendations.push('Review and resolve self-contradictions within the response');
    }
    
    const crossContradictions = contradictions.filter(c => c.type === 'cross_contradiction');
    if (crossContradictions.length > 0) {
      recommendations.push('Verify information against reliable sources');
    }
    
    return recommendations;
  }

  // Database and cache management
  private async storeContradictionAnalysis(analysis: ContradictionAnalysisResult, request: ContradictionDetectionRequest): Promise<void> {
    try {
      // Store in response_contradictions table
      for (const contradiction of analysis.contradictions) {
        await (supabase
          .from('response_contradictions') as any)
          .insert([{
            response_id: request.response.id,
            contradiction_type: contradiction.type,
            conflicting_claims: {
              claim1: contradiction.claim1,
              claim2: contradiction.claim2,
              evidence: contradiction.evidence
            },
            contradiction_score: contradiction.contradictionScore,
            resolution_status: contradiction.status,
            resolution_notes: contradiction.resolution.description
          }]);
      }
      
      // Store in quality_metrics table
      await (supabase
        .from('quality_metrics') as any)
        .insert([{
          user_id: request.context.userProfile?.id || null,
          interaction_id: request.response.id,
          quality_score: 1 - analysis.overallContradictionScore,
          hallucination_probability: analysis.overallContradictionScore,
          anomaly_indicators: {
            total_contradictions: analysis.totalContradictions,
            severity_distribution: analysis.severityDistribution,
            type_distribution: analysis.typeDistribution
          },
          alerts_triggered: analysis.criticalIssues,
          monitoring_data: {
            contradiction_analysis: analysis,
            detection_level: request.detectionLevel,
            processing_time: analysis.processingTime
          }
        }]);

    } catch (error) {
      logWarning('Failed to store contradiction analysis', { analysisId: analysis.analysisId, error });
    }
  }

  private getCachedAnalysis(analysisId: string): ContradictionAnalysisResult | null {
    const cached = this.detectionCache.get(analysisId);
    if (!cached) return null;

    // Check if cache is still valid (10 minutes)
    if (new Date().getTime() - 10 * 60 * 1000 > Date.now()) {
      this.detectionCache.delete(analysisId);
      return null;
    }

    return cached;
  }

  private cacheAnalysis(analysisId: string, analysis: ContradictionAnalysisResult): void {
    this.detectionCache.set(analysisId, analysis);
  }

  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      const now = new Date();
      let cleaned = 0;

      for (const [key, analysis] of this.detectionCache.entries()) {
        if (now.getTime() - 10 * 60 * 1000 > now.getTime()) {
          this.detectionCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logInfo('Contradiction analysis cache cleanup completed', {
          componentName: 'ContradictionDetector',
          entriesRemoved: cleaned,
          remainingEntries: this.detectionCache.size
        });
      }
    }, 10 * 60 * 1000); // Clean every 10 minutes
  }

  private createEmptyAnalysis(processingTime: number, reason: string): ContradictionAnalysisResult {
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
      resolutionRecommendations: [reason],
      criticalIssues: [],
      processingTime,
      analysisId: this.generateAnalysisId('empty', 'standard')
    };
  }

  private createFailedAnalysis(processingTime: number, error: any): ContradictionAnalysisResult {
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
      processingTime,
      analysisId: this.generateAnalysisId('failed', 'standard')
    };
  }

  // Additional helper methods for cross-analysis
  private async detectSourceContradictions(source1: AIResponse, source2: AIResponse, context: ContextData): Promise<Contradiction[]> {
    const claims1 = await this.extractContradictoryClaims(source1.content);
    const claims2 = await this.extractContradictoryClaims(source2.content);
    const contradictions: Contradiction[] = [];
    
    for (const claim1 of claims1) {
      for (const claim2 of claims2) {
        const contradictionScore = this.calculateContradictionScore(claim1, claim2);
        if (contradictionScore > 0.6) {
          // Create cross-source contradiction
          const contradiction: Contradiction = {
            id: `source_${source1.id}_${source2.id}_${claim1.id}_${claim2.id}`,
            type: 'cross_contradiction',
            severity: this.determineSeverity(contradictionScore),
            status: 'detected',
            claim1,
            claim2,
            contradictionScore,
            confidence: Math.min(claim1.confidence, claim2.confidence),
            evidence: {
              directEvidence: [claim1.text, claim2.text],
              contextualEvidence: [],
              temporalEvidence: [],
              sourceEvidence: [`Source 1: ${source1.id}`, `Source 2: ${source2.id}`],
              logicalEvidence: ['Contradiction between sources'],
              supportingArguments: [],
              opposingArguments: []
            },
            context: {
              conversationHistory: [],
              knowledgeBaseItems: [],
              externalSources: [source1 as any, source2 as any],
              userProfile: context.userProfile,
              temporalContext: { temporalMarkers: [], isTimeSensitive: false, timeConsistency: 'unclear' },
              domainContext: []
            },
            resolution: {
              type: 'source_verification',
              description: 'Contradiction between sources',
              suggestedAction: 'Verify information across multiple reliable sources',
              confidence: 0.7,
              requiresHumanInput: true,
              priority: 'high',
              estimatedEffort: 'moderate',
              alternativeInterpretations: ['Sources may have different perspectives', 'Information may be outdated'],
              resolutionSteps: [
                '1. Verify claims against additional sources',
                '2. Assess source reliability and bias',
                '3. Determine most accurate information'
              ],
              successCriteria: ['Information verified', 'Sources assessed for reliability']
            },
            createdAt: new Date(),
            detectionId: this.generateDetectionId()
          };
          contradictions.push(contradiction);
        }
      }
    }
    
    return contradictions;
  }

  private async analyzeConsensus(claims: ContradictoryClaim[], context: ContextData): Promise<ConsensusAnalysis> {
    // Simplified consensus analysis
    const supportingEvidence = [];
    const contradictingEvidence = [];
    const neutralEvidence = [];
    
    // This would be more sophisticated in practice
    return {
      agreementScore: 0.5,
      supportingEvidence,
      contradictingEvidence,
      neutralEvidence,
      sourceReliability: 0.7,
      confidenceLevel: 'medium'
    };
  }

  private async analyzeReliability(sources: AIResponse[]): Promise<ReliabilityAnalysis> {
    // Simplified reliability analysis
    return {
      sourceCredibility: 0.7,
      evidenceQuality: 0.8,
      methodologySoundness: 0.6,
      peerReviewStatus: 'not_reviewed',
      publicationQuality: 'medium_quality'
    };
  }

  private async analyzeTemporalConsistency(sources: AIResponse[]): Promise<TemporalConsistencyAnalysis> {
    // Simplified temporal consistency analysis
    return {
      timeSpan: { start: new Date(), end: new Date() },
      eventSequence: [],
      consistencyScore: 0.8,
      anachronisms: [],
      temporalGaps: []
    };
  }

  private generateCrossContradictionRecommendations(
    contradictions: Contradiction[],
    consensus: ConsensusAnalysis,
    reliability: ReliabilityAnalysis,
    temporalConsistency: TemporalConsistencyAnalysis
  ): string[] {
    const recommendations: string[] = [];
    
    if (contradictions.length > 0) {
      recommendations.push('Multiple sources show contradictions - verification needed');
    }
    
    if (consensus.agreementScore < 0.5) {
      recommendations.push('Low consensus among sources - seek additional perspectives');
    }
    
    if (reliability.sourceCredibility < 0.6) {
      recommendations.push('Source credibility is low - consider more reliable sources');
    }
    
    if (temporalConsistency.consistencyScore < 0.7) {
      recommendations.push('Temporal inconsistencies detected - verify timing');
    }
    
    return recommendations;
  }

  private detectAnachronisms(events: TemporalEvent[]): string[] {
    // Simplified anachronism detection
    return [];
  }

  private detectTemporalGaps(events: TemporalEvent[]): string[] {
    // Simplified temporal gap detection
    return [];
  }

  private calculateTemporalConsistencyScore(
    events: TemporalEvent[],
    anachronisms: string[],
    gaps: string[]
  ): number {
    const totalIssues = anachronisms.length + gaps.length;
    return Math.max(0, 1 - (totalIssues / Math.max(1, events.length)));
  }

  private async generateSingleResolutionStrategy(
    contradiction: Contradiction,
    context: ContextData
  ): Promise<ContradictionResolution> {
    // Return the existing resolution from the contradiction
    return contradiction.resolution;
  }

  // Utility methods
  private generateAnalysisId(responseId: string, level: string): string {
    return `analysis_${responseId}_${level}_${Date.now()}`;
  }

  private generateDetectionId(): string {
    return `detection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup on instance destruction
   */
  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    this.detectionCache.clear();
  }
}

// Export singleton instance
export const contradictionDetector = new ContradictionDetector();

// Export convenience functions
export const detectContradictions = (request: ContradictionDetectionRequest) => 
  contradictionDetector.detectContradictions(request);
export const analyzeCrossContradictions = (sources: AIResponse[], context: ContextData, level?: 'basic' | 'standard' | 'comprehensive') => 
  contradictionDetector.analyzeCrossContradictions(sources, context, level);
export const checkTemporalConsistency = (events: { event: string; time: Date; source: string }[], context: ContextData) => 
  contradictionDetector.checkTemporalConsistency(events, context);
export const generateResolutionStrategies = (contradictions: Contradiction[], context: ContextData) => 
  contradictionDetector.generateResolutionStrategies(contradictions, context);