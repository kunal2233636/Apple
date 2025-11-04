// Study Buddy Chat Component
// ===========================

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Target, Lightbulb, HelpCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import MemoryReferences from './memory-references';
import type { StudyBuddyChatProps } from '@/types/study-buddy';

export function StudyBuddyChat({
  messages,
  onSendMessage,
  isLoading,
  preferences,
  onUpdatePreferences,
  studyContext,
}: StudyBuddyChatProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // Handle scroll events
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      setIsAtBottom(distanceFromBottom < 100);
      setShowScrollButton(!isAtBottom && distanceFromBottom > 200);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    await onSendMessage(content, attachments);
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

  // Study Buddy specific quick actions
  const handleQuickAction = async (action: string, prompt: string) => {
    if (studyContext.subject) {
      await handleSendMessage(`${prompt}\n\nStudy Context: ${studyContext.subject} (${studyContext.difficultyLevel} level)`);
    } else {
      await handleSendMessage(prompt);
    }
  };

  return (
    <div className="flex flex-col h-full">
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
                    I'm here to provide personalized study help using your learning data and progress. Ask me about your studies, and I'll give you insights tailored to you!
                  </p>
                  
                  {/* Study Context Display */}
                  {studyContext.subject ? (
                    <div className="bg-white/70 rounded-lg p-4 text-left max-w-md mx-auto border border-blue-200">
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
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
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
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                <MessageBubble
                  message={message}
                  isStreaming={message.streaming || false}
                />
                
                {/* Memory References Display */}
                {message.role === 'assistant' && message.memory_references && message.memory_references.length > 0 && (
                  <MemoryReferences memoryReferences={message.memory_references} />
                )}
              </div>
            ))}
          </div>

          {/* Enhanced Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
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
    </div>
  );
}

export default StudyBuddyChat;