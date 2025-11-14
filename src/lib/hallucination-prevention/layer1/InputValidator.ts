// Layer 1: Input Validation & Preprocessing System
// ================================================
// InputValidator - Main input validation class with content sanitization, 
// personal information detection, prompt injection detection, and risk assessment

import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';

export type ValidationLevel = 'basic' | 'strict' | 'enhanced';

export interface FilterResult {
  isClean: boolean;
  filteredText: string;
  reasons: string[];
  confidence: number;
  actions: FilterAction[];
}

export interface FilterAction {
  type: 'removed' | 'masked' | 'flagged' | 'blocked';
  category: string;
  originalContent: string;
  replacement?: string;
  startIndex: number;
  endIndex: number;
}

export interface SafetyResult {
  isSafe: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categories: SafetyCategory[];
  action: 'allow' | 'flag' | 'block';
  confidence: number;
}

export interface SafetyCategory {
  category: 'inappropriate' | 'personal_info' | 'prompt_injection' | 'harmful' | 'spam';
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  detectedItems: string[];
}

export interface InjectionRisk {
  detected: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  patterns: InjectionPattern[];
  confidence: number;
}

export interface InjectionPattern {
  type: 'direct_instruction' | 'role_play' | 'ignore_previous' | 'system_override' | 'context_manipulation';
  pattern: string;
  matches: RegExpMatchArray[];
  severity: 'low' | 'medium' | 'high';
}

export interface ValidationResult {
  isValid: boolean;
  inputHash: string;
  filteredInput: string;
  filterResult: FilterResult;
  safetyResult: SafetyResult;
  injectionRisk: InjectionRisk;
  processingTime: number;
  validationLevel: ValidationLevel;
  metadata: ValidationMetadata;
}

export interface ValidationMetadata {
  userId?: string;
  sessionId?: string;
  validationLevel: ValidationLevel;
  timestamp: string;
  sourceIp?: string;
  userAgent?: string;
}

export interface PersonalInfoPattern {
  pattern: RegExp;
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'ip';
  severity: 'low' | 'medium' | 'high';
}

export interface InappropriateContent {
  category: 'adult' | 'violence' | 'harassment' | 'hate_speech' | 'self_harm' | 'illegal';
  keywords: string[];
  severity: 'low' | 'medium' | 'high';
  patterns: RegExp[];
}

export class InputValidator {
  private validationRules: Map<ValidationLevel, ValidationConfig> = new Map();
  private inappropriateContent: InappropriateContent[] = [];
  private personalInfoPatterns: PersonalInfoPattern[] = [];
  private injectionPatterns: InjectionPatternDefinition[] = [];
  private cryptoKey: string;

  constructor() {
    this.cryptoKey = process.env.VALIDATION_ENCRYPTION_KEY || 'default-key';
    this.initializeValidationRules();
    this.initializeContentFilters();
    this.initializePersonalInfoPatterns();
    this.initializeInjectionPatterns();
  }

  /**
   * Main validation method - validates and sanitizes input
   */
  async validateInput(
    input: string,
    metadata: ValidationMetadata,
    validationLevel: ValidationLevel = 'basic'
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const inputHash = this.generateInputHash(input);
    
    try {
      logInfo('Input validation started', {
        componentName: 'InputValidator',
        inputLength: input.length,
        validationLevel,
        userId: metadata.userId
      });

      // Step 1: Content sanitization and filtering
      const filterResult = await this.filterContent(input, validationLevel);
      
      // Step 2: Safety checks
      const safetyResult = await this.checkContentSafety(filterResult.filteredText, validationLevel);
      
      // Step 3: Prompt injection detection
      const injectionRisk = await this.detectPromptInjection(filterResult.filteredText, validationLevel);
      
      // Step 4: Personal information detection
      const personalInfoRemoved = await this.removePersonalInfo(filterResult.filteredText);
      
      // Step 5: Final validation assessment
      const isValid = this.assessValidationResult(filterResult, safetyResult, injectionRisk, validationLevel);
      
      const processingTime = Date.now() - startTime;
      
      const result: ValidationResult = {
        isValid,
        inputHash,
        filteredInput: personalInfoRemoved.filteredText,
        filterResult: {
          ...filterResult,
          filteredText: personalInfoRemoved.filteredText
        },
        safetyResult,
        injectionRisk,
        processingTime,
        validationLevel,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      };

      // Log validation results
      if (!isValid) {
        logWarning('Input validation failed', {
          componentName: 'InputValidator',
          inputHash,
          validationLevel,
          reasons: filterResult.reasons.concat(safetyResult.categories.map(c => c.category)),
          userId: metadata.userId
        });
      } else {
        logInfo('Input validation successful', {
          componentName: 'InputValidator',
          inputHash,
          validationLevel,
          processingTime,
          userId: metadata.userId
        });
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'InputValidator',
        inputHash,
        validationLevel,
        processingTime
      });

      // Return safe default on error
      return {
        isValid: false,
        inputHash,
        filteredInput: '',
        filterResult: {
          isClean: false,
          filteredText: '',
          reasons: ['Validation error occurred'],
          confidence: 0,
          actions: []
        },
        safetyResult: {
          isSafe: false,
          riskLevel: 'high',
          categories: [],
          action: 'block',
          confidence: 1.0
        },
        injectionRisk: {
          detected: true,
          riskLevel: 'high',
          patterns: [],
          confidence: 1.0
        },
        processingTime,
        validationLevel,
        metadata
      };
    }
  }

  /**
   * Filter inappropriate content based on validation level
   */
  private async filterContent(input: string, level: ValidationLevel): Promise<FilterResult> {
    const config = this.validationRules.get(level);
    if (!config) {
      throw new Error(`Invalid validation level: ${level}`);
    }

    let filteredText = input;
    const actions: FilterAction[] = [];
    const reasons: string[] = [];
    let confidence = 1.0;

    // Apply content filters based on level
    for (const filter of config.contentFilters) {
      const result = await this.applyContentFilter(filteredText, filter);
      if (result.actions.length > 0) {
        actions.push(...result.actions);
        reasons.push(...result.reasons);
        filteredText = result.filteredText;
        confidence *= result.confidence;
      }
    }

    // Apply inappropriate content filtering
    for (const content of this.inappropriateContent) {
      if (this.shouldApplyFilter(content, level)) {
        const result = await this.filterInappropriateContent(filteredText, content, level);
        if (result.actions.length > 0) {
          actions.push(...result.actions);
          reasons.push(`Inappropriate content detected: ${content.category}`);
          filteredText = result.filteredText;
          confidence *= result.confidence;
        }
      }
    }

    return {
      isClean: actions.length === 0 || (level === 'basic' && actions.every(a => a.type !== 'blocked')),
      filteredText,
      reasons,
      confidence,
      actions
    };
  }

  /**
   * Check content safety across multiple categories
   */
  private async checkContentSafety(input: string, level: ValidationLevel): Promise<SafetyResult> {
    const categories: SafetyCategory[] = [];
    const config = this.validationRules.get(level);
    
    if (!config) {
      throw new Error(`Invalid validation level: ${level}`);
    }

    for (const category of config.safetyCategories) {
      const result = await this.checkSafetyCategory(input, category, level);
      if (result.detected) {
        categories.push(result.category);
      }
    }

    // Calculate overall risk level
    const maxRisk = categories.reduce((max, cat) => {
      return this.getRiskPriority(cat.risk) > this.getRiskPriority(max) ? cat.risk : max;
    }, 'low' as 'low' | 'medium' | 'high');

    // Calculate action based on risk level and validation
    let action: 'allow' | 'flag' | 'block' = 'allow';
    if (categories.length > 0) {
      if (maxRisk === 'high' || (maxRisk === 'medium' && level === 'strict')) {
        action = 'block';
      } else if (maxRisk === 'medium' || level === 'enhanced') {
        action = 'flag';
      }
    }

    const confidence = this.calculateSafetyConfidence(categories);

    return {
      isSafe: action === 'allow',
      riskLevel: maxRisk,
      categories,
      action,
      confidence
    };
  }

  /**
   * Detect prompt injection attempts
   */
  private async detectPromptInjection(input: string, level: ValidationLevel): Promise<InjectionRisk> {
    const patterns: InjectionPattern[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = 1.0;

    for (const patternDef of this.injectionPatterns) {
      if (this.shouldCheckInjection(patternDef, level)) {
        const matches = Array.from(input.matchAll(patternDef.regex));
        if (matches.length > 0) {
          const severity = this.calculateInjectionSeverity(matches, patternDef);
          if (this.getRiskPriority(severity) > this.getRiskPriority(maxSeverity)) {
            maxSeverity = severity;
          }
          
          patterns.push({
            type: patternDef.type,
            pattern: patternDef.pattern,
            matches,
            severity
          });
          
          confidence *= Math.pow(0.9, matches.length);
        }
      }
    }

    const detected = patterns.length > 0;
    const riskLevel = this.calculateInjectionRiskLevel(patterns, maxSeverity);

    return {
      detected,
      riskLevel,
      patterns,
      confidence
    };
  }

  /**
   * Remove or mask personal information
   */
  private async removePersonalInfo(input: string): Promise<{ filteredText: string; actions: FilterAction[] }> {
    let filteredText = input;
    const actions: FilterAction[] = [];

    for (const pattern of this.personalInfoPatterns) {
      const matches = Array.from(input.matchAll(pattern.pattern));
      
      for (const match of matches) {
        const startIndex = match.index || 0;
        const endIndex = startIndex + (match[0]?.length || 0);
        let replacement = '';
        
        // Mask based on type and severity
        switch (pattern.type) {
          case 'email':
            replacement = match[0]?.replace(/[^@]+@[^@]+/, '[EMAIL_MASKED]') || '';
            break;
          case 'phone':
            replacement = match[0]?.replace(/\d(?=\d{4})/g, '*') || '';
            break;
          case 'credit_card':
            replacement = match[0]?.replace(/\d(?=\d{4})/g, '*') || '';
            break;
          default:
            replacement = '[REDACTED]';
        }

        actions.push({
          type: 'masked',
          category: 'personal_info',
          originalContent: match[0] || '',
          replacement,
          startIndex,
          endIndex
        });

        filteredText = filteredText.replace(match[0] || '', replacement);
      }
    }

    return { filteredText, actions };
  }

  /**
   * Apply specific content filter
   */
  private async applyContentFilter(input: string, filter: ContentFilter): Promise<FilterResult> {
    const matches = Array.from(input.matchAll(filter.pattern));
    let filteredText = input;
    const actions: FilterAction[] = [];
    const reasons: string[] = [];
    
    for (const match of matches) {
      const startIndex = match.index || 0;
      const endIndex = startIndex + (match[0]?.length || 0);
      let replacement = match[0] || '';
      
      switch (filter.action) {
        case 'remove':
          replacement = '';
          break;
        case 'mask':
          replacement = filter.replacement || '[FILTERED]';
          break;
        case 'flag':
          replacement = `${filter.prefix || '[FLAGGED] '}${match[0] || ''}${filter.suffix || ''}`;
          break;
      }
      
      actions.push({
        type: filter.action === 'remove' ? 'removed' : filter.action === 'mask' ? 'masked' : 'flagged',
        category: filter.category,
        originalContent: match[0] || '',
        replacement,
        startIndex,
        endIndex
      });
      
      filteredText = filteredText.replace(match[0] || '', replacement);
      reasons.push(`${filter.category} content detected: ${match[0]?.slice(0, 50)}...`);
    }

    return {
      isClean: actions.length === 0,
      filteredText,
      reasons,
      confidence: Math.pow(0.95, actions.length),
      actions
    };
  }

  /**
   * Filter inappropriate content
   */
  private async filterInappropriateContent(input: string, content: InappropriateContent, level: ValidationLevel): Promise<FilterResult> {
    let filteredText = input;
    const actions: FilterAction[] = [];
    const reasons: string[] = [];
    
    // Check keywords
    for (const keyword of content.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = Array.from(input.matchAll(regex));
      
      for (const match of matches) {
        const startIndex = match.index || 0;
        actions.push({
          type: content.severity === 'high' ? 'blocked' : 'flagged',
          category: 'inappropriate',
          originalContent: match[0] || '',
          replacement: '[CONTENT_FILTERED]',
          startIndex,
          endIndex: startIndex + (match[0]?.length || 0)
        });
        reasons.push(`Inappropriate keyword detected: ${keyword}`);
      }
    }
    
    // Check patterns
    for (const pattern of content.patterns) {
      const matches = Array.from(input.matchAll(pattern));
      
      for (const match of matches) {
        const startIndex = match.index || 0;
        actions.push({
          type: content.severity === 'high' ? 'blocked' : 'flagged',
          category: 'inappropriate',
          originalContent: match[0] || '',
          replacement: '[CONTENT_FILTERED]',
          startIndex,
          endIndex: startIndex + (match[0]?.length || 0)
        });
        reasons.push(`Inappropriate pattern detected`);
      }
    }

    // Apply replacements
    for (const action of actions) {
      if (action.replacement) {
        filteredText = filteredText.replace(action.originalContent, action.replacement);
      }
    }

    return {
      isClean: actions.length === 0 || content.severity === 'low',
      filteredText,
      reasons,
      confidence: Math.pow(0.9, actions.length),
      actions
    };
  }

  /**
   * Check specific safety category
   */
  private async checkSafetyCategory(input: string, category: SafetyCategoryConfig, level: ValidationLevel): Promise<{ detected: boolean; category: SafetyCategory }> {
    const detectedItems: string[] = [];
    let risk: 'low' | 'medium' | 'high' = category.risk;
    let confidence = 0.0;

    // Implement category-specific checks
    switch (category.category) {
      case 'inappropriate':
        // Check against inappropriate content definitions
        for (const content of this.inappropriateContent) {
          if (content.category === 'adult' || content.category === 'violence') {
            for (const keyword of content.keywords) {
              if (input.toLowerCase().includes(keyword.toLowerCase())) {
                detectedItems.push(keyword);
                if (this.getRiskPriority(content.severity) > this.getRiskPriority(risk)) {
                  risk = content.severity;
                }
              }
            }
          }
        }
        break;
        
      case 'personal_info':
        // Check for personal information patterns
        for (const pattern of this.personalInfoPatterns) {
          const matches = input.match(pattern.pattern);
          if (matches) {
            detectedItems.push(...matches);
            if (pattern.severity === 'high') {
              risk = 'high';
            } else if (pattern.severity === 'medium' && risk === 'low') {
              risk = 'medium';
            }
          }
        }
        break;
        
      case 'harmful':
        // Check for harmful content indicators
        const harmfulKeywords = ['bomb', 'weapon', 'violence', 'harm', 'attack'];
        for (const keyword of harmfulKeywords) {
          if (input.toLowerCase().includes(keyword.toLowerCase())) {
            detectedItems.push(keyword);
            risk = 'high';
          }
        }
        break;

      case 'spam':
        // Check for spam indicators
        const spamKeywords = ['buy now', 'limited time', 'click here', 'free money'];
        for (const keyword of spamKeywords) {
          if (input.toLowerCase().includes(keyword.toLowerCase())) {
            detectedItems.push(keyword);
            risk = 'medium';
          }
        }
        break;
    }

    confidence = detectedItems.length > 0 ? Math.min(0.9, 0.5 + (detectedItems.length * 0.1)) : 0.0;
    const detected = detectedItems.length > 0;

    return {
      detected,
      category: {
        category: category.category,
        risk,
        confidence,
        detectedItems
      }
    };
  }

  /**
   * Assess overall validation result
   */
  private assessValidationResult(
    filterResult: FilterResult,
    safetyResult: SafetyResult,
    injectionRisk: InjectionRisk,
    level: ValidationLevel
  ): boolean {
    // Block if safety check failed
    if (safetyResult.action === 'block') {
      return false;
    }
    
    // Block if high-risk injection detected
    if (injectionRisk.riskLevel === 'critical' || injectionRisk.riskLevel === 'high') {
      return false;
    }
    
    // Apply level-specific rules
    switch (level) {
      case 'basic':
        return safetyResult.action === 'allow' &&
               (injectionRisk.riskLevel === 'low' || injectionRisk.riskLevel === 'medium');
        
      case 'strict':
        return safetyResult.action === 'allow' &&
               injectionRisk.riskLevel === 'low' &&
               filterResult.confidence >= 0.8;
        
      case 'enhanced':
        return safetyResult.action === 'allow' &&
               injectionRisk.riskLevel === 'low' &&
               filterResult.confidence >= 0.9 &&
               safetyResult.confidence >= 0.8;
               
      default:
        return false;
    }
  }

  // Utility methods
  private generateInputHash(input: string): string {
    return createHash('sha256').update(input + this.cryptoKey).digest('hex');
  }

  private getRiskPriority(risk: 'low' | 'medium' | 'high' | 'critical'): number {
    const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
    return priorities[risk] || 0;
  }

  private calculateSafetyConfidence(categories: SafetyCategory[]): number {
    if (categories.length === 0) return 1.0;
    
    const avgConfidence = categories.reduce((sum, cat) => sum + cat.confidence, 0) / categories.length;
    return Math.max(0.1, avgConfidence);
  }

  private calculateInjectionSeverity(matches: RegExpMatchArray[], pattern: InjectionPatternDefinition): 'low' | 'medium' | 'high' {
    const matchCount = matches.length;
    if (matchCount >= 3) return 'high';
    if (matchCount >= 2) return 'medium';
    return 'low';
  }

  private calculateInjectionRiskLevel(patterns: InjectionPattern[], maxSeverity: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    if (patterns.length === 0) return 'low';
    if (maxSeverity === 'critical') return 'critical';
    if (patterns.length >= 3 || maxSeverity === 'high') return 'high';
    if (patterns.length >= 2 || maxSeverity === 'medium') return 'medium';
    return 'low';
  }

  private shouldApplyFilter(content: InappropriateContent, level: ValidationLevel): boolean {
    const levelPriority = { basic: 1, strict: 2, enhanced: 3 };
    const contentPriority = { low: 1, medium: 2, high: 3 };
    
    return levelPriority[level] >= contentPriority[content.severity];
  }

  private shouldCheckInjection(pattern: InjectionPatternDefinition, level: ValidationLevel): boolean {
    return level !== 'basic' || pattern.severity === 'high';
  }

  // Initialization methods
  private initializeValidationRules(): void {
    this.validationRules.set('basic', {
      contentFilters: [
        {
          pattern: /\b(test|debug|admin|root)\b/gi,
          action: 'flag' as const,
          category: 'system_access',
          replacement: '[SECURITY_FILTERED]'
        }
      ],
      safetyCategories: [
        { category: 'harmful' as const, risk: 'high' as const },
        { category: 'inappropriate' as const, risk: 'high' as const }
      ]
    });

    this.validationRules.set('strict', {
      contentFilters: [
        {
          pattern: /\b(test|debug|admin|root|sql|javascript|eval|exec)\b/gi,
          action: 'remove' as const,
          category: 'system_access'
        },
        {
          pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          action: 'remove' as const,
          category: 'script_injection'
        }
      ],
      safetyCategories: [
        { category: 'harmful' as const, risk: 'medium' as const },
        { category: 'inappropriate' as const, risk: 'medium' as const },
        { category: 'personal_info' as const, risk: 'low' as const }
      ]
    });

    this.validationRules.set('enhanced', {
      contentFilters: [
        {
          pattern: /\b(test|debug|admin|root|sql|javascript|eval|exec|function|class|import|require)\b/gi,
          action: 'remove' as const,
          category: 'system_access'
        },
        {
          pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          action: 'remove' as const,
          category: 'script_injection'
        },
        {
          pattern: /javascript:/gi,
          action: 'remove' as const,
          category: 'protocol_injection'
        }
      ],
      safetyCategories: [
        { category: 'harmful' as const, risk: 'low' as const },
        { category: 'inappropriate' as const, risk: 'low' as const },
        { category: 'personal_info' as const, risk: 'low' as const },
        { category: 'spam' as const, risk: 'medium' as const }
      ]
    });
  }

  private initializeContentFilters(): void {
    this.inappropriateContent = [
      {
        category: 'adult',
        keywords: ['adult content', 'nsfw', 'explicit'],
        severity: 'high',
        patterns: []
      },
      {
        category: 'violence',
        keywords: ['kill', 'murder', 'violence', 'attack'],
        severity: 'high',
        patterns: []
      },
      {
        category: 'harassment',
        keywords: ['hate', 'harass', 'bully'],
        severity: 'medium',
        patterns: []
      }
    ];
  }

  private initializePersonalInfoPatterns(): void {
    this.personalInfoPatterns = [
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'email',
        severity: 'medium'
      },
      {
        pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        type: 'phone',
        severity: 'medium'
      },
      {
        pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        type: 'credit_card',
        severity: 'high'
      },
      {
        pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        type: 'ip',
        severity: 'low'
      }
    ];
  }

  private initializeInjectionPatterns(): void {
    this.injectionPatterns = [
      {
        type: 'ignore_previous',
        pattern: 'ignore.*previous.*instruction',
        regex: /ignore\s+all\s+previous\s+instructions/gi,
        severity: 'high'
      },
      {
        type: 'system_override',
        pattern: 'you.*are.*now.*in.*mode',
        regex: /you\s+are\s+now\s+in\s+.*\s+mode/gi,
        severity: 'high'
      },
      {
        type: 'role_play',
        pattern: 'pretend.*you.*are.*not.*an.*ai',
        regex: /pretend\s+you\s+are\s+not\s+(an\s+)?ai/gi,
        severity: 'medium'
      },
      {
        type: 'direct_instruction',
        pattern: 'immediately.*do.*without.*asking',
        regex: /immediately\s+do\s+.*without\s+asking/gi,
        severity: 'medium'
      }
    ];
  }
}

// Supporting interfaces
interface ValidationConfig {
  contentFilters: ContentFilter[];
  safetyCategories: SafetyCategoryConfig[];
}

interface ContentFilter {
  pattern: RegExp;
  action: 'remove' | 'mask' | 'flag';
  category: string;
  replacement?: string;
  prefix?: string;
  suffix?: string;
}

interface SafetyCategoryConfig {
  category: 'inappropriate' | 'personal_info' | 'prompt_injection' | 'harmful' | 'spam';
  risk: 'low' | 'medium' | 'high';
}

interface InjectionPatternDefinition {
  type: 'direct_instruction' | 'role_play' | 'ignore_previous' | 'system_override' | 'context_manipulation';
  pattern: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high';
}

// Export singleton instance
export const inputValidator = new InputValidator();