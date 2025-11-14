'use client';

import React, { useState } from 'react';
import {
  User,
  Bot,
  Clock,
  Zap,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Database,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Highlighter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/study-buddy';
import { useToast } from '@/hooks/use-toast';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SaveButton } from './SaveButton';
import { useGoogleDriveSave } from '@/hooks/useGoogleDriveSave';

interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
  showMemoryReferences?: boolean;
  className?: string;
  userId?: string;
  summaryProvider?: string;
  summaryModel?: string;
}

export function MessageBubble({ 
  message, 
  isTyping = false, 
  showMemoryReferences = false,
  className = '',
  userId,
  summaryProvider,
  summaryModel,
}: MessageBubbleProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [isHighlightOpen, setIsHighlightOpen] = useState(false);
  const [highlightText, setHighlightText] = useState(message.content);
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Format timestamp
  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // Handle feedback
  const handleFeedback = (isPositive: boolean) => {
    setLiked(isPositive);
    toast({
      title: isPositive ? 'Thanks for the feedback!' : 'Feedback recorded',
      description: isPositive ? 'I\'m glad this was helpful!' : 'I\'ll work on improving this response.',
    });
  };

  const handleOpenHighlight = () => {
    setHighlightText(message.content);
    setIsHighlightOpen(true);
  };

  const handleSaveHighlight = async () => {
    if (!highlightText.trim()) {
      toast({
        title: 'Nothing to highlight',
        description: 'Please enter the text you want to highlight before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSavingHighlight(true);
      const response = await fetch('/api/resources/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          highlightText,
          fullText: message.content,
          title: highlightText.slice(0, 80),
          // Summary provider/model are optional – backend will fall back to defaults if undefined
          provider: summaryProvider,
          model: summaryModel,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to save highlight');
      }

      toast({
        title: 'Saved to Resources',
        description: 'Highlight and summary added to your Resources.',
      });
      setIsHighlightOpen(false);
    } catch (error) {
      console.error('Failed to save highlight:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save highlight.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingHighlight(false);
    }
  };

  // Get model badge color
  const getModelBadgeColor = (provider?: string) => {
    switch (provider) {
      case 'groq': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'openai': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'anthropic': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'gemini': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cohere': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'mistral': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cerebras': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className={cn(
      'flex w-full mb-4',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      <div className={cn(
        'flex max-w-[85%] group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser 
            ? 'bg-primary text-primary-foreground ml-2' 
            : 'bg-muted text-muted-foreground mr-2'
        )}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col space-y-1">
          {/* Message Bubble */}
          <Card className={cn(
            'p-4 shadow-sm',
            isUser 
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md' 
              : 'bg-background border rounded-2xl rounded-bl-md'
          )}>
            <div className="space-y-3">
              {/* Message Text - Now using MarkdownRenderer */}
              <div className="markdown-content">
                <MarkdownRenderer content={message.content} />
              </div>

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-xs">Thinking...</span>
                </div>
              )}
            </div>
          </Card>

          {/* Message Metadata */}
          <div className="flex items-center space-x-2 px-1">
            {/* Timestamp */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatTime(message.timestamp)}</span>
            </div>

            {/* Model/Provider Info */}
            {isAssistant && (message.provider || message.model) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className={cn('text-xs', getModelBadgeColor(message.provider))}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {message.model || message.provider}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">AI Model Information</p>
                      {message.provider && <p>Provider: {message.provider}</p>}
                      {message.model && <p>Model: {message.model}</p>}
                      {message.tokensUsed && <p>Tokens: {message.tokensUsed}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Memory References */}
            {showMemoryReferences && message.memory_references && message.memory_references.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      <Database className="w-3 h-3 mr-1" />
                      {message.memory_references.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">Memory References</p>
                      <p>{message.memory_references.length} related memories found</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isAssistant && (
                <>
                  {/* Copy Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>

                  {/* Feedback Buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleFeedback(true)}
                  >
                    <ThumbsUp className={cn(
                      'w-3 h-3',
                      liked === true ? 'text-green-500' : 'text-muted-foreground'
                    )} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleFeedback(false)}
                  >
                    <ThumbsDown className={cn(
                      'w-3 h-3',
                      liked === false ? 'text-red-500' : 'text-muted-foreground'
                    )} />
                  </Button>
                </>
              )}

              {/* Highlight & save to Resources (available for both user and assistant messages) */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleOpenHighlight}
              >
                <Highlighter className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Highlight & Save dialog */}
      <Dialog open={isHighlightOpen} onOpenChange={setIsHighlightOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Highlighter className="h-4 w-4" />
              Highlight & save to Resources
            </DialogTitle>
            <DialogDescription>
              Select the specific part of this message you want to highlight. It will be saved to the Resources page together with an AI-generated summary of the rest of this message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <label className="text-xs font-medium text-muted-foreground">Highlighted text</label>
            <Textarea
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHighlightOpen(false)}
                disabled={isSavingHighlight}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveHighlight}
                disabled={isSavingHighlight}
              >
                {isSavingHighlight ? 'Saving…' : 'Save to Resources'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MessageBubble;