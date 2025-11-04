'use client';

import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { Button } from '@/components/ui/button';
import { Download, Upload, RotateCcw } from 'lucide-react';
import type { ChatMessage, ChatPreferences, StudyContext } from '@/app/(app)/chat/page';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  isLoading: boolean;
  preferences: ChatPreferences;
  onUpdatePreferences: (preferences: Partial<ChatPreferences>) => void;
  studyContext: StudyContext;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  preferences,
  onUpdatePreferences,
  studyContext,
}: ChatInterfaceProps) {
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
      // Handle file upload - you can implement file processing here
      console.log('Files selected:', Array.from(files));
      // For now, we'll just clear the input
      event.target.value = '';
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = message.timestamp.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 p-4" 
        onScrollCapture={handleScroll}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Welcome to AI Chat</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a conversation with our AI assistant. You can ask questions, get help with studies, or just chat!
                  </p>
                  
                  {/* Study Context Display */}
                  {studyContext.subject && (
                    <div className="bg-muted/50 rounded-lg p-3 text-left max-w-md mx-auto">
                      <h4 className="font-medium text-sm mb-2">Current Study Context:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Subject: <span className="font-medium">{studyContext.subject}</span></div>
                        <div>Difficulty: <span className="font-medium">{studyContext.difficultyLevel}</span></div>
                        {studyContext.learningGoals.length > 0 && (
                          <div>Goals: <span className="font-medium">{studyContext.learningGoals.join(', ')}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Messages Grouped by Date */}
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-4">
                {dateMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={message.streaming || false}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    AI is thinking...
                  </span>
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
          className="absolute bottom-20 right-6 rounded-full shadow-lg"
          variant="secondary"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}

      {/* Chat Input */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            <div className="mt-2 text-xs text-muted-foreground text-center">
              Studying {studyContext.subject} • 
              Difficulty: {studyContext.difficultyLevel}
              {studyContext.learningGoals.length > 0 && (
                <span> • Goals: {studyContext.learningGoals.slice(0, 2).join(', ')}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}