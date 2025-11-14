// UniversalChatWithPersistence - Integrated Chat Component
// ========================================================
// Integrates conversation sidebar with existing chat components

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UniversalChatEnhanced } from './UniversalChatEnhanced';
import { UniversalChatEnhanced } from './UniversalChatEnhanced';
import { ConversationSidebar } from './ConversationSidebar';
import { useStudyBuddy } from '@/hooks/use-study-buddy';
import { useConversationPersistence, type DatabaseConversation } from '@/hooks/useConversationPersistence';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Settings,
  History,
  MessageSquare,
  Brain,
  Layout,
  Grid,
  List,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UniversalChatWithPersistenceProps {
  className?: string;
  initialStudyContext?: any;
  showSettings?: boolean;
  showStudyContext?: boolean;
  showProviderSelector?: boolean;
  showMemoryIndicators?: boolean;
  showTeachingMode?: boolean;
  showConversationSidebar?: boolean;
  showConversationHistory?: boolean;
  compact?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'sidebar' | 'sheet' | 'overlay';
  defaultSidebarOpen?: boolean;
  onConversationSelect?: (conversation: DatabaseConversation) => void;
  onStartNewConversation?: () => void;
  chatVariant?: 'base' | 'enhanced' | 'auto';
}

export function UniversalChatWithPersistence({
  className = '',
  initialStudyContext,
  showSettings = true,
  showStudyContext = true,
  showProviderSelector = true,
  showMemoryIndicators = true,
  showTeachingMode = true,
  showConversationSidebar = true,
  showConversationHistory = true,
  compact = false,
  theme = 'auto',
  layout = 'sheet',
  defaultSidebarOpen = false,
  onConversationSelect,
  onStartNewConversation,
  chatVariant = 'auto'
}: UniversalChatWithPersistenceProps) {
  const { toast } = useToast();
  
  // Core study buddy state
  const {
    messages,
    isLoading,
    sessionId,
    conversationId,
    profileData,
    handleSendMessage,
    startNewChat,
    clearChat
  } = useStudyBuddy();

  // Conversation persistence state
  const {
    conversations,
    currentConversation,
    isLoading: conversationsLoading,
    loadConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    loadMessages,
    syncLocalMessages
  } = useConversationPersistence();

  // Local state
  const [isSidebarOpen, setIsSidebarOpen] = useState(defaultSidebarOpen);
  const [layoutMode, setLayoutMode] = useState<'sidebar' | 'sheet' | 'overlay'>(layout);
  const [selectedConversation, setSelectedConversation] = useState<DatabaseConversation | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarLayout, setSidebarLayout] = useState<'grid' | 'list'>('list');

  // Load initial conversations
  useEffect(() => {
    if (showConversationHistory) {
      loadConversations({
        limit: 50,
        sort_by: 'last_activity_at',
        sort_order: 'desc'
      });
    }
  }, [loadConversations, showConversationHistory]);

  // Handle conversation selection
  const handleConversationSelect = useCallback(async (conversation: DatabaseConversation) => {
    try {
      setIsLoadingMessages(true);
      setSelectedConversation(conversation);
      
      // Load messages for the conversation
      const messages = await loadMessages(conversation.id);
      
      // Clear current chat and load conversation messages
      clearChat();
      
      // TODO: Load messages into the chat component
      // This would require modifying the useStudyBuddy hook to accept initial messages
      
      onConversationSelect?.(conversation);
      
      toast({
        title: 'Success',
        description: `Loaded conversation: ${conversation.title}`
      });
      
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [loadMessages, clearChat, onConversationSelect, toast]);

  // Handle new conversation creation
  const handleStartNewConversation = useCallback(async (title?: string) => {
    try {
      const newConversation = await createConversation({
        title: title || 'New Conversation',
        chat_type: 'general',
        metadata: {}
      });

      if (newConversation) {
        setSelectedConversation(newConversation);
        clearChat();
        onStartNewConversation?.();
        
        toast({
          title: 'Success',
          description: 'New conversation created'
        });
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive'
      });
    }
  }, [createConversation, clearChat, onStartNewConversation, toast]);

  // Sync messages when current conversation changes
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        // Sync local messages to database
        syncLocalMessages(conversationId, messages);
      }
    }
  }, [conversationId, messages, conversations, syncLocalMessages]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(!isSidebarOpen);
  }, [isSidebarOpen]);

  // Render chat component
  const renderChatComponent = () => {
    const commonProps = {
      className: '',
      initialStudyContext,
      showSettings,
      showStudyContext,
      showProviderSelector,
      showMemoryIndicators,
      showTeachingMode,
      compact,
      theme
    };

    // For now, use the base UniversalChat component
    // In a real implementation, you'd determine which variant to use
    return <UniversalChat {...commonProps} />;
  };

  // Render sidebar content
  const renderSidebarContent = () => {
    if (!showConversationHistory) return null;

    return (
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onConversationSelect={handleConversationSelect}
        currentConversationId={currentConversation?.id}
        className=""
      />
    );
  };

  // Loading state
  if (isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Conversation Sidebar Toggle Button */}
      {showConversationSidebar && (
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "fixed top-4 left-4 z-50 transition-all duration-300",
            isSidebarOpen && "left-80"
          )}
          title="Toggle Conversation History"
        >
          <History className="h-4 w-4" />
        </Button>
      )}

      {/* Main Chat Content */}
      <div className={cn(
        "transition-all duration-300",
        layoutMode === 'sidebar' && isSidebarOpen ? "ml-80" : ""
      )}>
        {renderChatComponent()}
      </div>

      {/* Conversation Status Indicator */}
      {selectedConversation && (
        <div className="fixed top-4 right-4 z-40">
          <Card className="bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="font-medium">{selectedConversation.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedConversation.message_count} messages
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sidebar Content */}
      {layoutMode === 'sheet' && renderSidebarContent()}

      {/* Layout Mode Toggle (for testing) */}
      {process.env.NODE_ENV === 'development' && showConversationSidebar && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardContent className="p-2">
              <div className="flex items-center space-x-1">
                <Button
                  variant={layoutMode === 'sheet' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLayoutMode('sheet')}
                  className="h-8 w-8 p-0"
                  title="Sheet Layout"
                >
                  <Layout className="h-3 w-3" />
                </Button>
                <Button
                  variant={sidebarLayout === 'list' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSidebarLayout('list')}
                  className="h-8 w-8 p-0"
                  title="List View"
                >
                  <List className="h-3 w-3" />
                </Button>
                <Button
                  variant={sidebarLayout === 'grid' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSidebarLayout('grid')}
                  className="h-8 w-8 p-0"
                  title="Grid View"
                >
                  <Grid className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional conversation management options */}
      {conversations.length > 0 && (
        <div className="fixed bottom-4 left-4 z-40">
          <Card className="bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {conversations.length} conversations
                </Badge>
                {selectedConversation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartNewConversation()}
                    className="h-8"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    New
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default UniversalChatWithPersistence;