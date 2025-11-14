// Layer 1: Input Validation & Preprocessing System
// ================================================
// PromptEngineer - Prompt engineering with safety constraint injection,
// context-aware prompt construction, response format specification, and quality guidelines

import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';
import { QueryClassification, ResponseStrategy, ContextRequirementLevel, ResponseStrategyConfig } from './QueryClassifier';
import { ValidationLevel } from './InputValidator';
import type { AppDataContext } from '@/types/ai-service-manager';

export type PromptType = 'factual' | 'study' | 'creative' | 'diagnostic' | 'conversational' | 'analytical';
export type ResponseFormat = 'plain_text' | 'structured' | 'step_by_step' | 'bulleted' | 'numbered' | 'code' | 'math' | 'table';

export interface OptimizedPrompt {
  systemPrompt: string;
  userPrompt: string;
  constraints: PromptConstraint[];
  sources: Source[];
  expectedFormat: ResponseFormat;
  validationRequirements: ValidationRequirement[];
  safetyGuidelines: SafetyGuideline[];
  contextIntegration: ContextIntegration;
  qualityMarkers: QualityMarker[];
}

export interface PromptConstraint {
  type: 'response_length' | 'source_citation' | 'accuracy_check' | 'uncertainty_expression' | 'response_format';
  description: string;
  requirement: string;
  enforcement: 'strict' | 'soft' | 'recommended';
  priority: number;
}

export interface Source {
  id: string;
  type: 'knowledge_base' | 'user_profile' | 'conversation_history' | 'external_api' | 'educational_resource';
  title: string;
  content: string;
  reliability: number;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ValidationRequirement {
  type: 'fact_check' | 'completeness' | 'consistency' | 'relevance' | 'clarity';
  description: string;
  threshold: number;
  method: 'automated' | 'heuristic' | 'manual';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SafetyGuideline {
  category: 'content_safety' | 'bias_prevention' | 'misinformation' | 'hallucination_prevention';
  rule: string;
  description: string;
  enforcement: 'block' | 'flag' | 'warn' | 'guide';
  confidence: number;
}

export interface ContextIntegration {
  userContext: UserContextData;
  conversationContext: ConversationContextData;
  knowledgeContext: KnowledgeContextData;
  externalContext: ExternalContextData;
}

export interface UserContextData {
  profile: UserProfile;
  preferences: UserPreferences;
  history: UserHistory;
  learningStyle: LearningStyle;
}

export interface UserProfile {
  id: string;
  name?: string;
  academicLevel: 'elementary' | 'middle_school' | 'high_school' | 'college' | 'graduate';
  subjects: string[];
  strengths: string[];
  weaknesses: string[];
  studyGoals: string[];
}

export interface UserPreferences {
  responseFormat: ResponseFormat;
  detailLevel: 'concise' | 'detailed' | 'comprehensive';
  explanationStyle: 'simple' | 'technical' | 'visual';
  feedbackPreference: 'immediate' | 'end_of_session' | 'periodic';
}

export interface UserHistory {
  totalInteractions: number;
  recentTopics: string[];
  commonQuestions: string[];
  performanceMetrics: Record<string, number>;
  feedbackScores: number[];
}

export interface LearningStyle {
  visual: number;
  auditory: number;
  kinesthetic: number;
  reading: number;
}

export interface ConversationContextData {
  currentTopic: string;
  previousMessages: PreviousMessage[];
  conversationGoal: string;
  sessionDuration: number;
  topicProgression: TopicProgression[];
}

export interface PreviousMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  classification: string;
  satisfaction?: number;
}

export interface TopicProgression {
  topic: string;
  startTime: Date;
  endTime?: Date;
  messages: number;
  satisfaction?: number;
}

export interface KnowledgeContextData {
  relevantFacts: RelevantFact[];
  concepts: Concept[];
  sources: Source[];
  verified: boolean;
  lastUpdated: Date;
}

export interface RelevantFact {
  id: string;
  fact: string;
  source: string;
  confidence: number;
  category: string;
  verified: boolean;
}

export interface Concept {
  name: string;
  definition: string;
  relatedConcepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ExternalContextData {
  currentTime: Date;
  userLocation?: string;
  systemStatus: string;
  availableFeatures: string[];
}

export interface QualityMarker {
  type: 'accuracy_check' | 'completeness_check' | 'clarity_check' | 'relevance_check';
  description: string;
  checkMethod: string;
  threshold: number;
  importance: 'low' | 'medium' | 'high';
}

export interface PromptConstructionOptions {
  includeUserContext: boolean;
  includeConversationHistory: boolean;
  includeKnowledgeBase: boolean;
  includeExternalSources: boolean;
  maxContextLength: number;
  safetyLevel: 'basic' | 'strict' | 'enhanced';
  qualityAssurance: boolean;
}

export class PromptEngineer {
  private promptTemplates: Map<PromptType, PromptTemplate> = new Map();
  private safetyGuidelines: SafetyGuideline[] = [];
  private qualityMarkers: QualityMarker[] = [];
  private responseFormats: Map<PromptType, ResponseFormat> = new Map();
  private validationRules: Map<PromptType, ValidationRequirement[]> = new Map();
  private contextIntegrators: Map<string, ContextIntegrator> = new Map();
  private cryptoKey: string;

  constructor() {
    this.cryptoKey = process.env.PROMPT_ENGINEERING_KEY || 'default-prompt-key';
    this.initializePromptTemplates();
    this.initializeSafetyGuidelines();
    this.initializeQualityMarkers();
    this.initializeResponseFormats();
    this.initializeValidationRules();
    this.initializeContextIntegrators();
  }

  /**
   * Main prompt construction method
   */
  async constructPrompt(
    query: string,
    classification: QueryClassification,
    contextData?: Partial<AppDataContext>,
    options?: PromptConstructionOptions
  ): Promise<OptimizedPrompt> {
    const startTime = Date.now();
    const promptType = this.mapQueryTypeToPromptType(classification.type);
    const promptId = this.generatePromptId(query, promptType);
    
    // Set default options
    const defaultOptions: PromptConstructionOptions = {
      includeUserContext: true,
      includeConversationHistory: true,
      includeKnowledgeBase: true,
      includeExternalSources: false,
      maxContextLength: 2000,
      safetyLevel: 'strict',
      qualityAssurance: true
    };
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      logInfo('Prompt construction started', {
        componentName: 'PromptEngineer',
        promptId,
        queryType: classification.type,
        promptType,
        complexity: classification.complexity,
        queryLength: query.length
      });

      // Step 1: Build base system prompt
      const systemPrompt = await this.buildSystemPrompt(classification, finalOptions);
      
      // Step 2: Construct user prompt with context
      const userPrompt = await this.constructUserPrompt(query, classification, contextData, finalOptions);
      
      // Step 3: Define prompt constraints
      const constraints = await this.generateConstraints(classification, finalOptions);
      
      // Step 4: Gather relevant sources
      const sources = await this.gatherSources(classification, contextData, finalOptions);
      
      // Step 5: Set response format
      const expectedFormat = this.determineResponseFormat(classification, query);
      
      // Step 6: Define validation requirements
      const validationRequirements = await this.generateValidationRequirements(classification, finalOptions);
      
      // Step 7: Add safety guidelines
      const safetyGuidelines = await this.generateSafetyGuidelines(classification, finalOptions);
      
      // Step 8: Integrate context data
      const contextIntegration = await this.integrateContextData(classification, contextData, finalOptions);
      
      // Step 9: Add quality markers
      const qualityMarkers = await this.generateQualityMarkers(classification, finalOptions);

      const optimizedPrompt: OptimizedPrompt = {
        systemPrompt,
        userPrompt,
        constraints,
        sources,
        expectedFormat,
        validationRequirements,
        safetyGuidelines,
        contextIntegration,
        qualityMarkers
      };

      const processingTime = Date.now() - startTime;

      logInfo('Prompt construction completed', {
        componentName: 'PromptEngineer',
        promptId,
        queryType: classification.type,
        processingTime,
        constraintsCount: constraints.length,
        sourcesCount: sources.length,
        safetyGuidelinesCount: safetyGuidelines.length
      });

      return optimizedPrompt;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'PromptEngineer',
        promptId,
        queryType: classification.type,
        processingTime
      });

      // Return safe default prompt
      return this.createDefaultPrompt(query, classification, promptType);
    }
  }

  /**
   * Inject safety guidelines into prompt
   */
  async injectSafetyGuidelines(
    basePrompt: string,
    classification: QueryClassification,
    safetyLevel: 'basic' | 'strict' | 'enhanced' = 'strict'
  ): Promise<string> {
    const guidelines = this.safetyGuidelines.filter(g => 
      g.enforcement !== 'block' || safetyLevel === 'enhanced'
    );

    if (guidelines.length === 0) {
      return basePrompt;
    }

    const safetySection = this.buildSafetySection(guidelines, safetyLevel);
    
    // Insert safety guidelines before the main instruction
    const insertionPoint = basePrompt.indexOf('\n\n') + 2;
    
    return basePrompt.slice(0, insertionPoint) + 
           safetySection + 
           basePrompt.slice(insertionPoint);
  }

  /**
   * Add source attribution to prompt
   */
  async addSourceAttribution(
    prompt: string,
    sources: Source[],
    classification: QueryClassification
  ): Promise<string> {
    if (sources.length === 0 || !classification.requiresFacts) {
      return prompt;
    }

    const attributionSection = this.buildAttributionSection(sources, classification);
    
    // Add attribution at the end
    return prompt + '\n\n' + attributionSection;
  }

  /**
   * Integrate user context into prompt
   */
  async integrateUserContext(
    prompt: string,
    userContext: UserContextData,
    classification: QueryClassification
  ): Promise<string> {
    if (!classification.requiresContext) {
      return prompt;
    }

    const contextSection = this.buildUserContextSection(userContext, classification);
    
    // Find appropriate insertion point
    const insertionPoint = this.findContextInsertionPoint(prompt);
    
    return prompt.slice(0, insertionPoint) + 
           contextSection + 
           prompt.slice(insertionPoint);
  }

  /**
   * Add knowledge base references
   */
  async addKnowledgeBaseReferences(
    prompt: string,
    knowledgeSources: Source[],
    classification: QueryClassification
  ): Promise<string> {
    if (!classification.requiresFacts || knowledgeSources.length === 0) {
      return prompt;
    }

    const knowledgeSection = this.buildKnowledgeSection(knowledgeSources, classification);
    
    return prompt + '\n\n' + knowledgeSection;
  }

  /**
   * Specify response format
   */
  specifyResponseFormat(
    prompt: string,
    format: ResponseFormat,
    classification: QueryClassification
  ): string {
    const formatInstructions = this.buildFormatInstructions(format, classification);
    
    return prompt + '\n\n' + formatInstructions;
  }

  /**
   * Add confidence requirements
   */
  addConfidenceRequirements(
    prompt: string,
    confidenceLevel: 'low' | 'medium' | 'high' = 'medium'
  ): string {
    const confidenceSection = this.buildConfidenceSection(confidenceLevel);
    
    return prompt + '\n\n' + confidenceSection;
  }

  // Private methods for building prompt components

  private async buildSystemPrompt(
    classification: QueryClassification,
    options: PromptConstructionOptions
  ): Promise<string> {
    const promptType = this.mapQueryTypeToPromptType(classification.type);
    const template = this.promptTemplates.get(promptType);
    if (!template) {
      return this.buildDefaultSystemPrompt(classification);
    }

    let systemPrompt = template.basePrompt;

    // Add role definition
    if (template.roleDefinition) {
      systemPrompt = systemPrompt.replace('{ROLE}', template.roleDefinition);
    }

    // Add expertise areas
    if (template.expertiseAreas.length > 0) {
      const expertiseText = template.expertiseAreas.join(', ');
      systemPrompt = systemPrompt.replace('{EXPERTISE}', expertiseText);
    }

    // Add behavioral guidelines
    if (template.behavioralGuidelines.length > 0) {
      const guidelines = template.behavioralGuidelines.join(' ');
      systemPrompt = systemPrompt + '\n\nGuidelines: ' + guidelines;
    }

    // Add safety guidelines based on safety level
    if (options.safetyLevel !== 'basic') {
      const safetyText = this.getSafetyGuidelinesForLevel(options.safetyLevel);
      systemPrompt = systemPrompt + '\n\nSafety Requirements: ' + safetyText;
    }

    return systemPrompt;
  }

  private async constructUserPrompt(
    query: string,
    classification: QueryClassification,
    contextData?: Partial<AppDataContext>,
    options?: PromptConstructionOptions
  ): Promise<string> {
    let userPrompt = `Question: ${query}`;

    // Add complexity-based context
    if (classification.complexity >= 3) {
      userPrompt += `\n\nNote: This is a complex query (level ${classification.complexity}) that requires detailed analysis.`;
    }

    // Add response strategy guidance
    userPrompt += `\n\nResponse Strategy: Use ${classification.responseStrategy} approach.`;
    userPrompt += `\nExpected Length: Approximately ${classification.estimatedResponseLength} words.`;

    // Add context-specific instructions
    if (classification.requiresContext && options?.includeUserContext && contextData) {
      userPrompt += `\n\nContext: User has context that may be relevant to this query.`;
    }

    if (classification.requiresFacts) {
      userPrompt += `\n\nFact Verification: Please verify all factual claims against reliable sources.`;
    }

    return userPrompt;
  }

  private async generateConstraints(
    classification: QueryClassification,
    options?: PromptConstructionOptions
  ): Promise<PromptConstraint[]> {
    const constraints: PromptConstraint[] = [];

    // Length constraints
    constraints.push({
      type: 'response_length',
      description: 'Response length control',
      requirement: `Keep response between ${Math.floor(classification.estimatedResponseLength * 0.8)} and ${Math.ceil(classification.estimatedResponseLength * 1.2)} words`,
      enforcement: 'soft',
      priority: 1
    });

    // Format constraints based on response strategy
    switch (classification.responseStrategy) {
      case 'step_by_step':
        constraints.push({
          type: 'response_format',
          description: 'Step-by-step format',
          requirement: 'Organize response in clear, numbered steps',
          enforcement: 'strict',
          priority: 2
        });
        break;
      
      case 'structured':
        constraints.push({
          type: 'response_format',
          description: 'Structured format',
          requirement: 'Use clear headings and bullet points',
          enforcement: 'recommended',
          priority: 2
        });
        break;
    }

    // Factual accuracy constraints
    if (classification.requiresFacts) {
      constraints.push({
        type: 'accuracy_check',
        description: 'Factual accuracy',
        requirement: 'Verify all factual claims and cite reliable sources',
        enforcement: 'strict',
        priority: 3
      });

      constraints.push({
        type: 'source_citation',
        description: 'Source citation',
        requirement: 'Include source attributions for factual information',
        enforcement: 'soft',
        priority: 2
      });
    }

    // Uncertainty expression
    if (classification.confidence < 0.8) {
      constraints.push({
        type: 'uncertainty_expression',
        description: 'Express uncertainty',
        requirement: 'Clearly indicate when information may be incomplete or uncertain',
        enforcement: 'recommended',
        priority: 1
      });
    }

    return constraints;
  }

  private async gatherSources(
    classification: QueryClassification,
    contextData?: Partial<AppDataContext>,
    options?: PromptConstructionOptions
  ): Promise<Source[]> {
    const sources: Source[] = [];

    // Knowledge base sources for factual queries
    if (classification.requiresFacts && options?.includeKnowledgeBase) {
      // This would integrate with actual knowledge base
      sources.push({
        id: 'kb-default',
        type: 'knowledge_base',
        title: 'General Knowledge Base',
        content: 'Default knowledge base content for factual queries',
        reliability: 0.8
      });
    }

    // User context sources
    if (classification.requiresContext && options?.includeUserContext && contextData) {
      sources.push({
        id: 'user-profile',
        type: 'user_profile',
        title: 'User Profile Context',
        content: `User academic level: ${contextData.studyProgress?.totalBlocks || 'unknown'}`,
        reliability: 0.9,
        metadata: {
          source: 'user_profile',
          timestamp: new Date()
        }
      });
    }

    // Conversation history sources
    if (options?.includeConversationHistory) {
      sources.push({
        id: 'conversation-history',
        type: 'conversation_history',
        title: 'Conversation Context',
        content: 'Previous messages in current conversation session',
        reliability: 0.7,
        metadata: {
          session_based: true
        }
      });
    }

    return sources;
  }

  private determineResponseFormat(
    classification: QueryClassification,
    query: string
  ): ResponseFormat {
    // Check query patterns for format hints
    if (query.toLowerCase().includes('list') || query.toLowerCase().includes('steps')) {
      return classification.responseStrategy === 'step_by_step' ? 'numbered' : 'bulleted';
    }

    if (query.toLowerCase().includes('table') || query.toLowerCase().includes('compare')) {
      return 'table';
    }

    if (query.toLowerCase().includes('code') || query.toLowerCase().includes('program')) {
      return 'code';
    }

    if (query.toLowerCase().includes('formula') || query.toLowerCase().includes('equation')) {
      return 'math';
    }

    // Default based on query type
    const promptType = this.mapQueryTypeToPromptType(classification.type);
    return this.responseFormats.get(promptType) || 'plain_text';
  }

  private async generateValidationRequirements(
    classification: QueryClassification,
    options?: PromptConstructionOptions
  ): Promise<ValidationRequirement[]> {
    const requirements: ValidationRequirement[] = [];

    // Always require relevance check
    requirements.push({
      type: 'relevance',
      description: 'Ensure response directly addresses the user query',
      threshold: 0.8,
      method: 'automated',
      severity: 'high'
    });

    // Factual queries need fact checking
    if (classification.requiresFacts) {
      requirements.push({
        type: 'fact_check',
        description: 'Verify accuracy of factual claims',
        threshold: 0.9,
        method: 'heuristic',
        severity: 'critical'
      });

      requirements.push({
        type: 'consistency',
        description: 'Ensure internal consistency of facts',
        threshold: 0.85,
        method: 'automated',
        severity: 'high'
      });
    }

    // Complex queries need completeness check
    if (classification.complexity >= 3) {
      requirements.push({
        type: 'completeness',
        description: 'Cover all aspects of complex queries',
        threshold: 0.8,
        method: 'heuristic',
        severity: 'medium'
      });
    }

    // All queries need clarity check
    requirements.push({
      type: 'clarity',
      description: 'Ensure response is clear and understandable',
      threshold: 0.7,
      method: 'automated',
      severity: 'medium'
    });

    return requirements;
  }

  private async generateSafetyGuidelines(
    classification: QueryClassification,
    options?: PromptConstructionOptions
  ): Promise<SafetyGuideline[]> {
    const safetyLevel = options?.safetyLevel || 'strict';
    
    return this.safetyGuidelines.filter(guideline => {
      // Filter based on safety level
      if (safetyLevel === 'basic' && guideline.enforcement === 'block') {
        return false;
      }
      
      // Filter based on query type relevance
      if (classification.type === 'study' && 
          (guideline.category === 'content_safety' || guideline.category === 'misinformation')) {
        return true;
      }
      
      return true; // Include general safety guidelines
    });
  }

  private async integrateContextData(
    classification: QueryClassification,
    contextData?: Partial<AppDataContext>,
    options?: PromptConstructionOptions
  ): Promise<ContextIntegration> {
    const integration: ContextIntegration = {
      userContext: this.buildUserContextData(contextData),
      conversationContext: this.buildConversationContextData(),
      knowledgeContext: this.buildKnowledgeContextData(),
      externalContext: this.buildExternalContextData()
    };

    return integration;
  }

  private async generateQualityMarkers(
    classification: QueryClassification,
    options?: PromptConstructionOptions
  ): Promise<QualityMarker[]> {
    if (options?.qualityAssurance === false) {
      return [];
    }

    return this.qualityMarkers.filter(marker => {
      // Filter based on query type
      if (classification.requiresFacts && marker.type === 'accuracy_check') {
        return true;
      }
      
      if (classification.complexity >= 3 && marker.type === 'completeness_check') {
        return true;
      }
      
      return marker.type === 'clarity_check' || marker.type === 'relevance_check';
    });
  }

  // Helper methods for building specific sections

  private buildSafetySection(guidelines: SafetyGuideline[], safetyLevel: 'basic' | 'strict' | 'enhanced'): string {
    let section = 'SAFETY GUIDELINES:\n\n';
    
    for (const guideline of guidelines) {
      section += `• ${guideline.description}\n`;
      if (guideline.rule) {
        section += `  Rule: ${guideline.rule}\n`;
      }
    }
    
    section += `\nPriority Level: ${safetyLevel.toUpperCase()}`;
    
    return section;
  }

  private buildAttributionSection(sources: Source[], classification: QueryClassification): string {
    let section = 'SOURCES AND REFERENCES:\n\n';
    
    for (const source of sources) {
      section += `• ${source.title} (${source.type})\n`;
      if (source.reliability) {
        section += `  Reliability: ${(source.reliability * 100).toFixed(0)}%\n`;
      }
    }
    
    if (classification.requiresFacts) {
      section += '\nPlease cite sources for all factual information.';
    }
    
    return section;
  }

  private buildUserContextSection(userContext: UserContextData, classification: QueryClassification): string {
    let section = 'USER CONTEXT:\n\n';
    
    if (userContext.profile.academicLevel) {
      section += `Academic Level: ${userContext.profile.academicLevel}\n`;
    }
    
    if (userContext.profile.subjects.length > 0) {
      section += `Subjects of Interest: ${userContext.profile.subjects.join(', ')}\n`;
    }
    
    if (userContext.preferences.responseFormat) {
      section += `Preferred Format: ${userContext.preferences.responseFormat}\n`;
    }
    
    return section;
  }

  private buildKnowledgeSection(sources: Source[], classification: QueryClassification): string {
    if (sources.length === 0) return '';
    
    let section = 'RELEVANT KNOWLEDGE:\n\n';
    
    for (const source of sources) {
      if (source.type === 'knowledge_base') {
        section += `• ${source.title}\n`;
        section += `  ${source.content.slice(0, 200)}...\n\n`;
      }
    }
    
    return section;
  }

  private buildFormatInstructions(format: ResponseFormat, classification: QueryClassification): string {
    const instructions: Record<ResponseFormat, string> = {
      plain_text: 'Provide a clear, well-structured paragraph response.',
      structured: 'Use headings, bullet points, and clear organization.',
      step_by_step: 'Break down the response into clear, numbered steps.',
      bulleted: 'Use bullet points to organize the information.',
      numbered: 'Use numbered lists to present information in order.',
      code: 'Format code blocks properly with syntax highlighting.',
      math: 'Use proper mathematical notation and formatting.',
      table: 'Present information in a clear, structured table format.'
    };
    
    return `FORMAT REQUIREMENTS:\n${instructions[format] || instructions.plain_text}`;
  }

  private buildConfidenceSection(confidenceLevel: 'low' | 'medium' | 'high'): string {
    const sections: Record<'low' | 'medium' | 'high', string> = {
      low: 'UNCERTAINTY GUIDELINES:\n• Clearly indicate when information may be incomplete\n• Suggest alternative sources for verification\n• Acknowledge limitations in knowledge',
      medium: 'CONFIDENCE GUIDELINES:\n• Express appropriate levels of certainty\n• Provide confidence indicators for different claims\n• Suggest follow-up questions if needed',
      high: 'CONFIDENCE ASSESSMENT:\n• Provide confident, authoritative responses\n• Include supporting evidence for claims\n• Maintain high standards of accuracy'
    };
    
    return sections[confidenceLevel];
  }

  private findContextInsertionPoint(prompt: string): number {
    // Find the end of the system message or first user instruction
    const systemEnd = prompt.indexOf('\n\n');
    if (systemEnd !== -1) {
      return systemEnd + 2;
    }
    
    // Fallback to beginning
    return 0;
  }

  private buildDefaultSystemPrompt(classification: QueryClassification): string {
    return `You are a helpful AI assistant specializing in ${classification.type} queries. Provide accurate, helpful, and well-structured responses based on your expertise.`;
  }

  private createDefaultPrompt(query: string, classification: QueryClassification, promptType: PromptType): OptimizedPrompt {
    return {
      systemPrompt: this.buildDefaultSystemPrompt(classification),
      userPrompt: `Question: ${query}`,
      constraints: [],
      sources: [],
      expectedFormat: 'plain_text',
      validationRequirements: [],
      safetyGuidelines: this.safetyGuidelines.filter(g => g.enforcement !== 'block'),
      contextIntegration: {
        userContext: this.buildUserContextData(),
        conversationContext: this.buildConversationContextData(),
        knowledgeContext: this.buildKnowledgeContextData(),
        externalContext: this.buildExternalContextData()
      },
      qualityMarkers: []
    };
  }

  // Context data builders
  private buildUserContextData(contextData?: Partial<AppDataContext>): UserContextData {
    return {
      profile: {
        id: 'default',
        academicLevel: 'high_school',
        subjects: [],
        strengths: [],
        weaknesses: [],
        studyGoals: []
      },
      preferences: {
        responseFormat: 'plain_text',
        detailLevel: 'detailed',
        explanationStyle: 'simple',
        feedbackPreference: 'immediate'
      },
      history: {
        totalInteractions: 0,
        recentTopics: [],
        commonQuestions: [],
        performanceMetrics: {},
        feedbackScores: []
      },
      learningStyle: {
        visual: 0.5,
        auditory: 0.5,
        kinesthetic: 0.5,
        reading: 0.5
      }
    };
  }

  private buildConversationContextData(): ConversationContextData {
    return {
      currentTopic: '',
      previousMessages: [],
      conversationGoal: '',
      sessionDuration: 0,
      topicProgression: []
    };
  }

  private buildKnowledgeContextData(): KnowledgeContextData {
    return {
      relevantFacts: [],
      concepts: [],
      sources: [],
      verified: true,
      lastUpdated: new Date()
    };
  }

  private buildExternalContextData(): ExternalContextData {
    return {
      currentTime: new Date(),
      systemStatus: 'operational',
      availableFeatures: ['chat', 'study_assistant', 'general_inquiry']
    };
  }

  private getSafetyGuidelinesForLevel(level: 'basic' | 'strict' | 'enhanced'): string {
    const guidelines: Record<'basic' | 'strict' | 'enhanced', string> = {
      basic: 'Maintain general safety and appropriateness standards.',
      strict: 'Apply strict safety measures, verify information accuracy, and prevent harmful content.',
      enhanced: 'Implement comprehensive safety protocols with maximum validation and verification.'
    };
    
    return guidelines[level];
  }

  // Utility methods
  private mapQueryTypeToPromptType(queryType: import('./QueryClassifier').QueryType): PromptType {
    const mapping: Record<import('./QueryClassifier').QueryType, PromptType> = {
      'factual': 'factual',
      'study': 'study',
      'creative': 'creative',
      'general': 'conversational',
      'diagnostic': 'diagnostic',
      'conversational': 'conversational',
      'analytical': 'analytical'
    };
    
    return mapping[queryType] || 'conversational';
  }

  private generatePromptId(query: string, promptType: PromptType): string {
    const hash = require('crypto').createHash('md5').update(query + promptType).digest('hex');
    return `prompt_${hash.substring(0, 8)}`;
  }

  // Initialization methods
  private initializePromptTemplates(): void {
    this.promptTemplates.set('factual', {
      basePrompt: 'You are a knowledgeable assistant providing accurate factual information. Your role is {ROLE} with expertise in {EXPERTISE}.',
      roleDefinition: 'factual information expert',
      expertiseAreas: ['general knowledge', 'verified facts', 'academic subjects'],
      behavioralGuidelines: [
        'Always verify information accuracy',
        'Cite reliable sources',
        'Express uncertainty when appropriate',
        'Provide clear, concise explanations'
      ]
    });

    this.promptTemplates.set('study', {
      basePrompt: 'You are an educational tutor helping students learn. Your role is {ROLE} with expertise in {EXPERTISE}.',
      roleDefinition: 'educational tutor and study assistant',
      expertiseAreas: ['pedagogy', 'subject matter expertise', 'learning methodologies'],
      behavioralGuidelines: [
        'Adapt explanations to student level',
        'Encourage learning and understanding',
        'Provide step-by-step guidance',
        'Offer practice opportunities'
      ]
    });
  }

  private initializeSafetyGuidelines(): void {
    this.safetyGuidelines = [
      {
        category: 'content_safety',
        rule: 'Do not provide harmful, illegal, or inappropriate content',
        description: 'Ensure all content is safe and appropriate',
        enforcement: 'block',
        confidence: 1.0
      },
      {
        category: 'misinformation',
        rule: 'Verify all factual claims against reliable sources',
        description: 'Prevent the spread of false or misleading information',
        enforcement: 'flag',
        confidence: 0.9
      },
      {
        category: 'hallucination_prevention',
        rule: 'Clearly indicate when information may be uncertain or unknown',
        description: 'Prevent AI from fabricating information',
        enforcement: 'guide',
        confidence: 0.8
      },
      {
        category: 'bias_prevention',
        rule: 'Present information objectively without personal bias',
        description: 'Maintain objectivity and fairness in responses',
        enforcement: 'warn',
        confidence: 0.7
      }
    ];
  }

  private initializeQualityMarkers(): void {
    this.qualityMarkers = [
      {
        type: 'accuracy_check',
        description: 'Verify factual accuracy of information provided',
        checkMethod: 'Cross-reference with knowledge base',
        threshold: 0.9,
        importance: 'high'
      },
      {
        type: 'completeness_check',
        description: 'Ensure all aspects of the query are addressed',
        checkMethod: 'Query-component matching',
        threshold: 0.8,
        importance: 'medium'
      },
      {
        type: 'clarity_check',
        description: 'Assess clarity and readability of response',
        checkMethod: 'Readability and coherence analysis',
        threshold: 0.7,
        importance: 'medium'
      },
      {
        type: 'relevance_check',
        description: 'Ensure response directly addresses the user query',
        checkMethod: 'Semantic similarity analysis',
        threshold: 0.8,
        importance: 'high'
      }
    ];
  }

  private initializeResponseFormats(): void {
    this.responseFormats.set('factual', 'structured');
    this.responseFormats.set('study', 'step_by_step');
    this.responseFormats.set('creative', 'plain_text');
    this.responseFormats.set('diagnostic', 'structured');
    this.responseFormats.set('conversational', 'plain_text');
    this.responseFormats.set('analytical', 'structured');
  }

  private initializeValidationRules(): void {
    // Initialize validation rules for different prompt types
  }

  private initializeContextIntegrators(): void {
    // Initialize context integrators for different data types
  }
}

// Supporting interfaces
interface PromptTemplate {
  basePrompt: string;
  roleDefinition: string;
  expertiseAreas: string[];
  behavioralGuidelines: string[];
}

interface ContextIntegrator {
  type: string;
  process: (data: any) => Promise<any>;
}

// Export singleton instance
export const promptEngineer = new PromptEngineer();