'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Cpu, 
  Zap, 
  Shield, 
  Globe, 
  Brain, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderMetrics {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitCount: number;
  lastRequest: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

interface ProviderSelectorProps {
  value: string;
  onValueChange: (provider: string) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  className?: string;
}

const PROVIDER_CONFIG = {
  groq: {
    name: 'Groq',
    icon: Zap,
    color: 'bg-purple-500',
    description: 'Ultra-fast inference',
    strength: 'Speed',
    models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile'],
    features: ['Streaming', 'Fast Response'],
  },
  cerebras: {
    name: 'Cerebras',
    icon: Cpu,
    color: 'bg-blue-500',
    description: 'High-performance AI chips',
    strength: 'Performance',
    models: ['llama3.1-8b', 'llama3.1-70b'],
    features: ['High Throughput', 'Large Context'],
  },
  mistral: {
    name: 'Mistral AI',
    icon: Brain,
    color: 'bg-orange-500',
    description: 'Open-source AI models',
    strength: 'Open Source',
    models: ['mistral-tiny', 'mistral-small', 'mistral-medium'],
    features: ['Open Source', 'Multilingual'],
  },
  openrouter: {
    name: 'OpenRouter',
    icon: Globe,
    color: 'bg-green-500',
    description: 'Unified AI API gateway',
    strength: 'Variety',
    models: ['gpt-4-turbo', 'claude-3-sonnet', 'gemini-pro'],
    features: ['Multiple Models', 'Cost Optimization'],
  },
  gemini: {
    name: 'Google Gemini',
    icon: Sparkles,
    color: 'bg-red-500',
    description: 'Multimodal AI capabilities',
    strength: 'Multimodal',
    models: ['gemini-pro', 'gemini-pro-vision'],
    features: ['Image Analysis', 'Code Generation'],
  },
  cohere: {
    name: 'Cohere',
    icon: Shield,
    color: 'bg-yellow-500',
    description: 'Enterprise AI platform',
    strength: 'Enterprise',
    models: ['command', 'command-light'],
    features: ['Enterprise Security', 'Custom Models'],
  },
};

export default function ProviderSelector({
  value,
  onValueChange,
  selectedModel,
  onModelChange,
  className
}: ProviderSelectorProps) {
  const [providerMetrics, setProviderMetrics] = useState<Map<string, ProviderMetrics>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch provider metrics
  const fetchProviderMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.providers) {
          const metricsMap = new Map();
          data.data.providers.forEach((provider: any) => {
            const healthStatus = getHealthStatus(provider);
            metricsMap.set(provider.provider, {
              ...provider,
              healthStatus,
              lastRequest: new Date(),
            });
          });
          setProviderMetrics(metricsMap);
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error('Failed to fetch provider metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get health status based on metrics
  const getHealthStatus = (provider: any): 'healthy' | 'degraded' | 'unhealthy' => {
    const failureRate = provider.failedRequests / Math.max(provider.totalRequests, 1);
    const avgResponseTime = provider.averageResponseTime;
    
    if (failureRate > 0.5 || avgResponseTime > 10000) {
      return 'unhealthy';
    } else if (failureRate > 0.1 || avgResponseTime > 5000) {
      return 'degraded';
    }
    return 'healthy';
  };

  // Get health icon
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get success rate percentage
  const getSuccessRate = (provider: ProviderMetrics) => {
    if (provider.totalRequests === 0) return 100;
    return Math.round((provider.successfulRequests / provider.totalRequests) * 100);
  };

  // Format response time
  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  useEffect(() => {
    fetchProviderMetrics();
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchProviderMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

const selectedProvider = PROVIDER_CONFIG[value as keyof typeof PROVIDER_CONFIG];

  // Get the current model to display (use selectedModel if provided, otherwise first model)
  const currentModel = selectedModel || (selectedProvider?.models[0] || '');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Provider Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">AI Provider</label>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a provider">
              {selectedProvider && (
                <div className="flex items-center gap-2">
                  <selectedProvider.icon className="h-4 w-4" />
                  <span>{selectedProvider.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedProvider.strength}
                  </Badge>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROVIDER_CONFIG).map(([key, config]) => {
              const metrics = providerMetrics.get(key);
              const healthStatus = metrics?.healthStatus || 'unknown';
              
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2 w-full">
                    <config.icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {config.strength}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {config.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getHealthIcon(healthStatus)}
                      {metrics && (
                        <span className="text-xs text-muted-foreground">
                          {getSuccessRate(metrics)}%
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Model Selection */}
      {selectedProvider && selectedProvider.models.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <Select
            value={currentModel}
            onValueChange={onModelChange || (() => {})}
            disabled={!onModelChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{currentModel}</span>
                  {onModelChange && (
                    <Badge variant="outline" className="text-xs">
                      Selectable
                    </Badge>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectedProvider.models.map((model) => (
                <SelectItem key={model} value={model}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{model}</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedProvider.name}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Provider Details */}
      {selectedProvider && (
        <Card className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white',
                selectedProvider.color
              )}>
                <selectedProvider.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{selectedProvider.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProvider.description}
                </p>
              </div>
              <Badge variant="outline">
                {selectedProvider.strength}
              </Badge>
            </div>

            {/* Current Selection */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm">
                <div className="font-medium mb-1">Current Selection:</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Provider:</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedProvider.name}
                    </Badge>
                  </div>
                  {currentModel && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Model:</span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {currentModel}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-1">
              {selectedProvider.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>

            {/* Available Models List */}
            <div>
              <h4 className="text-sm font-medium mb-2">
                Available Models ({selectedProvider.models.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedProvider.models.map((model) => (
                  <div
                    key={model}
                    className={cn(
                      "text-xs p-2 rounded border",
                      model === currentModel
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "text-muted-foreground font-mono hover:bg-muted/50"
                    )}
                  >
                    {model}
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            {providerMetrics.has(value) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Performance</h4>
                {(() => {
                  const metrics = providerMetrics.get(value)!;
                  const successRate = getSuccessRate(metrics);
                  
                  return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className="flex items-center gap-2">
                          <Progress value={successRate} className="h-2 flex-1" />
                          <span>{successRate}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Response</div>
                        <div className="font-medium">
                          {formatResponseTime(metrics.averageResponseTime)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Requests</div>
                        <div className="font-medium">{metrics.totalRequests}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rate Limits</div>
                        <div className="font-medium">{metrics.rateLimitCount}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchProviderMetrics}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    </div>
  );
}