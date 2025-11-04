// Dashboard Alert Generation System
// =================================

import type { AIProvider } from '@/types/api-test';
import type { Alert } from '@/types/dashboard';
import { rateLimitTracker } from '@/lib/ai/rate-limit-tracker';

interface AlertThresholds {
  warning: number; // 80%
  critical: number; // 95%
}

interface AlertGenerationConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  thresholds: AlertThresholds;
  maxAlertsPerProvider: number;
}

export class DashboardAlertMonitor {
  private config: AlertGenerationConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private lastCheckTime: Date = new Date();
  private isRunning: boolean = false;
  private checkIntervalId?: NodeJS.Timeout;

  constructor(config?: Partial<AlertGenerationConfig>) {
    this.config = {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      thresholds: {
        warning: 80,
        critical: 95
      },
      maxAlertsPerProvider: 2,
      ...config
    };
  }

  /**
   * Start the alert monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log('Dashboard alert monitor is already running');
      return;
    }

    console.log('Starting dashboard alert monitor...');
    this.isRunning = true;
    
    // Run initial check
    this.checkForAlerts();
    
    // Set up periodic checks
    this.checkIntervalId = setInterval(() => {
      this.checkForAlerts();
    }, this.config.checkInterval);

    console.log(`Dashboard alert monitor started with ${this.config.checkInterval}ms interval`);
  }

  /**
   * Stop the alert monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping dashboard alert monitor...');
    this.isRunning = false;
    
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }
    
    console.log('Dashboard alert monitor stopped');
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Check for alerts and generate them as needed
   */
  private async checkForAlerts(): Promise<void> {
    try {
      console.log('Checking for dashboard alerts...');
      
      const rateLimitStats = rateLimitTracker.getStatistics();
      const newAlerts: Alert[] = [];
      
      // Check each provider
      for (const [provider, status] of rateLimitStats.providerStatuses) {
        const alert = this.checkProviderAlert(provider, status);
        if (alert) {
          newAlerts.push(alert);
        }
      }
      
      // Update active alerts
      this.updateActiveAlerts(newAlerts);
      
      this.lastCheckTime = new Date();
      console.log(`Alert check completed. Active alerts: ${this.activeAlerts.size}`);
      
    } catch (error) {
      console.error('Error checking for dashboard alerts:', error);
    }
  }

  /**
   * Check if a provider needs an alert
   */
  private checkProviderAlert(provider: AIProvider, status: any): Alert | null {
    const alertKey = `provider-${provider}`;
    const existingAlert = this.activeAlerts.get(alertKey);
    
    let alertType: 'warning' | 'critical' | null = null;
    
    // Determine alert type based on usage percentage
    if (status.percentage >= this.config.thresholds.critical) {
      alertType = 'critical';
    } else if (status.percentage >= this.config.thresholds.warning) {
      alertType = 'warning';
    }
    
    // If no alert needed and there's an existing alert, remove it
    if (!alertType && existingAlert) {
      this.activeAlerts.delete(alertKey);
      console.log(`Removed alert for ${provider} - usage normalized`);
      return null;
    }
    
    // If alert needed but no existing alert, create one
    if (alertType && !existingAlert) {
      const alert: Alert = {
        id: `dashboard-${alertKey}-${Date.now()}`,
        type: alertType,
        provider,
        message: this.generateAlertMessage(provider, status, alertType),
        usage: {
          current: status.usage,
          limit: status.limit,
          percentage: status.percentage
        },
        timestamp: new Date()
      };
      
      console.log(`Generated ${alertType} alert for ${provider}: ${alert.message}`);
      return alert;
    }
    
    // If alert type changed (e.g., from warning to critical), update it
    if (alertType && existingAlert && existingAlert.type !== alertType) {
      const updatedAlert: Alert = {
        ...existingAlert,
        type: alertType,
        message: this.generateAlertMessage(provider, status, alertType),
        timestamp: new Date()
      };
      
      console.log(`Updated alert for ${provider}: ${existingAlert.type} -> ${alertType}`);
      return updatedAlert;
    }
    
    return null;
  }

  /**
   * Generate alert message based on provider and usage
   */
  private generateAlertMessage(provider: AIProvider, status: any, alertType: 'warning' | 'critical'): string {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    
    if (alertType === 'critical') {
      return `Critical: Nearing limit! ${providerName}: ${status.usage}/${status.limit} calls (${status.percentage.toFixed(1)}%)`;
    } else {
      return `Approaching usage limit: ${providerName}: ${status.usage}/${status.limit} (${status.percentage.toFixed(1)}%)`;
    }
  }

  /**
   * Update the active alerts map
   */
  private updateActiveAlerts(newAlerts: Alert[]): void {
    // Remove alerts for providers that don't need them anymore
    const currentProviders = new Set(newAlerts.map(alert => alert.provider));
    
    for (const [alertKey, alert] of this.activeAlerts) {
      if (!currentProviders.has(alert.provider)) {
        this.activeAlerts.delete(alertKey);
      }
    }
    
    // Add or update alerts
    for (const alert of newAlerts) {
      const alertKey = `provider-${alert.provider}`;
      this.activeAlerts.set(alertKey, alert);
    }
  }

  /**
   * Manually trigger an alert check
   */
  async checkNow(): Promise<Alert[]> {
    await this.checkForAlerts();
    return this.getActiveAlerts();
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    totalActiveAlerts: number;
    warningAlerts: number;
    criticalAlerts: number;
    lastCheckTime: Date;
    providersWithAlerts: AIProvider[];
  } {
    const alerts = this.getActiveAlerts();
    
    return {
      totalActiveAlerts: alerts.length,
      warningAlerts: alerts.filter(alert => alert.type === 'warning').length,
      criticalAlerts: alerts.filter(alert => alert.type === 'critical').length,
      lastCheckTime: this.lastCheckTime,
      providersWithAlerts: alerts.map(alert => alert.provider)
    };
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string): boolean {
    for (const [key, alert] of this.activeAlerts) {
      if (alert.id === alertId) {
        this.activeAlerts.delete(key);
        console.log(`Dismissed alert: ${alertId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlertGenerationConfig>): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning) {
      this.start();
    }
    
    console.log('Dashboard alert monitor configuration updated');
  }
}

// Export singleton instance
export const dashboardAlertMonitor = new DashboardAlertMonitor();

// Export the class for testing
export { DashboardAlertMonitor };