'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Square, 
  Loader2, 
  StopCircle,
  Upload,
  X,
  Image,
  FileText,
  Smile,
  CornerUpLeft,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatPreferences } from '@/types/study-buddy';

interface MobileChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string, attachments?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  showAttachments?: boolean;
  onAttachmentClick?: () => void;
  preferences?: ChatPreferences;
  onUpdatePreferences?: (preferences: Partial<ChatPreferences>) => void;
  maxLength?: number;
  // Optional Study Mode toggle (used by Study Buddy mobile UI)
  showStudyModeToggle?: boolean;
  isStudyMode?: boolean;
  onToggleStudyMode?: (value: boolean) => void;
}

interface Attachment {
  file: File;
  id: string;
  preview?: string;
}

export function MobileChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Ask me anything about your studies...",
  showAttachments = true,
  onAttachmentClick,
  preferences,
  onUpdatePreferences,
  maxLength = 4000,
  showStudyModeToggle,
  isStudyMode,
  onToggleStudyMode,
}: MobileChatInputProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  // Handle Enter key (but allow Shift+Enter for new lines)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!value.trim() && attachments.length === 0) return;
    
    onSubmit(value, attachments.map(a => a.file));
    setValue('');
    setAttachments([]);
    
    // Focus back to input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const setValue = (newValue: string) => {
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
    onAttachmentClick?.();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      const attachment: Attachment = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => 
            prev.map(att => 
              att.id === attachment.id 
                ? { ...att, preview: e.target?.result as string }
                : att
            )
          );
        };
        reader.readAsDataURL(file);
      }

      setAttachments(prev => [...prev, attachment]);
    });

    // Clear input
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // In a real implementation, you'd stop the actual recording here
    } else {
      // Start recording
      setIsRecording(true);
      // In a real implementation, you'd start voice recording here
      console.log('Voice recording not implemented yet');
    }
  };

  const toggleStreaming = () => {
    if (onUpdatePreferences && preferences) {
      const newStreaming = !preferences.streamResponses;
      onUpdatePreferences({ streamResponses: newStreaming });
    }
  };

  const getCharacterCount = () => {
    return value.length;
  };

  const getRemainingChars = () => {
    return maxLength - getCharacterCount();
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          const attachment: Attachment = {
            file,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          };

          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              setAttachments(prev => 
                prev.map(att => 
                  att.id === attachment.id 
                    ? { ...att, preview: e.target?.result as string }
                    : att
                )
              );
            };
            reader.readAsDataURL(file);
          }

          setAttachments(prev => [...prev, attachment]);
        }
      }
    }
  };

  const isSubmitDisabled = isLoading || (!value.trim() && attachments.length === 0);
  const showStreamingToggle = preferences && onUpdatePreferences;

  return (
    <div className="space-y-2" role="form" aria-label="Mobile chat input">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {attachments.map(attachment => (
            <Card key={attachment.id} className="p-2 flex items-center gap-2 relative group">
              {/* Preview for images */}
              {attachment.preview ? (
                <img 
                  src={attachment.preview} 
                  alt={attachment.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  {getFileIcon(attachment.file)}
                </div>
              )}
              
              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {attachment.file.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file.size)}
                </div>
              </div>
              
              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 opacity-100 transition-opacity"
                onClick={() => removeAttachment(attachment.id)}
              >
                <X className="h-5 w-5" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Input Area - Mobile Optimized */}
      <Card className={cn(
        "p-3 border-0 shadow-none",
        isFocused && "bg-accent/50"
      )}>
        <div className="flex items-end gap-2">
          {/* Quick Actions - Hidden on small screens unless focused */}
          <div className={cn(
            "flex items-center gap-1",
            isFocused || attachments.length > 0 ? "opacity-100" : "opacity-50"
          )}>
            {/* File Upload Button */}
            {showAttachments && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFileUpload}
                aria-label="Attach files"
                disabled={isLoading || isRecording}
                className="h-11 w-11 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            )}

            {/* Voice Recording Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              disabled={isLoading}
              className={cn(
                "h-11 w-11",
                isRecording && "text-red-500"
              )}
            >
              {isRecording ? (
                <Square className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Text Input - Mobile Optimized */}
          <div className="flex-1 relative">
            <Textarea
              aria-label="Message input"
              aria-multiline="true"
              aria-invalid={value.length >= maxLength}
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={isLoading || isRecording}
              className="min-h-[2.5rem] max-h-[6rem] resize-none border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent text-base leading-6"
              maxLength={maxLength}
            />
            
            {/* Character count - only show when near limit */}
            {getRemainingChars() < 200 && (
              <div className={cn(
                "absolute bottom-1 right-1 text-xs transition-all duration-200",
                getRemainingChars() < 50 ? "text-red-500 font-medium" : "text-muted-foreground"
              )}>
                {getRemainingChars()}
              </div>
            )}
          </div>

          {/* Send Button - Large Touch Target */}
          <Button
            onClick={handleSubmit}
            aria-label="Send message"
            disabled={isSubmitDisabled}
            size="icon"
            className={cn(
              "h-12 w-12 transition-all duration-200",
              isSubmitDisabled 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:scale-105 active:scale-95"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Status Bar */}
        <div className={cn(
          "flex items-center justify-between text-xs text-muted-foreground transition-all duration-200",
          (isFocused || attachments.length > 0) && "mt-2 pt-2 border-t"
        )}>
          <div className="flex items-center gap-2">
            {/* Attachment count */}
            {attachments.length > 0 && (
              <span className="text-xs bg-muted px-2 py-1 rounded-full">
                {attachments.length} file{attachments.length !== 1 ? 's' : ''}
              </span>
            )}

            {/* Voice recording indicator */}
            {isRecording && (
              <Badge variant="destructive" className="text-xs">
                Recording...
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Study Mode toggle (Study Buddy) */}
            {showStudyModeToggle && onToggleStudyMode && (
              <button
                onClick={() => onToggleStudyMode(!isStudyMode)}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors",
                  isStudyMode
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                )}
              >
                <GraduationCap className="h-3 w-3" />
                <span>Study</span>
                {isStudyMode && <span className="ml-1">ON</span>}
              </button>
            )}

            {/* Streaming toggle */}
            {showStreamingToggle && (
              <button
                onClick={toggleStreaming}
                className={cn(
                  "flex items-center gap-1 text-xs hover:text-foreground transition-colors",
                  preferences.streamResponses && "text-primary font-medium"
                )}
              >
                {preferences.streamResponses ? (
                  <StopCircle className="h-3 w-3" />
                ) : (
                  <div className="h-3 w-3 border-2 border-current rounded-full" />
                )}
                <span>Stream</span>
              </button>
            )}

            {/* Provider indicator */}
            {preferences?.provider && (
              <span className="text-xs bg-muted px-2 py-1 rounded-full">
                {preferences.provider}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.pdf,.doc,.docx,.md,.json,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}