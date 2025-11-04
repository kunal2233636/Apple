'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Globe, 
  Brain, 
  Save, 
  RotateCcw, 
  Settings,
  Zap,
  Clock,
  Database,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeneralChatSettings {
  webSearchEnabled: boolean;
  showModelName: boolean;
  showResponseTime: boolean;
  cacheTTL: number; // in hours
}

interface StudyAssistantSettings {
  memorySystemEnabled: boolean;
  contextInclusionEnabled: boolean;
  memoryRetentionDays: number;
  cacheTTL: number; // in hours
}

interface LanguageSettings {
  responseLanguage: string;
  hinglishEnforcement: boolean;
}

interface ChatSettingsTabProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const defaultSettings = {
  general: {
    webSearchEnabled: true,
    showModelName: true,
    showResponseTime: true,
    cacheTTL: 6
  },
  studyAssistant: {
    memorySystemEnabled: true,
    contextInclusionEnabled: true,
    memoryRetentionDays: 30,
    cacheTTL: 1
  },
  language: {
    responseLanguage: 'english',
    hinglishEnforcement: false
  }
};

const cacheTTLOptions = [
  { value: 1, label: '1 hour', description: 'Fastest responses, higher costs' },
  { value: 6, label: '6 hours', description: 'Balanced performance' },
  { value: 24, label: '1 day', description: 'Good performance, lower costs' },
  { value: 168, label: '1 week', description: 'Highest savings, slower updates' }
];

const languageOptions = [
  { value: 'english', label: 'English', description: 'Standard English responses' },
  { value: 'hinglish', label: 'Hinglish', description: 'Hindi-English mix' },
  { value: 'hindi', label: 'Hindi', description: 'Full Hindi responses' },
  { value: 'auto', label: 'Auto-detect', description: 'Match user input language' }
];

const retentionOptions = [
  { value: 7, label: '7 days' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
  { value: 365, label: '1 year' }
];

export function ChatSettingsTab({ onUnsavedChanges }: ChatSettingsTabProps) {
  const [general, setGeneral] = useState<GeneralChatSettings>(defaultSettings.general);
  const [studyAssistant, setStudyAssistant] = useState<StudyAssistantSettings>(defaultSettings.studyAssistant);
  const [language, setLanguage] = useState<LanguageSettings>(defaultSettings.language);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const hasUnsavedChanges = () => {
    const hasGeneralChanges = JSON.stringify(general) !== JSON.stringify(defaultSettings.general);
    const hasStudyAssistantChanges = JSON.stringify(studyAssistant) !== JSON.stringify(defaultSettings.studyAssistant);
    const hasLanguageChanges = JSON.stringify(language) !== JSON.stringify(defaultSettings.language);
    return hasGeneralChanges || hasStudyAssistantChanges || hasLanguageChanges;
  };

  const handleGeneralChange = (updates: Partial<GeneralChatSettings>) => {
    setGeneral(prev => ({ ...prev, ...updates }));
    onUnsavedChanges(true);
  };

  const handleStudyAssistantChange = (updates: Partial<StudyAssistantSettings>) => {
    setStudyAssistant(prev => ({ ...prev, ...updates }));
    onUnsavedChanges(true);
  };

  const handleLanguageChange = (updates: Partial<LanguageSettings>) => {
    setLanguage(prev => ({ ...prev, ...updates }));
    onUnsavedChanges(true);
  };

  const saveChatSettings = async () => {
    setSaving(true);
    
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onUnsavedChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'Chat settings have been saved successfully.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save chat settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const confirmed = window.confirm('Are you sure you want to reset all chat settings to defaults?');
    if (!confirmed) return;

    setGeneral(defaultSettings.general);
    setStudyAssistant(defaultSettings.studyAssistant);
    setLanguage(defaultSettings.language);
    onUnsavedChanges(true);
    
    toast({
      title: 'Settings Reset',
      description: 'All chat settings have been reset to defaults.'
    });
  };

  const getCacheTTLDescription = (ttl: number) => {
    const option = cacheTTLOptions.find(opt => opt.value === ttl);
    return option?.description || '';
  };

  const getLanguageDescription = (lang: string) => {
    const option = languageOptions.find(opt => opt.value === lang);
    return option?.description || '';
  };

  const getRetentionLabel = (days: number) => {
    const option = retentionOptions.find(opt => opt.value === days);
    return option?.label || `${days} days`;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={saveChatSettings}
          disabled={saving || !hasUnsavedChanges()}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Chat Settings'}
        </Button>
        <Button 
          onClick={resetToDefaults}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Section A: General Chat Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Section A: General Chat Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Web Search Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Enable real-time web search for time-sensitive queries
                </p>
              </div>
              <Switch
                checked={general.webSearchEnabled}
                onCheckedChange={(checked) => handleGeneralChange({ webSearchEnabled: checked })}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Model Name Display</Label>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Show which AI model was used in responses
                  </p>
                </div>
                <Switch
                  checked={general.showModelName}
                  onCheckedChange={(checked) => handleGeneralChange({ showModelName: checked })}
                />
              </div>
              {general.showModelName && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                  <Badge variant="secondary" className="text-xs">
                    Current: Llama 3.3 70B (Groq)
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Response Time Display</Label>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Show response time to users
                  </p>
                </div>
                <Switch
                  checked={general.showResponseTime}
                  onCheckedChange={(checked) => handleGeneralChange({ showResponseTime: checked })}
                />
              </div>
              {general.showResponseTime && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3" />
                    <span>Average: 247ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-base font-medium">Cache Time-to-Live</Label>
            <p className="text-sm text-muted-foreground">
              How long to cache responses before fetching new ones
            </p>
            <Select
              value={general.cacheTTL.toString()}
              onValueChange={(value) => handleGeneralChange({ cacheTTL: parseInt(value) })}
            >
              <SelectTrigger className="w-full md:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cacheTTLOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              {getCacheTTLDescription(general.cacheTTL)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Study Assistant Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Section B: Study Assistant Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Memory System</Label>
                <p className="text-sm text-muted-foreground">
                  Enable persistent memory for study context and conversation history
                </p>
              </div>
              <Switch
                checked={studyAssistant.memorySystemEnabled}
                onCheckedChange={(checked) => handleStudyAssistantChange({ memorySystemEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Context Inclusion</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically include user's study progress and recent activity
                </p>
              </div>
              <Switch
                checked={studyAssistant.contextInclusionEnabled}
                onCheckedChange={(checked) => handleStudyAssistantChange({ contextInclusionEnabled: checked })}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Memory Retention Period</Label>
              <p className="text-sm text-muted-foreground">
                How long to keep conversation history and context
              </p>
              <Select
                value={studyAssistant.memoryRetentionDays.toString()}
                onValueChange={(value) => handleStudyAssistantChange({ memoryRetentionDays: parseInt(value) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {retentionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Current: {getRetentionLabel(studyAssistant.memoryRetentionDays)}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Cache Time-to-Live</Label>
              <p className="text-sm text-muted-foreground">
                Shorter cache for study assistant responses
              </p>
              <Select
                value={studyAssistant.cacheTTL.toString()}
                onValueChange={(value) => handleStudyAssistantChange({ cacheTTL: parseInt(value) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cacheTTLOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                <Database className="h-3 w-3 inline mr-1" />
                {getCacheTTLDescription(studyAssistant.cacheTTL)}
              </div>
            </div>
          </div>

          {studyAssistant.memorySystemEnabled && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">Memory System Active</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-200">
                Study Assistant will maintain context across conversations, remember user preferences,
                and provide personalized responses based on learning progress.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section C: Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Section C: Language Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Response Language</Label>
              <p className="text-sm text-muted-foreground">
                Default language for AI responses
              </p>
              <Select
                value={language.responseLanguage}
                onValueChange={(value) => handleLanguageChange({ responseLanguage: value })}
              >
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                <Globe className="h-3 w-3 inline mr-1" />
                {getLanguageDescription(language.responseLanguage)}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Hinglish Enforcement</Label>
                <p className="text-sm text-muted-foreground">
                  Force responses to use Hindi-English mix for educational content
                </p>
              </div>
              <Switch
                checked={language.hinglishEnforcement}
                onCheckedChange={(checked) => handleLanguageChange({ hinglishEnforcement: checked })}
                disabled={language.responseLanguage === 'auto'}
              />
            </div>

            {language.hinglishEnforcement && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <Zap className="h-3 w-3 inline mr-1" />
                  Hinglish mode will be applied to all study-related responses,
                  mixing Hindi concepts with English explanations for better understanding.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">General Chat</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Web Search: {general.webSearchEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Model Display: {general.showModelName ? 'Shown' : 'Hidden'}</div>
                <div>Response Time: {general.showResponseTime ? 'Shown' : 'Hidden'}</div>
                <div>Cache TTL: {general.cacheTTL}h</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Study Assistant</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Memory: {studyAssistant.memorySystemEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Context: {studyAssistant.contextInclusionEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Retention: {getRetentionLabel(studyAssistant.memoryRetentionDays)}</div>
                <div>Cache TTL: {studyAssistant.cacheTTL}h</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Language</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Response: {languageOptions.find(l => l.value === language.responseLanguage)?.label}</div>
                <div>Hinglish: {language.hinglishEnforcement ? 'Enforced' : 'Optional'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}