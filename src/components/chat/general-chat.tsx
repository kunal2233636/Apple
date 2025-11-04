'use client';

import React, { useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { ChatMessage, ChatMessageSkeleton } from '@/components/chat/chat-message';
import { ChatSidebar, MobileChatSidebar } from '@/components/chat/chat-sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  Clock,
  MessageSquare,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function GeneralChat() {
  const {
    // Data
    messages,
    conversations,
    user,
    
    // State
    loadingState,
    uiState,
    error,
    rateLimitInfo,
    
    // Actions
    sendMessage,
    startNewChat,
    selectConversation,
    deleteConversation,
    clearError,
    setInputValue,
    toggleSidebar,
    
    // Refs
    messagesEndRef,
    
    // Computed
    currentConversation,
    canSendMessage,
    characterCount,
    maxCharacters,
    isOverLimit,
  } = useChat();

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSendMessage && !isOverLimit) {
      sendMessage(uiState.inputValue, currentConversation?.id);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSendMessage && !isOverLimit) {
        sendMessage(uiState.inputValue, currentConversation?.id);
      }
    }
  };

  // Auto-focus input when conversation changes
  useEffect(() => {
    if (currentConversation && !loadingState.isLoadingMessages) {
      const input = document.querySelector('textarea') as HTMLTextAreaElement;
      if (input) {
        input.focus();
      }
    }
  }, [currentConversation?.id, loadingState.isLoadingMessages]);

  // Show welcome screen for new chats
  const WelcomeScreen = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-semibold mb-2">Welcome to Ask Anything! 👋</h2>
        <p className="text-muted-foreground mb-6">
          I'm your AI study companion. Ask me anything about your studies, concepts, 
          or any questions you have. I can help with explanations, problem-solving, 
          and much more!
        </p>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-medium">💡</span>
            </div>
            <span className="text-left">Get instant answers to study questions</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-medium">📚</span>
            </div>
            <span className="text-left">Detailed explanations and examples</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-medium">🔍</span>
            </div>
            <span className="text-left">Access to latest information when needed</span>
          </div>
        </div>
        
        <Button 
          onClick={startNewChat}
          disabled={loadingState.isCreatingConversation}
          className="mt-8"
        >
          {loadingState.isCreatingConversation ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            'Start New Chat'
          )}
        </Button>
      </div>
    </div>
  );

  // Show empty state when no conversation is selected
  const EmptyState = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
        <p className="text-muted-foreground mb-6">
          Choose a conversation from the sidebar to continue chatting, or start a new one.
        </p>
        <Button onClick={startNewChat} disabled={loadingState.isCreatingConversation}>
          {loadingState.isCreatingConversation ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'New Chat'
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-80 lg:flex-shrink-0">
        <ChatSidebar
          conversations={conversations}
          selectedConversation={currentConversation}
          isLoading={loadingState.isLoadingConversations}
          isCreating={loadingState.isCreatingConversation}
          onSelectConversation={selectConversation}
          onStartNewChat={startNewChat}
          onDeleteConversation={deleteConversation}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileChatSidebar
        conversations={conversations}
        selectedConversation={currentConversation}
        isLoading={loadingState.isLoadingConversations}
        isCreating={loadingState.isCreatingConversation}
        onSelectConversation={selectConversation}
        onStartNewChat={startNewChat}
        onDeleteConversation={deleteConversation}
        isOpen={uiState.isSidebarOpen}
        onToggle={toggleSidebar}
        className="lg:hidden"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  {currentConversation?.title || 'Ask Anything'}
                  {currentConversation?.chatType === 'general' && (
                    <Badge variant="outline" className="text-xs">
                      General Chat
                    </Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentConversation 
                    ? `Updated ${new Date(currentConversation.updatedAt).toLocaleDateString()}`
                    : 'Ask general study questions'
                  }
                </p>
              </div>
            </div>

            {/* Connection status and rate limiting info */}
            <div className="flex items-center gap-2">
              {rateLimitInfo?.isLimited && (
                <Badge variant="destructive" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {uiState.retryCountdown}s
                </Badge>
              )}
              
              {error && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex-shrink-0 p-4">
            <Alert variant={error.code === 'RATE_LIMITED' ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.code === 'RATE_LIMITED' && rateLimitInfo?.retryAfter ? (
                  <div className="flex items-center justify-between">
                    <span>{error.message}</span>
                    <span className="font-medium">{uiState.retryCountdown}s</span>
                  </div>
                ) : error.code === 'NETWORK_ERROR' ? (
                  <div className="flex items-center gap-2">
                    <WifiOff className="h-4 w-4" />
                    <span>{error.message}</span>
                  </div>
                ) : (
                  error.message
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {!currentConversation && !loadingState.isLoadingMessages ? (
            <WelcomeScreen />
          ) : currentConversation && messages.length === 0 && !loadingState.isLoadingMessages ? (
            <EmptyState />
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {loadingState.isLoadingMessages ? (
                  // Loading skeleton messages
                  [...Array(3)].map((_, i) => (
                    <ChatMessageSkeleton key={i} />
                  ))
                ) : (
                  // Actual messages
                  messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isLatest={index === messages.length - 1}
                    />
                  ))
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        {currentConversation && (
          <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="p-4">
              {/* Rate limiting countdown */}
              {uiState.retryCountdown > 0 && (
                <div className="mb-3 text-center">
                  <Badge variant="outline">
                    Try again in {uiState.retryCountdown} seconds
                  </Badge>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    value={uiState.inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your question here..."
                    className={cn(
                      "min-h-[60px] max-h-[120px] resize-none",
                      isOverLimit && "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={loadingState.isSendingMessage || rateLimitInfo?.isLimited}
                  />
                  
                  {/* Character counter */}
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span className={cn(
                      isOverLimit && "text-destructive font-medium"
                    )}>
                      {characterCount}/{maxCharacters} characters
                    </span>
                    
                    {isOverLimit && (
                      <span className="text-destructive">
                        Message too long
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!canSendMessage || isOverLimit}
                  className="self-end"
                >
                  {loadingState.isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              
              {/* Input hint */}
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}