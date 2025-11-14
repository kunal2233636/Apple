// Layer 1: Input Validation & Preprocessing System
// ================================================
// QueryClassifier - Query classification system with type detection,
// complexity assessment, context requirement analysis, and safety classification

import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';

export type QueryType = 'factual' | 'creative' | 'study' | 'general' | 'diagnostic' | 'conversational' | 'analytical';
export type ResponseStrategy = 'direct' | 'reasoning' | 'creative' | 'structured' | 'step_by_step' | 'comparative' | 'analytical';
export type ComplexityLevel = 1 | 2 | 3 | 4 | 5;
export type ContextRequirementLevel = 'minimal' | 'moderate' | 'extensive';

export interface QueryClassification {
  type: QueryType;
  intent: string;
  confidence: number;
  complexity: ComplexityLevel;
  requiresFacts: boolean;
  requiresContext: boolean;
  responseStrategy: ResponseStrategy;
  safetyLevel: 'safe' | 'caution' | 'review';
  keywords: string[];
  reasons: string[];
  contextRequirement: ContextRequirementLevel;
  estimatedResponseLength: number;
}

export interface FactualQuery {
  isFactual: boolean;
  factType: 'definition' | 'procedure' | 'explanation' | 'comparison' | 'calculation';
  subject: string;
  requiresVerification: boolean;
  confidence: number;
}

export interface StudyQuery {
  isStudy: boolean;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  learningObjective: string;
  requiresResources: boolean;
}

export interface ComplexityScore {
  overall: ComplexityLevel;
  linguistic: ComplexityLevel;
  conceptual: ComplexityLevel;
  technical: ComplexityLevel;
  reasoning: ComplexityLevel;
  factors: ComplexityFactor[];
  confidence: number;
}

export interface ComplexityFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface ContextRequirementData {
  level: ContextRequirementLevel;
  requiredTypes: ContextType[];
  estimatedSize: number; // in tokens
  priority: number;
}

export interface ContextType {
  type: 'user_profile' | 'conversation_history' | 'knowledge_base' | 'recent_activity' | 'preferences';
  importance: 'low' | 'medium' | 'high';
  required: boolean;
}

export interface ResponseStrategyConfig {
  approach: ResponseStrategy;
  maxResponseLength: number;
  requiredSources: string[];
  validationLevel: 'basic' | 'strict' | 'enhanced';
  qualityCriteria: QualityCriteria;
}

export interface QualityCriteria {
  accuracy: number;
  completeness: number;
  clarity: number;
  relevance: number;
  engagement: number;
}

export class QueryClassifier {
  private classificationRules: Map<QueryType, ClassificationRule> = new Map();
  private complexityPatterns: ComplexityPattern[] = [];
  private intentPatterns: Map<string, IntentPattern> = new Map();
  private contextRequirements: Map<QueryType, ContextType[]> = new Map();
  private strategyRecommendations: Map<QueryType, StrategyConfig> = new Map();
  private cryptoKey: string;

  constructor() {
    this.cryptoKey = process.env.CLASSIFICATION_ENCRYPTION_KEY || 'default-classification-key';
    this.initializeClassificationRules();
    this.initializeComplexityPatterns();
    this.initializeIntentPatterns();
    this.initializeContextRequirements();
    this.initializeStrategyRecommendations();
  }

  /**
   * Main classification method - analyzes and classifies query
   */
  async classifyQuery(
    query: string,
    userId?: string,
    conversationContext?: string[]
  ): Promise<QueryClassification> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query);
    
    try {
      logInfo('Query classification started', {
        componentName: 'QueryClassifier',
        queryLength: query.length,
        userId,
        queryHash
      });

      // Step 1: Detect query type and intent
      const typeDetection = await this.detectQueryType(query);
      
      // Step 2: Assess complexity
      const complexityScore = await this.assessComplexity(query);
      
      // Step 3: Determine context requirements
      const contextReq = await this.determineContextRequirement(query, typeDetection.type);
      
      // Step 4: Select response strategy
      const responseStrategyConfig = await this.selectResponseStrategy(typeDetection, complexityScore, contextReq);
      
      // Step 5: Safety classification
      const safetyLevel = this.assessSafetyLevel(query, typeDetection.type);
      
      // Step 6: Extract keywords
      const keywords = this.extractKeywords(query, typeDetection.type);
      
      // Step 7: Build classification result
      const classification: QueryClassification = {
        type: typeDetection.type,
        intent: typeDetection.intent,
        confidence: typeDetection.confidence * complexityScore.confidence,
        complexity: complexityScore.overall,
        requiresFacts: this.requiresFacts(typeDetection.type),
        requiresContext: contextReq.level !== 'minimal',
        responseStrategy: responseStrategyConfig.approach,
        safetyLevel,
        keywords,
        reasons: typeDetection.reasons.concat(complexityScore.factors.map(f => f.description)),
        contextRequirement: contextReq.level,
        estimatedResponseLength: this.estimateResponseLength(typeDetection.type, complexityScore.overall)
      };

      const processingTime = Date.now() - startTime;

      logInfo('Query classification completed', {
        componentName: 'QueryClassifier',
        queryHash,
        type: classification.type,
        complexity: classification.complexity,
        confidence: classification.confidence,
        processingTime,
        userId
      });

      return classification;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'QueryClassifier',
        queryHash,
        processingTime,
        userId
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
   * Detect if query is asking for factual information
   */
  async detectFactualQuestions(query: string): Promise<FactualQuery> {
    const factualIndicators = [
      { pattern: /\b(what is|define|definition|meaning)\b/i, type: 'definition' as const },
      { pattern: /\b(how to|steps|process|procedure)\b/i, type: 'procedure' as const },
      { pattern: /\b(explain|describe|elaborate)\b/i, type: 'explanation' as const },
      { pattern: /\b(compare|versus|difference between)\b/i, type: 'comparison' as const },
      { pattern: /\b(calculate|compute|solve|math)\b/i, type: 'calculation' as const }
    ];

    let detectedType: FactualQuery['factType'] | null = null;
    let confidence = 0.0;
    let subject = 'general';

    for (const indicator of factualIndicators) {
      if (indicator.pattern.test(query)) {
        detectedType = indicator.type;
        confidence = 0.8;
        break;
      }
    }

    // Extract subject from query
    const subjectPatterns = [
      { pattern: /\b(math|mathematics|algebra|calculus|geometry)\b/i, subject: 'mathematics' },
      { pattern: /\b(science|physics|chemistry|biology)\b/i, subject: 'science' },
      { pattern: /\b(history|geography|civics)\b/i, subject: 'social_studies' },
      { pattern: /\b(english|language|literature)\b/i, subject: 'language_arts' }
    ];

    for (const subjectPattern of subjectPatterns) {
      if (subjectPattern.pattern.test(query)) {
        subject = subjectPattern.subject;
        break;
      }
    }

    const isFactual = detectedType !== null;
    const requiresVerification = detectedType === 'definition' || detectedType === 'calculation';

    return {
      isFactual,
      factType: detectedType || 'explanation',
      subject,
      requiresVerification,
      confidence: isFactual ? confidence : 0.0
    };
  }

  /**
   * Identify if query is study-related
   */
  async identifyStudyQuestions(query: string): Promise<StudyQuery> {
    const studyIndicators = [
      { pattern: /\b(study|learn|practice|review|revise)\b/i, weight: 0.9 },
      { pattern: /\b(exam|test|quiz|homework|assignment)\b/i, weight: 0.8 },
      { pattern: /\b(grade|score|performance|improve)\b/i, weight: 0.7 },
      { pattern: /\b(concept|topic|chapter|lesson)\b/i, weight: 0.6 }
    ];

    let studyScore = 0.0;
    let topics: string[] = [];
    let level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
    let learningObjective = '';

    for (const indicator of studyIndicators) {
      if (indicator.pattern.test(query)) {
        studyScore += indicator.weight;
      }
    }

    // Extract topics
    const topicPatterns = [
      { pattern: /\b(math|algebra|geometry|calculus)\b/i, topic: 'mathematics' },
      { pattern: /\b(physics|chemistry|biology|science)\b/i, topic: 'science' },
      { pattern: /\b(history|geography|social studies)\b/i, topic: 'social_studies' },
      { pattern: /\b(english|literature|reading|writing)\b/i, topic: 'language_arts' }
    ];

    for (const topicPattern of topicPatterns) {
      if (topicPattern.pattern.test(query)) {
        topics.push(topicPattern.topic);
      }
    }

    // Determine level based on complexity indicators
    const beginnerPatterns = /\b(basic|simple|introduction|beginner|start)\b/i;
    const advancedPatterns = /\b(advanced|complex|difficult|expert|professional)\b/i;

    if (advancedPatterns.test(query)) {
      level = 'advanced';
    } else if (beginnerPatterns.test(query)) {
      level = 'beginner';
    }

    // Extract learning objective
    const objectivePatterns = [
      { pattern: /\b(understand|comprehend|grasp)\b/i, objective: 'comprehension' },
      { pattern: /\b(remember|recall|memorize)\b/i, objective: 'memorization' },
      { pattern: /\b(apply|use|practice)\b/i, objective: 'application' },
      { pattern: /\b(analyze|examine|study)\b/i, objective: 'analysis' }
    ];

    for (const objectivePattern of objectivePatterns) {
      if (objectivePattern.pattern.test(query)) {
        learningObjective = objectivePattern.objective;
        break;
      }
    }

    const isStudy = studyScore > 0.3;
    const requiresResources = studyScore > 0.6;

    return {
      isStudy,
      subject: topics[0] || 'general',
      level,
      topics,
      learningObjective: learningObjective || 'general learning',
      requiresResources
    };
  }

  /**
   * Assess complexity of the query
   */
  private async assessComplexity(query: string): Promise<ComplexityScore> {
    const factors: ComplexityFactor[] = [];
    let linguisticScore = 1;
    let conceptualScore = 1;
    let technicalScore = 1;
    let reasoningScore = 1;

    // Linguistic complexity
    const wordCount = query.split(/\s+/).length;
    const sentenceCount = query.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);

    if (wordCount > 20) linguisticScore++;
    if (wordCount > 50) linguisticScore++;
    if (avgWordsPerSentence > 15) linguisticScore++;
    if (query.includes(';') || query.includes(':')) linguisticScore++;

    factors.push({
      factor: 'linguistic',
      weight: 0.2,
      score: linguisticScore,
      description: `Linguistic complexity: ${wordCount} words, ${avgWordsPerSentence.toFixed(1)} avg words/sentence`
    });

    // Conceptual complexity
    const complexConcepts = [
      { pattern: /\b(analyze|evaluate|synthesize|critique)\b/i, score: 2 },
      { pattern: /\b(hypothesis|theory|principle|concept)\b/i, score: 1 },
      { pattern: /\b(interdisciplinary|multifaceted|complex)\b/i, score: 2 }
    ];

    for (const concept of complexConcepts) {
      if (concept.pattern.test(query)) {
        conceptualScore += concept.score;
        factors.push({
          factor: 'conceptual',
          weight: 0.3,
          score: concept.score,
          description: `Complex concept detected: ${concept.pattern.source}`
        });
      }
    }

    // Technical complexity
    const technicalTerms = query.match(/\b[A-Z]{2,}\b/g) || []; // Acronyms
    const technicalPatterns = [
      { pattern: /\b(formula|equation|algorithm|methodology)\b/i, score: 1 },
      { pattern: /\b(quantum|thermodynamics|neural|computational)\b/i, score: 2 }
    ];

    if (technicalTerms.length > 0) technicalScore++;
    for (const pattern of technicalPatterns) {
      if (pattern.pattern.test(query)) {
        technicalScore += pattern.score;
        factors.push({
          factor: 'technical',
          weight: 0.2,
          score: pattern.score,
          description: `Technical complexity: ${pattern.pattern.source}`
        });
      }
    }

    // Reasoning complexity
    const reasoningIndicators = [
      { pattern: /\b(why|because|therefore|thus|hence)\b/i, score: 1 },
      { pattern: /\b(if.*then|assume|case|scenario)\b/i, score: 2 },
      { pattern: /\b(compare|contrast|versus|different from)\b/i, score: 1 }
    ];

    for (const indicator of reasoningIndicators) {
      if (indicator.pattern.test(query)) {
        reasoningScore += indicator.score;
        factors.push({
          factor: 'reasoning',
          weight: 0.3,
          score: indicator.score,
          description: `Reasoning complexity: ${indicator.pattern.source}`
        });
      }
    }

    // Calculate overall complexity
    const weighted = (linguisticScore * 0.2 + conceptualScore * 0.3 + technicalScore * 0.2 + reasoningScore * 0.3);
    const overall = Math.min(5, Math.max(1, Math.round(weighted)));

    const confidence = factors.length > 0 ? Math.min(0.9, 0.5 + (factors.length * 0.1)) : 0.3;

    return {
      overall: overall as ComplexityLevel,
      linguistic: Math.min(5, linguisticScore) as ComplexityLevel,
      conceptual: Math.min(5, conceptualScore) as ComplexityLevel,
      technical: Math.min(5, technicalScore) as ComplexityLevel,
      reasoning: Math.min(5, reasoningScore) as ComplexityLevel,
      factors,
      confidence
    };
  }

  /**
   * Determine context requirements for the query
   */
  private async determineContextRequirement(query: string, queryType: QueryType): Promise<ContextRequirementData> {
    const baseRequirement = this.contextRequirements.get(queryType) || [];
    
    // Analyze additional context needs
    let requiredTypes: ContextType[] = [...baseRequirement];
    let estimatedSize = 100; // Base size in tokens
    let priority = 1;

    // Add context based on query patterns
    if (/\b(my|our|me|I)\b/i.test(query)) {
      requiredTypes.push({ type: 'user_profile', importance: 'high', required: true });
      estimatedSize += 200;
    }

    if (queryType === 'study') {
      requiredTypes.push({ type: 'recent_activity', importance: 'medium', required: true });
      requiredTypes.push({ type: 'preferences', importance: 'low', required: false });
      estimatedSize += 150;
    }

    if (query.includes('?')) {
      requiredTypes.push({ type: 'conversation_history', importance: 'medium', required: true });
      estimatedSize += 100;
    }

    // Determine level based on query characteristics
    let level: ContextRequirementLevel = 'minimal';
    if (requiredTypes.length > 2) level = 'moderate';
    if (requiredTypes.length > 4 || estimatedSize > 400) level = 'extensive';

    return {
      level,
      requiredTypes,
      estimatedSize,
      priority
    } as ContextRequirementData;
  }

  /**
   * Detect query type and intent
   */
  private async detectQueryType(query: string): Promise<{
    type: QueryType;
    intent: string;
    confidence: number;
    reasons: string[];
  }> {
    const typeScores: Record<QueryType, number> = {
      factual: 0,
      creative: 0,
      study: 0,
      general: 0,
      diagnostic: 0,
      conversational: 0,
      analytical: 0
    };

    const reasons: string[] = [];

    // Study-related indicators
    if (/\b(study|learn|practice|exam|test|homework|assignment|grade|score)\b/i.test(query)) {
      typeScores.study += 0.8;
      reasons.push('Study-related keywords detected');
    }

    // Factual indicators
    if (/\b(what is|define|explain|tell me|how many|when|where|who)\b/i.test(query)) {
      typeScores.factual += 0.9;
      reasons.push('Factual question pattern detected');
    }

    // Creative indicators
    if (/\b(create|make|generate|write|design|imagine|story|poem)\b/i.test(query)) {
      typeScores.creative += 0.8;
      reasons.push('Creative request pattern detected');
    }

    // Diagnostic indicators
    if (/\b(problem|issue|error|debug|fix|troubleshoot|diagnose)\b/i.test(query)) {
      typeScores.diagnostic += 0.9;
      reasons.push('Diagnostic problem-solving detected');
    }

    // Analytical indicators
    if (/\b(analyze|compare|evaluate|assess|examine|investigate)\b/i.test(query)) {
      typeScores.analytical += 0.8;
      reasons.push('Analytical task detected');
    }

    // Conversational indicators
    if (/\b(hi|hello|hey|how are you|thanks|thank you|bye)\b/i.test(query)) {
      typeScores.conversational += 0.9;
      reasons.push('Conversational greeting detected');
    }

    // General indicators (fallback)
    if (Object.values(typeScores).every(score => score < 0.5)) {
      typeScores.general = 0.6;
      reasons.push('General inquiry pattern detected');
    }

    // Find highest scoring type
    const maxScore = Math.max(...Object.values(typeScores));
    const detectedType = Object.entries(typeScores).find(([_, score]) => score === maxScore)?.[0] as QueryType || 'general';
    
    const confidence = Math.min(0.95, maxScore);

    // Determine intent based on type and query content
    const intent = this.determineIntent(query, detectedType);

    return {
      type: detectedType,
      intent,
      confidence,
      reasons
    };
  }

  /**
   * Select appropriate response strategy
   */
  private async selectResponseStrategy(
    typeDetection: { type: QueryType; confidence: number },
    complexityScore: ComplexityScore,
    contextRequirement: ContextRequirementData
  ): Promise<ResponseStrategyConfig> {
    const config = this.strategyRecommendations.get(typeDetection.type);
    
    if (!config) {
      return {
        approach: 'direct',
        maxResponseLength: 200,
        requiredSources: [],
        validationLevel: 'basic',
        qualityCriteria: {
          accuracy: 0.7,
          completeness: 0.6,
          clarity: 0.8,
          relevance: 0.7,
          engagement: 0.5
        }
      };
    }

    // Adjust strategy based on complexity
    let approach = config.defaultApproach;
    let maxResponseLength = config.baseMaxLength;

    if (complexityScore.overall >= 4) {
      approach = 'step_by_step';
      maxResponseLength *= 1.5;
    } else if (complexityScore.overall >= 3) {
      approach = 'reasoning';
      maxResponseLength *= 1.2;
    }

    if (typeDetection.type === 'creative') {
      approach = 'creative';
      maxResponseLength *= 1.3;
    } else if (typeDetection.type === 'analytical') {
      approach = 'analytical';
      maxResponseLength *= 1.4;
    }

    // Determine validation level
    let validationLevel: 'basic' | 'strict' | 'enhanced' = 'basic';
    if (complexityScore.overall >= 4 || typeDetection.type === 'factual') {
      validationLevel = 'strict';
    }
    if (typeDetection.type === 'study' || contextRequirement.level === 'extensive') {
      validationLevel = 'enhanced';
    }

    return {
      approach: approach as ResponseStrategy,
      maxResponseLength: Math.round(maxResponseLength),
      requiredSources: config.requiredSources,
      validationLevel,
      qualityCriteria: {
        accuracy: config.baseAccuracy,
        completeness: config.baseCompleteness,
        clarity: config.baseClarity,
        relevance: config.baseRelevance,
        engagement: config.baseEngagement
      }
    };
  }

  /**
   * Assess safety level of the query
   */
  private assessSafetyLevel(query: string, queryType: QueryType): 'safe' | 'caution' | 'review' {
    // High-risk query types
    if (queryType === 'diagnostic') {
      return 'caution';
    }

    // Check for potentially concerning content
    const concerningPatterns = [
      /\b(hack|exploit|break|cheat|circumvent)\b/i,
      /\b(weapon|bomb|attack|harm|violent)\b/i
    ];

    for (const pattern of concerningPatterns) {
      if (pattern.test(query)) {
        return 'review';
      }
    }

    return 'safe';
  }

  /**
   * Extract relevant keywords from query
   */
  private extractKeywords(query: string, queryType: QueryType): string[] {
    const keywords: string[] = [];
    
    // Remove common words and extract meaningful terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Type-specific keyword prioritization
    switch (queryType) {
      case 'study':
        keywords.push(...words.filter(word => 
          ['study', 'learn', 'exam', 'test', 'homework', 'assignment', 'grade', 'subject', 'topic', 'lesson', 'concept'].includes(word)
        ));
        break;
      case 'factual':
        keywords.push(...words.filter(word => 
          ['what', 'when', 'where', 'who', 'why', 'how', 'define', 'explain'].includes(word)
        ));
        break;
    }
    
    // Add general meaningful words
    keywords.push(...words.slice(0, 10)); // Top 10 meaningful words
    
    return [...new Set(keywords)].slice(0, 15); // Remove duplicates and limit
  }

  // Utility methods
  private generateQueryHash(query: string): string {
    return createHash('sha256').update(query + this.cryptoKey).digest('hex');
  }

  private requiresFacts(queryType: QueryType): boolean {
    return ['factual', 'study', 'analytical'].includes(queryType);
  }

  private determineIntent(query: string, queryType: QueryType): string {
    const queryLower = query.toLowerCase();
    
    switch (queryType) {
      case 'factual':
        if (queryLower.includes('what is') || queryLower.includes('define')) return 'definition request';
        if (queryLower.includes('how to') || queryLower.includes('steps')) return 'procedure request';
        if (queryLower.includes('explain')) return 'explanation request';
        return 'factual information request';
        
      case 'study':
        if (queryLower.includes('exam') || queryLower.includes('test')) return 'exam preparation';
        if (queryLower.includes('practice')) return 'practice request';
        if (queryLower.includes('learn')) return 'learning request';
        return 'study assistance request';
        
      case 'creative':
        if (queryLower.includes('write') || queryLower.includes('create')) return 'content creation';
        if (queryLower.includes('design')) return 'design request';
        return 'creative assistance request';
        
      case 'diagnostic':
        return 'problem diagnosis and resolution';
        
      case 'analytical':
        return 'analysis and evaluation request';
        
      case 'conversational':
        return 'social interaction';
        
      default:
        return 'general inquiry';
    }
  }

  private estimateResponseLength(queryType: QueryType, complexity: ComplexityLevel): number {
    const baseLengths = {
      factual: 150,
      creative: 200,
      study: 180,
      general: 120,
      diagnostic: 250,
      conversational: 80,
      analytical: 220
    };
    
    const baseLength = baseLengths[queryType] || 150;
    const complexityMultiplier = 1 + ((complexity - 1) * 0.3);
    
    return Math.round(baseLength * complexityMultiplier);
  }

  // Initialization methods
  private initializeClassificationRules(): void {
    // Initialize query type classification rules
    // This would contain detailed patterns for each query type
  }

  private initializeComplexityPatterns(): void {
    this.complexityPatterns = [
      {
        pattern: /\b(analyze|evaluate|synthesize|complex|advanced)\b/i,
        weight: 0.3,
        category: 'conceptual'
      },
      {
        pattern: /\b(formula|equation|algorithm|technical)\b/i,
        weight: 0.2,
        category: 'technical'
      }
    ];
  }

  private initializeIntentPatterns(): void {
    // Initialize intent detection patterns
  }

  private initializeContextRequirements(): void {
    this.contextRequirements.set('study', [
      { type: 'user_profile', importance: 'high', required: true },
      { type: 'recent_activity', importance: 'medium', required: true }
    ] as ContextType[]);
    
    this.contextRequirements.set('factual', [
      { type: 'knowledge_base', importance: 'high', required: true }
    ] as ContextType[]);
    
    this.contextRequirements.set('diagnostic', [
      { type: 'conversation_history', importance: 'high', required: true },
      { type: 'recent_activity', importance: 'medium', required: true }
    ] as ContextType[]);
  }

  private initializeStrategyRecommendations(): void {
    this.strategyRecommendations.set('factual', {
      defaultApproach: 'direct',
      baseMaxLength: 150,
      requiredSources: ['knowledge_base', 'verified_sources'],
      baseAccuracy: 0.9,
      baseCompleteness: 0.8,
      baseClarity: 0.9,
      baseRelevance: 0.9,
      baseEngagement: 0.6
    } as StrategyConfig);
    
    this.strategyRecommendations.set('study', {
      defaultApproach: 'step_by_step',
      baseMaxLength: 200,
      requiredSources: ['educational_resources', 'user_profile'],
      baseAccuracy: 0.85,
      baseCompleteness: 0.9,
      baseClarity: 0.9,
      baseRelevance: 0.95,
      baseEngagement: 0.8
    } as StrategyConfig);
  }
}

// Supporting interfaces
interface ClassificationRule {
  type: QueryType;
  patterns: RegExp[];
  weight: number;
}

interface ComplexityPattern {
  pattern: RegExp;
  weight: number;
  category: 'linguistic' | 'conceptual' | 'technical' | 'reasoning';
}

interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  confidence: number;
}

interface StrategyConfig {
  defaultApproach: string;
  baseMaxLength: number;
  requiredSources: string[];
  baseAccuracy: number;
  baseCompleteness: number;
  baseClarity: number;
  baseRelevance: number;
  baseEngagement: number;
}

// Export singleton instance
export const queryClassifier = new QueryClassifier();