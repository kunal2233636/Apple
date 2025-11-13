// Conversation Settings Component
// ==============================
// Component for managing per-conversation settings

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Brain, 
  MessageSquare, 
  Clock,
  Zap,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ConversationSettings as ConversationSettingsType } from '@/hooks/useConversationPersistence';

interface ConversationSettingsProps {
  settings: ConversationSettingsType;
  onUpdate: (settings: Partial<ConversationSettingsType>) => Promise<ConversationSettingsType | null>;
  className?: string;
}

export function ConversationSettings({ settings, onUpdate, className = '' }: ConversationSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  // Check if settings have changed
  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasChanges(changed);
  }, [localSettings, settings]);

  const handleChange = (field: keyof ConversationSettingsType, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCustomSettingsChange = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      custom_settings: {
        ...prev.custom_settings,
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdate(localSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  const aiProviders = [
    { value: 'groq', label: 'Groq', description: 'Fast inference' },
    { value: 'gemini', label: 'Google Gemini', description: 'Google AI' },
    { value: 'cerebras', label: 'Cerebras', description: 'High performance' },
    { value: 'mistral', label: 'Mistral', description: 'European AI' },
    { value: 'cohere', label: 'Cohere', description: 'Enterprise AI' }
  ];

  const aiModels = {
    groq: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'],
    cerebras: ['llama3.1-8b', 'llama3.1-70b'],
    mistral: ['mistral-7b-instruct', 'mixtral-8x7b-instruct'],
    cohere: ['command', 'command-light']
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Conversation Settings</span>
          </CardTitle>
          <Badge variant="outline">
            {localSettings.ai_provider} / {localSettings.ai_model}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* AI Provider and Model */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="font-medium">AI Configuration</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select 
                value={localSettings.ai_provider} 
                onValueChange={(value) => handleChange('ai_provider', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiProviders.map(provider => (
                    <SelectItem key={provider.value} value={provider.value}>
                      <div className="flex items-center space-x-2">
                        <span>{provider.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {provider.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select 
                value={localSettings.ai_model} 
                onValueChange={(value) => handleChange('ai_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiModels[localSettings.ai_provider as keyof typeof aiModels]?.map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  )) || <SelectItem value="">No models available</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Generation Parameters */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Generation Parameters</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Temperature: {localSettings.temperature}</Label>
              <Slider
                value={[localSettings.temperature]}
                onValueChange={([value]) => handleChange('temperature', value)}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Focused (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                value={localSettings.max_tokens}
                onChange={(e) => handleChange('max_tokens', parseInt(e.target.value) || 2048)}
                min={1}
                max={8192}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Behavior Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Behavior Settings</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stream Responses</Label>
                <p className="text-sm text-muted-foreground">
                  Show responses as they're generated
                </p>
              </div>
              <Switch
                checked={localSettings.stream_responses}
                onCheckedChange={(checked) => handleChange('stream_responses', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Memory Context</Label>
                <p className="text-sm text-muted-foreground">
                  Include relevant memories in responses
                </p>
              </div>
              <Switch
                checked={localSettings.include_memory_context}
                onCheckedChange={(checked) => handleChange('include_memory_context', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Personal Context</Label>
                <p className="text-sm text-muted-foreground">
                  Include user profile information
                </p>
              </div>
              <Switch
                checked={localSettings.include_personal_context}
                onCheckedChange={(checked) => handleChange('include_personal_context', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Save</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save conversations
                </p>
              </div>
              <Switch
                checked={localSettings.auto_save}
                onCheckedChange={(checked) => handleChange('auto_save', checked)}
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <Separator />
        
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            <span className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Advanced Settings</span>
            </span>
            {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="customSettings">Custom Settings (JSON)</Label>
                <Textarea
                  id="customSettings"
                  value={JSON.stringify(localSettings.custom_settings, null, 2)}
                  onChange={(e) => {
                    try {
                      const customSettings = JSON.parse(e.target.value);
                      setLocalSettings(prev => ({
                        ...prev,
                        custom_settings: customSettings
                      }));
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  placeholder="Enter custom settings as JSON"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p>• Custom settings allow fine-tuning of conversation behavior</p>
                <p>• Changes take effect immediately</p>
                <p>• Invalid JSON will not be saved</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {hasChanges ? 'Unsaved changes' : 'All changes saved'}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConversationSettings;