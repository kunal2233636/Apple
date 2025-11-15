'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  Database,
  Brain,
  Settings,
  Zap,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Activity,
  HardDrive,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Copy,
  Download
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
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';

interface EmbeddingModel {
  id: string;
  name: string;
  provider: string;
  modelName: string;
  status: 'active' | 'inactive' | 'testing' | 'error';
  enabled: boolean;
  dimensions: number;
  maxTokens: number;
  cost: {
    inputPer1k: number;
    outputPer1k: number;
  };
  performance: {
    speed: number; // tokens per second
    quality: number; // 1-10 scale
    accuracy: number; // 1-10 scale
  };
  usage: {
    totalRequests: number;
    totalTokens: number;
    averageLatency: number;
    successRate: number;
  };
  configuration: {
    batchSize: number;
    concurrentRequests: number;
    timeout: number;
    retryAttempts: number;
    chunkSize: number;
    overlapSize: number;
  };
  filters: {
    minLength: number;
    maxLength: number;
    languages: string[];
    contentTypes: string[];
  };
  optimization: {
    cachingEnabled: boolean;
    compressionEnabled: boolean;
    quantizationLevel: 'none' | '8bit' | '4bit';
    useGPU: boolean;
  };
}

interface EmbeddingUsageStats {
  totalEmbeddings: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  topModels: Array<{
    model: string;
    usage: number;
    cost: number;
  }>;
  dailyUsage: Array<{
    date: string;
    embeddings: number;
    tokens: number;
  }>;
}

const DEFAULT_MODELS: EmbeddingModel[] = [
  {
    id: 'model_openai_text_embedding_ada_002',
    name: 'OpenAI Ada 002',
    provider: 'openai',
    modelName: 'text-embedding-ada-002',
    status: 'active',
    enabled: true,
    dimensions: 1536,
    maxTokens: 8191,
    cost: {
      inputPer1k: 0.0001,
      outputPer1k: 0.0001
    },
    performance: {
      speed: 1000,
      quality: 8,
      accuracy: 9
    },
    usage: {
      totalRequests: 15420,
      totalTokens: 2500000,
      averageLatency: 150,
      successRate: 99.8
    },
    configuration: {
      batchSize: 100,
      concurrentRequests: 5,
      timeout: 30000,
      retryAttempts: 3,
      chunkSize: 1000,
      overlapSize: 200
    },
    filters: {
      minLength: 10,
      maxLength: 10000,
      languages: ['en', 'es', 'fr', 'de'],
      contentTypes: ['text', 'code', 'markdown']
    },
    optimization: {
      cachingEnabled: true,
      compressionEnabled: false,
      quantizationLevel: 'none',
      useGPU: false
    }
  },
  {
    id: 'model_cohere_embed_multilingual_v3',
    name: 'Cohere Multilingual v3',
    provider: 'cohere',
    modelName: 'embed-multilingual-v3.0',
    status: 'active',
    enabled: true,
    dimensions: 1024,
    maxTokens: 8192,
    cost: {
      inputPer1k: 0.0001,
      outputPer1k: 0.0001
    },
    performance: {
      speed: 800,
      quality: 9,
      accuracy: 8
    },
    usage: {
      totalRequests: 8750,
      totalTokens: 1200000,
      averageLatency: 180,
      successRate: 99.5
    },
    configuration: {
      batchSize: 96,
      concurrentRequests: 4,
      timeout: 30000,
      retryAttempts: 3,
      chunkSize: 512,
      overlapSize: 128
    },
    filters: {
      minLength: 5,
      maxLength: 8000,
      languages: ['en'],
      contentTypes: ['text']
    },
    optimization: {
      cachingEnabled: true,
      compressionEnabled: true,
      quantizationLevel: '8bit',
      useGPU: true
    }
  }
];

const AVAILABLE_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '🤖' },
  { id: 'cohere', name: 'Cohere', icon: '🧠' },
  { id: 'huggingface', name: 'Hugging Face', icon: '🤗' },
  { id: 'local', name: 'Local/On-Premise', icon: '💻' }
];

export function EmbeddingModelsTab() {
  const [models, setModels] = useState<EmbeddingModel[]>([]);
  const [usageStats, setUsageStats] = useState<EmbeddingUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('models');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadModels();
    loadUsageStats();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/embedding-models');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setModels(data.data);
        } else {
          throw new Error('Models response invalid');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to load embedding models, using defaults:', error);
      setModels(DEFAULT_MODELS);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await fetch('/api/admin/embedding-usage');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsageStats(data.data);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to load usage stats:', error);
      // Don't set usage stats on error - component will handle null state
    }
  };

  const saveModels = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/embedding-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(models)
      });
      
      if (response.ok) {
        setHasUnsavedChanges(false);
        alert('Embedding models saved successfully!');
      } else {
        throw new Error('Failed to save models');
      }
    } catch (error) {
      console.error('Failed to save models:', error);
      alert('Failed to save models. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const testModel = async (modelId: string) => {
    setModels(models.map(m => 
      m.id === modelId ? { ...m, status: 'testing' as const } : m
    ));

    try {
      const response = await fetch(`/api/admin/embedding-models/${modelId}/test`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setModels(models.map(m => 
          m.id === modelId ? { 
            ...m, 
            status: 'active' as const,
            usage: {
              ...m.usage,
              totalRequests: m.usage.totalRequests + 1,
              successRate: result.success ? 100 : 0
            }
          } : m
        ));
        alert(`Test ${result.success ? 'passed' : 'failed'}!`);
      } else {
        throw new Error('Test failed');
      }
    } catch (error) {
      console.error('Test failed:', error);
      setModels(models.map(m => 
        m.id === modelId ? { ...m, status: 'error' as const } : m
      ));
      alert('Test failed. Please check the model configuration.');
    }
  };

  const addModel = () => {
    const newModel: EmbeddingModel = {
      id: `model_${Date.now()}`,
      name: 'New Embedding Model',
      provider: 'openai',
      modelName: '',
      status: 'inactive',
      enabled: false,
      dimensions: 1536,
      maxTokens: 8192,
      cost: {
        inputPer1k: 0.0001,
        outputPer1k: 0.0001
      },
      performance: {
        speed: 100,
        quality: 5,
        accuracy: 5
      },
      usage: {
        totalRequests: 0,
        totalTokens: 0,
        averageLatency: 0,
        successRate: 0
      },
      configuration: {
        batchSize: 50,
        concurrentRequests: 2,
        timeout: 30000,
        retryAttempts: 3,
        chunkSize: 1000,
        overlapSize: 200
      },
      filters: {
        minLength: 1,
        maxLength: 10000,
        languages: ['en'],
        contentTypes: ['text']
      },
      optimization: {
        cachingEnabled: false,
        compressionEnabled: false,
        quantizationLevel: 'none',
        useGPU: false
      }
    };
    setModels([...models, newModel]);
    setHasUnsavedChanges(true);
  };

  const deleteModel = (modelId: string) => {
    setModels(models.filter(m => m.id !== modelId));
    setHasUnsavedChanges(true);
  };

  const updateModel = (modelId: string, updates: Partial<EmbeddingModel>) => {
    setModels(models.map(m => 
      m.id === modelId ? { ...m, ...updates } : m
    ));
    setHasUnsavedChanges(true);
  };

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
          <h2 className="text-2xl font-bold">Embedding Models</h2>
          <p className="text-muted-foreground">
            Manage embedding providers, models, and configuration settings for vector operations.
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
          <Button onClick={addModel} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
          <Button onClick={saveModels} disabled={saving || !hasUnsavedChanges}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Usage Stats Summary */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Embeddings</p>
                <p className="text-2xl font-bold">{usageStats.totalEmbeddings.toLocaleString()}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${usageStats.totalCost.toFixed(4)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{usageStats.averageLatency}ms</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{usageStats.successRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6 mt-6">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onUpdate={updateModel}
              onTest={testModel}
              onDelete={deleteModel}
            />
          ))}
          
          {models.length === 0 && (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Embedding Models</h3>
              <p className="text-muted-foreground mb-4">
                Add embedding models to enable vector operations and similarity search.
              </p>
              <Button onClick={addModel}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Model
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6 mt-6">
          <UsageAnalytics usageStats={usageStats} />
        </TabsContent>

        <TabsContent value="batch" className="space-y-6 mt-6">
          <BatchProcessing models={models} onUpdateModels={setModels} />
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6 mt-6">
          <OptimizationSettings models={models} onUpdate={updateModel} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ModelCardProps {
  model: EmbeddingModel;
  onUpdate: (id: string, updates: Partial<EmbeddingModel>) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
}

function ModelCard({ model, onUpdate, onTest, onDelete }: ModelCardProps) {
  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    testing: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  const statusIcons = {
    active: CheckCircle,
    inactive: Pause,
    testing: RefreshCw,
    error: AlertCircle
  };

  const StatusIcon = statusIcons[model.status];

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${statusColors[model.status]}`} />
              <Input
                value={model.name}
                onChange={(e) => onUpdate(model.id, { name: e.target.value })}
                className="font-medium"
                placeholder="Model name"
              />
            </div>
            <Badge variant={model.enabled ? 'default' : 'secondary'}>
              {model.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant="outline">
              {model.dimensions}D
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={model.enabled}
              onCheckedChange={(enabled) => onUpdate(model.id, { enabled })}
            />
            <Button 
              onClick={() => onTest(model.id)} 
              variant="outline" 
              size="sm"
              disabled={model.status === 'testing'}
            >
              {model.status === 'testing' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={() => onDelete(model.id)} variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Basic Settings
            </h4>
            <div>
              <Label>Provider</Label>
              <Select
                value={model.provider}
                onValueChange={(provider) => onUpdate(model.id, { provider })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PROVIDERS.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.icon} {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model Name</Label>
              <Input
                value={model.modelName}
                onChange={(e) => onUpdate(model.id, { modelName: e.target.value })}
                placeholder="e.g., text-embedding-ada-002"
              />
            </div>
            <div>
              <Label>Dimensions</Label>
              <Input
                type="number"
                value={model.dimensions}
                onChange={(e) => onUpdate(model.id, { dimensions: parseInt(e.target.value) })}
                min="128"
                max="4096"
              />
            </div>
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={model.maxTokens}
                onChange={(e) => onUpdate(model.id, { maxTokens: parseInt(e.target.value) })}
                min="512"
                max="32768"
              />
            </div>
          </div>

          {/* Performance */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance
            </h4>
            <div>
              <Label>Speed (tokens/sec)</Label>
              <Input
                type="number"
                value={model.performance.speed}
                onChange={(e) => onUpdate(model.id, {
                  performance: { ...model.performance, speed: parseInt(e.target.value) }
                })}
                min="1"
                max="10000"
              />
            </div>
            <div>
              <Label>Quality (1-10)</Label>
              <Slider
                value={[model.performance.quality]}
                onValueChange={([value]) => onUpdate(model.id, {
                  performance: { ...model.performance, quality: value }
                })}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground">
                {model.performance.quality}/10
              </div>
            </div>
            <div>
              <Label>Accuracy (1-10)</Label>
              <Slider
                value={[model.performance.accuracy]}
                onValueChange={([value]) => onUpdate(model.id, {
                  performance: { ...model.performance, accuracy: value }
                })}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground">
                {model.performance.accuracy}/10
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Usage Stats
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <Label className="text-xs">Requests</Label>
                <p className="font-medium">{model.usage.totalRequests.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs">Tokens</Label>
                <p className="font-medium">{model.usage.totalTokens.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs">Avg Latency</Label>
                <p className="font-medium">{model.usage.averageLatency}ms</p>
              </div>
              <div>
                <Label className="text-xs">Success Rate</Label>
                <p className="font-medium">{model.usage.successRate.toFixed(1)}%</p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Success Rate</Label>
              <Progress value={model.usage.successRate} className="w-full" />
            </div>
          </div>
        </div>

        {/* Configuration Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Processing Configuration</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Batch Size</Label>
                <Input
                  type="number"
                  value={model.configuration.batchSize}
                  onChange={(e) => onUpdate(model.id, {
                    configuration: { ...model.configuration, batchSize: parseInt(e.target.value) }
                  })}
                  min="1"
                  max="1000"
                />
              </div>
              <div>
                <Label className="text-xs">Concurrent</Label>
                <Input
                  type="number"
                  value={model.configuration.concurrentRequests}
                  onChange={(e) => onUpdate(model.id, {
                    configuration: { ...model.configuration, concurrentRequests: parseInt(e.target.value) }
                  })}
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <Label className="text-xs">Chunk Size</Label>
                <Input
                  type="number"
                  value={model.configuration.chunkSize}
                  onChange={(e) => onUpdate(model.id, {
                    configuration: { ...model.configuration, chunkSize: parseInt(e.target.value) }
                  })}
                  min="100"
                  max="8192"
                />
              </div>
              <div>
                <Label className="text-xs">Overlap</Label>
                <Input
                  type="number"
                  value={model.configuration.overlapSize}
                  onChange={(e) => onUpdate(model.id, {
                    configuration: { ...model.configuration, overlapSize: parseInt(e.target.value) }
                  })}
                  min="0"
                  max="1000"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Optimization Settings</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={model.optimization.cachingEnabled}
                  onCheckedChange={(checked) => onUpdate(model.id, {
                    optimization: { ...model.optimization, cachingEnabled: checked }
                  })}
                />
                <Label className="text-xs">Enable Caching</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={model.optimization.compressionEnabled}
                  onCheckedChange={(checked) => onUpdate(model.id, {
                    optimization: { ...model.optimization, compressionEnabled: checked }
                  })}
                />
                <Label className="text-xs">Enable Compression</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={model.optimization.useGPU}
                  onCheckedChange={(checked) => onUpdate(model.id, {
                    optimization: { ...model.optimization, useGPU: checked }
                  })}
                />
                <Label className="text-xs">Use GPU</Label>
              </div>
              <div>
                <Label className="text-xs">Quantization</Label>
                <Select
                  value={model.optimization.quantizationLevel}
                  onValueChange={(value) => onUpdate(model.id, {
                    optimization: { ...model.optimization, quantizationLevel: value as any }
                  })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="8bit">8-bit</SelectItem>
                    <SelectItem value="4bit">4-bit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Additional components for other tabs
function UsageAnalytics({ usageStats }: { usageStats: EmbeddingUsageStats | null }) {
  if (!usageStats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No usage data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Models by Usage</h3>
        <div className="space-y-4">
          {usageStats.topModels.map((model, index) => (
            <div key={model.model} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{model.model}</p>
                  <p className="text-sm text-muted-foreground">
                    {model.usage.toLocaleString()} requests • ${model.cost.toFixed(4)} cost
                  </p>
                </div>
              </div>
              <Badge variant="outline">{model.usage} requests</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Usage Trends</h3>
        <div className="space-y-2">
          {usageStats.dailyUsage.map((day) => (
            <div key={day.date} className="flex items-center justify-between">
              <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm">{day.embeddings} embeddings</span>
                <span className="text-sm text-muted-foreground">{day.tokens.toLocaleString()} tokens</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BatchProcessing({ models, onUpdateModels }: { models: EmbeddingModel[], onUpdateModels: (models: EmbeddingModel[]) => void }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Batch Processing</h3>
      <p className="text-muted-foreground">
        Configure batch processing settings for bulk embedding operations.
      </p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Default Batch Size</Label>
          <Input type="number" defaultValue="100" />
        </div>
        <div>
          <Label>Processing Timeout (minutes)</Label>
          <Input type="number" defaultValue="30" />
        </div>
        <div>
          <Label>Max Concurrent Batches</Label>
          <Input type="number" defaultValue="5" />
        </div>
        <div>
          <Label>Retry Failed Batches</Label>
          <Switch defaultChecked />
        </div>
      </div>
    </Card>
  );
}

function OptimizationSettings({ models, onUpdate }: { models: EmbeddingModel[], onUpdate: (id: string, updates: Partial<EmbeddingModel>) => void }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Global Optimization Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Cache TTL (hours)</Label>
            <Input type="number" defaultValue="24" />
          </div>
          <div>
            <Label>Compression Level</Label>
            <Select defaultValue="medium">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vector Database</Label>
            <Select defaultValue="pgvector">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pgvector">PostgreSQL + pgvector</SelectItem>
                <SelectItem value="pinecone">Pinecone</SelectItem>
                <SelectItem value="weaviate">Weaviate</SelectItem>
                <SelectItem value="qdrant">Qdrant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Index Type</Label>
            <Select defaultValue="hnsw">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="hnsw">HNSW</SelectItem>
                <SelectItem value="ivf">IVF</SelectItem>
                <SelectItem value="ivf_pq">IVF+PQ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Max Latency (ms)</Label>
            <Input type="number" defaultValue="1000" />
          </div>
          <div>
            <Label>Min Success Rate (%)</Label>
            <Input type="number" defaultValue="95" />
          </div>
          <div>
            <Label>Max Error Rate (%)</Label>
            <Input type="number" defaultValue="5" />
          </div>
        </div>
      </Card>
    </div>
  );
}