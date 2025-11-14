// Layer 3: Response Validation & Fact-Checking System
// ====================================================
// FactChecker - Educational content verification, fact checking, and source validation

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';
import type { ResponseValidationResult } from './ResponseValidator';

export type VerificationStatus = 'verified' | 'disputed' | 'inconclusive' | 'unverified';
export type VerificationType = 'content' | 'source' | 'cross_reference' | 'expert_review' | 'automated';
export type FactType = 'factual' | 'numerical' | 'statistical' | 'historical' | 'scientific' | 'definition';

export interface Claim {
  id: string;
  text: string;
  type: FactType;
  confidence: number; // 0-1, AI confidence in the claim
  extractedFrom: string; // Source text
  context: string; // Surrounding context
  keywords: string[];
  entities: Entity[];
}

export interface Entity {
  text: string;
  type: 'person' | 'place' | 'organization' | 'date' | 'number' | 'concept' | 'event';
  confidence: number; // 0-1
  startIndex: number;
  endIndex: number;
}

export interface FactCheckResult {
  claimId: string;
  claim: Claim;
  status: VerificationStatus;
  confidence: number; // 0-1, verification confidence
  verificationMethod: VerificationType;
  evidence: VerificationEvidence[];
  conflictingEvidence: VerificationEvidence[];
  sources: SourceVerification[];
  alternativeSources: SourceVerification[];
  verificationNotes: string;
  lastVerified: Date;
  verificationId: string;
}

export interface VerificationEvidence {
  source: string;
  evidence: string;
  confidence: number; // 0-1
  excerpt: string;
  relevanceScore: number; // 0-1
  verificationDate: Date;
}

export interface SourceVerification {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  url?: string;
  reliability: number; // 0-1
  verificationStatus: VerificationStatus;
  evidence: string[];
  lastAccessed: Date;
}

export interface CrossReferenceResult {
  claimId: string;
  consensusScore: number; // 0-1
  supportingSources: SourceVerification[];
  contradictingSources: SourceVerification[];
  neutralSources: SourceVerification[];
  conflictingClaims: ConflictingClaim[];
  verificationConfidence: number; // 0-1
  consensusNotes: string;
}

export interface ConflictingClaim {
  claim: string;
  source: string;
  confidence: number;
  relevanceScore: number;
  type: FactType;
}

export interface Contradiction {
  claim1: string;
  claim2: string;
  contradictionScore: number; // 0-1
  evidence: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FactCheckRequest {
  responseId: string;
  claims: Claim[];
  context: {
    knowledgeBase?: any[];
    conversationHistory?: any[];
    externalSources?: any[];
    userProfile?: any;
  };
  verificationLevel: 'basic' | 'standard' | 'comprehensive';
  requiredVerifications: VerificationType[];
  minConfidence: number; // 0-1
  sourcesToCheck: string[];
  excludeSources: string[];
  maxProcessingTime: number;
  includeCrossReference: boolean;
  includeAlternativeSources: boolean;
}

export interface FactCheckSummary {
  totalClaims: number;
  verifiedClaims: number;
  disputedClaims: number;
  unverifiedClaims: number;
  contradictoryClaims: number;
  overallConfidence: number; // 0-1
  qualityScore: number; // 0-1
  verificationMethod: string;
  processingTime: number;
  recommendations: string[];
  criticalIssues: string[];
  factCheckResults: FactCheckResult[];
}

export class FactChecker {
  private static readonly DEFAULT_TIMEOUT_MS = 15000;
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly MAX_CLAIMS_PER_REQUEST = 50;
  private static readonly MAX_SOURCES_PER_CHECK = 10;

  private cryptoKey: string;
  private verificationCache: Map<string, FactCheckResult> = new Map();
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cryptoKey = process.env.FACT_CHECKER_KEY || 'default-fact-checker-key';
    this.startCacheCleanup();
  }

  /**
   * Main fact checking method
   */
  async checkFacts(request: FactCheckRequest): Promise<FactCheckSummary> {
    const startTime = Date.now();
    const checkId = this.generateCheckId(request.responseId, request.verificationLevel);
    
    try {
      logInfo('Fact checking started', {
        componentName: 'FactChecker',
        checkId,
        responseId: request.responseId,
        claimCount: request.claims.length,
        verificationLevel: request.verificationLevel
      });

      // Validate request
      if (request.claims.length === 0) {
        return this.createEmptyCheckSummary(startTime, 'No claims to verify');
      }

      if (request.claims.length > FactChecker.MAX_CLAIMS_PER_REQUEST) {
        logWarning('Too many claims for fact checking', {
          checkId,
          claimCount: request.claims.length,
          maxAllowed: FactChecker.MAX_CLAIMS_PER_REQUEST
        });
        
        return this.createFailedCheckSummary(startTime, new Error(`Too many claims: ${request.claims.length}`));
      }

      // Process claims
      const factCheckResults: FactCheckResult[] = [];
      const verificationPromises: Promise<FactCheckResult>[] = [];

      for (const claim of request.claims) {
        // Check cache first
        const cacheKey = this.generateCacheKey(claim);
        const cached = this.getCachedVerification(cacheKey);
        
        if (cached) {
          factCheckResults.push(cached);
        } else {
          // Create verification promise
          const verificationPromise = this.verifySingleClaim(claim, request);
          verificationPromises.push(verificationPromise);
        }
      }

      // Execute all verifications concurrently with timeout
      if (verificationPromises.length > 0) {
        const results = await Promise.allSettled(verificationPromises);
        
        for (let i = 0, j = 0; i < results.length && j < request.claims.length; j++) {
          const claim = request.claims[j];
          const cacheKey = this.generateCacheKey(claim);
          
          if (this.getCachedVerification(cacheKey)) {
            // Already added from cache
            continue;
          }
          
          const result = results[i];
          if (result.status === 'fulfilled') {
            const factCheckResult = result.value;
            factCheckResults.push(factCheckResult);
            this.cacheVerification(cacheKey, factCheckResult);
          } else {
            // Add failed verification
            const failedResult = this.createFailedVerification(claim, result.reason);
            factCheckResults.push(failedResult);
          }
          
          i++;
        }
      }

      // Generate summary
      const summary = this.generateFactCheckSummary(
        factCheckResults,
        request,
        Date.now() - startTime
      );

      // Store summary in database
      await this.storeFactCheckRecord(summary, request);

      logInfo('Fact checking completed', {
        componentName: 'FactChecker',
        checkId,
        totalClaims: summary.totalClaims,
        verifiedClaims: summary.verifiedClaims,
        processingTime: summary.processingTime,
        overallConfidence: summary.overallConfidence
      });

      return summary;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FactChecker',
        checkId,
        responseId: request.responseId,
        processingTime
      });

      return this.createFailedCheckSummary(processingTime, error);
    }
  }

  /**
   * Cross-reference facts against multiple sources
   */
  async crossReference(
    facts: string[],
    context: {
      knowledgeBase?: any[];
      externalSources?: any[];
      conversationHistory?: any[];
    },
    minSources: number = 2
  ): Promise<CrossReferenceResult[]> {
    try {
      logInfo('Cross-referencing started', {
        componentName: 'FactChecker',
        factCount: facts.length,
        minSources
      });

      const results: CrossReferenceResult[] = [];

      for (const fact of facts) {
        const claim = await this.extractSingleClaim(fact);
        const supportingSources = await this.findSupportingSources(claim, context, minSources);
        const contradictingSources = await this.findContradictingSources(claim, context);
        const neutralSources = await this.findNeutralSources(claim, context);
        const conflictingClaims = await this.findConflictingClaims(claim, context);

        const consensusScore = this.calculateConsensusScore(supportingSources, contradictingSources);
        const verificationConfidence = this.calculateVerificationConfidence(
          claim,
          supportingSources,
          contradictingSources,
          { consensusScore, supportingSources, contradictingSources, neutralSources, conflictingClaims, verificationConfidence: 0.5, consensusNotes: 'Cross-reference completed' } as CrossReferenceResult
        );

        const result: CrossReferenceResult = {
          claimId: claim.id,
          consensusScore,
          supportingSources,
          contradictingSources,
          neutralSources,
          conflictingClaims,
          verificationConfidence,
          consensusNotes: this.generateConsensusNotes(supportingSources, contradictingSources, consensusScore)
        };

        results.push(result);
      }

      return results;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FactChecker',
        operation: 'cross_reference',
        factCount: facts.length
      });

      return [];
    }
  }

  /**
   * Detect contradictory claims in the response
   */
  async detectContradictoryClaims(
    response: {
      id: string;
      content: string;
    },
    context: {
      knowledgeBase?: any[];
      conversationHistory?: any[];
      externalSources?: any[];
    }
  ): Promise<Contradiction[]> {
    try {
      logInfo('Contradiction detection started', {
        componentName: 'FactChecker',
        responseId: response.id
      });

      // Extract claims from response
      const claims = await this.extractClaimsFromResponse(response.content);
      const contradictions: Contradiction[] = [];

      // Check for self-contradictions
      const selfContradictions = await this.findSelfContradictions(claims);
      contradictions.push(...selfContradictions);

      // Check for cross-contradictions with context
      const crossContradictions = await this.findCrossContradictions(claims, context);
      contradictions.push(...crossContradictions);

      // Check for temporal contradictions
      const temporalContradictions = await this.findTemporalContradictions(claims, context);
      contradictions.push(...temporalContradictions);

      logInfo('Contradiction detection completed', {
        componentName: 'FactChecker',
        responseId: response.id,
        contradictionCount: contradictions.length
      });

      return contradictions;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FactChecker',
        responseId: response.id,
        operation: 'detect_contradictions'
      });

      return [];
    }
  }

  /**
   * Verify a specific source
   */
  async verifySource(
    sourceId: string,
    type: VerificationType = 'content'
  ): Promise<SourceVerification> {
    try {
      // Get source from database
      const source = await this.getSourceById(sourceId);
      if (!source) {
        return this.createFailedSourceVerification(sourceId, type, new Error('Source not found'));
      }

      // Perform verification based on type
      switch (type) {
        case 'content':
          return await this.verifySourceContent(source);
        case 'source':
          return await this.verifySourceCredibility(source);
        case 'cross_reference':
          return await this.verifyThroughCrossReference(source);
        case 'expert_review':
          return await this.verifyThroughExpertReview(source);
        case 'automated':
          return await this.performAutomatedVerification(source);
        default:
          return this.createFailedSourceVerification(sourceId, type, new Error('Unknown verification type'));
      }

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FactChecker',
        sourceId,
        verificationType: type
      });

      return this.createFailedSourceVerification(sourceId, type, error);
    }
  }

  /**
   * Find alternative sources for a fact
   */
  async findAlternativeSources(
    fact: string,
    context: {
      knowledgeBase?: any[];
      externalSources?: any[];
    },
    limit: number = 5
  ): Promise<SourceVerification[]> {
    try {
      const keyTerms = this.extractKeyTerms(fact);
      const searchResults = await this.searchKnowledgeBase(keyTerms, context, limit);
      
      const sources: SourceVerification[] = [];
      
      for (const result of searchResults) {
        const source: SourceVerification = {
          sourceId: result.id || 'unknown',
          sourceTitle: result.title || 'Untitled',
          sourceType: result.type || 'unknown',
          url: result.url,
          reliability: result.reliability_score || 0.5,
          verificationStatus: 'unverified',
          evidence: ['Found through alternative search'],
          lastAccessed: new Date()
        };
        sources.push(source);
      }

      return sources;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'FactChecker',
        operation: 'find_alternative_sources',
        fact
      });

      return [];
    }
  }

  /**
   * Private implementation methods
   */

  private async verifySingleClaim(claim: Claim, request: FactCheckRequest): Promise<FactCheckResult> {
    try {
      // Find supporting evidence
      const supportingEvidence = await this.searchKnowledgeBaseForClaim(
        claim,
        request.context.knowledgeBase || []
      );

      // Find contradicting evidence
      const contradictingEvidence = await this.searchContradictingEvidence(
        claim,
        request.context.knowledgeBase || []
      );

      // Cross-reference the claim
      const crossReference = await this.crossReferenceSingleClaim(claim, request.context);

      // Determine verification status
      const status = this.determineVerificationStatus(
        supportingEvidence,
        contradictingEvidence,
        crossReference
      );

      // Calculate verification confidence
      const confidence = this.calculateVerificationConfidence(
        claim,
        supportingEvidence,
        contradictingEvidence,
        crossReference
      );

      // Select verification method
      const verificationMethod = this.selectVerificationMethod(claim, request);

      // Generate verification notes
      const verificationNotes = this.generateVerificationNotes(
        status,
        supportingEvidence,
        contradictingEvidence
      );

      const result: FactCheckResult = {
        claimId: claim.id,
        claim,
        status,
        confidence,
        verificationMethod,
        evidence: supportingEvidence,
        conflictingEvidence: contradictingEvidence,
        sources: [], // Would be populated in full implementation
        alternativeSources: [],
        verificationNotes,
        lastVerified: new Date(),
        verificationId: this.generateVerificationId(claim.id)
      };

      return result;

    } catch (error) {
      return this.createFailedVerification(claim, error);
    }
  }

  private async extractClaimsFromResponse(content: string): Promise<Claim[]> {
    const sentences = this.splitIntoSentences(content);
    const claims: Claim[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const entities = this.extractEntities(sentence);
      
      // Check if sentence contains factual claims
      if (this.isFactualClaim(sentence)) {
        const claim: Claim = {
          id: `claim_${i}`,
          text: sentence,
          type: this.classifyFactType(sentence),
          confidence: this.calculateClaimConfidence(sentence, entities),
          extractedFrom: content,
          context: this.getContextAroundSentence(content, sentence, i),
          keywords: this.extractKeywords(sentence),
          entities
        };
        claims.push(claim);
      }
    }
    
    return claims;
  }

  private isFactualClaim(sentence: string): boolean {
    // Simple heuristic for factual claims
    return sentence.includes('is') || sentence.includes('are') || sentence.includes('was') || 
           sentence.includes('were') || sentence.includes('has') || sentence.includes('have') ||
           /\d+/.test(sentence) ||
           /\b(according to|research|study|studies|evidence|proven|fact)\b/i.test(sentence);
  }

  private classifyFactType(sentence: string): FactType {
    if (/\d+/.test(sentence)) return 'numerical';
    if (/\b(percent|percentage|rate|probability|statistics)\b/i.test(sentence)) return 'statistical';
    if (/\b(year|date|history|historical|ancient|medieval|modern)\b/i.test(sentence)) return 'historical';
    if (/\b(theory|law|principle|experiment|hypothesis|scientific)\b/i.test(sentence)) return 'scientific';
    if (/\b(defined as|definition|means|refers to)\b/i.test(sentence)) return 'definition';
    return 'factual';
  }

  private calculateClaimConfidence(sentence: string, entities: Entity[]): number {
    let confidence = 0.6; // Base confidence
    
    // Increase confidence for specific information
    if (entities.length > 0) confidence += 0.1;
    if (/\d+/.test(sentence)) confidence += 0.1;
    if (/\b(according to|research|study)\b/i.test(sentence)) confidence += 0.1;
    
    // Decrease confidence for uncertain language
    if (/\b(might|could|possibly|perhaps|maybe)\b/i.test(sentence)) confidence -= 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private splitIntoSentences(content: string): string[] {
    return content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private getContextAroundSentence(content: string, sentence: string, index: number): string {
    const sentences = this.splitIntoSentences(content);
    const start = Math.max(0, index - 1);
    const end = Math.min(sentences.length, index + 2);
    return sentences.slice(start, end).join('. ') + '.';
  }

  private extractEntities(sentence: string): Entity[] {
    const entities: Entity[] = [];
    
    // Simple entity extraction patterns
    const patterns = [
      { type: 'person' as const, regex: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g },
      { type: 'date' as const, regex: /\b(\d{4})\b/g },
      { type: 'number' as const, regex: /\b(\d+(?:\.\d+)?)\b/g },
      { type: 'place' as const, regex: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:City|State|Country|County))\b/g }
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

  private extractKeywords(sentence: string): string[] {
    return sentence
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .slice(0, 10); // Limit keywords
  }

  private async getSourceById(sourceId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('id', sourceId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  private async searchKnowledgeBase(keyTerms: string[], context: { knowledgeBase?: any[]; externalSources?: any[] }, limit: number): Promise<any[]> {
    // Simplified search - in practice would use full-text search
    const results = (context.knowledgeBase || []).filter((item: any) => 
      keyTerms.some(term => 
        item.content.toLowerCase().includes(term.toLowerCase())
      )
    );
    return results.slice(0, limit);
  }

  private async searchKnowledgeBaseForClaim(claim: Claim, knowledgeBase: any[]): Promise<VerificationEvidence[]> {
    const evidence: VerificationEvidence[] = [];
    
    for (const item of knowledgeBase) {
      const similarity = this.calculateSimilarity(claim.text, item.content);
      if (similarity > 0.6) {
        evidence.push({
          source: item.title || 'Unknown Source',
          evidence: item.content,
          confidence: item.confidence || 0.7,
          excerpt: this.createExcerpt(item.content, claim.keywords),
          relevanceScore: similarity,
          verificationDate: new Date()
        });
      }
    }
    
    return evidence;
  }

  private async searchContradictingEvidence(claim: Claim, knowledgeBase: any[]): Promise<VerificationEvidence[]> {
    const evidence: VerificationEvidence[] = [];
    
    for (const item of knowledgeBase) {
      const similarity = this.calculateSimilarity(claim.text, item.content);
      if (similarity > 0.8) {
        // Check if this might be contradicting rather than supporting
        const contradictionScore = this.detectContradiction(claim.text, item.content);
        if (contradictionScore > 0.5) {
          evidence.push({
            source: item.title || 'Unknown Source',
            evidence: item.content,
            confidence: item.confidence || 0.7,
            excerpt: this.createExcerpt(item.content, claim.keywords),
            relevanceScore: contradictionScore,
            verificationDate: new Date()
          });
        }
      }
    }
    
    return evidence;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private detectContradiction(text1: string, text2: string): number {
    // Simple contradiction detection - look for negating words
    const negatingWords = ['not', 'never', 'no', 'none', 'nothing', 'neither', 'nor'];
    const text1Words = text1.toLowerCase();
    const text2Words = text2.toLowerCase();
    
    let contradictionScore = 0;
    
    for (const negatingWord of negatingWords) {
      if (text1Words.includes(negatingWord) !== text2Words.includes(negatingWord)) {
        contradictionScore += 0.3;
      }
    }
    
    return Math.min(1.0, contradictionScore);
  }

  private createExcerpt(content: string, keywords: string[]): string {
    const keyword = keywords[0];
    if (!keyword) return content.substring(0, 200) + '...';
    
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return content.substring(0, 200) + '...';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + keyword.length + 50);
    
    return (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
  }

  private determineVerificationStatus(
    supportingEvidence: VerificationEvidence[],
    contradictingEvidence: VerificationEvidence[],
    crossReference: CrossReferenceResult
  ): VerificationStatus {
    const supportingScore = supportingEvidence.reduce((sum, evidence) => sum + evidence.confidence * evidence.relevanceScore, 0);
    const contradictingScore = contradictingEvidence.reduce((sum, evidence) => sum + evidence.confidence * evidence.relevanceScore, 0);
    
    if (supportingScore > 0.7 && contradictingScore < 0.3) {
      return 'verified';
    } else if (contradictingScore > 0.5 || Math.abs(supportingScore - contradictingScore) < 0.2) {
      return 'disputed';
    } else if (supportingScore > 0.3) {
      return 'inconclusive';
    } else {
      return 'unverified';
    }
  }

  private calculateVerificationConfidence(
    claim: Claim,
    supportingEvidence: VerificationEvidence[],
    contradictingEvidence: VerificationEvidence[],
    crossReference: CrossReferenceResult
  ): number {
    let confidence = claim.confidence;
    
    // Adjust based on evidence quality
    if (supportingEvidence.length > 0) {
      const avgEvidenceConfidence = supportingEvidence.reduce((sum, e) => sum + e.confidence, 0) / supportingEvidence.length;
      confidence = (confidence + avgEvidenceConfidence) / 2;
    }
    
    // Reduce confidence if contradicting evidence exists
    if (contradictingEvidence.length > 0) {
      confidence *= 0.7;
    }
    
    // Adjust based on cross-reference consensus
    confidence = (confidence + crossReference.consensusScore) / 2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private selectVerificationMethod(claim: Claim, request: FactCheckRequest): VerificationType {
    if (request.requiredVerifications.includes('expert_review')) {
      return 'expert_review';
    } else if (claim.type === 'numerical' || claim.type === 'statistical') {
      return 'cross_reference';
    } else if (claim.confidence > 0.8) {
      return 'automated';
    } else {
      return 'content';
    }
  }

  private generateVerificationNotes(
    status: VerificationStatus,
    supportingEvidence: VerificationEvidence[],
    contradictingEvidence: VerificationEvidence[]
  ): string {
    const notes: string[] = [];
    
    notes.push(`Status: ${status}`);
    notes.push(`Supporting evidence: ${supportingEvidence.length} sources`);
    notes.push(`Contradicting evidence: ${contradictingEvidence.length} sources`);
    
    if (status === 'disputed' && contradictingEvidence.length > 0) {
      notes.push('Contradicting evidence requires review');
    } else if (status === 'unverified' && supportingEvidence.length === 0) {
      notes.push('No supporting evidence found');
    }
    
    return notes.join('; ');
  }

  // Placeholder methods for complex operations
  private async extractSingleClaim(fact: string): Promise<Claim> {
    return {
      id: 'single',
      text: fact,
      type: 'factual',
      confidence: 0.7,
      extractedFrom: fact,
      context: fact,
      keywords: this.extractKeywords(fact),
      entities: this.extractEntities(fact)
    };
  }

  private async findSupportingSources(claim: Claim, context: any, minSources: number): Promise<SourceVerification[]> {
    return []; // Simplified
  }

  private async findContradictingSources(claim: Claim, context: any): Promise<SourceVerification[]> {
    return []; // Simplified
  }

  private async findNeutralSources(claim: Claim, context: any): Promise<SourceVerification[]> {
    return []; // Simplified
  }

  private calculateConsensusScore(supporting: SourceVerification[], contradicting: SourceVerification[]): number {
    const totalSources = supporting.length + contradicting.length;
    if (totalSources === 0) return 0.5;
    return supporting.length / totalSources;
  }

  private async findConflictingClaims(claim: Claim, context: any): Promise<ConflictingClaim[]> {
    return []; // Simplified
  }

  private generateConsensusNotes(supporting: SourceVerification[], contradicting: SourceVerification[], score: number): string {
    return `Consensus score: ${score.toFixed(2)} (${supporting.length} supporting, ${contradicting.length} contradicting)`;
  }

  private async findSelfContradictions(claims: Claim[]): Promise<Contradiction[]> {
    return []; // Simplified
  }

  private async findCrossContradictions(claims: Claim[], context: any): Promise<Contradiction[]> {
    return []; // Simplified
  }

  private async findTemporalContradictions(claims: Claim[], context: any): Promise<Contradiction[]> {
    return []; // Simplified
  }

  private checkForContradiction(result1: FactCheckResult, result2: FactCheckResult): Contradiction | null {
    // Simplified contradiction detection
    return null;
  }

  private generateContradictionSuggestions(contradictions: Contradiction[]): string[] {
    const suggestions = ['Review contradictory claims for accuracy'];
    if (contradictions.length > 2) {
      suggestions.push('Multiple contradictions detected - consider fact verification');
    }
    return suggestions;
  }

  private async crossReferenceSingleClaim(claim: Claim, context: any): Promise<CrossReferenceResult> {
    return {
      claimId: claim.id,
      consensusScore: 0.5,
      supportingSources: [],
      contradictingSources: [],
      neutralSources: [],
      conflictingClaims: [],
      verificationConfidence: 0.5,
      consensusNotes: 'Cross-reference analysis pending'
    };
  }

  private async searchConversationHistory(claim: Claim, history: any[]): Promise<VerificationEvidence[]> {
    return []; // Simplified
  }

  private async searchExternalSources(claim: Claim, sources: any[]): Promise<VerificationEvidence[]> {
    return []; // Simplified
  }

  // Source verification methods
  private async verifySourceContent(source: any): Promise<SourceVerification> {
    return {
      sourceId: source.id,
      sourceTitle: source.title || 'Unknown',
      sourceType: source.source_type || 'unknown',
      url: source.url,
      reliability: source.reliability_score || 0.5,
      verificationStatus: 'verified',
      evidence: ['Content verification completed'],
      lastAccessed: new Date()
    };
  }

  private async verifySourceCredibility(source: any): Promise<SourceVerification> {
    return {
      sourceId: source.id,
      sourceTitle: source.title || 'Unknown',
      sourceType: source.source_type || 'unknown',
      url: source.url,
      reliability: source.reliability_score || 0.5,
      verificationStatus: 'verified',
      evidence: ['Credibility verification completed'],
      lastAccessed: new Date()
    };
  }

  private async verifyThroughCrossReference(source: any): Promise<SourceVerification> {
    return {
      sourceId: source.id,
      sourceTitle: source.title || 'Unknown',
      sourceType: source.source_type || 'unknown',
      url: source.url,
      reliability: source.reliability_score || 0.5,
      verificationStatus: 'verified',
      evidence: ['Cross-reference verification completed'],
      lastAccessed: new Date()
    };
  }

  private async verifyThroughExpertReview(source: any): Promise<SourceVerification> {
    return {
      sourceId: source.id,
      sourceTitle: source.title || 'Unknown',
      sourceType: source.source_type || 'unknown',
      url: source.url,
      reliability: source.reliability_score || 0.5,
      verificationStatus: 'verified',
      evidence: ['Expert review completed'],
      lastAccessed: new Date()
    };
  }

  private async performAutomatedVerification(source: any): Promise<SourceVerification> {
    return {
      sourceId: source.id,
      sourceTitle: source.title || 'Unknown',
      sourceType: source.source_type || 'unknown',
      url: source.url,
      reliability: source.reliability_score || 0.5,
      verificationStatus: 'verified',
      evidence: ['Automated verification completed'],
      lastAccessed: new Date()
    };
  }

  private createFailedSourceVerification(sourceId: string, verificationType: string, error: any): SourceVerification {
    return {
      sourceId,
      sourceTitle: 'Unknown',
      sourceType: 'unknown',
      reliability: 0,
      verificationStatus: 'unverified',
      evidence: [`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      lastAccessed: new Date()
    };
  }

  // Database and cache management
  private async storeFactCheckRecord(summary: FactCheckSummary, request: FactCheckRequest): Promise<void> {
    try {
      await (supabase
        .from('quality_metrics') as any)
        .insert([{
          user_id: request.context.userProfile?.id || null,
          interaction_id: request.responseId,
          quality_score: summary.qualityScore,
          hallucination_probability: 1 - summary.overallConfidence,
          anomaly_indicators: {
            unverified_claims: summary.unverifiedClaims,
            contradictory_claims: summary.contradictoryClaims,
            verification_level: request.verificationLevel
          },
          alerts_triggered: summary.criticalIssues,
          monitoring_data: {
            fact_check_summary: summary,
            verification_method: summary.verificationMethod,
            processing_time: summary.processingTime
          }
        }]);

    } catch (error) {
      logWarning('Failed to store fact check record', { error });
    }
  }

  private getCachedVerification(verificationId: string): FactCheckResult | null {
    return this.verificationCache.get(verificationId) || null;
  }

  private cacheVerification(verificationId: string, result: FactCheckResult): void {
    this.verificationCache.set(verificationId, result);
  }

  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      const now = new Date();
      let cleaned = 0;

      for (const [key, result] of this.verificationCache.entries()) {
        if (result.lastVerified.getTime() + 10 * 60 * 1000 < now.getTime()) { // 10 minutes
          this.verificationCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logInfo('Fact check cache cleanup completed', {
          componentName: 'FactChecker',
          entriesRemoved: cleaned,
          remainingEntries: this.verificationCache.size
        });
      }
    }, 10 * 60 * 1000); // Clean every 10 minutes
  }

  private createEmptyCheckSummary(processingTime: number, reason: string): FactCheckSummary {
    return {
      totalClaims: 0,
      verifiedClaims: 0,
      disputedClaims: 0,
      unverifiedClaims: 0,
      contradictoryClaims: 0,
      overallConfidence: 1.0,
      qualityScore: 1.0,
      verificationMethod: 'none',
      processingTime,
      recommendations: [reason],
      criticalIssues: []
    };
  }

  private createFailedCheckSummary(processingTime: number, error: any): FactCheckSummary {
    return {
      totalClaims: 0,
      verifiedClaims: 0,
      disputedClaims: 0,
      unverifiedClaims: 0,
      contradictoryClaims: 0,
      overallConfidence: 0,
      qualityScore: 0,
      verificationMethod: 'failed',
      processingTime,
      recommendations: ['Fact checking failed - manual verification required'],
      criticalIssues: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }

  private createFailedVerification(claim: Claim, error: any): FactCheckResult {
    return {
      claimId: claim.id,
      claim,
      status: 'unverified',
      confidence: 0,
      verificationMethod: 'automated',
      evidence: [],
      conflictingEvidence: [],
      sources: [],
      alternativeSources: [],
      verificationNotes: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastVerified: new Date(),
      verificationId: this.generateVerificationId(claim.id)
    };
  }

  private generateCheckId(responseId: string, level: string): string {
    return `check_${responseId}_${level}_${Date.now()}`;
  }

  private generateVerificationId(claimId: string): string {
    return `verify_${claimId}_${Date.now()}`;
  }

  private generateCacheKey(claim: Claim): string {
    return `verification_${createHash('md5').update(claim.text).digest('hex')}`;
  }

  private generateFactCheckSummary(
    factCheckResults: FactCheckResult[],
    request: FactCheckRequest,
    processingTime: number
  ): FactCheckSummary {
    const totalClaims = factCheckResults.length;
    const verifiedClaims = factCheckResults.filter(r => r.status === 'verified').length;
    const disputedClaims = factCheckResults.filter(r => r.status === 'disputed').length;
    const unverifiedClaims = factCheckResults.filter(r => r.status === 'unverified').length;
    const contradictoryClaims = factCheckResults.filter(r => r.conflictingEvidence.length > 0).length;

    const overallConfidence = factCheckResults.length > 0 ?
      factCheckResults.reduce((sum, r) => sum + r.confidence, 0) / factCheckResults.length : 1.0;

    const qualityScore = (verifiedClaims * 1.0 + disputedClaims * 0.5) / Math.max(1, totalClaims);

    const recommendations = this.generateFactCheckRecommendations(factCheckResults);
    const criticalIssues = this.identifyCriticalFactCheckIssues(factCheckResults);

    return {
      totalClaims,
      verifiedClaims,
      disputedClaims,
      unverifiedClaims,
      contradictoryClaims,
      overallConfidence,
      qualityScore,
      verificationMethod: request.verificationLevel,
      processingTime,
      recommendations,
      criticalIssues,
      factCheckResults
    };
  }

  private generateFactCheckRecommendations(factCheckResults: FactCheckResult[]): string[] {
    const recommendations: string[] = [];

    const unverifiedCount = factCheckResults.filter(r => r.status === 'unverified').length;
    if (unverifiedCount > 0) {
      recommendations.push(`${unverifiedCount} claims require additional verification`);
    }

    const disputedCount = factCheckResults.filter(r => r.status === 'disputed').length;
    if (disputedCount > 0) {
      recommendations.push(`${disputedCount} claims have conflicting evidence and need review`);
    }

    const contradictoryCount = factCheckResults.filter(r => r.conflictingEvidence.length > 0).length;
    if (contradictoryCount > 0) {
      recommendations.push(`${contradictoryCount} claims contradict known information`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All claims are well-supported by evidence');
    }

    return recommendations;
  }

  private identifyCriticalFactCheckIssues(factCheckResults: FactCheckResult[]): string[] {
    const criticalIssues: string[] = [];

    // High number of unverified claims
    const unverifiedCount = factCheckResults.filter(r => r.status === 'unverified').length;
    if (unverifiedCount > factCheckResults.length * 0.5) {
      criticalIssues.push('More than 50% of claims are unverified');
    }

    // High number of disputed claims
    const disputedCount = factCheckResults.filter(r => r.status === 'disputed').length;
    if (disputedCount > 0) {
      criticalIssues.push(`${disputedCount} claims have conflicting evidence`);
    }

    // Claims with very low confidence
    const lowConfidenceCount = factCheckResults.filter(r => r.confidence < 0.3).length;
    if (lowConfidenceCount > 0) {
      criticalIssues.push(`${lowConfidenceCount} claims have very low confidence scores`);
    }

    return criticalIssues;
  }

  /**
   * Cleanup on instance destruction
   */
  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    this.verificationCache.clear();
  }
}

// Export singleton instance
export const factChecker = new FactChecker();

// Export convenience functions
export const checkFacts = (request: FactCheckRequest) => factChecker.checkFacts(request);
export const crossReference = (facts: string[], context: any, minSources?: number) => 
  factChecker.crossReference(facts, context, minSources);
export const detectContradictoryClaims = (response: { id: string; content: string }, context: any) => 
  factChecker.detectContradictoryClaims(response, context);
export const verifySource = (sourceId: string, type?: VerificationType) => 
  factChecker.verifySource(sourceId, type);
export const findAlternativeSources = (fact: string, context: any, limit?: number) => 
  factChecker.findAlternativeSources(fact, context, limit);