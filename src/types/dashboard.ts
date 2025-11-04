// Dashboard Type Definitions
// =========================

import type { AIProvider } from '@/types/api-test';

// Real-time dashboard data types
export interface DashboardStats {
  systemHealth: SystemHealth;
  providers: ProviderStatus[];
  liveMetrics: LiveMetrics;
  recentEvents: FallbackEvent[];
  activeAlerts: Alert[];
  timeRange: TimeRange;
}

export interface SystemHealth {
  status: 'operational' | 'degraded' | 'critical';
  overallStatus: string;
  avgResponseTime: number;
  cacheHitRate: number;
  apiCallsThisHour: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface ProviderStatus {
  provider: AIProvider;
  name: string;
  logo: string;
  status: 'healthy' | 'warning' | 'critical' | 'blocked';
  usage: {
    current: number;
    limit: number;
    percentage: number;
  };
  metrics: {
    avgResponseTime: number;
    successRate: number;
    lastCall: Date;
  };
  trend: TimeSeriesData[];
  canTest: boolean;
}

export interface LiveMetrics {
  apiCallsPerMinute: TimeSeriesData[];
  tokenDistribution: TokenDistributionData[];
  responseTimeHistogram: HistogramBucket[];
  lastHourStats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    avgLatency: number;
  };
}

export interface FallbackEvent {
  id: string;
  timestamp: Date;
  featureName: string;
  primaryModel: string;
  fallbackModel: string;
  reason: string;
  status: 'success' | 'failed';
  responseTime: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical';
  provider: AIProvider;
  message: string;
  usage: {
    current: number;
    limit: number;
    percentage: number;
  };
  timestamp: Date;
}

export interface TimeRange {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface TokenDistributionData {
  provider: AIProvider;
  tokens: number;
  percentage: number;
  color: string;
}

export interface HistogramBucket {
  range: string;
  count: number;
  percentage: number;
}

// API Request/Response types
export interface DashboardStatsResponse {
  stats: DashboardStats;
  timestamp: string;
}

export interface LiveFeedResponse {
  type: 'stats' | 'event' | 'alert';
  data: any;
  timestamp: string;
}

export interface UsageHistoryResponse {
  timeRange: TimeRange;
  data: {
    apiCalls: TimeSeriesData[];
    tokenUsage: TimeSeriesData[];
    responseTimes: TimeSeriesData[];
    providerBreakdown: Record<AIProvider, TimeSeriesData[]>;
  };
}

export interface ExportRequest {
  type: 'usage-report' | 'fallback-log' | 'dashboard-snapshot';
  format: 'csv' | 'pdf' | 'email';
  timeRange: string;
  includeCharts?: boolean;
}

export interface ExportResponse {
  success: boolean;
  downloadUrl?: string;
  emailSent?: boolean;
  error?: string;
}

// Component Props types
export interface ProviderCardProps {
  provider: ProviderStatus;
  onTest: (provider: AIProvider) => void;
}

export interface GraphProps {
  data: any[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: string) => void;
  className?: string;
}

export interface AlertsSectionProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
}

export interface EventsTableProps {
  events: FallbackEvent[];
  onLoadMore: () => void;
  hasMore: boolean;
}

export interface ExportButtonsProps {
  onExport: (type: ExportRequest['type'], format: ExportRequest['format']) => void;
  isExporting: boolean;
}

// WebSocket/polling types
export interface LiveUpdateMessage {
  type: 'provider_update' | 'metric_update' | 'alert_update' | 'system_health';
  data: any;
  timestamp: string;
}

export interface PollingConfig {
  enabled: boolean;
  interval: number; // milliseconds
  endpoints: string[];
}

// Chart configuration types
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  responsive: boolean;
  animation: boolean;
  colors: string[];
  height?: number;
}

// Dashboard configuration
export interface DashboardConfig {
  refreshInterval: number; // seconds
  alertThresholds: {
    warning: number; // 80%
    critical: number; // 95%
  };
  pollingConfig: PollingConfig;
  chartConfigs: {
    apiCalls: ChartConfig;
    tokenDistribution: ChartConfig;
    responseTime: ChartConfig;
  };
  exportFormats: ('csv' | 'pdf' | 'email')[];
}

// Mock data for development
export const MOCK_DASHBOARD_DATA: DashboardStats = {
  systemHealth: {
    status: 'operational',
    overallStatus: '✓ ALL SYSTEMS OPERATIONAL',
    avgResponseTime: 850,
    cacheHitRate: 94.2,
    apiCallsThisHour: 1247,
    errorRate: 0.8,
    lastUpdated: new Date()
  },
  providers: [
    {
      provider: 'groq',
      name: 'Groq',
      logo: '🚀',
      status: 'warning',
      usage: { current: 425, limit: 500, percentage: 85 },
      metrics: {
        avgResponseTime: 1200,
        successRate: 99.2,
        lastCall: new Date(Date.now() - 2000)
      },
      trend: [],
      canTest: true
    },
    {
      provider: 'gemini',
      name: 'Gemini',
      logo: '💎',
      status: 'healthy',
      usage: { current: 245, limit: 500, percentage: 49 },
      metrics: {
        avgResponseTime: 800,
        successRate: 99.8,
        lastCall: new Date(Date.now() - 5000)
      },
      trend: [],
      canTest: true
    },
    {
      provider: 'cerebras',
      name: 'Cerebras',
      logo: '⚡',
      status: 'critical',
      usage: { current: 980, limit: 1000, percentage: 98 },
      metrics: {
        avgResponseTime: 950,
        successRate: 98.5,
        lastCall: new Date(Date.now() - 3000)
      },
      trend: [],
      canTest: true
    },
    {
      provider: 'mistral',
      name: 'Mistral',
      logo: '🌪️',
      status: 'warning',
      usage: { current: 475, limit: 500, percentage: 95 },
      metrics: {
        avgResponseTime: 1100,
        successRate: 97.8,
        lastCall: new Date(Date.now() - 7000)
      },
      trend: [],
      canTest: true
    },
    {
      provider: 'openrouter',
      name: 'OpenRouter',
      logo: '🔗',
      status: 'healthy',
      usage: { current: 67, limit: 100, percentage: 67 },
      metrics: {
        avgResponseTime: 750,
        successRate: 99.5,
        lastCall: new Date(Date.now() - 10000)
      },
      trend: [],
      canTest: true
    },
    {
      provider: 'cohere',
      name: 'Cohere',
      logo: '🧠',
      status: 'healthy',
      usage: { current: 156, limit: 1000, percentage: 15.6 },
      metrics: {
        avgResponseTime: 900,
        successRate: 99.9,
        lastCall: new Date(Date.now() - 15000)
      },
      trend: [],
      canTest: true
    }
  ],
  liveMetrics: {
    apiCallsPerMinute: [],
    tokenDistribution: [],
    responseTimeHistogram: [],
    lastHourStats: {
      totalCalls: 1247,
      successfulCalls: 1237,
      failedCalls: 10,
      avgLatency: 850
    }
  },
  recentEvents: [],
  activeAlerts: [],
  timeRange: {
    label: 'Last 1 hour',
    value: '1h',
    startDate: new Date(Date.now() - 3600000),
    endDate: new Date()
  }
};

export const TIME_RANGES: TimeRange[] = [
  { label: 'Last 1 hour', value: '1h', startDate: new Date(Date.now() - 3600000), endDate: new Date() },
  { label: 'Last 6 hours', value: '6h', startDate: new Date(Date.now() - 21600000), endDate: new Date() },
  { label: 'Last 24 hours', value: '24h', startDate: new Date(Date.now() - 86400000), endDate: new Date() },
  { label: 'Last 7 days', value: '7d', startDate: new Date(Date.now() - 604800000), endDate: new Date() },
  { label: 'Last 30 days', value: '30d', startDate: new Date(Date.now() - 2592000000), endDate: new Date() }
];