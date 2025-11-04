'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import type { Alert as AlertType } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface AlertsSectionProps {
  alerts: AlertType[];
  onDismiss: (alertId: string) => void;
}

// Generate mock alerts for demonstration
const generateMockAlerts = (): AlertType[] => [
  {
    id: '1',
    type: 'warning',
    provider: 'groq',
    message: 'Approaching usage limit: 425/500 (85%)',
    usage: { current: 425, limit: 500, percentage: 85 },
    timestamp: new Date(Date.now() - 300000) // 5 minutes ago
  },
  {
    id: '2',
    type: 'critical',
    provider: 'cerebras',
    message: 'Critical: Nearing limit! 980/1,000 calls (98%)',
    usage: { current: 980, limit: 1000, percentage: 98 },
    timestamp: new Date(Date.now() - 600000) // 10 minutes ago
  },
  {
    id: '3',
    type: 'warning',
    provider: 'mistral',
    message: 'High usage alert: 475/500 calls (95%)',
    usage: { current: 475, limit: 500, percentage: 95 },
    timestamp: new Date(Date.now() - 900000) // 15 minutes ago
  }
];

const getAlertIcon = (type: AlertType['type']) => {
  switch (type) {
    case 'critical':
      return <AlertCircle className="h-4 w-4" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getAlertStyles = (type: AlertType['type']) => {
  switch (type) {
    case 'critical':
      return {
        container: 'border-red-200 bg-red-50 text-red-800',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-800 border-red-300'
      };
    case 'warning':
      return {
        container: 'border-yellow-200 bg-yellow-50 text-yellow-800',
        icon: 'text-yellow-600',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      };
    default:
      return {
        container: 'border-blue-200 bg-blue-50 text-blue-800',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800 border-blue-300'
      };
  }
};

const formatTimestamp = (date: Date) => {
  const now = Date.now();
  const diff = now - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

export function AlertsSection({ alerts, onDismiss }: AlertsSectionProps) {
  // Use mock data if no alerts provided
  const displayAlerts = alerts.length > 0 ? alerts : generateMockAlerts();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Alerts & Warnings</h2>
        <p className="text-muted-foreground">
          Current system alerts and usage warnings
        </p>
      </div>

      {displayAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">✓ All Systems Operational</h3>
                <p className="text-muted-foreground">
                  No alerts at this time. All providers are operating normally.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayAlerts.map((alert) => {
            const styles = getAlertStyles(alert.type);
            const icon = getAlertIcon(alert.type);
            
            return (
              <Alert key={alert.id} className={cn(
                "transition-all duration-200 hover:shadow-sm",
                styles.container
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5", styles.icon)}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn("text-xs", styles.badge)}>
                          {alert.type.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {alert.provider}
                        </span>
                      </div>
                      <AlertDescription className="font-medium">
                        {alert.message}
                      </AlertDescription>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>Current: {alert.usage.current.toLocaleString()}</span>
                        <span>Limit: {alert.usage.limit.toLocaleString()}</span>
                        <span>Usage: {alert.usage.percentage.toFixed(1)}%</span>
                        <span className="text-muted-foreground">
                          {formatTimestamp(alert.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(alert.id)}
                    className="h-6 w-6 p-0 hover:bg-background/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Summary card when there are alerts */}
      {displayAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alert Summary</CardTitle>
            <CardDescription>
              Overview of current system status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {displayAlerts.filter(a => a.type === 'critical').length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {displayAlerts.filter(a => a.type === 'warning').length}
                </div>
                <div className="text-sm text-muted-foreground">Warning Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {6 - displayAlerts.length}
                </div>
                <div className="text-sm text-muted-foreground">Healthy Providers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}