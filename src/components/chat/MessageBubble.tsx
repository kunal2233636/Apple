'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, User, Bot, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage } from '@/app/(app)/chat/page';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  className?: string;
}

export default function MessageBubble({ message, isStreaming = false, className }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get provider display info
  const getProviderInfo = (provider?: string) => {
    if (!provider) return null;
    
    const providerMap: Record<string, { name: string; color: string }> = {
      groq: { name: 'Groq', color: 'bg-purple-500' },
      cerebras: { name: 'Cerebras', color: 'bg-blue-500' },
      mistral: { name: 'Mistral', color: 'bg-orange-500' },
      openrouter: { name: 'OpenRouter', color: 'bg-green-500' },
      gemini: { name: 'Gemini', color: 'bg-red-500' },
      cohere: { name: 'Cohere', color: 'bg-yellow-500' },
    };
    
    return providerMap[provider] || { name: provider, color: 'bg-gray-500' };
  };

  const providerInfo = getProviderInfo(message.provider);

  // Copy message content
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Message copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy message',
        variant: 'destructive',
      });
    }
  };

  // Handle feedback
  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    toast({
      title: 'Feedback recorded',
      description: `Thank you for your ${type === 'like' ? 'positive' : 'negative'} feedback`,
    });
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Get role icon
  const getRoleIcon = () => {
    switch (message.role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'system':
        return <Settings2 className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  // Get role styling
  const getRoleStyling = () => {
    switch (message.role) {
      case 'user':
        return {
          container: 'bg-primary text-primary-foreground ml-auto max-w-[80%]',
          header: 'text-primary-foreground/70',
        };
      case 'assistant':
        return {
          container: 'bg-muted mr-auto max-w-[80%]',
          header: 'text-muted-foreground',
        };
      case 'system':
        return {
          container: 'bg-muted/50 border border-dashed border-muted-foreground/30 mx-auto max-w-[90%]',
          header: 'text-muted-foreground',
        };
      default:
        return {
          container: 'bg-muted mr-auto max-w-[80%]',
          header: 'text-muted-foreground',
        };
    }
  };

  const roleStyling = getRoleStyling();

  return (
    <div className={cn(
      'flex gap-3 group',
      message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        message.role === 'user' ? 'bg-primary/20' : 'bg-muted'
      )}>
        {getRoleIcon()}
      </div>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1', message.role === 'user' ? 'items-end' : 'items-start')}>
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 text-xs px-3 py-1 rounded-lg',
          roleStyling.header,
          message.role === 'system' && 'bg-background/50'
        )}>
          <span className="font-medium">
            {message.role === 'user' ? 'You' : 
             message.role === 'assistant' ? 'AI Assistant' : 'System'}
          </span>
          
          {/* Provider info */}
          {message.role === 'assistant' && providerInfo && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', providerInfo.color)} />
                <span>{providerInfo.name}</span>
              </div>
            </>
          )}
          
          {message.model && (
            <>
              <span>•</span>
              <span className="text-muted-foreground">{message.model}</span>
            </>
          )}
          
          <span>•</span>
          <span>{formatTime(message.timestamp)}</span>
          
          {isStreaming && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>typing...</span>
              </div>
            </>
          )}
        </div>

        {/* Message Bubble */}
        <Card className={cn(
          'p-4 relative group-hover:shadow-sm transition-shadow',
          roleStyling.container
        )}>
          {/* Message Content */}
          <div 
            ref={contentRef}
            className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ 
              __html: message.content.replace(/\n/g, '<br />') 
            }}
          />

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        {message.role !== 'system' && (
          <div className={cn(
            'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}>
            {/* Copy Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>

            {/* Feedback Buttons */}
            {message.role === 'assistant' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6",
                    feedback === 'like' && "text-green-600"
                  )}
                  onClick={() => handleFeedback('like')}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6",
                    feedback === 'dislike' && "text-red-600"
                  )}
                  onClick={() => handleFeedback('dislike')}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </>
            )}

            {/* Token Count */}
            {message.tokensUsed && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {message.tokensUsed} tokens
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}