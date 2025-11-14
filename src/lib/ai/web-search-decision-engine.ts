// Web Search Decision Engine
// ==========================
// Intelligent system that determines when web search is needed vs internal knowledge
// for academic, personal, and general queries

import { logError, logInfo, logWarning } from '@/lib/error-logger-server-safe';

export interface WebSearchDecision {
  shouldSearch: boolean;
  searchType: 'none' | 'academic' | 'current_events' | 'technical' | 'comprehensive' | 'personalized';
  confidence: number;
  reasoning: string[];
  searchTerms: string[];
  sources: string[];
  urgency: 'low' | 'normal' | 'high';
  fallback: boolean;
}

export interface QueryAnalysis {
  query: string;
  intent: 'factual' | 'explanatory' | 'personal' | 'research' | 'learning' | 'technical' | 'creative';
  domain: 'general' | 'academic' | 'technical' | 'medical' | 'legal' | 'financial' | 'news' | 'history';
  timeSensitivity: 'none' | 'recent' | 'live' | 'historical';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  requiresAuthority: boolean;
  requiresCurrentData: boolean;
  requiresPersonalization: boolean;
  webSearchIndicators: WebSearchIndicator[];
  internalKnowledgeIndicators: InternalKnowledgeIndicator[];
}

export interface WebSearchIndicator {
  type: 'current_events' | 'recent_data' | 'specific_sources' | 'factual_checking' | 'technical_specs' | 'breaking_news';
  relevance: number; // 0-1
  query: string;
  examples: string[];
}

export interface InternalKnowledgeIndicator {
  type: 'conceptual' | 'educational' | 'general' | 'theoretical' | 'definition' | 'explanation';
  relevance: number; // 0-1
  query: string;
  examples: string[];
}

export interface SearchContext {
  userId: string;
  conversationHistory: Array<{
    query: string;
    response: string;
    searchUsed: boolean;
    satisfaction?: number;
  }>;
  domain: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  previousSearches: string[];
  successRate: number;
  timeConstraints?: number;
  subject: string;
  urgency: 'low' | 'normal' | 'high';
}

export interface PersonalizationFactors {
  userLevel: 'novice' | 'developing' | 'proficient' | 'expert';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
  preferredDepth: 'surface' | 'moderate' | 'comprehensive' | 'expert';
  previousQueries: string[];
  successPatterns: {
    withWebSearch: number;
    withoutWebSearch: number;
    satisfactionWithSearch: number;
    satisfactionWithoutSearch: number;
  };
  domainExpertise: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
}

export class WebSearchDecisionEngine {
  private decisionCache: Map<string, WebSearchDecision> = new Map();
  private userPatterns: Map<string, PersonalizationFactors> = new Map();
  private searchSuccessRates: Map<string, { total: number; successful: number }> = new Map();

  constructor() {
    this.initializeDecisionPatterns();
  }

  /**
   * Main decision method - determines if web search should be used
   */
  async makeSearchDecision(
    query: string,
    context: SearchContext,
    userPatterns: PersonalizationFactors
  ): Promise<WebSearchDecision> {
    const startTime = Date.now();
    
    try {
      logInfo('Starting web search decision', {
        componentName: 'WebSearchDecisionEngine',
        userId: context.userId,
        query: query.substring(0, 100),
        domain: context.domain
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(query, context);
      const cached = this.decisionCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        logInfo('Returning cached search decision', {
          componentName: 'WebSearchDecisionEngine',
          cacheKey
        });
        return cached;
      }

      // Step 1: Analyze query characteristics
      const analysis = await this.analyzeQuery(query, context);
      
      // Step 2: Apply decision rules
      const decision = this.applyDecisionRules(analysis, context, userPatterns);
      
      // Step 3: Calculate search terms and sources
      const searchPlan = this.createSearchPlan(analysis, decision, context);
      
      // Step 4: Apply personalization factors
      const personalizedDecision = this.applyPersonalization(
        decision,
        searchPlan,
        context,
        userPatterns
      );

      // Step 5: Final decision with confidence
      const finalDecision: WebSearchDecision = {
        ...personalizedDecision,
        searchTerms: searchPlan.terms,
        sources: searchPlan.sources,
        reasoning: [
          `Query type: ${analysis.intent} in ${analysis.domain} domain`,
          `Complexity: ${analysis.complexity}`,
          `Time sensitivity: ${analysis.timeSensitivity}`,
          `Authority required: ${analysis.requiresAuthority}`,
          `User expertise: ${userPatterns.userLevel} in ${context.domain}`,
          `Success rate: ${userPatterns.successPatterns.withWebSearch}/${userPatterns.successPatterns.withoutWebSearch}`
        ]
      };

      // Cache the decision
      this.decisionCache.set(cacheKey, finalDecision);

      const processingTime = Date.now() - startTime;
      logInfo('Web search decision completed', {
        componentName: 'WebSearchDecisionEngine',
        userId: context.userId,
        shouldSearch: finalDecision.shouldSearch,
        searchType: finalDecision.searchType,
        confidence: finalDecision.confidence,
        processingTime
      });

      return finalDecision;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'WebSearchDecisionEngine',
        userId: context.userId,
        query: query.substring(0, 100),
        operation: 'makeSearchDecision'
      });

      // Return safe fallback
      return this.getFallbackDecision();
    }
  }

  /**
   * Update user patterns based on search results and feedback
   */
  async updateUserPatterns(
    userId: string,
    query: string,
    searchUsed: boolean,
    feedback: {
      satisfaction: number; // 1-5
      helpful: boolean;
      informationSufficient: boolean;
      wouldSearchAgain: boolean;
    }
  ): Promise<void> {
    let patterns = this.userPatterns.get(userId);
    if (!patterns) {
      patterns = this.initializeUserPatterns(userId);
    }

    // Update success patterns
    if (searchUsed) {
      patterns.successPatterns.withWebSearch++;
      if (feedback.satisfaction >= 4) {
        patterns.successPatterns.satisfactionWithSearch++;
      }
    } else {
      patterns.successPatterns.withoutWebSearch++;
      if (feedback.satisfaction >= 4) {
        patterns.successPatterns.satisfactionWithoutSearch++;
      }
    }

    // Update domain expertise based on performance
    if (feedback.informationSufficient && !searchUsed) {
      // User got sufficient info without search = good domain knowledge
      const domain = this.detectDomain(query);
      if (patterns.domainExpertise[domain]) {
        const currentLevel = patterns.domainExpertise[domain];
        patterns.domainExpertise[domain] = this.increaseExpertiseLevel(currentLevel);
      }
    }

    this.userPatterns.set(userId, patterns);
    
    logInfo('User patterns updated', {
      componentName: 'WebSearchDecisionEngine',
      userId,
      searchUsed,
      satisfaction: feedback.satisfaction
    });
  }

  /**
   * Get user's personalization factors
   */
  getUserPatterns(userId: string): PersonalizationFactors | null {
    return this.userPatterns.get(userId) || null;
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    cacheSize: number;
    userPatternCount: number;
    averageDecisionTime: number;
    searchSuccessRate: number;
  } {
    const totalSearches = Array.from(this.searchSuccessRates.values())
      .reduce((sum, stats) => sum + stats.total, 0);
    const successfulSearches = Array.from(this.searchSuccessRates.values())
      .reduce((sum, stats) => sum + stats.successful, 0);

    return {
      cacheSize: this.decisionCache.size,
      userPatternCount: this.userPatterns.size,
      averageDecisionTime: 0, // Would track in production
      searchSuccessRate: totalSearches > 0 ? successfulSearches / totalSearches : 0
    };
  }

  // Private methods

  private async analyzeQuery(query: string, context: SearchContext): Promise<QueryAnalysis> {
    const queryLower = query.toLowerCase();
    
    // Detect intent
    const intent = this.detectIntent(queryLower);
    
    // Detect domain
    const domain = this.detectDomain(queryLower);
    
    // Assess time sensitivity
    const timeSensitivity = this.assessTimeSensitivity(queryLower, context);
    
    // Assess complexity
    const complexity = this.assessComplexity(queryLower, context);
    
    // Check if authority/validation is needed
    const requiresAuthority = this.requiresAuthority(queryLower, intent, domain);
    
    // Check if current data is needed
    const requiresCurrentData = this.requiresCurrentData(queryLower, intent, domain, timeSensitivity);
    
    // Check if personalization is needed
    const requiresPersonalization = this.requiresPersonalization(queryLower, intent, context);
    
    // Identify web search indicators
    const webSearchIndicators = this.identifyWebSearchIndicators(queryLower, intent, domain, timeSensitivity);
    
    // Identify internal knowledge indicators
    const internalKnowledgeIndicators = this.identifyInternalKnowledgeIndicators(queryLower, intent, domain);

    return {
      query,
      intent,
      domain,
      timeSensitivity,
      complexity,
      requiresAuthority,
      requiresCurrentData,
      requiresPersonalization,
      webSearchIndicators,
      internalKnowledgeIndicators
    };
  }

  private detectIntent(query: string): QueryAnalysis['intent'] {
    const intentPatterns = {
      factual: ['what is', 'when did', 'where is', 'how many', 'who is', 'which is', 'define'],
      explanatory: ['explain', 'how does', 'why does', 'what causes', 'describe', 'tell me about'],
      personal: ['my', 'i am', 'i have', 'i need', 'help me', 'my problem', 'my situation'],
      research: ['research', 'study', 'find information', 'look up', 'investigate', 'analyze'],
      learning: ['learn', 'teach', 'understand', 'study', 'practice', 'lesson', 'tutorial'],
      technical: ['code', 'algorithm', 'function', 'api', 'database', 'system', 'technical'],
      creative: ['write', 'create', 'generate', 'design', 'brainstorm', 'story', 'idea']
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        return intent as QueryAnalysis['intent'];
      }
    }

    return 'factual'; // Default
  }

  private detectDomain(query: string): QueryAnalysis['domain'] {
    const domainPatterns = {
      academic: ['study', 'learn', 'education', 'school', 'university', 'course', 'academic'],
      technical: ['code', 'programming', 'software', 'algorithm', 'api', 'database', 'system'],
      medical: ['health', 'medical', 'doctor', 'medicine', 'disease', 'symptom', 'treatment'],
      legal: ['law', 'legal', 'court', 'case', 'contract', 'regulation', 'legal advice'],
      financial: ['money', 'finance', 'investment', 'bank', 'stock', 'economy', 'financial'],
      news: ['news', 'recent', 'today', 'breaking', 'happened', 'current', 'latest'],
      history: ['history', 'historical', 'past', 'ancient', 'century', 'era', 'timeline']
    };

    for (const [domain, patterns] of Object.entries(domainPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        return domain as QueryAnalysis['domain'];
      }
    }

    return 'general'; // Default
  }

  private assessTimeSensitivity(query: string, context: SearchContext): QueryAnalysis['timeSensitivity'] {
    // Check for time-related keywords
    const timeKeywords = {
      recent: ['recent', 'latest', 'current', 'today', 'now', 'this year', 'this month'],
      live: ['live', 'breaking', 'happening now', 'current status', 'real time'],
      historical: ['history', 'historical', 'past', 'ancient', 'when did', 'timeline']
    };

    for (const [level, keywords] of Object.entries(timeKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return level as QueryAnalysis['timeSensitivity'];
      }
    }

    // Consider context urgency
    if (context.urgency === 'high') {
      return 'recent';
    }

    return 'none';
  }

  private assessComplexity(query: string, context: SearchContext): QueryAnalysis['complexity'] {
    // Simple heuristic based on query characteristics
    let complexityScore = 0;

    // Length factor
    if (query.length > 100) complexityScore += 1;
    if (query.length > 200) complexityScore += 1;

    // Question complexity
    const complexIndicators = [
      'analyze', 'compare', 'contrast', 'evaluate', 'synthesize', 'comprehensive',
      'detailed', 'thorough', 'in-depth', 'complex', 'advanced'
    ];
    
    if (complexIndicators.some(indicator => query.includes(indicator))) {
      complexityScore += 2;
    }

    // User expertise
    if (context.expertiseLevel === 'expert') {
      complexityScore += 1;
    } else if (context.expertiseLevel === 'beginner') {
      complexityScore -= 1;
    }

    if (complexityScore <= 0) return 'simple';
    if (complexityScore <= 2) return 'moderate';
    if (complexityScore <= 4) return 'complex';
    return 'expert';
  }

  private requiresAuthority(query: string, intent: QueryAnalysis['intent'], domain: QueryAnalysis['domain']): boolean {
    // Medical, legal, and financial queries often require authoritative sources
    if (['medical', 'legal', 'financial'].includes(domain)) {
      return true;
    }

    // Research and factual queries may need verification
    if (intent === 'research' || intent === 'factual') {
      return true;
    }

    // Time-sensitive queries need current, authoritative information
    if (query.includes('recent') || query.includes('current') || query.includes('latest')) {
      return true;
    }

    return false;
  }

  private requiresCurrentData(query: string, intent: QueryAnalysis['intent'], domain: QueryAnalysis['domain'], timeSensitivity: QueryAnalysis['timeSensitivity']): boolean {
    // News and current events always need current data
    if (timeSensitivity === 'live' || timeSensitivity === 'recent') {
      return true;
    }

    // Financial queries often need current data
    if (domain === 'financial') {
      return true;
    }

    // Research queries might need current data
    if (intent === 'research') {
      return true;
    }

    // Queries specifically asking for "latest" or "current" information
    if (query.includes('latest') || query.includes('current') || query.includes('recent')) {
      return true;
    }

    return false;
  }

  private requiresPersonalization(query: string, intent: QueryAnalysis['intent'], context: SearchContext): boolean {
    // Personal queries always need personalization
    if (intent === 'personal') {
      return true;
    }

    // Learning queries benefit from personalization
    if (intent === 'learning') {
      return true;
    }

    // Queries that reference user's previous context
    if (query.includes('my') || query.includes('continue') || query.includes('previous')) {
      return true;
    }

    return false;
  }

  private identifyWebSearchIndicators(query: string, intent: QueryAnalysis['intent'], domain: QueryAnalysis['domain'], timeSensitivity: QueryAnalysis['timeSensitivity']): WebSearchIndicator[] {
    const indicators: WebSearchIndicator[] = [];

    // Current events and recent information
    if (timeSensitivity !== 'none') {
      indicators.push({
        type: 'current_events',
        relevance: timeSensitivity === 'live' ? 0.9 : timeSensitivity === 'recent' ? 0.7 : 0.4,
        query: query,
        examples: ['breaking news', 'recent developments', 'current status']
      });
    }

    // Factual verification needed
    if (intent === 'factual' || intent === 'research') {
      indicators.push({
        type: 'factual_checking',
        relevance: 0.8,
        query: query,
        examples: ['verify information', 'cross-reference', 'multiple sources']
      });
    }

    // Technical specifications
    if (domain === 'technical' || query.includes('specification') || query.includes('documentation')) {
      indicators.push({
        type: 'technical_specs',
        relevance: 0.9,
        query: query,
        examples: ['API documentation', 'technical specs', 'official guidelines']
      });
    }

    // Recent data requirements
    if (query.includes('latest') || query.includes('current') || query.includes('recent')) {
      indicators.push({
        type: 'recent_data',
        relevance: 0.8,
        query: query,
        examples: ['latest statistics', 'current trends', 'recent updates']
      });
    }

    return indicators;
  }

  private identifyInternalKnowledgeIndicators(query: string, intent: QueryAnalysis['intent'], domain: QueryAnalysis['domain']): InternalKnowledgeIndicator[] {
    const indicators: InternalKnowledgeIndicator[] = [];

    // Conceptual explanations
    if (intent === 'explanatory' || intent === 'learning') {
      indicators.push({
        type: 'conceptual',
        relevance: 0.8,
        query: query,
        examples: ['explain concepts', 'educational content', 'learning materials']
      });
    }

    // General knowledge
    if (domain === 'general' || intent === 'creative') {
      indicators.push({
        type: 'general',
        relevance: 0.7,
        query: query,
        examples: ['general knowledge', 'common facts', 'basic information']
      });
    }

    // Educational content
    if (intent === 'learning' || domain === 'academic') {
      indicators.push({
        type: 'educational',
        relevance: 0.9,
        query: query,
        examples: ['educational materials', 'study content', 'learning resources']
      });
    }

    // Theoretical content
    if (intent === 'explanatory' || query.includes('theory') || query.includes('concept')) {
      indicators.push({
        type: 'theoretical',
        relevance: 0.7,
        query: query,
        examples: ['theoretical explanations', 'conceptual understanding', 'academic theory']
      });
    }

    return indicators;
  }

  private applyDecisionRules(analysis: QueryAnalysis, context: SearchContext, userPatterns: PersonalizationFactors): Omit<WebSearchDecision, 'searchTerms' | 'sources' | 'reasoning'> {
    let shouldSearch = false;
    let searchType: WebSearchDecision['searchType'] = 'none';
    let confidence = 0.5;

    // Rule 1: High time sensitivity always triggers search
    if (analysis.timeSensitivity === 'live' || analysis.timeSensitivity === 'recent') {
      shouldSearch = true;
      searchType = 'current_events';
      confidence = 0.9;
    }

    // Rule 2: Authority requirements
    if (analysis.requiresAuthority && !shouldSearch) {
      shouldSearch = true;
      searchType = 'comprehensive';
      confidence = 0.8;
    }

    // Rule 3: Current data requirements
    if (analysis.requiresCurrentData && !shouldSearch) {
      shouldSearch = true;
      searchType = 'comprehensive';
      confidence = 0.8;
    }

    // Rule 4: Technical queries with low user expertise
    if (analysis.domain === 'technical' && 
        userPatterns.domainExpertise[context.domain] === 'beginner' && 
        !shouldSearch) {
      shouldSearch = true;
      searchType = 'technical';
      confidence = 0.7;
    }

    // Rule 5: Research queries
    if (analysis.intent === 'research' && !shouldSearch) {
      shouldSearch = true;
      searchType = 'comprehensive';
      confidence = 0.8;
    }

    // Rule 6: Personalization override
    if (analysis.requiresPersonalization && 
        userPatterns.successPatterns.satisfactionWithSearch > userPatterns.successPatterns.satisfactionWithoutSearch &&
        !shouldSearch) {
      shouldSearch = true;
      searchType = 'personalized';
      confidence = 0.6;
    }

    // Rule 7: Factual queries with verification need
    if (analysis.intent === 'factual' && 
        (analysis.complexity === 'complex' || analysis.complexity === 'expert') &&
        !shouldSearch) {
      shouldSearch = true;
      searchType = 'comprehensive';
      confidence = 0.7;
    }

    // Rule 8: Learning queries - use internal knowledge with fallback
    if (analysis.intent === 'learning' && !shouldSearch) {
      shouldSearch = false; // Start with internal knowledge
      searchType = 'none';
      confidence = 0.6;
    }

    return {
      shouldSearch,
      searchType,
      confidence,
      reasoning: [],
      urgency: context.urgency,
      fallback: analysis.intent === 'learning' || analysis.intent === 'explanatory'
    };
  }

  private createSearchPlan(analysis: QueryAnalysis, decision: WebSearchDecision, context: SearchContext): { terms: string[]; sources: string[] } {
    if (!decision.shouldSearch) {
      return { terms: [], sources: [] };
    }

    // Generate search terms
    const terms = this.generateSearchTerms(analysis, context);
    
    // Determine sources
    const sources = this.selectSources(analysis, decision, context);

    return { terms, sources };
  }

  private generateSearchTerms(analysis: QueryAnalysis, context: SearchContext): string[] {
    const terms: string[] = [];
    
    // Add original query terms
    terms.push(analysis.query);
    
    // Add domain-specific terms
    if (analysis.domain !== 'general') {
      terms.push(`${analysis.domain} ${analysis.query}`);
    }
    
    // Add time-sensitive terms
    if (analysis.timeSensitivity !== 'none') {
      const timePrefix = analysis.timeSensitivity === 'recent' ? 'latest' : 'current';
      terms.push(`${timePrefix} ${analysis.query}`);
    }
    
    // Add expertise level terms
    if (context.expertiseLevel !== 'intermediate') {
      terms.push(`${context.expertiseLevel} ${analysis.query}`);
    }
    
    return terms;
  }

  private selectSources(analysis: QueryAnalysis, decision: WebSearchDecision, context: SearchContext): string[] {
    const sources: string[] = [];
    
    switch (decision.searchType) {
      case 'academic':
        sources.push('scholarly articles', 'academic papers', 'educational resources');
        break;
      case 'technical':
        sources.push('documentation', 'technical specifications', 'official APIs');
        break;
      case 'current_events':
        sources.push('news outlets', 'current reports', 'live updates');
        break;
      case 'comprehensive':
        sources.push('multiple authoritative sources', 'cross-referenced data', 'verified information');
        break;
      case 'personalized':
        sources.push('user-specific resources', 'personalized content', 'adaptive materials');
        break;
    }
    
    return sources;
  }

  private applyPersonalization(decision: WebSearchDecision, searchPlan: { terms: string[]; sources: string[] }, context: SearchContext, userPatterns: PersonalizationFactors): WebSearchDecision {
    // Adjust confidence based on user's historical success
    const searchSuccessRate = userPatterns.successPatterns.withWebSearch / 
      (userPatterns.successPatterns.withWebSearch + userPatterns.successPatterns.withoutWebSearch);
    
    if (searchSuccessRate > 0.7) {
      decision.confidence = Math.min(1.0, decision.confidence + 0.1);
    } else if (searchSuccessRate < 0.3) {
      decision.confidence = Math.max(0.0, decision.confidence - 0.1);
      if (decision.fallback) {
        decision.shouldSearch = false; // Trust internal knowledge more
      }
    }
    
    // Adjust based on user's domain expertise
    const userDomainExpertise = userPatterns.domainExpertise[context.domain] || 'intermediate';
    if (userDomainExpertise === 'expert' && decision.searchType !== 'current_events') {
      // Experts might prefer internal knowledge for non-time-sensitive queries
      if (decision.confidence < 0.8) {
        decision.shouldSearch = false;
      }
    }
    
    return decision;
  }

  private generateCacheKey(query: string, context: SearchContext): string {
    const keyData = {
      query: query.toLowerCase().trim(),
      domain: context.domain,
      urgency: context.urgency
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private isCacheValid(decision: WebSearchDecision): boolean {
    // Decisions are valid for a short time, especially for current data
    if (decision.searchType === 'current_events' || decision.searchType === 'comprehensive') {
      return true; // Could implement TTL logic here
    }
    return true; // Simplified for now
  }

  private initializeUserPatterns(userId: string): PersonalizationFactors {
    return {
      userLevel: 'developing',
      learningStyle: 'reading_writing',
      preferredDepth: 'moderate',
      previousQueries: [],
      successPatterns: {
        withWebSearch: 0,
        withoutWebSearch: 0,
        satisfactionWithSearch: 0,
        satisfactionWithoutSearch: 0
      },
      domainExpertise: {}
    };
  }

  private detectDomain(query: string): string {
    // Use same logic as detectDomain but return simple string
    const domains = ['academic', 'technical', 'medical', 'legal', 'financial', 'news', 'history'];
    for (const domain of domains) {
      if (query.includes(domain)) {
        return domain;
      }
    }
    return 'general';
  }

  private increaseExpertiseLevel(current: 'beginner' | 'intermediate' | 'advanced' | 'expert'): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const levels: Array<'beginner' | 'intermediate' | 'advanced' | 'expert'> = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(levels.length - 1, currentIndex + 1)];
  }

  private initializeDecisionPatterns(): void {
    logInfo('Decision patterns initialized', {
      componentName: 'WebSearchDecisionEngine'
    });
  }

  private getFallbackDecision(): WebSearchDecision {
    return {
      shouldSearch: false,
      searchType: 'none',
      confidence: 0.5,
      reasoning: ['Fallback decision due to error'],
      searchTerms: [],
      sources: [],
      urgency: 'normal',
      fallback: true
    };
  }
}

// Export singleton instance
export const webSearchDecisionEngine = new WebSearchDecisionEngine();