'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, TrendingUp, Zap, Clock, Activity } from 'lucide-react';
import type { SystemHealth } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface SystemHealthSummaryProps {
  health: SystemHealth;
  onRefresh: () => void;
}

const getHealthStatusIcon = (status: SystemHealth['status']) => {
  switch (status) {
    case 'operational':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'degraded':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-600" />;
    default:
      return <Activity className="h-5 w-5 text-gray-600" />;
  }
};

const getHealthStatusColor = (status: SystemHealth['status']) => {
  switch (status) {
    case 'operational':
      return {
        container: 'border-green-200 bg-green-50',
        title: 'text-green-800',
        badge: 'bg-green-100 text-green-800 border-green-300'
      };
    case 'degraded':
      return {
        container: 'border-yellow-200 bg-yellow-50',
        title: 'text-yellow-800',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      };
    case 'critical':
      return {
        container: 'border-red-200 bg-red-50',
        title: 'text-red-800',
        badge: 'bg-red-100 text-red-800 border-red-300'
      };
    default:
      return {
        container: 'border-gray-200 bg-gray-50',
        title: 'text-gray-800',
        badge: 'bg-gray-100 text-gray-800 border-gray-300'
      };
  }
};

const formatLastUpdated = (date: Date) => {
  const now = Date.now();
  const diff = now - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
  if (value >= thresholds.good) return 'text-green-600';
  if (value >= thresholds.warning) return 'text-yellow-600';
  return 'text-red-600';
};

export function SystemHealthSummary({ health, onRefresh }: SystemHealthSummaryProps) {
  const statusColors = getHealthStatusColor(health.status);
  const statusIcon = getHealthStatusIcon(health.status);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
        <p className="text-muted-foreground">
          Overall system status and key performance metrics
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Status Card */}
        <Card className={cn(
          "lg:col-span-2 transition-all duration-300",
          statusColors.container
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon}
                <div>
                  <CardTitle className={cn("text-2xl", statusColors.title)}>
                    {health.overallStatus}
                  </CardTitle>
                  <CardDescription className={cn("text-base mt-1", statusColors.title)}>
                    Last updated: {formatLastUpdated(health.lastUpdated)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-sm font-medium", statusColors.badge)}>
                  {health.status.toUpperCase()}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Average Response Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Avg Response Time</span>
                </div>
                <div className="text-2xl font-bold">
                  <span className={getPerformanceColor(health.avgResponseTime, { good: 1000, warning: 2000 })}>
                    {health.avgResponseTime}ms
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {health.avgResponseTime < 1000 ? 'Excellent' : 
                   health.avgResponseTime < 2000 ? 'Good' : 'Needs improvement'}
                </div>
              </div>

              {/* Cache Hit Rate */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                </div>
                <div className="text-2xl font-bold">
                  <span className={getPerformanceColor(health.cacheHitRate, { good: 90, warning: 75 })}>
                    {health.cacheHitRate.toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {health.cacheHitRate >= 90 ? 'Excellent caching' : 
                   health.cacheHitRate >= 75 ? 'Good performance' : 'Low cache usage'}
                </div>
              </div>

              {/* API Calls This Hour */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">API Calls (Hour)</span>
                </div>
                <div className="text-2xl font-bold">
                  <span className="text-blue-600">
                    {health.apiCallsThisHour.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {health.apiCallsThisHour > 1000 ? 'High usage' : 'Normal usage'}
                </div>
              </div>

              {/* Error Rate */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Error Rate</span>
                </div>
                <div className="text-2xl font-bold">
                  <span className={getPerformanceColor(100 - health.errorRate, { good: 99, warning: 95 })}>
                    {health.errorRate.toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {health.errorRate < 1 ? 'Excellent reliability' : 
                   health.errorRate < 5 ? 'Good performance' : 'High error rate'}
                </div>
              </div>
            </div>

            {/* Performance summary bar */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Overall Performance</span>
                <span className="text-muted-foreground">
                  {health.status === 'operational' ? '95%' : 
                   health.status === 'degraded' ? '75%' : '45%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    health.status === 'operational' ? 'bg-green-500' :
                    health.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ 
                    width: health.status === 'operational' ? '95%' : 
                           health.status === 'degraded' ? '75%' : '45%'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Common monitoring tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => console.log('View detailed logs')}
            >
              <Activity className="h-4 w-4 mr-2" />
              View Logs
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => console.log('Export health report')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Status Breakdown</CardTitle>
          <CardDescription>
            Detailed view of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">AI Providers</span>
              </div>
              <Badge className="bg-green-100 text-green-800">5/6 Online</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Cache System</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Rate Limits</span>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800">2 Warning</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}