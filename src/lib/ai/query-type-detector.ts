// Query Type Detection System for AI Service Manager
// ==================================================

import type { QueryType, QueryDetectionResult } from '@/types/ai-service-manager';

interface KeywordPattern {
  keywords: string[];
  weight: number;
  language: 'en' | 'hi' | 'both';
}

const TIME_SENSITIVE_PATTERNS: KeywordPattern[] = [
  {
    keywords: ['exam date', 'form', 'registration', 'admit card', 'result', 'latest', 'announcement'],
    weight: 3,
    language: 'en'
  },
  {
    keywords: ['aaya kya', 'kab', 'kya', 'hogyi', 'mili', 'aayi'],
    weight: 3,
    language: 'hi'
  },
  {
    keywords: ['when', 'what time', 'schedule', 'deadline', 'due', 'urgent', 'asap', 'immediately'],
    weight: 2,
    language: 'en'
  },
  {
    keywords: ['kya time', 'kab tak', 'kitna time', 'jaldi'],
    weight: 2,
    language: 'hi'
  }
];

const APP_DATA_PATTERNS: KeywordPattern[] = [
  {
    keywords: ['mera', 'my', 'performance', 'progress', 'weak', 'strong', 'score', 'analysis'],
    weight: 3,
    language: 'en'
  },
  {
    keywords: ['kaise chal raha', 'progress', 'marks', 'percentage', 'performance'],
    weight: 3,
    language: 'hi'
  },
  {
    keywords: ['statistics', 'analytics', 'charts', 'graphs', 'trends'],
    weight: 2,
    language: 'en'
  },
  {
    keywords: ['mera data', 'study history', 'past performance', 'performance history'],
    weight: 3,
    language: 'both'
  },
  {
    keywords: ['compare', 'vs', 'versus', 'better', 'improvement'],
    weight: 2,
    language: 'en'
  }
];

const GENERAL_PATTERNS: KeywordPattern[] = [
  {
    keywords: ['help', 'explain', 'how', 'what', 'why', 'when', 'where', 'which'],
    weight: 1,
    language: 'en'
  },
  {
    keywords: ['samjha', 'kyu', 'kaise', 'kya', 'kahan', 'kaun', 'kitna'],
    weight: 1,
    language: 'hi'
  },
  {
    keywords: ['study', 'learn', 'concept', 'theory', 'practice'],
    weight: 1,
    language: 'en'
  },
  {
    keywords: ['padhna', 'seekhna', 'samajhna', 'sikhana'],
    weight: 1,
    language: 'hi'
  }
];

/**
 * Query Type Detection Service
 * Intelligently classifies user queries into time-sensitive, app-data, or general
 */
export class QueryTypeDetector {
  private readonly timePatterns: KeywordPattern[];
  private readonly appDataPatterns: KeywordPattern[];
  private readonly generalPatterns: KeywordPattern[];

  constructor() {
    this.timePatterns = TIME_SENSITIVE_PATTERNS;
    this.appDataPatterns = APP_DATA_PATTERNS;
    this.generalPatterns = GENERAL_PATTERNS;
  }

  /**
   * Detect the type of query based on keywords and context
   */
  detectQueryType(message: string, chatType?: string): QueryDetectionResult {
    const normalizedMessage = this.normalizeText(message);
    const detectedKeywords: string[] = [];
    const reasons: string[] = [];

    // Score each category
    const timeScore = this.calculatePatternScore(normalizedMessage, this.timePatterns, detectedKeywords, reasons);
    const appDataScore = this.calculatePatternScore(normalizedMessage, this.appDataPatterns, detectedKeywords, reasons);
    const generalScore = this.calculatePatternScore(normalizedMessage, this.generalPatterns, detectedKeywords, reasons);

    // Add context-based scoring
    const contextScore = this.calculateContextScore(message, chatType);

    // Apply context adjustments
    const adjustedTimeScore = timeScore + (contextScore.timeAdjustment || 0);
    const adjustedAppDataScore = appDataScore + (contextScore.appDataAdjustment || 0);
    const adjustedGeneralScore = generalScore + (contextScore.generalAdjustment || 0);

    // Determine the most likely type
    let detectedType: QueryType;
    let confidence: number;
    let winningScore: number;

    if (adjustedTimeScore >= adjustedAppDataScore && adjustedTimeScore >= adjustedGeneralScore) {
      detectedType = 'time_sensitive';
      winningScore = adjustedTimeScore;
    } else if (adjustedAppDataScore >= adjustedTimeScore && adjustedAppDataScore >= adjustedGeneralScore) {
      detectedType = 'app_data';
      winningScore = adjustedAppDataScore;
    } else {
      detectedType = 'general';
      winningScore = adjustedGeneralScore;
    }

    // Calculate confidence based on score difference
    const totalScore = adjustedTimeScore + adjustedAppDataScore + adjustedGeneralScore;
    if (totalScore === 0) {
      confidence = 0.5; // Neutral confidence for generic queries
      detectedType = 'general';
    } else {
      confidence = Math.min(winningScore / totalScore, 1.0);
    }

    // Ensure minimum confidence for general queries
    if (detectedType === 'general' && confidence < 0.3) {
      confidence = 0.6; // Boost confidence for general queries when other scores are low
    }

    return {
      type: detectedType,
      confidence,
      keywords: [...new Set(detectedKeywords)],
      reasons
    };
  }

  /**
   * Normalize text for consistent keyword matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation except spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .normalize('NFKD'); // Remove diacritics
  }

  /**
   * Calculate pattern matching score
   */
  private calculatePatternScore(
    normalizedMessage: string,
    patterns: KeywordPattern[],
    detectedKeywords: string[],
    reasons: string[]
  ): number {
    let score = 0;
    const matchedPatterns: string[] = [];

    for (const pattern of patterns) {
      let patternScore = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of pattern.keywords) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        
        // Exact match
        if (normalizedMessage.includes(normalizedKeyword)) {
          patternScore += pattern.weight;
          matchedKeywords.push(keyword);
          detectedKeywords.push(keyword);
        }
        // Partial word match (for compound words)
        else {
          const keywordWords = normalizedKeyword.split(' ');
          const messageWords = normalizedMessage.split(' ');
          const matchedWords = keywordWords.filter(kw => 
            messageWords.some(mw => mw.includes(kw) || kw.includes(mw))
          );
          
          if (matchedWords.length === keywordWords.length) {
            patternScore += pattern.weight * 0.7; // Partial match penalty
            matchedKeywords.push(keyword);
            detectedKeywords.push(keyword);
          }
        }
      }

      if (patternScore > 0) {
        score += patternScore;
        matchedPatterns.push(`${pattern.keywords.join(', ')} (${pattern.language})`);
      }
    }

    // Add reasons for matched patterns
    if (matchedPatterns.length > 0) {
      reasons.push(`Matched patterns: ${matchedPatterns.join('; ')}`);
    }

    return score;
  }

  /**
   * Calculate context-based score adjustments
   */
  private calculateContextScore(message: string, chatType?: string): {
    timeAdjustment: number;
    appDataAdjustment: number;
    generalAdjustment: number;
  } {
    let timeAdjustment = 0;
    let appDataAdjustment = 0;
    let generalAdjustment = 0;

    // Chat type influence
    if (chatType === 'study_assistant') {
      appDataAdjustment += 0.5; // Study assistant queries more likely to need app data
    } else if (chatType === 'general') {
      generalAdjustment += 0.3; // General chat more likely to be general queries
    }

    // Message length and structure
    if (message.length > 100) {
      // Long messages more likely to be app data queries (detailed analysis)
      appDataAdjustment += 0.3;
    }

    if (message.includes('?') || message.includes('?')) {
      // Questions more likely to be time-sensitive or general
      timeAdjustment += 0.2;
      generalAdjustment += 0.3;
    }

    // Urgency indicators
    const urgencyWords = ['urgent', 'emergency', 'quick', 'fast', 'asap', 'jaldi'];
    if (urgencyWords.some(word => message.toLowerCase().includes(word))) {
      timeAdjustment += 0.5;
    }

    return {
      timeAdjustment,
      appDataAdjustment,
      generalAdjustment
    };
  }

  /**
   * Get preferred providers for a query type
   */
  getPreferredProviders(queryType: QueryType): Array<{ provider: string; tier: number }> {
    switch (queryType) {
      case 'time_sensitive':
        return [
          { provider: 'gemini', tier: 1 },
          { provider: 'groq', tier: 2 },
          { provider: 'cerebras', tier: 3 },
          { provider: 'mistral', tier: 4 },
          { provider: 'openrouter', tier: 5 },
          { provider: 'cohere', tier: 6 }
        ];
      
      case 'app_data':
        return [
          { provider: 'groq', tier: 1 },
          { provider: 'cerebras', tier: 2 },
          { provider: 'mistral', tier: 3 },
          { provider: 'gemini', tier: 4 },
          { provider: 'openrouter', tier: 5 },
          { provider: 'cohere', tier: 6 }
        ];
      
      case 'general':
        return [
          { provider: 'groq', tier: 1 },
          { provider: 'openrouter', tier: 2 },
          { provider: 'cerebras', tier: 3 },
          { provider: 'mistral', tier: 4 },
          { provider: 'gemini', tier: 5 },
          { provider: 'cohere', tier: 6 }
        ];
    }
  }

  /**
   * Check if web search should be enabled for a query
   */
  shouldEnableWebSearch(queryType: QueryType, confidence: number): boolean {
    // Always enable for time-sensitive queries
    if (queryType === 'time_sensitive') {
      return true;
    }
    
    // Enable for high-confidence app data queries (may need external data)
    if (queryType === 'app_data' && confidence > 0.7) {
      return true;
    }
    
    // Disable for general queries (unless high confidence suggests it might need current info)
    return false;
  }

  /**
   * Get suggested model for a query type
   */
  getSuggestedModel(queryType: QueryType): string {
    switch (queryType) {
      case 'time_sensitive':
        return 'gemini-2.0-flash-lite';
      
      case 'app_data':
        return 'llama-3.3-70b';
      
      case 'general':
        return 'gpt-3.5-turbo';
    }
  }
}

// Export singleton instance
export const queryTypeDetector = new QueryTypeDetector();