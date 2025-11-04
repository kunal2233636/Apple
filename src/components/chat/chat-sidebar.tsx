'use client';

import React from 'react';
import { Conversation } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  MessageCircle, 
  Trash2, 
  Calendar,
  Clock,
  Loader2,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  isCreating: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onStartNewChat: () => void;
  onDeleteConversation: (conversationId: string) => void;
  className?: string;
}

export function ChatSidebar({
  conversations,
  selectedConversation,
  isLoading,
  isCreating,
  onSelectConversation,
  onStartNewChat,
  onDeleteConversation,
  className = '',
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter conversations based on search query
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Handle conversation deletion with confirmation
  const handleDeleteConversation = (conversationId: string, title: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent conversation selection
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    );
    
    if (confirmed) {
      onDeleteConversation(conversationId);
    }
  };

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat History
          </h2>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* New Chat button */}
        <Button 
          onClick={onStartNewChat}
          disabled={isCreating}
          className="w-full"
          size="sm"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </>
          )}
        </Button>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg border">
                  <div className="h-4 bg-muted-foreground/20 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted-foreground/20 rounded animate-pulse w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            // Empty state
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No conversations found' : 'No chats yet'}
              </p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Start a new chat to begin'}
              </p>
            </div>
          ) : (
            // Conversations list
            <div className="space-y-1">
              {filteredConversations.map((conversation) => {
                const isSelected = selectedConversation?.id === conversation.id;
                
                return (
                  <div
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    className={`
                      group relative p-3 rounded-lg border cursor-pointer transition-all
                      hover:bg-muted/50 hover:border-muted-foreground/20
                      ${isSelected 
                        ? 'bg-primary/5 border-primary/20 shadow-sm' 
                        : 'border-border/50'
                      }
                    `}
                  >
                    {/* Conversation title */}
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-medium leading-tight pr-2 line-clamp-2">
                        {conversation.title}
                      </h3>
                      
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => 
                          handleDeleteConversation(conversation.id, conversation.title, e)
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Conversation metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(conversation.updatedAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(conversation.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Chat type badge */}
                    <div className="mt-2 flex justify-between items-center">
                      <Badge 
                        variant={conversation.chatType === 'general' ? 'default' : 'secondary'}
                        className="text-[10px] px-1 py-0"
                      >
                        {conversation.chatType === 'general' ? 'General' : 'Study Assistant'}
                      </Badge>
                      
                      {conversation.messageCount !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary rounded-r" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with stats */}
      {conversations.length > 0 && (
        <div className="p-4 border-t bg-muted/20">
          <div className="text-xs text-muted-foreground text-center">
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            {searchQuery && ` (${conversations.length} total)`}
          </div>
        </div>
      )}
    </Card>
  );
}

// Mobile responsive sidebar that can be toggled
export function MobileChatSidebar({
  conversations,
  selectedConversation,
  isLoading,
  isCreating,
  onSelectConversation,
  onStartNewChat,
  onDeleteConversation,
  isOpen,
  onToggle,
  className = '',
}: ChatSidebarProps & { 
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className={`fixed top-4 left-4 z-50 ${className}`}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        History
      </Button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
        onClick={onToggle}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-80 z-50 lg:relative lg:z-auto
        transform transition-transform duration-300 ease-in-out
        lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${className}
      `}>
        <ChatSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          isLoading={isLoading}
          isCreating={isCreating}
          onSelectConversation={(conv) => {
            onSelectConversation(conv);
            // Close sidebar on mobile after selection
            if (window.innerWidth < 1024) {
              onToggle();
            }
          }}
          onStartNewChat={onStartNewChat}
          onDeleteConversation={onDeleteConversation}
          className="h-full"
        />
        
        {/* Close button for mobile */}
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 lg:hidden"
        >
          ×
        </Button>
      </div>
    </>
  );
}