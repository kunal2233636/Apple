// Health Check Job
// ================

import { aiServiceManager } from '../ai/ai-service-manager';
import { rateLimitTracker } from '../ai/rate-limit-tracker';
import { supabase } from '../supabase';
import type { JobResult } from './scheduler';
import type { AIProvider } from '@/types/api-test';

interface ProviderHealthCheck {
  provider: AIProvider;
  healthy: boolean;
  responseTime: number;
  error?: string;
  lastSuccess?: Date;
  uptime: number; // percentage
  consecutiveFailures: number;
}

interface SystemHealthStatus {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  providers: ProviderHealthCheck[];
  database: {
    healthy: boolean;
    responseTime: number;
    error?: string;
  };
  cache: {
    healthy: boolean;
    responseTime: number;
    error?: string;
  };
  disk: {
    healthy: boolean;
    freePercentage: number;
    totalSpace: number;
    freeSpace: number;
  };
  rateLimits: {
    healthy: number;
    warning: number;
    critical: number;
    blocked: number;
  };
}

/**
 * Health Check Job
 * Purpose: Monitor system health and detect issues early
 * Schedule: Every 5 minutes continuously
 */
export async function executeHealthCheck(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('🔍 Starting health check job...');

  try {
    const healthStatus = await performSystemHealthCheck();
    
    // Log health status
    await logHealthCheckActivity(healthStatus);
    
    // Send alerts for critical issues
    await checkAndSendAlerts(healthStatus);

    const executionTime = Date.now() - startTime;
    const healthyProviders = healthStatus.providers.filter(p => p.healthy).length;
    const totalProviders = healthStatus.providers.length;

    let message = `Health check completed. ${healthyProviders}/${totalProviders} providers healthy`;
    
    if (healthStatus.overallHealth === 'critical') {
      message += ' ⚠️ CRITICAL ISSUES DETECTED';
    } else if (healthStatus.overallHealth === 'degraded') {
      message += ' ⚠️ Some services degraded';
    }

    console.log(`✅ ${message}`);

    return {
      success: healthStatus.overallHealth !== 'critical',
      message,
      executionTime,
      timestamp: new Date(),
      data: healthStatus
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Health check failed:', error);

    return {
      success: false,
      message: `Health check failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Perform comprehensive system health check
 */
async function performSystemHealthCheck(): Promise<SystemHealthStatus> {
  const timestamp = new Date();
  
  // Check all components in parallel
  const [providerChecks, dbCheck, cacheCheck, diskCheck, rateLimitStats] = await Promise.allSettled([
    checkAllProviders(),
    checkDatabaseConnectivity(),
    checkCacheConnectivity(),
    checkDiskSpace(),
    Promise.resolve(rateLimitTracker.getStatistics())
  ]);

  // Extract results
  const providers = providerChecks.status === 'fulfilled' ? providerChecks.value : [];
  const database = dbCheck.status === 'fulfilled' ? dbCheck.value : { healthy: false, responseTime: 0, error: 'Check failed' };
  const cache = cacheCheck.status === 'fulfilled' ? cacheCheck.value : { healthy: false, responseTime: 0, error: 'Check failed' };
  const disk = diskCheck.status === 'fulfilled' ? diskCheck.value : { healthy: true, freePercentage: 100, totalSpace: 0, freeSpace: 0 };
  const rateLimits = rateLimitStats.status === 'fulfilled' ? rateLimitStats.value : { healthyProviders: 0, warningProviders: 0, criticalProviders: 0, blockedProviders: 0 };

  // Determine overall health status
  const overallHealth = determineOverallHealth({
    providers,
    database,
    cache,
    disk,
    rateLimits
  });

  return {
    timestamp,
    overallHealth,
    providers,
    database,
    cache,
    disk,
    rateLimits
  };
}

/**
 * Check health of all AI providers
 */
async function checkAllProviders(): Promise<ProviderHealthCheck[]> {
  const providers: AIProvider[] = ['groq', 'gemini', 'cerebras', 'cohere', 'mistral', 'openrouter'];
  const healthChecks: ProviderHealthCheck[] = [];

  for (const provider of providers) {
    try {
      const startTime = Date.now();
      
      // Perform lightweight health check with AI Service Manager
      const health = await aiServiceManager.healthCheck();
      const responseTime = Date.now() - startTime;
      
      const providerHealth = health[provider];
      if (providerHealth) {
        healthChecks.push({
          provider,
          healthy: providerHealth.healthy,
          responseTime,
          error: providerHealth.error,
          lastSuccess: providerHealth.healthy ? new Date() : undefined,
          uptime: calculateUptime(provider, providerHealth.healthy),
          consecutiveFailures: getConsecutiveFailures(provider, !providerHealth.healthy)
        });
      } else {
        healthChecks.push({
          provider,
          healthy: false,
          responseTime,
          error: 'Provider not found in health check results',
          uptime: 0,
          consecutiveFailures: getConsecutiveFailures(provider, true)
        });
      }

      console.log(`🏥 ${provider}: ${providerHealth?.healthy ? 'Healthy' : 'Unhealthy'} (${responseTime}ms)`);

    } catch (error) {
      const responseTime = Date.now(); // Approximate response time
      
      healthChecks.push({
        provider,
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        uptime: 0,
        consecutiveFailures: getConsecutiveFailures(provider, true)
      });

      console.error(`❌ ${provider} health check failed:`, error);
    }
  }

  return healthChecks;
}

/**
 * Check database connectivity
 */
async function checkDatabaseConnectivity(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Perform simple database query
    const { error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      throw error;
    }

    return {
      healthy: true,
      responseTime
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Check cache connectivity (placeholder - implement based on your cache system)
 */
async function checkCacheConnectivity(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // This is a placeholder implementation
    // In a real implementation, you would test your actual cache system
    // (Redis, Memcached, etc.)
    
    // Simulate cache check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Cache check failed'
    };
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace(): Promise<{
  healthy: boolean;
  freePercentage: number;
  totalSpace: number;
  freeSpace: number;
}> {
  try {
    // This would use Node.js fs module in a real implementation
    // For now, return placeholder values
    // In production, you would use: require('fs').statfsSync()
    
    const freePercentage = 75; // Placeholder - 75% free
    const totalSpace = 1000; // Placeholder - 1000GB
    const freeSpace = 750; // Placeholder - 750GB free
    
    return {
      healthy: freePercentage >= 10, // Consider unhealthy if less than 10% free
      freePercentage,
      totalSpace,
      freeSpace
    };

  } catch (error) {
    return {
      healthy: false,
      freePercentage: 0,
      totalSpace: 0,
      freeSpace: 0
    };
  }
}

/**
 * Determine overall system health status
 */
function determineOverallHealth(status: {
  providers: ProviderHealthCheck[];
  database: { healthy: boolean };
  cache: { healthy: boolean };
  disk: { healthy: boolean };
  rateLimits: { blockedProviders: number };
}): 'healthy' | 'degraded' | 'critical' {
  const failedProviders = status.providers.filter(p => !p.healthy).length;
  const totalProviders = status.providers.length;
  const providerFailureRate = totalProviders > 0 ? failedProviders / totalProviders : 0;
  
  // Critical conditions
  if (!status.database.healthy || !status.disk.healthy) {
    return 'critical';
  }
  
  if (failedProviders >= totalProviders * 0.5) { // 50% or more providers failed
    return 'critical';
  }
  
  if (status.rateLimits.blockedProviders > 0) {
    return 'critical';
  }
  
  // Degraded conditions
  if (failedProviders > 0 || !status.cache.healthy) {
    return 'degraded';
  }
  
  // Healthy
  return 'healthy';
}

/**
 * Log health check activity
 */
async function logHealthCheckActivity(healthStatus: SystemHealthStatus): Promise<void> {
  try {
    const { overallHealth, providers, database, cache, disk } = healthStatus;
    
    const healthyProviders = providers.filter(p => p.healthy).length;
    const totalProviders = providers.length;
    
    const summary = `Health check: ${overallHealth.toUpperCase()}. ${healthyProviders}/${totalProviders} providers healthy. DB: ${database.healthy ? 'OK' : 'FAIL'}, Cache: ${cache.healthy ? 'OK' : 'FAIL'}, Disk: ${disk.freePercentage}% free`;
    
    const details = {
      overallHealth,
      providers: providers.map(p => ({
        provider: p.provider,
        healthy: p.healthy,
        responseTime: p.responseTime,
        error: p.error,
        uptime: p.uptime,
        consecutiveFailures: p.consecutiveFailures
      })),
      database: {
        healthy: database.healthy,
        responseTime: database.responseTime,
        error: database.error
      },
      cache: {
        healthy: cache.healthy,
        responseTime: cache.responseTime,
        error: cache.error
      },
      disk: {
        healthy: disk.healthy,
        freePercentage: disk.freePercentage,
        freeSpace: disk.freeSpace,
        totalSpace: disk.totalSpace
      },
      timestamp: healthStatus.timestamp.toISOString(),
      jobType: 'health-check'
    };

    await supabase
      .from('activity_logs')
      .insert({
        user_id: 'system-background-jobs',
        activity_type: 'health_check',
        summary,
        details
      });

  } catch (error) {
    console.error('Failed to log health check activity:', error);
  }
}

/**
 * Check for critical issues and send alerts
 */
async function checkAndSendAlerts(healthStatus: SystemHealthStatus): Promise<void> {
  const alerts: string[] = [];
  
  // Check for critical provider failures
  const criticalProviders = healthStatus.providers.filter(p => 
    !p.healthy && p.consecutiveFailures >= 3
  );
  
  if (criticalProviders.length > 0) {
    alerts.push(`Critical: ${criticalProviders.length} providers failing consecutively: ${criticalProviders.map(p => p.provider).join(', ')}`);
  }
  
  // Check for database issues
  if (!healthStatus.database.healthy) {
    alerts.push('Critical: Database connectivity failure');
  }
  
  // Check for low disk space
  if (healthStatus.disk.freePercentage < 10) {
    alerts.push(`Warning: Low disk space: ${healthStatus.disk.freePercentage}% free`);
  }
  
  // Check for rate limit issues
  if (healthStatus.rateLimits.blockedProviders > 0) {
    alerts.push(`Warning: ${healthStatus.rateLimits.blockedProviders} providers at rate limit`);
  }
  
  if (alerts.length > 0) {
    console.warn('🚨 System alerts:', alerts);
    
    // In a real implementation, you would send notifications here
    // Email, Slack, SMS, etc.
    await sendAlerts(alerts);
  }
}

/**
 * Send system alerts (placeholder implementation)
 */
async function sendAlerts(alerts: string[]): Promise<void> {
  try {
    // Placeholder for alert system integration
    // Could integrate with email, Slack, PagerDuty, etc.
    
    const alertMessage = `
🚨 BlockWise AI System Alerts - ${new Date().toISOString()}

${alerts.map(alert => `• ${alert}`).join('\n')}

Please investigate immediately.
`;

    console.log('📧 Alert notification (placeholder):');
    console.log(alertMessage);
    
    // In real implementation:
    // await emailService.send({ to: 'ops@blockwise.com', subject: 'BlockWise AI System Alerts', text: alertMessage });
    // await slackService.postMessage('#alerts', alertMessage);

  } catch (error) {
    console.error('Failed to send alerts:', error);
  }
}

// Helper functions for tracking provider status over time
// In a real implementation, you would persist this data
const providerFailureCounts = new Map<AIProvider, number>();
const providerLastSuccess = new Map<AIProvider, Date>();

function getConsecutiveFailures(provider: AIProvider, isFailure: boolean): number {
  if (isFailure) {
    const current = providerFailureCounts.get(provider) || 0;
    providerFailureCounts.set(provider, current + 1);
    return current + 1;
  } else {
    providerFailureCounts.set(provider, 0);
    providerLastSuccess.set(provider, new Date());
    return 0;
  }
}

function calculateUptime(provider: AIProvider, isHealthy: boolean): number {
  // Simplified uptime calculation
  // In production, you would track this over time
  const failures = providerFailureCounts.get(provider) || 0;
  const totalChecks = failures + 1; // Approximate
  return Math.round(((totalChecks - failures) / totalChecks) * 100);
}

/**
 * Get current system health status for dashboard
 */
export function getCurrentHealthStatus(): SystemHealthStatus | null {
  try {
    // This would return the latest health status from cache or storage
    // For now, return a placeholder
    return {
      timestamp: new Date(),
      overallHealth: 'healthy',
      providers: [],
      database: { healthy: true, responseTime: 0 },
      cache: { healthy: true, responseTime: 0 },
      disk: { healthy: true, freePercentage: 75, totalSpace: 0, freeSpace: 0 },
      rateLimits: { healthyProviders: 0, warningProviders: 0, criticalProviders: 0, blockedProviders: 0 }
    };
  } catch (error) {
    console.error('Failed to get current health status:', error);
    return null;
  }
}