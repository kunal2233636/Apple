// Study Buddy State Management Hook with Layer 2 Integration
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import type {
  StudyBuddyState,
  StudyBuddyActions,
  ChatMessage,
  ChatPreferences,
  StudyContext,
  StudentProfileData,
  MemoryReference,
  StudyBuddyApiResponse,
  StudyBuddyApiRequest,
  TeachingModeState
} from '@/types/study-buddy';

// Layer 2 Imports
import { buildEnhancedContext, EnhancedContext, ContextBuildRequest, ContextLevel } from '@/lib/hallucination-prevention/layer2/EnhancedContextBuilder';
import { searchKnowledge, KnowledgeSearchResult, SearchFilters } from '@/lib/hallucination-prevention/layer2/KnowledgeBase';
import { optimizeContext, OptimizationRequest, OptimizationStrategy, OptimizationResult } from '@/lib/hallucination-prevention/layer2/ContextOptimizer';
import { searchMemories, MemorySearchRequest, MemorySearchResult, storeMemory } from '@/lib/hallucination-prevention/layer2/ConversationMemory';

const DEFAULT_PREFERENCES: ChatPreferences = {
  provider: 'groq',
  model: 'llama-3.1-8b-instant', // Fast and reliable model
  streamResponses: true,
  temperature: 0.7,
  maxTokens: 2048,
  webSearchMode: 'auto',
};

const DEFAULT_STUDY_CONTEXT: StudyContext = {
  subject: '',
  difficultyLevel: 'intermediate',
  learningGoals: [],
  topics: [],
  timeSpent: 0,
  lastActivity: new Date(),
};

const DEFAULT_PROFILE_DATA: StudentProfileData = {
  profileText: 'Welcome to your study journey! Start by exploring subjects and topics.',
  strongSubjects: [],
  weakSubjects: [],
  studyProgress: {
    totalTopics: 0,
    completedTopics: 0,
    accuracy: 0
  },
  currentData: {
    streak: 0,
    level: 1,
    points: 0,
    revisionQueue: 0
  },
  lastUpdated: new Date().toISOString()
};

const DEFAULT_TEACHING_MODE: TeachingModeState = {
  isEnabled: false,
  mode: 'general',
  lastActivated: null,
  activationCount: 0,
  preferences: {
    explanationDepth: 'detailed',
    exampleDensity: 'medium',
    interactiveMode: false,
    focusAreas: []
  }
};

// Enhanced interfaces for Layer 2 integration
export interface EnhancedStudyBuddyState extends StudyBuddyState {
  enhancedContext: EnhancedContext | null;
  layer2Context: {
    knowledgeBase: KnowledgeSearchResult[];
    relevantMemories: MemorySearchResult[];
    contextOptimization: OptimizationResult | null;
    compressionLevel: ContextLevel;
    tokenUsage: number;
  };
}

export interface EnhancedStudyBuddyActions extends StudyBuddyActions {
  // Session management
  initializeSession: () => Promise<void>;
  loadChatSession: (sessionId: string) => void;
  
  // Enhanced context building methods
  buildEnhancedStudyContext: (level?: ContextLevel) => Promise<EnhancedContext>;
  getRelevantStudyMemories: (query?: string, limit?: number) => Promise<MemorySearchResult[]>;
  optimizeStudyContext: (tokenLimit?: number, strategy?: OptimizationStrategy) => Promise<OptimizationResult>;
  getStudyKnowledgeBase: (query: string, filters?: SearchFilters) => Promise<KnowledgeSearchResult[]>;
  
  // Layer 2 utilities
  getContextOptimization: () => OptimizationResult | null;
  updateCompressionLevel: (level: ContextLevel) => void;
  getTokenUsage: () => number;
  
  // Memory management
  storeStudyInteraction: (query: string, response: string, metadata?: any) => Promise<void>;
  getLearningProgress: () => Promise<any>;
}

export function useStudyBuddy(): EnhancedStudyBuddyState & EnhancedStudyBuddyActions {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  const [preferences, setPreferences] = useState<ChatPreferences>(DEFAULT_PREFERENCES);
  const [studyContext, setStudyContext] = useState<StudyContext>(DEFAULT_STUDY_CONTEXT);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  
  // Teaching mode state
  const [teachingMode, setTeachingModeState] = useState<TeachingModeState>(DEFAULT_TEACHING_MODE);

  // Layer 2 enhanced state
  const [enhancedContext, setEnhancedContext] = useState<EnhancedContext | null>(null);
  const [layer2Context, setLayer2Context] = useState({
    knowledgeBase: [] as KnowledgeSearchResult[],
    relevantMemories: [] as MemorySearchResult[],
    contextOptimization: null as OptimizationResult | null,
    compressionLevel: 'selective' as ContextLevel,
    tokenUsage: 0
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Personal question detection keywords (now enhanced with Layer 1)
  const personalQuestionKeywords = [
    'mera', 'my', 'performance', 'progress', 'weak', 'strong', 'score', 'analysis',
    'revision', 'kaise chal raha', 'improvement', 'help me', 'suggest', 'strategy', 'schedule'
  ];

  // Initialize session and load data
  useEffect(() => {
    initializeSession();
  }, [searchParams, router]);

  const initializeSession = async () => {
    try {
      // Get current user
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        // Fetch profile data (non-blocking)
        fetchProfileData();
        // Build initial enhanced context (non-blocking)
        if (user.id) {
          buildInitialEnhancedContext();
        }
      }

      // Load session ID from URL or create new one
      const urlSessionId = searchParams.get('session');
      let activeSessionId: string;
      if (urlSessionId) {
        setSessionId(urlSessionId);
        activeSessionId = urlSessionId;
      } else {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        router.replace(`/study-buddy?session=${newSessionId}`);
        activeSessionId = newSessionId;
      }

      // Load preferences and chat history for the active session
      loadPreferences();
      loadChatHistory(activeSessionId);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load preferences from localStorage
  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('study-buddy-preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        
        // Validate and clean up model name
        if (!prefs.model || prefs.model.trim() === '' || prefs.model.endsWith('-') || prefs.model.length < 3) {
          console.warn('Corrupted model detected in localStorage:', prefs.model, '- fixing...');
          prefs.model = getDefaultModelForProvider(prefs.provider || 'groq');
          // Save the fixed preferences back to localStorage
          localStorage.setItem('study-buddy-preferences', JSON.stringify(prefs));
        }
        
        // Ensure endpoint providers and models are properly loaded
        setPreferences(prev => ({ ...prev, ...prefs }));
      }

      const savedContext = localStorage.getItem('study-buddy-study-context');
      if (savedContext) {
        const context = JSON.parse(savedContext);
        setStudyContext(prev => ({ ...prev, ...context }));
      }
      
      // Load teaching mode from localStorage
      const savedTeachingMode = localStorage.getItem('study-buddy-teaching-mode');
      if (savedTeachingMode) {
        try {
          const teachingModeData = JSON.parse(savedTeachingMode);
          setTeachingModeState(prev => ({ ...prev, ...teachingModeData }));
        } catch (error) {
          console.error('Error parsing teaching mode from localStorage:', error);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Load chat history from localStorage
  const loadChatHistory = (targetSessionId?: string) => {
    try {
      const effectiveSessionId = targetSessionId ?? sessionId;
      if (!effectiveSessionId) return;
      const sessionKey = `study-buddy-history-${effectiveSessionId}`;
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const history = JSON.parse(saved);
        setMessages(history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } else {
        // No history for this session; clear messages state
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Switch to a different saved Study Buddy session by ID
  const loadChatSession = useCallback((targetSessionId: string) => {
    try {
      setSessionId(targetSessionId);
      loadChatHistory(targetSessionId);
      router.replace(`/study-buddy?session=${targetSessionId}`);
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  }, [router]);

  // Provider to default model mapping
  const getDefaultModelForProvider = (provider: string): string => {
    const modelMapping: Record<string, string> = {
      'groq': 'llama-3.1-8b-instant',
      'openrouter': 'minimax/minimax-m2:free',
      'gemini': 'gemini-2.5-flash',
      'cerebras': 'llama3.1-8b',
      'mistral': 'mistral-7b-instruct',
      'cohere': 'command'
    };
    return modelMapping[provider] || 'llama-3.1-8b-instant';
  };

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: Partial<ChatPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    
    // Only auto-select model if BOTH:
    // 1. Provider is changing
    // 2. User didn't explicitly pass a model in this same call
    // This allows: savePreferences({ model }) to work, and savePreferences({ provider, model }) to work
    // But still auto-selects when just: savePreferences({ provider })
    const isProviderChanging = newPreferences.provider && newPreferences.provider !== preferences.provider;
    const isModelExplicitlySet = 'model' in newPreferences && newPreferences.model !== undefined;
    
    if (isProviderChanging && !isModelExplicitlySet) {
      updated.model = getDefaultModelForProvider(newPreferences.provider);
    }
    
    setPreferences(updated);
    
    // Prepare data for localStorage with only the necessary fields
    const localStorageData: any = {
      provider: updated.provider,
      model: updated.model,
      streamResponses: updated.streamResponses,
      temperature: updated.temperature,
      maxTokens: updated.maxTokens,
      webSearchMode: updated.webSearchMode,
    };
    
    // Include endpoint-specific providers if they exist
    if (updated.endpointProviders) {
      localStorageData.endpointProviders = updated.endpointProviders;
    }
    if (updated.endpointModels) {
      localStorageData.endpointModels = updated.endpointModels;
    }

    localStorage.setItem('study-buddy-preferences', JSON.stringify(localStorageData));
  }, [preferences]);

  // Save study context to localStorage
  const saveStudyContext = useCallback((context: StudyContext) => {
    setStudyContext(context);
    localStorage.setItem('study-buddy-study-context', JSON.stringify(context));
  }, []);

  // Save teaching mode to localStorage
  const saveTeachingMode = useCallback((teachingModeState: TeachingModeState) => {
    setTeachingModeState(teachingModeState);
    localStorage.setItem('study-buddy-teaching-mode', JSON.stringify(teachingModeState));
  }, []);

  // Save chat history to localStorage
  const saveChatHistory = useCallback((newMessages: ChatMessage[]) => {
    try {
      const sessionKey = `study-buddy-history-${sessionId}`;
      localStorage.setItem(sessionKey, JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [sessionId]);

  // Utility functions
  const generateSessionId = () => {
    return `study-buddy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateConversationId = () => {
    // Generate a proper UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Detect if question is personal (enhanced with Layer 1 integration)
  const detectPersonalQuestion = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced keyword matching for better personal question detection
    const enhancedKeywords = [
      'mera', 'my', 'performance', 'progress', 'weak', 'strong', 'score', 'analysis',
      'revision', 'kaise chal raha', 'improvement', 'help me', 'suggest', 'strategy', 'schedule',
      'my name', 'do you know', 'who am i', 'what is my', 'remember', 'recall', 'past',
      'earlier', 'before', 'previous', 'last time', 'how am i doing', 'am i improving',
      'my strengths', 'my weaknesses', 'my scores', 'my results', 'my grades', 'mera naam',
      'mera progress', 'mera performance', 'mera weak', 'mera strong', 'mera score'
    ];
    
    // Check for exact matches first
    const exactMatches = enhancedKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Additional pattern matching for more complex personal queries
    const personalPatterns = [
      /\bmy\s+(name|progress|performance|score|grade|result)\b/i,
      /\b(do you know|remember|recall)\s+my\s+\w+/i,
      /\b(who|what)\s+am\s+i\b/i,
      /\bhow\s+am\s+i\s+(doing|performing)\b/i,
      /\bmera\s+\w+/i
    ];
    
    const patternMatches = personalPatterns.some(pattern => pattern.test(message));
    
    const isPersonal = exactMatches || patternMatches;
    
    if (isPersonal) {
      console.log('🎯 Personal question detected:', {
        message: message.substring(0, 50),
        exactMatches,
        patternMatches
      });
    }
    
    return isPersonal;
  };

  // Add message to chat
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      saveChatHistory(updated);
      return updated;
    });

    return newMessage.id;
  }, [saveChatHistory]);

  // Update existing message
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const updated = prev.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      saveChatHistory(updated);
      return updated;
    });
  }, [saveChatHistory]);

  // LAYER 2 ENHANCED METHODS

  /**
   * Build enhanced study context with 4-level compression
   */
  const buildEnhancedStudyContext = useCallback(async (level: ContextLevel = 'selective'): Promise<EnhancedContext> => {
    if (!userId) {
      throw new Error('User ID is required to build enhanced context');
    }

    try {
      const request: ContextBuildRequest = {
        userId,
        level,
        includeMemories: true,
        includeKnowledge: true,
        includeProgress: true,
        tokenLimit: preferences.maxTokens,
        subjects: (studyContext?.topics?.length ?? 0) > 0 ? [studyContext.subject] : undefined,
        topics: (studyContext?.topics?.length ?? 0) > 0 ? studyContext.topics : undefined
      };

      const context = await buildEnhancedContext(request);
      setEnhancedContext(context);
      setLayer2Context(prev => ({
        ...prev,
        compressionLevel: level,
        tokenUsage: context.tokenUsage.total
      }));

      return context;
    } catch (error) {
      console.error('Failed to build enhanced context:', error);
      throw error;
    }
  }, [userId, preferences.maxTokens, studyContext]);

  /**
   * Get relevant study memories from conversation memory
   */
  const getRelevantStudyMemories = useCallback(async (query: string = '', limit: number = 5): Promise<MemorySearchResult[]> => {
    if (!userId) {
      return [];
    }

    try {
      const request: MemorySearchRequest = {
        userId,
        query,
        maxResults: limit,
        minRelevanceScore: 0.3,
        includeLinked: true,
        sortBy: 'relevance'
      };

      const results = await searchMemories(request);
      setLayer2Context(prev => ({
        ...prev,
        relevantMemories: results
      }));

      return results;
    } catch (error) {
      console.error('Failed to get relevant study memories:', error);
      return [];
    }
  }, [userId]);

  /**
   * Optimize study context for token budget management
   */
  const optimizeStudyContext = useCallback(async (
    tokenLimit: number = preferences.maxTokens, 
    strategy: OptimizationStrategy = 'balanced'
  ): Promise<OptimizationResult> => {
    if (!enhancedContext) {
      throw new Error('Enhanced context must be built before optimization');
    }

    try {
      const request: OptimizationRequest = {
        context: enhancedContext,
        tokenLimit,
        strategy,
        educationalPriority: true,
        preserveComponents: ['profile', 'knowledge'],
        minimumQuality: 0.6
      };

      const result = await optimizeContext(request);
      setEnhancedContext(result.optimizedContext);
      setLayer2Context(prev => ({
        ...prev,
        contextOptimization: result,
        tokenUsage: result.optimizedContext.tokenUsage.total
      }));

      return result;
    } catch (error) {
      console.error('Failed to optimize study context:', error);
      throw error;
    }
  }, [enhancedContext, preferences.maxTokens]);

  /**
   * Search educational knowledge base
   */
  const getStudyKnowledgeBase = useCallback(async (
    query: string, 
    filters: SearchFilters = {}
  ): Promise<KnowledgeSearchResult[]> => {
    try {
      const defaultFilters: SearchFilters = {
        minReliability: 0.7,
        minEducationalValue: 0.5,
        limit: 10,
        ...filters
      };

      // Add subject context if available
      if (studyContext.subject && !defaultFilters.subjects) {
        defaultFilters.subjects = [studyContext.subject];
      }

      const results = await searchKnowledge(query, defaultFilters);
      setLayer2Context(prev => ({
        ...prev,
        knowledgeBase: results
      }));

      return results;
    } catch (error) {
      console.error('Failed to search knowledge base:', error);
      return [];
    }
  }, [studyContext.subject]);

  /**
   * Get current context optimization result
   */
  const getContextOptimization = useCallback((): OptimizationResult | null => {
    return layer2Context.contextOptimization;
  }, [layer2Context.contextOptimization]);

  /**
   * Update compression level
   */
  const updateCompressionLevel = useCallback((level: ContextLevel) => {
    setLayer2Context(prev => ({
      ...prev,
      compressionLevel: level
    }));
  }, []);

  /**
   * Get current token usage
   */
  const getTokenUsage = useCallback((): number => {
    return layer2Context.tokenUsage;
  }, [layer2Context.tokenUsage]);

  /**
   * Store study interaction in memory
   */
  const storeStudyInteraction = useCallback(async (query: string, response: string, metadata: any = {}) => {
    if (!userId || !conversationId) {
      return;
    }

    try {
      await storeMemory({
        userId,
        conversationId,
        memoryType: 'learning_interaction',
        interactionData: {
          content: query,
          response,
          subject: studyContext.subject,
          topic: studyContext.topics[0],
          timestamp: new Date(),
          complexity: metadata.complexity || 'moderate',
          sentiment: metadata.sentiment || 'neutral'
        },
        qualityScore: metadata.qualityScore || 0.5,
        userSatisfaction: metadata.userSatisfaction,
        feedbackCollected: false,
        memoryRelevanceScore: metadata.qualityScore || 0.5,
        priority: 'medium',
        retention: 'long_term',
        tags: [...studyContext.topics, studyContext.subject].filter(Boolean),
        metadata: {
          source: 'user_input',
          version: 1,
          compressionApplied: false,
          validationStatus: 'valid',
          accessCount: 0,
          lastAccessed: new Date(),
          linkedToKnowledgeBase: false,
          crossConversationLinked: false
        },
        linkedMemories: []
      });
    } catch (error) {
      console.error('Failed to store study interaction:', error);
    }
  }, [userId, conversationId, studyContext]);

  /**
   * Get learning progress from memory analytics
   */
  const getLearningProgress = useCallback(async () => {
    if (!userId) {
      return null;
    }

    try {
      // This would typically get from memory analytics
      // For now, return simplified progress data
      return {
        totalSessions: messages.length,
        averageSessionTime: 30, // minutes
        improvementRate: 0.15, // 15% improvement
        mostStudiedSubject: studyContext.subject || 'General',
        learningVelocity: messages.length / 7 // sessions per week
      };
    } catch (error) {
      console.error('Failed to get learning progress:', error);
      return null;
    }
  }, [userId, messages.length, studyContext.subject]);

  /**
   * Build initial enhanced context
   */
  const buildInitialEnhancedContext = useCallback(async () => {
    if (!userId) return;

    try {
      await buildEnhancedStudyContext('selective');
      await getRelevantStudyMemories('', 3);
    } catch (error) {
      console.error('Failed to build initial enhanced context:', error);
    }
  }, [userId, buildEnhancedStudyContext, getRelevantStudyMemories]);

  // Detect time range in user query (e.g., '5 months ago')
  const detectTimeRange = (text: string): { since?: string } | undefined => {
    try {
      const m = text.toLowerCase().match(/(\d+)\s*(months|month|mahine|mahina)\s*(ago|pehle)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > 0 && n < 60) {
          const since = new Date();
          since.setMonth(since.getMonth() - n);
          return { since: since.toISOString() };
        }
      }
    } catch {}
    return undefined;
  };

  // Main message sending function (enhanced with Layer 2)
  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    // Auth guard: ensure user is signed in before sending
    if (!userId) {
      toast({ variant: 'destructive', title: 'Sign in required', description: 'Please sign in to use Study Buddy.' });
      router.push('/auth');
      return;
    }

    setIsLoading(true);

    try {
      // Ensure we have conversation ID
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        currentConversationId = generateConversationId();
        setConversationId(currentConversationId);
      }

      // Add user message
      const userMessageId = addMessage({
        role: 'user',
        content: content.trim(),
      });

      // Detect if this is a personal question
      const isPersonalQuery = detectPersonalQuestion(content);

      // Enhanced context building for study sessions
      let enhancedContextForRequest = enhancedContext;
      if (!enhancedContextForRequest) {
        try {
          enhancedContextForRequest = await buildEnhancedStudyContext(layer2Context.compressionLevel);
        } catch (error) {
          console.warn('Failed to build enhanced context for request:', error);
        }
      }

      // Search for relevant knowledge and memories
      const [knowledgeResults, memoryResults] = await Promise.all([
        content.length > 10 ? getStudyKnowledgeBase(content) : Promise.resolve([]),
        getRelevantStudyMemories(content, 3)
      ]);

      // Determine if conversationId is a valid server UUID; if not, let server create it
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const serverConversationIdToSend = currentConversationId && UUID_REGEX.test(currentConversationId) ? currentConversationId : undefined;

      // Resolve provider/model for chat endpoint (respect endpoint overrides when configured)
      const chatProvider = preferences.endpointProviders?.chat || preferences.provider;
      let chatModel = preferences.endpointModels?.chat || preferences.model;
      const webSearchMode = preferences.webSearchMode || 'auto';
      
      // Validate model name - must not be empty or invalid
      if (!chatModel || chatModel.trim() === '' || chatModel.endsWith('-') || chatModel.length < 3) {
        console.warn('Invalid model detected:', chatModel, '- using default model for provider:', chatProvider);
        chatModel = getDefaultModelForProvider(chatProvider);
      }

      // Call the Study Buddy specific API endpoint that has proper memory integration
      const requestBody: any = {
        conversationId: serverConversationIdToSend,
        message: content,
        chatType: 'study_assistant',
        isPersonalQuery: isPersonalQuery,
        provider: chatProvider,
        model: chatModel,
        context: {
          chatType: 'study_assistant',
          isPersonalQuery: isPersonalQuery,
          includeMemoryContext: true,
          includePersonalizedSuggestions: true,
          studyData: true,
          webSearch: webSearchMode,
          timeRange: detectTimeRange(content),
          memoryOptions: {
            query: isPersonalQuery ? content : undefined,
            limit: 5,
            minSimilarity: 0.1,
            searchType: 'hybrid',
            contextLevel: 'balanced'
          }
        }
      };

      if (preferences.streamResponses) {
        // Handle streaming response using the unified endpoint with sentence-level chunks
        const assistantMessageId = addMessage({
          role: 'assistant',
          content: '',
          streaming: true,
        });

        try {
          // FIXED: Call the correct study-buddy endpoint with proper authentication
          const session = await supabaseBrowserClient.auth.getSession();
          const accessToken = session.data.session?.access_token;
          
          if (!accessToken) {
            console.warn('Study Buddy: No auth token available, attempting unauthenticated request');
          }
          
          const response = await fetch('/api/ai/chat?stream=true', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            },
            body: JSON.stringify({
              message: content,
              userId,
              conversationId: serverConversationIdToSend,
              provider: chatProvider,
              model: chatModel,
              chatType: 'study_assistant',
              includeMemoryContext: false, // DISABLED to prevent old context pollution
              includePersonalizedSuggestions: true,
              studyData: true,
              teachingMode: teachingMode.isEnabled,
              teachingPreferences: {
                explanationDepth: teachingMode.preferences.explanationDepth,
                exampleDensity: teachingMode.preferences.exampleDensity,
                interactiveMode: teachingMode.preferences.interactiveMode,
                focusAreas: teachingMode.preferences.focusAreas,
              },
              studyContext,
              webSearch: webSearchMode,
              // Send only last 2 conversation turns (4 messages) to prevent generic responses
              conversationHistory: messages.slice(-4).map(m => ({role: m.role, content: m.content})),
              context: {
                isPersonalQuery: isPersonalQuery,
                includeMemoryContext: false, // DISABLED to prevent old context pollution
                includePersonalizedSuggestions: true,
                studyData: true,
                webSearch: webSearchMode,
                timeRange: detectTimeRange(content),
                memoryOptions: {
                  query: isPersonalQuery ? content : undefined,
                  limit: 2, // REDUCED from 5 to 2
                  minSimilarity: 0.7, // INCREASED from 0.1 to 0.7 for higher relevance
                  searchType: 'hybrid',
                  contextLevel: 'balanced'
                }
              }
            })
          });

          if (!response.ok || !response.body) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulated = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            updateMessage(assistantMessageId, { content: accumulated });
          }
          updateMessage(assistantMessageId, { streaming: false });
        } catch (streamError) {
          console.error('Unified chat streaming failed:', streamError);
          updateMessage(assistantMessageId, {
            content: 'I apologize, but I encountered a streaming issue. Please try again.',
            streaming: false,
          });
        }
      } else {
        // Handle regular (non-streaming) response using the study-buddy endpoint
        const session = await supabaseBrowserClient.auth.getSession();
        const accessToken = session.data.session?.access_token;
        
        if (!accessToken) {
          console.warn('Study Buddy: No auth token available, attempting unauthenticated request');
        }
        
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          },
          body: JSON.stringify({
            message: content,
            userId,
            conversationId: serverConversationIdToSend,
            provider: chatProvider,
            model: chatModel,
            chatType: 'study_assistant',
            includeMemoryContext: false, // DISABLED to prevent old context pollution
            includePersonalizedSuggestions: true,
            studyData: true,
            teachingMode: teachingMode.isEnabled,
            teachingPreferences: {
              explanationDepth: teachingMode.preferences.explanationDepth,
              exampleDensity: teachingMode.preferences.exampleDensity,
              interactiveMode: teachingMode.preferences.interactiveMode,
              focusAreas: teachingMode.preferences.focusAreas,
            },
            studyContext,
            webSearch: webSearchMode,
            // Send only last 2 conversation turns (4 messages) to prevent generic responses
            conversationHistory: messages.slice(-4).map(m => ({role: m.role, content: m.content})),
            context: {
              isPersonalQuery: isPersonalQuery,
              includeMemoryContext: false, // DISABLED to prevent old context pollution
              includePersonalizedSuggestions: true,
              studyData: true,
              webSearch: webSearchMode,
              timeRange: detectTimeRange(content),
              memoryOptions: {
                query: isPersonalQuery ? content : undefined,
                limit: 2, // REDUCED from 5 to 2
                minSimilarity: 0.7, // INCREASED from 0.1 to 0.7 for higher relevance
                searchType: 'hybrid',
                contextLevel: 'balanced'
              }
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.aiResponse) {
          addMessage({
            role: 'assistant',
            content: data.data.aiResponse.content,
            provider: data.data.aiResponse.provider_used,
            model: data.data.aiResponse.model_used,
            tokensUsed: data.data.aiResponse.tokens_used || 0,
          });
        } else {
          const errorMessage = data.error?.message || 'I encountered an issue processing your request. Please try again.';
          addMessage({ role: 'assistant', content: errorMessage });
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });

      // Add error message to chat
      addMessage({
        role: 'assistant',
        content: 'I apologize, but I encountered an error while helping you. Please try again, and I\'ll do my best to assist you with your studies!',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start new chat (preserves previous sessions in localStorage for history)
  const startNewChat = () => {
    setMessages([]);
    const newSessionId = generateSessionId();
    const newConversationId = generateConversationId();
    setSessionId(newSessionId);
    setConversationId(newConversationId);
    router.replace(`/study-buddy?session=${newSessionId}`);

    // Clear enhanced context for the new session
    setEnhancedContext(null);
    setLayer2Context({
      knowledgeBase: [],
      relevantMemories: [],
      contextOptimization: null,
      compressionLevel: 'selective',
      tokenUsage: 0
    });

    toast({
      title: 'New Chat Started',
      description: 'Your study session has been reset.',
    });
  };

  // Clear chat
  const clearChat = () => {
    setMessages([]);
    const sessionKey = `study-buddy-history-${sessionId}`;
    localStorage.removeItem(sessionKey);

    // Clear enhanced context
    setEnhancedContext(null);
    setLayer2Context({
      knowledgeBase: [],
      relevantMemories: [],
      contextOptimization: null,
      compressionLevel: 'selective',
      tokenUsage: 0
    });

    toast({
      title: 'Chat cleared',
      description: 'Your study session has been reset.',
    });
  };

  // Toggle settings
  const toggleSettings = () => {
    setIsSettingsOpen(prev => !prev);
  };

  // Toggle context
  const toggleContext = () => {
    setIsContextOpen(prev => !prev);
  };

  // Teaching mode functions
  const toggleTeachingMode = () => {
    setTeachingModeState(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled,
      lastActivated: !prev.isEnabled ? new Date() : prev.lastActivated,
      activationCount: !prev.isEnabled ? prev.activationCount + 1 : prev.activationCount
    }));
  };

  const activateTeachingMode = (enabled: boolean) => {
    setTeachingModeState(prev => ({
      ...prev,
      isEnabled: enabled,
      lastActivated: enabled ? new Date() : prev.lastActivated,
      activationCount: enabled ? prev.activationCount + 1 : prev.activationCount
    }));
  };

  // Study Mode helper used by the UI toggle near the chat input
  const setStudyModeEnabled = (isEnabled: boolean) => {
    setTeachingModeState(prev => {
      const updated: TeachingModeState = {
        ...prev,
        isEnabled,
        mode: isEnabled ? 'personalized' : prev.mode,
        preferences: {
          ...prev.preferences,
          interactiveMode: isEnabled ? true : prev.preferences.interactiveMode,
          explanationDepth: isEnabled ? 'detailed' : prev.preferences.explanationDepth,
          exampleDensity: isEnabled ? 'high' : prev.preferences.exampleDensity,
        },
        lastActivated: isEnabled ? new Date() : prev.lastActivated,
        activationCount: isEnabled ? prev.activationCount + 1 : prev.activationCount,
      };

      try {
        localStorage.setItem('study-buddy-teaching-mode', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving teaching mode:', error);
      }

      return updated;
    });
  };

  const setTeachingModeType = (mode: 'general' | 'personalized') => {
    setTeachingModeState(prev => ({
      ...prev,
      mode,
      lastActivated: new Date()
    }));
  };

  const updateTeachingPreferences = (preferences: Partial<TeachingModeState['preferences']>) => {
    setTeachingModeState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...preferences
      },
      lastActivated: new Date()
    }));
  };

  // Export chat
  const exportChat = () => {
    const chatData = {
      sessionId,
      conversationId,
      messages,
      preferences,
      studyContext,
      enhancedContext, // Include enhanced context
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-buddy-session-${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Session exported',
      description: 'Your study session has been exported.',
    });
  };

  // Fetch profile data - ENHANCED VERSION with better error handling
  const fetchProfileData = async () => {
    if (!userId) {
      console.log('⚠️  Cannot fetch profile: no user ID available');
      setProfileData(DEFAULT_PROFILE_DATA);
      return;
    }

    try {
      console.log('🔍 Fetching student profile for userId:', userId);
      
      const controller = new AbortController();
      // Increased timeout to 30 seconds to allow for complex queries
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/student/profile?userId=${userId}`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log('📡 Profile API response status:', response.status);

      if (!response.ok) {
        console.warn('⚠️  Profile API returned non-OK status:', response.status);
        // Still try to parse response for potential data
      }

      let data;
      try {
        data = await response.json();
        console.log('📋 Profile API response data:', {
          hasData: !!data?.data,
          dataType: typeof data?.data,
          keys: data?.data ? Object.keys(data.data) : 'none'
        });
      } catch (parseError) {
        console.warn('⚠️  Failed to parse profile response, using defaults:', parseError);
        setProfileData(DEFAULT_PROFILE_DATA);
        return;
      }

      // Check if we have valid data in the response
      if (data && data.data && typeof data.data === 'object') {
        console.log('✅ Setting profile data from API response');
        
        // Validate and sanitize the profile data
        const sanitizedProfile = {
          profileText: data.data.profileText || DEFAULT_PROFILE_DATA.profileText,
          strongSubjects: Array.isArray(data.data.strongSubjects) ? data.data.strongSubjects : [],
          weakSubjects: Array.isArray(data.data.weakSubjects) ? data.data.weakSubjects : [],
          studyProgress: {
            totalTopics: typeof data.data.studyProgress?.totalTopics === 'number' ? data.data.studyProgress.totalTopics : 0,
            completedTopics: typeof data.data.studyProgress?.completedTopics === 'number' ? data.data.studyProgress.completedTopics : 0,
            accuracy: typeof data.data.studyProgress?.accuracy === 'number' ? data.data.studyProgress.accuracy : 0
          },
          currentData: {
            streak: typeof data.data.currentData?.streak === 'number' ? data.data.currentData.streak : 0,
            level: typeof data.data.currentData?.level === 'number' ? data.data.currentData.level : 1,
            points: typeof data.data.currentData?.points === 'number' ? data.data.currentData.points : 0,
            revisionQueue: typeof data.data.currentData?.revisionQueue === 'number' ? data.data.currentData.revisionQueue : 0
          },
          lastUpdated: data.data.lastUpdated || new Date().toISOString()
        };
        
        setProfileData(sanitizedProfile);
      } else {
        console.log('⚠️  No valid profile data in response, using defaults');
        setProfileData(DEFAULT_PROFILE_DATA);
      }
    } catch (error) {
      console.error('❌ Error fetching student profile:', error);
      
      if (error.name === 'AbortError') {
        console.warn('⚠️  Profile fetch timed out, using defaults');
      }
      
      // Set default profile data on any error
      console.log('🔄 Setting default profile data due to error');
      setProfileData(DEFAULT_PROFILE_DATA);
    }
  };

  return {
    // State
    messages,
    isLoading,
    sessionId,
    userId,
    conversationId,
    preferences,
    studyContext,
    isSettingsOpen,
    isContextOpen,
    profileData,
    
    // Enhanced Layer 2 State
    enhancedContext,
    layer2Context,
    
    // Teaching mode state
    teachingMode,

    // Actions
    initializeSession,
    loadChatSession,
    handleSendMessage,
    startNewChat,
    clearChat,
    savePreferences,
    saveStudyContext,
    toggleSettings,
    toggleContext,
    exportChat,
    fetchProfileData,

    // Enhanced Layer 2 Actions
    buildEnhancedStudyContext,
    getRelevantStudyMemories,
    optimizeStudyContext,
    getStudyKnowledgeBase,
    getContextOptimization,
    updateCompressionLevel,
    getTokenUsage,
    storeStudyInteraction,
    getLearningProgress,
    
    // Teaching mode actions
    toggleTeachingMode,
    setTeachingMode: activateTeachingMode,
    setTeachingModeType,
    updateTeachingPreferences,
    setStudyModeEnabled,
    saveTeachingMode,
  };
}
