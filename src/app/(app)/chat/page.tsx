'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BrainCircuit, Plus, Clock, Zap, Search, Trash2, MessageSquare, Settings, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { GeneralChatMessage, Conversation, SendMessageRequest, CreateConversationRequest } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import crypto from 'crypto';

interface ChatPageProps {}

function ChatPageContent({}: ChatPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  // State management
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<GeneralChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  
  // Mock user ID - in production, get from auth
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle retry countdown
  useEffect(() => {
    if (retryCountdown > 0) {
      countdownRef.current = setTimeout(() => {
        setRetryCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [retryCountdown]);

  const loadConversations = async () => {
    try {
      const response = await fetch(`/api/chat/conversations?userId=${userId}&chatType=general`);
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.data);
        
        // Auto-select first conversation if none selected
        if (!currentConversation && data.data.length > 0) {
          selectConversation(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setIsLoading(true);
    setCurrentConversation(conversation);
    setIsFirstMessage(false);
    
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversation.id}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data.messages);
        setIsFirstMessage(data.data.messages.length === 0);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const requestData: CreateConversationRequest = {
        userId,
        chatType: 'general'
      };

      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      
      if (data.success) {
        const newConversation: Conversation = {
          id: data.data.conversationId,
          title: data.data.title,
          chatType: data.data.chatType,
          createdAt: data.data.created_at,
          updatedAt: data.data.created_at
        };
        
        setCurrentConversation(newConversation);
        setMessages([]);
        setIsFirstMessage(true);
        setConversations(prev => [newConversation, ...prev]);
        
        toast({
          title: 'New conversation',
          description: 'Started a fresh conversation',
        });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new conversation',
        variant: 'destructive',
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // If this was the current conversation, clear it
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
          setIsFirstMessage(true);
        }
        
        toast({
          title: 'Conversation deleted',
          description: 'The conversation has been permanently deleted.',
        });
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending || retryCountdown > 0) return;

    // Create new conversation if needed
    if (!currentConversation) {
      await createNewConversation();
      // Wait a bit for conversation to be created
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);
    setIsFirstMessage(false);

    // Add user message to UI immediately
    const userMessage: GeneralChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Add loading message
    const loadingMessage: GeneralChatMessage = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const requestData: SendMessageRequest = {
        userId,
        conversationId: currentConversation?.id || conversations[0]?.id || '',
        message: messageText,
        chatType: 'general'
      };

      const response = await fetch('/api/chat/general/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      // Remove loading message
      setMessages(prev => prev.filter(m => m.id !== 'loading'));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      if (data.success) {
        const aiMessage: GeneralChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.data.response.content,
          timestamp: data.timestamp,
          provider: data.data.response.provider_used,
          model: data.data.response.model_used,
          tokensUsed: data.data.response.tokens_used.input + data.data.response.tokens_used.output,
          latencyMs: data.data.response.latency_ms,
          isTimeSensitive: data.data.response.isTimeSensitive,
          webSearchUsed: data.data.response.web_search_enabled,
          cached: data.data.response.cached,
          language: data.data.response.language
        };

        setMessages(prev => [...prev.slice(0, -1), aiMessage]);
        
        // Update conversation title if this was first message
        if (currentConversation && isFirstMessage) {
          const title = messageText.length > 50 
            ? messageText.substring(0, 47) + "..." 
            : messageText;
          
          setCurrentConversation(prev => prev ? { ...prev, title } : null);
          setConversations(prev => prev.map(c => 
            c.id === currentConversation?.id ? { ...c, title } : c
          ));
        }

        // Update conversation's updated timestamp
        if (currentConversation) {
          setConversations(prev => prev.map(c => 
            c.id === currentConversation.id 
              ? { ...c, updatedAt: new Date().toISOString() }
              : c
          ));
        }

      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove loading message
      setMessages(prev => prev.filter(m => m.id !== 'loading'));
      
      // Add error message
      const errorMessage: GeneralChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error 
          ? handleErrorMessage(error.message)
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);

      // Handle rate limiting
      if (error instanceof Error && error.message.includes('rate limit')) {
        setRetryCountdown(60);
      }

      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleErrorMessage = (errorMessage: string): string => {
    if (errorMessage.includes('rate limit')) {
      return 'High traffic! Please wait a moment before sending another message.';
    }
    
    if (errorMessage.includes('service unavailable')) {
      return 'Sorry, AI service is temporarily unavailable. Please try again later.';
    }
    
    if (errorMessage.includes('validation failed')) {
      return 'Apologies, response generation error. Trying again...';
    }
    
    return 'Sorry, I encountered an error. Please try again.';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    
    toast({
      title: 'Chat cleared',
      description: 'Your chat history has been cleared.',
    });
  };

  const exportChat = () => {
    const chatData = {
      conversation: currentConversation,
      messages,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${currentConversation?.id || 'new'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Chat exported',
      description: 'Your chat history has been exported.',
    });
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Conversations */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">AI Chat</h2>
            </div>
            <Button 
              size="sm" 
              onClick={createNewConversation}
              disabled={isSending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask general study questions
          </p>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent group ${
                  currentConversation?.id === conversation.id ? 'bg-accent' : ''
                }`}
                onClick={() => selectConversation(conversation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(conversation.updatedAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
            
            {conversations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start a new chat to begin</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6 gap-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">
                  {currentConversation?.title || 'AI Chat'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isFirstMessage ? 'Ask general study questions' : 'Get instant AI responses'}
                </p>
              </div>
            </div>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              {/* Action Buttons */}
              <Button variant="ghost" size="sm" onClick={exportChat}>
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={clearChat}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading conversation...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Welcome to AI Chat!</h3>
                    <p className="text-muted-foreground">
                      Ask me anything about your studies, JEE preparation, or general questions. 
                      I'm here to help with explanations, study tips, and more.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      {/* Message Content */}
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-12'
                            : message.isError
                            ? 'bg-destructive/10 text-destructive border border-destructive/20 mr-12'
                            : 'bg-muted mr-12'
                        }`}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            <span className="text-sm">Getting response...</span>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </div>

                      {/* Message Metadata */}
                      {!message.isLoading && message.role === 'assistant' && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {/* Provider and Model */}
                          <div className="flex items-center gap-1">
                            <span>Powered by</span>
                            <span className="font-medium">
                              {message.model === 'llama-3.3-70b-versatile' 
                                ? 'Groq Llama 3.3 70B' 
                                : message.model || 'AI Model'}
                            </span>
                          </div>

                          {/* Response Time */}
                          {message.latencyMs && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{message.latencyMs}ms</span>
                            </div>
                          )}

                          {/* Tokens */}
                          {message.tokensUsed && (
                            <div>
                              <span>{message.tokensUsed} tokens</span>
                            </div>
                          )}

                          {/* Web Search Indicator */}
                          {message.webSearchUsed && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                              <Search className="h-3 w-3" />
                              <span>Live information</span>
                            </div>
                          )}

                          {/* Cache Indicator */}
                          {message.cached && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full">
                              <Zap className="h-3 w-3" />
                              <span>From cache</span>
                            </div>
                          )}

                          {/* Language Badge */}
                          {message.language === 'hinglish' && (
                            <div className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                              🇮🇳 Hinglish
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question here..."
                  disabled={isSending || retryCountdown > 0}
                  className="pr-16"
                  maxLength={500}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {inputMessage.length}/500
                </div>
              </div>
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isSending || retryCountdown > 0}
                className="px-6"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : retryCountdown > 0 ? (
                  `${retryCountdown}s`
                ) : (
                  'Send'
                )}
              </Button>
            </div>
            
            {retryCountdown > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Try again in {retryCountdown} seconds
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}