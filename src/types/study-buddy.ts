// Study Buddy API Types
// ====================

export interface StudyBuddyApiRequest {
  userId: string;
  conversationId: string;
  message: string;
  chatType: 'study_assistant' | 'general';
}

export interface StudyBuddyApiResponse {
  success: boolean;
  data?: {
    response?: {
      content: string;
      model_used?: string;
      provider_used?: string;
      tokens_used?: {
        input: number;
        output: number;
      };
      latency_ms?: number;
      query_type?: string;
      web_search_enabled?: boolean;
      fallback_used?: boolean;
      cached?: boolean;
      isTimeSensitive?: boolean;
      language?: string;
      context_included?: boolean;
      memory_references?: any[];
    };
    conversationId?: string;
    timestamp?: string;
    metadata?: {
      isPersonalQuery?: boolean;
      contextLevel?: number;
      memoriesSearched?: number;
      insightsExtracted?: number;
      cohereUsage?: {
        embeddingsGenerated: number;
        monthlyUsage: number;
        monthlyLimit: number;
      };
    };
    layer5Data?: any;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface StudyEffectivenessMetrics {
  sessionId: string;
  responseTime: number[];
  accuracyScore: number;
  engagementScore: number;
  learningVelocity: number;
  errorRate: number;
  satisfactionScore: number;
  totalMessages: number;
}

export interface StudySessionContext {
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  sessionType: 'study_assistant' | 'general';
  userProfile: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    preferences: {
      responseStyle: 'brief' | 'detailed' | 'interactive';
    };
  };
  environment: {
    deviceType: 'web' | 'mobile' | 'desktop';
    browserType: string;
    networkQuality: 'good' | 'fair' | 'poor';
    timeZone: string;
  };
}

export interface StudySessionMonitoringData {
  session: {
    active: boolean;
    duration: number;
    totalInteractions: number;
    lastActivity: Date;
  };
  performanceOptimization: {
    applied: string[];
    metrics: any;
  };
  complianceStatus: {
    level: 'non_compliant' | 'basic' | 'standard' | 'enhanced' | 'comprehensive';
    score: number;
    lastAssessment: Date;
  };
  healthStatus: string;
  recommendations: string[];
}

export interface StudyOptimizationRequest {
  userId: string;
  sessionId: string;
  operation: 'optimize_request' | 'analyze_performance';
  requestData?: StudyBuddyApiRequest;
  currentMetrics: any;
  optimizationOptions: {
    enableCaching: boolean;
    enableLoadBalancing: boolean;
    enableParameterTuning: boolean;
    enableProviderOptimization: boolean;
    enableContextOptimization: boolean;
    maxOptimizationTime: number;
    performanceTarget: 'speed' | 'quality' | 'cost' | 'reliability' | 'balanced';
  };
}

export interface StudyComplianceRequest {
  userId: string;
  sessionId: string;
  operation: 'validate_privacy' | 'check_ferpa' | 'check_coppa';
  complianceLevel: 'basic' | 'standard' | 'enhanced' | 'comprehensive';
  requirements: Array<{
    framework: 'FERPA' | 'COPPA' | 'GDPR' | 'CCPA';
    requirement: string;
    mandatory: boolean;
    validation: {
      dataClassification: string;
      encryptionRequired: boolean;
      consentRequired: boolean;
      purposeLimitation: string[];
    };
    enforcement: 'warn' | 'block' | 'log';
  }>;
  context: {
    userType: 'student' | 'instructor' | 'admin';
    dataTypes: Array<{
      type: string;
      sensitivity: 'low' | 'medium' | 'high';
      piiLevel: number;
      requiresConsent: boolean;
      requiresEncryption: boolean;
      retentionPeriod: number;
    }>;
    processingPurpose: string[];
    legalBasis: string;
    geographicRegion: string;
    educationalContext: {
      institutionType: string;
      studentAge: string;
      dataSharing: string;
      parentalConsent: string;
      internationalTransfer: boolean;
      dataResidency: string;
      retentionPolicy: string;
      accessControl: string;
    };
  };
}

export interface StudyComplianceResult {
  success: boolean;
  compliance: {
    overall: {
      level: 'non_compliant' | 'basic' | 'standard' | 'enhanced' | 'comprehensive';
      score: number;
      lastAssessment: Date;
      nextReview: Date;
      criticalIssues: number;
      warnings: number;
      recommendations: number;
    };
    frameworks: Record<string, any>;
    risks: any[];
    violations: any[];
    recommendations: string[];
    nextAudit: Date;
  };
  data: {
    maskedData: Record<string, any>;
    encryptedFields: string[];
    consentRecords: any[];
    auditTrail: any[];
  };
}

export interface StudyBuddyRequest {
  userId: string;
  sessionId: string;
  message: string;
  context?: {
    subject?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    learningGoals?: string[];
    studyContext?: any;
    userProfile?: any;
  };
}

export interface StudyBuddyResponse {
  content: string;
  model_used?: string;
  provider_used?: string;
  tokens_used?: {
    input: number;
    output: number;
  };
  latency_ms?: number;
  query_type?: string;
  web_search_enabled?: boolean;
  fallback_used?: boolean;
  cached?: boolean;
  isTimeSensitive?: boolean;
  language?: string;
  context_included?: boolean;
  memory_references?: any[];
}

// Base interfaces for Study Buddy hook
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  streaming?: boolean;
  memory_references?: any[];
}

export interface ChatPreferences {
  provider: string;
  model: string;
  streamResponses: boolean;
  temperature: number;
  maxTokens: number;
  // Endpoint-specific providers (for admin panel)
  endpointProviders?: {
    chat?: string;
    embeddings?: string;
    memoryStorage?: string;
    orchestrator?: string;
    personalized?: string;
    semanticSearch?: string;
    webSearch?: string;
    summary?: string;
  };
  endpointModels?: {
    chat?: string;
    embeddings?: string;
    memoryStorage?: string;
    orchestrator?: string;
    personalized?: string;
    semanticSearch?: string;
    webSearch?: string;
    summary?: string;
  };
  learningGoals?: string[];
  difficulty?: string;
}

export interface StudyContext {
  subject: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  topics: string[];
  timeSpent: number;
  lastActivity: Date;
}

export interface StudentProfileData {
  profileText: string;
  strongSubjects: string[];
  weakSubjects: string[];
  studyProgress: {
    totalTopics: number;
    completedTopics: number;
    accuracy: number;
  };
  currentData: {
    streak: number;
    level: number;
    points: number;
    revisionQueue: number;
  };
  lastUpdated: string;
}

export interface MemoryReference {
  id: string;
  content: string;
  relevance_score: number;
  memory_type: string;
  created_at: string;
}

export interface StudyBuddyState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string;
  userId: string;
  conversationId: string;
  preferences: ChatPreferences;
  studyContext: StudyContext;
  isSettingsOpen: boolean;
  isContextOpen: boolean;
  profileData: StudentProfileData | null;
  teachingMode: TeachingModeState;
}

export interface TeachingModeState {
  isEnabled: boolean;
  mode: 'general' | 'personalized';
  lastActivated: Date | null;
  activationCount: number;
  preferences: {
    explanationDepth: 'basic' | 'detailed' | 'comprehensive';
    exampleDensity: 'low' | 'medium' | 'high';
    interactiveMode: boolean;
    focusAreas: string[];
  };
}

export interface StudyBuddyActions {
  handleSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  startNewChat: () => void;
  clearChat: () => void;
  savePreferences: (preferences: Partial<ChatPreferences>) => void;
  saveStudyContext: (context: StudyContext) => void;
  toggleSettings: () => void;
  toggleContext: () => void;
  exportChat: () => void;
  fetchProfileData: () => Promise<void>;
  // Teaching mode actions
  toggleTeachingMode: () => void;
  setTeachingMode: (enabled: boolean) => void;
  setTeachingModeType: (mode: 'general' | 'personalized') => void;
  updateTeachingPreferences: (preferences: Partial<TeachingModeState['preferences']>) => void;
}