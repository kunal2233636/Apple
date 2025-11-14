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
  Brain,
  Save,
  RotateCcw,
  Settings,
  Zap,
  Clock,
  Database,
  Globe,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudyBuddySettings {
  // Core study buddy features
  memorySystemEnabled: boolean;
  contextInclusionEnabled: boolean;
  memoryRetentionDays: number;
  cacheTTL: number; // in hours
  // UI/diagnostics prefs (moved from General Chat -> applied to Study Buddy)
  showModelName: boolean;
  showResponseTime: boolean;
  webSearchEnabled: boolean;
  webSearchProvider: 'serper' | 'duckduckgo' | 'google';
}

interface LanguageSettings {
  responseLanguage: string;
  hinglishEnforcement: boolean;
}

interface ChatSettingsTabProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const cacheTTLOptions = [
  { value: 1, label: '1 hour', description: 'Fastest responses, higher costs' },
  { value: 6, label: '6 hours', description: 'Balanced performance' },
  { value: 24, label: '1 day', description: 'Good performance, lower costs' },
  { value: 168, label: '1 week', description: 'Highest savings, slower updates' },
];

const languageOptions = [
  { value: 'english', label: 'English', description: 'Standard English responses' },
  { value: 'hinglish', label: 'Hinglish', description: 'Hindi-English mix' },
  { value: 'hindi', label: 'Hindi', description: 'Full Hindi responses' },
  { value: 'auto', label: 'Auto-detect', description: 'Match user input language' },
];

const retentionOptions = [
  { value: 7, label: '7 days' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
  { value: 365, label: '1 year' },
];

const defaultSettings = {
    studyBuddy: {
      memorySystemEnabled: true,
      contextInclusionEnabled: true,
      memoryRetentionDays: 30,
      cacheTTL: 1,
      showModelName: true,
      showResponseTime: true,
      webSearchEnabled: true,
      webSearchProvider: 'serper',
    } as StudyBuddySettings,
  language: {
    responseLanguage: 'english',
    hinglishEnforcement: false,
  } as LanguageSettings,
};

export function ChatSettingsTab({ onUnsavedChanges }: ChatSettingsTabProps) {
  const [studyBuddy, setStudyBuddy] = useState<StudyBuddySettings>(defaultSettings.studyBuddy);
  const [language, setLanguage] = useState<LanguageSettings>(defaultSettings.language);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const hasUnsavedChanges = () => {
    const hasStudyBuddyChanges = JSON.stringify(studyBuddy) !== JSON.stringify(defaultSettings.studyBuddy);
    const hasLanguageChanges = JSON.stringify(language) !== JSON.stringify(defaultSettings.language);
    return hasStudyBuddyChanges || hasLanguageChanges;
  };

  const handleStudyBuddyChange = (updates: Partial<StudyBuddySettings>) => {
    setStudyBuddy((prev) => ({ ...prev, ...updates }));
    onUnsavedChanges(true);
  };

  const handleLanguageChange = (updates: Partial<LanguageSettings>) => {
    setLanguage((prev) => ({ ...prev, ...updates }));
    onUnsavedChanges(true);
  };

  const saveChatSettings = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      onUnsavedChanges(false);
      toast({ title: 'Settings Saved', description: 'Study Buddy settings saved successfully.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const confirmed = window.confirm('Reset all Study Buddy settings to defaults?');
    if (!confirmed) return;
    setStudyBuddy(defaultSettings.studyBuddy);
    setLanguage(defaultSettings.language);
    onUnsavedChanges(true);
    toast({ title: 'Settings Reset', description: 'All settings reset to defaults.' });
  };

  const getCacheTTLDescription = (ttl: number) => cacheTTLOptions.find((opt) => opt.value === ttl)?.description || '';
  const getLanguageDescription = (lang: string) => languageOptions.find((opt) => opt.value === lang)?.description || '';
  const getRetentionLabel = (days: number) => retentionOptions.find((opt) => opt.value === days)?.label || `${days} days`;

  return (
    <div className="p-6 space-y-8">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={saveChatSettings} disabled={saving || !hasUnsavedChanges()} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button onClick={resetToDefaults} variant="outline" className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Section A: Study Buddy UI & Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Section A: Study Buddy (UI & Diagnostics)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Web Search Integration</Label>
                <p className="text-sm text-muted-foreground">Enable web search for time-sensitive study queries</p>
              </div>
              <Switch checked={studyBuddy.webSearchEnabled} onCheckedChange={(checked) => handleStudyBuddyChange({ webSearchEnabled: checked })} />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">Web Search Provider</Label>
              <p className="text-xs text-muted-foreground">Choose which web search API the system should use</p>
              <Select
                value={studyBuddy.webSearchProvider}
                onValueChange={(value) => handleStudyBuddyChange({ webSearchProvider: value as StudyBuddySettings['webSearchProvider'] })}
              >
                <SelectTrigger className="w-full md:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serper">Serper.dev (Google results)</SelectItem>
                  <SelectItem value="duckduckgo">DuckDuckGo (no tracking)</SelectItem>
                  <SelectItem value="google">Google Custom Search</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Model Name Display</Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Show which AI model was used in responses</p>
                <Switch checked={studyBuddy.showModelName} onCheckedChange={(checked) => handleStudyBuddyChange({ showModelName: checked })} />
              </div>
              {studyBuddy.showModelName && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                  <Badge variant="secondary" className="text-xs">Current: Auto-optimized</Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Response Time Display</Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Show response time to users</p>
                <Switch checked={studyBuddy.showResponseTime} onCheckedChange={(checked) => handleStudyBuddyChange({ showResponseTime: checked })} />
              </div>
              {studyBuddy.showResponseTime && (
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
            <p className="text-sm text-muted-foreground">How long to cache responses before fetching new ones</p>
            <Select value={studyBuddy.cacheTTL.toString()} onValueChange={(value) => handleStudyBuddyChange({ cacheTTL: parseInt(value) })}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cacheTTLOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              {getCacheTTLDescription(studyBuddy.cacheTTL)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Study Buddy Core Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Section B: Study Buddy (Core)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Memory System</Label>
                <p className="text-sm text-muted-foreground">Enable persistent memory for study context and history</p>
              </div>
              <Switch checked={studyBuddy.memorySystemEnabled} onCheckedChange={(checked) => handleStudyBuddyChange({ memorySystemEnabled: checked })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Context Inclusion</Label>
                <p className="text-sm text-muted-foreground">Include user's study progress and recent activity</p>
              </div>
              <Switch checked={studyBuddy.contextInclusionEnabled} onCheckedChange={(checked) => handleStudyBuddyChange({ contextInclusionEnabled: checked })} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Memory Retention Period</Label>
              <p className="text-sm text-muted-foreground">How long to keep conversation history and context</p>
              <Select value={studyBuddy.memoryRetentionDays.toString()} onValueChange={(value) => handleStudyBuddyChange({ memoryRetentionDays: parseInt(value) })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {retentionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Current: {getRetentionLabel(studyBuddy.memoryRetentionDays)}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Cache Time-to-Live</Label>
              <p className="text-sm text-muted-foreground">Shorter cache for study buddy responses</p>
              <Select value={studyBuddy.cacheTTL.toString()} onValueChange={(value) => handleStudyBuddyChange({ cacheTTL: parseInt(value) })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cacheTTLOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                <Database className="h-3 w-3 inline mr-1" />
                {getCacheTTLDescription(studyBuddy.cacheTTL)}
              </div>
            </div>
          </div>
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
              <p className="text-sm text-muted-foreground">Default language for AI responses</p>
              <Select value={language.responseLanguage} onValueChange={(value) => handleLanguageChange({ responseLanguage: value })}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
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
                <p className="text-sm text-muted-foreground">Force responses to use Hindi-English mix for educational content</p>
              </div>
              <Switch checked={language.hinglishEnforcement} onCheckedChange={(checked) => handleLanguageChange({ hinglishEnforcement: checked })} disabled={language.responseLanguage === 'auto'} />
            </div>

            {language.hinglishEnforcement && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <Zap className="h-3 w-3 inline mr-1" />
                  Hinglish mode will be applied to all study responses, mixing Hindi concepts with English explanations for better understanding.
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
              <h4 className="font-medium">Study Buddy (UI & Diagnostics)</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Web Search: {studyBuddy.webSearchEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Web Search Provider: {studyBuddy.webSearchProvider}</div>
                <div>Model Display: {studyBuddy.showModelName ? 'Shown' : 'Hidden'}</div>
                <div>Response Time: {studyBuddy.showResponseTime ? 'Shown' : 'Hidden'}</div>
                <div>Cache TTL: {studyBuddy.cacheTTL}h</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Study Buddy (Core)</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Memory: {studyBuddy.memorySystemEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Context: {studyBuddy.contextInclusionEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Retention: {getRetentionLabel(studyBuddy.memoryRetentionDays)}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Language</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Response: {languageOptions.find((l) => l.value === language.responseLanguage)?.label}</div>
                <div>Hinglish: {language.hinglishEnforcement ? 'Enforced' : 'Optional'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
