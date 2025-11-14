import { useReducer, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, Lightbulb, HelpCircle, CheckCircle, Loader2, Star, ThumbsUp, ThumbsDown, MessageSquare, Settings, Brain, TrendingUp, Activity, Award, GraduationCap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import MemoryReferences from './memory-references';
import type { StudyBuddyChatProps, UserFeedback, LearningPattern, PersonalizationProfile } from '@/types/study-buddy';
import { studyBuddyReducer, initialState } from '@/hooks/use-study-buddy-reducer';
import { useAuth } from '@/hooks/use-auth-listener';
import { StudyBuddySettings } from './study-buddy-settings';
import StudyModePanel, { StudyModeState } from './StudyModePanel';

export function StudyBuddyChat({
  messages,
  onSendMessage,
  isLoading,
  preferences,
  onUpdatePreferences,
  studyContext,
}: StudyBuddyChatProps) {
  const [state, dispatch] = useReducer(studyBuddyReducer, initialState);

  // Local Study Mode state (UI-only layer on top of existing chat)
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyModeState>({
    subject: studyContext.subject || '',
    topic: studyContext.topics?.[0] || '',
    difficulty: studyContext.difficultyLevel || 'intermediate',
    explanationStyle: 'simple',
  });

  // Resolve summary provider/model (falls back to main chat provider/model)
  const summaryProvider = preferences.endpointProviders?.summary || preferences.provider;
  const summaryModel = preferences.endpointModels?.summary || preferences.model;
  const {
    isAtBottom,
    showScrollButton,
    showFeedbackDialog,
    feedbackCollectionEnabled,
    quickFeedback,
    interactionCount,
    sessionMetrics,
  } = state;
  const { user } = useAuth();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // Initialize session
  useEffect(() => {
    if (!user) return;
    dispatch({ type: 'SET_FEEDBACK_COLLECTION_ENABLED', payload: true });
  }, [user]);

  // Track interaction count
  useEffect(() => {
    if (messages.length > sessionMetrics.messageCount) {
      dispatch({ type: 'UPDATE_SESSION_METRICS', payload: { messageCount: messages.length } });
      dispatch({ type: 'INCREMENT_INTERACTION_COUNT' });
    }
  }, [messages, sessionMetrics.messageCount]);

  // Handle scroll events
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      dispatch({ type: 'SET_IS_AT_BOTTOM', payload: distanceFromBottom < 100 });
      dispatch({ type: 'SET_SHOW_SCROLL_BUTTON', payload: !isAtBottom && distanceFromBottom > 200 });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Collect user feedback
  const collectStudyFeedback = async (feedbackData: Partial<UserFeedback>) => {
    if (!user) return;
    try {
      const currentTime = new Date();
      const sessionDuration = currentTime.getTime() - sessionMetrics.startTime.getTime();
      
      const feedback: UserFeedback = {
        id: `feedback_${Date.now()}`,
        userId: user.id,
        sessionId: 'session123', // TODO: Generate
        interactionId: `interaction_${Date.now()}`,
        type: feedbackData.type || 'explicit',
        rating: feedbackData.rating,
        content: feedbackData.content,
        corrections: feedbackData.corrections,
        behaviorMetrics: {
          timeSpent: sessionDuration,
          scrollDepth: sessionMetrics.engagementLevel,
          followUpQuestions: sessionMetrics.messageCount,
          corrections: sessionMetrics.corrections,
          abandonment: false
        },
        context: {
          messageId: messages.length > 0 ? messages[messages.length - 1].id : 'unknown',
          response: messages.length > 0 ? messages[messages.length - 1].content : '',
          timestamp: currentTime,
          sessionDuration: sessionDuration
        },
        processed: false,
        createdAt: currentTime
      };

      dispatch({ type: 'ADD_USER_FEEDBACK', payload: feedback });
      
      // Update session satisfaction
      if (feedbackData.rating) {
        dispatch({
          type: 'UPDATE_SESSION_METRICS',
          payload: { satisfactionScore: (sessionMetrics.satisfactionScore + feedbackData.rating) / 2 }
        });
      }

      return feedback;
    } catch (error) {
      console.error('Failed to collect study feedback:', error);
    }
  };

  // Quick feedback handlers
  const handleQuickFeedback = (type: 'positive' | 'negative') => {
    dispatch({ type: 'SET_QUICK_FEEDBACK', payload: type });
    collectStudyFeedback({
      type: 'satisfaction',
      rating: type === 'positive' ? 5 : 2,
      content: type === 'positive' ? 'Quick positive feedback' : 'Quick negative feedback'
    });
  };

  const buildStudyModePrompt = (content: string) => {
    const lines: string[] = [];
    lines.push('[STUDY MODE ACTIVE] Please answer as a structured tutor.');
    if (studyMode.subject) {
      lines.push(`Subject: ${studyMode.subject}`);
    }
    if (studyMode.topic) {
      lines.push(`Topic: ${studyMode.topic}`);
    }
    lines.push(`Difficulty: ${studyMode.difficulty}`);
    lines.push(`Explanation style: ${
      studyMode.explanationStyle === 'simple'
        ? 'Explain in simple language suitable for quick understanding.'
        : studyMode.explanationStyle === 'deep'
        ? 'Explain in depth with step-by-step reasoning and multiple examples.'
        : 'Explain like exam notes: concise, bullet points, definitions, formulas, and key takeaways.'
    }`);
    lines.push('---');
    lines.push(content.trim());
    return lines.join('\n');
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    try {
      const finalContent = isStudyMode ? buildStudyModePrompt(content) : content;
      await onSendMessage(finalContent, attachments);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log('Files selected:', Array.from(files));
      event.target.value = '';
    }
  };

  const handleQuickAction = async (action: string, prompt: string) => {
    const basePrompt = studyContext.subject
      ? `${prompt}\n\nStudy Context: ${studyContext.subject} (${studyContext.difficultyLevel} level)`
      : prompt;
    await handleSendMessage(basePrompt);
  };

  const handleUpdateSettings = (settings: { fallbackModels: { id: string; name: string; }[] }) => {
    console.log('Settings updated:', settings);
    // TODO: Save settings to the backend
    setShowSettingsDialog(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Quick Feedback Controls */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Feedback</span>
            {feedbackCollectionEnabled && (
              <Badge variant="outline" className="text-xs">Enabled</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick feedback buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant={quickFeedback === 'positive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFeedback('positive')}
                className="h-11 w-11 p-0"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant={quickFeedback === 'negative' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleQuickFeedback('negative')}
                className="h-11 w-11 p-0"
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-11">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <StudyBuddySettings onUpdateSettings={handleUpdateSettings} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Study Mode Toggle & Panel */}
      <div className="border-b bg-slate-50/80 px-4 py-2">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-xs text-slate-700">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 shadow-sm">
              <GraduationCap className="h-3 w-3 text-indigo-600" />
              <span className="font-medium">Mode:</span>
              <Button
                type="button"
                size="sm"
                variant={isStudyMode ? 'outline' : 'default'}
                className="h-6 px-2 text-[11px]"
                onClick={() => setIsStudyMode(false)}
              >
                💬 Normal Chat
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isStudyMode ? 'default' : 'outline'}
                className="h-6 px-2 text-[11px]"
                onClick={() => setIsStudyMode(true)}
              >
                📘 Study Mode
              </Button>
            </div>
            {isStudyMode && (
              <span className="hidden text-[11px] text-indigo-700 md:inline-flex">
                <Sparkles className="mr-1 h-3 w-3" /> Study Mode is ON – answers will be structured for learning.
              </span>
            )}
          </div>
        </div>
        {isStudyMode && (
          <div className="mx-auto mt-2 max-w-4xl">
            <StudyModePanel
              value={studyMode}
              onChange={setStudyMode}
              onGenerateQuiz={() =>
                handleQuickAction(
                  'study_quiz',
                  `Create a short quiz (5 questions) for ${
                    studyMode.topic || studyMode.subject || 'this topic'
                  } at ${studyMode.difficulty} level.`
                )
              }
              onGenerateFlashcards={() =>
                handleQuickAction(
                  'study_flashcards',
                  `Generate concise flashcards for ${
                    studyMode.topic || studyMode.subject || 'this topic'
                  } with term on one side and explanation on the other.`
                )
              }
            />
          </div>
        )}
      </div>

      {/* Study Buddy Quick Actions */}
      {messages.length === 0 && studyContext.subject && (
        <div className="border-b bg-blue-50/50 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickAction('explain', `Can you explain the key concepts in ${studyContext.subject} that I should understand?`)}
              className="text-xs"
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Explain Key Concepts
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickAction('quiz', `Create 5 practice questions about ${studyContext.subject} to help me test my understanding.`)}
              className="text-xs"
            >
              <HelpCircle className="h-3 w-3 mr-1" />
              Practice Questions
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickAction('summary', `Summarize the most important topics in ${studyContext.subject} that I need to remember.`)}
              className="text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Quick Summary
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickAction('tips', `Give me study tips and strategies specifically for learning ${studyContext.subject}.`)}
              className="text-xs"
            >
              <Target className="h-3 w-3 mr-1" />
              Study Tips
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 p-4" 
        onScrollCapture={handleScroll}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <Card className="p-8 text-center border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Hi there! I'm your AI Coach 👋
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    I'm here to provide personalized study help. Ask me about your studies, and I'll give you insights tailored to you!
                  </p>
                  
                  {/* Study Context Display */}
                  {studyContext.subject ? (
                    <div className="bg-white/70 rounded-lg p-4 text-left max-w-md mx-auto border border-blue-200 mt-4">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        Current Study Session:
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Subject: <span className="font-semibold text-blue-800">{studyContext.subject}</span></div>
                        <div>Level: <span className="font-semibold">{studyContext.difficultyLevel}</span></div>
                        {studyContext.learningGoals.length > 0 && (
                          <div>Goals: <span className="font-semibold">{studyContext.learningGoals.slice(0, 2).join(', ')}</span></div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs text-blue-600 font-medium">
                          💡 Tip: Ask me personal questions like "How am I doing?" or "What should I focus on?" for personalized insights!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto mt-4">
                      <p className="text-sm text-amber-800">
                        🎯 <strong>Pro tip:</strong> Set your study context (brain icon) to get more personalized help!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Messages */}
          <div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((message, idx) => {
              const prev = messages[idx - 1];
              const next = messages[idx + 1];
              const isFirstInGroup = !prev || prev.role !== message.role;
              const isLastInGroup = !next || next.role !== message.role;
              const showHeader = isFirstInGroup;
              return (
                <motion.div key={message.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <MessageBubble
                    message={message}
                    isTyping={message.streaming || false}
                    showHeader={showHeader}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    summaryProvider={summaryProvider}
                    summaryModel={summaryModel}
                    onRegenerate={() => {
                      const prevUser = [...messages].slice(0, idx).reverse().find(m => m.role === 'user');
                      if (prevUser) {
                        onSendMessage(prevUser.content);
                      }
                    }}
                  />
                  {message.role === 'assistant' && message.memory_references && message.memory_references.length > 0 && (
                    <MemoryReferences memoryReferences={message.memory_references} />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Enhanced Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start" role="status" aria-live="polite">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-blue-700 font-medium">
                      Getting personalized response...
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="absolute bottom-20 right-6 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      )}

      {/* Chat Input */}
      <div className="border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="max-w-4xl mx-auto p-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            disabled={isLoading}
            preferences={preferences}
            onUpdatePreferences={onUpdatePreferences}
          />
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.doc,.docx,.md,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Context Info */}
          {studyContext.subject && (
            <div className="mt-2 text-xs text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200">
                <Target className="h-3 w-3 text-blue-600" />
                <span className="text-blue-800 font-medium">Studying {studyContext.subject}</span>
                <span className="text-blue-600">•</span>
                <span className="text-blue-700">{studyContext.difficultyLevel} level</span>
                {studyContext.learningGoals.length > 0 && (
                  <>
                    <span className="text-blue-600">•</span>
                    <span className="text-blue-700">{studyContext.learningGoals.slice(0, 2).join(', ')}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Collection Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={(isOpen) => dispatch({ type: 'SET_SHOW_FEEDBACK_DIALOG', payload: isOpen })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              How was this session?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Based on your {sessionMetrics.messageCount} interactions, I'd love to hear your feedback!
            </div>
            
            {/* Star rating */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    collectStudyFeedback({
                      type: 'satisfaction',
                      rating,
                      content: `Rated session ${rating}/5 stars`
                    });
                    dispatch({ type: 'SET_SHOW_FEEDBACK_DIALOG', payload: false });
                  }}
                  className="p-2"
                >
                  <Star className="h-6 w-6 text-yellow-400" />
                </Button>
              ))}
            </div>
            
            {/* Text feedback */}
            <Textarea
              placeholder="Any additional feedback or suggestions?"
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  collectStudyFeedback({
                    type: 'explicit',
                    content: e.target.value
                  });
                }
              }}
            />
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => dispatch({ type: 'SET_SHOW_FEEDBACK_DIALOG', payload: false })}
              >
                Skip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudyBuddyChat;