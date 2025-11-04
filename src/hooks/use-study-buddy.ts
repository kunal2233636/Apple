// Study Buddy State Management Hook
// ===================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/supabase';
import type {
  StudyBuddyState,
  StudyBuddyActions,
  ChatMessage,
  ChatPreferences,
  StudyContext,
  StudentProfileData,
  MemoryReference,
  StudyBuddyApiResponse,
  StudyBuddyApiRequest
} from '@/types/study-buddy';

const DEFAULT_PREFERENCES: ChatPreferences = {
  provider: 'groq',
  model: '',
  streamResponses: true,
  temperature: 0.7,
  maxTokens: 2048,
};

const DEFAULT_STUDY_CONTEXT: StudyContext = {
  subject: '',
  difficultyLevel: 'intermediate',
  learningGoals: [],
  topics: [],
  timeSpent: 0,
  lastActivity: new Date(),
};

export function useStudyBuddy(): StudyBuddyState & StudyBuddyActions {
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Personal question detection keywords
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
        // Fetch profile data
        await fetchProfileData();
      }

      // Load session ID from URL or create new one
      const urlSessionId = searchParams.get('session');
      if (urlSessionId) {
        setSessionId(urlSessionId);
      } else {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        router.replace(`/study-buddy?session=${newSessionId}`);
      }

      // Load preferences and chat history
      loadPreferences();
      loadChatHistory();
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
        setPreferences(prev => ({ ...prev, ...prefs }));
      }

      const savedContext = localStorage.getItem('study-buddy-study-context');
      if (savedContext) {
        const context = JSON.parse(savedContext);
        setStudyContext(prev => ({ ...prev, ...context }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const sessionKey = `study-buddy-history-${sessionId}`;
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const history = JSON.parse(saved);
        setMessages(history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: Partial<ChatPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem('study-buddy-preferences', JSON.stringify({
      provider: updated.provider,
      model: updated.model,
      streamResponses: updated.streamResponses,
      temperature: updated.temperature,
      maxTokens: updated.maxTokens,
    }));
  }, [preferences]);

  // Save study context to localStorage
  const saveStudyContext = useCallback((context: StudyContext) => {
    setStudyContext(context);
    localStorage.setItem('study-buddy-study-context', JSON.stringify(context));
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
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Detect if question is personal
  const detectPersonalQuestion = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return personalQuestionKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
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

  // Main message sending function
  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

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

      // Call Study Assistant API endpoint
      const requestBody: StudyBuddyApiRequest = {
        userId,
        conversationId: currentConversationId,
        message: content,
        chatType: 'study_assistant',
        isPersonalQuery
      };

      if (preferences.streamResponses) {
        // Handle streaming response
        const assistantMessageId = addMessage({
          role: 'assistant',
          content: '',
          streaming: true,
        });

        try {
          const response = await fetch('/api/chat/study-assistant/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: StudyBuddyApiResponse = await response.json();

          if (data.success) {
            updateMessage(assistantMessageId, {
              content: data.data.response.content,
              provider: data.data.response.provider_used,
              model: data.data.response.model_used,
              tokensUsed: data.data.response.tokens_used?.output || 0,
              streaming: false,
              memory_references: data.data.response.memory_references
            });
          } else {
            throw new Error(data.error?.message || 'Request failed');
          }

        } catch (streamError) {
          console.error('Study Assistant API failed:', streamError);

          // Add error message to chat
          updateMessage(assistantMessageId, {
            content: 'I apologize, but I encountered an error while helping you. Please try again, and I\'ll do my best to assist you with your studies!',
            streaming: false,
          });
        }
      } else {
        // Handle regular (non-streaming) response
        const response = await fetch('/api/chat/study-assistant/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: StudyBuddyApiResponse = await response.json();

        if (data.success) {
          addMessage({
            role: 'assistant',
            content: data.data.response.content,
            provider: data.data.response.provider_used,
            model: data.data.response.model_used,
            tokensUsed: data.data.response.tokens_used?.output || 0,
            memory_references: data.data.response.memory_references
          });
        } else {
          throw new Error(data.error?.message || 'Request failed');
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
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

  // Start new chat
  const startNewChat = () => {
    setMessages([]);
    const newSessionId = generateSessionId();
    const newConversationId = generateConversationId();
    setSessionId(newSessionId);
    setConversationId(newConversationId);
    router.replace(`/study-buddy?session=${newSessionId}`);

    // Clear local storage for this session
    const sessionKey = `study-buddy-history-${sessionId}`;
    localStorage.removeItem(sessionKey);

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

  // Export chat
  const exportChat = () => {
    const chatData = {
      sessionId,
      conversationId,
      messages,
      preferences,
      studyContext,
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

  // Fetch profile data
  const fetchProfileData = async () => {
    try {
      const response = await fetch(`/api/student/profile?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();

      if (data.success) {
        setProfileData(data.data);
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
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

    // Actions
    initializeSession,
    handleSendMessage,
    startNewChat,
    clearChat,
    savePreferences,
    saveStudyContext,
    toggleSettings,
    toggleContext,
    exportChat,
    fetchProfileData,

    // Refs
    messagesEndRef,
    fileInputRef,

    // Utility
    detectPersonalQuestion,
  };
}