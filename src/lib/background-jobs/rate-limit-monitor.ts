// Rate Limit Monitor Job
// =======================

import { rateLimitTracker } from '../ai/rate-limit-tracker';
import type { AIProvider } from '@/types/api-test';
import type { JobResult } from './scheduler';

interface ProviderUsage {
  provider: AIProvider;
  usage: number;
  limit: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical' | 'blocked';
  remaining: number;
  resetTime: Date;
}

interface RateLimitAlert {
  type: 'warning' | 'critical' | 'blocked' | 'recovery';
  provider: AIProvider;
  usage: number;
  limit: number;
  percentage: number;
  message: string;
  timestamp: Date;
}

/**
 * Rate Limit Monitor Job
 * Purpose: Real-time monitoring and automatic failover
 * Schedule: Runs continuously in background (not scheduled)
 */
export class RateLimitMonitor {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastStatus: Map<AIProvider, ProviderUsage> = new Map();
  private alerts: RateLimitAlert[] = [];
  private activeFailovers: Map<AIProvider, AIProvider> = new Map();
  
  // Fallback chains for automatic switching
  private fallbackChains: Record<QueryType, AIProvider[]> = {
    time_sensitive: ['gemini', 'groq', 'cerebras', 'mistral', 'openrouter', 'cohere'],
    app_data: ['groq', 'cerebras', 'mistral', 'gemini', 'openrouter', 'cohere'],
    general: ['groq', 'openrouter', 'cerebras', 'mistral', 'gemini', 'cohere']
  };

  constructor() {
    this.initializeMonitor();
  }

  /**
   * Start continuous monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Rate limit monitor is already running');
      return;
    }

    console.log('🔍 Starting rate limit monitor...');
    this.isRunning = true;

    // Check every second for real-time monitoring
    this.checkInterval = setInterval(() => {
      this.performRateLimitCheck();
    }, 1000);

    console.log('✅ Rate limit monitor started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping rate limit monitor...');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('✅ Rate limit monitor stopped');
  }

  /**
   * Perform rate limit check and handle alerts/failovers
   */
  private async performRateLimitCheck(): Promise<void> {
    try {
      const allStatuses = rateLimitTracker.getAllStatuses();
      const currentUsage: ProviderUsage[] = [];

      // Get current usage for all providers
      for (const [provider, status] of allStatuses) {
        currentUsage.push({
          provider,
          usage: status.usage,
          limit: status.limit,
          percentage: status.percentage,
          status: status.status,
          remaining: status.remaining,
          resetTime: status.resetTime
        });
      }

      // Check for status changes and trigger alerts
      for (const usage of currentUsage) {
        await this.handleProviderStatusChange(usage);
      }

      // Update last status tracking
      for (const usage of currentUsage) {
        this.lastStatus.set(usage.provider, usage);
      }

      // Log periodic status (every 30 seconds)
      if (Date.now() % 30000 < 1000) {
        this.logPeriodicStatus(currentUsage);
      }

    } catch (error) {
      console.error('Rate limit check failed:', error);
    }
  }

  /**
   * Handle provider status changes and trigger appropriate actions
   */
  private async handleProviderStatusChange(usage: ProviderUsage): Promise<void> {
    const lastStatus = this.lastStatus.get(usage.provider);
    
    if (!lastStatus) {
      // First time seeing this provider, just record status
      this.logProviderStatus(usage);
      return;
    }

    // Check for significant changes
    const statusChanged = lastStatus.status !== usage.status;
    const percentageCrossedThreshold = this.crossedThreshold(lastStatus.percentage, usage.percentage);

    if (statusChanged || percentageCrossedThreshold) {
      await this.triggerAlert(usage, lastStatus);
      
      // Handle automatic failover
      if (usage.status === 'critical' || usage.status === 'blocked') {
        await this.handleAutomaticFailover(usage);
      } else if (usage.status === 'healthy' && lastStatus.status !== 'healthy') {
        await this.handleFailoverRecovery(usage);
      }
    }

    // Log current status
    this.logProviderStatus(usage);
  }

  /**
   * Check if percentage crossed important thresholds
   */
  private crossedThreshold(lastPercentage: number, currentPercentage: number): boolean {
    const thresholds = [80, 95, 100];
    
    for (const threshold of thresholds) {
      const wasBelow = lastPercentage < threshold;
      const isAboveOrEqual = currentPercentage >= threshold;
      
      if (wasBelow && isAboveOrEqual) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Trigger appropriate alert based on provider status
   */
  private async triggerAlert(usage: ProviderUsage, lastStatus: ProviderUsage): Promise<void> {
    const alert: RateLimitAlert = {
      type: usage.status as any,
      provider: usage.provider,
      usage: usage.usage,
      limit: usage.limit,
      percentage: usage.percentage,
      message: this.generateAlertMessage(usage, lastStatus),
      timestamp: new Date()
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log alert
    console.log(`🚨 Rate Limit Alert [${alert.type.toUpperCase()}]: ${alert.message}`);

    // Send notification (implement based on your notification system)
    await this.sendAlertNotification(alert);
  }

  /**
   * Generate alert message based on status change
   */
  private generateAlertMessage(usage: ProviderUsage, lastStatus: ProviderUsage): string {
    const { provider, usage: currentUsage, limit, percentage } = usage;
    
    switch (usage.status) {
      case 'warning':
        return `${provider} at ${percentage.toFixed(1)}% usage (${currentUsage}/${limit}). Monitoring closely.`;
      
      case 'critical':
        return `${provider} at ${percentage.toFixed(1)}% usage (${currentUsage}/${limit}). Auto-switching to fallback provider.`;
      
      case 'blocked':
        return `${provider} at 100% usage (${currentUsage}/${limit}). Provider blocked until reset. Using fallback.`;
      
      case 'healthy':
        if (lastStatus.status !== 'healthy') {
          return `${provider} recovered and healthy again. ${percentage.toFixed(1)}% usage (${currentUsage}/${limit}).`;
        }
        return '';
      
      default:
        return `${provider}: ${percentage.toFixed(1)}% usage (${currentUsage}/${limit})`;
    }
  }

  /**
   * Handle automatic failover to alternative providers
   */
  private async handleAutomaticFailover(usage: ProviderUsage): Promise<void> {
    const { provider } = usage;
    
    // Find best fallback provider
    const fallbackProvider = this.findFallbackProvider(provider);
    
    if (fallbackProvider) {
      this.activeFailovers.set(provider, fallbackProvider);
      console.log(`🔄 Auto-failover: ${provider} → ${fallbackProvider}`);
      
      // In a real implementation, you would update the AI Service Manager
      // to use the fallback provider for this provider
      // await aiServiceManager.setFallbackProvider(provider, fallbackProvider);
    }
  }

  /**
   * Handle failover recovery when provider becomes healthy
   */
  private async handleFailoverRecovery(usage: ProviderUsage): Promise<void> {
    const { provider } = usage;
    
    if (this.activeFailovers.has(provider)) {
      const fallbackProvider = this.activeFailovers.get(provider)!;
      this.activeFailovers.delete(provider);
      
      console.log(`🔄 Failover recovery: ${provider} is healthy again, no longer using ${fallbackProvider} as fallback`);
      
      // In real implementation, remove fallback routing
      // await aiServiceManager.removeFallbackProvider(provider);
    }
  }

  /**
   * Find best fallback provider based on current usage
   */
  private findFallbackProvider(failedProvider: AIProvider): AIProvider | null {
    // Find alternative providers that are healthy and have capacity
    const allStatuses = rateLimitTracker.getAllStatuses();
    const healthyProviders: Array<{ provider: AIProvider; percentage: number }> = [];

    for (const [provider, status] of allStatuses) {
      if (provider !== failedProvider && status.status === 'healthy') {
        healthyProviders.push({
          provider,
          percentage: status.percentage
        });
      }
    }

    // Sort by lowest usage percentage
    healthyProviders.sort((a, b) => a.percentage - b.percentage);

    return healthyProviders.length > 0 ? healthyProviders[0].provider : null;
  }

  /**
   * Log current provider status
   */
  private logProviderStatus(usage: ProviderUsage): void {
    const { provider, usage: currentUsage, limit, percentage, status } = usage;
    const statusIcon = this.getStatusIcon(status);
    
    console.log(`${statusIcon} ${provider}: ${percentage.toFixed(1)}% (${currentUsage}/${limit})`);
  }

  /**
   * Log periodic status summary every 30 seconds
   */
  private logPeriodicStatus(usages: ProviderUsage[]): void {
    const healthy = usages.filter(u => u.status === 'healthy').length;
    const warning = usages.filter(u => u.status === 'warning').length;
    const critical = usages.filter(u => u.status === 'critical').length;
    const blocked = usages.filter(u => u.status === 'blocked').length;
    
    console.log(`📊 Rate Limit Status: ${healthy} healthy, ${warning} warning, ${critical} critical, ${blocked} blocked`);
  }

  /**
   * Get status icon for logging
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🔴';
      case 'blocked': return '🚫';
      default: return '❓';
    }
  }

  /**
   * Send alert notification (placeholder implementation)
   */
  private async sendAlertNotification(alert: RateLimitAlert): Promise<void> {
    try {
      // This would integrate with your notification system
      // Email, Slack, PagerDuty, etc.
      
      const notificationMessage = `
🚨 BlockWise AI Rate Limit Alert

Provider: ${alert.provider}
Status: ${alert.type.toUpperCase()}
Usage: ${alert.percentage.toFixed(1)}% (${alert.usage}/${alert.limit})
Time: ${alert.timestamp.toISOString()}

${alert.message}
`;

      console.log('📧 Alert notification:', notificationMessage);

      // In real implementation:
      // await emailService.send({ to: 'ops@blockwise.com', subject: `Rate Limit Alert - ${alert.provider}`, text: notificationMessage });
      // await slackService.postMessage('#alerts', notificationMessage);

    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Initialize monitor with current status
   */
  private initializeMonitor(): void {
    const allStatuses = rateLimitTracker.getAllStatuses();
    
    for (const [provider, status] of allStatuses) {
      this.lastStatus.set(provider, {
        provider,
        usage: status.usage,
        limit: status.limit,
        percentage: status.percentage,
        status: status.status,
        remaining: status.remaining,
        resetTime: status.resetTime
      });
    }
  }

  /**
   * Get current rate limit status for dashboard
   */
  getCurrentStatus(): ProviderUsage[] {
    const allStatuses = rateLimitTracker.getAllStatuses();
    const currentUsage: ProviderUsage[] = [];

    for (const [provider, status] of allStatuses) {
      currentUsage.push({
        provider,
        usage: status.usage,
        limit: status.limit,
        percentage: status.percentage,
        status: status.status,
        remaining: status.remaining,
        resetTime: status.resetTime
      });
    }

    return currentUsage;
  }

  /**
   * Get active failovers
   */
  getActiveFailovers(): Map<AIProvider, AIProvider> {
    return new Map(this.activeFailovers);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): RateLimitAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get monitor statistics
   */
  getStatistics() {
    const currentStatus = this.getCurrentStatus();
    const healthy = currentStatus.filter(s => s.status === 'healthy').length;
    const warning = currentStatus.filter(s => s.status === 'warning').length;
    const critical = currentStatus.filter(s => s.status === 'critical').length;
    const blocked = currentStatus.filter(s => s.status === 'blocked').length;

    return {
      isRunning: this.isRunning,
      providersCount: currentStatus.length,
      statusBreakdown: { healthy, warning, critical, blocked },
      activeFailovers: this.activeFailovers.size,
      recentAlertsCount: this.alerts.length,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Execute manual rate limit check (for testing/scheduling)
   */
  async executeRateLimitCheck(): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      await this.performRateLimitCheck();
      
      const currentStatus = this.getCurrentStatus();
      const healthy = currentStatus.filter(s => s.status === 'healthy').length;
      
      return {
        success: true,
        message: `Rate limit check completed. ${healthy}/${currentStatus.length} providers healthy.`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          statusBreakdown: {
            healthy: currentStatus.filter(s => s.status === 'healthy').length,
            warning: currentStatus.filter(s => s.status === 'warning').length,
            critical: currentStatus.filter(s => s.status === 'critical').length,
            blocked: currentStatus.filter(s => s.status === 'blocked').length
          },
          activeFailovers: this.activeFailovers.size,
          recentAlerts: this.getRecentAlerts(5)
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Rate limit check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export const rateLimitMonitor = new RateLimitMonitor();

// Execute function for job scheduler (when called manually)
export async function executeRateLimitMonitor(): Promise<JobResult> {
  return rateLimitMonitor.executeRateLimitCheck();
}