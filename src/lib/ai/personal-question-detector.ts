// Personal vs General Question Detection for Study Buddy
// ======================================================

interface PersonalQuestionPattern {
  keywords: string[];
  weight: number;
  language: 'en' | 'hi' | 'both';
}

const PERSONAL_QUESTION_PATTERNS: PersonalQuestionPattern[] = [
  {
    keywords: ['mera', 'my', 'performance', 'progress', 'weak', 'strong', 'score', 'analysis'],
    weight: 3,
    language: 'en'
  },
  {
    keywords: ['kaise chal raha', 'progress', 'marks', 'percentage', 'performance', 'improve', 'improve kaise'],
    weight: 3,
    language: 'hi'
  },
  {
    keywords: ['revision', 'suggest', 'strategy', 'schedule', 'help me', 'mein', 'mujhe'],
    weight: 3,
    language: 'both'
  },
  {
    keywords: ['weak areas', 'strong areas', 'study pattern', 'learning style', 'difficulties'],
    weight: 2,
    language: 'en'
  },
  {
    keywords: ['gmail', 'kahiye', ' bataiye', 'advice', 'guidance', 'recommend'],
    weight: 2,
    language: 'hi'
  },
  {
    keywords: ['topic', 'subject', 'chapters', 'concepts'],
    weight: 1,
    language: 'both'
  },
  {
    keywords: ['mains', 'neet', 'jee', 'exam', 'test', 'practice'],
    weight: 1,
    language: 'both'
  }
];

const GENERAL_QUESTION_PATTERNS: PersonalQuestionPattern[] = [
  {
    keywords: ['what is', 'explain', 'define', 'meaning', 'concept', 'theory'],
    weight: 3,
    language: 'en'
  },
  {
    keywords: ['kya hai', 'explain', 'kya', 'define'],
    weight: 3,
    language: 'hi'
  },
  {
    keywords: ['solve', 'calculate', 'find', 'determine', 'compute'],
    weight: 3,
    language: 'en'
  },
  {
    keywords: ['solve karna', 'calculate', 'nikalna'],
    weight: 3,
    language: 'hi'
  },
  {
    keywords: ['formula', 'equation', 'derivation', 'proof'],
    weight: 2,
    language: 'en'
  },
  {
    keywords: ['proof', 'derive', 'formula'],
    weight: 2,
    language: 'hi'
  },
  {
    keywords: ['how to', 'method', 'approach', 'way'],
    weight: 2,
    language: 'en'
  },
  {
    keywords: ['kaise', 'kyu', 'kitne'],
    weight: 1,
    language: 'hi'
  }
];

export interface PersonalQuestionDetectionResult {
  isPersonal: boolean;
  confidence: number;
  detectedKeywords: string[];
  reasons: string[];
}

/**
 * Personal vs General Question Detection Service
 * Specifically designed for Study Buddy to distinguish personal queries from general academic questions
 */
export class PersonalQuestionDetector {
  private readonly personalPatterns: PersonalQuestionPattern[];
  private readonly generalPatterns: PersonalQuestionPattern[];

  constructor() {
    this.personalPatterns = PERSONAL_QUESTION_PATTERNS;
    this.generalPatterns = GENERAL_QUESTION_PATTERNS;
  }

  /**
   * Detect if a question is personal (about the student's data/progress) or general (academic concepts)
   */
  detectPersonalQuestion(message: string): PersonalQuestionDetectionResult {
    const normalizedMessage = this.normalizeText(message);
    const detectedKeywords: string[] = [];
    const reasons: string[] = [];

    // Score each category
    const personalScore = this.calculatePatternScore(
      normalizedMessage, 
      this.personalPatterns, 
      detectedKeywords, 
      reasons
    );
    
    const generalScore = this.calculatePatternScore(
      normalizedMessage, 
      this.generalPatterns, 
      detectedKeywords, 
      reasons
    );

    // Add context-based scoring adjustments
    const contextAdjustments = this.calculateContextAdjustments(message);
    const adjustedPersonalScore = personalScore + contextAdjustments.personalBoost;
    const adjustedGeneralScore = generalScore + contextAdjustments.generalBoost;

    // Determine classification
    let isPersonal: boolean;
    let confidence: number;
    let winningScore: number;

    if (adjustedPersonalScore >= adjustedGeneralScore) {
      isPersonal = true;
      winningScore = adjustedPersonalScore;
    } else {
      isPersonal = false;
      winningScore = adjustedGeneralScore;
    }

    // Calculate confidence based on score difference
    const totalScore = adjustedPersonalScore + adjustedGeneralScore;
    if (totalScore === 0) {
      confidence = 0.5; // Neutral for completely generic queries
      isPersonal = false; // Default to general for ambiguous cases
    } else {
      confidence = winningScore / totalScore;
    }

    // Add classification reasons
    if (isPersonal && reasons.length > 0) {
      reasons.unshift('Detected as personal question - contains student-specific keywords');
    } else if (!isPersonal && reasons.length > 0) {
      reasons.unshift('Detected as general academic question - contains conceptual keywords');
    }

    return {
      isPersonal,
      confidence: Math.min(confidence, 0.95), // Cap at 95% to allow for edge cases
      detectedKeywords: [...new Set(detectedKeywords)],
      reasons
    };
  }

  /**
   * Batch detect multiple questions for efficiency
   */
  batchDetectPersonalQuestions(messages: string[]): PersonalQuestionDetectionResult[] {
    return messages.map(message => this.detectPersonalQuestion(message));
  }

  /**
   * Get examples of personal vs general questions for testing/training
   */
  getQuestionExamples() {
    return {
      personal: [
        "Mera Physics kaisa chal raha hai?",
        "My weak areas in Chemistry?",
        "How to improve my Mathematics score?",
        "Kaise improve karun thermodynamics?",
        "What's my progress in this chapter?",
        "Mere strong subjects kya hain?",
        "Help me with revision strategy",
        "My study schedule kaise banau?",
        "Performance analysis de do",
        "Weak areas improve kaise kare?"
      ],
      general: [
        "What is entropy?",
        "How to solve quadratic equations?",
        "Explain Newton's laws",
        "Derivative ka formula kya hai?",
        "What is photosynthesis?",
        "Integration kaise karte hain?",
        "Electromagnetic induction explain karo",
        "Organic chemistry ke basic concepts",
        "Kinematics formulas",
        "Chemical bonding kya hoti hai?"
      ]
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
    patterns: PersonalQuestionPattern[],
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
        matchedPatterns.push(`${pattern.keywords.slice(0, 2).join(', ')}${pattern.keywords.length > 2 ? '...' : ''} (${pattern.language})`);
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
  private calculateContextAdjustments(message: string): {
    personalBoost: number;
    generalBoost: number;
  } {
    let personalBoost = 0;
    let generalBoost = 0;

    // Message structure indicators
    if (message.includes('?')) {
      generalBoost += 0.2; // Questions often start with conceptual inquiries
    }

    // Personal possessive indicators
    const personalIndicators = ['mera', 'my', 'mujhe', 'maine', 'mein', 'apna'];
    const hasPersonalIndicator = personalIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );
    
    if (hasPersonalIndicator) {
      personalBoost += 0.8; // Strong indicator of personal question
    }

    // Performance/Progress indicators
    const performanceIndicators = ['improve', 'progress', 'score', 'marks', 'performance', 'better'];
    const hasPerformanceIndicator = performanceIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );
    
    if (hasPerformanceIndicator) {
      personalBoost += 0.5;
    }

    // Conceptual/Definition indicators
    const conceptualIndicators = ['what is', 'explain', 'define', 'concept', 'theory', 'kya hai'];
    const hasConceptualIndicator = conceptualIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );
    
    if (hasConceptualIndicator) {
      generalBoost += 0.6;
    }

    // Mathematical/Scientific indicators
    const scientificIndicators = ['formula', 'equation', 'calculate', 'solve', 'proof', 'derive'];
    const hasScientificIndicator = scientificIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );
    
    if (hasScientificIndicator) {
      generalBoost += 0.4;
    }

    // Length-based adjustments
    if (message.length > 100) {
      personalBoost += 0.3; // Longer messages often contain detailed personal queries
    }

    return {
      personalBoost,
      generalBoost
    };
  }

  /**
   * Get confidence level description
   */
  getConfidenceDescription(confidence: number): string {
    if (confidence >= 0.8) return 'Very High';
    if (confidence >= 0.65) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  }

  /**
   * Validate detection results with human-readable explanations
   */
  explainDetection(result: PersonalQuestionDetectionResult): string {
    const type = result.isPersonal ? 'Personal' : 'General';
    const confidence = this.getConfidenceDescription(result.confidence);
    const keywords = result.detectedKeywords.join(', ') || 'None detected';
    
    let explanation = `This is classified as a ${type} question with ${confidence} confidence (${Math.round(result.confidence * 100)}%).\n`;
    explanation += `Detected keywords: ${keywords}\n`;
    
    if (result.reasons.length > 0) {
      explanation += `Reasons: ${result.reasons.join('; ')}`;
    }
    
    return explanation;
  }
}

// Export singleton instance
export const personalQuestionDetector = new PersonalQuestionDetector();

// Convenience function for easy importing
export const detectPersonalQuestion = (message: string): PersonalQuestionDetectionResult => {
  return personalQuestionDetector.detectPersonalQuestion(message);
};

// Export utility function for UI components
export const isPersonalQuestion = (message: string): boolean => {
  const result = detectPersonalQuestion(message);
  return result.isPersonal && result.confidence >= 0.6; // Threshold for UI decisions
};