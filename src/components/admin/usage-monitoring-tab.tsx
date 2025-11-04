'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Chart as ChartComponent, 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent 
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  BarChart3, 
  RefreshCw, 
  Download, 
  Activity, 
  Clock, 
  Zap,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Database,
  Users,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProviderStatus {
  provider: string;
  logo: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  responseTime: number;
  successRate: number;
  callsToday: number;
  errors: number;
}

interface FallbackEvent {
  id: string;
  timestamp: Date;
  provider: string;
  reason: string;
  tier: number;
  resolved: boolean;
  duration: number;
}

interface UsageStats {
  totalCalls: number;
  tokensUsed: number;
  avgResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
}

interface UsageMonitoringTabProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

// Chart data generators
const generateLineChartData = () => {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    data.push({
      time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      calls: Math.floor(Math.random() * 100) + 20,
      tokens: Math.floor(Math.random() * 50000) + 10000,
      responseTime: Math.floor(Math.random() * 300) + 100
    });
  }
  return data;
};

const generatePieChartData = () => [
  { provider: 'Groq', value: 35, color: '#10b981' },
  { provider: 'Gemini', value: 25, color: '#3b82f6' },
  { provider: 'Cerebras', value: 20, color: '#8b5cf6' },
  { provider: 'Mistral', value: 12, color: '#6366f1' },
  { provider: 'OpenRouter', value: 8, color: '#6b7280' }
];

const generateHistogramData = () => {
  const ranges = ['< 200ms', '200-500ms', '500-1s', '1-2s', '> 2s'];
  return ranges.map(range => ({
    range,
    count: Math.floor(Math.random() * 200) + 50,
    percentage: Math.floor(Math.random() * 40) + 10
  }));
};

const mockProviders: ProviderStatus[] = [
  { provider: 'Groq', logo: '🚀', status: 'healthy', responseTime: 245, successRate: 99.2, callsToday: 1247, errors: 8 },
  { provider: 'Gemini', logo: '💎', status: 'healthy', responseTime: 567, successRate: 97.8, callsToday: 892, errors: 15 },
  { provider: 'Cerebras', logo: '🧠', status: 'warning', responseTime: 123, successRate: 95.1, callsToday: 445, errors: 23 },
  { provider: 'Cohere', logo: '🌐', status: 'critical', responseTime: 0, successRate: 0, callsToday: 0, errors: 45 },
  { provider: 'Mistral', logo: '🌪️', status: 'healthy', responseTime: 189, successRate: 98.5, callsToday: 298, errors: 5 },
  { provider: 'OpenRouter', logo: '🛣️', status: 'healthy', responseTime: 334, successRate: 96.3, callsToday: 678, errors: 18 }
];

const mockFallbackEvents: FallbackEvent[] = [
  { id: '1', timestamp: new Date(Date.now() - 300000), provider: 'Groq', reason: 'Rate limit exceeded', tier: 1, resolved: true, duration: 234 },
  { id: '2', timestamp: new Date(Date.now() - 900000), provider: 'Cerebras', reason: 'High latency', tier: 3, resolved: true, duration: 445 },
  { id: '3', timestamp: new Date(Date.now() - 1800000), provider: 'OpenRouter', reason: 'Connection timeout', tier: 4, resolved: false, duration: 0 }
];

const mockUsageStats: UsageStats = {
  totalCalls: 3560,
  tokensUsed: 2437890,
  avgResponseTime: 312,
  cacheHitRate: 67.3,
  errorRate: 2.1
};

export function UsageMonitoringTab({ onUnsavedChanges }: UsageMonitoringTabProps) {
  const [providers, setProviders] = useState<ProviderStatus[]>(mockProviders);
  const [fallbackEvents, setFallbackEvents] = useState<FallbackEvent[]>(mockFallbackEvents);
  const [usageStats, setUsageStats] = useState<UsageStats>(mockUsageStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lineChartData, setLineChartData] = useState(generateLineChartData());
  const [pieChartData, setPieChartData] = useState(generatePieChartData());
  const [histogramData, setHistogramData] = useState(generateHistogramData());
  const { toast } = useToast();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const refreshData = async () => {
    setIsRefreshing(true);
    
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update with new mock data
      setLineChartData(generateLineChartData());
      setPieChartData(generatePieChartData());
      setHistogramData(generateHistogramData());
      
      // Update provider statuses with some randomization
      setProviders(prev => prev.map(p => ({
        ...p,
        responseTime: Math.floor(Math.random() * 400) + 100,
        successRate: Math.floor(Math.random() * 5) + 95,
        callsToday: p.callsToday + Math.floor(Math.random() * 10),
        errors: p.errors + (Math.random() > 0.9 ? 1 : 0)
      })));
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Failed to refresh monitoring data.'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      providers,
      fallbackEvents,
      usageStats,
      lineChartData,
      pieChartData,
      histogramData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-monitor-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Data Exported',
      description: 'Monitoring data has been exported successfully.'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'critical': return 'text-red-600 bg-red-50';
      case 'offline': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <WifiOff className="h-4 w-4" />;
      case 'offline': return <WifiOff className="h-4 w-4" />;
      default: return <Wifi className="h-4 w-4" />;
    }
  };

  const chartConfig: ChartConfig = {
    calls: { label: 'API Calls', color: '#3b82f6' },
    tokens: { label: 'Tokens Used', color: '#10b981' },
    responseTime: { label: 'Response Time', color: '#f59e0b' }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap gap-3 justify-between">
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={refreshData}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
          </Button>
          <Button 
            onClick={exportData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Auto-refresh</span>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* System Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">{usageStats.totalCalls.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Calls Today</div>
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">+12%</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">{usageStats.tokensUsed.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Tokens Used</div>
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">+8%</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">{usageStats.avgResponseTime}ms</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">-15ms</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">{usageStats.cacheHitRate}%</div>
              <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${usageStats.cacheHitRate}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">{usageStats.errorRate}%</div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">-0.3%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Status Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Provider Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div key={provider.provider} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{provider.logo}</span>
                    <span className="font-medium">{provider.provider}</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(provider.status)}>
                    {getStatusIcon(provider.status)}
                    <span className="ml-1 capitalize">{provider.status}</span>
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Time:</span>
                    <span className="font-mono">{provider.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span>{provider.successRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calls Today:</span>
                    <span>{provider.callsToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Errors:</span>
                    <span className={provider.errors > 20 ? 'text-red-600' : 'text-muted-foreground'}>
                      {provider.errors}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Calls Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              API Calls Over Time (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Token Usage Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Token Usage by Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Histogram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Response Time Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Provider Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Monthly Provider Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Cohere (Monthly Limit: 1,000 calls)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span>156 / 1,000</span>
                </div>
                <Progress value={15.6} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  844 remaining (15.6% used)
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Mistral (Monthly Limit: 500 calls)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span>298 / 500</span>
                </div>
                <Progress value={59.6} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  202 remaining (59.6% used)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Fallback Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Fallback Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fallbackEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={event.resolved ? "secondary" : "destructive"}>
                    Tier {event.tier}
                  </Badge>
                  <div>
                    <div className="font-medium">{event.provider}</div>
                    <div className="text-sm text-muted-foreground">{event.reason}</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>{event.timestamp.toLocaleTimeString()}</div>
                  <div className="text-muted-foreground">
                    {event.resolved ? `${event.duration}ms` : 'Pending'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All Events
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}