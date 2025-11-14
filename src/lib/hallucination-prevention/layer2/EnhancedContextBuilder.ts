// Layer 2: Enhanced Context Builder with 4-level compression system
// ================================================================
// EnhancedContextBuilder - Multi-level context building with educational
// content integration, knowledge grounding, and student profile optimization

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { searchMemories } from './ConversationMemory';

export type ContextLevel = 'light' | 'recent' | 'selective' | 'full';
export type EducationalContent = 'facts' | 'concepts' | 'procedures' | 'examples' | 'references';

export interface EnhancedContext {
  studentProfile: UltraCompressedProfile;
  knowledgeBase: KnowledgeEntry[];
  conversationHistory: ConversationSummary[];
  externalSources: EducationalSource[];
  factCheckPoints: FactCheckPoint[];
  confidenceMarkers: ConfidenceMarker[];
  compressionLevel: ContextLevel;
  tokenUsage: TokenUsage;
  lastOptimized: Date;
}

export interface UltraCompressedProfile {
  userId: string;
  learningStyle: LearningStyle;
  strongSubjects: string[];
  weakSubjects: string[];
  currentLevel: number;
  streakDays: number;
  totalPoints: number;
  preferredComplexity: ComplexityLevel;
  recentTopics: string[];
  studyProgress: StudyProgress;
  learningObjectives: string[];
  lastSessionSummary: string;
  compressedMetadata: {
    totalSessions: number;
    averageSessionTime: number;
    mostStudiedSubject: string;
    learningVelocity: number;
    attentionSpan: number;
  };
}

export interface LearningStyle {
  type: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
  preferences: {
    stepByStep: boolean;
    examplesFirst: boolean;
    abstractConcepts: boolean;
    practicalApplication: boolean;
  };
  adaptiveFactors: {
    difficultyRamp: 'gradual' | 'steep' | 'adaptive';
    explanationDepth: 'brief' | 'detailed' | 'adaptive';
    questionFrequency: 'low' | 'medium' | 'high';
  };
}

export interface StudyProgress {
  totalTopics: number;
  completedTopics: number;
  masteryLevel: number; // 0-100
  accuracy: number; // 0-100
  timeSpent: number; // minutes
  lastActivity: Date;
  improvementRate: number; // topics per week
}

export interface ComplexityLevel {
  current: 1 | 2 | 3 | 4 | 5;
  preferred: 1 | 2 | 3 | 4 | 5;
  adaptiveRange: [number, number];
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string;
  confidence: number;
  lastVerified: Date;
  topics: string[];
  type: EducationalContent;
  difficulty: 1 | 2 | 3 | 4 | 5;
  subject: string;
  relatedConcepts: string[];
  educationalValue: number; // 0-1
}

export interface EducationalSource {
  id: string;
  type: 'textbook' | 'website' | 'academic_paper' | 'official_doc' | 'verified_content';
  title: string;
  content: string;
  url?: string;
  author: string;
  publicationDate: Date;
  verificationStatus: 'verified' | 'pending' | 'disputed';
  reliability: number; // 0-1
  topics: string[];
  citations: number;
  educationalRelevance: number; // 0-1
}

export interface ConversationSummary {
  conversationId: string;
  summary: string;
  keyTopics: string[];
  learningObjectives: string[];
  qualityScore: number;
  duration: number;
  messagesCount: number;
  subjects: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  outcome: 'completed' | 'in_progress' | 'interrupted';
}

export interface FactCheckPoint {
  id: string;
  fact: string;
  confidence: number;
  sources: string[];
  verificationDate: Date;
  status: 'verified' | 'disputed' | 'pending';
  educationalContext: string;
}

export interface ConfidenceMarker {
  id: string;
  claim: string;
  confidence: number; // 0-1
  reasoning: string;
  evidence: string[];
  alternativeViews: string[];
}

export interface TokenUsage {
  total: number;
  profile: number;
  knowledge: number;
  history: number;
  sources: number;
  remaining: number;
}

export interface ContextBuildRequest {
  userId: string;
  level: ContextLevel;
  query?: string;
  tokenLimit?: number;
  includeMemories?: boolean;
  includeKnowledge?: boolean;
  includeProgress?: boolean;
  subjects?: string[];
  topics?: string[];
  timeframe?: {
    start: Date;
    end: Date;
  };
}

export class EnhancedContextBuilder {
  private static readonly CONTEXT_LEVELS = {
    light: { maxTokens: 500, compressionRatio: 0.9 },
    recent: { maxTokens: 1000, compressionRatio: 0.7 },
    selective: { maxTokens: 2000, compressionRatio: 0.5 },
    full: { maxTokens: 4000, compressionRatio: 0.3 }
  };

  private static readonly DEFAULT_TOKEN_LIMIT = 2048;
  private static readonly MAX_KNOWLEDGE_ENTRIES = 50;
  private static readonly MAX_CONVERSATION_SUMMARIES = 10;

  private knowledgeBaseCache: Map<string, KnowledgeEntry[]> = new Map();
  private profileCache: Map<string, { profile: UltraCompressedProfile; timestamp: Date; expiresAt: Date }> = new Map();

  constructor() {
    this.startCacheCleanup();
  }

  /**
   * Build enhanced context with 4-level compression
   */
  async buildContext(request: ContextBuildRequest): Promise<EnhancedContext> {
    const startTime = Date.now();
    
    try {
      logInfo('Building enhanced context', {
        componentName: 'EnhancedContextBuilder',
        userId: request.userId,
        level: request.level,
        query: request.query?.substring(0, 100),
        tokenLimit: request.tokenLimit
      });

      // Get compressed student profile
      const studentProfile = await this.getUltraCompressedProfile(request.userId);
      
      // Get knowledge base content
      const knowledgeBase = request.includeKnowledge !== false 
        ? await this.getRelevantKnowledgeBase(request)
        : [];

      // Get conversation history
      const conversationHistory = await this.getConversationSummaries(request);
      
      // Get external educational sources
      const externalSources = await this.getEducationalSources(request);
      
      // Create fact check points
      const factCheckPoints = await this.generateFactCheckPoints(request, knowledgeBase);
      
      // Generate confidence markers
      const confidenceMarkers = await this.generateConfidenceMarkers(request, knowledgeBase);
      
      // Calculate token usage
      const tokenUsage = this.calculateTokenUsage({
        studentProfile,
        knowledgeBase,
        conversationHistory,
        externalSources
      });

      // Check if we need to optimize for token limit
      if (request.tokenLimit && tokenUsage.total > request.tokenLimit) {
        const optimization = await this.optimizeForTokenLimit(
          { studentProfile, knowledgeBase, conversationHistory, externalSources, factCheckPoints, confidenceMarkers },
          request.tokenLimit,
          request.level
        );
        
        return {
          ...optimization,
          compressionLevel: request.level,
          tokenUsage: this.calculateTokenUsage(optimization),
          lastOptimized: new Date()
        };
      }

      const context: EnhancedContext = {
        studentProfile,
        knowledgeBase,
        conversationHistory,
        externalSources,
        factCheckPoints,
        confidenceMarkers,
        compressionLevel: request.level,
        tokenUsage,
        lastOptimized: new Date()
      };

      const processingTime = Date.now() - startTime;
      logInfo('Enhanced context built successfully', {
        componentName: 'EnhancedContextBuilder',
        userId: request.userId,
        level: request.level,
        tokenUsage: tokenUsage.total,
        processingTime
      });

      return context;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'EnhancedContextBuilder',
        operation: 'build_context',
        userId: request.userId
      });

      throw new Error(`Failed to build enhanced context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get ultra-compressed student profile
   */
  private async getUltraCompressedProfile(userId: string): Promise<UltraCompressedProfile> {
    // Check cache first
    const cached = this.profileCache.get(userId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.profile;
    }

    try {
      // Get student profile from database
      const { data: profileData, error: profileError } = await (supabase
        .from('student_profiles') as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch student profile: ${profileError.message}`);
      }

      // Get gamification data
      const { data: gamificationData, error: gamificationError } = await (supabase
        .from('student_gamification') as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (gamificationError && gamificationError.code !== 'PGRST116') {
        logWarning('Failed to fetch gamification data', { userId, error: gamificationError.message });
      }

      // Get recent study activity
      const { data: recentActivity, error: activityError } = await (supabase
        .from('study_sessions') as any)
        .select('subject, topic, duration, completed, accuracy')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (activityError) {
        logWarning('Failed to fetch recent activity', { userId, error: activityError.message });
      }

      // Get learning preferences
      const { data: preferencesData, error: preferencesError } = await (supabase
        .from('user_preferences') as any)
        .select('learning_style, preferred_difficulty, explanation_style, question_frequency')
        .eq('user_id', userId)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        logWarning('Failed to fetch learning preferences', { userId, error: preferencesError.message });
      }

      // Build ultra-compressed profile
      const profile: UltraCompressedProfile = {
        userId,
        learningStyle: this.extractLearningStyle(preferencesData, recentActivity),
        strongSubjects: this.extractStrongSubjects(recentActivity || []),
        weakSubjects: this.extractWeakSubjects(recentActivity || []),
        currentLevel: (gamificationData as any)?.level || 1,
        streakDays: (gamificationData as any)?.current_streak || 0,
        totalPoints: (gamificationData as any)?.total_points || 0,
        preferredComplexity: this.extractComplexityLevel(preferencesData, recentActivity || []),
        recentTopics: this.extractRecentTopics(recentActivity || []),
        studyProgress: this.calculateStudyProgress(recentActivity || []),
        learningObjectives: this.extractLearningObjectives(recentActivity || []),
        lastSessionSummary: this.generateLastSessionSummary(recentActivity || []),
        compressedMetadata: this.calculateCompressedMetadata(recentActivity || [], gamificationData)
      };

      // Cache the profile
      this.profileCache.set(userId, {
        profile,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      });

      return profile;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'EnhancedContextBuilder',
        operation: 'get_ultra_compressed_profile',
        userId
      });

      // Return minimal default profile
      return this.createDefaultProfile(userId);
    }
  }

  /**
   * Get relevant knowledge base entries
   */
  private async getRelevantKnowledgeBase(request: ContextBuildRequest): Promise<KnowledgeEntry[]> {
    try {
      const cacheKey = `knowledge_${request.userId}_${request.subjects?.join(',') || 'all'}`;
      const cached = this.knowledgeBaseCache.get(cacheKey);
      
      if (cached) {
        return cached.slice(0, EnhancedContextBuilder.MAX_KNOWLEDGE_ENTRIES);
      }

      let query = (supabase
        .from('educational_knowledge_base') as any)
        .select('*')
        .eq('verification_status', 'verified')
        .gte('reliability', 0.7)
        .order('educational_value', { ascending: false })
        .limit(EnhancedContextBuilder.MAX_KNOWLEDGE_ENTRIES);

      if (request.subjects && request.subjects.length > 0) {
        query = query.overlaps('subjects', request.subjects);
      }

      if (request.topics && request.topics.length > 0) {
        query = query.overlaps('topics', request.topics);
      }

      if (request.query) {
        query = query.or(`content.ilike.%${request.query}%,title.ilike.%${request.query}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch knowledge base: ${error.message}`);
      }

      const knowledgeEntries: KnowledgeEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        content: entry.content,
        source: entry.source,
        confidence: entry.reliability,
        lastVerified: new Date(entry.updated_at),
        topics: entry.topics || [],
        type: this.mapContentType(entry.type),
        difficulty: entry.difficulty_level || 3,
        subject: entry.subject,
        relatedConcepts: entry.related_concepts || [],
        educationalValue: entry.educational_value || 0.5
      }));

      // Cache the results
      this.knowledgeBaseCache.set(cacheKey, knowledgeEntries);

      return knowledgeEntries;

    } catch (error) {
      logWarning('Failed to fetch knowledge base', { 
        userId: request.userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }

  /**
   * Get conversation summaries
   */
  private async getConversationSummaries(request: ContextBuildRequest): Promise<ConversationSummary[]> {
    try {
      let query = (supabase
        .from('conversation_summaries') as any)
        .select('*')
        .eq('user_id', request.userId)
        .order('created_at', { ascending: false })
        .limit(EnhancedContextBuilder.MAX_CONVERSATION_SUMMARIES);

      if (request.timeframe) {
        query = query
          .gte('created_at', request.timeframe.start.toISOString())
          .lte('created_at', request.timeframe.end.toISOString());
      }

      if (request.subjects && request.subjects.length > 0) {
        query = query.overlaps('subjects', request.subjects);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch conversation summaries: ${error.message}`);
      }

      return (data || []).map((summary: any) => ({
        conversationId: summary.conversation_id,
        summary: summary.summary,
        keyTopics: summary.key_topics || [],
        learningObjectives: summary.learning_objectives || [],
        qualityScore: summary.quality_score || 0.5,
        duration: summary.duration || 0,
        messagesCount: summary.messages_count || 0,
        subjects: summary.subjects || [],
        difficulty: summary.difficulty_level || 3,
        outcome: summary.outcome || 'in_progress'
      }));

    } catch (error) {
      logWarning('Failed to fetch conversation summaries', { 
        userId: request.userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }

  /**
   * Get educational sources
   */
  private async getEducationalSources(request: ContextBuildRequest): Promise<EducationalSource[]> {
    try {
      let query = (supabase
        .from('educational_sources') as any)
        .select('*')
        .eq('verification_status', 'verified')
        .gte('reliability', 0.8)
        .order('educational_relevance', { ascending: false })
        .limit(20);

      if (request.subjects && request.subjects.length > 0) {
        query = query.overlaps('topics', request.subjects);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch educational sources: ${error.message}`);
      }

      return (data || []).map((source: any) => ({
        id: source.id,
        type: this.mapSourceType(source.type),
        title: source.title,
        content: source.content,
        url: source.url,
        author: source.author,
        publicationDate: new Date(source.publication_date),
        verificationStatus: source.verification_status,
        reliability: source.reliability,
        topics: source.topics || [],
        citations: source.citations || 0,
        educationalRelevance: source.educational_relevance || 0.5
      }));

    } catch (error) {
      logWarning('Failed to fetch educational sources', { 
        userId: request.userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }

  /**
   * Generate fact check points
   */
  private async generateFactCheckPoints(request: ContextBuildRequest, knowledgeBase: KnowledgeEntry[]): Promise<FactCheckPoint[]> {
    try {
      const factCheckPoints: FactCheckPoint[] = [];

      for (const entry of knowledgeBase.slice(0, 10)) {
        if (entry.type === 'facts' && entry.confidence > 0.8) {
          factCheckPoints.push({
            id: `fact_${entry.id}`,
            fact: entry.content.substring(0, 200) + '...',
            confidence: entry.confidence,
            sources: [entry.source],
            verificationDate: entry.lastVerified,
            status: 'verified',
            educationalContext: entry.subject
          });
        }
      }

      return factCheckPoints;

    } catch (error) {
      logWarning('Failed to generate fact check points', { error });
      return [];
    }
  }

  /**
   * Generate confidence markers
   */
  private async generateConfidenceMarkers(request: ContextBuildRequest, knowledgeBase: KnowledgeEntry[]): Promise<ConfidenceMarker[]> {
    try {
      const confidenceMarkers: ConfidenceMarker[] = [];

      for (const entry of knowledgeBase.slice(0, 5)) {
        if (entry.educationalValue > 0.7) {
          confidenceMarkers.push({
            id: `confidence_${entry.id}`,
            claim: entry.content.substring(0, 150) + '...',
            confidence: entry.confidence,
            reasoning: `High educational value (${entry.educationalValue}) and verified source`,
            evidence: [entry.source],
            alternativeViews: [`Alternative perspective on ${entry.subject}`]
          });
        }
      }

      return confidenceMarkers;

    } catch (error) {
      logWarning('Failed to generate confidence markers', { error });
      return [];
    }
  }

  /**
   * Calculate token usage
   */
  private calculateTokenUsage(context: {
    studentProfile: UltraCompressedProfile;
    knowledgeBase: KnowledgeEntry[];
    conversationHistory: ConversationSummary[];
    externalSources: EducationalSource[];
  }): TokenUsage {
    const profileTokens = this.estimateTokens(JSON.stringify(context.studentProfile));
    const knowledgeTokens = context.knowledgeBase.reduce((sum, entry) => 
      sum + this.estimateTokens(entry.content), 0);
    const historyTokens = context.conversationHistory.reduce((sum, summary) => 
      sum + this.estimateTokens(summary.summary), 0);
    const sourcesTokens = context.externalSources.reduce((sum, source) => 
      sum + this.estimateTokens(source.content), 0);

    const total = profileTokens + knowledgeTokens + historyTokens + sourcesTokens;
    const remaining = EnhancedContextBuilder.DEFAULT_TOKEN_LIMIT - total;

    return {
      total,
      profile: profileTokens,
      knowledge: knowledgeTokens,
      history: historyTokens,
      sources: sourcesTokens,
      remaining: Math.max(0, remaining)
    };
  }

  /**
   * Optimize context for token limit
   */
  private async optimizeForTokenLimit(
    context: Omit<EnhancedContext, 'compressionLevel' | 'tokenUsage' | 'lastOptimized'>,
    tokenLimit: number,
    targetLevel: ContextLevel
  ): Promise<Omit<EnhancedContext, 'compressionLevel' | 'tokenUsage' | 'lastOptimized'>> {
    const levelConfig = EnhancedContextBuilder.CONTEXT_LEVELS[targetLevel];
    let optimizedContext = { ...context };

    // Start with most compressible elements
    let currentTokens = this.calculateTokenUsage(optimizedContext).total;
    let compressionRatio = levelConfig.compressionRatio;

    // Compress knowledge base first (highest impact)
    if (currentTokens > tokenLimit * 0.8) {
      const targetKnowledgeTokens = tokenLimit * 0.3;
      const compressionFactor = targetKnowledgeTokens / optimizedContext.knowledgeBase.length;
      optimizedContext.knowledgeBase = optimizedContext.knowledgeBase
        .sort((a, b) => b.educationalValue - a.educationalValue)
        .slice(0, Math.floor(optimizedContext.knowledgeBase.length * compressionFactor))
        .map(entry => ({
          ...entry,
          content: this.compressContent(entry.content, compressionRatio)
        }));
      
      currentTokens = this.calculateTokenUsage(optimizedContext).total;
    }

    // Compress conversation history
    if (currentTokens > tokenLimit * 0.9) {
      const targetHistoryTokens = tokenLimit * 0.2;
      const compressionFactor = targetHistoryTokens / optimizedContext.conversationHistory.length;
      optimizedContext.conversationHistory = optimizedContext.conversationHistory
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, Math.floor(optimizedContext.conversationHistory.length * compressionFactor))
        .map(summary => ({
          ...summary,
          summary: this.compressContent(summary.summary, compressionRatio * 0.8)
        }));
      
      currentTokens = this.calculateTokenUsage(optimizedContext).total;
    }

    // Compress sources if still over limit
    if (currentTokens > tokenLimit) {
      const targetSourceTokens = tokenLimit * 0.1;
      const compressionFactor = targetSourceTokens / optimizedContext.externalSources.length;
      optimizedContext.externalSources = optimizedContext.externalSources
        .sort((a, b) => b.educationalRelevance - a.educationalRelevance)
        .slice(0, Math.floor(optimizedContext.externalSources.length * compressionFactor))
        .map(source => ({
          ...source,
          content: this.compressContent(source.content, compressionRatio * 0.6)
        }));
    }

    return optimizedContext;
  }

  /**
   * Utility methods
   */
  private extractLearningStyle(preferences: any, activity: any[] | null | undefined): LearningStyle {
  const prefStyle = (preferences as any)?.learning_style || 'reading_writing';
  const act = Array.isArray(activity) ? activity : [];
  const stepByStep = act.length > 10;
  const examplesFirst = act.some(a => a?.topic?.includes?.('example'));
  
  return {
    type: prefStyle as any,
    preferences: {
      stepByStep,
      examplesFirst,
      abstractConcepts: !stepByStep,
      practicalApplication: true
    },
    adaptiveFactors: {
      difficultyRamp: 'adaptive' as any,
      explanationDepth: 'adaptive' as any,
      questionFrequency: 'medium' as any
    }
  };
}

  private extractStrongSubjects(activity: any[]): string[] {
    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    
    activity.forEach(session => {
      const subject = session.subject;
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { correct: 0, total: 0 };
      }
      subjectPerformance[subject].total++;
      if (session.accuracy > 0.8) {
        subjectPerformance[subject].correct++;
      }
    });

    return Object.entries(subjectPerformance)
      .filter(([_, stats]) => stats.total > 0 && stats.correct / stats.total > 0.8)
      .map(([subject]) => subject)
      .slice(0, 5);
  }

  private extractWeakSubjects(activity: any[]): string[] {
    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    
    activity.forEach(session => {
      const subject = session.subject;
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { correct: 0, total: 0 };
      }
      subjectPerformance[subject].total++;
      if (session.accuracy < 0.6) {
        subjectPerformance[subject].correct++;
      }
    });

    return Object.entries(subjectPerformance)
      .filter(([_, stats]) => stats.total > 0 && stats.correct / stats.total > 0.5)
      .map(([subject]) => subject)
      .slice(0, 5);
  }

  private extractComplexityLevel(preferences: any, activity: any[]): ComplexityLevel {
    const avgDifficulty = activity.length > 0
      ? activity.reduce((sum, a) => sum + (a.difficulty || 3), 0) / activity.length
      : 3;
    
    const preferred = (preferences as any)?.preferred_difficulty || Math.round(avgDifficulty) || 3;
    
    return {
      current: Math.min(5, Math.max(1, Math.round(avgDifficulty))) as 1 | 2 | 3 | 4 | 5,
      preferred: Math.min(5, Math.max(1, preferred)) as 1 | 2 | 3 | 4 | 5,
      adaptiveRange: [Math.max(1, preferred - 1), Math.min(5, preferred + 1)] as [number, number]
    };
  }

  private extractRecentTopics(activity: any[]): string[] {
    return activity
      .filter(a => a.topic)
      .slice(0, 10)
      .map(a => a.topic)
      .filter((topic, index, arr) => arr.indexOf(topic) === index);
  }

  private calculateStudyProgress(activity: any[]): StudyProgress {
    const totalTopics = activity.length;
    const completedTopics = activity.filter(a => a.completed).length;
    const avgAccuracy = activity.length > 0 
      ? activity.reduce((sum, a) => sum + (a.accuracy || 0), 0) / activity.length
      : 0;
    const totalTime = activity.reduce((sum, a) => sum + (a.duration || 0), 0);

    return {
      totalTopics,
      completedTopics,
      masteryLevel: avgAccuracy * 100,
      accuracy: avgAccuracy * 100,
      timeSpent: totalTime,
      lastActivity: activity[0]?.created_at ? new Date(activity[0].created_at) : new Date(),
      improvementRate: totalTopics / 4 // assuming 4 weeks
    };
  }

  private extractLearningObjectives(activity: any[]): string[] {
    return activity
      .filter(a => a.learning_objective)
      .map(a => a.learning_objective)
      .filter((obj, index, arr) => arr.indexOf(obj) === index)
      .slice(0, 5);
  }

  private generateLastSessionSummary(activity: any[]): string {
    if (activity.length === 0) return 'No recent activity';
    
    const lastSession = activity[0];
    return `Studied ${lastSession.subject}${lastSession.topic ? ` - ${lastSession.topic}` : ''} for ${Math.round((lastSession.duration || 0) / 60)} minutes with ${Math.round((lastSession.accuracy || 0) * 100)}% accuracy`;
  }

  private calculateCompressedMetadata(activity: any[], gamification: any): any {
    return {
      totalSessions: activity.length,
      averageSessionTime: activity.length > 0 
        ? activity.reduce((sum, a) => sum + (a.duration || 0), 0) / activity.length 
        : 0,
      mostStudiedSubject: this.getMostStudiedSubject(activity),
      learningVelocity: activity.length / 4, // sessions per week
      attentionSpan: this.calculateAverageAttentionSpan(activity)
    };
  }

  private getMostStudiedSubject(activity: any[]): string {
    const subjectCount: Record<string, number> = {};
    activity.forEach(a => {
      const subject = a.subject || 'Unknown';
      subjectCount[subject] = (subjectCount[subject] || 0) + 1;
    });
    
    return Object.entries(subjectCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
  }

  private calculateAverageAttentionSpan(activity: any[]): number {
    const durations = activity.map(a => a.duration).filter(d => d > 0);
    return durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
  }

  private createDefaultProfile(userId: string): UltraCompressedProfile {
    return {
      userId,
      learningStyle: {
        type: 'reading_writing',
        preferences: {
          stepByStep: true,
          examplesFirst: true,
          abstractConcepts: false,
          practicalApplication: true
        },
        adaptiveFactors: {
          difficultyRamp: 'adaptive',
          explanationDepth: 'adaptive',
          questionFrequency: 'medium'
        }
      },
      strongSubjects: [],
      weakSubjects: [],
      currentLevel: 1,
      streakDays: 0,
      totalPoints: 0,
      preferredComplexity: {
        current: 3,
        preferred: 3,
        adaptiveRange: [2, 4]
      },
      recentTopics: [],
      studyProgress: {
        totalTopics: 0,
        completedTopics: 0,
        masteryLevel: 0,
        accuracy: 0,
        timeSpent: 0,
        lastActivity: new Date(),
        improvementRate: 0
      },
      learningObjectives: [],
      lastSessionSummary: 'No recent activity',
      compressedMetadata: {
        totalSessions: 0,
        averageSessionTime: 0,
        mostStudiedSubject: 'Unknown',
        learningVelocity: 0,
        attentionSpan: 0
      }
    };
  }

  private mapContentType(type: string): EducationalContent {
    const typeMap: Record<string, EducationalContent> = {
      'fact': 'facts',
      'concept': 'concepts',
      'procedure': 'procedures',
      'example': 'examples',
      'reference': 'references'
    };
    return typeMap[type] || 'facts';
  }

  private mapSourceType(type: string): EducationalSource['type'] {
    const typeMap: Record<string, EducationalSource['type']> = {
      'textbook': 'textbook' as any,
      'website': 'website' as any,
      'paper': 'academic_paper' as any,
      'document': 'official_doc' as any,
      'verified': 'verified_content' as any
    };
    return typeMap[type] || 'verified_content' as any;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private compressContent(content: string, ratio: number): string {
    if (ratio >= 1.0) return content;
    
    const sentences = content.split(/[.!?]+/);
    const targetSentences = Math.max(1, Math.floor(sentences.length * ratio));
    
    return sentences
      .slice(0, targetSentences)
      .join('. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, cached] of this.profileCache.entries()) {
        if (cached.expiresAt <= now) {
          this.profileCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.knowledgeBaseCache.clear();
    this.profileCache.clear();
  }
}

// Export singleton instance
export const enhancedContextBuilder = new EnhancedContextBuilder();

// Convenience functions
export const buildEnhancedContext = (request: ContextBuildRequest) => 
  enhancedContextBuilder.buildContext(request);