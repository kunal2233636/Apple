// Personalization vs General Detection Logic
// ============================================
// Intelligent system that determines when to provide personalized vs general responses
// Based on user context, query type, and learning patterns

import { logError, logInfo, logWarning } from '@/lib/error-logger-server-safe';
import { webSearchDecisionEngine } from './web-search-decision-engine';

export interface PersonalizationDetectionResult {
  responseType: 'personalized' | 'general' | 'hybrid';
  confidence: number;
  reasoning: string[];
  personalizationFactors: PersonalizationFactor[];
  generalFactors: GeneralFactor[];
  recommendedApproach: 'personalized' | 'general' | 'personalized_with_general' | 'general_with_personalization';
  adaptations: Adaptation[];
  fallback: boolean;
}

export interface PersonalizationFactor {
  type: 'user_context' | 'learning_history' | 'preference' | 'performance' | 'interaction_pattern' | 'expertise_level';
  strength: number; // 0-1
  evidence: string;
  query: string;
  impact: 'high' | 'medium' | 'low';
}

export interface GeneralFactor {
  type: 'common_knowledge' | 'educational_content' | ' factual_information' | 'general_reference' | 'standard_procedure';
  strength: number; // 0-1
  evidence: string;
  query: string;
  impact: 'high' | 'medium' | 'low';
}

export interface Adaptation {
  type: 'depth_adjustment' | 'style_modification' | 'example_selection' | 'difficulty_scaling' | 'context_inclusion';
  description: string;
  implementation: string;
  expectedImpact: number;
}

export interface UserProfile {
  userId: string;
  learningProfile: {
    primaryLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
    preferredComplexity: 'basic' | 'intermediate' | 'advanced' | 'adaptive';
    attentionSpan: 'short' | 'medium' | 'long' | 'variable';
    responseFormat: 'concise' | 'detailed' | 'interactive' | 'structured';
    examplePreference: 'practical' | 'abstract' | 'technical' | 'story_based';
  };
  studyHistory: {
    subjects: Record<string, {
      proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      recentActivity: number; // days since last activity
      totalTime: number; // hours
      successRate: number; // 0-1
      commonTopics: string[];
      strugglingTopics: string[];
    }>;
    learningVelocity: 'fast' | 'normal' | 'slow' | 'variable';
    preferredSessionLength: number; // minutes
    studyPatterns: Array<{
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      duration: number;
      frequency: number;
      topic: string;
    }>;
  };
  interactionHistory: {
    questionTypes: Record<string, number>;
    satisfactionScores: number[];
    clarificationRequests: number;
    followUpQuestions: number;
    successWithPersonalization: number;
    successWithGeneral: number;
  };
  preferences: {
    explanationStyle: 'socratic' | 'direct' | 'analogical' | 'step_by_step';
    includeBackground: boolean;
    includeExamples: boolean;
    includeAnalogies: boolean;
    includePractice: boolean;
    includeReferences: boolean;
  };
  currentContext: {
    sessionId: string;
    currentSubject?: string;
    currentTopic?: string;
    urgency: 'low' | 'normal' | 'high';
    timeAvailable?: number; // minutes
    energyLevel?: 'low' | 'medium' | 'high';
    stressLevel?: 'low' | 'medium' | 'high';
    previousQuestions: string[];
    lastResponseQuality?: number; // 0-1
  };
}

export interface QueryContext {
  query: string;
  intent: 'learning' | 'reference' | 'problem_solving' | 'exploration' | 'verification' | 'clarification' | 'application';
  domain: 'academic' | 'technical' | 'practical' | 'theoretical' | 'general';
  complexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  specificity: 'vague' | 'general' | 'specific' | 'highly_specific';
  personalizationIndicators: PersonalizationIndicator[];
  generalIndicators: GeneralIndicator[];
}

export interface PersonalizationIndicator {
  type: 'personal_reference' | 'learning_context' | 'previous_topic' | 'user_specific' | 'progress_tracking';
  strength: number; // 0-1
  evidence: string;
}

export interface GeneralIndicator {
  type: 'common_question' | 'general_knowledge' | 'factual_lookup' | 'reference' | 'introduction';
  strength: number; // 0-1
  evidence: string;
}

export class PersonalizationDetectionEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private detectionCache: Map<string, PersonalizationDetectionResult> = new Map();
  private patternModels: Map<string, PatternModel> = new Map();

  constructor() {
    this.initializePatternModels();
  }

  /**
   * Main detection method - determines personalization vs general response
   */
  async detectResponseType(
    query: string,
    userId: string,
    context?: Partial<UserProfile['currentContext']>
  ): Promise<PersonalizationDetectionResult> {
    const startTime = Date.now();
    
    try {
      logInfo('Starting personalization detection', {
        componentName: 'PersonalizationDetectionEngine',
        userId,
        query: query.substring(0, 100)
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(query, userId, context);
      const cached = this.detectionCache.get(cacheKey);
      if (cached) {
        logInfo('Returning cached detection result', { cacheKey });
        return cached;
      }

      // Step 1: Get or create user profile
      const userProfile = await this.getOrCreateUserProfile(userId, context);
      
      // Step 2: Analyze query context
      const queryContext = await this.analyzeQueryContext(query, userProfile);
      
      // Step 3: Identify personalization factors
      const personalizationFactors = this.identifyPersonalizationFactors(
        query,
        queryContext,
        userProfile
      );
      
      // Step 4: Identify general factors
      const generalFactors = this.identifyGeneralFactors(
        query,
        queryContext,
        userProfile
      );
      
      // Step 5: Calculate response type and confidence
      const detection = this.calculateResponseType(
        personalizationFactors,
        generalFactors,
        queryContext,
        userProfile
      );
      
      // Step 6: Determine recommended approach
      const recommendedApproach = this.determineRecommendedApproach(
        detection,
        userProfile,
        queryContext
      );
      
      // Step 7: Generate adaptations
      const adaptations = this.generateAdaptations(
        recommendedApproach,
        userProfile,
        queryContext
      );

      const result: PersonalizationDetectionResult = {
        responseType: detection.responseType,
        confidence: detection.confidence,
        reasoning: detection.reasoning,
        personalizationFactors,
        generalFactors,
        recommendedApproach,
        adaptations,
        fallback: false
      };

      // Cache the result
      this.detectionCache.set(cacheKey, result);

      const processingTime = Date.now() - startTime;
      logInfo('Personalization detection completed', {
        componentName: 'PersonalizationDetectionEngine',
        userId,
        responseType: result.responseType,
        confidence: result.confidence,
        processingTime
      });

      return result;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'PersonalizationDetectionEngine',
        userId,
        query: query.substring(0, 100),
        operation: 'detectResponseType'
      });

      return this.getFallbackDetection();
    }
  }

  /**
   * Update user profile based on interaction feedback
   */
  async updateUserProfile(
    userId: string,
    feedback: {
      responseType: 'personalized' | 'general' | 'hybrid';
      satisfaction: number; // 0-1
      clarity: number; // 0-1
      usefulness: number; // 0-1
      appropriateDepth: boolean;
      neededClarification: boolean;
      preferredStyle?: string;
      timeSpent: number; // seconds
    }
  ): Promise<void> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createDefaultUserProfile(userId);
    }

    // Update interaction history
    profile.interactionHistory.satisfactionScores.push(feedback.satisfaction);
    if (profile.interactionHistory.satisfactionScores.length > 100) {
      profile.interactionHistory.satisfactionScores.shift();
    }

    // Update success metrics
    if (feedback.satisfaction > 0.7) {
      if (feedback.responseType === 'personalized') {
        profile.interactionHistory.successWithPersonalization++;
      } else {
        profile.interactionHistory.successWithGeneral++;
      }
    }

    // Track clarification requests
    if (feedback.neededClarification) {
      profile.interactionHistory.clarificationRequests++;
    }

    // Update preferences based on feedback
    if (feedback.preferredStyle) {
      profile.preferences.explanationStyle = feedback.preferredStyle as any;
    }

    // Adjust learning profile based on appropriateness of depth
    if (feedback.appropriateDepth) {
      // User found the depth appropriate, slight confidence boost
      profile.learningProfile.preferredComplexity = this.adjustComplexity(
        profile.learningProfile.preferredComplexity,
        'appropriate'
      );
    }

    this.userProfiles.set(userId, profile);
    
    logInfo('User profile updated', {
      componentName: 'PersonalizationDetectionEngine',
      userId,
      satisfaction: feedback.satisfaction,
      responseType: feedback.responseType
    });
  }

  /**
   * Get user's current profile
   */
  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    profileCount: number;
    cacheSize: number;
    averageDetectionTime: number;
    personalizationVsGeneral: { personalized: number; general: number; hybrid: number };
  } {
    const totals = { personalized: 0, general: 0, hybrid: 0 };
    
    for (const result of this.detectionCache.values()) {
      if (result.responseType === 'personalized') totals.personalized++;
      else if (result.responseType === 'general') totals.general++;
      else totals.hybrid++;
    }

    return {
      profileCount: this.userProfiles.size,
      cacheSize: this.detectionCache.size,
      averageDetectionTime: 0, // Would track in production
      personalizationVsGeneral: totals
    };
  }

  // Private methods

  private async getOrCreateUserProfile(userId: string, context?: Partial<UserProfile['currentContext']>): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createDefaultUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Update current context if provided
    if (context) {
      profile.currentContext = { ...profile.currentContext, ...context };
    }

    return profile;
  }

  private createDefaultUserProfile(userId: string): UserProfile {
    return {
      userId,
      learningProfile: {
        primaryLearningStyle: 'mixed',
        preferredComplexity: 'intermediate',
        attentionSpan: 'medium',
        responseFormat: 'detailed',
        examplePreference: 'practical'
      },
      studyHistory: {
        subjects: {},
        learningVelocity: 'normal',
        preferredSessionLength: 30,
        studyPatterns: []
      },
      interactionHistory: {
        questionTypes: {},
        satisfactionScores: [],
        clarificationRequests: 0,
        followUpQuestions: 0,
        successWithPersonalization: 0,
        successWithGeneral: 0
      },
      preferences: {
        explanationStyle: 'step_by_step',
        includeBackground: true,
        includeExamples: true,
        includeAnalogies: false,
        includePractice: false,
        includeReferences: true
      },
      currentContext: {
        sessionId: `session_${Date.now()}`,
        urgency: 'normal',
        previousQuestions: [],
      }
    };
  }

  private async analyzeQueryContext(query: string, userProfile: UserProfile): Promise<QueryContext> {
    const queryLower = query.toLowerCase();
    
    // Detect intent
    const intent = this.detectIntent(queryLower);
    
    // Detect domain
    const domain = this.detectDomain(queryLower);
    
    // Assess complexity
    const complexity = this.assessComplexity(queryLower, userProfile);
    
    // Assess specificity
    const specificity = this.assessSpecificity(queryLower);
    
    // Identify personalization indicators
    const personalizationIndicators = this.identifyQueryPersonalizationIndicators(queryLower, userProfile);
    
    // Identify general indicators
    const generalIndicators = this.identifyQueryGeneralIndicators(queryLower);

    return {
      query,
      intent,
      domain,
      complexity,
      specificity,
      personalizationIndicators,
      generalIndicators
    };
  }

  private detectIntent(query: string): QueryContext['intent'] {
    const intentPatterns = {
      learning: ['learn', 'understand', 'explain', 'teach', 'study', 'practice', 'help me with'],
      reference: ['what is', 'define', 'meaning', 'definition', 'reference', 'look up'],
      problem_solving: ['solve', 'fix', 'troubleshoot', 'help', 'stuck', 'error', 'problem'],
      exploration: ['explore', 'discover', 'learn about', 'tell me about', 'investigate'],
      verification: ['verify', 'check', 'confirm', 'is this true', 'validate'],
      clarification: ['clarify', 'explain more', 'elaborate', 'what do you mean', 'confused'],
      application: ['apply', 'use', 'implement', 'how to use', 'practical', 'real world']
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        return intent as QueryContext['intent'];
      }
    }

    return 'reference'; // Default
  }

  private detectDomain(query: string): QueryContext['domain'] {
    const domainPatterns = {
      academic: ['study', 'learn', 'education', 'school', 'university', 'course', 'class'],
      technical: ['code', 'programming', 'software', 'api', 'algorithm', 'technical', 'system'],
      practical: ['how to', 'practical', 'real world', 'application', 'use case'],
      theoretical: ['theory', 'concept', 'principle', 'why does', 'how does', 'explain'],
      general: ['general', 'basic', 'simple', 'common', 'usually', 'typically']
    };

    for (const [domain, patterns] of Object.entries(domainPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        return domain as QueryContext['domain'];
      }
    }

    return 'general'; // Default
  }

  private assessComplexity(query: string, userProfile: UserProfile): QueryContext['complexity'] {
    // Simple heuristic based on query characteristics
    let complexityScore = 0;

    // Length and structure
    if (query.length > 100) complexityScore += 1;
    if (query.split(' ').length > 20) complexityScore += 1;

    // Technical terms
    const technicalTerms = ['algorithm', 'implementation', 'architecture', 'optimization', 'analysis'];
    if (technicalTerms.some(term => query.includes(term))) {
      complexityScore += 2;
    }

    // User's proficiency in related subjects
    if (userProfile.currentContext.currentSubject) {
      const subject = userProfile.studyHistory.subjects[userProfile.currentContext.currentSubject];
      if (subject) {
        const proficiencyAdjustments = {
          'beginner': -1,
          'intermediate': 0,
          'advanced': 1,
          'expert': 2
        };
        complexityScore += proficiencyAdjustments[subject.proficiency] || 0;
      }
    }

    if (complexityScore <= 0) return 'basic';
    if (complexityScore <= 2) return 'intermediate';
    if (complexityScore <= 4) return 'advanced';
    return 'expert';
  }

  private assessSpecificity(query: string): QueryContext['specificity'] {
    const specificIndicators = [
      'specifically', 'exactly', 'particular', 'details', 'step by step',
      'my specific', 'my exact', 'this particular'
    ];
    
    const vagueIndicators = [
      'generally', 'usually', 'typically', 'common', 'basic', 'simple',
      'overview', 'introduction', 'brief'
    ];

    if (specificIndicators.some(indicator => query.includes(indicator))) {
      return 'specific';
    }
    
    if (vagueIndicators.some(indicator => query.includes(indicator))) {
      return 'vague';
    }

    // Default based on question type
    if (query.includes('?') && query.length < 50) {
      return 'general';
    }
    
    return 'specific';
  }

  private identifyQueryPersonalizationIndicators(query: string, userProfile: UserProfile): PersonalizationIndicator[] {
    const indicators: PersonalizationIndicator[] = [];

    // Check for personal references
    const personalReferences = ['my', 'i am', 'i have', 'my problem', 'my situation', 'my project'];
    if (personalReferences.some(ref => query.includes(ref))) {
      indicators.push({
        type: 'personal_reference',
        strength: 0.8,
        evidence: 'Query contains personal reference markers'
      });
    }

    // Check for learning context
    const learningContext = ['learn', 'understand', 'study', 'practice', 'help me'];
    if (learningContext.some(context => query.includes(context))) {
      indicators.push({
        type: 'learning_context',
        strength: 0.7,
        evidence: 'Query indicates learning intent'
      });
    }

    // Check for previous topic continuation
    if (userProfile.currentContext.previousQuestions.length > 0) {
      const lastQuestion = userProfile.currentContext.previousQuestions[userProfile.currentContext.previousQuestions.length - 1];
      const topicSimilarity = this.calculateTopicSimilarity(query, lastQuestion);
      
      if (topicSimilarity > 0.5) {
        indicators.push({
          type: 'previous_topic',
          strength: topicSimilarity,
          evidence: 'Query continues previous topic discussion'
        });
      }
    }

    // Check for progress tracking
    const progressIndicators = ['next', 'continue', 'further', 'more detail', 'deeper'];
    if (progressIndicators.some(indicator => query.includes(indicator))) {
      indicators.push({
        type: 'progress_tracking',
        strength: 0.6,
        evidence: 'Query indicates progression in learning'
      });
    }

    return indicators;
  }

  private identifyQueryGeneralIndicators(query: string): GeneralIndicator[] {
    const indicators: GeneralIndicator[] = [];

    // Check for common question patterns
    const commonQuestions = ['what is', 'define', 'meaning', 'what are'];
    if (commonQuestions.some(pattern => query.includes(pattern))) {
      indicators.push({
        type: 'common_question',
        strength: 0.8,
        evidence: 'Query follows common reference question pattern'
      });
    }

    // Check for general knowledge requests
    const generalKnowledge = ['generally', 'usually', 'typically', 'commonly', 'standard'];
    if (generalKnowledge.some(pattern => query.includes(pattern))) {
      indicators.push({
        type: 'general_knowledge',
        strength: 0.7,
        evidence: 'Query asks for general information'
      });
    }

    // Check for factual lookup
    const factualIndicators = ['fact', 'information', 'data', 'statistics', 'facts'];
    if (factualIndicators.some(indicator => query.includes(indicator))) {
      indicators.push({
        type: 'factual_information',
        strength: 0.6,
        evidence: 'Query requests factual information'
      });
    }

    // Check for reference requests
    const referenceIndicators = ['reference', 'source', 'where can i find', 'lookup'];
    if (referenceIndicators.some(indicator => query.includes(indicator))) {
      indicators.push({
        type: 'reference',
        strength: 0.7,
        evidence: 'Query requests reference information'
      });
    }

    // Check for introduction requests
    const introductionIndicators = ['introduction', 'overview', 'basic', 'beginner', 'getting started'];
    if (introductionIndicators.some(indicator => query.includes(indicator))) {
      indicators.push({
        type: 'introduction',
        strength: 0.8,
        evidence: 'Query requests introductory information'
      });
    }

    return indicators;
  }

  private identifyPersonalizationFactors(
    query: string,
    queryContext: QueryContext,
    userProfile: UserProfile
  ): PersonalizationFactor[] {
    const factors: PersonalizationFactor[] = [];

    // User context factor
    if (userProfile.currentContext.currentSubject) {
      factors.push({
        type: 'user_context',
        strength: 0.8,
        evidence: `User is currently studying ${userProfile.currentContext.currentSubject}`,
        impact: 'high'
      });
    }

    // Learning history factor
    if (queryContext.intent === 'learning') {
      const relatedSubject = this.findRelatedSubject(query, userProfile);
      if (relatedSubject) {
        factors.push({
          type: 'learning_history',
          strength: 0.7,
          evidence: `User has history with ${relatedSubject} subject`,
          impact: 'high'
        });
      }
    }

    // Preference factor
    const userPrefStrength = this.calculatePreferenceStrength(userProfile);
    if (userPrefStrength > 0.6) {
      factors.push({
        type: 'preference',
        strength: userPrefStrength,
        evidence: 'User has strong preference patterns',
        impact: 'medium'
      });
    }

    // Performance factor
    if (userProfile.interactionHistory.satisfactionScores.length > 5) {
      const avgSatisfaction = userProfile.interactionHistory.satisfactionScores.reduce((a, b) => a + b, 0) / 
                             userProfile.interactionHistory.satisfactionScores.length;
      
      if (avgSatisfaction > 0.7) {
        factors.push({
          type: 'performance',
          strength: avgSatisfaction,
          evidence: `User has high satisfaction with previous responses (${(avgSatisfaction * 100).toFixed(1)}%)`,
          impact: 'high'
        });
      }
    }

    // Interaction pattern factor
    if (userProfile.interactionHistory.followUpQuestions > 3) {
      factors.push({
        type: 'interaction_pattern',
        strength: 0.6,
        evidence: 'User frequently asks follow-up questions',
        impact: 'medium'
      });
    }

    // Expertise level factor
    if (queryContext.complexity === 'advanced' || queryContext.complexity === 'expert') {
      const relevantExpertise = this.assessRelevantExpertise(queryContext, userProfile);
      if (relevantExpertise > 0.7) {
        factors.push({
          type: 'expertise_level',
          strength: relevantExpertise,
          evidence: 'User has high expertise in related area',
          impact: 'high'
        });
      }
    }

    return factors;
  }

  private identifyGeneralFactors(
    query: string,
    queryContext: QueryContext,
    userProfile: UserProfile
  ): GeneralFactor[] {
    const factors: GeneralFactor[] = [];

    // Common knowledge factor
    if (queryContext.intent === 'reference' || queryContext.intent === 'verification') {
      factors.push({
        type: 'common_knowledge',
        strength: 0.8,
        evidence: 'Query asks for factual reference information',
        impact: 'high'
      });
    }

    // Educational content factor
    if (queryContext.domain === 'academic' && queryContext.intent === 'learning') {
      factors.push({
        type: 'educational_content',
        strength: 0.7,
        evidence: 'Query is for educational content in academic domain',
        impact: 'high'
      });
    }

    // Factual information factor
    if (queryContext.generalIndicators.some(indicator => indicator.type === 'factual_information')) {
      factors.push({
        type: 'factual_information',
        strength: 0.8,
        evidence: 'Query requests factual information',
        impact: 'high'
      });
    }

    // General reference factor
    if (queryContext.generalIndicators.some(indicator => indicator.type === 'reference')) {
      factors.push({
        type: 'general_reference',
        strength: 0.7,
        evidence: 'Query is a general reference request',
        impact: 'medium'
      });
    }

    // Standard procedure factor
    const standardIndicators = ['standard', 'usually', 'typically', 'common practice', 'standard way'];
    if (standardIndicators.some(indicator => query.includes(indicator))) {
      factors.push({
        type: 'standard_procedure',
        strength: 0.6,
        evidence: 'Query asks about standard procedures',
        impact: 'medium'
      });
    }

    return factors;
  }

  private calculateResponseType(
    personalizationFactors: PersonalizationFactor[],
    generalFactors: GeneralFactor[],
    queryContext: QueryContext,
    userProfile: UserProfile
  ): { responseType: 'personalized' | 'general' | 'hybrid'; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];
    
    // Calculate weighted scores
    const personalizationScore = this.calculateWeightedScore(personalizationFactors);
    const generalScore = this.calculateWeightedScore(generalFactors);

    // Apply context modifiers
    let adjustedPersonalization = personalizationScore;
    let adjustedGeneral = generalScore;

    // Modify based on intent
    if (queryContext.intent === 'learning' || queryContext.intent === 'problem_solving') {
      adjustedPersonalization += 0.2; // Learning and problem-solving benefit from personalization
      reasoning.push('Learning/problem-solving intent favors personalization');
    }

    if (queryContext.intent === 'reference' || queryContext.intent === 'verification') {
      adjustedGeneral += 0.3; // Reference and verification benefit from general approach
      reasoning.push('Reference/verification intent favors general approach');
    }

    // Modify based on user history
    if (userProfile.interactionHistory.successWithPersonalization > userProfile.interactionHistory.successWithGeneral) {
      adjustedPersonalization += 0.1;
      reasoning.push('User historically responds better to personalized responses');
    } else if (userProfile.interactionHistory.successWithGeneral > userProfile.interactionHistory.successWithPersonalization) {
      adjustedGeneral += 0.1;
      reasoning.push('User historically responds better to general responses');
    }

    // Determine response type
    let responseType: 'personalized' | 'general' | 'hybrid';
    let confidence: number;

    const difference = Math.abs(adjustedPersonalization - adjustedGeneral);
    
    if (difference > 0.3) {
      // Clear winner
      if (adjustedPersonalization > adjustedGeneral) {
        responseType = 'personalized';
        confidence = Math.min(0.95, 0.5 + adjustedPersonalization);
        reasoning.push('Strong personalization factors outweigh general factors');
      } else {
        responseType = 'general';
        confidence = Math.min(0.95, 0.5 + adjustedGeneral);
        reasoning.push('Strong general factors outweigh personalization factors');
      }
    } else {
      // Close call - use hybrid approach
      responseType = 'hybrid';
      confidence = 0.6 + (1 - difference); // Lower confidence for hybrid decisions
      reasoning.push('Balanced factors suggest hybrid approach');
    }

    return { responseType, confidence, reasoning };
  }

  private determineRecommendedApproach(
    detection: { responseType: 'personalized' | 'general' | 'hybrid'; confidence: number; reasoning: string[] },
    userProfile: UserProfile,
    queryContext: QueryContext
  ): 'personalized' | 'general' | 'personalized_with_general' | 'general_with_personalization' {
    if (detection.responseType === 'hybrid') {
      // For hybrid, determine primary approach based on user profile
      if (userProfile.interactionHistory.successWithPersonalization > userProfile.interactionHistory.successWithGeneral) {
        return 'personalized_with_general';
      } else {
        return 'general_with_personalization';
      }
    }

    return detection.responseType;
  }

  private generateAdaptations(
    approach: 'personalized' | 'general' | 'personalized_with_general' | 'general_with_personalization',
    userProfile: UserProfile,
    queryContext: QueryContext
  ): Adaptation[] {
    const adaptations: Adaptation[] = [];

    // Depth adjustment
    if (userProfile.learningProfile.preferredComplexity !== 'adaptive') {
      adaptations.push({
        type: 'depth_adjustment',
        description: `Adjust explanation depth to ${userProfile.learningProfile.preferredComplexity} level`,
        implementation: `Use ${userProfile.learningProfile.preferredComplexity} complexity explanations`,
        expectedImpact: 0.7
      });
    }

    // Style modification
    adaptations.push({
      type: 'style_modification',
      description: `Use ${userProfile.preferences.explanationStyle} explanation style`,
      implementation: `Apply ${userProfile.preferences.explanationStyle} approach`,
      expectedImpact: 0.6
    });

    // Example selection
    if (userProfile.preferences.includeExamples) {
      adaptations.push({
        type: 'example_selection',
        description: `Include ${userProfile.learningProfile.examplePreference} examples`,
        implementation: `Select ${userProfile.learningProfile.examplePreference} type examples`,
        expectedImpact: 0.5
      });
    }

    // Context inclusion
    if (approach.includes('personalized') && userProfile.currentContext.currentSubject) {
      adaptations.push({
        type: 'context_inclusion',
        description: 'Include relevant context from current study subject',
        implementation: 'Reference current subject and related knowledge',
        expectedImpact: 0.4
      });
    }

    // Difficulty scaling
    if (userProfile.learningProfile.attentionSpan === 'short') {
      adaptations.push({
        type: 'difficulty_scaling',
        description: 'Break complex concepts into smaller, digestible parts',
        implementation: 'Use progressive disclosure and step-by-step approach',
        expectedImpact: 0.6
      });
    }

    return adaptations;
  }

  // Helper methods

  private initializePatternModels(): void {
    logInfo('Pattern models initialized', { componentName: 'PersonalizationDetectionEngine' });
  }

  private generateCacheKey(query: string, userId: string, context?: Partial<UserProfile['currentContext']>): string {
    const keyData = {
      query: query.toLowerCase().trim(),
      userId,
      context: context || {}
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private calculateTopicSimilarity(query1: string, query2: string): number {
    // Simple word-based similarity
    const words1 = new Set(query1.toLowerCase().split(' '));
    const words2 = new Set(query2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private findRelatedSubject(query: string, userProfile: UserProfile): string | null {
    for (const [subject, data] of Object.entries(userProfile.studyHistory.subjects)) {
      if (data.proficiency !== 'beginner' && data.recentActivity < 30) {
        // Check if query contains subject-related terms
        if (this.hasSubjectTerms(query, subject)) {
          return subject;
        }
      }
    }
    return null;
  }

  private hasSubjectTerms(query: string, subject: string): boolean {
    const subjectTerms = {
      'mathematics': ['math', 'algebra', 'geometry', 'calculus', 'equation', 'formula'],
      'physics': ['physics', 'force', 'energy', 'motion', 'thermodynamics', 'quantum'],
      'chemistry': ['chemistry', 'atom', 'molecule', 'reaction', 'bond', 'element'],
      'biology': ['biology', 'cell', 'organism', 'dna', 'evolution', 'ecosystem'],
      'programming': ['code', 'programming', 'algorithm', 'function', 'variable', 'class'],
    };
    
    const terms = subjectTerms[subject as keyof typeof subjectTerms] || [];
    return terms.some(term => query.toLowerCase().includes(term));
  }

  private calculatePreferenceStrength(userProfile: UserProfile): number {
    let strength = 0;
    
    // Based on number of clear preferences
    if (userProfile.learningProfile.preferredComplexity !== 'intermediate') strength += 0.2;
    if (userProfile.preferences.explanationStyle !== 'step_by_step') strength += 0.2;
    if (userProfile.learningProfile.primaryLearningStyle !== 'mixed') strength += 0.2;
    
    // Based on interaction history consistency
    if (userProfile.interactionHistory.satisfactionScores.length > 10) {
      const variance = this.calculateVariance(userProfile.interactionHistory.satisfactionScores);
      if (variance < 0.1) strength += 0.3; // Consistent satisfaction suggests clear preferences
    }
    
    return Math.min(1.0, strength);
  }

  private calculateVariance(scores: number[]): number {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }

  private assessRelevantExpertise(queryContext: QueryContext, userProfile: UserProfile): number {
    if (!userProfile.currentContext.currentSubject) return 0.5;
    
    const subject = userProfile.studyHistory.subjects[userProfile.currentContext.currentSubject];
    if (!subject) return 0.3;
    
    const proficiencyScores = {
      'beginner': 0.3,
      'intermediate': 0.6,
      'advanced': 0.8,
      'expert': 1.0
    };
    
    return proficiencyScores[subject.proficiency] || 0.5;
  }

  private calculateWeightedScore(factors: Array<{ strength: number; impact: 'high' | 'medium' | 'low' }>): number {
    const weightMap = { high: 1.0, medium: 0.7, low: 0.4 };
    
    const totalWeight = factors.reduce((sum, factor) => {
      return sum + (factor.strength * weightMap[factor.impact]);
    }, 0);
    
    const maxPossibleWeight = factors.length * 1.0; // Assuming all high impact
    
    return maxPossibleWeight > 0 ? totalWeight / maxPossibleWeight : 0;
  }

  private adjustComplexity(current: 'basic' | 'intermediate' | 'advanced' | 'adaptive', feedback: 'too_simple' | 'too_complex' | 'appropriate'): 'basic' | 'intermediate' | 'advanced' | 'adaptive' {
    if (feedback === 'appropriate') return current;
    
    const levels: Array<'basic' | 'intermediate' | 'advanced' | 'adaptive'> = ['basic', 'intermediate', 'advanced'];
    const currentIndex = levels.indexOf(current);
    
    if (feedback === 'too_simple' && currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    } else if (feedback === 'too_complex' && currentIndex > 0) {
      return levels[currentIndex - 1];
    }
    
    return current;
  }

  private getFallbackDetection(): PersonalizationDetectionResult {
    return {
      responseType: 'general',
      confidence: 0.5,
      reasoning: ['Fallback detection due to error'],
      personalizationFactors: [],
      generalFactors: [],
      recommendedApproach: 'general',
      adaptations: [],
      fallback: true
    };
  }
}

// Supporting interfaces
interface PatternModel {
  name: string;
  patterns: string[];
  weight: number;
}

// Export singleton instance
export const personalizationDetectionEngine = new PersonalizationDetectionEngine();