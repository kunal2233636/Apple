'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ModelOverride {
  id: string;
  featureNumber: number;
  featureName: string;
  currentModel: string;
  override?: string;
  hasChanges: boolean;
}

interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

interface ModelOverridesTabProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const defaultOverrides: ModelOverride[] = [
  { id: '1', featureNumber: 1, featureName: 'General Chat Response', currentModel: 'groq:llama-3.3-70b-versatile', hasChanges: false },
  { id: '2', featureNumber: 2, featureName: 'Study Assistant Chat', currentModel: 'groq:llama-3.3-70b-versatile', hasChanges: false },
  { id: '3', featureNumber: 3, featureName: 'Time-Sensitive Queries', currentModel: 'gemini:gemini-2.0-flash-lite', hasChanges: false },
  { id: '4', featureNumber: 4, featureName: 'App Data Analysis', currentModel: 'groq:llama-3.3-70b-versatile', hasChanges: false },
  { id: '5', featureNumber: 5, featureName: 'Content Generation', currentModel: 'openrouter:openai/gpt-3.5-turbo', hasChanges: false },
  { id: '6', featureNumber: 6, featureName: 'Question Classification', currentModel: 'cerebras:llama-3.3-70b', hasChanges: false },
  { id: '7', featureNumber: 7, featureName: 'Study Recommendations', currentModel: 'groq:llama-3.3-70b-versatile', hasChanges: false },
  { id: '8', featureNumber: 8, featureName: 'Progress Analysis', currentModel: 'cerebras:llama-3.3-70b', hasChanges: false },
  { id: '9', featureNumber: 9, featureName: 'Concept Explanation', currentModel: 'groq:llama-3.3-70b-versatile', hasChanges: false },
  { id: '10', featureNumber: 10, featureName: 'Problem Solving', currentModel: 'mistral:mistral-large-latest', hasChanges: false },
  { id: '11', featureNumber: 11, featureName: 'Test Preparation', currentModel: 'gemini:gemini-2.5-flash', hasChanges: false },
  { id: '12', featureNumber: 12, featureName: 'Topic Summarization', currentModel: 'openrouter:openai/gpt-3.5-turbo', hasChanges: false },
  { id: '13', featureNumber: 13, featureName: 'Exam Strategies', currentModel: 'groq:llama-3.3-70b-versatile', hasChanges: false },
  { id: '14', featureNumber: 14, featureName: 'Weak Area Identification', currentModel: 'cerebras:llama-3.3-70b', hasChanges: false },
  { id: '15', featureNumber: 15, featureName: 'Learning Path Generation', currentModel: 'gemini:gemini-2.5-flash', hasChanges: false },
  { id: '16', featureNumber: 16, featureName: 'Performance Insights', currentModel: 'mistral:mistral-medium-latest', hasChanges: false },
  { id: '17', featureNumber: 17, featureName: 'Curriculum Planning', currentModel: 'openrouter:openai/gpt-3.5-turbo', hasChanges: false },
  { id: '18', featureNumber: 18, featureName: 'Error Analysis', currentModel: 'groq:llama-3.3-70b-versatile', hasChanges: false },
  { id: '19', featureNumber: 19, featureName: 'Adaptive Tutoring', currentModel: 'cerebras:llama-3.3-70b', hasChanges: false },
  { id: '20', featureNumber: 20, featureName: 'Real-time Feedback', currentModel: 'mistral:mistral-small-latest', hasChanges: false },
  { id: '21', featureNumber: 21, featureName: 'Knowledge Assessment', currentModel: 'gemini:gemini-2.5-flash', hasChanges: false },
  { id: '22', featureNumber: 22, featureName: 'Multi-Modal Analysis', currentModel: 'openrouter:openai/gpt-4o-mini', hasChanges: false }
];

const modelOptions: ModelOption[] = [
  // Groq Models
  { value: 'groq:llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', provider: 'Groq' },
  { value: 'groq:llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', provider: 'Groq' },
  { value: 'groq:mixtral-8x7b-32768', label: 'Mixtral 8x7B 32768', provider: 'Groq' },
  
  // Gemini Models
  { value: 'gemini:gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Gemini' },
  { value: 'gemini:gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', provider: 'Gemini' },
  { value: 'gemini:gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Gemini' },
  { value: 'gemini:gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', provider: 'Gemini' },
  
  // Cerebras Models
  { value: 'cerebras:llama-3.3-70b', label: 'Llama 3.3 70B', provider: 'Cerebras' },
  { value: 'cerebras:llama-3.1-8b', label: 'Llama 3.1 8B', provider: 'Cerebras' },
  
  // Cohere Models
  { value: 'cohere:command', label: 'Command', provider: 'Cohere' },
  { value: 'cohere:command-light', label: 'Command Light', provider: 'Cohere' },
  
  // Mistral Models
  { value: 'mistral:mistral-large-latest', label: 'Mistral Large Latest', provider: 'Mistral' },
  { value: 'mistral:mistral-medium-latest', label: 'Mistral Medium Latest', provider: 'Mistral' },
  { value: 'mistral:mistral-small-latest', label: 'Mistral Small Latest', provider: 'Mistral' },
  
  // OpenRouter Models
  { value: 'openrouter:openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenRouter' },
  { value: 'openrouter:openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenRouter' },
  { value: 'openrouter:anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'OpenRouter' },
  { value: 'openrouter:meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct', provider: 'OpenRouter' }
];

export function ModelOverridesTab({ onUnsavedChanges }: ModelOverridesTabProps) {
  const [overrides, setOverrides] = useState<ModelOverride[]>(defaultOverrides);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOverrideChange = (id: string, newOverride: string) => {
    setOverrides(prev => prev.map(override => {
      const hasChanges = override.currentModel !== newOverride && newOverride !== '';
      return {
        ...override,
        override: newOverride || undefined,
        hasChanges
      };
    }));
    
    // Check if any overrides have changes
    const hasAnyChanges = overrides.some(o => 
      (o.override && o.currentModel !== o.override) || (o.override === '' && o.hasChanges)
    );
    onUnsavedChanges(hasAnyChanges);
  };

  const saveOverrides = async () => {
    setSaving(true);
    
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update the current model for applied overrides
      setOverrides(prev => prev.map(override => ({
        ...override,
        currentModel: override.override || override.currentModel,
        override: undefined,
        hasChanges: false
      })));
      
      onUnsavedChanges(false);
      toast({
        title: 'Overrides Saved',
        description: 'Model overrides have been saved successfully.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save model overrides.'
      });
    } finally {
      setSaving(false);
    }
  };

  const revertToDefaults = () => {
    const confirmed = window.confirm('Are you sure you want to revert all overrides to their default models?');
    if (!confirmed) return;

    setOverrides(defaultOverrides);
    onUnsavedChanges(false);
    
    toast({
      title: 'Overrides Reverted',
      description: 'All model overrides have been reverted to defaults.'
    });
  };

  const getModelDisplayName = (modelValue: string) => {
    const model = modelOptions.find(m => m.value === modelValue);
    return model ? model.label : modelValue;
  };

  const getProviderBadgeColor = (provider: string) => {
    const colors = {
      'Groq': 'bg-green-100 text-green-800',
      'Gemini': 'bg-blue-100 text-blue-800',
      'Cerebras': 'bg-purple-100 text-purple-800',
      'Cohere': 'bg-orange-100 text-orange-800',
      'Mistral': 'bg-indigo-100 text-indigo-800',
      'OpenRouter': 'bg-gray-100 text-gray-800'
    };
    return colors[provider as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getProviderForModel = (modelValue: string) => {
    const model = modelOptions.find(m => m.value === modelValue);
    return model?.provider || 'Unknown';
  };

  const groupedModels = modelOptions.reduce((groups, model) => {
    const provider = model.provider;
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(model);
    return groups;
  }, {} as Record<string, ModelOption[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={saveOverrides}
          disabled={saving || !overrides.some(o => o.hasChanges)}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Overrides'}
        </Button>
        <Button 
          onClick={revertToDefaults}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Revert to Defaults
        </Button>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">Model Override Configuration</p>
          <p className="text-blue-700 dark:text-blue-200 mt-1">
            Override the default AI model for specific features. Changes are highlighted in yellow and require saving to apply.
          </p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Model Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead className="w-64">Feature Name</TableHead>
                  <TableHead className="w-80">Current Model</TableHead>
                  <TableHead className="w-80">Model Override</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((override) => {
                  const currentProvider = getProviderForModel(override.currentModel);
                  const selectedOverrideModel = override.override ? modelOptions.find(m => m.value === override.override) : null;
                  
                  return (
                    <TableRow 
                      key={override.id}
                      className={override.hasChanges ? 'bg-yellow-50 dark:bg-yellow-950/10' : ''}
                    >
                      <TableCell className="font-mono text-sm">
                        {override.featureNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{override.featureName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{getModelDisplayName(override.currentModel)}</div>
                          <Badge variant="outline" className={`text-xs ${getProviderBadgeColor(currentProvider)}`}>
                            {currentProvider}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={override.override || ''}
                          onValueChange={(value) => handleOverrideChange(override.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Use default model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" className="text-muted-foreground">
                              <em>Use default model</em>
                            </SelectItem>
                            {Object.entries(groupedModels).map(([provider, models]) => (
                              <div key={provider}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b">
                                  {provider}
                                </div>
                                {models.map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        {override.hasChanges && (
                          <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Unsaved changes
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}