// ConversationList - Conversation Display Component
// =================================================
// Displays the list of conversations with various view modes and actions

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  MessageSquare, 
  MoreHorizontal, 
  Edit, 
  Archive, 
  Trash2, 
  Pin, 
  PinOff,
  Star,
  Calendar,
  Hash,
  User,
  Bot,
  Clock,
  FileText,
  StarIcon
} from 'lucide-react';
import type { DatabaseConversation } from '@/hooks/useConversationPersistence';

interface ConversationListProps {
  conversations: DatabaseConversation[];
  selectedConversations: Set<string>;
  currentConversationId?: string;
  isSelectionMode: boolean;
  viewMode: 'list' | 'grid';
  onConversationSelect: (conversation: DatabaseConversation) => void;
  onConversationAction: (action: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'delete', conversation: DatabaseConversation) => void;
  onEditConversation: (conversation: DatabaseConversation) => void;
}

export function ConversationList({
  conversations,
  selectedConversations,
  currentConversationId,
  isSelectionMode,
  viewMode,
  onConversationSelect,
  onConversationAction,
  onEditConversation
}: ConversationListProps) {
  const router = useRouter();
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null);

  // Group conversations by type
  const groupedConversations = React.useMemo(() => {
    const groups = {
      pinned: conversations.filter(c => c.is_pinned),
      recent: conversations.filter(c => !c.is_pinned && !c.is_archived),
      archived: conversations.filter(c => c.is_archived)
    };
    return groups;
  }, [conversations]);

  // Chat type configurations
  const chatTypeConfig = {
    general: { icon: MessageSquare, label: 'General', color: 'text-blue-500' },
    study_assistant: { icon: User, label: 'Study Assistant', color: 'text-green-500' },
    tutoring: { icon: Bot, label: 'Tutoring', color: 'text-purple-500' },
    review: { icon: FileText, label: 'Review', color: 'text-orange-500' }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  // Handle conversation click
  const handleConversationClick = useCallback((conversation: DatabaseConversation) => {
    if (!isSelectionMode) {
      onConversationSelect(conversation);
    }
  }, [isSelectionMode, onConversationSelect]);

  // Render conversation item
  const renderConversationItem = (conversation: DatabaseConversation, index: number) => {
    const isSelected = selectedConversations.has(conversation.id);
    const isCurrent = currentConversationId === conversation.id;
    const isHovered = hoveredConversationId === conversation.id;
    const config = chatTypeConfig[conversation.chat_type] || chatTypeConfig.general;
    const ChatIcon = config.icon;

    const itemClass = cn(
      "group relative rounded-lg p-3 cursor-pointer transition-all duration-200",
      "hover:bg-accent/50",
      isSelectionMode && "hover:bg-accent",
      isSelected && "bg-accent",
      isCurrent && "bg-accent border-2 border-primary/20",
      viewMode === 'grid' && "aspect-square"
    );

    return (
      <div
        key={conversation.id}
        className={itemClass}
        onClick={() => handleConversationClick(conversation)}
        onMouseEnter={() => setHoveredConversationId(conversation.id)}
        onMouseLeave={() => setHoveredConversationId(null)}
      >
        {/* Selection checkbox (shown in selection mode) */}
        {isSelectionMode && (
          <div className="absolute top-2 right-2 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                // Prevent event bubbling
                event?.stopPropagation();
                handleConversationClick(conversation);
              }}
              className="h-4 w-4"
            />
          </div>
        )}

        {/* Current conversation indicator */}
        {isCurrent && !isSelectionMode && (
          <div className="absolute top-2 right-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}

        <div className={cn(
          "flex items-start space-x-3",
          viewMode === 'grid' && "flex-col space-x-0 space-y-2"
        )}>
          {/* Chat type icon */}
          <div className={cn(
            "flex-shrink-0 rounded-full p-2",
            viewMode === 'grid' && "self-center"
          )}>
            <ChatIcon className={cn("h-4 w-4", config.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and metadata */}
            <div className={cn(
              "flex items-start justify-between",
              viewMode === 'grid' && "flex-col space-y-1"
            )}>
              <h3 className={cn(
                "font-medium text-sm line-clamp-2",
                viewMode === 'grid' && "text-center"
              )}>
                {conversation.title}
              </h3>
              
              {/* Action menu (visible on hover) */}
              {!isSelectionMode && (isHovered || viewMode === 'grid') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEditConversation(conversation);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onConversationAction(
                        conversation.is_pinned ? 'unpin' : 'pin',
                        conversation
                      );
                    }}>
                      {conversation.is_pinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-2" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          Pin
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onConversationAction(
                        conversation.is_archived ? 'unarchive' : 'archive',
                        conversation
                      );
                    }}>
                      {conversation.is_archived ? (
                        <>
                          <Archive className="h-4 w-4 mr-2" />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onConversationAction('delete', conversation);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Metadata */}
            <div className={cn(
              "flex items-center space-x-2 text-xs text-muted-foreground mt-1",
              viewMode === 'grid' && "justify-center flex-wrap"
            )}>
              {/* Message count */}
              {conversation.message_count > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{conversation.message_count}</span>
                </div>
              )}

              {/* Chat type badge */}
              <Badge variant="outline" className="text-xs px-1 py-0">
                {config.label}
              </Badge>

              {/* Pinned indicator */}
              {conversation.is_pinned && (
                <Pin className="h-3 w-3 text-yellow-500" />
              )}

              {/* Archived indicator */}
              {conversation.is_archived && (
                <Archive className="h-3 w-3 text-gray-500" />
              )}
            </div>

            {/* Timestamp */}
            <div className={cn(
              "flex items-center space-x-1 text-xs text-muted-foreground mt-2",
              viewMode === 'grid' && "justify-center"
            )}>
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(conversation.last_activity_at)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render group header
  const renderGroupHeader = (title: string, count: number, icon: React.ElementType) => {
    if (count === 0) return null;
    
    return (
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
          <icon className="h-3 w-3" />
          <span>{title}</span>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </div>
    );
  };

  // Don't render anything if no conversations
  if (conversations.length === 0) {
    return null;
  }

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 gap-3">
          {conversations.map((conversation, index) => 
            renderConversationItem(conversation, index)
          )}
        </div>
      </div>
    );
  }

  // List view with grouping
  return (
    <div className="space-y-0">
      {/* Pinned conversations */}
      {groupedConversations.pinned.length > 0 && (
        <div>
          {renderGroupHeader('Pinned', groupedConversations.pinned.length, Pin)}
          <div className="space-y-1 p-2">
            {groupedConversations.pinned.map((conversation, index) => 
              renderConversationItem(conversation, index)
            )}
          </div>
        </div>
      )}

      {/* Recent conversations */}
      {groupedConversations.recent.length > 0 && (
        <div>
          {renderGroupHeader('Recent', groupedConversations.recent.length, MessageSquare)}
          <div className="space-y-1 p-2">
            {groupedConversations.recent.map((conversation, index) => 
              renderConversationItem(conversation, index)
            )}
          </div>
        </div>
      )}

      {/* Archived conversations */}
      {groupedConversations.archived.length > 0 && (
        <div>
          {renderGroupHeader('Archived', groupedConversations.archived.length, Archive)}
          <div className="space-y-1 p-2">
            {groupedConversations.archived.map((conversation, index) => 
              renderConversationItem(conversation, index)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConversationList;