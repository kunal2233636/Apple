'use client';

import React from 'react';
import { GeneralChatMessage } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Clock, Zap, Globe, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: GeneralChatMessage;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAI = message.role === 'assistant';

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format tokens for display
  const formatTokens = (tokens?: number) => {
    if (!tokens) return null;
    return tokens.toLocaleString();
  };

  // Format latency for display
  const formatLatency = (latencyMs?: number) => {
    if (!latencyMs) return null;
    if (latencyMs < 1000) return `${latencyMs}ms`;
    return `${(latencyMs / 1000).toFixed(1)}s`;
  };

  // Loading state component
  const LoadingMessage = () => (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Getting response...</span>
    </div>
  );

  // Error state component
  const ErrorMessage = () => (
    <div className="flex items-center gap-2 text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span>Apologies, response generation error. Trying again...</span>
    </div>
  );

  // Message metadata component
  const MessageMetadata = () => {
    if (!isAI || !message.provider || !message.model) return null;

    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {/* Provider and Model */}
        <span className="flex items-center gap-1">
          <Avatar className="h-4 w-4">
            <AvatarFallback className="text-[8px] p-0">
              {message.provider.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>Powered by {message.model}</span>
        </span>

        {/* Response time */}
        {message.latencyMs && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Response time: {formatLatency(message.latencyMs)}</span>
          </span>
        )}

        {/* Token count */}
        {message.tokensUsed && (
          <span>
            Tokens: {formatTokens(message.tokensUsed)}
          </span>
        )}

        {/* Language indicator */}
        {message.language && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            🇮🇳 {message.language === 'hinglish' ? 'Hinglish' : message.language}
          </Badge>
        )}

        {/* Live search indicator */}
        {message.isTimeSensitive && message.webSearchUsed && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            <Globe className="h-2 w-2 mr-1" />
            📡 Live information
          </Badge>
        )}

        {/* Cached response indicator */}
        {message.cached && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            <Zap className="h-2 w-2 mr-1" />
            ⚡ From cache
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex w-full gap-3 ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-4`}
    >
      {/* AI Avatar (left side only) */}
      {isAI && (
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
            AI
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message content */}
      <div
        className={`max-w-[85%] sm:max-w-[70%] ${
          isUser ? 'order-2' : 'order-1'
        }`}
      >
        {/* Message bubble */}
        <Card
          className={`p-3 ${
            isUser
              ? 'bg-blue-600 text-white border-blue-600'
              : message.isLoading
              ? 'bg-muted/50 border-dashed border-muted-foreground/20'
              : message.isError
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-muted border-border'
          }`}
        >
          {/* Message content */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.isLoading ? (
              <LoadingMessage />
            ) : message.isError ? (
              <ErrorMessage />
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        </Card>

        {/* Message metadata */}
        {isAI && !message.isLoading && !message.isError && (
          <MessageMetadata />
        )}

        {/* Timestamp */}
        <div
          className={`mt-1 text-xs text-muted-foreground ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>

      {/* User Avatar (right side only) */}
      {isUser && (
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0 order-3">
          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
            U
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// Loading skeleton for messages
export function ChatMessageSkeleton() {
  return (
    <div className="flex w-full gap-3 justify-start mb-4">
      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
        <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
          AI
        </AvatarFallback>
      </Avatar>
      
      <div className="max-w-[85%] sm:max-w-[70%]">
        <Card className="p-3 bg-muted border-border">
          <div className="space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-1/2" />
          </div>
        </Card>
        
        <div className="mt-2 flex gap-2">
          <div className="h-3 bg-muted-foreground/20 rounded animate-pulse w-16" />
          <div className="h-3 bg-muted-foreground/20 rounded animate-pulse w-20" />
          <div className="h-3 bg-muted-foreground/20 rounded animate-pulse w-12" />
        </div>
      </div>
    </div>
  );
}