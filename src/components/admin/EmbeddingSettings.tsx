// Admin Embedding Provider Settings Component
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  TestTube, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  DollarSign,
  Activity,
  Clock
} from 'lucide-react';

interface EmbeddingProvider {
  name: string;
  provider: string;
  enabled: boolean;
  model: string;
  priority: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    requestsPerMonth: number;
  };
  cost: {
    pricePerToken: number;
    dailyBudget: number;
    monthlyBudget: number;
  };
  health?: {
    healthy: boolean;
    responseTime: number;
    lastCheck: string;
    error?: string;
  };
  usage?: {
    requests: number;
    cost: number;
  };
}

interface AdminSettings {
  providers: {
    [key: string]: EmbeddingProvider;
  };
  defaultProvider: string;
  fallbackProviders: string[];
  models: {
    [key: string]: string;
  };
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      costLimit: number;
    };
  };
}

interface UsageStats {
  total: {
    requests: number;
    cost: number;
  };
  byProvider: {
    [key: string]: {
      requests: number;
      cost: number;
      healthy: boolean;
    };
  };
}

// Helper function to get available models for each provider
const getAvailableModels = (providerName: string) => {
  const modelOptions: Record<string, { value: string; label: string }[]> = {
    cohere: [
      { value: 'embed-multilingual-v3.0', label: 'embed-multilingual-v3.0 (1024 dims)' },
      { value: 'embed-english-v3.0', label: 'embed-english-v3.0 (1536 dims)' },
      { value: 'embed-english-light-v3.0', label: 'embed-english-light-v3.0 (384 dims)' }
    ],
    mistral: [
      { value: 'mistral-embed', label: 'mistral-embed (1024 dims)' },
      { value: 'mistral-embed-large', label: 'mistral-embed-large (1024 dims)' }
    ],
    google: [
      { value: 'text-embedding-004', label: 'text-embedding-004 (768 dims)' },
      { value: 'text-embedding-3-small', label: 'text-embedding-3-small (512 dims)' },
      { value: 'text-embedding-3-large', label: 'text-embedding-3-large (3072 dims)' }
    ]
  };

  return modelOptions[providerName] || modelOptions.cohere; // fallback to Cohere models
};

export function EmbeddingSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    loadUsageStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });
      
      const apiPromise = fetch('/api/admin/embeddings/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await fetch('/api/admin/embeddings/usage');
      const data = await response.json();
      
      if (data.success) {
        setUsageStats(data.data);
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const updateProviderConfig = async (provider: string, config: Partial<EmbeddingProvider>) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/embeddings/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-provider',
          provider,
          config
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Provider ${provider} updated successfully`);
        loadSettings();
      } else {
        setError(data.error || 'Failed to update provider');
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      setError('Failed to update provider');
    } finally {
      setSaving(false);
    }
  };

  const setDefaultProvider = async (provider: string) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/embeddings/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-default-provider',
          provider
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Default provider set to ${provider}`);
        loadSettings();
      } else {
        setError(data.error || 'Failed to set default provider');
      }
    } catch (error) {
      console.error('Error setting default provider:', error);
      setError('Failed to set default provider');
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (provider: string) => {
    try {
      setTesting(provider);
      const response = await fetch('/api/admin/embeddings/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-provider',
          provider
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const { health } = data.data;
        if (health.healthy) {
          setSuccess(`${provider} is working (${health.responseTime}ms)`);
        } else {
          setError(`${provider} test failed: ${health.error || 'Unknown error'}`);
        }
        loadSettings();
      } else {
        setError(data.error || 'Failed to test provider');
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      setError('Failed to test provider');
    } finally {
      setTesting(null);
    }
  };

  const resetUsage = async () => {
    try {
      const response = await fetch('/api/admin/embeddings/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-usage'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Usage tracking reset');
        loadUsageStats();
      } else {
        setError(data.error || 'Failed to reset usage');
      }
    } catch (error) {
      console.error('Error resetting usage:', error);
      setError('Failed to reset usage');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading embedding settings...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load embedding settings. Please check your configuration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Embedding Settings</h2>
          <p className="text-muted-foreground">
            Manage embedding providers, models, and usage settings
          </p>
        </div>
        <Button onClick={loadSettings} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(settings.providers).map(([providerKey, provider]) => (
              <ProviderCard
                key={providerKey}
                provider={provider}
                isDefault={settings.defaultProvider === providerKey}
                onUpdate={(config) => updateProviderConfig(providerKey, config)}
                onSetDefault={() => setDefaultProvider(providerKey)}
                onTest={() => testProvider(providerKey)}
                saving={saving}
                testing={testing === providerKey}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageStatsCard 
            stats={usageStats} 
            onResetUsage={resetUsage}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <MonitoringSettingsCard 
            settings={settings.monitoring}
            onUpdate={(config) => updateProviderConfig('monitoring', config)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ProviderCardProps {
  provider: EmbeddingProvider;
  isDefault: boolean;
  onUpdate: (config: Partial<EmbeddingProvider>) => void;
  onSetDefault: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
}

function ProviderCard({ 
  provider, 
  isDefault, 
  onUpdate, 
  onSetDefault, 
  onTest, 
  saving, 
  testing 
}: ProviderCardProps) {
  const [localConfig, setLocalConfig] = useState(provider);

  useEffect(() => {
    setLocalConfig(provider);
  }, [provider]);

  const getStatusIcon = () => {
    if (provider.health?.healthy) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (provider.health?.healthy) {
      return `Healthy (${provider.health.responseTime}ms)`;
    }
    return provider.health?.error || 'Unhealthy';
  };

  // Get available models for this provider
  const availableModels = getAvailableModels(provider.provider);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            {getStatusIcon()}
            {isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
            {provider.enabled ? (
              <Badge variant="default">Enabled</Badge>
            ) : (
              <Badge variant="outline">Disabled</Badge>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={testing || !provider.enabled}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? 'Testing...' : 'Test'}
            </Button>
            {!isDefault && provider.enabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSetDefault}
                disabled={saving}
              >
                Set Default
              </Button>
            )}
          </div>
        </div>
        <CardDescription>{getStatusText()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Enabled</Label>
            <Switch
              checked={localConfig.enabled}
              onCheckedChange={(checked) => {
                setLocalConfig({ ...localConfig, enabled: checked });
                onUpdate({ enabled: checked });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={localConfig.model}
              onValueChange={(value) => {
                setLocalConfig({ ...localConfig, model: value });
                onUpdate({ model: value });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <Label className="text-xs">Daily Limit</Label>
            <div className="font-mono">{provider.rateLimits.requestsPerDay.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cost/Token</Label>
            <div className="font-mono">${provider.cost.pricePerToken.toFixed(6)}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <div className="font-mono">{provider.priority}</div>
          </div>
        </div>

        {provider.usage && (
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs">Requests Today</Label>
                <div className="font-mono">{provider.usage.requests}</div>
              </div>
              <div>
                <Label className="text-xs">Cost Today</Label>
                <div className="font-mono">${provider.usage.cost.toFixed(4)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsageStatsCard({ stats, onResetUsage }: { stats: UsageStats | null, onResetUsage: () => void }) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No usage data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Total Usage</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats.total.requests}</div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
            <div>
              <div className="text-2xl font-bold">${stats.total.cost.toFixed(4)}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={onResetUsage}
          >
            Reset Usage Tracking
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {Object.entries(stats.byProvider).map(([provider, data]) => (
          <Card key={provider}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize">{provider}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.requests} requests • ${data.cost.toFixed(4)} cost
                  </div>
                </div>
                <Badge variant={data.healthy ? "default" : "destructive"}>
                  {data.healthy ? "Healthy" : "Unhealthy"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MonitoringSettingsCard({ settings, onUpdate }: { settings: any, onUpdate: (config: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Monitoring Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Enable Monitoring</Label>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => onUpdate({ monitoring: { ...settings, enabled: checked } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Health Check Interval (minutes)</Label>
            <Input
              type="number"
              value={settings.healthCheckInterval}
              onChange={(e) => onUpdate({ monitoring: { ...settings, healthCheckInterval: parseInt(e.target.value) } })}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Alert Thresholds</Label>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <Label className="text-xs">Error Rate</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.alertThresholds.errorRate}
                onChange={(e) => onUpdate({ 
                  monitoring: { 
                    ...settings, 
                    alertThresholds: { 
                      ...settings.alertThresholds, 
                      errorRate: parseFloat(e.target.value) 
                    } 
                  } 
                })}
              />
            </div>
            <div>
              <Label className="text-xs">Response Time (ms)</Label>
              <Input
                type="number"
                value={settings.alertThresholds.responseTime}
                onChange={(e) => onUpdate({ 
                  monitoring: { 
                    ...settings, 
                    alertThresholds: { 
                      ...settings.alertThresholds, 
                      responseTime: parseInt(e.target.value) 
                    } 
                  } 
                })}
              />
            </div>
            <div>
              <Label className="text-xs">Cost Limit</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.alertThresholds.costLimit}
                onChange={(e) => onUpdate({ 
                  monitoring: { 
                    ...settings, 
                    alertThresholds: { 
                      ...settings.alertThresholds, 
                      costLimit: parseFloat(e.target.value) 
                    } 
                  } 
                })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
