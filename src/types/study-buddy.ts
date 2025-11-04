// Study Buddy Type Definitions
// =============================

// Message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  streaming?: boolean;
  memory_references?: Array<{
    content: string;
    similarity: number;
    created_at: string;
  }>;
}

// Study context types
export interface StudyContext {
  subject: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  topics: string[];
  timeSpent: number;
  lastActivity: Date;
}

// Chat preferences types
export interface ChatPreferences {
  provider: string;
  model?: string;
  streamResponses: boolean;
  temperature: number;
  maxTokens: number;
  studyContext?: StudyContext;
}

// Student profile types
export interface StudentProfileData {
  profileText: string;
  strongSubjects: string[];
  weakSubjects: string[];
  examTarget?: string;
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
  memoryStats?: {
    totalMemories: number;
    memoriesSince: string;
  };
}

// Memory reference types
export interface MemoryReference {
  content: string;
  similarity: number;
  created_at: string;
  relevanceScore?: number;
}

// Study buddy API response types
export interface StudyBuddyApiResponse {
  success: boolean;
  data: {
    response: {
      content: string;
      model_used: string;
      provider_used: string;
      tokens_used: {
        input: number;
        output: number;
      };
      latency_ms: number;
      query_type: string;
      web_search_enabled: boolean;
      fallback_used: boolean;
      cached: boolean;
      isTimeSensitive: boolean;
      language: 'hinglish';
      context_included: boolean;
      memory_references?: MemoryReference[];
    };
    conversationId: string;
    timestamp: string;
    metadata: {
      isPersonalQuery: boolean;
      contextLevel: 1 | 2 | 3 | 4;
      memoriesSearched: number;
      insightsExtracted: number;
      cohereUsage: {
        embeddingsGenerated: number;
        monthlyUsage: number;
        monthlyLimit: number;
      };
    };
  };
  error?: string;
}

// Study buddy API request types
export interface StudyBuddyApiRequest {
  userId: string;
  conversationId: string;
  message: string;
  chatType: 'study_assistant';
  isPersonalQuery?: boolean;
}

// Context levels
export type ContextLevel = 1 | 2 | 3 | 4;

// Personal question detection types
export interface PersonalQuestionDetection {
  isPersonal: boolean;
  confidence: number;
  keywords: string[];
  reasoning: string;
}

// Student context types for memory system
export interface StudentContext {
  userId: string;
  profileText: string;
  strongSubjects: string[];
  weakSubjects: string[];
  examTarget?: string;
  studyProgress: {
    totalTopics: number;
    completedTopics: number;
    accuracy: number;
  };
  recentActivities: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
  revisionQueue: Array<{
    topic: string;
    difficulty: number;
    lastAttempted: Date;
  }>;
  performanceHistory: Array<{
    subject: string;
    score: number;
    date: Date;
  }>;
}

// Memory system types
export interface MemoryInsight {
  id: string;
  userId: string;
  content: string;
  type: 'study_pattern' | 'performance' | 'weakness' | 'strength' | 'strategy';
  confidence: number;
  created_at: string;
  embedding?: number[];
  conversation_context?: string;
}

export interface SemanticSearchResult {
  memories: Array<{
    id: string;
    content: string;
    similarity: number;
    created_at: string;
    type: string;
  }>;
  searchTime: number;
  totalFound: number;
}

// Component props types
export interface StudyBuddyChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  isLoading: boolean;
  preferences: ChatPreferences;
  onUpdatePreferences: (preferences: Partial<ChatPreferences>) => void;
  studyContext: StudyContext;
  isAtBottom?: boolean;
  showScrollButton?: boolean;
}

export interface ProfileCardProps {
  userId: string;
  className?: string;
  showMemoryStats?: boolean;
}

export interface MemoryReferencesProps {
  memoryReferences: MemoryReference[];
  className?: string;
}

export interface StudyBuddyPageProps {
  // Future props for configuration
}

// Study buddy state management types
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
}

export interface StudyBuddyActions {
  initializeSession: () => Promise<void>;
  handleSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  startNewChat: () => void;
  clearChat: () => void;
  savePreferences: (preferences: Partial<ChatPreferences>) => void;
  saveStudyContext: (context: StudyContext) => void;
  toggleSettings: () => void;
  toggleContext: () => void;
  exportChat: () => void;
  fetchProfileData: () => Promise<void>;
}