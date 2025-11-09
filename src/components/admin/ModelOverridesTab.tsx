m'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  Settings,
  Code,
  Zap,
  Brain,
  MessageSquare,
  Shield,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ModelOverride {
  id: string;
  name: string;
  provider: string;
  modelName: string;
  enabled: boolean;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    systemPrompt?: string;
    maxContext?: number;
    responseFormat?: string;
  };
  customInstructions: string;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  costSettings?: {
    pricePerInputToken: number;
    pricePerOutputToken: number;
  };
}

function getDefaultOverrides(): ModelOverride[] {
  return [
    {
      id: 'override_groq_llama',
      name: 'Groq Llama Default',
      provider: 'groq',
      modelName: 'llama-3.3-70b-versatile',
      enabled: true,
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1.0
      },
      customInstructions: 'Default configuration for Groq Llama models'
    }
  ];
}

const DEFAULT_PROVIDERS = [
  'groq', 'gemini', 'cerebras', 'cohere', 'mistral', 'openrouter'
];

const COMMON_MODELS = {
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash-lite'],
  cerebras: ['llama-3.1-70b', 'llama-3.1-8b'],
  cohere: ['command-r-plus', 'command-r', 'command', 'command-light'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mixtral-8x7b-instruct-v0.1'],
  openrouter: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro']
};

export function ModelOverridesTab() {
  const [overrides, setOverrides] = useState<ModelOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/model-overrides');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOverrides(data.data);
        } else {
          // Use default overrides if none exist
          setOverrides(getDefaultOverrides());
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to load model overrides, using defaults:', error);
      setOverrides(getDefaultOverrides());
    } finally {
      setLoading(false);
    }
  };

  const saveOverrides = async () => {
    try {
      console.log('Starting to save overrides:', overrides);
      setSaving(true);
      const response = await fetch('/api/admin/model-overrides', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Details': btoa(JSON.stringify(overrides))
        },
        body: JSON.stringify(overrides)
      });
      
      console.log('Save response:', response);
      
      if (!response.ok) {
        const errorDetails = await response.json();
        console.error('Save failed:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorDetails
        });
        throw new Error(`Failed to save overrides: ${errorDetails?.error || response.statusText}`);
      }
      
      setHasUnsavedChanges(false);
      alert('Model overrides saved successfully!');
    } catch (error) {
      console.error('Failed to save overrides:', {
        error: error instanceof Error ? error : new Error(String(error)),
        overrides: overrides
      });
      alert('Failed to save overrides. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  const addOverride = () => {
    const newOverride: ModelOverride = {
      id: `override_${Date.now()}`,
      name: 'New Override',
      provider: 'groq',
      modelName: '',
      enabled: true,
      parameters: {
        temperature: 0.7,
        maxTokens: 4096
      },
      customInstructions: ''
    };
    setOverrides([...overrides, newOverride]);
    setHasUnsavedChanges(true);
  };

  const deleteOverride = (id: string) => {
    setOverrides(overrides.filter(o => o.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateOverride = (id: string, updates: Partial<ModelOverride>) => {
    setOverrides(overrides.map(o => 
      o.id === id ? { ...o, ...updates } : o
    ));
    setHasUnsavedChanges(true);
  };

  const updateParameter = (id: string, param: string, value: any) => {
    setOverrides(overrides.map(o => 
      o.id === id ? {
        ...o,
        parameters: { ...o.parameters, [param]: value }
      } : o
    ));
    setHasUnsavedChanges(true);
  };

  const filteredOverrides = activeTab === 'all' 
    ? overrides 
    : overrides.filter(o => o.provider === activeTab);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Model Overrides</h2>
          <p className="text-muted-foreground">
            Customize specific model configurations and parameters for fine-tuning behavior.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Alert className="mr-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes
              </AlertDescription>
            </Alert>
          )}
          <Button onClick={addOverride} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Override
          </Button>
          <Button onClick={saveOverrides} disabled={saving || !hasUnsavedChanges}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Provider Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All Providers</TabsTrigger>
          {DEFAULT_PROVIDERS.map(provider => (
            <TabsTrigger key={provider} value={provider} className="capitalize">
              {provider}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {filteredOverrides.map((override) => (
            <ModelOverrideCard
              key={override.id}
              override={override}
              onUpdate={updateOverride}
              onUpdateParameter={updateParameter}
              onDelete={() => deleteOverride(override.id)}
            />
          ))}
          
          {filteredOverrides.length === 0 && (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Model Overrides</h3>
              <p className="text-muted-foreground mb-4">
                Create custom configurations for specific models to override default behavior.
              </p>
              <Button onClick={addOverride}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Override
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ModelOverrideCardProps {
  override: ModelOverride;
  onUpdate: (id: string, updates: Partial<ModelOverride>) => void;
  onUpdateParameter: (id: string, param: string, value: any) => void;
  onDelete: () => void;
}

function ModelOverrideCard({ override, onUpdate, onUpdateParameter, onDelete }: ModelOverrideCardProps) {
  const availableModels = COMMON_MODELS[override.provider as keyof typeof COMMON_MODELS] || [];

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <Input
                value={override.name}
                onChange={(e) => onUpdate(override.id, { name: e.target.value })}
                className="font-medium"
                placeholder="Override name"
              />
            </div>
            <Badge variant={override.enabled ? 'default' : 'secondary'}>
              {override.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={override.enabled}
              onCheckedChange={(enabled) => onUpdate(override.id, { enabled })}
            />
            <Button onClick={onDelete} variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Provider</Label>
            <Select
              value={override.provider}
              onValueChange={(provider) => onUpdate(override.id, { provider })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_PROVIDERS.map(provider => (
                  <SelectItem key={provider} value={provider} className="capitalize">
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Model</Label>
            <Select
              value={override.modelName}
              onValueChange={(modelName) => onUpdate(override.id, { modelName })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(model => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Model Parameters
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Temperature ({override.parameters.temperature})</Label>
              <Input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={override.parameters.temperature || 0.7}
                onChange={(e) => onUpdateParameter(override.id, 'temperature', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={override.parameters.maxTokens || 4096}
                onChange={(e) => onUpdateParameter(override.id, 'maxTokens', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Top P ({override.parameters.topP || 1.0})</Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={override.parameters.topP || 1.0}
                onChange={(e) => onUpdateParameter(override.id, 'topP', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Frequency Penalty</Label>
              <Input
                type="number"
                min="-2"
                max="2"
                step="0.1"
                value={override.parameters.frequencyPenalty || 0}
                onChange={(e) => onUpdateParameter(override.id, 'frequencyPenalty', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>Presence Penalty</Label>
              <Input
                type="number"
                min="-2"
                max="2"
                step="0.1"
                value={override.parameters.presencePenalty || 0}
                onChange={(e) => onUpdateParameter(override.id, 'presencePenalty', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <Label>System Prompt Override</Label>
          <Textarea
            value={override.parameters.systemPrompt || ''}
            onChange={(e) => onUpdateParameter(override.id, 'systemPrompt', e.target.value)}
            placeholder="Enter custom system prompt for this model..."
            rows={3}
          />
        </div>

        {/* Custom Instructions */}
        <div>
          <Label>Custom Instructions</Label>
          <Textarea
            value={override.customInstructions}
            onChange={(e) => onUpdate(override.id, { customInstructions: e.target.value })}
            placeholder="Special instructions or notes for this model override..."
            rows={2}
          />
        </div>
      </div>
    </Card>
  );
}