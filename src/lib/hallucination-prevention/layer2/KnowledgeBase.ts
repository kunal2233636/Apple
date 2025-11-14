// Layer 2: Knowledge Base Integration for Educational Content
// ============================================================
// KnowledgeBase - Educational content management with subject-specific
// search, fact verification, and source reliability scoring

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';

export type SourceType = 'textbook' | 'website' | 'academic_paper' | 'official_doc' | 'verified_content';
export type ContentType = 'fact' | 'concept' | 'procedure' | 'example' | 'reference';
export type VerificationStatus = 'verified' | 'pending' | 'disputed';

export interface EducationalSource {
  id: string;
  type: SourceType;
  title: string;
  content: string;
  url?: string;
  author: string;
  publicationDate: Date;
  verificationStatus: VerificationStatus;
  reliability: number; // 0-1 scale
  topics: string[];
  citations: number;
  educationalRelevance: number; // 0-1 scale
  lastUpdated: Date;
  metadata: SourceMetadata;
}

export interface SourceMetadata {
  subject: string;
  gradeLevel: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  language: string;
  format: 'text' | 'video' | 'interactive' | 'assessment';
  accessLevel: 'public' | 'subscription' | 'premium';
  qualityScore: number;
  peerReviewed: boolean;
  lastVerified: Date;
  verificationMethod: string;
  tags: string[];
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string;
  sourceId: string;
  confidence: number;
  lastVerified: Date;
  topics: string[];
  subject: string;
  type: ContentType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  relatedConcepts: string[];
  educationalValue: number; // 0-1 scale
  prerequisites: string[];
  learningObjectives: string[];
  verificationStatus: VerificationStatus;
  metadata: EntryMetadata;
}

export interface EntryMetadata {
  explanation: string;
  examples: string[];
  commonMisconceptions: string[];
  relatedQuestions: string[];
  difficultyProgression: number;
  retentionScore: number;
  engagementScore: number;
  accuracyScore: number;
}

export interface SearchFilters {
  subjects?: string[];
  topics?: string[];
  contentTypes?: ContentType[];
  difficulty?: 1 | 2 | 3 | 4 | 5;
  minReliability?: number;
  minEducationalValue?: number;
  sourceTypes?: SourceType[];
  verificationStatus?: VerificationStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  relevanceScore: number;
  matchReasons: string[];
  snippets: SearchSnippet[];
  context: string;
}

export interface SearchSnippet {
  field: string;
  snippet: string;
  highlight: string;
  position: number;
}

export interface FactValidationRequest {
  fact: string;
  context?: string;
  sources?: string[];
  strictness: 'lenient' | 'moderate' | 'strict';
}

export interface FactValidationResult {
  isValid: boolean;
  confidence: number;
  supportingSources: EducationalSource[];
  contradictingSources: EducationalSource[];
  evidence: ValidationEvidence[];
  recommendations: string[];
}

export interface ValidationEvidence {
  source: EducationalSource;
  evidence: string;
  strength: number; // 0-1
  relevance: number; // 0-1
}

export interface RelatedFact {
  fact: string;
  relationship: 'supports' | 'contradicts' | 'elaborates' | 'prerequisite' | 'consequence';
  strength: number; // 0-1
  explanation: string;
}

export class KnowledgeBase {
  private static readonly DEFAULT_SEARCH_LIMIT = 20;
  private static readonly MAX_SEARCH_RESULTS = 100;
  private static readonly MIN_RELIABILITY_THRESHOLD = 0.6;
  private static readonly MIN_EDUCATIONAL_VALUE = 0.4;

  private searchCache: Map<string, { results: KnowledgeSearchResult[]; timestamp: Date; expiresAt: Date }> = new Map();
  private sourceCache: Map<string, { source: EducationalSource; timestamp: Date; expiresAt: Date }> = new Map();

  constructor() {
    this.startCacheCleanup();
  }

  /**
   * Search educational knowledge base
   */
  async searchKnowledge(query: string, filters: SearchFilters = {}): Promise<KnowledgeSearchResult[]> {
    const startTime = Date.now();
    
    try {
      logInfo('Knowledge base search started', {
        componentName: 'KnowledgeBase',
        query: query.substring(0, 100),
        filters: Object.keys(filters).length,
        limit: filters.limit
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(query, filters);
      const cached = this.searchCache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        logInfo('Returning cached search results', {
          componentName: 'KnowledgeBase',
          query: query.substring(0, 100),
          resultCount: cached.results.length
        });
        return cached.results.slice(0, filters.limit || KnowledgeBase.DEFAULT_SEARCH_LIMIT);
      }

      // Build search query
      const searchQuery = this.buildSearchQuery(query, filters);
      
      const { data, error } = await (supabase
        .from('educational_knowledge_base') as any)
        .select(`
          *,
          educational_sources!inner (
            id,
            type,
            title,
            author,
            reliability,
            verification_status,
            educational_relevance
          )
        `)
        .or(searchQuery.orClause)
        .order('educational_value', { ascending: false })
        .limit(filters.limit || KnowledgeBase.DEFAULT_SEARCH_LIMIT);

      if (error) {
        throw new Error(`Knowledge base search failed: ${error.message}`);
      }

      const rawResults = data || [];
      const results: KnowledgeSearchResult[] = [];

      for (const raw of rawResults) {
        try {
          const entry = this.mapToKnowledgeEntry(raw);
          const relevanceScore = this.calculateRelevanceScore(entry, query, filters);
          
          if (relevanceScore < 0.1) continue;

          const matchReasons = this.findMatchReasons(entry, query, filters);
          const snippets = this.generateSearchSnippets(entry, query);
          const context = this.createSearchContext(entry, filters);

          results.push({
            entry,
            relevanceScore,
            matchReasons,
            snippets,
            context
          });

        } catch (error) {
          logWarning('Failed to process search result', {
            componentName: 'KnowledgeBase',
            entryId: (raw as any)?.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      const finalResults = results.slice(0, filters.limit || KnowledgeBase.DEFAULT_SEARCH_LIMIT);

      // Cache the results
      this.searchCache.set(cacheKey, {
        results: finalResults,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      const processingTime = Date.now() - startTime;
      logInfo('Knowledge base search completed', {
        componentName: 'KnowledgeBase',
        query: query.substring(0, 100),
        resultCount: finalResults.length,
        processingTime
      });

      return finalResults;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'KnowledgeBase',
        operation: 'search_knowledge',
        query
      });

      return [];
    }
  }

  /**
   * Get related facts for a given fact
   */
  async getRelatedFacts(factId: string): Promise<RelatedFact[]> {
    try {
      const { data, error } = await (supabase
        .from('fact_relationships') as any)
        .select(`
          *,
          related_fact:educational_knowledge_base!related_fact_id (*)
        `)
        .eq('fact_id', factId)
        .order('relationship_strength', { ascending: false });

      if (error) {
        throw new Error(`Failed to get related facts: ${error.message}`);
      }

      return (data || []).map((relationship: any) => ({
        fact: relationship.related_fact?.content || '',
        relationship: relationship.relationship_type,
        strength: relationship.relationship_strength,
        explanation: relationship.explanation || ''
      }));

    } catch (error) {
      logWarning('Failed to get related facts', { factId, error });
      return [];
    }
  }

  /**
   * Validate a fact against the knowledge base
   */
  async validateFact(request: FactValidationRequest): Promise<FactValidationResult> {
    try {
      logInfo('Fact validation started', {
        componentName: 'KnowledgeBase',
        fact: request.fact.substring(0, 100),
        strictness: request.strictness
      });

      // Search for supporting evidence
      const searchResults = await this.searchKnowledge(request.fact, {
        minReliability: this.getReliabilityThreshold(request.strictness),
        limit: 10
      });

      const supportingSources: EducationalSource[] = [];
      const contradictingSources: EducationalSource[] = [];
      const evidence: ValidationEvidence[] = [];

      for (const result of searchResults) {
        const source = await this.getSourceById(result.entry.sourceId);
        if (!source) continue;

        const similarity = this.calculateFactSimilarity(request.fact, result.entry.content);
        
        if (similarity > 0.7) {
          supportingSources.push(source);
          evidence.push({
            source,
            evidence: result.entry.content,
            strength: similarity * result.relevanceScore,
            relevance: result.relevanceScore
          });
        } else if (similarity < 0.3) {
          contradictingSources.push(source);
        }
      }

      // Calculate overall validation
      const supportingScore = supportingSources.reduce((sum, source) => sum + source.reliability, 0) / Math.max(1, supportingSources.length);
      const contradictingScore = contradictingSources.reduce((sum, source) => sum + source.reliability, 0) / Math.max(1, contradictingSources.length);
      
      const confidence = Math.max(0, Math.min(1, supportingScore - contradictingScore));
      const isValid = confidence > 0.6 && supportingSources.length > contradictingSources.length;

      const recommendations = this.generateValidationRecommendations(isValid, confidence, supportingSources.length, contradictingSources.length);

      logInfo('Fact validation completed', {
        componentName: 'KnowledgeBase',
        isValid,
        confidence,
        supportingSources: supportingSources.length,
        contradictingSources: contradictingSources.length
      });

      return {
        isValid,
        confidence,
        supportingSources,
        contradictingSources,
        evidence,
        recommendations
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'KnowledgeBase',
        operation: 'validate_fact',
        fact: request.fact.substring(0, 100)
      });

      return {
        isValid: false,
        confidence: 0,
        supportingSources: [],
        contradictingSources: [],
        evidence: [],
        recommendations: ['Unable to validate fact due to system error']
      };
    }
  }

  /**
   * Add new educational source
   */
  async addSource(source: Omit<EducationalSource, 'id' | 'lastUpdated'>): Promise<string> {
    try {
      const sourceData = {
        ...source,
        last_updated: new Date().toISOString(),
        metadata: JSON.stringify(source.metadata)
      };

      const { data, error } = await (supabase
        .from('educational_sources') as any)
        .insert([sourceData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add source: ${error.message}`);
      }

      // Invalidate cache
      this.sourceCache.clear();
      this.searchCache.clear();

      logInfo('Educational source added', {
        componentName: 'KnowledgeBase',
        sourceId: data.id,
        title: source.title,
        type: source.type
      });

      return data.id;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'KnowledgeBase',
        operation: 'add_source',
        title: source.title
      });

      throw new Error(`Failed to add source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update source verification status
   */
  async updateSourceVerification(sourceId: string, status: VerificationStatus, reliability?: number): Promise<boolean> {
    try {
      const updateData: any = {
        verification_status: status,
        last_updated: new Date().toISOString()
      };

      if (reliability !== undefined) {
        updateData.reliability = reliability;
      }

      const { error } = await (supabase
        .from('educational_sources') as any)
        .update(updateData)
        .eq('id', sourceId);

      if (error) {
        throw new Error(`Failed to update source verification: ${error.message}`);
      }

      // Invalidate cache
      this.sourceCache.delete(sourceId);
      this.searchCache.clear();

      logInfo('Source verification updated', {
        componentName: 'KnowledgeBase',
        sourceId,
        status,
        reliability
      });

      return true;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'KnowledgeBase',
        operation: 'update_source_verification',
        sourceId
      });

      return false;
    }
  }

  /**
   * Get source by ID
   */
  async getSourceById(sourceId: string): Promise<EducationalSource | null> {
    // Check cache first
    const cached = this.sourceCache.get(sourceId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.source;
    }

    try {
      const { data, error } = await (supabase
        .from('educational_sources') as any)
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      const source = this.mapToSource(data);
      
      // Cache the source
      this.sourceCache.set(sourceId, {
        source,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });

      return source;

    } catch (error) {
      logWarning('Failed to get source by ID', { sourceId, error });
      return null;
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getStatistics(): Promise<{
    totalSources: number;
    totalEntries: number;
    verifiedSources: number;
    averageReliability: number;
    subjects: Record<string, number>;
    contentTypes: Record<ContentType, number>;
  }> {
    try {
      const [sourcesResult, entriesResult] = await Promise.all([
        (supabase.from('educational_sources') as any).select('*'),
        (supabase.from('educational_knowledge_base') as any).select('*')
      ]);

      const sources = sourcesResult.data || [];
      const entries = entriesResult.data || [];

      const verifiedSources = sources.filter((s: any) => s.verification_status === 'verified').length;
      const averageReliability = sources.length > 0 
        ? sources.reduce((sum: number, s: any) => sum + (s.reliability || 0), 0) / sources.length
        : 0;

      const subjects: Record<string, number> = {};
      const contentTypes: Record<ContentType, number> = {
        fact: 0,
        concept: 0,
        procedure: 0,
        example: 0,
        reference: 0
      };

      entries.forEach((entry: any) => {
        if (entry.subject) {
          subjects[entry.subject] = (subjects[entry.subject] || 0) + 1;
        }
        if (entry.type && contentTypes.hasOwnProperty(entry.type)) {
          contentTypes[entry.type as ContentType]++;
        }
      });

      return {
        totalSources: sources.length,
        totalEntries: entries.length,
        verifiedSources,
        averageReliability,
        subjects,
        contentTypes
      };

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'KnowledgeBase',
        operation: 'get_statistics'
      });

      return {
        totalSources: 0,
        totalEntries: 0,
        verifiedSources: 0,
        averageReliability: 0,
        subjects: {},
        contentTypes: {
          fact: 0,
          concept: 0,
          procedure: 0,
          example: 0,
          reference: 0
        }
      };
    }
  }

  /**
   * Private helper methods
   */
  private buildSearchQuery(query: string, filters: SearchFilters): { orClause: string } {
    const conditions: string[] = [];

    // Text search
    if (query) {
      conditions.push(`content.ilike.%${query}%,title.ilike.%${query}%`);
    }

    // Subject filters
    if (filters.subjects && filters.subjects.length > 0) {
      const subjectConditions = filters.subjects.map(subject => `subject.eq.${subject}`).join(',');
      conditions.push(`or(${subjectConditions})`);
    }

    // Topic filters
    if (filters.topics && filters.topics.length > 0) {
      const topicConditions = filters.topics.map(topic => `topics.cs.{${topic}}`).join(',');
      conditions.push(`or(${topicConditions})`);
    }

    // Content type filters
    if (filters.contentTypes && filters.contentTypes.length > 0) {
      const typeConditions = filters.contentTypes.map(type => `type.eq.${type}`).join(',');
      conditions.push(`or(${typeConditions})`);
    }

    // Difficulty filter
    if (filters.difficulty) {
      conditions.push(`difficulty_level.eq.${filters.difficulty}`);
    }

    // Reliability filter
    if (filters.minReliability) {
      conditions.push(`reliability.gte.${filters.minReliability}`);
    }

    // Educational value filter
    if (filters.minEducationalValue) {
      conditions.push(`educational_value.gte.${filters.minEducationalValue}`);
    }

    // Verification status filter
    if (filters.verificationStatus && filters.verificationStatus.length > 0) {
      const statusConditions = filters.verificationStatus.map(status => `verification_status.eq.${status}`).join(',');
      conditions.push(`or(${statusConditions})`);
    }

    // Date range filter
    if (filters.dateRange) {
      conditions.push(`updated_at.gte.${filters.dateRange.start.toISOString()}`);
      conditions.push(`updated_at.lte.${filters.dateRange.end.toISOString()}`);
    }

    const orClause = conditions.length > 0 ? conditions.join(',') : 'id.not.is.null';
    
    return { orClause };
  }

  private calculateRelevanceScore(entry: KnowledgeEntry, query: string, filters: SearchFilters): number {
    let score = 0;

    // Base relevance from educational value
    score += entry.educationalValue * 0.3;

    // Query matching
    if (query) {
      const queryWords = query.toLowerCase().split(/\s+/);
      const contentWords = entry.content.toLowerCase().split(/\s+/);
      const topicWords = entry.topics.map(t => t.toLowerCase());
      
      let matchScore = 0;
      for (const word of queryWords) {
        if (contentWords.some(w => w.includes(word))) matchScore += 0.3;
        if (topicWords.some(t => t.includes(word))) matchScore += 0.4;
      }
      score += Math.min(0.5, matchScore);
    }

    // Filter bonuses
    if (filters.subjects?.includes(entry.subject)) score += 0.1;
    if (filters.contentTypes?.includes(entry.type)) score += 0.1;
    if (filters.difficulty === entry.difficulty) score += 0.05;

    // Source reliability bonus
    score += entry.confidence * 0.1;

    return Math.min(1.0, score);
  }

  private findMatchReasons(entry: KnowledgeEntry, query: string, filters: SearchFilters): string[] {
    const reasons: string[] = [];

    if (query) {
      const queryLower = query.toLowerCase();
      if (entry.content.toLowerCase().includes(queryLower)) {
        reasons.push('Content match');
      }
      if (entry.topics.some(topic => topic.toLowerCase().includes(queryLower))) {
        reasons.push('Topic match');
      }
    }

    if (filters.subjects?.includes(entry.subject)) {
      reasons.push(`Subject: ${entry.subject}`);
    }

    if (filters.contentTypes?.includes(entry.type)) {
      reasons.push(`Type: ${entry.type}`);
    }

    if (entry.educationalValue > 0.8) {
      reasons.push('High educational value');
    }

    if (entry.confidence > 0.9) {
      reasons.push('High confidence');
    }

    return reasons;
  }

  private generateSearchSnippets(entry: KnowledgeEntry, query: string): SearchSnippet[] {
    const snippets: SearchSnippet[] = [];
    
    if (query) {
      const content = entry.content;
      const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
      
      if (queryIndex !== -1) {
        const snippet = content.substring(
          Math.max(0, queryIndex - 50),
          Math.min(content.length, queryIndex + query.length + 50)
        );
        
        snippets.push({
          field: 'content',
          snippet,
          highlight: this.createHighlight(snippet, query),
          position: queryIndex
        });
      }
    }

    return snippets.slice(0, 3);
  }

  private createHighlight(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '**$1**');
  }

  private createSearchContext(entry: KnowledgeEntry, filters: SearchFilters): string {
    const contextParts: string[] = [];
    
    if (entry.subject) {
      contextParts.push(`Subject: ${entry.subject}`);
    }
    
    if (entry.type) {
      contextParts.push(`Type: ${entry.type}`);
    }
    
    if (entry.difficulty) {
      contextParts.push(`Difficulty: ${entry.difficulty}/5`);
    }
    
    if (entry.educationalValue > 0.8) {
      contextParts.push('High educational value');
    }
    
    return contextParts.join(' • ');
  }

  private calculateFactSimilarity(fact1: string, fact2: string): number {
    const words1 = new Set(fact1.toLowerCase().split(/\s+/));
    const words2 = new Set(fact2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private getReliabilityThreshold(strictness: 'lenient' | 'moderate' | 'strict'): number {
    switch (strictness) {
      case 'lenient': return 0.5;
      case 'moderate': return 0.7;
      case 'strict': return 0.9;
      default: return 0.6;
    }
  }

  private generateValidationRecommendations(
    isValid: boolean, 
    confidence: number, 
    supportingCount: number, 
    contradictingCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (!isValid) {
      recommendations.push('Fact requires additional verification');
      if (supportingCount === 0) {
        recommendations.push('No supporting evidence found in knowledge base');
      }
      if (contradictingCount > 0) {
        recommendations.push('Contradicting evidence found');
      }
    } else {
      recommendations.push('Fact is well-supported by reliable sources');
    }

    if (confidence < 0.7) {
      recommendations.push('Consider seeking additional sources for confirmation');
    }

    if (supportingCount < 3) {
      recommendations.push('More supporting sources would increase confidence');
    }

    return recommendations;
  }

  private mapToKnowledgeEntry(raw: any): KnowledgeEntry {
    return {
      id: raw.id,
      content: raw.content,
      source: raw.source,
      sourceId: raw.educational_sources?.id || raw.source_id,
      confidence: raw.reliability,
      lastVerified: new Date(raw.updated_at),
      topics: raw.topics || [],
      subject: raw.subject,
      type: raw.type,
      difficulty: raw.difficulty_level || 3,
      relatedConcepts: raw.related_concepts || [],
      educationalValue: raw.educational_value || 0.5,
      prerequisites: raw.prerequisites || [],
      learningObjectives: raw.learning_objectives || [],
      verificationStatus: raw.verification_status,
      metadata: {
        explanation: raw.explanation || '',
        examples: raw.examples || [],
        commonMisconceptions: raw.common_misconceptions || [],
        relatedQuestions: raw.related_questions || [],
        difficultyProgression: raw.difficulty_progression || 0,
        retentionScore: raw.retention_score || 0.5,
        engagementScore: raw.engagement_score || 0.5,
        accuracyScore: raw.accuracy_score || 0.5
      }
    };
  }

  private mapToSource(raw: any): EducationalSource {
    return {
      id: raw.id,
      type: raw.type,
      title: raw.title,
      content: raw.content,
      url: raw.url,
      author: raw.author,
      publicationDate: new Date(raw.publication_date),
      verificationStatus: raw.verification_status,
      reliability: raw.reliability,
      topics: raw.topics || [],
      citations: raw.citations || 0,
      educationalRelevance: raw.educational_relevance || 0.5,
      lastUpdated: new Date(raw.last_updated),
      metadata: raw.metadata ? JSON.parse(raw.metadata) : {}
    };
  }

  private generateCacheKey(query: string, filters: SearchFilters): string {
    const keyData = {
      query,
      subjects: filters.subjects?.sort(),
      topics: filters.topics?.sort(),
      contentTypes: filters.contentTypes?.sort(),
      difficulty: filters.difficulty,
      minReliability: filters.minReliability,
      minEducationalValue: filters.minEducationalValue,
      verificationStatus: filters.verificationStatus?.sort(),
      limit: filters.limit
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      // Clean search cache
      for (const [key, cached] of this.searchCache.entries()) {
        if (cached.expiresAt <= now) {
          this.searchCache.delete(key);
        }
      }
      
      // Clean source cache
      for (const [key, cached] of this.sourceCache.entries()) {
        if (cached.expiresAt <= now) {
          this.sourceCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.searchCache.clear();
    this.sourceCache.clear();
  }
}

// Export singleton instance
export const knowledgeBase = new KnowledgeBase();

// Convenience functions
export const searchKnowledge = (query: string, filters?: SearchFilters) => 
  knowledgeBase.searchKnowledge(query, filters);

export const validateFact = (request: FactValidationRequest) => 
  knowledgeBase.validateFact(request);

export const getRelatedFacts = (factId: string) => 
  knowledgeBase.getRelatedFacts(factId);

export const addEducationalSource = (source: Omit<EducationalSource, 'id' | 'lastUpdated'>) => 
  knowledgeBase.addSource(source);

export const updateSourceVerification = (sourceId: string, status: VerificationStatus, reliability?: number) => 
  knowledgeBase.updateSourceVerification(sourceId, status, reliability);

export const getKnowledgeBaseStatistics = () => 
  knowledgeBase.getStatistics();