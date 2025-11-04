'use client';

import { useState, useRef, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatPreferences } from '@/app/(app)/chat/page';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: File[]) => void;
  onFileUpload?: () => void;
  disabled?: boolean;
  preferences: ChatPreferences;
  onUpdatePreferences: (preferences: Partial<ChatPreferences>) => void;
  placeholder?: string;
  maxLength?: number;
}

interface Attachment {
  file: File;
  id: string;
  preview?: string;
}

export default function ChatInput({
  onSendMessage,
  onFileUpload,
  disabled = false,
  preferences,
  onUpdatePreferences,
  placeholder = "Type your message...",
  maxLength = 4000,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(preferences.streamResponses);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle Enter key (but allow Shift+Enter for new lines)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() && attachments.length === 0) return;
    
    onSendMessage(message, attachments.map(a => a.file));
    setMessage('');
    setAttachments([]);
    
    // Focus back to input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
    onFileUpload?.();
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
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
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
    } else {
      // Start recording (this is a placeholder - you'd implement actual voice recording)
      setIsRecording(true);
      // In a real implementation, you'd use the Web Speech API or similar
      console.log('Voice recording not implemented yet');
    }
  };

  const toggleStreaming = () => {
    const newStreaming = !isStreaming;
    setIsStreaming(newStreaming);
    onUpdatePreferences({ streamResponses: newStreaming });
  };

  const getCharacterCount = () => {
    return message.length;
  };

  const getRemainingChars = () => {
    return maxLength - getCharacterCount();
  };

  return (
    <div className="space-y-3">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map(attachment => (
            <Card key={attachment.id} className="p-2 flex items-center gap-2 relative group">
              {/* Preview for images */}
              {attachment.preview ? (
                <img 
                  src={attachment.preview} 
                  alt={attachment.file.name}
                  className="w-8 h-8 object-cover rounded"
                />
              ) : (
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
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
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(attachment.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Input Area */}
      <Card className="p-3">
        <div className="flex items-end gap-2">
          {/* File Upload Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFileUpload}
            disabled={disabled || isRecording}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isRecording}
              className="min-h-[2.5rem] max-h-[8rem] resize-none border-0 p-0 shadow-none focus-visible:ring-0"
              maxLength={maxLength}
            />
            
            {/* Character count */}
            <div className="absolute bottom-1 right-1 text-xs text-muted-foreground">
              {getCharacterCount()}/{maxLength}
            </div>
          </div>

          {/* Voice Recording Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRecording}
            disabled={disabled}
            className={cn(
              "flex-shrink-0",
              isRecording && "text-red-500 bg-red-50 dark:bg-red-950"
            )}
          >
            {isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            size="icon"
            className="flex-shrink-0"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {/* Streaming toggle */}
          <button
            onClick={toggleStreaming}
            className={cn(
              "flex items-center gap-1 hover:text-foreground transition-colors",
              isStreaming && "text-primary"
            )}
          >
            {isStreaming ? (
              <StopCircle className="h-3 w-3" />
            ) : (
              <div className="h-3 w-3 border rounded-full" />
            )}
            <span>Stream</span>
          </button>

          {/* Attachment count */}
          {attachments.length > 0 && (
            <span>
              {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
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
          {/* Provider info */}
          <span>Provider: {preferences.provider}</span>
          
          {/* Remaining characters warning */}
          {getRemainingChars() < 100 && (
            <Badge variant="secondary" className="text-xs">
              {getRemainingChars()} chars left
            </Badge>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.pdf,.doc,.docx,.md,.json,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}