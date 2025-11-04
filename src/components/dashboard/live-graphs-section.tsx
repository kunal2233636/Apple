'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent 
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Area, AreaChart } from 'recharts';
import type { LiveMetrics, TimeRange, TimeSeriesData, TokenDistributionData, HistogramBucket } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface LiveGraphsSectionProps {
  metrics: LiveMetrics;
  timeRange: TimeRange;
  onTimeRangeChange: (range: string) => void;
}

// Sample data for charts
const generateMockApiCallsData = (timeRange: TimeRange) => {
  const now = new Date();
  const interval = timeRange.value === '1h' ? 5 : timeRange.value === '6h' ? 30 : 60; // minutes
  const totalPoints = timeRange.value === '1h' ? 12 : timeRange.value === '6h' ? 12 : 24;
  
  return Array.from({ length: totalPoints }, (_, i) => {
    const time = new Date(now.getTime() - (totalPoints - i) * interval * 60000);
    return {
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      calls: Math.floor(Math.random() * 50) + 10,
    };
  });
};

const generateMockTokenDistribution = (): TokenDistributionData[] => [
  { provider: 'groq', tokens: 12500, percentage: 35.2, color: '#8884d8' },
  { provider: 'gemini', tokens: 8900, percentage: 25.1, color: '#82ca9d' },
  { provider: 'cerebras', tokens: 7200, percentage: 20.3, color: '#ffc658' },
  { provider: 'mistral', tokens: 4100, percentage: 11.6, color: '#ff7300' },
  { provider: 'openrouter', tokens: 2500, percentage: 7.1, color: '#0088fe' },
  { provider: 'cohere', tokens: 300, percentage: 0.8, color: '#00c49f' },
];

const generateMockResponseTimeHistogram = (): HistogramBucket[] => [
  { range: '< 500ms', count: 45, percentage: 18.2 },
  { range: '500-1000ms', count: 89, percentage: 36.1 },
  { range: '1000-1500ms', count: 67, percentage: 27.1 },
  { range: '1500-2000ms', count: 32, percentage: 13.0 },
  { range: '> 2000ms', count: 14, percentage: 5.7 },
];

export function LiveGraphsSection({ metrics, timeRange, onTimeRangeChange }: LiveGraphsSectionProps) {
  const apiCallsData = generateMockApiCallsData(timeRange);
  const tokenDistribution = generateMockTokenDistribution();
  const responseTimeHistogram = generateMockResponseTimeHistogram();

  const chartConfig = {
    calls: {
      label: "API Calls",
      color: "hsl(var(--primary))",
    },
    tokens: {
      label: "Token Usage",
      color: "hsl(var(--primary))",
    },
    responseTime: {
      label: "Response Time",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Analytics</h2>
        <p className="text-muted-foreground">
          Real-time metrics and performance analytics across all providers
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* API Calls Per Minute Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 API Calls Per Minute
            </CardTitle>
            <CardDescription>
              Real-time API call volume over {timeRange.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <AreaChart data={apiCallsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(label) => `Time: ${label}`}
                  formatter={(value) => [value, 'API Calls']}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Token Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍰 Token Distribution
            </CardTitle>
            <CardDescription>
              Today's token usage by provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={tokenDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="tokens"
                  label={({ provider, percentage }) => `${provider}: ${percentage.toFixed(1)}%`}
                  labelLine={false}
                >
                  {tokenDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [
                    `${value.toLocaleString()} tokens`, 
                    'Usage'
                  ]}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Histogram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⏱️ Response Time Distribution
          </CardTitle>
          <CardDescription>
            Response time histogram across all providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={responseTimeHistogram}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="range" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value, name) => [value, 'Requests']}
                labelFormatter={(label) => `Range: ${label}`}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}