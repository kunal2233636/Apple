'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Clock, Zap, TestTube } from 'lucide-react';
import type { ProviderStatus } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface ProviderStatusGridProps {
  providers: ProviderStatus[];
  onTest: (provider: string) => void;
}

const statusColors = {
  healthy: 'text-green-600 bg-green-100 border-green-300',
  warning: 'text-yellow-600 bg-yellow-100 border-yellow-300',
  critical: 'text-red-600 bg-red-100 border-red-300',
  blocked: 'text-gray-600 bg-gray-100 border-gray-300'
};

const statusIcons = {
  healthy: '🟢',
  warning: '🟡',
  critical: '🔴',
  blocked: '⚫'
};

const formatLastCall = (date: Date) => {
  const now = Date.now();
  const diff = now - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

export function ProviderStatusGrid({ providers, onTest }: ProviderStatusGridProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Provider Status</h2>
        <p className="text-muted-foreground">
          Real-time status and usage metrics for all AI providers
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.provider}
            provider={provider}
            onTest={onTest}
          />
        ))}
      </div>
    </div>
  );
}

interface ProviderCardProps {
  provider: ProviderStatus;
  onTest: (provider: string) => void;
}

function ProviderCard({ provider, onTest }: ProviderCardProps) {
  const { status, usage, metrics, name, logo, canTest } = provider;
  
  const statusColorClass = statusColors[status];
  const statusIcon = statusIcons[status];
  
  const getProgressColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTrendIcon = (status: string) => {
    if (status === 'healthy') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (status === 'warning' || status === 'critical') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Zap className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      status === 'critical' && "ring-2 ring-red-300 ring-opacity-50",
      status === 'warning' && "ring-2 ring-yellow-300 ring-opacity-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{logo}</div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription className="text-sm">
                Provider: {provider.provider}
              </CardDescription>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
            statusColorClass
          )}>
            <span>{statusIcon}</span>
            <span className="capitalize">{status}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Usage</span>
            <div className="flex items-center gap-2">
              {getTrendIcon(status)}
              <span className="text-lg font-bold">
                {usage.current} / {usage.limit}
              </span>
            </div>
          </div>
          <Progress 
            value={usage.percentage} 
            className="h-3"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{usage.percentage.toFixed(1)}% used</span>
            <span>{(usage.limit - usage.current)} remaining</span>
          </div>
        </div>

        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Avg Response</span>
            </div>
            <div className="font-semibold">{metrics.avgResponseTime}ms</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Success Rate</span>
            </div>
            <div className="font-semibold">{metrics.successRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Last call */}
        <div className="text-sm text-muted-foreground">
          <span>Last call: {formatLastCall(metrics.lastCall)}</span>
        </div>

        {/* Mini trend chart placeholder */}
        <div className="h-8 bg-muted/50 rounded-md flex items-center justify-center text-xs text-muted-foreground">
          📈 Usage Trend (Last Hour)
        </div>

        {/* Test button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onTest(provider.provider)}
          disabled={!canTest}
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test Now
        </Button>
      </CardContent>
    </Card>
  );
}