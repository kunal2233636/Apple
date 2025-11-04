'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  Eye, 
  EyeOff, 
  TestTube, 
  RotateCcw, 
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProviderStatus {
  connected: boolean;
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

interface ProviderUsage {
  totalCalls: number;
  tokensUsed: number;
  monthlyLimit?: number;
  usagePercentage: number;
  remaining?: number;
}

interface Provider {
  id: string;
  name: string;
  logo: string;
  status: ProviderStatus;
  usage: ProviderUsage;
  rateLimit: number;
  apiKey: string;
  hasApiKey: boolean;
  isMonthlyLimited: boolean;
  monthlyLimit?: number;
}

interface APIProvidersTabProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const mockProviders: Provider[] = [
  {
    id: 'groq',
    name: 'Groq',
    logo: '🚀',
    status: {
      connected: true,
      responseTime: 245,
      lastChecked: new Date(),
    },
    usage: {
      totalCalls: 1247,
      tokensUsed: 892340,
      usagePercentage: 67,
      remaining: 1253
    },
    rateLimit: 100,
    apiKey: '',
    hasApiKey: true,
    isMonthlyLimited: false
  },
  {
    id: 'gemini',
    name: 'Gemini',
    logo: '💎',
    status: {
      connected: true,
      responseTime: 567,
      lastChecked: new Date(),
    },
    usage: {
      totalCalls: 892,
      tokensUsed: 654321,
      usagePercentage: 45,
      remaining: 1108
    },
    rateLimit: 60,
    apiKey: '',
    hasApiKey: true,
    isMonthlyLimited: false
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    logo: '🧠',
    status: {
      connected: true,
      responseTime: 123,
      lastChecked: new Date(),
    },
    usage: {
      totalCalls: 445,
      tokensUsed: 234567,
      usagePercentage: 78,
      remaining: 555
    },
    rateLimit: 200,
    apiKey: '',
    hasApiKey: true,
    isMonthlyLimited: false
  },
  {
    id: 'cohere',
    name: 'Cohere',
    logo: '🌐',
    status: {
      connected: false,
      responseTime: 0,
      lastChecked: new Date(),
      error: 'API key invalid'
    },
    usage: {
      totalCalls: 156,
      tokensUsed: 89012,
      usagePercentage: 84,
      remaining: 844,
      monthlyLimit: 1000
    },
    rateLimit: 50,
    apiKey: '',
    hasApiKey: false,
    isMonthlyLimited: true,
    monthlyLimit: 1000
  },
  {
    id: 'mistral',
    name: 'Mistral',
    logo: '🌪️',
    status: {
      connected: true,
      responseTime: 189,
      lastChecked: new Date(),
    },
    usage: {
      totalCalls: 298,
      tokensUsed: 156789,
      usagePercentage: 60,
      remaining: 202,
      monthlyLimit: 500
    },
    rateLimit: 80,
    apiKey: '',
    hasApiKey: true,
    isMonthlyLimited: true,
    monthlyLimit: 500
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    logo: '🛣️',
    status: {
      connected: true,
      responseTime: 334,
      lastChecked: new Date(),
    },
    usage: {
      totalCalls: 678,
      tokensUsed: 445567,
      usagePercentage: 32,
      remaining: 2322
    },
    rateLimit: 120,
    apiKey: '',
    hasApiKey: true,
    isMonthlyLimited: false
  }
];

export function APIProvidersTab({ onUnsavedChanges }: APIProvidersTabProps) {
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const { toast } = useToast();

  const handleApiKeyToggle = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, hasApiKey: !p.hasApiKey } : p
    ));
    onUnsavedChanges(true);
  };

  const handleRateLimitChange = (providerId: string, value: number) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, rateLimit: value } : p
    ));
    onUnsavedChanges(true);
  };

  const testConnection = async (providerId: string) => {
    setTestingConnection(providerId);
    
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setProviders(prev => prev.map(p => {
        if (p.id === providerId) {
          const success = Math.random() > 0.3; // 70% success rate for demo
          return {
            ...p,
            status: {
              connected: success,
              responseTime: success ? Math.floor(Math.random() * 500) + 100 : 0,
              lastChecked: new Date(),
              error: success ? undefined : 'Connection failed'
            }
          };
        }
        return p;
      }));

      toast({
        title: 'Test Complete',
        description: `${providers.find(p => p.id === providerId)?.name} connection test finished.`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: `Failed to test ${providers.find(p => p.id === providerId)?.name} connection.`
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const testAllConnections = async () => {
    setTestingAll(true);
    
    try {
      // Simulate testing all providers
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setProviders(prev => prev.map(p => ({
        ...p,
        status: {
          connected: Math.random() > 0.2, // 80% success rate for demo
          responseTime: Math.floor(Math.random() * 400) + 100,
          lastChecked: new Date(),
          error: Math.random() > 0.8 ? 'Random error' : undefined
        }
      })));

      toast({
        title: 'All Tests Complete',
        description: 'Provider connection tests finished.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Tests Failed',
        description: 'Failed to test some provider connections.'
      });
    } finally {
      setTestingAll(false);
    }
  };

  const saveAllChanges = async () => {
    setSaving(true);
    
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onUnsavedChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'All provider settings have been saved successfully.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save provider settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    const confirmed = window.confirm('Are you sure you want to reset all provider settings to defaults?');
    if (!confirmed) return;

    setProviders(mockProviders);
    onUnsavedChanges(true);
    
    toast({
      title: 'Settings Reset',
      description: 'All provider settings have been reset to defaults.'
    });
  };

  const getStatusColor = (connected: boolean) => 
    connected ? 'text-green-600' : 'text-red-600';

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const maskApiKey = (key: string) => key ? '••••••••••••••••••••••••••••••••' : 'No API key set';

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={testAllConnections}
          disabled={testingAll}
          className="flex items-center gap-2"
        >
          <TestTube className="h-4 w-4" />
          {testingAll ? 'Testing All...' : 'Test All Providers'}
        </Button>
        <Button 
          onClick={saveAllChanges}
          disabled={saving}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
        <Button 
          onClick={resetToDefaults}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset All to Defaults
        </Button>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <Card key={provider.id} className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{provider.logo}</div>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {provider.status.connected ? (
                        <Badge variant="secondary" className="text-green-600 bg-green-50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Disconnected
                        </Badge>
                      )}
                      {provider.isMonthlyLimited && (
                        <Badge variant="outline" className="text-blue-600">
                          Monthly Limited
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm ${getStatusColor(provider.status.connected)}`}>
                    {provider.status.connected ? (
                      `${provider.status.responseTime}ms`
                    ) : (
                      'Offline'
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last check: {provider.status.lastChecked.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* API Key Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex items-center gap-2">
                  <Input
                    type={provider.hasApiKey ? 'password' : 'text'}
                    value={maskApiKey(provider.apiKey)}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleApiKeyToggle(provider.id)}
                  >
                    {provider.hasApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Rate Limit */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate Limit (requests/min)</label>
                <Input
                  type="number"
                  value={provider.rateLimit}
                  onChange={(e) => handleRateLimitChange(provider.id, parseInt(e.target.value) || 0)}
                  min="1"
                  max="1000"
                />
              </div>

              {/* Usage Statistics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Usage This Month</span>
                  <span className="text-sm text-muted-foreground">
                    {provider.usage.totalCalls} calls
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Tokens Used</span>
                    <span>{provider.usage.tokensUsed.toLocaleString()}</span>
                  </div>
                  <Progress 
                    value={provider.usage.usagePercentage} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>{provider.usage.usagePercentage}% used</span>
                    <span>
                      {provider.usage.remaining?.toLocaleString()}
                      {provider.monthlyLimit && ` / ${provider.monthlyLimit.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {provider.status.error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">{provider.status.error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(provider.id)}
                  disabled={testingConnection === provider.id}
                  className="flex-1"
                >
                  <TestTube className="h-3 w-3 mr-1" />
                  {testingConnection === provider.id ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}